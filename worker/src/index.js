const allowedServices = new Map([
  ['Weight Management Consultation Deposit', 5000],
  ['Skin Tag Assessment Deposit', 5000],
  ['Skin Health Consultation Deposit', 5000],
  ['General Consultation Deposit', 3000]
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, service: 'famfirst-clinic-api' }, 200, cors);
      }
      if (request.method === 'POST' && url.pathname === '/api/leads') {
        return await createLead(request, env, cors);
      }
      if (request.method === 'POST' && url.pathname === '/api/payments/create') {
        return await createPayment(request, env, cors);
      }
      if (request.method === 'POST' && url.pathname === '/api/payments/callback') {
        return await paymentCallback(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/api/dashboard') {
        return await dashboardData(request, env, cors);
      }
      return json({ error: 'Not found' }, 404, cors);
    } catch (error) {
      console.error(JSON.stringify({ event: 'request_error', path: url.pathname, message: error instanceof Error ? error.message : String(error) }));
      return json({ error: 'Unexpected server error' }, 500, cors);
    }
  }
};

async function createLead(request, env, cors) {
  const body = await readJson(request);
  const lead = validateLead(body);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO leads (id, created_at, name, phone, email, service, preferred_date, notes, status)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'new')`
  ).bind(id, createdAt, lead.name, lead.phone, lead.email, lead.service, lead.preferredDate, lead.notes).run();

  return json({ ok: true, id }, 201, cors);
}

async function createPayment(request, env, cors) {
  const body = await readJson(request);
  const lead = validateLead(body);
  const amountSen = allowedServices.get(lead.service);
  if (!amountSen) return json({ error: 'Unsupported service' }, 400, cors);

  const paymentId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const callbackUrl = `${env.PUBLIC_API_URL}/api/payments/callback`;
  const redirectUrl = `${env.PUBLIC_SITE_URL}/checkout.html?payment=returned`;
  const form = new URLSearchParams({
    collection_id: env.BILLPLZ_COLLECTION_ID,
    description: lead.service.slice(0, 200),
    email: lead.email || 'noemail@example.com',
    mobile: normalizePhone(lead.phone),
    name: lead.name,
    amount: String(amountSen),
    callback_url: callbackUrl,
    redirect_url: redirectUrl,
    reference_1_label: 'Payment ID',
    reference_1: paymentId
  });

  const billResponse = await fetch(`${env.BILLPLZ_BASE_URL}/bills`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.BILLPLZ_API_KEY}:`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  });

  const bill = await billResponse.json();
  if (!billResponse.ok || !bill.id || !bill.url) {
    console.error(JSON.stringify({ event: 'billplz_create_failed', status: billResponse.status, body: bill }));
    return json({ error: 'Payment provider could not create the bill' }, 502, cors);
  }

  await env.DB.prepare(
    `INSERT INTO payments (id, created_at, bill_id, name, phone, email, service, amount_sen, status, provider_payload)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', ?9)`
  ).bind(paymentId, createdAt, bill.id, lead.name, lead.phone, lead.email, lead.service, amountSen, JSON.stringify(bill)).run();

  return json({ paymentUrl: bill.url, paymentId, billId: bill.id }, 201, cors);
}

async function paymentCallback(request, env) {
  const form = await request.formData();
  const params = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  const signature = params.x_signature || '';
  delete params.x_signature;

  const valid = await verifyBillplzSignature(params, signature, env.BILLPLZ_XSIGNATURE_KEY);
  if (!valid) return new Response('Invalid signature', { status: 401 });

  const status = params.paid === 'true' && params.state === 'paid' ? 'paid' : params.state || 'due';
  await env.DB.prepare(
    `UPDATE payments SET status = ?1, paid_at = ?2, provider_payload = ?3 WHERE bill_id = ?4`
  ).bind(status, params.paid_at || null, JSON.stringify(params), params.id).run();

  return new Response('OK', { status: 200 });
}

async function dashboardData(request, env, cors) {
  if (!constantTimeEqual(request.headers.get('Authorization') || '', `Bearer ${env.DASHBOARD_TOKEN}`)) {
    return json({ error: 'Unauthorized' }, 401, cors);
  }

  const [leads, payments, totals] = await env.DB.batch([
    env.DB.prepare('SELECT id, created_at, name, phone, email, service, preferred_date, status FROM leads ORDER BY created_at DESC LIMIT 100'),
    env.DB.prepare('SELECT id, created_at, bill_id, name, service, amount_sen, status, paid_at FROM payments ORDER BY created_at DESC LIMIT 100'),
    env.DB.prepare("SELECT COUNT(*) AS payment_count, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_sen ELSE 0 END), 0) AS paid_total_sen FROM payments")
  ]);

  return json({ leads: leads.results, payments: payments.results, totals: totals.results[0] || {} }, 200, cors);
}

function validateLead(body) {
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 160);
  const service = clean(body.service, 160);
  const preferredDate = clean(body.preferredDate || body.date, 30);
  const notes = clean(body.notes, 1000);
  if (!name || !phone || !service) throw new Error('Name, phone and service are required');
  return { name, phone, email, service, preferredDate, notes };
}

function clean(value, max) {
  return String(value || '').trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max);
}

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('60')) return `+${digits}`;
  if (digits.startsWith('0')) return `+60${digits.slice(1)}`;
  return `+${digits}`;
}

async function readJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Content-Type must be application/json');
  return await request.json();
}

async function verifyBillplzSignature(params, received, key) {
  if (!received || !key) return false;
  const source = Object.keys(params)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((name) => `${name}${params[name] ?? ''}`)
    .join('|');
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(source));
  const calculated = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(calculated, received);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = origin === env.ALLOWED_ORIGIN || origin === env.PUBLIC_SITE_URL;
  return {
    'Access-Control-Allow-Origin': allowed ? origin : env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
    'Content-Security-Policy': "default-src 'none'",
    'X-Content-Type-Options': 'nosniff'
  };
}

function json(payload, status, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders } });
}

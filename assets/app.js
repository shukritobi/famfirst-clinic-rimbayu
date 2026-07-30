const FAMFIRST = {
  apiBase: document.querySelector('meta[name="famfirst-api"]')?.content?.trim() || '',
  whatsapp: '60185802945',
  clinicName: 'FamFirst Clinic Bandar Rimbayu'
};

const FAMFIRST_SCRIPT_URL = new URL(document.currentScript?.src || 'assets/app.js', window.location.href);

const money = (value) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(value);

async function initBrandAssets() {
  const root = document.documentElement;
  const siteRoot = new URL('../', FAMFIRST_SCRIPT_URL);
  try {
    const [heroA, heroB, logo] = await Promise.all([
      fetch(new URL('.build-assets/hero1.txt', siteRoot)).then((response) => {
        if (!response.ok) throw new Error('Hero asset unavailable');
        return response.text();
      }),
      fetch(new URL('.build-assets/hero-rest.txt', siteRoot)).then((response) => {
        if (!response.ok) throw new Error('Hero asset unavailable');
        return response.text();
      }),
      fetch(new URL('.build-assets/logo-all.txt', siteRoot)).then((response) => {
        if (!response.ok) throw new Error('Logo asset unavailable');
        return response.text();
      })
    ]);
    const clean = (value) => value.replace(/\s+/g, '');
    root.style.setProperty('--famfirst-hero-photo', `url("data:image/webp;base64,${clean(heroA + heroB)}")`);
    root.style.setProperty('--famfirst-clean-logo', `url("data:image/webp;base64,${clean(logo)}")`);
  } catch (error) {
    console.warn('FamFirst visual assets could not be loaded.', error);
  }
}

function initMenu() {
  const button = document.querySelector('[data-menu]');
  const nav = document.querySelector('[data-nav]');
  if (!button || !nav) return;
  button.addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
}

function initFaq() {
  document.querySelectorAll('.faq-q').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      item.classList.toggle('open');
      button.setAttribute('aria-expanded', item.classList.contains('open'));
      const plus = button.querySelector('.faq-plus');
      if (plus) plus.textContent = item.classList.contains('open') ? '−' : '+';
    });
  });
}

function showStatus(form, message, type = 'success') {
  const box = form.querySelector('.status-message');
  if (!box) return;
  box.textContent = message;
  box.className = `status-message show ${type}`;
}

function saveLocalLead(lead) {
  const leads = JSON.parse(localStorage.getItem('famfirst_leads') || '[]');
  leads.unshift(lead);
  localStorage.setItem('famfirst_leads', JSON.stringify(leads.slice(0, 100)));
}

async function submitLead(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const lead = {
    id: crypto.randomUUID ? crypto.randomUUID() : `lead-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'New',
    ...data
  };

  saveLocalLead(lead);

  if (FAMFIRST.apiBase) {
    try {
      const response = await fetch(`${FAMFIRST.apiBase}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (!response.ok) throw new Error('Could not save appointment request');
      showStatus(form, 'Your request was received. The clinic team will contact you to confirm the appointment.');
      form.reset();
      return;
    } catch (error) {
      console.error(error);
    }
  }

  const text = [
    `Hi ${FAMFIRST.clinicName}, I would like to request an appointment.`,
    `Name: ${data.name || '-'}`,
    `Phone: ${data.phone || '-'}`,
    `Service: ${data.service || '-'}`,
    `Preferred date: ${data.date || '-'}`,
    `Notes: ${data.notes || '-'}`
  ].join('\n');
  showStatus(form, 'WhatsApp is opening with your appointment details. Send the message to complete your request.');
  window.open(`https://wa.me/${FAMFIRST.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  form.reset();
}

const checkoutPrices = {
  'Weight Management Consultation Deposit': 50,
  'Skin Tag Assessment Deposit': 50,
  'Skin Health Consultation Deposit': 50,
  'General Consultation Deposit': 30
};

function updateCheckoutSummary() {
  const service = document.querySelector('#checkout-service');
  const serviceLabel = document.querySelector('[data-summary-service]');
  const amountLabel = document.querySelector('[data-summary-amount]');
  const totalLabel = document.querySelector('[data-summary-total]');
  if (!service || !serviceLabel || !amountLabel || !totalLabel) return;
  const amount = checkoutPrices[service.value] || 0;
  serviceLabel.textContent = service.value;
  amountLabel.textContent = money(amount);
  totalLabel.textContent = money(amount);
}

async function submitCheckout(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.amount = checkoutPrices[payload.service] || 0;

  if (!payload.amount) {
    showStatus(form, 'Please select a service.', 'error');
    return;
  }

  if (FAMFIRST.apiBase) {
    try {
      const response = await fetch(`${FAMFIRST.apiBase}/api/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.paymentUrl) throw new Error(result.error || 'Payment could not be created');
      window.location.href = result.paymentUrl;
      return;
    } catch (error) {
      showStatus(form, error.message, 'error');
      return;
    }
  }

  const payments = JSON.parse(localStorage.getItem('famfirst_payments') || '[]');
  payments.unshift({
    id: `DEMO-${Date.now()}`,
    name: payload.name,
    service: payload.service,
    amount: payload.amount,
    status: 'Demo paid',
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('famfirst_payments', JSON.stringify(payments.slice(0, 100)));
  showStatus(form, `Demo payment of ${money(payload.amount)} recorded. Connect the Worker API and Billplz credentials to accept real FPX payments.`);
  form.reset();
  updateCheckoutSummary();
}

function initForms() {
  document.querySelectorAll('[data-lead-form]').forEach((form) => form.addEventListener('submit', submitLead));
  const checkout = document.querySelector('[data-checkout-form]');
  if (checkout) {
    checkout.addEventListener('submit', submitCheckout);
    document.querySelector('#checkout-service')?.addEventListener('change', updateCheckoutSummary);
    updateCheckoutSummary();
  }
}

function renderDashboard() {
  const dashboard = document.querySelector('[data-dashboard]');
  if (!dashboard) return;

  const sampleLeads = [
    { name: 'Aina R.', service: 'Weight management', createdAt: '2026-07-30T01:10:00Z', status: 'New' },
    { name: 'Farid M.', service: 'Skin tag assessment', createdAt: '2026-07-29T08:15:00Z', status: 'Confirmed' },
    { name: 'Siti N.', service: 'Skin health consultation', createdAt: '2026-07-28T04:20:00Z', status: 'Confirmed' }
  ];
  const samplePayments = [
    { name: 'Farid M.', service: 'Skin Tag Assessment Deposit', amount: 50, status: 'Paid', createdAt: '2026-07-29T08:20:00Z' },
    { name: 'Siti N.', service: 'Skin Health Consultation Deposit', amount: 50, status: 'Paid', createdAt: '2026-07-28T04:25:00Z' }
  ];
  const localLeads = JSON.parse(localStorage.getItem('famfirst_leads') || '[]');
  const localPayments = JSON.parse(localStorage.getItem('famfirst_payments') || '[]');
  const leads = [...localLeads, ...sampleLeads];
  const payments = [...localPayments, ...samplePayments];

  const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  document.querySelector('[data-kpi-leads]').textContent = leads.length;
  document.querySelector('[data-kpi-payments]').textContent = money(paidTotal);
  document.querySelector('[data-kpi-bookings]').textContent = leads.filter((l) => /confirmed/i.test(l.status)).length;
  document.querySelector('[data-kpi-conversion]').textContent = leads.length ? `${Math.round((payments.length / leads.length) * 100)}%` : '0%';

  const tbody = document.querySelector('[data-leads-table]');
  if (tbody) {
    tbody.innerHTML = leads.slice(0, 8).map((lead) => {
      const date = new Date(lead.createdAt).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
      const statusClass = /confirmed/i.test(lead.status) ? 'status-confirmed' : 'status-new';
      return `<tr><td>${escapeHtml(lead.name || '-')}</td><td>${escapeHtml(lead.service || '-')}</td><td>${date}</td><td><span class="status-pill ${statusClass}">${escapeHtml(lead.status || 'New')}</span></td></tr>`;
    }).join('');
  }

  const chartValues = [38, 52, 44, 70, 62, 83, 76, 92, 68, 88, 96, 84];
  const chart = document.querySelector('[data-chart]');
  if (chart) {
    chart.innerHTML = chartValues.map((value, index) => `<div class="bar-wrap"><div class="bar" style="height:${value}%"></div><div class="bar-label">W${index + 1}</div></div>`).join('');
  }

  document.querySelector('[data-export]')?.addEventListener('click', () => exportCsv(leads));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function exportCsv(leads) {
  const rows = [['Name', 'Phone', 'Service', 'Date', 'Status'], ...leads.map((l) => [l.name || '', l.phone || '', l.service || '', l.createdAt || '', l.status || ''])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'famfirst-leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function updateYear() {
  document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });
}

initBrandAssets();
initMenu();
initFaq();
initForms();
renderDashboard();
updateYear();

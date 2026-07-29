CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service TEXT NOT NULL,
  preferred_date TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  bill_id TEXT UNIQUE,
  lead_id TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service TEXT NOT NULL,
  amount_sen INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TEXT,
  provider_payload TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);

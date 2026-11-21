CREATE TABLE IF NOT EXISTS paypal_orders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 paypal_id TEXT UNIQUE,
 plan_id TEXT NOT NULL,
 amount TEXT NOT NULL,
 currency TEXT NOT NULL,
 billing_period TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','canceled')),
 approval_url TEXT,
 created_at TEXT NOT NULL,
 completed_at TEXT,
 capture_id TEXT UNIQUE,
 expires_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS paypal_pending_user ON paypal_orders(user_id) WHERE status='pending';
INSERT OR IGNORE INTO meta(key,value) VALUES('migration-0006-paypal-sandbox','applied');

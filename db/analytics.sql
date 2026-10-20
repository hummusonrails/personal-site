-- Schema for the analytics database (Turso). Apply with:
--   turso db shell personal-site-analytics < db/analytics.sql
-- Every statement is idempotent, so re-running it is safe.

-- One row per page view or outbound click (see src/lib/analytics). Cookieless:
-- `visitor` is a daily-rotating hash.
CREATE TABLE IF NOT EXISTS analytics_hits (
  id TEXT PRIMARY KEY NOT NULL,
  ts INTEGER NOT NULL, -- epoch milliseconds
  kind TEXT NOT NULL,
  visitor TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT,
  target TEXT,
  referrer TEXT,
  ref_host TEXT,
  channel TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  lang TEXT,
  engaged_ms INTEGER
);
CREATE INDEX IF NOT EXISTS analytics_hits_kind_ts ON analytics_hits (kind, ts);
CREATE INDEX IF NOT EXISTS analytics_hits_ts ON analytics_hits (ts);

-- Failed admin sign-ins, so password guessing is throttled across every
-- serverless instance (see src/lib/login-throttle.ts).
CREATE TABLE IF NOT EXISTS admin_login_failures (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL -- epoch milliseconds
);
CREATE INDEX IF NOT EXISTS admin_login_failures_ts ON admin_login_failures (ts);

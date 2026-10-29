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

-- Views of the github.com/hummusonrails profile, counted by invisible images
-- in its README (see src/pages/api/gh). GitHub's image proxy hides every
-- viewer, so a hit carries only what the viewer's browser chose: which
-- <picture> source matched its screen width, input and pixel density, or its
-- GitHub theme. 'view' arrives on every load; 'viewer' and 'theme' once per
-- browser per UTC day.
CREATE TABLE IF NOT EXISTS github_profile_hits (
  ts INTEGER NOT NULL, -- epoch milliseconds
  kind TEXT NOT NULL,
  device TEXT,  -- Mobile, Tablet, Desktop
  screen TEXT,  -- phone, tablet, laptop, large
  input TEXT,   -- touch, mouse
  density TEXT, -- 1x, 2x
  theme TEXT    -- dark, light (kind 'theme' only)
);
CREATE INDEX IF NOT EXISTS github_profile_hits_ts ON github_profile_hits (ts, kind);

-- Requests to greenberg.md (see src/lib/analytics/profile-hits.ts). Recorded
-- on the server, so agents and terminals that never run JavaScript count too.
-- kind: 'view' (the profile in any format), 'robots' (robots.txt), 'out' (a
-- link followed from the HTML page). reader and reader_kind name who asked,
-- from the user agent (see readers.ts); device, browser and os are kept for
-- people only.
CREATE TABLE IF NOT EXISTS profile_hits (
  id TEXT PRIMARY KEY NOT NULL,
  ts INTEGER NOT NULL, -- epoch milliseconds
  kind TEXT NOT NULL,
  visitor TEXT NOT NULL,
  format TEXT NOT NULL, -- md, html, llms, robots
  reader TEXT NOT NULL,
  reader_kind TEXT NOT NULL,
  ua TEXT,
  target TEXT,
  referrer TEXT,
  ref_host TEXT,
  channel TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  lang TEXT,
  engaged_ms INTEGER
);
CREATE INDEX IF NOT EXISTS profile_hits_kind_ts ON profile_hits (kind, ts);

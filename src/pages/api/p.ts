import type { APIRoute } from 'astro';
import { analyticsDb } from '../../lib/analytics/db';
import { parseHit } from '../../lib/analytics/collect';
import { allowedBeacon } from '../../lib/analytics/limit';

export const prerender = false;

// Public, cookieless analytics beacon (see scripts/analytics/track.ts). Always
// answers 204 so a bad or blocked hit never shows up as an error on the page.
const done = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request }) => {
  try {
    const salt = import.meta.env.ANALYTICS_SALT || process.env.ANALYTICS_SALT;
    const db = analyticsDb();
    if (!salt || !db) return done();
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (!allowedBeacon(ip, Date.now())) return done();
    const hit = parseHit({ body: await request.text(), headers: request.headers, now: new Date(), salt });
    if (!hit) return done();
    if (hit.type === 'engage') {
      await db.execute({
        sql: "UPDATE analytics_hits SET engaged_ms = ? WHERE id = ? AND visitor = ? AND kind = 'pv'",
        args: [hit.engagedMs, hit.id, hit.visitor],
      });
    } else {
      const r = hit.row;
      await db.execute({
        sql: `INSERT INTO analytics_hits (id, ts, kind, visitor, path, title, target, referrer, ref_host, channel,
                utm_source, utm_medium, utm_campaign, utm_content, utm_term, country, region, city, device, browser, os, lang)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
        args: [r.id, r.ts, r.kind, r.visitor, r.path, r.title, r.target, r.referrer, r.refHost, r.channel,
          r.utmSource, r.utmMedium, r.utmCampaign, r.utmContent, r.utmTerm, r.country, r.region, r.city,
          r.device, r.browser, r.os, r.lang],
      });
    }
  } catch (err) {
    console.error('analytics collect failed', err);
  }
  return done();
};

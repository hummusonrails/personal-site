import type { APIRoute } from 'astro';
import { analyticsDb } from '../../../lib/analytics/db';
import { allowedBeacon } from '../../../lib/analytics/limit';

export const prerender = false;

// Invisible 1x1 images in the github.com/hummusonrails README. GitHub serves
// README images through its camo proxy, which passes on no cookie, address or
// user agent of the viewer, so the only signal is that a fetch happened:
// - view.gif is never cached, so every profile load reaches here
// - viewer.gif is cached by the viewer's browser (never by GitHub's CDN, it is
//   private) until the next UTC midnight, so it arrives once per browser per day
const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0));
const KINDS = new Set(['view', 'viewer']);
const CAMO = /^github-camo\b/;

function untilUtcMidnight(now: Date) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.floor((next - now.getTime()) / 1000));
}

export const GET: APIRoute = async ({ params, request }) => {
  const kind = params.kind || '';
  const now = new Date();
  const cache = kind === 'viewer'
    ? `private, max-age=${untilUtcMidnight(now)}`
    : 'no-cache, no-store, must-revalidate, max-age=0';
  const headers = {
    'Content-Type': 'image/gif',
    'Cache-Control': cache,
    'X-Robots-Tag': 'noindex',
    ...(kind === 'viewer' ? {} : { Expires: 'Thu, 01 Jan 1970 00:00:00 GMT' }),
  };
  if (!KINDS.has(kind)) return new Response(GIF, { status: 200, headers });

  // Only GitHub's proxy is counted, so opening the image directly adds nothing.
  try {
    const db = analyticsDb();
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (db && CAMO.test(request.headers.get('user-agent') || '') && allowedBeacon(`gh:${ip}`, now.getTime())) {
      await db.execute({ sql: 'INSERT INTO github_profile_hits (ts, kind) VALUES (?, ?)', args: [now.getTime(), kind] });
    }
  } catch (err) {
    console.error('github profile hit failed', err);
  }
  return new Response(GIF, { status: 200, headers });
};

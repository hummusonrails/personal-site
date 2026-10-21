import type { APIRoute } from 'astro';
import { analyticsDb } from '../../../lib/analytics/db';
import { allowedBeacon } from '../../../lib/analytics/limit';

export const prerender = false;

// Invisible 1x1 images in the github.com/hummusonrails README. GitHub serves
// README images through its camo proxy, which passes on no cookie, address or
// user agent of the viewer, so all a hit can carry is which <picture> source
// the viewer's browser picked (screen width, input, pixel density, or GitHub
// theme; see build_profile.py in that repo):
// - view.gif is never cached, so every profile load reaches here
// - viewer.gif and theme.gif are cached by the viewer's browser (never by
//   GitHub's CDN, they are private) until the next UTC midnight, so they
//   arrive once per browser per day
const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0));
const KINDS = new Set(['view', 'viewer', 'theme']);
const CAMO = /^github-camo\b/;
const TRAITS = {
  s: new Set(['phone', 'tablet', 'laptop', 'large']),
  i: new Set(['touch', 'mouse']),
  r: new Set(['1x', '2x']),
  t: new Set(['dark', 'light']),
};

function untilUtcMidnight(now: Date) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.floor((next - now.getTime()) / 1000));
}

/** The traits a hit's URL names; anything not on the lists is dropped. */
function traits(q: URLSearchParams) {
  const pick = (k: keyof typeof TRAITS) => {
    const v = q.get(k);
    return v && TRAITS[k].has(v) ? v : null;
  };
  const screen = pick('s'), input = pick('i');
  // A touch screen is a phone or a tablet by its width; a mouse is a computer
  // whatever the window size.
  const device = !screen || !input ? null : input === 'mouse' ? 'Desktop' : screen === 'phone' ? 'Mobile' : 'Tablet';
  return { device, screen, input, density: pick('r'), theme: pick('t') };
}

export const GET: APIRoute = async ({ params, request, url }) => {
  const kind = params.kind || '';
  const now = new Date();
  const headers = {
    'Content-Type': 'image/gif',
    'Cache-Control': kind === 'view' ? 'no-cache, no-store, must-revalidate, max-age=0' : `private, max-age=${untilUtcMidnight(now)}`,
    'X-Robots-Tag': 'noindex',
    ...(kind === 'view' ? { Expires: 'Thu, 01 Jan 1970 00:00:00 GMT' } : {}),
  };
  if (!KINDS.has(kind)) return new Response(GIF, { status: 200, headers });

  // Only GitHub's proxy is counted, so opening the image directly adds nothing.
  try {
    const db = analyticsDb();
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (db && CAMO.test(request.headers.get('user-agent') || '') && allowedBeacon(`gh:${ip}`, now.getTime())) {
      const t = traits(url.searchParams);
      await db.execute({
        sql: 'INSERT INTO github_profile_hits (ts, kind, device, screen, input, density, theme) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [now.getTime(), kind, t.device, t.screen, t.input, t.density, kind === 'theme' ? t.theme : null],
      });
    }
  } catch (err) {
    console.error('github profile hit failed', err);
  }
  return new Response(GIF, { status: 200, headers });
};

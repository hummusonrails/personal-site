import type { APIRoute } from 'astro';
import { recordProfileBeacon } from '../../lib/analytics/profile-hits';

export const prerender = false;

// Time on page and followed links from the greenberg.md HTML page. Always
// answers 204, like the site's beacon.
export const POST: APIRoute = async ({ request }) => {
  try {
    await recordProfileBeacon(request);
  } catch (err) {
    console.error('greenberg.md beacon failed', err);
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
};

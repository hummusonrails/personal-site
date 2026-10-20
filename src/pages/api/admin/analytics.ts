import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { analyticsDb, runner } from '../../../lib/analytics/db';
import { FILTERS, report } from '../../../lib/analytics/report';
import { VALID_TZ } from '../../../lib/analytics/tz';

export const prerender = false;

// Numbers for the admin analytics desk (/admin/analytics). Never cached.
const PRIVATE = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: PRIVATE });
const MAX_SPAN = 5 * 366 * 86400_000;

export const GET: APIRoute = async ({ request, url }) => {
  // The middleware already guards /api/admin; checked again so this route
  // stays private even if that ever changes.
  if (!isAuthenticated(request)) return json(401, { error: 'Unauthorized' });

  const db = analyticsDb();
  if (!db) return json(503, { error: 'analytics database not configured' });

  const p = url.searchParams;
  const date = (k: string) => new Date(p.get(k) || '');
  const from = date('from');
  const to = date('to');
  const prevFrom = date('pfrom');
  const prevTo = date('pto');
  const tz = p.get('tz') || 'UTC';
  const span = to.getTime() - from.getTime();
  const prevSpan = prevTo.getTime() - prevFrom.getTime();
  if (!(span > 0) || span > MAX_SPAN || !(prevSpan > 0) || prevSpan > MAX_SPAN || !VALID_TZ.test(tz)) {
    return json(400, { error: 'bad range' });
  }

  const filters: Record<string, string> = {};
  for (const k of Object.keys(FILTERS)) {
    const v = p.get(k);
    if (v) filters[k] = v.slice(0, 300);
  }

  try {
    const body = await report(
      { from, to, prevFrom, prevTo, tz, hourly: span <= 2 * 86400_000, filters, now: new Date() },
      runner(db),
    );
    return json(200, body);
  } catch (err) {
    console.error('analytics report failed', err);
    return json(500, { error: 'report failed' });
  }
};

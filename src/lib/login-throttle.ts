// Throttles admin password guessing: at most MAX_FAILURES wrong passwords per
// address per WINDOW. Failures are kept in the analytics database so the limit
// holds across every serverless instance; without one (local dev) it falls
// back to this instance's memory.
import { analyticsDb } from './analytics/db';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const memory = new Map<string, number[]>();

export function clientIp(request: Request): string {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** True while the address has used up its attempts. */
export async function loginBlocked(ip: string, now = Date.now()): Promise<boolean> {
  const db = analyticsDb();
  if (!db) return (memory.get(ip) || []).filter((t) => now - t < WINDOW_MS).length >= MAX_FAILURES;
  const { rows } = await db.execute({
    sql: 'SELECT count(*) AS n FROM admin_login_failures WHERE ip = ? AND ts > ?',
    args: [ip, now - WINDOW_MS],
  });
  return Number(rows[0]?.n ?? 0) >= MAX_FAILURES;
}

export async function recordLoginFailure(ip: string, now = Date.now()): Promise<void> {
  const db = analyticsDb();
  if (!db) {
    memory.set(ip, [...(memory.get(ip) || []).filter((t) => now - t < WINDOW_MS), now]);
    return;
  }
  await db.batch([
    { sql: 'INSERT INTO admin_login_failures (ip, ts) VALUES (?, ?)', args: [ip, now] },
    { sql: 'DELETE FROM admin_login_failures WHERE ts < ?', args: [now - 24 * 3600_000] },
  ]);
}

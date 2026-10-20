// The analytics database (Turso). Schema in db/analytics.sql.
import { createClient, type Client } from '@libsql/client';
import type { Runner } from './report';

let client: Client | null = null;

/** Null when the database is not configured (local dev without credentials). */
export function analyticsDb(): Client | null {
  if (client) return client;
  const url = import.meta.env.ANALYTICS_DATABASE_URL || process.env.ANALYTICS_DATABASE_URL;
  if (!url) return null;
  const authToken = import.meta.env.ANALYTICS_DATABASE_TOKEN || process.env.ANALYTICS_DATABASE_TOKEN;
  client = createClient({ url, authToken });
  return client;
}

export const runner = (db: Client): Runner => async (sql, args) =>
  (await db.execute({ sql, args })).rows as unknown as Record<string, unknown>[];

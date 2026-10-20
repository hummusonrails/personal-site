import type { APIRoute } from 'astro';
import { validatePassword, createSessionCookie, clearSessionCookie } from '../../../lib/auth';
import { clientIp, loginBlocked, recordLoginFailure } from '../../../lib/login-throttle';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export const POST: APIRoute = async ({ request }) => {
  let body: { action?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Bad request' });
  }
  const { action, password } = body ?? {};

  if (action === 'logout') {
    return json(200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
  }

  const ip = clientIp(request);
  if (await loginBlocked(ip)) {
    return json(429, { error: 'Too many attempts. Try again in 15 minutes.' }, { 'Retry-After': '900' });
  }

  if (typeof password !== 'string' || !password || !validatePassword(password)) {
    await recordLoginFailure(ip);
    return json(401, { error: 'Invalid password' });
  }

  return json(200, { ok: true }, { 'Set-Cookie': createSessionCookie() });
};

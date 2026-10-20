import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// __Host- cookies are only accepted over HTTPS, for this exact host and path
// "/", so no subdomain or plain-HTTP page can set or overwrite the session.
const COOKIE_NAME = '__Host-cms_session';
const MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const secret = import.meta.env.CMS_SESSION_SECRET || process.env.CMS_SESSION_SECRET;
  if (!secret) throw new Error('CMS_SESSION_SECRET is not set');
  return secret;
}

function getPassword(): string {
  const password = import.meta.env.CMS_PASSWORD || process.env.CMS_PASSWORD;
  if (!password) throw new Error('CMS_PASSWORD is not set');
  return password;
}

// Constant-time string comparison. Hashing first gives both sides the same
// length, so neither the content nor the length of the secret leaks.
function same(a: string, b: string): boolean {
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

function sign(value: string): string {
  const secret = getSecret();
  const signature = createHmac('sha256', secret).update(value).digest('hex');
  return `${value}.${signature}`;
}

function verify(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;
  const value = signed.slice(0, lastDot);
  if (!same(sign(value), signed)) return null;
  return value;
}

export function validatePassword(password: string): boolean {
  return same(password, getPassword());
}

export function createSessionCookie(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const token = sign(String(timestamp));
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}; Secure`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`;
}

export function isAuthenticated(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;

  let token: string | undefined;
  for (const c of cookieHeader.split(';')) {
    const [key, ...rest] = c.trim().split('=');
    if (key !== COOKIE_NAME) continue;
    try {
      token = decodeURIComponent(rest.join('='));
    } catch {
      return false;
    }
  }
  if (!token) return false;

  const timestamp = verify(token);
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  const age = now - Number(timestamp);
  return age >= 0 && age < MAX_AGE;
}

import { createHmac } from 'node:crypto';

const COOKIE_NAME = 'cms_session';
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

function sign(value: string): string {
  const secret = getSecret();
  const signature = createHmac('sha256', secret).update(value).digest('hex');
  return `${value}.${signature}`;
}

function verify(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;
  const value = signed.slice(0, lastDot);
  const expected = sign(value);
  if (expected !== signed) return null;
  return value;
}

export function validatePassword(password: string): boolean {
  return password === getPassword();
}

export function createSessionCookie(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const token = sign(String(timestamp));
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}; Secure`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

export function isAuthenticated(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    })
  );

  const token = cookies[COOKIE_NAME];
  if (!token) return false;

  const timestamp = verify(token);
  if (!timestamp) return false;

  const now = Math.floor(Date.now() / 1000);
  const age = now - Number(timestamp);
  return age >= 0 && age < MAX_AGE;
}

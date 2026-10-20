import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import { createSessionCookie, isAuthenticated, validatePassword } from '@/lib/auth';

beforeAll(() => {
  process.env.CMS_SESSION_SECRET = 'test-secret';
  process.env.CMS_PASSWORD = 'correct horse';
});
afterEach(() => vi.useRealTimers());

const req = (cookie: string) => new Request('https://bengreenberg.dev/admin', { headers: { cookie } });
const session = () => createSessionCookie().split(';')[0];

describe('admin session', () => {
  it('accepts the cookie it issued', () => {
    expect(isAuthenticated(req(session()))).toBe(true);
  });

  it('rejects a tampered, forged or expired cookie', () => {
    const [name, value] = session().split('=');
    const [ts, sig] = decodeURIComponent(value).split('.');
    expect(isAuthenticated(req(`${name}=${encodeURIComponent(`${Number(ts) + 3600}.${sig}`)}`))).toBe(false);
    expect(isAuthenticated(req(`${name}=${ts}.deadbeef`))).toBe(false);
    expect(isAuthenticated(req(`cms_session=${value}`))).toBe(false);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 25 * 3600_000);
    expect(isAuthenticated(req(`${name}=${value}`))).toBe(false);
  });

  it('checks the password exactly', () => {
    expect(validatePassword('correct horse')).toBe(true);
    expect(validatePassword('correct hors')).toBe(false);
    expect(validatePassword('')).toBe(false);
  });
});

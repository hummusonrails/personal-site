import type { APIRoute } from 'astro';
import { validatePassword, createSessionCookie, clearSessionCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { action, password } = body;

  if (action === 'logout') {
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(),
      },
    });
  }

  if (!password || !validatePassword(password)) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createSessionCookie(),
    },
  });
};

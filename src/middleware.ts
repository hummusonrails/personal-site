import { defineMiddleware } from 'astro:middleware';
import { isAuthenticated } from './lib/auth';
import { ConflictError } from './lib/github';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/api/admin/auth'];

// Every admin response, the login page and redirects included: never indexed,
// never cached by the CDN or a shared proxy.
const PRIVATE_HEADERS: Record<string, string> = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
};

function withPrivateHeaders(response: Response): Response {
  const res = new Response(response.body, response);
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) res.headers.set(k, v);
  return res;
}

function originHost(request: Request): string | null {
  try {
    return new URL(request.headers.get('origin') || '').host;
  } catch {
    return null;
  }
}

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const path = url.pathname;

  // Only protect /admin and /api/admin routes
  const isAdminRoute = /^\/(api\/)?admin(\/|$)/.test(path);
  if (!isAdminRoute) return next();

  const isApi = path.startsWith('/api/');
  const json = (status: number, error: string) =>
    withPrivateHeaders(new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } }));

  // Writes must come from this site's own pages (browsers always send Origin
  // on them), on top of the SameSite=Strict session cookie.
  if (isApi && request.method !== 'GET' && request.method !== 'HEAD' && originHost(request) !== url.host) {
    return json(403, 'Forbidden');
  }

  // Allow public admin paths (login page, auth endpoint)
  if (PUBLIC_ADMIN_PATHS.some((p) => path === p || path === p + '/')) return withPrivateHeaders(await next());

  // Check authentication
  if (!isAuthenticated(request)) {
    if (isApi) return json(401, 'Unauthorized');
    return withPrivateHeaders(new Response(null, { status: 302, headers: { Location: '/admin/login' } }));
  }

  // A failing admin API call answers with its reason as JSON, so the CMS
  // pages can show it instead of a bare 500.
  if (isApi) {
    try {
      return withPrivateHeaders(await next());
    } catch (err) {
      if (err instanceof ConflictError) return json(409, err.message);
      console.error(err);
      return json(500, err instanceof Error ? err.message : 'Server error');
    }
  }

  return withPrivateHeaders(await next());
});

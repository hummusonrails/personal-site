import { defineMiddleware } from 'astro:middleware';
import { isAuthenticated } from './lib/auth';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/api/admin/auth'];

export const onRequest = defineMiddleware(async ({ request, url, redirect }, next) => {
  const path = url.pathname;

  // Only protect /admin and /api/admin routes
  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin');
  if (!isAdminRoute) return next();

  // Allow public admin paths (login page, auth endpoint)
  if (PUBLIC_ADMIN_PATHS.some((p) => path === p || path === p + '/')) return next();

  // Check authentication
  if (!isAuthenticated(request)) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/admin/login');
  }

  return next();
});

import type { APIRoute } from 'astro';
import { PROFILE, isProfileHost } from '@/data/profile';

export const prerender = false;

// Every crawler, AI crawlers included, is welcome on both hosts; only the
// admin is kept out.
export const GET: APIRoute = ({ url }) => {
  const body = isProfileHost(url.host)
    ? ['User-agent: *', 'Allow: /', '', `# Markdown for agents: ${PROFILE.canonical}index.md`, ''].join('\n')
    : ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/admin', '', `Sitemap: ${PROFILE.site}/sitemap-index.xml`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};

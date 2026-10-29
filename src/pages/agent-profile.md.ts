import type { APIRoute } from 'astro';
import { buildProfile } from '@/lib/profile';
import { PROFILE } from '@/data/profile';

export const prerender = false;

// greenberg.md for agents and terminals. src/middleware.ts routes the
// greenberg.md host here; on bengreenberg.dev this path redirects there.
export const GET: APIRoute = async () => {
  const { markdown, lastUpdated } = await buildProfile();
  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Last-Modified': new Date(`${lastUpdated}T00:00:00Z`).toUTCString(),
      Link: `<${PROFILE.canonical}>; rel="canonical"`,
      'X-Robots-Tag': 'all',
      Vary: 'Accept',
    },
  });
};

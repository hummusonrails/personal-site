import type { APIRoute } from 'astro';
import links from '../../data/video-links.json';

export const prerender = false;

export const GET: APIRoute = ({ params, url }) => {
  const slug = params.slug ?? '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return new Response('Video not found', { status: 404 });
  }
  const id = (links as Record<string, string>)[slug];
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return new Response('Video not found', { status: 404 });
  }
  const destination = new URL('https://www.youtube.com/watch');
  destination.searchParams.set('v', id);
  const at = url.searchParams.get('t');
  if (at && /^\d{1,5}$/.test(at) && Number(at) <= 7200) {
    destination.searchParams.set('t', `${Number(at)}s`);
  }
  return new Response(null, {
    status: 302,
    headers: { Location: destination.href, 'Cache-Control': 'public, max-age=60' },
  });
};

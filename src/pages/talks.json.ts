import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Every talk, newest first, for anything that lists them elsewhere (the GitHub profile README reads this).
export const prerender = true;

export const GET: APIRoute = async () => {
  const talks = (await getCollection('talks')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const body = talks.map(({ data }) => ({
    title: data.presentation,
    event: data.conference,
    region: data.region,
    date: data.date.toISOString().slice(0, 10),
    link: data.link,
  }));
  return new Response(JSON.stringify({ talks: body }, null, 1), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = false;

// The pre-Astro site served posts at /posts/YYYY-MM-DD-old-slug/, and those
// links still circulate (the GitHub profile README, other posts, search
// results). Every post has a unique date, so the date alone finds it.
export const GET: APIRoute = async ({ params, redirect }) => {
  const path = params.path || '';
  const date = path.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const rest = path.replace(/^\d{4}-\d{2}-\d{2}-?/, '').replace(/\/$/, '');

  const posts = (await getCollection('blog')).filter((post) => !post.data.draft);
  const match =
    posts.find((post) => post.id === rest) ||
    (date && posts.find((post) => post.data.date.toISOString().slice(0, 10) === date));

  return redirect(match ? `/blog/${match.id}` : '/blog', 301);
};

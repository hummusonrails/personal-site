import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('blog');

  const sorted = posts
    .filter((p) => !p.data.draft)
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
    .map((post) => ({
      title: post.data.title,
      slug: post.slug,
    }));

  return new Response(JSON.stringify(sorted), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

import type { APIRoute } from 'astro';
import { listFiles, getFile, createOrUpdateFile, deleteFile } from '../../../lib/github';
import matter from 'gray-matter';

const BLOG_DIR = 'src/content/blog';

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');

  if (slug) {
    const file = await getFile(`${BLOG_DIR}/${slug}.md`);
    if (!file) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    const { data, content } = matter(file.content);
    return new Response(JSON.stringify({ frontmatter: data, content, sha: file.sha, slug }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const files = await listFiles(BLOG_DIR);
  const posts = [];

  for (const f of files) {
    if (!f.name.endsWith('.md')) continue;
    const fileData = await getFile(f.path);
    if (!fileData) continue;
    const { data } = matter(fileData.content);
    posts.push({
      slug: f.name.replace('.md', ''),
      title: data.title || f.name,
      date: data.date,
      draft: data.draft || false,
      tags: data.tags || [],
      summary: data.summary || '',
      sha: fileData.sha,
    });
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return new Response(JSON.stringify(posts), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { slug, frontmatter, content, sha } = body;

  if (!slug || !frontmatter || content === undefined) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  // Build the tags in the format the content collection expects
  const tags = (frontmatter.tags || ['posts']).map((t: string) => {
    if (typeof t === 'object') return t;
    return { slug: t, collection: 'tags' };
  });

  const authors = (frontmatter.authors || ['default']).map((a: string) => {
    if (typeof a === 'object') return a;
    return a;
  });

  const fm: Record<string, any> = {
    title: frontmatter.title,
    date: frontmatter.date || new Date().toISOString().split('T')[0],
    tags,
    authors,
  };

  if (frontmatter.summary) fm.summary = frontmatter.summary;
  if (frontmatter.images) fm.images = frontmatter.images;
  if (frontmatter.canonicalUrl) fm.canonicalUrl = frontmatter.canonicalUrl;
  if (frontmatter.draft !== undefined) fm.draft = frontmatter.draft;
  if (frontmatter.lastmod) fm.lastmod = frontmatter.lastmod;

  const fileContent = matter.stringify(content, fm);
  const filePath = `${BLOG_DIR}/${slug}.md`;
  const message = sha ? `Update blog post: ${frontmatter.title}` : `Add blog post: ${frontmatter.title}`;

  const result = await createOrUpdateFile(filePath, fileContent, message, sha);

  return new Response(JSON.stringify({ ok: true, sha: result.sha }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { slug, sha } = body;

  if (!slug || !sha) {
    return new Response(JSON.stringify({ error: 'Missing slug or sha' }), { status: 400 });
  }

  await deleteFile(`${BLOG_DIR}/${slug}.md`, sha, `Delete blog post: ${slug}`);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

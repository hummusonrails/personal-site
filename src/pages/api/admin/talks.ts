import type { APIRoute } from 'astro';
import { listFiles, getFile, createOrUpdateFile, deleteFile } from '../../../lib/github';
import matter from 'gray-matter';

const TALKS_DIR = 'src/content/talks';

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');

  if (slug) {
    const file = await getFile(`${TALKS_DIR}/${slug}.md`);
    if (!file) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    const { data } = matter(file.content);
    return new Response(JSON.stringify({ frontmatter: data, sha: file.sha, slug }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const files = await listFiles(TALKS_DIR);
  const talks = [];

  for (const f of files) {
    if (!f.name.endsWith('.md')) continue;
    const fileData = await getFile(f.path);
    if (!fileData) continue;
    const { data } = matter(fileData.content);
    talks.push({
      slug: f.name.replace('.md', ''),
      presentation: data.presentation,
      conference: data.conference,
      region: data.region,
      date: data.date,
      link: data.link,
      image: data.image || '',
      sha: fileData.sha,
    });
  }

  talks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return new Response(JSON.stringify(talks), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { slug, frontmatter, sha } = body;

  if (!slug || !frontmatter) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const fm = {
    presentation: frontmatter.presentation,
    conference: frontmatter.conference,
    region: frontmatter.region,
    date: frontmatter.date,
    link: frontmatter.link,
    ...(frontmatter.image && { image: frontmatter.image }),
  };

  const fileContent = matter.stringify('', fm);
  const filePath = `${TALKS_DIR}/${slug}.md`;
  const message = sha
    ? `Update talk: ${frontmatter.presentation}`
    : `Add talk: ${frontmatter.presentation}`;

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

  await deleteFile(`${TALKS_DIR}/${slug}.md`, sha, `Delete talk: ${slug}`);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

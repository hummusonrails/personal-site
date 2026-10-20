import type { APIRoute } from 'astro';
import { listFiles, getFile, getFiles, commitFiles } from '../../../lib/github';
import { TALKS_DIR, talkFile, talkProblems, validSlug, ymd } from '../../../lib/cms/content';
import matter from 'gray-matter';

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');

  if (slug) {
    if (!validSlug(slug)) return new Response(JSON.stringify({ error: 'Bad slug' }), { status: 400 });
    const file = await getFile(`${TALKS_DIR}/${slug}.md`);
    if (!file) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    const { data } = matter(file.content);
    return new Response(JSON.stringify({ frontmatter: data, sha: file.sha, slug }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const files = (await listFiles(TALKS_DIR)).filter((f) => f.name.endsWith('.md'));
  const contents = await getFiles(files.map((f) => f.path));
  const talks = [];

  for (const [i, f] of files.entries()) {
    const fileData = contents[i];
    if (!fileData) continue;
    const { data } = matter(fileData.content);
    talks.push({
      slug: f.name.replace('.md', ''),
      presentation: data.presentation,
      conference: data.conference,
      region: data.region,
      date: ymd(data.date),
      link: data.link,
      image: data.image || '',
      sha: fileData.sha,
    });
  }

  talks.sort((a, b) => b.date.localeCompare(a.date));

  return new Response(JSON.stringify(talks), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { slug, frontmatter: fields } = body;
  const sha = typeof body.sha === 'string' && body.sha ? body.sha : null;
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

  if (!validSlug(slug)) return json({ error: 'Bad slug' }, 400);
  const problems = talkProblems(fields || {});
  if (problems.length) return json({ error: problems.join(' ') }, 400);

  const path = `${TALKS_DIR}/${slug}.md`;
  const result = await commitFiles(
    [{ path, content: talkFile(fields), expectSha: sha }],
    sha ? `Update talk: ${fields.presentation}` : `Add talk: ${fields.presentation}`,
  );
  return json({ ok: true, slug, sha: result.shas[path], commit: result.commit });
};

export const DELETE: APIRoute = async ({ request }) => {
  const { slug, sha } = await request.json();

  if (!validSlug(slug) || !sha) {
    return new Response(JSON.stringify({ error: 'Missing slug or sha' }), { status: 400 });
  }

  const result = await commitFiles([{ path: `${TALKS_DIR}/${slug}.md`, content: null, expectSha: sha }], `Delete talk: ${slug}`);

  return new Response(JSON.stringify({ ok: true, commit: result.commit }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

import type { APIRoute } from 'astro';
import { listFiles, getFile, getFiles, commitFiles, type FileChange } from '../../../lib/github';
import { BLOG_DIR, TAGS_DIR, blogFile, readingStats, tagFile, tagSlugs, validSlug, ymd, type BlogFields } from '../../../lib/cms/content';
import matter from 'gray-matter';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');

  if (slug) {
    if (!validSlug(slug)) return json({ error: 'Bad slug' }, 400);
    const file = await getFile(`${BLOG_DIR}/${slug}.md`);
    if (!file) return json({ error: 'Not found' }, 404);
    const { data, content } = matter(file.content);
    return json({ frontmatter: data, content, sha: file.sha, slug });
  }

  const files = (await listFiles(BLOG_DIR)).filter((f) => f.name.endsWith('.md'));
  const contents = await getFiles(files.map((f) => f.path));
  const posts = [];

  for (const [i, f] of files.entries()) {
    const fileData = contents[i];
    if (!fileData) continue;
    const { data, content } = matter(fileData.content);
    posts.push({
      slug: f.name.replace(/\.md$/, ''),
      title: data.title || f.name,
      date: ymd(data.date),
      draft: data.draft || false,
      tags: tagSlugs(data.tags),
      summary: data.summary || '',
      image: data.images || '',
      canonicalUrl: data.canonicalUrl || '',
      words: readingStats(content).words,
      sha: fileData.sha,
    });
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  return json(posts);
};

interface SaveBody {
  slug?: unknown;
  /** The slug the post was loaded under, when editing; differs on a rename. */
  originalSlug?: unknown;
  /** Blob sha the editor loaded; absent for a new post. */
  sha?: unknown;
  frontmatter?: BlogFields;
  content?: unknown;
  /** Tags that do not exist yet, created in the same commit. */
  newTags?: { slug: string; name: string }[];
}

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as SaveBody;
  const { slug, frontmatter: fields, content } = body;
  const originalSlug = body.originalSlug ?? null;
  const sha = typeof body.sha === 'string' && body.sha ? body.sha : null;

  if (!validSlug(slug)) return json({ error: 'Slug may only use lowercase letters, numbers and dashes.' }, 400);
  if (originalSlug !== null && !validSlug(originalSlug)) return json({ error: 'Bad original slug' }, 400);
  if (!fields?.title?.trim()) return json({ error: 'Title is required.' }, 400);
  if (typeof content !== 'string') return json({ error: 'Missing content' }, 400);
  for (const t of fields.tags || []) if (!validSlug(t)) return json({ error: `Bad tag "${t}"` }, 400);

  // Keep the frontmatter fields the editor does not manage.
  let existing: Record<string, unknown> = {};
  if (originalSlug && sha) {
    const current = await getFile(`${BLOG_DIR}/${originalSlug}.md`);
    if (current) existing = matter(current.content).data;
  }

  const path = `${BLOG_DIR}/${slug}.md`;
  const changes: FileChange[] = [];
  const renamed = !!originalSlug && originalSlug !== slug;
  if (renamed) {
    changes.push({ path: `${BLOG_DIR}/${originalSlug}.md`, content: null, expectSha: sha });
    changes.push({ path, content: blogFile(fields, content, existing), expectSha: null });
  } else {
    changes.push({ path, content: blogFile(fields, content, existing), expectSha: sha });
  }
  for (const t of body.newTags || []) {
    if (!validSlug(t.slug) || !t.name?.trim()) return json({ error: `Bad new tag "${t.slug}"` }, 400);
    if (!(fields.tags || []).includes(t.slug)) continue;
    changes.push({ path: `${TAGS_DIR}/${t.slug}.md`, content: tagFile(t.name), expectSha: null });
  }

  const title = fields.title.trim();
  const message = renamed
    ? `Rename blog post: ${originalSlug} -> ${slug}`
    : sha
      ? `Update blog post: ${title}`
      : `Add blog post: ${title}`;
  const result = await commitFiles(changes, message);

  return json({ ok: true, slug, sha: result.shas[path], commit: result.commit });
};

export const DELETE: APIRoute = async ({ request }) => {
  const { slug, sha } = await request.json();

  if (!validSlug(slug) || !sha) return json({ error: 'Missing slug or sha' }, 400);

  const result = await commitFiles([{ path: `${BLOG_DIR}/${slug}.md`, content: null, expectSha: sha }], `Delete blog post: ${slug}`);
  return json({ ok: true, commit: result.commit });
};

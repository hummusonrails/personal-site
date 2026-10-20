// How the CMS turns editor fields into content files, shared by saving and
// previewing so both write exactly the same thing. Matches the collections in
// content.config.ts.
import matter from 'gray-matter';
export { slugify, readingStats } from './text';

export const BLOG_DIR = 'src/content/blog';
export const TALKS_DIR = 'src/content/talks';
export const TAGS_DIR = 'src/content/tags';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slugs become file paths, so only plain lowercase words and dashes are allowed. */
export function validSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && slug.length <= 120 && SLUG.test(slug);
}

/** YYYY-MM-DD from whatever YAML or a date input produced. */
export function ymd(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

const tagSlug = (t: unknown) => (t && typeof t === 'object' ? String((t as { slug?: unknown; id?: unknown }).slug ?? (t as { id?: unknown }).id ?? '') : String(t ?? ''));

/** Tag slugs from a post's frontmatter, which stores them as {slug, collection} references. */
export function tagSlugs(tags: unknown): string[] {
  return Array.isArray(tags) ? tags.map(tagSlug).filter(Boolean) : [];
}

export interface BlogFields {
  title: string;
  date: string;
  summary?: string;
  images?: string;
  canonicalUrl?: string;
  draft?: boolean;
  tags?: string[];
}

/**
 * A post file from the editor's fields. `existing` is the frontmatter the post
 * already had, so fields the CMS does not edit (lastmod, related, layout,
 * bibliography, authors) survive a save.
 */
export function blogFile(fields: BlogFields, content: string, existing: Record<string, unknown> = {}): string {
  // New posts get the order the newest posts use. An existing post keeps its
  // own key order (assigning an existing key keeps its place), so a save only
  // changes the lines that actually changed.
  const fm: Record<string, unknown> = Object.keys(existing).length
    ? { ...existing }
    : { title: '', date: '', summary: undefined, tags: [], authors: [], canonicalUrl: undefined, images: undefined };
  const put = (k: string, v: unknown) => {
    if (v === undefined || v === '') delete fm[k];
    else fm[k] = v;
  };
  put('title', fields.title.trim());
  put('date', ymd(fields.date));
  put('summary', fields.summary?.trim());
  put('tags', (fields.tags?.length ? fields.tags : ['posts']).map((slug) => ({ slug, collection: 'tags' })));
  put('authors', Array.isArray(existing.authors) && existing.authors.length ? existing.authors : ['default']);
  put('canonicalUrl', fields.canonicalUrl?.trim());
  put('images', fields.images?.trim());
  // Written only when it says something: a draft, or a post that already had it.
  put('draft', fields.draft || 'draft' in existing ? !!fields.draft : undefined);
  if (existing.lastmod !== undefined) fm.lastmod = ymd(existing.lastmod);
  return matter.stringify(content.replace(/^\n+/, '\n'), fm);
}

export interface TalkFields {
  presentation: string;
  conference: string;
  region: string;
  date: string;
  link: string;
  image?: string;
}

export function talkFile(fields: TalkFields): string {
  return matter.stringify('', {
    presentation: fields.presentation.trim(),
    conference: fields.conference.trim(),
    region: fields.region,
    date: ymd(fields.date),
    link: fields.link.trim(),
    ...(fields.image ? { image: fields.image } : {}),
  });
}

/** Problems that would fail the site build (content.config.ts), as messages. */
export function talkProblems(f: Partial<TalkFields>): string[] {
  const out: string[] = [];
  if (!f.presentation?.trim()) out.push('Presentation title is required.');
  if (!f.conference?.trim()) out.push('Conference is required.');
  if (!f.region) out.push('Region is required.');
  if (!f.date || !/^\d{4}-\d{2}-\d{2}$/.test(f.date)) out.push('Date is required.');
  try {
    if (!/^https?:$/.test(new URL(f.link || '').protocol)) throw new Error();
  } catch {
    out.push('Link must be a full http(s) URL.');
  }
  return out;
}

export function tagFile(name: string, description?: string): string {
  return matter.stringify('', { name: name.trim(), ...(description?.trim() ? { description: description.trim() } : {}) });
}

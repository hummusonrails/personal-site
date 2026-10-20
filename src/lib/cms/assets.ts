// Images the CMS stores in the repo under public/static/images, committed like
// any other content so they deploy with the site.
import { extname } from 'node:path';

export const IMAGE_ROOT = 'public/static/images';
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request limit

const TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
};

export const isImageName = (name: string) => extname(name).toLowerCase() in TYPES;
export const contentTypeOf = (name: string) => TYPES[extname(name).toLowerCase()] || 'application/octet-stream';

export function extensionFor(contentType: string, fallbackName = ''): string | null {
  const t = contentType.split(';')[0].trim().toLowerCase();
  const hit = Object.entries(TYPES).find(([, v]) => v === t);
  if (hit) return hit[0] === '.jpeg' ? '.jpg' : hit[0];
  const ext = extname(fallbackName).toLowerCase();
  return ext in TYPES ? ext : null;
}

/** A safe file name: lowercase words, dashes and underscores, plus its extension. */
export function safeName(name: string, ext: string): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 60) || 'image';
  return `${base}${ext}`;
}

/** Folder (under IMAGE_ROOT) an upload may go to: presentations, or blog/<slug>. */
export function validFolder(folder: unknown): folder is string {
  return typeof folder === 'string' && /^(presentations|blog\/[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(folder);
}

/** Repo path inside public/static/images, or null for anything else. */
export function imageRepoPath(path: string): string | null {
  const p = path.replace(/^\/+/, '');
  const repo = p.startsWith('public/') ? p : `public/${p}`;
  if (!repo.startsWith(`${IMAGE_ROOT}/`) || repo.includes('..') || !isImageName(repo)) return null;
  return repo;
}

/** Where the CMS can show an image before the deploy that publishes it is live. */
export const adminImageUrl = (repoPath: string) => `/api/admin/assets?path=${encodeURIComponent(repoPath)}`;
/** The image's address on the live site. */
export const siteImagePath = (repoPath: string) => `/${repoPath.replace(/^public\//, '')}`;

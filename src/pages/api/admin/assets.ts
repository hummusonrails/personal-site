import type { APIRoute } from 'astro';
import { commitFiles, getRawFile, listFiles } from '../../../lib/github';
import {
  IMAGE_ROOT, MAX_IMAGE_BYTES, adminImageUrl, contentTypeOf, extensionFor, imageRepoPath,
  isImageName, safeName, siteImagePath, validFolder,
} from '../../../lib/cms/assets';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// GET ?path=public/static/images/...  the image's bytes (shown in the CMS
//                                    before its deploy is live)
// GET ?folder=presentations          the images in a folder
export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get('path');
  if (path) {
    const repo = imageRepoPath(path);
    if (!repo) return json({ error: 'Not an image path' }, 400);
    const file = await getRawFile(repo);
    if (!file) return json({ error: 'Not found' }, 404);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        'Content-Type': contentTypeOf(repo),
        'Cache-Control': 'private, max-age=300',
        // SVGs are images here, never documents that can run script.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const folder = url.searchParams.get('folder');
  if (!validFolder(folder)) return json({ error: 'Bad folder' }, 400);
  const files = (await listFiles(`${IMAGE_ROOT}/${folder}`)).filter((f) => isImageName(f.name));
  files.sort((a, b) => a.name.localeCompare(b.name));
  return json(files.map((f) => ({ name: f.name, path: siteImagePath(f.path).slice(1), site: siteImagePath(f.path), url: adminImageUrl(f.path) })));
};

// POST multipart: file + folder           upload from the computer
// POST JSON {url, folder}                 fetch an image from the web
// Either way the image is committed to public/static/images/<folder>/.
export const POST: APIRoute = async ({ request }) => {
  let folder: unknown;
  let bytes: Buffer;
  let name: string;
  let type: string;

  if ((request.headers.get('content-type') || '').startsWith('multipart/form-data')) {
    const form = await request.formData();
    folder = form.get('folder');
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Missing file' }, 400);
    if (file.size > MAX_IMAGE_BYTES) return json({ error: 'Images must be under 4 MB.' }, 413);
    bytes = Buffer.from(await file.arrayBuffer());
    name = file.name;
    type = file.type;
  } else {
    const body = await request.json();
    folder = body.folder ?? 'presentations';
    let src: URL;
    try {
      src = new URL(String(body.url || ''));
      if (!/^https?:$/.test(src.protocol)) throw new Error();
    } catch {
      return json({ error: 'Enter a full http(s) image URL.' }, 400);
    }
    const res = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CMS/1.0)', Accept: 'image/*' } });
    if (!res.ok) return json({ error: `Failed to fetch image: ${res.status} ${res.statusText}` }, 400);
    if (Number(res.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) return json({ error: 'Images must be under 4 MB.' }, 413);
    bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) return json({ error: 'Images must be under 4 MB.' }, 413);
    name = decodeURIComponent(src.pathname.split('/').pop() || 'image');
    type = res.headers.get('content-type') || '';
  }

  if (!validFolder(folder)) return json({ error: 'Bad folder' }, 400);
  const ext = extensionFor(type, name);
  if (!ext) return json({ error: 'That is not a supported image (png, jpg, gif, webp, svg, avif, ico).' }, 415);

  // Never overwrite: add a counter until the name is free.
  const dir = `${IMAGE_ROOT}/${folder}`;
  const taken = new Set((await listFiles(dir)).map((f) => f.name));
  let fileName = safeName(name, ext);
  for (let n = 1; taken.has(fileName); n++) fileName = safeName(`${name.replace(/\.[^.]+$/, '')}-${n}`, ext);

  const repoPath = `${dir}/${fileName}`;
  const result = await commitFiles([{ path: repoPath, content: bytes, expectSha: null }], `Add image: ${folder}/${fileName}`);
  return json({
    name: fileName,
    path: siteImagePath(repoPath).slice(1),
    site: siteImagePath(repoPath),
    url: adminImageUrl(repoPath),
    commit: result.commit,
  });
};

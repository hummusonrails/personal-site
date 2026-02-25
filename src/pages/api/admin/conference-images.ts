import type { APIRoute } from 'astro';
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const IMAGES_DIR = 'public/static/images/presentations';
const CONTENT_PREFIX = 'static/images/presentations';

function getImagesDir(): string {
  return join(process.cwd(), IMAGES_DIR);
}

export const GET: APIRoute = async () => {
  const dir = getImagesDir();
  if (!existsSync(dir)) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const files = readdirSync(dir).filter((f) => {
    const ext = extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.gif'].includes(ext);
  });

  files.sort((a, b) => a.localeCompare(b));

  const images = files.map((name) => ({
    name,
    path: `${CONTENT_PREFIX}/${name}`,
    url: `/${CONTENT_PREFIX}/${name}`,
  }));

  return new Response(JSON.stringify(images), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing image URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CMS/1.0)',
        Accept: 'image/*',
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${res.status} ${res.statusText}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const contentType = res.headers.get('content-type') || '';
    let ext = '.png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpeg';
    else if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('svg')) ext = '.svg';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';
    else if (contentType.includes('ico') || contentType.includes('icon')) ext = '.ico';
    else {
      // Try to infer from URL
      const urlPath = new URL(url).pathname;
      const urlExt = extname(urlPath).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico'].includes(urlExt)) {
        ext = urlExt;
      }
    }

    // Generate filename from URL
    const urlObj = new URL(url);
    let baseName = urlObj.pathname
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '') || 'image';
    baseName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60);

    const dir = getImagesDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // Avoid overwriting existing files
    let filename = `${baseName}${ext}`;
    let counter = 1;
    while (existsSync(join(dir, filename))) {
      filename = `${baseName}_${counter}${ext}`;
      counter++;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(dir, filename), buffer);

    return new Response(
      JSON.stringify({
        name: filename,
        path: `${CONTENT_PREFIX}/${filename}`,
        url: `/${CONTENT_PREFIX}/${filename}`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to fetch image' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

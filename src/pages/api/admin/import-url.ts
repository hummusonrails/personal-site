import type { APIRoute } from 'astro';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing URL' }), { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${res.status}` }),
        { status: 400 }
      );
    }

    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Extract metadata
    const metaTitle =
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      doc.querySelector('title')?.textContent ||
      '';

    const metaDescription =
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
      '';

    const metaImage =
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

    // Extract article content using Readability
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
      return new Response(
        JSON.stringify({ error: 'Could not extract article content from URL' }),
        { status: 400 }
      );
    }

    // Convert HTML to Markdown
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // Keep code blocks
    turndown.addRule('pre-code', {
      filter: (node) => {
        return node.nodeName === 'PRE' && node.querySelector('code') !== null;
      },
      replacement: (_content, node) => {
        const code = (node as HTMLElement).querySelector('code');
        if (!code) return _content;
        const lang = code.className?.replace('language-', '') || '';
        return `\n\`\`\`${lang}\n${code.textContent}\n\`\`\`\n`;
      },
    });

    const markdown = turndown.turndown(article.content);

    return new Response(
      JSON.stringify({
        title: article.title || metaTitle,
        summary: metaDescription || article.excerpt || '',
        content: markdown,
        image: metaImage,
        canonicalUrl: url,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Import failed: ${(err as Error).message}` }),
      { status: 500 }
    );
  }
};

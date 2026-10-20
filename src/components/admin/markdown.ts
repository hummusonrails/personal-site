// Markdown <-> HTML for the blog editor. Markdown is the stored format; the
// rich text editor works on HTML, so content goes through these on the way in
// and out. The editor only converts back when the body was actually edited,
// so opening and saving a post never rewrites it.
import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

// Images under /static/images are committed with the post but are only on
// the live site after the deploy, so the editor shows them through the CMS.
const SITE_IMAGES = /(["(])\/static\/images\//g;
const ADMIN_IMAGES = /\/api\/admin\/assets\?path=public%2Fstatic%2Fimages%2F([^"')\s]+)/g;

export const toAdminImages = (html: string) => html.replace(SITE_IMAGES, '$1/api/admin/assets?path=public%2Fstatic%2Fimages%2F');
export const toSiteImages = (text: string) =>
  text.replace(ADMIN_IMAGES, (_m, rest: string) => `/static/images/${decodeURIComponent(rest)}`);

export function markdownToHtml(md: string): string {
  return toAdminImages(marked.parse(md, { gfm: true, breaks: false, async: false }) as string);
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});
turndown.use(gfm);

// Turndown escapes every markdown character it sees, which turns snake_case
// into snake\_case. Escape only what would change the meaning: block markers
// at the start of a line, backticks, asterisks, word-edge underscores and a
// bracket pair that would read as a link.
turndown.escape = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/[*`]/g, '\\$&')
    .replace(/(^|[^\p{L}\p{N}])_|_(?=$|[^\p{L}\p{N}])/gu, (m) => m.replace('_', '\\_'))
    .replace(/\[([^\]]*)\](?=\()/g, '\\[$1\\]')
    .replace(/^(\s*)([#>+-]|\d+\.)(?=\s)/gm, '$1\\$2')
    .replace(/^(\s*)(=+|-{3,})\s*$/gm, '$1\\$2');

// A bare URL (autolinked on the way in) goes back out bare.
turndown.addRule('bare-url', {
  filter: (node) => node.nodeName === 'A' && !!node.getAttribute('href') && node.textContent === node.getAttribute('href'),
  replacement: (_content, node) => (node as HTMLElement).getAttribute('href') || '',
});

turndown.addRule('fenced-code', {
  filter: (node) => node.nodeName === 'PRE' && !!(node as HTMLElement).querySelector('code'),
  replacement: (_content, node) => {
    const code = (node as HTMLElement).querySelector('code')!;
    const lang = (code.className.match(/language-([\w+#-]+)/) || [])[1] || '';
    const text = (code.textContent || '').replace(/\n$/, '');
    const fence = text.includes('```') ? '~~~' : '```';
    return `\n\n${fence}${lang}\n${text}\n${fence}\n\n`;
  },
});

// "- item" and "1. item" rather than Turndown's padded "-   item".
turndown.addRule('listItem', {
  filter: 'li',
  replacement: (content, node, options) => {
    const parent = node.parentNode as HTMLElement | null;
    let prefix = `${options.bulletListMarker} `;
    if (parent?.nodeName === 'OL') {
      const start = Number(parent.getAttribute('start') || 1);
      prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
    }
    // Rich text wraps every item in a paragraph; the item still reads as one line.
    const body = content.trim().replace(/\n\n+(?=\s*(?:[-*+]|\d+\.) )/g, '\n').replace(/\n/g, `\n${' '.repeat(prefix.length)}`).replace(/\n +(?=\n)/g, '\n');
    return `${prefix}${body}\n`;
  },
});

// Embeds stay as HTML, which markdown passes through.
turndown.addRule('iframe', {
  filter: 'iframe',
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const attr = (k: string, d: string) => el.getAttribute(k) || d;
    return `\n\n<iframe width="${attr('width', '560')}" height="${attr('height', '315')}" src="${attr('src', '')}" title="${attr('title', 'Video player')}" frameborder="0" allowfullscreen></iframe>\n\n`;
  },
});
turndown.addRule('iframe-wrapper', {
  filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('iframe-wrapper'),
  replacement: (content) => content,
});
turndown.keep(['video', 'audio', 'figure', 'figcaption', 'details', 'summary', 'sup', 'sub']);

export function htmlToMarkdown(html: string): string {
  return toSiteImages(turndown.turndown(html)).replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// HTML the rich text editor has no place for. A post containing any of it
// opens in markdown mode, where it is kept exactly.
const RICH_SAFE = new Set(['iframe', 'br', 'img', 'a', 'b', 'strong', 'i', 'em', 'code', 'p', 'u', 's', 'hr']);

export function htmlTheRichEditorDrops(md: string): string[] {
  const body = md.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g, '');
  const found = new Set<string>();
  for (const m of body.matchAll(/<([a-z][a-z0-9-]*)[\s>/]/gi)) {
    const tag = m[1].toLowerCase();
    if (!RICH_SAFE.has(tag)) found.add(tag);
  }
  return [...found];
}

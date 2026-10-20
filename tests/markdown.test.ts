import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, markdownToHtml } from '@/components/admin/markdown';

const roundTrip = (md: string) => htmlToMarkdown(markdownToHtml(md));

describe('editor markdown round trip', () => {
  it('keeps ordered, nested and bullet lists', () => {
    const md = '1. one\n2. two\n    - nested\n\n- a\n- b\n';
    const out = roundTrip(md);
    expect(out).toMatch(/^1\. +one\n2\. +two\n +- +nested/m);
    expect(out).toMatch(/^- +a\n- +b/m);
  });

  it('keeps code blocks verbatim, language and angle brackets included', () => {
    const md = '```ts\nconst a = <T>(x: T) => x && "<b>";\n```\n';
    expect(roundTrip(md)).toBe(md);
  });

  it('keeps tables, links, images and embeds', () => {
    const md = [
      '| a | b |', '| --- | --- |', '| 1 | 2 |', '',
      'See [the docs](https://example.com/docs) and ![chart](/static/images/blog/x/chart.png).', '',
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/abc" title="Video player" frameborder="0" allowfullscreen></iframe>', '',
    ].join('\n');
    const out = roundTrip(md);
    expect(out).toContain('| a | b |');
    expect(out).toContain('[the docs](https://example.com/docs)');
    expect(out).toContain('![chart](/static/images/blog/x/chart.png)');
    expect(out).toContain('src="https://www.youtube.com/embed/abc"');
  });

  it('shows not-yet-deployed images through the CMS and stores the site path', () => {
    const html = markdownToHtml('![x](/static/images/blog/p/new.png)');
    expect(html).toContain('src="/api/admin/assets?path=public%2Fstatic%2Fimages%2Fblog/p/new.png"');
    expect(htmlToMarkdown(html)).toBe('![x](/static/images/blog/p/new.png)\n');
  });
});

describe('editor escaping', () => {
  it('leaves snake_case, brackets and bare URLs alone', () => {
    const md = 'Use rust_decimal and [your reason] here: https://example.com/x\n';
    expect(roundTrip(md)).toBe(md);
  });

  it('still escapes what would change meaning', () => {
    expect(htmlToMarkdown('<p>2 * 3 * 4 and _private</p>')).toBe('2 \\* 3 \\* 4 and \\_private\n');
    expect(htmlToMarkdown('<p># not a heading</p>')).toBe('\\# not a heading\n');
  });
});

describe('htmlTheRichEditorDrops', () => {
  it('names raw HTML outside code, ignoring embeds the editor keeps', async () => {
    const { htmlTheRichEditorDrops } = await import('@/components/admin/markdown');
    expect(htmlTheRichEditorDrops('<figure><img src="a"><figcaption>x</figcaption></figure>\n`<div>`')).toEqual(['figure', 'figcaption']);
    expect(htmlTheRichEditorDrops('<iframe src="y"></iframe>\n```html\n<div></div>\n```')).toEqual([]);
  });
});

describe('list formatting', () => {
  it('writes compact list markers', () => {
    expect(htmlToMarkdown('<ul><li><p>a</p></li><li><p>b</p></li></ul><ol start="3"><li>c</li><li>d</li></ol>')).toBe('- a\n- b\n\n3. c\n4. d\n');
  });
});

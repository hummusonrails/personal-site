import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { blogFile, talkProblems, validSlug } from '@/lib/cms/content';
import { imageRepoPath, validFolder } from '@/lib/cms/assets';

describe('slugs and paths', () => {
  it('only accepts slugs that stay inside the content folder', () => {
    expect(validSlug('my-post-2')).toBe(true);
    for (const bad of ['../middleware', 'a/b', 'My Post', '-x', 'x-', '', 'a..b']) expect(validSlug(bad)).toBe(false);
  });

  it('only serves and stores images under public/static/images', () => {
    expect(imageRepoPath('/static/images/blog/x/a.png')).toBe('public/static/images/blog/x/a.png');
    expect(imageRepoPath('public/static/images/../../.env.png')).toBeNull();
    expect(imageRepoPath('public/static/images/a.html')).toBeNull();
    expect(imageRepoPath('src/content/blog/a.png')).toBeNull();
    expect(validFolder('blog/my-post')).toBe(true);
    expect(validFolder('blog/../src')).toBe(false);
  });
});

describe('blogFile', () => {
  it('keeps the fields the editor does not manage and writes dates as days', () => {
    const existing = { title: 'Old', date: new Date('2024-01-02'), related: ['other-post'], layout: 'list', authors: ['default'], lastmod: new Date('2024-02-03') };
    const out = matter(blogFile({ title: ' New ', date: '2024-01-02', tags: ['ai'], draft: false }, '\nBody\n', existing));
    expect(out.data).toMatchObject({
      title: 'New', related: ['other-post'], layout: 'list', authors: ['default'],
      tags: [{ slug: 'ai', collection: 'tags' }],
    });
    expect(out.content).toBe('\nBody\n');
    expect(blogFile({ title: 'T', date: '2024-01-02' }, 'x', existing)).toContain("date: '2024-01-02'");
  });

  it('drops optional fields that were cleared', () => {
    const out = matter(blogFile({ title: 'T', date: '2024-01-02', summary: ' ', images: '' }, 'x', { summary: 'old', images: 'a.png' }));
    expect(out.data.summary).toBeUndefined();
    expect(out.data.images).toBeUndefined();
  });
});

describe('talkProblems', () => {
  it('catches what would fail the content schema', () => {
    expect(talkProblems({ presentation: 'P', conference: 'C', region: 'NA', date: '2024-05-01', link: 'https://youtu.be/x' })).toEqual([]);
    expect(talkProblems({ presentation: 'P', conference: 'C', region: 'NA', date: '2024-05-01', link: 'youtu.be/x' })).toEqual(['Link must be a full http(s) URL.']);
  });
});

describe('blogFile key order', () => {
  it('keeps an existing post\'s key order and adds no draft line', () => {
    const existing = { title: 'T', date: '2022-08-11', summary: 'old', tags: [{ slug: 'devrel', collection: 'tags' }], image: 'x.png', authors: ['default'] };
    const out = blogFile({ title: 'T', date: '2022-08-11', summary: 'new', tags: ['devrel'] }, 'b', existing);
    expect(Object.keys(matter(out).data)).toEqual(['title', 'date', 'summary', 'tags', 'image', 'authors']);
  });
  it('orders a new post like the newest ones', () => {
    const out = blogFile({ title: 'T', date: '2026-10-20', summary: 's', tags: ['ai'], images: 'i.png', canonicalUrl: 'https://x.dev', draft: true }, 'b');
    expect(Object.keys(matter(out).data)).toEqual(['title', 'date', 'summary', 'tags', 'authors', 'canonicalUrl', 'images', 'draft']);
  });
});

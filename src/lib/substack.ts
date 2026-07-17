/**
 * Build-time fetch of the latest essays from the Code and Conduct
 * Substack via the public RSS feed (no API key required).
 *
 * The enclosure element usually carries the post cover image, but
 * podcast episodes ship an mp3 enclosure instead, so only image
 * enclosures are kept as covers.
 *
 * Every failure degrades to an empty list so the build never breaks
 * on Substack hiccups; the homepage then renders just the subscribe
 * card.
 */

import { SITE_METADATA } from '@/consts';

const BASE_URL = SITE_METADATA.substack.replace(/\/$/, '');

export const NEWSLETTER = {
  name: 'Code and Conduct',
  url: BASE_URL,
  subscribeUrl: `${BASE_URL}/subscribe`,
};

export interface SubstackPost {
  title: string;
  subtitle: string;
  url: string;
  published: string;
  cover: string | null;
}

const FEED_URL = `${NEWSLETTER.url}/feed`;

function unwrapCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

export async function fetchLatestPosts(limit = 3): Promise<SubstackPost[]> {
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const xml = await res.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    const posts: SubstackPost[] = items.flatMap((item) => {
      const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1];
      const url = item.match(/<link>([\s\S]*?)<\/link>/)?.[1];
      const published = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
      if (!title || !url || !published) return [];

      const subtitle = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
      // Attribute order inside <enclosure> is not guaranteed, so pull
      // url and type out of the tag independently.
      const enclosureTag = item.match(/<enclosure\b[^>]*>/)?.[0];
      const enclosureUrl = enclosureTag?.match(/url="([^"]+)"/)?.[1];
      const enclosureType = enclosureTag?.match(/type="([^"]+)"/)?.[1];
      const cover = enclosureUrl && enclosureType?.startsWith('image/') ? enclosureUrl : null;

      return [{
        title: unwrapCdata(title),
        subtitle: unwrapCdata(subtitle),
        url: url.trim(),
        published,
        cover,
      }];
    });

    return posts.slice(0, limit);
  } catch (error) {
    console.warn('[substack] feed unavailable, rendering subscribe card only:', (error as Error).message);
    return [];
  }
}

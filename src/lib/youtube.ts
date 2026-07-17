/**
 * Build-time fetch of the latest uploads from the Learn with Ben
 * YouTube channel via the public RSS feed (no API key required).
 *
 * Shorts are told apart from regular videos by requesting
 * youtube.com/shorts/{id} without following redirects: shorts answer
 * 200, regular videos redirect (303) to /watch.
 *
 * Every failure degrades to empty lists so the build never breaks on
 * YouTube hiccups; the homepage then renders just the channel card.
 */

export const CHANNEL = {
  name: 'Learn with Ben',
  handle: '@HummusOnRails',
  url: 'https://www.youtube.com/@HummusOnRails',
  id: 'UC3Ug3f0ZZEBl8RQoFI6YNNQ',
};

export interface YtVideo {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  url: string;
}

interface ChannelVideos {
  videos: YtVideo[];
  shorts: YtVideo[];
}

const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL.id}`;

// The feed can briefly keep listing deleted or privated videos; oEmbed
// answers 200 only for videos that are still publicly watchable.
// Fail open: only definitive "gone" statuses drop a video, so transient
// rate limits or outages never wipe live videos from the section.
const GONE_STATUSES = new Set([400, 401, 403, 404]);

async function isAvailable(id: string): Promise<boolean> {
  try {
    const watchUrl = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${watchUrl}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    return res.ok || !GONE_STATUSES.has(res.status);
  } catch {
    return true;
  }
}

async function isShort(id: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function fetchChannelVideos(): Promise<ChannelVideos> {
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const xml = await res.text();

    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
    const all: YtVideo[] = entries.flatMap((entry) => {
      const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      if (!id || !title || !published) return [];
      return [{
        id,
        title,
        published,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
      }];
    });

    const availability = await Promise.all(all.map((v) => isAvailable(v.id)));
    const live = all.filter((_, i) => availability[i]);

    const flags = await Promise.all(live.map((v) => isShort(v.id)));
    const videos = live.filter((_, i) => !flags[i]).slice(0, 3);
    const shorts = live
      .filter((_, i) => flags[i])
      .slice(0, 6)
      .map((v) => ({ ...v, url: `https://www.youtube.com/shorts/${v.id}` }));

    return { videos, shorts };
  } catch (error) {
    console.warn('[youtube] feed unavailable, rendering channel card only:', (error as Error).message);
    return { videos: [], shorts: [] };
  }
}

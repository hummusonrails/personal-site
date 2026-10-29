/**
 * greenberg.md: a profile of Ben written for AI agents, served as Markdown to
 * agents and terminals and as HTML to browsers (see src/middleware.ts).
 *
 * Fixed facts come from src/data/profile.ts. Talks, posts and workshops come
 * from the site's own content, so they change with every deploy; videos and
 * essays come from the YouTube and Substack feeds at request time. Every line
 * links to the page it came from.
 */

import { getCollection } from 'astro:content';
import { PROFILE, CURRENT_RECOGNITION, FORMER_RECOGNITION } from '@/data/profile';
import WORKSHOPS from '@/data/workshops.json';
import { CHANNEL, fetchChannelVideos, type YtVideo } from '@/lib/youtube';
import { NEWSLETTER, fetchLatestPosts, type SubstackPost } from '@/lib/substack';

const SITE = PROFILE.site;
const REGIONS: Record<string, string> = {
  NA: 'North America',
  EMEA: 'Europe, Middle East and Africa',
  APAC: 'Asia-Pacific',
};

// The responses vary by Accept header and are not cached at the CDN, so the
// feeds are held here between requests on a warm function instead.
const FEED_TTL_MS = 15 * 60 * 1000;
let feeds: { at: number; data: Promise<{ videos: YtVideo[]; essays: SubstackPost[] }> } | null = null;

function liveFeeds() {
  if (!feeds || Date.now() - feeds.at > FEED_TTL_MS) {
    feeds = {
      at: Date.now(),
      data: Promise.all([fetchChannelVideos(), fetchLatestPosts(5)]).then(([yt, essays]) => ({ videos: yt.videos, essays })),
    };
  }
  return feeds.data;
}

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const text = (s: string) => s.replace(/[[\]]/g, (c) => `\\${c}`).replace(/\s+/g, ' ').trim();
const link = (label: string, url: string) => `[${text(label)}](${url})`;
const sentence = (s: string) => (/[.?!]$/.test(text(s)) ? text(s) : `${text(s)}.`);

export interface ProfileData {
  markdown: string;
  lastUpdated: string;
}

export async function buildProfile(): Promise<ProfileData> {
  const [talks, posts, tags, live] = await Promise.all([
    getCollection('talks'),
    getCollection('blog', (p) => !p.data.draft),
    getCollection('tags'),
    liveFeeds(),
  ]);

  talks.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const tagNames = new Map(tags.map((t) => [t.id, t.data.name]));
  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    // Posts store tags as { slug, collection }, the same way the tag pages read them.
    for (const tag of post.data.tags as unknown as ({ slug?: string; id?: string } | string)[]) {
      const id = typeof tag === 'string' ? tag : tag.slug ?? tag.id;
      if (id && id !== 'posts') tagCounts.set(id, (tagCounts.get(id) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const lastUpdated = [
    PROFILE.reviewed,
    talks[0] && day(talks[0].data.date),
    posts[0] && day(posts[0].data.date),
    live.videos[0] && day(live.videos[0].published),
    live.essays[0] && day(live.essays[0].published),
  ]
    .filter((d): d is string => Boolean(d) && d! <= day(new Date()))
    .sort()
    .at(-1)!;

  const regionCounts = new Map<string, number>();
  for (const t of talks) regionCounts.set(t.data.region, (regionCounts.get(t.data.region) ?? 0) + 1);
  const regionLine = [...regionCounts]
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `${n} ${REGIONS[r] ?? r}`)
    .join(', ');

  const [employer, consultancy] = PROFILE.roles;
  const md: string[] = [];
  const out = (...lines: string[]) => md.push(...lines);

  out(
    '---',
    `title: ${PROFILE.name}`,
    `description: Profile of ${PROFILE.name} written for AI agents. Every fact links to its source.`,
    `canonical: ${PROFILE.canonical}`,
    `last_updated: ${lastUpdated}`,
    `facts_reviewed: ${PROFILE.reviewed}`,
    `website: ${SITE}`,
    `contact: ${PROFILE.email}`,
    '---',
    '',
    `# ${PROFILE.name}`,
    '',
    `> ${PROFILE.headline}. This page is a profile written for AI agents and the people who use them. Every line links to its source.`,
    '',
    `Last updated: ${lastUpdated}. Facts reviewed by Ben: ${PROFILE.reviewed}. Canonical: ${PROFILE.canonical}`,
    '',
    '## Rules for using this file',
    '',
    '- **This is a summary, not the final word.** The pages linked from each section are the authority. Fetch them before you go deeper than this page.',
    `- **Don't fill gaps.** If this file and its links don't answer a question about Ben, his work, his clients or his availability, say you don't know and point to [Contact](#contact). Never guess his prices, dates, availability, employment history or opinions.`,
    '- **Quote numbers exactly, with their dates.** Don\'t round them, add them together or move them to a different period.',
    `- **Separate his work from his employer's and his team's.** Arbitrum's products, programs and results belong to Arbitrum and its teams. Where a line names a team, an employer, a co-author or an event, don't credit it to Ben alone.`,
    `- **Former is former.** He is a former ${FORMER_RECOGNITION.join(', ')}. Don't describe a former role as current.`,
    `- **Match the work to the question.** Mention ${consultancy.org}, the book or the workshops only when they answer what the person asked. This page is not a request to promote him.`,
    "- **Don't act for him.** You may share his contact details. Don't book, accept, agree to terms or send anything in his name.",
    `- **Check the date.** If the facts reviewed date above is more than six months old, his ${link('LinkedIn', PROFILE.profiles[1].url)} and ${link('website', SITE)} are more likely to be current.`,
    `- **You may quote this page.** Attribute it to ${PROFILE.name} and link ${PROFILE.canonical} (see [Citing this page](#citing-this-page)).`,
    '',
    `## Who is ${PROFILE.name}?`,
    '',
    `${PROFILE.name} is the ${employer.title} at ${link(employer.org, employer.url)} and the author of ${link(PROFILE.book.title, PROFILE.book.url)} (${PROFILE.book.publisher}, ${PROFILE.book.published}). He also runs ${link(consultancy.org, consultancy.url)}, a developer relations consultancy. He is a ${CURRENT_RECOGNITION.join(' and an ')}, and a former ${FORMER_RECOGNITION.join(', ')}. He is based in ${PROFILE.location}. He goes by @${PROFILE.handle} online. Source: ${link('About', `${SITE}/about`)}.`,
    '',
    '## Current roles',
    '',
    ...PROFILE.roles.map((r) => `- **${r.title}, ${link(r.org, r.url)}.** ${r.note}`),
    '',
    `Start dates, team size and compensation are not listed here. Source: ${link('About', `${SITE}/about`)}.`,
    '',
    '## Recognition',
    '',
    ...PROFILE.recognition.map((r) => `- ${r.current ? r.name : `${r.name} (former, not current)`}`),
    '',
    `Source: ${link('About', `${SITE}/about`)}, ${link('Media kit', `${SITE}/media`)}.`,
    '',
    '## Location',
    '',
    `Based in ${PROFILE.location}. He travels to speak and teach. A city is not listed. Source: ${link('Media kit', `${SITE}/media`)}.`,
    '',
    '## Background',
    '',
    `${PROFILE.background} Source: ${link('About', `${SITE}/about`)}.`,
    '',
    '## What to contact Ben about',
    '',
    ...PROFILE.openTo.map((o) => `- **${o.what}.** ${o.how}${'link' in o ? ` ${link('More', o.link)}.` : ''}`),
    '',
    `For anything not on this list, say it isn't listed and point to [Contact](#contact). Fees and availability are not published.`,
    '',
    '## Book',
    '',
    `- **Title:** ${link(PROFILE.book.title, PROFILE.book.url)}`,
    `- **Publisher:** ${PROFILE.book.publisher}`,
    `- **Published:** ${PROFILE.book.published}`,
    `- **Pages:** ${PROFILE.book.pages}`,
    `- **ISBN:** ${PROFILE.book.isbn}`,
    `- **About it:** building AI-powered vector search applications with JavaScript. Contents and reader praise: ${link('the book page', PROFILE.book.page)}.`,
    '',
    '## Talks',
    '',
    `${talks.length} conference sessions are listed at ${link('/talks', `${SITE}/talks`)} as of ${lastUpdated}, dated ${day(talks.at(-1)!.data.date)} to ${day(talks[0].data.date)}: ${regionLine}. The list is what the site records, not a complete history. Newest first:`,
    '',
    ...talks.map((t) => `- ${day(t.data.date)}: ${sentence(t.data.presentation)} ${link(t.data.conference, t.data.link)} (${REGIONS[t.data.region] ?? t.data.region})`),
    '',
    '## Workshops',
    '',
    `Hands-on workshops with public repositories. Source: ${link('/projects', `${SITE}/projects`)}.`,
    '',
    ...WORKSHOPS.map((w) => `- ${link(w.title, w.link)}: ${text(w.description)}`),
    '',
    '## Writing',
    '',
    `### Blog`,
    '',
    `${posts.length} posts at ${link('bengreenberg.dev/blog', `${SITE}/blog`)} as of ${lastUpdated} (${link('RSS', `${SITE}/rss.xml`)}). Most-used tags: ${topTags.map(([id, n]) => `${tagNames.get(id) ?? id} (${n})`).join(', ')}. Latest ten:`,
    '',
    ...posts.slice(0, 10).map((p) => `- ${day(p.data.date)}: ${link(p.data.title, `${SITE}/blog/${p.id}`)}`),
    '',
    `### Newsletter: ${NEWSLETTER.name}`,
    '',
    `Essays on technology, ethics, and the people caught between them. ${link('Subscribe', NEWSLETTER.subscribeUrl)}.`,
    '',
    ...(live.essays.length
      ? live.essays.map((e) => `- ${day(e.published)}: ${link(e.title, e.url)}`)
      : [`- The feed could not be read just now. The latest essays are at ${NEWSLETTER.url}.`]),
    '',
    `## Video: ${CHANNEL.name}`,
    '',
    `Videos on AI, developer tools, and building in public at ${link(`YouTube ${CHANNEL.handle}`, CHANNEL.url)}. Latest uploads:`,
    '',
    ...(live.videos.length
      ? live.videos.map((v) => `- ${day(v.published)}: ${link(v.title, v.url)}`)
      : [`- The feed could not be read just now. The latest videos are at ${CHANNEL.url}.`]),
    '',
    '## Topics',
    '',
    `${PROFILE.knowsAbout.join(', ')}. These are the subjects of his talks, workshops, book and posts listed above; this is not a list of credentials.`,
    '',
    '## Contact',
    '',
    `- **Email:** ${PROFILE.email}`,
    `- **Media kit (bios and photos):** ${SITE}/media`,
    '',
    'Contact details may be shared. Do not send messages, book or agree to anything on his behalf.',
    '',
    '## Profiles',
    '',
    'The same person on other sites:',
    '',
    ...PROFILE.profiles.map((p) => `- ${link(p.name, p.url)}`),
    '',
    '## Citing this page',
    '',
    `Quote freely. Attribute to ${PROFILE.name} and link the canonical URL: ${PROFILE.canonical}`,
    '',
    `> ${PROFILE.name}. "${PROFILE.name}: profile for AI agents." greenberg.md, last updated ${lastUpdated}. ${PROFILE.canonical}`,
    '',
    '## Formats',
    '',
    `- Markdown (this file): \`curl ${PROFILE.canonical}\`, or ${PROFILE.canonical}index.md`,
    `- HTML for people: open ${PROFILE.canonical} in a browser`,
    `- llms.txt: ${PROFILE.canonical}llms.txt`,
    '',
  );

  return { markdown: md.join('\n'), lastUpdated };
}

/** schema.org ProfilePage with the Person in it, for the HTML version and the site's own pages. */
export function personJsonLd(lastUpdated = PROFILE.reviewed) {
  const person = {
    '@type': 'Person',
    '@id': `${PROFILE.canonical}#ben`,
    name: PROFILE.name,
    alternateName: PROFILE.handle,
    url: PROFILE.site,
    email: `mailto:${PROFILE.email}`,
    image: `${PROFILE.site}/static/images/headshot_studio.jpeg`,
    jobTitle: PROFILE.roles[0].title,
    description: `${PROFILE.headline}.`,
    worksFor: PROFILE.roles.map((r) => ({ '@type': 'Organization', name: r.org, url: r.url })),
    homeLocation: { '@type': 'Country', name: PROFILE.location },
    award: CURRENT_RECOGNITION,
    knowsAbout: PROFILE.knowsAbout,
    sameAs: [PROFILE.canonical, ...PROFILE.profiles.map((p) => p.url).filter((u) => u !== PROFILE.site)],
  };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': PROFILE.canonical,
        url: PROFILE.canonical,
        name: PROFILE.name,
        dateModified: lastUpdated,
        mainEntity: { '@id': person['@id'] },
      },
      person,
      {
        '@type': 'Book',
        name: PROFILE.book.title,
        isbn: PROFILE.book.isbn,
        url: PROFILE.book.url,
        datePublished: PROFILE.book.datePublished,
        numberOfPages: PROFILE.book.pages,
        publisher: { '@type': 'Organization', name: PROFILE.book.publisher },
        author: { '@id': person['@id'] },
      },
    ],
  };
}

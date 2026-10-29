import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PROFILE, CURRENT_RECOGNITION, FORMER_RECOGNITION, isProfileHost } from '@/data/profile';
import { buildProfile } from '@/lib/profile';
import WORKSHOPS from '@/data/workshops.json';

export const prerender = false;

const headers = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
};

// On greenberg.md the profile is the whole site, so llms.txt is the profile.
// On bengreenberg.dev it is the llms.txt index of the site, pointing agents at
// the profile for facts about Ben.
export const GET: APIRoute = async ({ url }) => {
  if (isProfileHost(url.host)) return new Response((await buildProfile()).markdown, { headers });

  const posts = (await getCollection('blog', (p) => !p.data.draft)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const site = PROFILE.site;
  const body = [
    `# ${PROFILE.name}`,
    '',
    `> Website of ${PROFILE.name}: ${PROFILE.headline}. Based in ${PROFILE.location}. ${CURRENT_RECOGNITION.join(', ')}; former ${FORMER_RECOGNITION.join(', ')}.`,
    '',
    `For facts about Ben (roles, recognition, contact, what to reach him about) read ${PROFILE.canonical} first. It is written for agents, sources every line, and says what not to assume.`,
    '',
    '## Profile',
    '',
    `- [greenberg.md](${PROFILE.canonical}index.md): profile for AI agents, with rules for using it`,
    `- [About](${site}/about): roles and background`,
    `- [Media kit](${site}/media): bios and photos for organizers and press`,
    '',
    '## Work',
    '',
    `- [Book: ${PROFILE.book.title}](${site}/book): ${PROFILE.book.publisher}, ${PROFILE.book.published}, ISBN ${PROFILE.book.isbn}`,
    `- [Talks](${site}/talks): conference sessions, also as [JSON](${site}/api/talks.json)`,
    `- [Workshops](${site}/projects): hands-on workshops with public repositories`,
    ...WORKSHOPS.map((w) => `  - [${w.title}](${w.link}): ${w.description}`),
    '',
    '## Blog',
    '',
    `- [All posts](${site}/blog) ([RSS](${site}/rss.xml), [JSON](${site}/api/posts.json))`,
    ...posts.slice(0, 15).map((p) => `- [${p.data.title.replace(/\s+/g, ' ')}](${site}/blog/${p.id})`),
    '',
    '## Optional',
    '',
    ...PROFILE.profiles.filter((p) => p.url !== site).map((p) => `- [${p.name}](${p.url})`),
    '',
  ].join('\n');

  return new Response(body, { headers });
};

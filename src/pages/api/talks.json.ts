import { getCollection } from 'astro:content';

export async function GET() {
  const talks = await getCollection('talks');

  const sorted = talks
    .filter((t) => !t.data.draft)
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
    .map((talk) => ({
      presentation: talk.data.presentation,
      conference: talk.data.conference,
      date: talk.data.date,
      region: talk.data.region,
      link: talk.data.link,
      image: talk.data.image,
    }));

  return new Response(JSON.stringify(sorted), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

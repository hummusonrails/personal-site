import type { APIRoute } from 'astro';
import { getFile, createOrUpdateFile } from '../../../lib/github';

const WORKSHOPS_PATH = 'src/data/workshops.json';

interface Workshop {
  title: string;
  description: string;
  link: string;
}

async function getWorkshops(): Promise<{ workshops: Workshop[]; sha: string }> {
  const file = await getFile(WORKSHOPS_PATH);
  if (!file) return { workshops: [], sha: '' };
  const workshops = JSON.parse(file.content);
  return { workshops, sha: file.sha };
}

export const GET: APIRoute = async () => {
  const { workshops, sha } = await getWorkshops();
  return new Response(JSON.stringify({ workshops, sha }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { action, workshop, index, sha } = body;

  if (!sha) {
    return new Response(JSON.stringify({ error: 'Missing sha' }), { status: 400 });
  }

  const { workshops } = await getWorkshops();

  if (action === 'add') {
    if (!workshop) {
      return new Response(JSON.stringify({ error: 'Missing workshop data' }), { status: 400 });
    }
    workshops.push(workshop);
  } else if (action === 'update') {
    if (index === undefined || !workshop) {
      return new Response(JSON.stringify({ error: 'Missing index or workshop data' }), { status: 400 });
    }
    workshops[index] = workshop;
  } else if (action === 'delete') {
    if (index === undefined) {
      return new Response(JSON.stringify({ error: 'Missing index' }), { status: 400 });
    }
    workshops.splice(index, 1);
  } else {
    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  }

  const content = JSON.stringify(workshops, null, 2);
  const message =
    action === 'add'
      ? `Add workshop: ${workshop?.title}`
      : action === 'update'
        ? `Update workshop: ${workshop?.title}`
        : `Delete workshop at index ${index}`;

  const result = await createOrUpdateFile(WORKSHOPS_PATH, content, message, sha);

  return new Response(JSON.stringify({ ok: true, sha: result.sha }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

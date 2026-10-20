import type { APIRoute } from 'astro';
import { getFile, commitFiles } from '../../../lib/github';

// Workshops shown on /projects, kept in one JSON file in display order.
const WORKSHOPS_PATH = 'src/data/workshops.json';

interface Workshop {
  title: string;
  description: string;
  link: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function getWorkshops(): Promise<{ workshops: Workshop[]; sha: string }> {
  const file = await getFile(WORKSHOPS_PATH);
  if (!file) return { workshops: [], sha: '' };
  return { workshops: JSON.parse(file.content), sha: file.sha };
}

function clean(w: Partial<Workshop> | undefined): Workshop | string {
  const title = String(w?.title || '').trim();
  const description = String(w?.description || '').trim();
  const link = String(w?.link || '').trim();
  if (!title) return 'Title is required.';
  try {
    if (!/^https?:$/.test(new URL(link).protocol)) throw new Error();
  } catch {
    return 'Link must be a full http(s) URL.';
  }
  return { title, description, link };
}

export const GET: APIRoute = async () => json(await getWorkshops());

export const POST: APIRoute = async ({ request }) => {
  const { action, workshop, index, to, sha } = await request.json();
  if (!sha) return json({ error: 'Missing sha' }, 400);

  // The sha check in commitFiles rejects the save if the file changed since
  // the page loaded, so an index always points at the workshop the user saw.
  const { workshops } = await getWorkshops();
  const at = Number(index);
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < workshops.length;
  let message: string;

  if (action === 'add' || action === 'update') {
    const w = clean(workshop);
    if (typeof w === 'string') return json({ error: w }, 400);
    if (action === 'add') {
      workshops.push(w);
      message = `Add workshop: ${w.title}`;
    } else {
      if (!inRange(at)) return json({ error: 'Bad index' }, 400);
      workshops[at] = w;
      message = `Update workshop: ${w.title}`;
    }
  } else if (action === 'delete') {
    if (!inRange(at)) return json({ error: 'Bad index' }, 400);
    const [gone] = workshops.splice(at, 1);
    message = `Delete workshop: ${gone.title}`;
  } else if (action === 'move') {
    const dest = Number(to);
    if (!inRange(at) || !inRange(dest)) return json({ error: 'Bad index' }, 400);
    const [w] = workshops.splice(at, 1);
    workshops.splice(dest, 0, w);
    message = `Reorder workshops: ${w.title}`;
  } else {
    return json({ error: 'Invalid action' }, 400);
  }

  const result = await commitFiles(
    [{ path: WORKSHOPS_PATH, content: `${JSON.stringify(workshops, null, 2)}\n`, expectSha: sha }],
    message,
  );
  return json({ ok: true, workshops, sha: result.shas[WORKSHOPS_PATH], commit: result.commit });
};

import type { APIRoute } from 'astro';
import { deploysConfigured, productionDeploys } from '../../../lib/cms/deploys';

// GET               the latest production deploys
// GET ?commit=<sha> the deploy for one commit (null until Vercel picks it up)
export const GET: APIRoute = async ({ url }) => {
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  if (!deploysConfigured()) return json({ configured: false, deploys: [], deploy: null });
  const deploys = await productionDeploys(10);
  const commit = url.searchParams.get('commit');
  return json({
    configured: true,
    deploys,
    deploy: commit ? deploys.find((d) => d.commit === commit) ?? null : null,
  });
};

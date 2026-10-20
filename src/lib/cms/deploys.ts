// Production deployments from the Vercel API, so the CMS can say when a save
// is live. Needs VERCEL_TOKEN and VERCEL_PROJECT_ID; without them it reports
// nothing and the CMS just says the commit was made.

export interface Deploy {
  state: string; // QUEUED, BUILDING, READY, ERROR, CANCELED
  commit: string | null;
  message: string | null;
  url: string;
  createdAt: number;
  readyAt: number | null;
  inspectorUrl: string | null;
}

function creds() {
  const token = import.meta.env.VERCEL_TOKEN || process.env.VERCEL_TOKEN;
  const projectId = import.meta.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
  return token && projectId ? { token, projectId } : null;
}

export const deploysConfigured = () => creds() !== null;

/** The latest production deployments, newest first. */
export async function productionDeploys(limit = 10): Promise<Deploy[]> {
  const c = creds();
  if (!c) return [];
  const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${c.projectId}&target=production&limit=${limit}`, {
    headers: { Authorization: `Bearer ${c.token}` },
  });
  if (!res.ok) throw new Error(`Vercel API error: ${res.status}`);
  const data = await res.json();
  return (data.deployments || []).map((d: any) => ({
    state: d.state || d.readyState,
    commit: d.meta?.githubCommitSha || null,
    message: d.meta?.githubCommitMessage || null,
    url: `https://${d.url}`,
    createdAt: d.created,
    readyAt: d.ready ?? null,
    inspectorUrl: d.inspectorUrl || null,
  }));
}

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_OWNER = 'hummusonrails';
const REPO_NAME = 'personal-site';
const BRANCH = 'main';

function getToken(): string | null {
  return import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN || null;
}

function isLocal(): boolean {
  return !getToken();
}

// Resolve project root (works in dev and build)
function projectRoot(): string {
  return process.cwd();
}

function apiUrl(path: string): string {
  return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
}

async function api(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
  content?: string;
  encoding?: string;
}

export async function listFiles(dirPath: string): Promise<GitHubFile[]> {
  if (isLocal()) {
    const fullPath = resolve(projectRoot(), dirPath);
    if (!existsSync(fullPath)) return [];
    const files = readdirSync(fullPath);
    return files.map((name) => ({
      name,
      path: `${dirPath}/${name}`,
      sha: 'local',
      size: 0,
      type: 'file',
    }));
  }

  const res = await api(`${apiUrl(dirPath)}?ref=${BRANCH}`);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

export async function getFile(filePath: string): Promise<{ content: string; sha: string } | null> {
  if (isLocal()) {
    const fullPath = resolve(projectRoot(), filePath);
    if (!existsSync(fullPath)) return null;
    const content = readFileSync(fullPath, 'utf-8');
    return { content, sha: 'local' };
  }

  const res = await api(`${apiUrl(filePath)}?ref=${BRANCH}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

export async function createOrUpdateFile(
  filePath: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ sha: string; committed: boolean }> {
  if (isLocal()) {
    const fullPath = resolve(projectRoot(), filePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
    return { sha: 'local', committed: true };
  }

  const encoded = Buffer.from(content).toString('base64');
  const body: Record<string, string> = {
    message,
    content: encoded,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await api(apiUrl(filePath), {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return { sha: data.content.sha, committed: true };
}

export async function deleteFile(
  filePath: string,
  sha: string,
  message: string
): Promise<void> {
  if (isLocal()) {
    const fullPath = resolve(projectRoot(), filePath);
    if (existsSync(fullPath)) unlinkSync(fullPath);
    return;
  }

  const res = await api(apiUrl(filePath), {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }
}

// Preview deployment: create a branch and push content
export async function createPreviewBranch(branchName: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Preview requires GITHUB_TOKEN');

  const refRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${BRANCH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
  );
  if (!refRes.ok) throw new Error('Failed to get main branch ref');
  const refData = await refRes.json();
  const sha = refData.object.sha;

  const createRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
    }
  );
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create branch: ${err}`);
  }
}

export async function pushToPreviewBranch(
  branchName: string,
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Preview requires GITHUB_TOKEN');

  const encoded = Buffer.from(content).toString('base64');

  const checkRes = await fetch(
    `${apiUrl(filePath)}?ref=${branchName}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
  );

  const body: Record<string, string> = {
    message,
    content: encoded,
    branch: branchName,
  };

  if (checkRes.ok) {
    const existing = await checkRes.json();
    body.sha = existing.sha;
  }

  const res = await fetch(apiUrl(filePath), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to push to preview branch: ${err}`);
  }
}

export async function deletePreviewBranch(branchName: string): Promise<void> {
  const token = getToken();
  if (!token) return;

  await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${branchName}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
    }
  );
}

function getVercelCreds() {
  const token = import.meta.env.VERCEL_TOKEN || process.env.VERCEL_TOKEN;
  const projectId = import.meta.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
  return token && projectId ? { token, projectId } : null;
}

export async function getVercelPreviewUrl(branchName: string): Promise<string | null> {
  const creds = getVercelCreds();
  if (!creds) return null;

  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${creds.projectId}&limit=5&state=BUILDING,READY`,
    { headers: { Authorization: `Bearer ${creds.token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const deployment = data.deployments?.find(
    (d: any) => d.meta?.githubCommitRef === branchName
  );
  if (deployment?.state === 'READY') return `https://${deployment.url}`;
  return null;
}

export async function deleteVercelDeployments(branchName: string): Promise<void> {
  const creds = getVercelCreds();
  if (!creds) return;

  // Find all deployments for this branch
  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${creds.projectId}&limit=20`,
    { headers: { Authorization: `Bearer ${creds.token}` } }
  );
  if (!res.ok) return;
  const data = await res.json();
  const deployments = data.deployments?.filter(
    (d: any) => d.meta?.githubCommitRef === branchName
  ) || [];

  // Delete each deployment
  for (const d of deployments) {
    await fetch(`https://api.vercel.com/v13/deployments/${d.uid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creds.token}` },
    });
  }
}

export async function listPreviewBranches(): Promise<string[]> {
  const token = getToken();
  if (!token) return [];

  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/preview-`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
    }
  );
  if (!res.ok) return [];
  const refs = await res.json();
  if (!Array.isArray(refs)) return [];
  return refs.map((r: any) => r.ref.replace('refs/heads/', ''));
}

export async function cleanupAllPreviews(): Promise<{ deleted: number }> {
  const branches = await listPreviewBranches();
  let deleted = 0;
  for (const branch of branches) {
    try {
      await deleteVercelDeployments(branch);
      await deletePreviewBranch(branch);
      deleted++;
    } catch {
      // Continue cleaning up others
    }
  }
  return { deleted };
}

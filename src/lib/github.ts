// Content storage for the CMS. With GITHUB_TOKEN set (production) every read
// and write goes through the GitHub API, so a save is a commit to the repo and
// Vercel deploys it. Without one (local dev) it reads and writes the working
// tree instead.
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const REPO_OWNER = 'hummusonrails';
export const REPO_NAME = 'personal-site';
// CMS_BRANCH points a local CMS at a scratch branch for end-to-end testing.
const BRANCH = import.meta.env.CMS_BRANCH || process.env.CMS_BRANCH || 'main';

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

const REPO_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

function apiUrl(path: string): string {
  return `${REPO_API}/contents/${path}`;
}

/** Thrown when a save would overwrite a change made since the editor loaded. */
export class ConflictError extends Error {}

async function api(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (res.status === 401) {
    throw new Error('GitHub rejected GITHUB_TOKEN (expired or revoked). Create a new token and update it in Vercel.');
  }
  return res;
}

async function apiJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await api(url, options);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
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
  const raw = await getRawFile(filePath);
  return raw && { content: raw.bytes.toString('utf-8'), sha: raw.sha };
}

/** A file's bytes, for images and other binary files. */
export async function getRawFile(filePath: string): Promise<{ bytes: Buffer; sha: string } | null> {
  if (isLocal()) {
    const fullPath = resolve(projectRoot(), filePath);
    if (!existsSync(fullPath)) return null;
    return { bytes: readFileSync(fullPath), sha: 'local' };
  }

  const res = await api(`${apiUrl(filePath)}?ref=${BRANCH}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  // The contents API leaves out the body of files over 1 MB; the blob API has it.
  const encoded = data.content || (await apiJson(`${REPO_API}/git/blobs/${data.sha}`)).content;
  return { bytes: Buffer.from(encoded, 'base64'), sha: data.sha };
}

/** Reads several files a few at a time, in the order given; missing files are null. */
export async function getFiles(filePaths: string[], concurrency = 8): Promise<({ content: string; sha: string } | null)[]> {
  const out: ({ content: string; sha: string } | null)[] = new Array(filePaths.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < filePaths.length) {
      const i = next++;
      out[i] = await getFile(filePaths[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, filePaths.length) }, worker));
  return out;
}

export interface FileChange {
  path: string;
  /** New contents; null deletes the file. */
  content: string | Buffer | null;
  /**
   * What the file must be before this commit: the blob sha the editor loaded,
   * null for "must not exist yet", undefined to skip the check.
   */
  expectSha?: string | null;
}

/**
 * Writes every change as one commit, so a save (a rename, a post with its new
 * tag) deploys once and never lands half done. Throws ConflictError when a
 * file is not what the caller expected.
 */
export async function commitFiles(changes: FileChange[], message: string): Promise<{ commit: string; shas: Record<string, string> }> {
  if (isLocal()) {
    const shas: Record<string, string> = {};
    for (const c of changes) {
      const full = resolve(projectRoot(), c.path);
      if (c.expectSha === null && existsSync(full)) throw new ConflictError(`${c.path} already exists`);
      if (c.content === null) {
        if (existsSync(full)) unlinkSync(full);
      } else {
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, c.content);
        shas[c.path] = 'local';
      }
    }
    return { commit: 'local', shas };
  }

  for (let attempt = 0; ; attempt++) {
    const ref = await apiJson(`${REPO_API}/git/ref/heads/${BRANCH}`);
    const parent: string = ref.object.sha;
    const base = await apiJson(`${REPO_API}/git/commits/${parent}`);

    for (const c of changes) {
      if (c.expectSha === undefined) continue;
      const res = await api(`${apiUrl(c.path)}?ref=${parent}`);
      if (res.status !== 404 && !res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
      const current: string | null = res.ok ? (await res.json()).sha : null;
      if (current !== c.expectSha) {
        throw new ConflictError(
          c.expectSha === null
            ? `${c.path} already exists. Pick another slug.`
            : current === null
              ? `${c.path} was deleted since you opened it.`
              : `${c.path} changed since you opened it. Reload to get the latest version before saving.`,
        );
      }
    }

    const tree = await Promise.all(
      changes.map(async (c) => {
        if (c.content === null) return { path: c.path, mode: '100644', type: 'blob', sha: null };
        const blob = await apiJson(`${REPO_API}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content: (typeof c.content === 'string' ? Buffer.from(c.content, 'utf8') : c.content).toString('base64'), encoding: 'base64' }),
        });
        return { path: c.path, mode: '100644', type: 'blob', sha: blob.sha as string };
      }),
    );
    const newTree = await apiJson(`${REPO_API}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: base.tree.sha, tree }),
    });
    const commit = await apiJson(`${REPO_API}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }),
    });
    const update = await api(`${REPO_API}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    if (update.ok) {
      const shas: Record<string, string> = {};
      tree.forEach((t) => { if (t.sha) shas[t.path] = t.sha; });
      return { commit: commit.sha, shas };
    }
    // Someone else (a scheduled import, another tab) moved the branch first:
    // rebuild on top of it, re-checking every expectation.
    if (update.status !== 422 || attempt >= 2) {
      throw new Error(`GitHub API error: ${update.status} ${await update.text()}`);
    }
  }
}

export async function createOrUpdateFile(
  filePath: string,
  content: string,
  message: string,
  sha?: string
): Promise<{ sha: string; committed: boolean; commit: string }> {
  const result = await commitFiles([{ path: filePath, content, expectSha: sha ?? null }], message);
  return { sha: result.shas[filePath], committed: true, commit: result.commit };
}

export async function deleteFile(filePath: string, sha: string, message: string): Promise<{ commit: string }> {
  return commitFiles([{ path: filePath, content: null, expectSha: sha }], message);
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
    `https://api.vercel.com/v6/deployments?projectId=${creds.projectId}&limit=20&state=BUILDING,READY`,
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
  // Only stale ones: a preview opened in another tab in the last half hour stays.
  const branches = (await listPreviewBranches()).filter((b) => {
    const ts = Number(b.replace(/^preview-/, ''));
    return !Number.isFinite(ts) || Date.now() - ts > 30 * 60_000;
  });
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

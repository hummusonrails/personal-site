// Small helpers shared by the CMS pages: safe HTML, JSON calls that surface
// the server's error message, toasts and the deploy indicator in the top bar.

export const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  (window as unknown as { showToast?: (m: string, t: string) => void }).showToast?.(message, type);
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** fetch + JSON that throws ApiError with the server's message on failure. */
export async function api<T = any>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    ...(json !== undefined ? { method: rest.method || 'POST', body: JSON.stringify(json), headers: { 'Content-Type': 'application/json', ...rest.headers } } : {}),
  });
  if (res.status === 401) {
    location.href = '/admin/login';
    throw new ApiError('Signed out', 401);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

export const fmtDate = (d: string) =>
  d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

/** Tells the top-bar deploy indicator to follow a commit until it is live. */
export function watchDeploy(commit: string | undefined, livePath?: string) {
  if (!commit || commit === 'local') return;
  window.dispatchEvent(new CustomEvent('cms:deploy', { detail: { commit, livePath } }));
}

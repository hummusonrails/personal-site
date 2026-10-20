// First-party page analytics for the admin desk: no cookies, no third parties.
// Counts page views, time on page and outbound clicks. Off everywhere but the
// live site, for automation, in the admin area and on the owner's browsers
// (opening /admin/analytics marks a browser as the owner's). Loaded on every
// public page by components/Track.astro.

const LIVE_HOSTS = new Set(['bengreenberg.dev', 'www.bengreenberg.dev']);
export const IGNORE_KEY = 'bg_ignore';

export function shouldTrack(env: { host: string; path: string; ignored: boolean; webdriver: boolean }) {
  return LIVE_HOSTS.has(env.host) && !env.ignored && !env.webdriver && !/^\/admin(\/|$)/.test(env.path);
}

/** "host/path" for a link that leaves the site, the scheme and address for mailto: and tel:, else null. */
export function outboundTarget(href: string, base: string): string | null {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  const http = /^https?:$/.test(url.protocol);
  if (http && url.hostname === new URL(base).hostname) return null;
  return (http ? `${url.hostname}${url.pathname}` : `${url.protocol}${url.pathname}`).slice(0, 300);
}

export type Source = { r: string; q: string };
const SOURCE_KEY = 'bg_src';

/**
 * Where this visit came from: the outside referrer and the query string it
 * landed with. Kept for the tab's session so every page of the visit is
 * credited to the same campaign or site, not just the first.
 */
export function visitSource(stored: Source | null, env: { referrer: string; search: string; host: string }): Source {
  let external = '';
  try {
    if (env.referrer && new URL(env.referrer).hostname !== env.host) external = env.referrer;
  } catch {
    // not a URL
  }
  const tagged = /[?&](utm_[a-z]+|ref)=/i.test(env.search);
  if (external || tagged) return { r: external, q: tagged ? env.search : '' };
  return stored ?? { r: '', q: '' };
}

function ignoredHere() {
  try {
    return localStorage.getItem(IGNORE_KEY) === '1';
  } catch {
    return false;
  }
}

function send(d: Record<string, unknown>) {
  const body = JSON.stringify({ ...d, u: location.href });
  if (!navigator.sendBeacon?.('/api/p', new Blob([body], { type: 'text/plain' }))) {
    fetch('/api/p', { method: 'POST', body, keepalive: true }).catch(() => {});
  }
}

/** One page view per page load, then time on page and outbound clicks. */
export function track() {
  if (!shouldTrack({ host: location.hostname, path: location.pathname, ignored: ignoredHere(), webdriver: !!navigator.webdriver })) return;

  const id = crypto.randomUUID();
  let shown = document.visibilityState === 'visible' ? Date.now() : 0;
  let engaged = 0;
  let sent = 0;

  const flush = () => {
    if (shown) {
      engaged += Date.now() - shown;
      shown = document.visibilityState === 'visible' ? Date.now() : 0;
    }
    if (engaged - sent >= 1000) {
      sent = engaged;
      send({ k: 'eng', id, e: engaged });
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else shown = Date.now();
  });
  addEventListener('pagehide', flush);
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const x = outboundTarget(a.href, location.href);
      if (x) send({ k: 'out', id: crypto.randomUUID(), x, ti: document.title });
    },
    { capture: true },
  );

  let stored: Source | null = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(SOURCE_KEY) || 'null');
  } catch {
    // private mode or bad JSON
  }
  const src = visitSource(stored, { referrer: document.referrer, search: location.search, host: location.hostname });
  try {
    sessionStorage.setItem(SOURCE_KEY, JSON.stringify(src));
  } catch {
    // private mode
  }
  send({ k: 'pv', id, r: src.r, q: src.q || undefined, ti: document.title });
}

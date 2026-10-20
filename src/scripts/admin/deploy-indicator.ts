// The deploy pill in the CMS top bar. Every save is a commit that Vercel
// deploys to production; this shows the latest deploy and, after a save,
// follows that commit until it is live. Survives page loads via
// sessionStorage, so saving and going back to a list keeps following it.

type Deploy = { state: string; commit: string | null; message: string | null; url: string; createdAt: number; readyAt: number | null; inspectorUrl: string | null };
type Watch = { commit: string; livePath?: string; since: number };

const KEY = 'cms_watch';
const SITE = 'https://www.bengreenberg.dev';

export function mountDeployIndicator(el: HTMLElement) {
  let watch: Watch | null = null;
  try {
    watch = JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch {
    watch = null;
  }
  if (watch && Date.now() - watch.since > 15 * 60_000) watch = null;
  let timer = 0;

  const save = () => {
    try {
      if (watch) sessionStorage.setItem(KEY, JSON.stringify(watch));
      else sessionStorage.removeItem(KEY);
    } catch {
      // private mode
    }
  };

  const ago = (ms: number) => {
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return `${Math.round(s / 86400)}d ago`;
  };

  function render(state: 'idle' | 'building' | 'ready' | 'error' | 'pending', text: string, href?: string, title?: string) {
    el.dataset.state = state;
    el.replaceChildren();
    const dot = document.createElement('span');
    dot.className = 'cms-deploy-dot';
    const label = document.createElement(href ? 'a' : 'span');
    label.textContent = text;
    if (href) {
      (label as HTMLAnchorElement).href = href;
      (label as HTMLAnchorElement).target = '_blank';
      (label as HTMLAnchorElement).rel = 'noopener';
    }
    el.append(dot, label);
    el.title = title || '';
    el.hidden = false;
  }

  async function tick() {
    clearTimeout(timer);
    let data: { configured: boolean; deploys: Deploy[] };
    try {
      const res = await fetch('/api/admin/deploys', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      data = await res.json();
    } catch {
      timer = window.setTimeout(tick, 60_000);
      return;
    }
    if (!data.configured) {
      if (watch) render('pending', 'Saved. Deploying to the site (about a minute)');
      else el.hidden = true;
      return;
    }

    const latest = data.deploys[0];
    const mine = watch ? data.deploys.find((d) => d.commit === watch!.commit) : undefined;
    let fast = false;

    if (watch && !mine && Date.now() - watch.since > 3 * 60_000) {
      render('error', 'Saved, but no deploy started: check Vercel', 'https://vercel.com/bencgreenbergs-projects/personal-site/deployments');
      watch = null;
      save();
    } else if (watch && !mine) {
      render('pending', 'Saved. Waiting for Vercel to start the deploy');
      fast = true;
    } else if (watch && mine) {
      if (mine.state === 'READY') {
        render('ready', watch.livePath ? 'Live: view on site' : 'Live on the site', `${SITE}${watch.livePath || '/'}`, mine.message || '');
        watch = null;
        save();
        window.dispatchEvent(new CustomEvent('cms:live'));
      } else if (mine.state === 'ERROR' || mine.state === 'CANCELED') {
        render('error', 'Deploy failed: open build log', mine.inspectorUrl || undefined, mine.message || '');
        watch = null;
        save();
      } else {
        render('building', `Deploying your change (${ago(mine.createdAt)})`, mine.inspectorUrl || undefined);
        fast = true;
      }
    } else if (latest) {
      const building = latest.state !== 'READY' && latest.state !== 'ERROR' && latest.state !== 'CANCELED';
      if (building) {
        render('building', 'Site is deploying', latest.inspectorUrl || undefined, latest.message || '');
        fast = true;
      } else if (latest.state === 'ERROR') {
        render('error', 'Last deploy failed', latest.inspectorUrl || undefined, latest.message || '');
      } else {
        render('idle', `Deployed ${ago(latest.readyAt || latest.createdAt)}`, SITE, latest.message || '');
      }
    } else {
      el.hidden = true;
    }
    timer = window.setTimeout(tick, fast ? 5000 : 60_000);
  }

  window.addEventListener('cms:deploy', (e) => {
    const d = (e as CustomEvent<{ commit: string; livePath?: string }>).detail;
    watch = { commit: d.commit, livePath: d.livePath, since: Date.now() };
    save();
    render('pending', 'Saved. Waiting for Vercel to start the deploy');
    timer = window.setTimeout(tick, 3000);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
  tick();
}

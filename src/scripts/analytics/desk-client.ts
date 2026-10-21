// Analytics desk client: fetches one report per range and filter set, then
// draws every panel from it. Ported from the Kindled desk; mounted by
// pages/admin/analytics.astro, and `start` returns a function that tears
// everything down.

import { pageHref, webHref } from './desk-links';
import { IGNORE_KEY } from './track';

type Row = { key: string; visitors: number; views: number; [k: string]: unknown };
type Point = { t: string; visitors: number; views: number };
type Summary = { visitors: number; views: number; bounces: number; engaged_ms: number };
type Report = {
  range: { from: string; to: string; hourly: boolean };
  firstHit: string | null;
  live: number;
  summary: { current: Summary; previous: Summary };
  series: { current: Point[]; previous: Point[] };
  growth: { weeks: Point[]; months: Point[]; weekToDate: Point; monthToDate: Point };
  github: { firstHit: string | null; summary: { current: Point; previous: Point }; series: { current: Point[]; previous: Point[] } };
  [panel: string]: unknown;
};

export function start(board: HTMLElement): () => void {
  // The owner's browser never counts itself on the public site.
  try { localStorage.setItem(IGNORE_KEY, '1'); } catch { /* private mode */ }

  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  // Earliest data on record; updated from each report's first hit.
  let EPOCH = new Date(2026, 0, 1);
  const nf = new Intl.NumberFormat('en-US');
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
  const FILTER_LABEL: Record<string, string> = {
    page: 'Page', ref: 'Referrer', channel: 'Channel', country: 'Country', region: 'Region', city: 'City',
    source: 'UTM source', medium: 'UTM medium', campaign: 'UTM campaign', content: 'UTM content', term: 'UTM term',
    device: 'Device', browser: 'Browser', os: 'OS', lang: 'Language',
  };

  // ---- state, kept in the URL hash so a reload or bookmark returns to the same view
  const state = {
    range: '30d', from: '', to: '', metric: 'visitors' as 'visitors' | 'views', ghMetric: 'views' as 'visitors' | 'views',
    filters: {} as Record<string, string>,
    tabs: {} as Record<string, string>,
  };
  const readHash = () => {
    const h = new URLSearchParams(location.hash.slice(1));
    state.range = h.get('range') || '30d';
    state.from = h.get('from') || '';
    state.to = h.get('to') || '';
    state.metric = h.get('metric') === 'views' ? 'views' : 'visitors';
    state.ghMetric = h.get('gh') === 'visitors' ? 'visitors' : 'views';
    state.filters = {};
    for (const k of Object.keys(FILTER_LABEL)) { const v = h.get(`f.${k}`); if (v) state.filters[k] = v; }
  };
  const writeHash = () => {
    const h = new URLSearchParams({ range: state.range });
    if (state.range === 'custom') { h.set('from', state.from); h.set('to', state.to); }
    if (state.metric !== 'visitors') h.set('metric', state.metric);
    if (state.ghMetric !== 'views') h.set('gh', state.ghMetric);
    for (const [k, v] of Object.entries(state.filters)) h.set(`f.${k}`, v);
    history.replaceState(null, '', `#${h}`);
  };

  // ---- dates
  const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours());
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const keyOf = (d: Date, hourly: boolean) => `${ymd(d)}T${hourly ? pad(d.getHours()) : '00'}`;
  const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDay = (d: Date, year = false) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) });

  function window_(): { from: Date; to: Date; label: string } {
    const now = new Date();
    const today = day0(now);
    switch (state.range) {
      case 'today': return { from: today, to: now, label: 'Today so far' };
      case 'yesterday': return { from: addDays(today, -1), to: today, label: fmtDay(addDays(today, -1), true) };
      case '7d': return { from: addDays(today, -6), to: now, label: 'Last 7 days' };
      case '90d': return { from: addDays(today, -89), to: now, label: 'Last 90 days' };
      case '12m': return { from: new Date(today.getFullYear(), today.getMonth() - 11, 1), to: now, label: 'Last 12 months' };
      case 'all': return { from: EPOCH, to: now, label: `Since ${fmtDay(EPOCH, true)}` };
      case 'custom': {
        if (state.from && state.to) {
          const from = parseYmd(state.from);
          const to = addDays(parseYmd(state.to), 1);
          if (to > from) return { from, to: to > now ? now : to, label: `${fmtDay(from, true)} to ${fmtDay(parseYmd(state.to), true)}` };
        }
        state.range = '30d';
        return window_();
      }
      default: return { from: addDays(today, -29), to: now, label: 'Last 30 days' };
    }
  }

  // The comparison period is the same window moved back by its own length in calendar days,
  // so "today until 3pm" compares with "yesterday until 3pm".
  const shiftDays = (from: Date, to: Date) => Math.max(1, Math.round((day0(addDays(to, to.getTime() === day0(to).getTime() ? 0 : 1)).getTime() - from.getTime()) / 86400_000));
  const back = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - n, d.getHours(), d.getMinutes(), d.getSeconds());

  // Buckets the series is drawn on, zero-filled, so empty days still take up their space.
  function buckets(from: Date, to: Date, hourly: boolean) {
    const out: Date[] = [];
    for (let d = new Date(from); d < to; d = hourly ? new Date(d.getTime() + 3600_000) : addDays(d, 1)) out.push(d);
    return out;
  }

  // ---- formatting
  const dur = (ms: number) => {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${pad(s % 60)}s`;
  };
  const pct = (a: number, b: number) => (b ? (a - b) / b : null);
  const signed = (x: number | null, digits = 0) =>
    x === null ? '' : `${x > 0 ? '+' : x < 0 ? '−' : '±'}${Math.abs(x * 100).toFixed(digits)}%`;
  const flag = (cc: string) => /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '';
  const country = (cc: string) => { try { return regionNames.of(cc) || cc; } catch { return cc; } };
  const language = (l: string) => { try { return languageNames.of(l) || l; } catch { return l; } };
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };
  const niceMax = (v: number) => {
    if (v <= 4) return 4;
    const p = 10 ** Math.floor(Math.log10(v));
    for (const m of [1, 2, 2.5, 4, 5, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  };

  // ---- tooltip
  const tip = $('tip');
  function showTip(x: number, y: number, title: string, rows: { color?: string; value: string; label: string }[]) {
    tip.replaceChildren();
    tip.append(el('div', 'tip-title', title));
    for (const r of rows) {
      const row = el('div', 'tip-row');
      if (r.color) { const i = el('i'); i.style.background = r.color; row.append(i); }
      row.append(el('b', '', r.value), el('span', '', r.label));
      tip.append(row);
    }
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${Math.min(innerWidth - w - 8, Math.max(8, x + 14))}px`;
    tip.style.top = `${Math.min(innerHeight - h - 8, Math.max(8, y - h - 10))}px`;
  }
  const hideTip = () => { tip.hidden = true; };
  // The palette lives on the desk, not the document root.
  const cssVar = (n: string) => getComputedStyle(board).getPropertyValue(n).trim();

  // ---- stat tiles
  function tiles(cur: Summary, prev: Summary, prevLabel: string) {
    const host = $('tiles');
    host.replaceChildren();
    const ppv = (s: Summary) => (s.visitors ? s.views / s.visitors : 0);
    const bounce = (s: Summary) => (s.visitors ? s.bounces / s.visitors : 0);
    const defs: TileDef[] = [
      { label: 'Visitors', value: compactOr(cur.visitors), delta: pct(cur.visitors, prev.visitors), good: true },
      { label: 'Page views', value: compactOr(cur.views), delta: pct(cur.views, prev.views), good: true },
      { label: 'Pages per visitor', value: ppv(cur).toFixed(2), delta: pct(ppv(cur), ppv(prev)), good: true },
      { label: 'Single-page visits', value: `${Math.round(bounce(cur) * 100)}%`, delta: prev.visitors ? bounce(cur) - bounce(prev) : null, good: false, pp: true },
      { label: 'Time on page', value: dur(cur.engaged_ms), delta: pct(cur.engaged_ms, prev.engaged_ms), good: true },
    ];
    host.append(...defs.map((d) => tile(d, prevLabel)));
  }
  type TileDef = { label: string; value: string; delta: number | null; good: boolean; pp?: boolean };
  function tile(d: TileDef, prevLabel: string) {
    const t = el('div', 'tile');
    t.append(el('div', 'tile-label', d.label), el('div', 'tile-value', d.value));
    const delta = el('div', 'tile-delta');
    if (d.delta === null || !Number.isFinite(d.delta)) delta.textContent = `nothing to compare in ${prevLabel}`;
    else {
      const better = d.good ? d.delta > 0 : d.delta < 0;
      const txt = d.pp ? `${d.delta > 0 ? '+' : d.delta < 0 ? '−' : '±'}${Math.abs(Math.round(d.delta * 100))} pts` : signed(d.delta);
      const s = el('span', d.delta === 0 ? '' : better ? 'up' : 'down', `${d.delta > 0 ? '▲' : d.delta < 0 ? '▼' : ''} ${txt}`.trim());
      delta.append(s, document.createTextNode(` vs ${prevLabel}`));
    }
    t.append(delta);
    return t;
  }
  const compactOr = (n: number) => (n >= 10000 ? compact.format(n) : nf.format(n));

  // ---- trend line with previous period
  function trend(r: Report, from: Date, to: Date) {
    $('trend-title').textContent = state.metric === 'visitors' ? 'Visitors' : 'Page views';
    line($('trend'), $('trend-legend'), r.series, state.metric, r.range.hourly, from, to, {
      name: state.metric === 'visitors' ? 'visitors' : 'views', title: $('trend-title').textContent!, empty: 'No visits in this range yet.',
    });
  }

  function line(
    host: HTMLElement, legend: HTMLElement, series: { current: Point[]; previous: Point[] }, m: 'visitors' | 'views',
    hourly: boolean, from: Date, to: Date, words: { name: string; title: string; empty: string },
  ) {
    const cur = buckets(from, to, hourly);
    const n0 = shiftDays(from, to);
    const prev = cur.map((d) => back(d, n0));
    const index = (pts: Point[]) => new Map(pts.map((p) => [p.t, p]));
    const ci = index(series.current), pi = index(series.previous);
    const a = cur.map((d) => ci.get(keyOf(d, hourly))?.[m] ?? 0);
    const b = prev.map((d) => pi.get(keyOf(d, hourly))?.[m] ?? 0);
    legend.replaceChildren();
    const li = (cls: string, text: string) => { const s = el('span'); s.append(el('i', cls), document.createTextNode(text)); return s; };
    legend.append(li('', window_().label), li('prev', 'Previous period'));

    host.replaceChildren();
    if (!a.some(Boolean) && !b.some(Boolean)) { host.append(el('div', 'empty', words.empty)); return; }
    const W = host.clientWidth, H = host.clientHeight;
    const pl = 40, pr = 12, pt = 8, pb = 24;
    const iw = W - pl - pr, ih = H - pt - pb;
    const max = niceMax(Math.max(...a, ...b));
    const n = cur.length;
    const x = (i: number) => pl + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v: number) => pt + ih - (v / max) * ih;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${words.title} over time` });
    const grid = svgEl('g', { class: 'grid' }), axis = svgEl('g', { class: 'axis' });
    for (let k = 0; k <= 4; k++) {
      const v = (max / 4) * k;
      if (k) grid.append(svgEl('line', { x1: pl, x2: W - pr, y1: y(v), y2: y(v) }));
      const t = svgEl('text', { x: pl - 8, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = compact.format(v); axis.append(t);
    }
    const ticks = Math.min(n, Math.max(2, Math.floor(iw / 80)));
    for (let k = 0; k < ticks; k++) {
      const i = Math.round((k / Math.max(1, ticks - 1)) * (n - 1));
      const d = cur[i];
      const t = svgEl('text', { x: x(i), y: H - 6, 'text-anchor': k === 0 ? 'start' : k === ticks - 1 ? 'end' : 'middle' });
      t.textContent = hourly ? d.toLocaleTimeString('en-US', { hour: 'numeric' }) : fmtDay(d);
      axis.append(t);
    }
    svg.append(grid, svgEl('line', { class: 'baseline', x1: pl, x2: W - pr, y1: y(0), y2: y(0) }), axis);
    const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    svg.append(svgEl('path', { class: 'line-prev', d: path(b) }));
    svg.append(svgEl('path', { class: 'area', d: `${path(a)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z` }));
    svg.append(svgEl('path', { class: 'line', d: path(a) }));
    if (n <= 60) a.forEach((v, i) => { if (v && n <= 31) svg.append(svgEl('circle', { class: 'dot', cx: x(i), cy: y(v), r: 3 })); });
    const cross = svgEl('line', { class: 'cross', y1: pt, y2: pt + ih, visibility: 'hidden' });
    const hot = svgEl('circle', { class: 'dot', r: 5, visibility: 'hidden' });
    svg.append(cross, hot);
    const hit = svgEl('rect', { x: pl, y: pt, width: iw, height: ih, fill: 'transparent', tabindex: 0 });
    svg.append(hit);
    const at = (i: number, cx: number, cy: number) => {
      cross.setAttribute('x1', String(x(i))); cross.setAttribute('x2', String(x(i))); cross.setAttribute('visibility', 'visible');
      hot.setAttribute('cx', String(x(i))); hot.setAttribute('cy', String(y(a[i]))); hot.setAttribute('visibility', 'visible');
      const label = (d: Date) => (hourly ? `${fmtDay(d)}, ${d.toLocaleTimeString('en-US', { hour: 'numeric' })}` : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
      const name = words.name;
      showTip(cx, cy, label(cur[i]), [
        { color: cssVar('--series'), value: nf.format(a[i]), label: name },
        { color: cssVar('--prev'), value: nf.format(b[i]), label: `${name} on ${label(prev[i])}` },
      ]);
    };
    let focusI = n - 1;
    hit.addEventListener('pointermove', (e) => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      focusI = Math.max(0, Math.min(n - 1, Math.round(((px - pl) / iw) * (n - 1))));
      at(focusI, e.clientX, e.clientY);
    });
    const off = () => { hideTip(); cross.setAttribute('visibility', 'hidden'); hot.setAttribute('visibility', 'hidden'); };
    hit.addEventListener('pointerleave', off);
    hit.addEventListener('blur', off);
    hit.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      focusI = Math.max(0, Math.min(n - 1, focusI + (e.key === 'ArrowRight' ? 1 : -1)));
      const rect = svg.getBoundingClientRect();
      at(focusI, rect.left + (x(focusI) / W) * rect.width, rect.top + (y(a[focusI]) / H) * rect.height);
    });
    host.append(svg);
  }

  // ---- GitHub profile views, which the site filters never touch
  function github(r: Report, from: Date, to: Date, prevLabel: string) {
    const g = r.github;
    const m = state.ghMetric;
    const { current: c, previous: p } = g.summary;
    $('gh-tiles').replaceChildren(
      tile({ label: 'Profile views', value: compactOr(c.views), delta: pct(c.views, p.views), good: true }, prevLabel),
      tile({ label: 'Viewers', value: compactOr(c.visitors), delta: pct(c.visitors, p.visitors), good: true }, prevLabel),
    );
    const since = g.firstHit ? new Date(g.firstHit) : null;
    line($('gh-trend'), $('gh-legend'), g.series, m, r.range.hourly, from, to, {
      name: m === 'visitors' ? 'viewers' : 'profile views',
      title: m === 'visitors' ? 'GitHub profile viewers' : 'GitHub profile views',
      empty: since ? 'No profile views in this range.' : 'Counting starts with the next visit to github.com/hummusonrails.',
    });
  }

  // ---- week over week and month over month
  function growth(kind: 'weeks' | 'months', pts: Point[], soFar: Point) {
    const m = state.metric;
    const now = day0(new Date());
    const periods: Date[] = [];
    if (kind === 'weeks') {
      const monday = addDays(now, -((now.getDay() + 6) % 7));
      for (let i = 12; i >= 0; i--) periods.push(addDays(monday, -7 * i));
    } else {
      for (let i = 12; i >= 0; i--) periods.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    const idx = new Map(pts.map((p) => [p.t, p]));
    const rows = periods.map((d) => ({ d, v: idx.get(ymd(d)) || { t: ymd(d), visitors: 0, views: 0 } }));
    const name = (d: Date) => kind === 'weeks' ? `Week of ${fmtDay(d)}` : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const short = (d: Date) => kind === 'weeks' ? fmtDay(d) : d.toLocaleDateString('en-US', { month: 'short' });

    // columns
    const host = $(kind);
    host.replaceChildren();
    const W = host.clientWidth, H = host.clientHeight;
    const pl = 36, pr = 4, pt = 8, pb = 22, iw = W - pl - pr, ih = H - pt - pb;
    const vals = rows.map((r) => r.v[m]);
    const max = niceMax(Math.max(1, ...vals));
    const y = (v: number) => pt + ih - (v / max) * ih;
    const band = iw / rows.length;
    const bw = Math.min(24, band - 4);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${m} by ${kind === 'weeks' ? 'week' : 'month'}` });
    const grid = svgEl('g', { class: 'grid' }), axis = svgEl('g', { class: 'axis' });
    for (let k = 1; k <= 2; k++) {
      grid.append(svgEl('line', { x1: pl, x2: W - pr, y1: y((max / 2) * k), y2: y((max / 2) * k) }));
    }
    for (let k = 0; k <= 2; k++) {
      const t = svgEl('text', { x: pl - 6, y: y((max / 2) * k) + 4, 'text-anchor': 'end' }); t.textContent = compact.format((max / 2) * k); axis.append(t);
    }
    svg.append(grid, svgEl('line', { class: 'baseline', x1: pl, x2: W - pr, y1: y(0), y2: y(0) }), axis);
    rows.forEach((r, i) => {
      const cx = pl + band * i + band / 2;
      const v = r.v[m];
      const h = Math.max(0, y(0) - y(v));
      const last = i === rows.length - 1;
      if (h > 0) {
        const r4 = Math.min(4, h, bw / 2);
        const x0 = cx - bw / 2, y0 = y(v);
        const d = `M${x0},${y(0)}V${y0 + r4}Q${x0},${y0} ${x0 + r4},${y0}H${x0 + bw - r4}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r4}V${y(0)}Z`;
        svg.append(svgEl('path', { class: `col${last ? ' dim' : ''}`, d }));
      }
      if (i % Math.ceil(rows.length / Math.max(1, Math.floor(iw / 56))) === 0 || last) {
        const t = svgEl('text', { x: cx, y: H - 5, 'text-anchor': last ? 'end' : 'middle' }); t.textContent = short(r.d); axis.append(t);
      }
      const hit = svgEl('rect', { x: pl + band * i, y: pt, width: band, height: ih, fill: 'transparent' });
      hit.addEventListener('pointermove', (e) => {
        const unit = kind === 'weeks' ? 'week' : 'month';
        const prevV = last ? soFar[m] : i ? rows[i - 1].v[m] : null;
        const ch = prevV === null ? null : pct(v, prevV);
        showTip(e.clientX, e.clientY, `${name(r.d)}${last ? ' (so far)' : ''}`, [
          { color: cssVar('--series'), value: nf.format(v), label: m === 'visitors' ? 'visitors' : 'page views' },
          ...(ch === null ? [] : [{ value: signed(ch), label: last ? `vs same point last ${unit}` : `vs ${unit} before` }]),
        ]);
      });
      hit.addEventListener('pointerleave', hideTip);
      svg.append(hit);
    });
    host.append(svg);

    // table, newest first
    const table = el('table', 'growth');
    const head = el('tr');
    for (const h of [kind === 'weeks' ? 'Week' : 'Month', 'Visitors', 'Change', 'Page views', 'Change']) head.append(el('th', '', h));
    const thead = el('thead');
    thead.append(head);
    table.append(thead);
    const body = el('tbody');
    [...rows].reverse().forEach((r, j) => {
      const i = rows.length - 1 - j;
      const prevR = j === 0 ? soFar : i ? rows[i - 1].v : null;
      const tr = el('tr', j === 0 ? 'current' : '');
      const td = el('td', '', name(r.d));
      if (j === 0) td.append(el('span', 'so-far', `so far, vs same point last ${kind === 'weeks' ? 'week' : 'month'}`));
      tr.append(td);
      for (const k of ['visitors', 'views'] as const) {
        tr.append(el('td', '', nf.format(r.v[k])));
        const c = prevR ? pct(r.v[k], prevR[k]) : null;
        tr.append(el('td', c === null ? '' : c > 0 ? 'up' : c < 0 ? 'down' : '', c === null ? (prevR && r.v[k] ? 'new' : '') : signed(c)));
      }
      body.append(tr);
    });
    table.append(body);
    $(`${kind}-table`).replaceChildren(table);
  }

  // ---- ranked lists
  type Col = { label: string; value: (r: Row) => string };
  type ListDef = {
    rows: (r: Report) => Row[];
    filter?: string | ((row: Row) => Record<string, string>);
    label: (row: Row) => string;
    sub?: (row: Row) => string;
    href?: (row: Row) => string | null;
    cols?: Col[];
    title?: (row: Row) => string;
    empty?: string;
  };
  // A visit row from the report's source and landing page lists.
  const landed = (x: Row) => [x.campaign, `→ ${x.landing}`].filter(Boolean).join(' · ');
  const visitFilter = (x: Row) => ({
    ...(x.refHost ? { ref: String(x.refHost) } : { source: String(x.source) }),
    ...(x.campaign ? { campaign: String(x.campaign) } : {}),
  });
  const views = (label: string): Col => ({ label, value: (r) => nf.format(r.views) });
  const visitorsCol: Col = { label: 'Visitors', value: (r) => nf.format(r.visitors) };
  const LISTS: Record<string, ListDef> = {
    channels: { rows: (r) => r.channels as Row[], filter: 'channel', label: (x) => x.key },
    referrers: {
      rows: (r) => r.referrers as Row[], filter: 'ref', label: (x) => x.key, sub: (x) => String(x.channel || ''),
      href: (x) => (/\./.test(x.key) ? `https://${x.key}` : null),
    },
    referrerUrls: {
      rows: (r) => r.referrerUrls as Row[], label: (x) => x.key, sub: landed, filter: visitFilter,
      href: (x) => (x.link ? webHref(String(x.link)) : null),
    },
    campaigns: {
      rows: (r) => (r.campaigns as Row[]).map((c) => ({ ...c, key: `${c.source} / ${c.medium} / ${c.campaign}` })),
      filter: (x) => Object.fromEntries((['source', 'medium', 'campaign'] as const).map((k) => [k, String(x[k])])),
      label: (x) => x.key,
    },
    source: { rows: (r) => (r.utm as Record<string, Row[]>).source, filter: 'source', label: (x) => x.key },
    medium: { rows: (r) => (r.utm as Record<string, Row[]>).medium, filter: 'medium', label: (x) => x.key },
    campaign: { rows: (r) => (r.utm as Record<string, Row[]>).campaign, filter: 'campaign', label: (x) => x.key },
    content: { rows: (r) => (r.utm as Record<string, Row[]>).content, filter: 'content', label: (x) => x.key },
    term: { rows: (r) => (r.utm as Record<string, Row[]>).term, filter: 'term', label: (x) => x.key },
    countries: {
      rows: (r) => r.countries as Row[], filter: 'country',
      label: (x) => (x.key === '(none)' ? 'Unknown' : `${flag(x.key)}  ${country(x.key)}`),
    },
    regions: {
      rows: (r) => r.regions as Row[], filter: 'region',
      label: (x) => `${flag(String(x.country || ''))}  ${x.key}`, sub: (x) => (x.country ? country(String(x.country)) : ''),
    },
    cities: {
      rows: (r) => r.cities as Row[], filter: 'city',
      label: (x) => `${flag(String(x.country || ''))}  ${x.key}`,
      sub: (x) => [x.region, x.country ? country(String(x.country)) : ''].filter(Boolean).join(', '),
    },
    pages: {
      rows: (r) => r.pages as Row[], filter: 'page', label: (x) => x.key, title: (x) => String(x.title || ''),
      href: (x) => pageHref(x.key), cols: [visitorsCol, views('Views'), { label: 'Time', value: (r) => dur(Number(r.engaged_ms || 0)) }],
    },
    entries: {
      rows: (r) => (r.entries as Row[]).map((e) => ({ ...e, views: e.visitors })), filter: 'page', label: (x) => x.key,
      href: (x) => pageHref(x.key), cols: [{ label: 'Entrances', value: (r) => nf.format(r.visitors) }],
    },
    outbound: {
      rows: (r) => r.outbound as Row[], label: (x) => x.key,
      href: (x) => (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(x.key) ? `https://${x.key}` : null), cols: [visitorsCol, views('Clicks')],
    },
    aiVisits: {
      rows: (r) => (r.ai as Record<string, Row[]>).visits, label: (x) => x.key, sub: landed, filter: visitFilter,
      empty: 'No visits from AI assistants in this range. ChatGPT tags its links with utm_source=chatgpt.com; others send their domain.',
    },
    devices: { rows: (r) => r.devices as Row[], filter: 'device', label: (x) => x.key },
    browsers: { rows: (r) => r.browsers as Row[], filter: 'browser', label: (x) => x.key },
    os: { rows: (r) => r.os as Row[], filter: 'os', label: (x) => x.key },
    languages: {
      rows: (r) => r.languages as Row[], filter: 'lang',
      label: (x) => (x.key === '(none)' ? 'Unknown' : `${language(x.key)} (${x.key})`),
    },
  };
  const expanded = new Set<string>();

  function list(panel: HTMLElement, r: Report) {
    const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const name = state.tabs[panel.dataset.panel!] || tabs[0].dataset.tab!;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    const def = LISTS[name];
    const rows = def.rows(r) || [];
    const body = panel.querySelector<HTMLElement>('[data-body]')!;
    body.replaceChildren();
    if (!rows.length) {
      const hint = def.empty ?? (name === 'campaigns' || LISTS[name] === LISTS.source || ['medium', 'campaign', 'content', 'term'].includes(name)
        ? 'No tagged visits in this range. Add ?utm_source=…&utm_medium=…&utm_campaign=… to links you share.'
        : 'Nothing here for this range yet.');
      body.append(el('div', 'empty', hint));
      return;
    }
    const cols = def.cols || [visitorsCol, views('Views')];
    const shown = expanded.has(name) ? rows : rows.slice(0, 10);
    const top = Math.max(...rows.map((x) => x.visitors), 1);
    const table = el('table', 'rows');
    const head = el('tr');
    head.append(el('th', '', ''));
    for (const c of cols) head.append(el('th', 'num', c.label));
    const thead = el('thead');
    thead.append(head);
    table.append(thead);
    const tb = el('tbody');
    for (const row of shown) {
      const tr = el('tr');
      const key = el('td', 'key');
      const bar = el('span', 'bar');
      bar.style.width = `${(row.visitors / top) * 100}%`;
      const label = def.label(row);
      const href = def.href?.(row);
      let lab: HTMLElement;
      if (href) {
        lab = el('a', 'label', label) as HTMLAnchorElement;
        (lab as HTMLAnchorElement).href = href;
        (lab as HTMLAnchorElement).target = '_blank';
        (lab as HTMLAnchorElement).rel = 'noopener noreferrer';
        lab.addEventListener('click', (e) => e.stopPropagation());
      } else lab = el('span', 'label', label);
      key.append(bar, lab);
      const sub = def.sub?.(row);
      if (sub) key.append(el('span', 'sub', sub));
      key.title = [label, def.title?.(row)].filter(Boolean).join('\n');
      tr.append(key);
      for (const c of cols) tr.append(el('td', 'num', c.value(row)));
      if (def.filter) {
        tr.tabIndex = 0;
        const apply = () => {
          const add = typeof def.filter === 'string' ? { [def.filter]: row.key } : def.filter!(row);
          Object.assign(state.filters, add);
          load();
        };
        tr.addEventListener('click', apply);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
        tr.setAttribute('aria-label', `Filter by ${label}`);
      } else tr.className = 'static';
      tb.append(tr);
    }
    table.append(tb);
    body.append(table);

    const foot = el('div', 'list-foot');
    if (rows.length > 10) {
      const more = el('button', '', expanded.has(name) ? 'Show top 10' : `Show all ${rows.length}`) as HTMLButtonElement;
      more.type = 'button';
      more.addEventListener('click', () => { if (expanded.has(name)) expanded.delete(name); else expanded.add(name); list(panel, r); });
      foot.append(more);
    } else foot.append(el('span'));
    const csv = el('button', '', 'Download CSV') as HTMLButtonElement;
    csv.type = 'button';
    csv.addEventListener('click', () => {
      const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const detail = def.sub ? [q('Detail')] : [];
      const lines = [[q('Item'), ...detail, ...cols.map((c) => q(c.label))].join(',')];
      for (const row of rows) {
        const sub = def.sub ? [q(def.sub(row))] : [];
        lines.push([q(def.label(row).trim()), ...sub, ...cols.map((c) => q(c.value(row)))].join(','));
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
      a.download = `bengreenberg-${name}-${ymd(new Date())}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    foot.append(csv);
    body.append(foot);
  }

  // ---- map (loaded on demand, it carries the world outline)
  let drawMap: ((host: HTMLElement, rows: Row[], hooks: MapHooks) => void) | null = null;
  type MapHooks = { tip: typeof showTip; hide: () => void; pick: (cc: string) => void; name: (cc: string) => string };
  async function map(rows: Row[]) {
    if (!drawMap) drawMap = (await import('./desk-map')).drawMap;
    if (disposed) return;
    drawMap($('map'), rows, {
      tip: showTip, hide: hideTip, name: country,
      pick: (cc) => { state.filters.country = cc; load(); },
    });
  }

  // ---- controls
  function chips() {
    const host = $('chips');
    host.replaceChildren();
    for (const [k, v] of Object.entries(state.filters)) {
      const c = el('span', 'chip');
      c.append(document.createTextNode(`${FILTER_LABEL[k]}: `));
      c.append(el('b', '', k === 'country' && v !== '(none)' ? country(v) : v));
      const x = el('button', '', '×') as HTMLButtonElement;
      x.type = 'button';
      x.setAttribute('aria-label', `Remove filter ${FILTER_LABEL[k]}`);
      x.addEventListener('click', () => { delete state.filters[k]; load(); });
      c.append(x);
      host.append(c);
    }
  }

  function controls() {
    document.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.range === state.range)));
    document.querySelectorAll<HTMLButtonElement>('[data-metric]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.metric === state.metric)));
    document.querySelectorAll<HTMLButtonElement>('[data-gh-metric]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ghMetric === state.ghMetric)));
    $('custom').hidden = state.range !== 'custom';
  }

  document.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((b) => b.addEventListener('click', () => {
    state.range = b.dataset.range!;
    if (state.range === 'custom') {
      const fromI = $<HTMLInputElement>('from'), toI = $<HTMLInputElement>('to');
      if (!fromI.value) fromI.value = ymd(addDays(day0(new Date()), -29));
      if (!toI.value) toI.value = ymd(new Date());
      fromI.max = toI.max = ymd(new Date());
      fromI.min = toI.min = ymd(EPOCH);
      controls();
      return;
    }
    load();
  }));
  $('apply').addEventListener('click', () => {
    const f = $<HTMLInputElement>('from').value, t = $<HTMLInputElement>('to').value;
    if (!f || !t) return;
    state.from = f <= t ? f : t;
    state.to = f <= t ? t : f;
    load();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-metric]').forEach((b) => b.addEventListener('click', () => {
    state.metric = b.dataset.metric as 'visitors' | 'views';
    writeHash();
    controls();
    if (last) draw(last.r, last.from, last.to);
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-gh-metric]').forEach((b) => b.addEventListener('click', () => {
    state.ghMetric = b.dataset.ghMetric as 'visitors' | 'views';
    writeHash();
    controls();
    if (last) draw(last.r, last.from, last.to);
  }));
  document.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
    panel.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((t) => t.addEventListener('click', () => {
      state.tabs[panel.dataset.panel!] = t.dataset.tab!;
      if (last) list(panel, last.r);
    }));
  });

  // ---- load and draw
  let last: { r: Report; from: Date; to: Date } | null = null;
  let seq = 0;
  let disposed = false;

  function draw(r: Report, from: Date, to: Date) {
    const prevLabel = state.range === 'today' ? 'yesterday' : state.range === 'yesterday' ? 'the day before' : 'the previous period';
    tiles(r.summary.current, r.summary.previous, prevLabel);
    trend(r, from, to);
    github(r, from, to, prevLabel);
    growth('weeks', r.growth.weeks, r.growth.weekToDate);
    growth('months', r.growth.months, r.growth.monthToDate);
    document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => list(p, r));
    map((r.countries as Row[]).filter((c) => c.key !== '(none)'));
    $('live-n').textContent = nf.format(r.live);
    const notice = $('notice');
    if (!r.firstHit) {
      notice.hidden = false;
      notice.textContent = 'Tracking is live. The first visits will show up here within seconds of someone opening bengreenberg.dev.';
    } else {
      notice.hidden = true;
      EPOCH = day0(new Date(r.firstHit));
    }
  }

  async function load(quiet = false) {
    writeHash();
    controls();
    chips();
    const { from, to, label } = window_();
    $('range-label').textContent = label;
    const n0 = shiftDays(from, to);
    const p = new URLSearchParams({
      from: from.toISOString(), to: to.toISOString(), tz,
      pfrom: back(from, n0).toISOString(), pto: back(to, n0).toISOString(),
    });
    for (const [k, v] of Object.entries(state.filters)) p.set(k, v);
    const mine = ++seq;
    if (!quiet) board.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch(`/api/admin/analytics?${p}`, { credentials: 'same-origin', cache: 'no-store' });
      if (res.status === 401) { location.reload(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const r = (await res.json()) as Report;
      if (mine !== seq || disposed) return;
      last = { r, from, to };
      draw(r, from, to);
    } catch (err) {
      if (mine !== seq) return;
      const notice = $('notice');
      notice.hidden = false;
      notice.textContent = `Could not load the numbers (${(err as Error).message}). Retrying in a minute.`;
    } finally {
      if (mine === seq) board.setAttribute('aria-busy', 'false');
    }
  }

  let resizeT = 0;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => { if (last) draw(last.r, last.from, last.to); }, 150);
  };
  const onHash = () => { readHash(); load(); };
  const onVisible = () => { if (document.visibilityState === 'visible') load(true); };
  addEventListener('resize', onResize);
  addEventListener('hashchange', onHash);
  // Refresh every 5 minutes while visible: each refresh is ~30 queries on Turso.
  const tick = setInterval(onVisible, 5 * 60_000);
  document.addEventListener('visibilitychange', onVisible);

  readHash();
  load();

  return () => {
    disposed = true;
    clearTimeout(resizeT);
    clearInterval(tick);
    removeEventListener('resize', onResize);
    removeEventListener('hashchange', onHash);
    document.removeEventListener('visibilitychange', onVisible);
    hideTip();
  };
}

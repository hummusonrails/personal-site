// World choropleth for the analytics desk: visitors per country on one green ramp.
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import countries from 'i18n-iso-countries';
import world from 'world-atlas/countries-110m.json';
import type { Topology, GeometryCollection } from 'topojson-specification';

type Row = { key: string; visitors: number; views: number };
type Hooks = {
  tip: (x: number, y: number, title: string, rows: { color?: string; value: string; label: string }[]) => void;
  hide: () => void;
  pick: (cc: string) => void;
  name: (cc: string) => string;
};

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const shapes = feature(topo, topo.objects.countries).features.filter((f) => f.properties?.name !== 'Antarctica');
const STEPS = 6;
const nf = new Intl.NumberFormat('en-US');

export function drawMap(host: HTMLElement, rows: Row[], hooks: Hooks) {
  const byNumeric = new Map<string, Row>();
  for (const r of rows) {
    const n = countries.alpha2ToNumeric(r.key);
    if (n) byNumeric.set(n, r);
  }
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  // Square-root steps: small countries stay visible without one leader washing everyone else out.
  const step = (v: number) => (v <= 0 ? 0 : Math.max(1, Math.ceil(Math.sqrt(v / max) * STEPS)));

  const W = host.clientWidth || 600;
  const H = Math.round(W / 1.9);
  const projection = geoEqualEarth().fitExtent([[4, 4], [W - 4, H - 4]], { type: 'FeatureCollection', features: shapes });
  const path = geoPath(projection);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  for (const f of shapes) {
    const id = String(f.id).padStart(3, '0');
    const row = byNumeric.get(id);
    const alpha2 = countries.numericToAlpha2(id) || '';
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path(f) || '');
    p.setAttribute('fill', `var(--seq-${row ? step(row.visitors) : 0})`);
    const label = alpha2 ? hooks.name(alpha2) : f.properties?.name || '';
    p.addEventListener('pointermove', (e) => hooks.tip(e.clientX, e.clientY, label, [
      { value: nf.format(row?.visitors || 0), label: 'visitors' },
      { value: nf.format(row?.views || 0), label: 'page views' },
    ]));
    p.addEventListener('pointerleave', hooks.hide);
    if (row && alpha2) {
      p.style.cursor = 'pointer';
      p.addEventListener('click', () => { hooks.hide(); hooks.pick(alpha2); });
    }
    svg.append(p);
  }

  const key = document.createElement('div');
  key.className = 'map-key';
  key.append(document.createTextNode('Fewer'));
  for (let i = 1; i <= STEPS; i++) {
    const sw = document.createElement('i');
    sw.style.background = `var(--seq-${i})`;
    key.append(sw);
  }
  key.append(document.createTextNode(`More (top: ${nf.format(max)} visitors)`));
  host.replaceChildren(svg, key);
}

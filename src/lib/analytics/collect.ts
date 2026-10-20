// First-party, cookieless hit collector. The visitor id is a hash of a secret
// salt, the UTC day, IP and user agent, so it changes every day and cannot be
// reversed or followed across days. Ported from the Kindled desk.
import { createHash, randomUUID } from "node:crypto";
import { browser, channel, cleanHost, device, isBot, os } from "./classify";

export const SITE_HOSTS = new Set(["bengreenberg.dev", "www.bengreenberg.dev"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KINDS = new Set(["pv", "eng", "out"]);
const MAX_ENGAGED_MS = 30 * 60 * 1000;
// The owner's own pages are never counted.
const PRIVATE_PATH = /^\/admin(\/|$)/;

export interface HitRow {
  id: string;
  ts: number;
  kind: string;
  visitor: string;
  path: string;
  title: string | null;
  target: string | null;
  referrer: string | null;
  refHost: string | null;
  channel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  lang: string | null;
}

export type ParsedHit =
  | { type: "insert"; row: HitRow }
  | { type: "engage"; id: string; visitor: string; engagedMs: number };

export interface HitInput {
  body: string;
  headers: Headers;
  now: Date;
  salt: string;
}

const cut = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

function header(headers: Headers, k: string) {
  const v = headers.get(k);
  if (!v) return null;
  try {
    return decodeURIComponent(v).slice(0, 80);
  } catch {
    return v.slice(0, 80);
  }
}

export function visitorId(salt: string, ip: string, ua: string, now: Date) {
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("base64url").slice(0, 22);
}

/** Validates one beacon and turns it into a row to insert or an engagement update. Null means drop it. */
export function parseHit({ body: text, headers, now, salt }: HitInput): ParsedHit | null {
  const ua = headers.get("user-agent") || "";
  if (isBot(ua)) return null;
  // Only our own pages may post: browsers send Origin (or Sec-Fetch-Site) on
  // every beacon, so a request with neither did not come from one.
  const origin = headers.get("origin");
  if (origin ? !SITE_HOSTS.has(origin.replace(/^https?:\/\//, "")) : headers.get("sec-fetch-site") !== "same-origin") return null;

  if (text.length > 4000) return null;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;

  const kind = String(body.k || "");
  const id = String(body.id || "");
  if (!KINDS.has(kind) || !UUID.test(id)) return null;

  let page: URL;
  try {
    page = new URL(String(body.u || ""));
  } catch {
    return null;
  }
  if (!SITE_HOSTS.has(page.hostname) || PRIVATE_PATH.test(page.pathname)) return null;

  const ip = (headers.get("x-forwarded-for") || "").split(",")[0].trim() || headers.get("x-real-ip") || "";
  const visitor = visitorId(salt, ip, ua, now);

  if (kind === "eng") {
    const ms = Math.round(Number(body.e));
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return { type: "engage", id, visitor, engagedMs: Math.min(ms, MAX_ENGAGED_MS) };
  }

  // The tracker sends the query string the visit landed with, so every page
  // of a visit is credited to the campaign it arrived from.
  const landing = typeof body.q === "string" && body.q.startsWith("?") ? body.q.slice(0, 1000) : null;
  const q = landing ? new URLSearchParams(landing) : page.searchParams;
  const utm = (k: string) => cut(q.get(`utm_${k}`), 120);
  const utmSource = utm("source") || cut(q.get("ref") || q.get("source"), 120);
  const utmMedium = utm("medium");

  const isPv = kind === "pv";
  let referrer = isPv ? cut(body.r, 500) : null;
  let refHost: string | null = null;
  if (referrer) {
    try {
      const r = new URL(referrer);
      if (/^https?:$/.test(r.protocol) && !SITE_HOSTS.has(r.hostname)) refHost = cleanHost(r.hostname);
      // Android apps send their package as the referrer (android-app://com.google.android.gm/).
      else if (r.protocol === "android-app:") refHost = (r.hostname || r.pathname.replace(/^\/\//, "").split("/")[0]).slice(0, 120) || null;
    } catch {
      // not a URL
    }
    // Only web addresses are kept whole; anything else could be a script link.
    if (!refHost || !/^https?:\/\//i.test(referrer)) referrer = null;
  }

  let path = page.pathname;
  try {
    path = decodeURI(path);
  } catch {
    // keep it encoded
  }

  return {
    type: "insert",
    row: {
      id: isPv ? id : randomUUID(),
      ts: now.getTime(),
      kind,
      visitor,
      path: path.slice(0, 300),
      title: cut(body.ti, 200),
      target: cut(body.x, 300),
      referrer,
      refHost,
      channel: isPv ? channel(refHost, utmSource, utmMedium) : "Event",
      utmSource,
      utmMedium,
      utmCampaign: utm("campaign"),
      utmContent: utm("content"),
      utmTerm: utm("term"),
      country: header(headers, "x-vercel-ip-country"),
      region: header(headers, "x-vercel-ip-country-region"),
      city: header(headers, "x-vercel-ip-city"),
      device: device(ua),
      browser: browser(ua),
      os: os(ua),
      lang: cut((headers.get("accept-language") || "").split(",")[0], 20),
    },
  };
}

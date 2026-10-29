// greenberg.md analytics (table profile_hits). Every request is recorded on
// the server, because the agents and terminals that read the Markdown never
// run JavaScript. The HTML page adds time on page and outbound clicks through
// /api/profile-beacon. Cookieless, with the same daily visitor hash as the site.
import { randomUUID } from "node:crypto";
import { analyticsDb } from "./db";
import { visitorId } from "./collect";
import { channel, cleanHost, device, browser, os } from "./classify";
import { allowedBeacon } from "./limit";
import { IGNORED_READER, reader } from "./readers";
import { PROFILE_HOSTS } from "../../data/profile";

export type ProfileFormat = "md" | "html" | "llms" | "robots";
const MAX_ENGAGED_MS = 30 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const salt = () => import.meta.env.ANALYTICS_SALT || process.env.ANALYTICS_SALT;
const cut = (v: string | null | undefined, n: number) => (v && v.trim() ? v.trim().slice(0, n) : null);

function header(headers: Headers, ...keys: string[]) {
  for (const k of keys) {
    const v = headers.get(k);
    if (!v) continue;
    try {
      return decodeURIComponent(v).slice(0, 80);
    } catch {
      return v.slice(0, 80);
    }
  }
  return null;
}

// Cloudflare sits in front when the domain is proxied; then its headers name
// the visitor and Vercel's name Cloudflare.
export const clientIp = (h: Headers) =>
  h.get("cf-connecting-ip") || (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";

/** Records one request to greenberg.md. Never throws. */
export async function recordProfileView(request: Request, url: URL, id: string, format: ProfileFormat) {
  try {
    const db = analyticsDb();
    const s = salt();
    const h = request.headers;
    const ua = h.get("user-agent") || "";
    if (!db || !s || IGNORED_READER.test(ua)) return;
    const ip = clientIp(h);
    const now = new Date();
    if (!allowedBeacon(`gm:${ip}`, now.getTime())) return;

    const who = reader(ua);
    const person = who.kind === "Person";
    let referrer = cut(h.get("referer"), 500);
    let refHost: string | null = null;
    if (referrer) {
      try {
        const r = new URL(referrer);
        if (/^https?:$/.test(r.protocol) && !PROFILE_HOSTS.has(r.hostname)) refHost = cleanHost(r.hostname);
      } catch {
        // not a URL
      }
      if (!refHost) referrer = null;
    }
    const q = url.searchParams;
    const utmSource = cut(q.get("utm_source") || q.get("ref") || q.get("source"), 120);
    const utmMedium = cut(q.get("utm_medium"), 120);

    await db.execute({
      sql: `INSERT INTO profile_hits (id, ts, kind, visitor, format, reader, reader_kind, ua, referrer, ref_host, channel,
              utm_source, utm_medium, utm_campaign, country, region, city, device, browser, os, lang)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      args: [
        id, now.getTime(), format === "robots" ? "robots" : "view", visitorId(s, ip, ua, now), format, who.name, who.kind,
        cut(ua, 300), referrer, refHost, channel(refHost, utmSource, utmMedium), utmSource, utmMedium,
        cut(q.get("utm_campaign"), 120),
        header(h, "cf-ipcountry", "x-vercel-ip-country"), header(h, "cf-region-code", "x-vercel-ip-country-region"),
        header(h, "cf-ipcity", "x-vercel-ip-city"),
        person ? device(ua) : null, person ? browser(ua) : null, person ? os(ua) : null,
        cut((h.get("accept-language") || "").split(",")[0], 20),
      ],
    });
  } catch (err) {
    console.error("greenberg.md hit failed", err);
  }
}

/**
 * The HTML page's beacon: time on page ('eng'), a followed link ('out'), or
 * 'drop' from a browser marked as Ben's, which takes its view back out.
 */
export async function recordProfileBeacon(request: Request) {
  const db = analyticsDb();
  const s = salt();
  const h = request.headers;
  const ua = h.get("user-agent") || "";
  const origin = h.get("origin");
  if (!db || !s) return;
  if (origin ? !PROFILE_HOSTS.has(origin.replace(/^https?:\/\//, "")) : h.get("sec-fetch-site") !== "same-origin") return;
  const ip = clientIp(h);
  const now = new Date();
  if (!allowedBeacon(`gm:${ip}`, now.getTime())) return;

  const text = await request.text();
  if (text.length > 2000) return;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return;
  }
  const id = String(body.id || "");
  if (!UUID.test(id)) return;
  const visitor = visitorId(s, ip, ua, now);

  if (body.k === "eng") {
    const ms = Math.round(Number(body.e));
    if (!Number.isFinite(ms) || ms <= 0) return;
    await db.execute({
      sql: "UPDATE profile_hits SET engaged_ms = ? WHERE id = ? AND visitor = ? AND kind = 'view'",
      args: [Math.min(ms, MAX_ENGAGED_MS), id, visitor],
    });
  } else if (body.k === "drop") {
    await db.execute({ sql: "DELETE FROM profile_hits WHERE id = ? AND visitor = ?", args: [id, visitor] });
  } else if (body.k === "out") {
    const target = cut(String(body.x || ""), 300);
    if (!target) return;
    const who = reader(ua);
    await db.execute({
      sql: `INSERT INTO profile_hits (id, ts, kind, visitor, format, reader, reader_kind, target, channel, country, device, browser, os)
            VALUES (?, ?, 'out', ?, 'html', ?, ?, ?, 'Event', ?, ?, ?, ?)`,
      args: [randomUUID(), now.getTime(), visitor, who.name, who.kind, target,
        header(h, "cf-ipcountry", "x-vercel-ip-country"), device(ua), browser(ua), os(ua)],
    });
  }
}

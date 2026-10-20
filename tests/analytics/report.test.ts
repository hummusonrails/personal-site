/**
 * The desk's numbers, computed by real SQL against an in-memory SQLite
 * database built from the same migration as production.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { report, type Runner } from "@/lib/analytics/report";

let client: Client;
const run: Runner = async (sql, args) => (await client.execute({ sql, args })).rows as unknown as Record<string, unknown>[];

const NOW = new Date("2026-10-18T22:30:00Z"); // Monday 01:30 in Jerusalem
let n = 0;
function hit(over: Record<string, unknown>) {
  n += 1;
  return {
    id: `h${n}`, ts: NOW.getTime() - 3600_000, kind: "pv", visitor: "v1", path: "/", title: null, target: null,
    referrer: null, ref_host: null, channel: "Direct", utm_source: null, utm_medium: null, utm_campaign: null,
    utm_content: null, utm_term: null, country: "US", region: "NY", city: "New York", device: "Desktop",
    browser: "Chrome", os: "macOS", lang: "en-US", engaged_ms: null, ...over,
  };
}

beforeAll(async () => {
  client = createClient({ url: ":memory:" });
  await client.executeMultiple(readFileSync("db/analytics.sql", "utf8"));
  const at = (iso: string) => Date.parse(iso);
  const rows = [
    // Today in Jerusalem (from 2026-10-18T21:00Z): v1 reads two pages, v2 lands from Reddit and leaves.
    hit({ ts: at("2026-10-18T21:10:00Z"), visitor: "v1", path: "/", engaged_ms: 10_000 }),
    hit({ ts: at("2026-10-18T21:20:00Z"), visitor: "v1", path: "/partners", engaged_ms: 30_000 }),
    hit({ ts: at("2026-10-18T22:05:00Z"), visitor: "v2", path: "/partners", ref_host: "reddit.com", referrer: "https://www.reddit.com/r/SaaS/", channel: "Social", country: "CA", region: "ON", city: "Toronto" }),
    // v2 clicks through to GitHub.
    hit({ ts: at("2026-10-18T22:06:00Z"), visitor: "v2", path: "/partners", kind: "out", target: "github.com/hummusonrails", channel: "Event" }),
    // Yesterday in Jerusalem.
    hit({ ts: at("2026-10-18T10:00:00Z"), visitor: "g1", path: "/faq" }),
    // Last month.
    hit({ ts: at("2026-09-10T10:00:00Z"), visitor: "g2", path: "/", utm_source: "newsletter", utm_medium: "email", channel: "Email" }),
  ];
  for (const r of rows) {
    const cols = Object.keys(r);
    await client.execute({ sql: `INSERT INTO analytics_hits (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, args: Object.values(r) as never[] });
  }
});

const TODAY = { from: new Date("2026-10-18T21:00:00Z"), to: NOW, prevFrom: new Date("2026-10-17T21:00:00Z"), prevTo: new Date("2026-10-18T21:00:00Z") };
const q = (over: Partial<Parameters<typeof report>[0]> = {}) =>
  report({ ...TODAY, tz: "Asia/Jerusalem", hourly: true, filters: {}, now: NOW, ...over }, run);

describe("report", () => {
  it("summarizes visitors, views, single-page visits and time on page", async () => {
    const r = await q();
    expect(r.summary.current).toEqual({ visitors: 2, views: 3, bounces: 1, engaged_ms: 20_000 });
  });

  it("compares with the previous period", async () => {
    const r = await q();
    expect(r.summary.previous).toMatchObject({ visitors: 1, views: 1 });
  });

  it("buckets the series by local hour", async () => {
    const r = await q();
    expect(r.series.current).toEqual([
      { t: "2026-10-19T00", visitors: 1, views: 2 },
      { t: "2026-10-19T01", visitors: 1, views: 1 },
    ]);
  });

  it("buckets by local day for longer ranges", async () => {
    const r = await q({ from: new Date("2026-10-11T21:00:00Z"), prevFrom: new Date("2026-10-04T21:00:00Z"), prevTo: new Date("2026-10-11T21:00:00Z"), hourly: false });
    expect(r.series.current).toEqual([
      { t: "2026-10-18T00", visitors: 1, views: 1 },
      { t: "2026-10-19T00", visitors: 2, views: 3 },
    ]);
  });

  it("ranks pages, landing pages, sources and places", async () => {
    const r = await q();
    expect(r.pages[0]).toMatchObject({ key: "/partners", visitors: 2, views: 2 });
    expect(r.entries).toEqual(expect.arrayContaining([{ key: "/", visitors: 1 }, { key: "/partners", visitors: 1 }]));
    expect(r.referrers).toEqual([expect.objectContaining({ key: "reddit.com", channel: "Social", visitors: 1 })]);
    expect(r.channels.map((c) => c.key).sort()).toEqual(["Direct", "Social"]);
    expect(r.countries.map((c) => c.key).sort()).toEqual(["CA", "US"]);
    expect(r.cities[0]).toMatchObject({ key: expect.any(String), country: expect.any(String) });
  });

  it("lists outbound clicks", async () => {
    const r = await q();
    expect(r.outbound).toEqual([{ key: "github.com/hummusonrails", visitors: 1, views: 1 }]);
  });

  it("applies filters to every panel", async () => {
    const r = await q({ filters: { country: "CA" } });
    expect(r.summary.current).toMatchObject({ visitors: 1, views: 1 });
    expect(r.pages.map((p) => p.key)).toEqual(["/partners"]);
  });

  it("filters on a missing value with (none)", async () => {
    const r = await q({ filters: { ref: "(none)" } });
    expect(r.summary.current).toMatchObject({ visitors: 1, views: 2 });
  });

  it("ignores unknown filter keys", async () => {
    const r = await q({ filters: { "1=1; drop table analytics_hits": "x" } });
    expect(r.summary.current.views).toBe(3);
  });

  it("builds week-over-week and month-over-month from local Mondays and month starts", async () => {
    const r = await q();
    expect(r.growth.weeks).toEqual(
      expect.arrayContaining([
        { t: "2026-10-19", visitors: 2, views: 3 },
        { t: "2026-10-12", visitors: 1, views: 1 },
      ]),
    );
    expect(r.growth.months).toEqual([
      { t: "2026-09-01", visitors: 1, views: 1 },
      { t: "2026-10-01", visitors: 3, views: 4 },
    ]);
  });

  it("reports live visitors and the first hit", async () => {
    const r = await q();
    expect(r.live).toBe(1);
    expect(r.firstHit).toBe("2026-09-10T10:00:00.000Z");
  });

  it("rejects a bad time zone", async () => {
    await expect(q({ tz: "UTC'; drop" })).rejects.toThrow();
  });
});

// Where visits came from, and visits sent by AI assistants, on a database of its own
// so the numbers above stay put.
describe("report: sources and AI assistants", () => {
  let db2: Client;
  const run2: Runner = async (sql, args) => (await db2.execute({ sql, args })).rows as unknown as Record<string, unknown>[];
  const q2 = () => report({ ...TODAY, tz: "Asia/Jerusalem", hourly: true, filters: {}, now: NOW }, run2);
  const at = (iso: string) => Date.parse(iso);

  beforeAll(async () => {
    db2 = createClient({ url: ":memory:" });
    await db2.executeMultiple(readFileSync("db/analytics.sql", "utf8"));
    const rows = [
      // r1 lands on /partners from a tagged Reddit link (Reddit sends only its domain), then reads /pricing.
      hit({ ts: at("2026-10-18T21:10:00Z"), visitor: "r1", path: "/partners", referrer: "https://www.reddit.com/", ref_host: "reddit.com", utm_source: "reddit", utm_campaign: "saasbuild", channel: "Social" }),
      hit({ ts: at("2026-10-18T21:12:00Z"), visitor: "r1", path: "/pricing", referrer: "https://www.reddit.com/", ref_host: "reddit.com", utm_source: "reddit", utm_campaign: "saasbuild", channel: "Social" }),
      // h1 comes from a page that sent its full address.
      hit({ ts: at("2026-10-18T21:30:00Z"), visitor: "h1", path: "/", referrer: "https://news.ycombinator.com/item?id=42", ref_host: "news.ycombinator.com", channel: "Social" }),
      // c1 clicks a ChatGPT citation, which tags the link but sends no referrer.
      hit({ ts: at("2026-10-18T21:40:00Z"), visitor: "c1", path: "/faq", utm_source: "chatgpt.com", channel: "AI assistants" }),
    ];
    for (const r of rows) {
      const cols = Object.keys(r);
      await db2.execute({ sql: `INSERT INTO analytics_hits (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, args: Object.values(r) as never[] });
    }
  });

  it("shows each source with its campaign tag and the page the visit landed on", async () => {
    const r = await q2();
    expect(r.referrerUrls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "reddit.com", campaign: "saasbuild", landing: "/partners", link: null, visitors: 1, views: 2 }),
        expect.objectContaining({ key: "news.ycombinator.com/item?id=42", campaign: null, landing: "/", link: "https://news.ycombinator.com/item?id=42", visitors: 1, views: 1 }),
        expect.objectContaining({ key: "chatgpt.com", campaign: null, landing: "/faq", visitors: 1, views: 1 }),
      ]),
    );
    expect(r.referrerUrls).toHaveLength(3);
  });

  it("lists visits sent by AI assistants with where they landed", async () => {
    const r = await q2();
    expect(r.ai.visits).toEqual([expect.objectContaining({ key: "chatgpt.com", landing: "/faq", visitors: 1 })]);
  });
});

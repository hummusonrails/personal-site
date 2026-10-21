// Every number the analytics desk shows, computed from analytics_hits for one
// date range and one set of filters. Ported from the Kindled desk (SQLite on
// Turso): time zones are applied with offset segments (see tz.ts).
import { VALID_TZ, localSql, offsetSegments, shiftLocal, zonedStart } from "./tz";

export type Row = Record<string, unknown>;
/** Runs one SQL statement with positional `?` arguments. */
export type Runner = (sql: string, args: (string | number)[]) => Promise<Row[]>;

// Filter keys the desk may send, mapped to the only columns they can touch.
export const FILTERS: Record<string, string> = {
  page: "path", ref: "ref_host", channel: "channel", country: "country", region: "region", city: "city",
  source: "utm_source", medium: "utm_medium", campaign: "utm_campaign", content: "utm_content", term: "utm_term",
  device: "device", browser: "browser", os: "os", lang: "lang",
};

export const NONE = "(none)";
/** The ref tag on every github.com/hummusonrails link to the site. */
export const GITHUB_REF = "github-profile";

export interface ReportQuery {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  tz: string;
  hourly: boolean;
  filters: Record<string, string>;
  now: Date;
}

interface Point {
  t: string;
  visitors: number;
  views: number;
}
interface Summary {
  visitors: number;
  views: number;
  bounces: number;
  engaged_ms: number;
}
type Ranked = { key: string; visitors: number; views: number } & Row;

const num = (v: unknown) => Number(v ?? 0);
const ranked = (rows: Row[]) =>
  rows.map((r) => ({ ...r, key: String(r.key), visitors: num(r.visitors), views: num(r.views) })) as Ranked[];
const points = (rows: Row[]) => rows.map((r) => ({ t: String(r.t), visitors: num(r.visitors), views: num(r.views) })) as Point[];

export async function report(q: ReportQuery, run: Runner) {
  if (!VALID_TZ.test(q.tz)) throw new Error("bad tz");
  const now = q.now.getTime();

  // Filter clause; events carry no referrer or channel, so those filters skip them.
  const filter = (events = false) => {
    const args: string[] = [];
    const conds: string[] = [];
    for (const [k, v] of Object.entries(q.filters)) {
      const col = FILTERS[k];
      if (!col || (events && (col === "channel" || col === "ref_host"))) continue;
      if (v === NONE) conds.push(`${col} IS NULL`);
      else {
        args.push(v);
        conds.push(`${col} = ?`);
      }
    }
    return { sql: conds.length ? ` AND ${conds.join(" AND ")}` : "", args };
  };
  const f = filter();
  const fe = filter(true);
  const range = (from: Date, to: Date) => [from.getTime(), to.getTime()];
  const cur = range(q.from, q.to);
  const prev = range(q.prevFrom, q.prevTo);
  const PV = `kind = 'pv' AND ts >= ? AND ts < ?${f.sql}`;
  const pvArgs = (r: number[]) => [...r, ...f.args];

  const top = (col: string, limit = 50, extra = "") =>
    run(
      `SELECT COALESCE(${col}, '${NONE}') AS key, count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM analytics_hits WHERE ${PV}${extra} GROUP BY 1 ORDER BY 2 DESC, 3 DESC LIMIT ${limit}`,
      pvArgs(cur),
    ).then(ranked);
  const given = (col: string) => top(col, 50, ` AND ${col} IS NOT NULL`);

  const summary = (r: number[]) =>
    run(
      `WITH v AS (SELECT visitor, count(*) AS views FROM analytics_hits WHERE ${PV} GROUP BY visitor)
       SELECT (SELECT count(*) FROM v) AS visitors,
              (SELECT COALESCE(sum(views), 0) FROM v) AS views,
              (SELECT count(*) FROM v WHERE views = 1) AS bounces,
              (SELECT COALESCE(round(avg(engaged_ms)), 0) FROM analytics_hits WHERE ${PV} AND engaged_ms IS NOT NULL) AS engaged_ms`,
      [...pvArgs(r), ...pvArgs(r)],
    ).then(([s]) => ({ visitors: num(s.visitors), views: num(s.views), bounces: num(s.bounces), engaged_ms: num(s.engaged_ms) }) as Summary);

  // Local time for a window: the offsets in force across it, as SQL.
  const local = (fromMs: number, toMs: number) => localSql("ts", offsetSegments(q.tz, fromMs, toMs));

  const series = (r: number[]) => {
    const l = local(r[0], r[1]);
    const fmt = q.hourly ? "%Y-%m-%dT%H" : "%Y-%m-%dT00";
    return run(
      `SELECT strftime('${fmt}', ${l.sql} / 1000, 'unixepoch') AS t, count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM analytics_hits WHERE ${PV} GROUP BY 1 ORDER BY 1`,
      [...l.args, ...pvArgs(r)],
    ).then(points);
  };

  // Growth ignores the date range on purpose: the current week or month and
  // the 12 before it, filters still applied.
  const growth = (u: "week" | "month") => {
    const start = zonedStart(q.tz, u, q.now, 12).getTime();
    const l = local(start, now + 1);
    const bucket =
      u === "week"
        ? `date(${l.sql} / 1000, 'unixepoch', '-6 days', 'weekday 1')`
        : `strftime('%Y-%m-01', ${l.sql} / 1000, 'unixepoch')`;
    return run(
      `SELECT ${bucket} AS t, count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM analytics_hits WHERE ${PV} GROUP BY 1 ORDER BY 1`,
      [...l.args, ...pvArgs([start, now + 1])],
    ).then(points);
  };

  // The previous week or month up to the same point as now, so the period in
  // progress compares fairly.
  const toDate = (u: "week" | "month") => {
    const from = zonedStart(q.tz, u, q.now, 1).getTime();
    const to = (u === "week" ? shiftLocal(q.tz, q.now, { days: -7 }) : shiftLocal(q.tz, q.now, { months: -1 })).getTime();
    return run(
      `SELECT count(DISTINCT visitor) AS visitors, count(*) AS views FROM analytics_hits WHERE ${PV}`,
      pvArgs([from, to]),
    ).then(([r]) => ({ t: "", visitors: num(r.visitors), views: num(r.views) }) as Point);
  };

  const events = (kind: string) =>
    run(
      `SELECT target AS key, count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM analytics_hits WHERE kind = '${kind}' AND ts >= ? AND ts < ?${fe.sql}
        GROUP BY target ORDER BY 3 DESC LIMIT 50`,
      [...cur, ...fe.args],
    ).then(ranked);

  // One row per source, campaign tag and landing page. Most sites send only
  // their domain as the referrer, so the landing page and tag say the rest.
  const visits = (extra = "") =>
    run(
      `WITH v AS (
         SELECT visitor, referrer, ref_host, utm_source, utm_campaign,
                first_value(path) OVER (
                  PARTITION BY visitor, COALESCE(referrer, ''), COALESCE(utm_source, ''), COALESCE(utm_campaign, '')
                  ORDER BY ts) AS landing
           FROM analytics_hits WHERE ${PV} AND (referrer IS NOT NULL OR utm_source IS NOT NULL)${extra})
       SELECT referrer, utm_source, utm_campaign, landing, max(ref_host) AS ref_host,
              count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM v GROUP BY 1, 2, 3, 4 ORDER BY 5 DESC, 6 DESC LIMIT 100`,
      pvArgs(cur),
    ).then((rows) =>
      rows.map((r) => {
        const ref = r.referrer ? String(r.referrer) : null;
        const short = ref ? ref.replace(/^https?:\/\/(www\.)?/i, "").replace(/^([^/]*)\/$/, "$1") : null;
        return {
          key: short ?? String(r.utm_source),
          link: short?.includes("/") ? ref : null,
          refHost: r.ref_host === null ? null : String(r.ref_host),
          source: r.utm_source === null ? null : String(r.utm_source),
          campaign: r.utm_campaign === null ? null : String(r.utm_campaign),
          landing: String(r.landing),
          visitors: num(r.visitors),
          views: num(r.views),
        };
      }),
    );

  // GitHub profile views (github_profile_hits): no visitor, page or source is
  // known, so the site's filters never apply. A 'viewer' hit is one browser's
  // first load of the day, so its count stands in for visitors.
  const GH = `SELECT COALESCE(sum(kind = 'viewer'), 0) AS visitors, COALESCE(sum(kind = 'view'), 0) AS views
                FROM github_profile_hits WHERE ts >= ? AND ts < ?`;
  const ghTotals = (r: number[]) =>
    run(GH, r).then(([x]) => ({ t: "", visitors: num(x.visitors), views: num(x.views) }) as Point);
  // What the viewers' browsers reported; theme comes from its own image.
  const ghBy = (col: string, kinds = "'view', 'viewer'", visitorKind = "viewer") =>
    run(
      `SELECT COALESCE(${col}, '${NONE}') AS key, COALESCE(sum(kind = '${visitorKind}'), 0) AS visitors,
              COALESCE(sum(kind = 'view'), 0) AS views
         FROM github_profile_hits WHERE ts >= ? AND ts < ? AND kind IN (${kinds}) GROUP BY 1 ORDER BY 2 DESC, 3 DESC`,
      cur,
    ).then(ranked);
  // Profile links to the site carry ref=github-profile, so these visits come
  // with everything the site records.
  const ghClicks = (r: number[]) =>
    run(
      `SELECT count(DISTINCT visitor) AS visitors, count(*) AS views FROM analytics_hits
        WHERE kind = 'pv' AND ts >= ? AND ts < ? AND utm_source = '${GITHUB_REF}'`,
      r,
    ).then(([x]) => ({ t: "", visitors: num(x.visitors), views: num(x.views) }) as Point);
  const ghSeries = (r: number[]) => {
    const l = local(r[0], r[1]);
    const fmt = q.hourly ? "%Y-%m-%dT%H" : "%Y-%m-%dT00";
    return run(
      `SELECT strftime('${fmt}', ${l.sql} / 1000, 'unixepoch') AS t, COALESCE(sum(kind = 'viewer'), 0) AS visitors,
              COALESCE(sum(kind = 'view'), 0) AS views
         FROM github_profile_hits WHERE ts >= ? AND ts < ? GROUP BY 1 ORDER BY 1`,
      [...l.args, ...r],
    ).then(points);
  };

  const iso = (v: unknown) => (v === null || v === undefined ? null : new Date(num(v)).toISOString());

  const [
    summaryCur, summaryPrev, seriesCur, seriesPrev, weeks, months, pages, entries, channels, referrers,
    referrerUrls, campaigns, source, medium, campaign, content, term, countries, regions, cities,
    devices, browsers, os, languages, outbound, live, bounds, weekToDate, monthToDate,
    aiVisits, ghCur, ghPrev, ghSeriesCur, ghSeriesPrev, ghBounds,
    ghDevices, ghScreens, ghInputs, ghDensity, ghThemes, ghClicksCur, ghClicksPrev,
  ] = await Promise.all([
    summary(cur), summary(prev), series(cur), series(prev),
    growth("week"), growth("month"),
    run(
      `SELECT path AS key, max(title) AS title, count(DISTINCT visitor) AS visitors, count(*) AS views,
              COALESCE(round(avg(engaged_ms)), 0) AS engaged_ms
         FROM analytics_hits WHERE ${PV} GROUP BY path ORDER BY 3 DESC, 4 DESC LIMIT 100`,
      pvArgs(cur),
    ).then((rows) => ranked(rows).map((r) => ({ ...r, engaged_ms: num(r.engaged_ms) }))),
    run(
      `SELECT path AS key, count(*) AS visitors FROM (
         SELECT path, row_number() OVER (PARTITION BY visitor ORDER BY ts) AS n FROM analytics_hits WHERE ${PV}) s
        WHERE n = 1 GROUP BY path ORDER BY 2 DESC LIMIT 50`,
      pvArgs(cur),
    ).then((rows) => rows.map((r) => ({ key: String(r.key), visitors: num(r.visitors) }))),
    top("channel"),
    run(
      `SELECT ref_host AS key, max(channel) AS channel, count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM analytics_hits WHERE ${PV} AND ref_host IS NOT NULL GROUP BY ref_host ORDER BY 3 DESC, 4 DESC LIMIT 100`,
      pvArgs(cur),
    ).then(ranked),
    visits(),
    run(
      `SELECT COALESCE(utm_source, '${NONE}') AS source, COALESCE(utm_medium, '${NONE}') AS medium,
              COALESCE(utm_campaign, '${NONE}') AS campaign, count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM analytics_hits WHERE ${PV} AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL)
        GROUP BY 1, 2, 3 ORDER BY 4 DESC, 5 DESC LIMIT 100`,
      pvArgs(cur),
    ).then((rows) => rows.map((r) => ({ ...r, visitors: num(r.visitors), views: num(r.views) }))),
    given("utm_source"), given("utm_medium"), given("utm_campaign"), given("utm_content"), given("utm_term"),
    top("country", 250),
    run(
      `SELECT region AS key, country, count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM analytics_hits WHERE ${PV} AND region IS NOT NULL GROUP BY country, region ORDER BY 3 DESC, 4 DESC LIMIT 100`,
      pvArgs(cur),
    ).then(ranked),
    run(
      `SELECT city AS key, country, max(region) AS region, count(DISTINCT visitor) AS visitors, count(*) AS views
         FROM analytics_hits WHERE ${PV} AND city IS NOT NULL GROUP BY country, city ORDER BY 4 DESC, 5 DESC LIMIT 100`,
      pvArgs(cur),
    ).then(ranked),
    top("device"), top("browser"), top("os"), top("lang"),
    events("out"),
    run(`SELECT count(DISTINCT visitor) AS visitors FROM analytics_hits WHERE kind = 'pv' AND ts > ?`, [now - 30 * 60_000]),
    run(`SELECT min(ts) AS first FROM analytics_hits`, []),
    toDate("week"), toDate("month"),
    visits(" AND channel = 'AI assistants'"),
    ghTotals(cur), ghTotals(prev), ghSeries(cur), ghSeries(prev),
    run(`SELECT min(ts) AS first FROM github_profile_hits`, []),
    ghBy("device"), ghBy("screen"), ghBy("input"), ghBy("density"), ghBy("theme", "'theme'", "theme"),
    ghClicks(cur), ghClicks(prev),
  ]);

  return {
    range: { from: q.from.toISOString(), to: q.to.toISOString(), hourly: q.hourly, tz: q.tz },
    firstHit: iso(bounds[0]?.first),
    live: num(live[0]?.visitors),
    summary: { current: summaryCur, previous: summaryPrev },
    series: { current: seriesCur, previous: seriesPrev },
    growth: { weeks, months, weekToDate, monthToDate },
    pages, entries, channels, referrers, referrerUrls,
    campaigns, utm: { source, medium, campaign, content, term },
    countries, regions, cities, devices, browsers, os, languages,
    outbound,
    ai: { visits: aiVisits },
    github: {
      firstHit: iso(ghBounds[0]?.first),
      summary: { current: ghCur, previous: ghPrev },
      series: { current: ghSeriesCur, previous: ghSeriesPrev },
      clicks: { current: ghClicksCur, previous: ghClicksPrev },
      devices: ghDevices, screens: ghScreens, inputs: ghInputs, density: ghDensity, themes: ghThemes,
    },
  };
}

export type Report = Awaited<ReturnType<typeof report>>;

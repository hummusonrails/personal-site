// Time zone math for the analytics desk. Turso is SQLite, which has no time
// zones, so the report shifts each timestamp by the viewer's UTC offset, split
// into segments at clock changes, before bucketing by local hour, day, week or
// month.

/** IANA names only (Asia/Jerusalem, America/Argentina/Buenos_Aires, UTC). */
export const VALID_TZ = /^[A-Za-z]+(?:[/_+-][A-Za-z0-9]+)*$/;

const formatters = new Map<string, Intl.DateTimeFormat>();
function parts(tz: string, at: Date) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(at)) if (x.type !== "literal") p[x.type] = Number(x.value);
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** The zone's offset from UTC at an instant, in milliseconds (New York in summer: -4h). */
export function offsetMs(tz: string, at: Date): number {
  const p = parts(tz, at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

export interface Segment {
  /** First instant (epoch ms) that no longer uses this offset; null for the last segment. */
  until: number | null;
  offset: number;
}

/** The offsets in force between two instants, split exactly at each clock change. */
export function offsetSegments(tz: string, fromMs: number, toMs: number): Segment[] {
  const at = (ms: number) => offsetMs(tz, new Date(ms));
  const out: Segment[] = [];
  let cur = at(fromMs);
  const DAY = 86400_000;
  for (let t = fromMs; t < toMs; t += DAY) {
    const next = Math.min(t + DAY, toMs);
    if (at(next) === cur) continue;
    // Bisect to the exact millisecond the offset changes. Bisecting on raw
    // milliseconds always shrinks the gap, whatever the alignment of the ends.
    let lo = t;
    let hi = next;
    while (hi - lo > 1) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (at(mid) === cur) lo = mid;
      else hi = mid;
    }
    out.push({ until: hi, offset: cur });
    cur = at(hi);
  }
  out.push({ until: null, offset: cur });
  return out;
}

/** The UTC instant of a local wall-clock time, correct across clock changes. */
function fromLocal(tz: string, y: number, mo: number, d: number, h = 0, mi = 0, s = 0): Date {
  const wall = Date.UTC(y, mo, d, h, mi, s);
  let guess = wall - offsetMs(tz, new Date(wall));
  guess = wall - offsetMs(tz, new Date(guess));
  return new Date(guess);
}

/** Start of the local day, Monday-based week or month containing `now`, moved back `back` units. */
export function zonedStart(tz: string, unit: "day" | "week" | "month", now: Date, back = 0): Date {
  const p = parts(tz, now);
  if (unit === "month") return fromLocal(tz, p.year, p.month - 1 - back, 1);
  let day = p.day;
  if (unit === "week") {
    const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0 = Sunday
    day -= (weekday + 6) % 7;
  }
  return fromLocal(tz, p.year, p.month - 1, day - (unit === "week" ? 7 : 1) * back);
}

/** The same local wall-clock time some days or months away. */
export function shiftLocal(tz: string, at: Date, by: { days?: number; months?: number }): Date {
  const p = parts(tz, at);
  let day = p.day;
  if (by.months) {
    // Clamp to the target month's length, so Mar 31 minus a month is Feb 28.
    const last = new Date(Date.UTC(p.year, p.month - 1 + by.months + 1, 0)).getUTCDate();
    day = Math.min(day, last);
  }
  return fromLocal(tz, p.year, p.month - 1 + (by.months || 0), day + (by.days || 0), p.hour, p.minute, p.second);
}

/** SQL that turns an epoch-ms column into local epoch ms, plus its bound values. */
export function localSql(col: string, segments: Segment[]): { sql: string; args: number[] } {
  if (segments.length === 1) return { sql: `(${col} + ?)`, args: [segments[0].offset] };
  const args: number[] = [];
  let sql = `(${col} + CASE`;
  for (const s of segments) {
    if (s.until === null) {
      sql += " ELSE ?";
      args.push(s.offset);
    } else {
      sql += ` WHEN ${col} < ? THEN ?`;
      args.push(s.until, s.offset);
    }
  }
  return { sql: `${sql} END)`, args };
}

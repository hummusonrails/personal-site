import { describe, it, expect } from "vitest";
import { offsetMs, offsetSegments, zonedStart, shiftLocal, VALID_TZ } from "@/lib/analytics/tz";

const H = 3600_000;

describe("offsetMs", () => {
  it("reads summer and winter offsets", () => {
    expect(offsetMs("America/New_York", new Date("2026-07-01T12:00:00Z"))).toBe(-4 * H);
    expect(offsetMs("America/New_York", new Date("2026-12-01T12:00:00Z"))).toBe(-5 * H);
    expect(offsetMs("UTC", new Date("2026-07-01T12:00:00Z"))).toBe(0);
  });
});

describe("offsetSegments", () => {
  it("is one segment when no clock change falls in the range", () => {
    const from = Date.parse("2026-07-01T00:00:00Z");
    expect(offsetSegments("America/New_York", from, from + 10 * 86400_000)).toEqual([{ until: null, offset: -4 * H }]);
  });
  it("splits at the November clock change to the exact instant", () => {
    // US clocks fall back at 2026-11-01 06:00 UTC.
    const segs = offsetSegments("America/New_York", Date.parse("2026-10-20T00:00:00Z"), Date.parse("2026-11-10T00:00:00Z"));
    expect(segs).toEqual([
      { until: Date.parse("2026-11-01T06:00:00Z"), offset: -4 * H },
      { until: null, offset: -5 * H },
    ]);
  });

  it("finishes when the range ends seconds after a clock change or starts off the minute", () => {
    const change = Date.parse("2026-11-01T06:00:00Z");
    expect(offsetSegments("America/New_York", Date.parse("2026-10-20T00:00:17.123Z"), change + 30_000)).toEqual([
      { until: change, offset: -4 * H },
      { until: null, offset: -5 * H },
    ]);
  });
});

describe("zonedStart", () => {
  const now = new Date("2026-10-18T22:30:00Z"); // Monday 01:30 in Jerusalem (UTC+3)
  it("finds local midnight", () => {
    expect(zonedStart("Asia/Jerusalem", "day", now).toISOString()).toBe("2026-10-18T21:00:00.000Z");
  });
  it("finds the local Monday of the week, and weeks before it", () => {
    expect(zonedStart("Asia/Jerusalem", "week", now).toISOString()).toBe("2026-10-18T21:00:00.000Z");
    expect(zonedStart("Asia/Jerusalem", "week", now, 1).toISOString()).toBe("2026-10-11T21:00:00.000Z");
    expect(zonedStart("America/New_York", "week", now).toISOString()).toBe("2026-10-12T04:00:00.000Z");
  });
  it("finds the first of the month, and months before it", () => {
    expect(zonedStart("UTC", "month", now).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(zonedStart("UTC", "month", now, 12).toISOString()).toBe("2025-10-01T00:00:00.000Z");
  });
});

describe("shiftLocal", () => {
  it("lands on the last day of a shorter month instead of spilling into the next", () => {
    expect(shiftLocal("UTC", new Date("2026-03-31T15:00:00Z"), { months: -1 }).toISOString()).toBe("2026-02-28T15:00:00.000Z");
  });
  it("moves back one local month keeping the wall-clock time", () => {
    expect(shiftLocal("UTC", new Date("2026-10-18T15:00:00Z"), { months: -1 }).toISOString()).toBe("2026-09-18T15:00:00.000Z");
  });
});

describe("VALID_TZ", () => {
  it("accepts IANA names and rejects SQL", () => {
    expect(VALID_TZ.test("America/Argentina/Buenos_Aires")).toBe(true);
    expect(VALID_TZ.test("UTC'; drop table x")).toBe(false);
  });
});

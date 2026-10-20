import { describe, it, expect } from "vitest";
import { parseHit, visitorId } from "@/lib/analytics/collect";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const ID = "0b7e3c1a-5f3e-4c2a-9d61-1f2e3d4c5b6a";
const NOW = new Date("2026-10-18T15:00:00Z");

function req(body: unknown, headers: Record<string, string> = {}) {
  return {
    body: JSON.stringify(body),
    headers: new Headers({
      "user-agent": UA,
      "x-forwarded-for": "203.0.113.5, 10.0.0.1",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "NY",
      "x-vercel-ip-city": "New%20York",
      "accept-language": "en-US,en;q=0.9",
      origin: "https://www.bengreenberg.dev",
      ...headers,
    }),
    now: NOW,
    salt: "test-salt",
  };
}

describe("parseHit", () => {
  it("turns a page view into a stored row with location, device and channel", () => {
    const out = parseHit(
      req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/partners?utm_source=reddit&utm_medium=social", r: "https://www.reddit.com/r/SaaS/", ti: "Partners" }),
    );
    expect(out).toMatchObject({
      type: "insert",
      row: {
        id: ID,
        ts: NOW.getTime(),
        kind: "pv",
        path: "/partners",
        title: "Partners",
        referrer: "https://www.reddit.com/r/SaaS/",
        refHost: "reddit.com",
        channel: "Social",
        utmSource: "reddit",
        utmMedium: "social",
        country: "US",
        region: "NY",
        city: "New York",
        device: "Desktop",
        browser: "Chrome",
        os: "macOS",
        lang: "en-US",
      },
    });
  });

  it("never stores a referrer that is not a web address", () => {
    const out = parseHit(req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/", r: "javascript:fetch('/api/admin')" }));
    expect(out).toMatchObject({ type: "insert", row: { referrer: null, refHost: null } });
  });

  it("keeps only the app name for an Android app referrer", () => {
    const out = parseHit(req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/", r: "android-app://com.google.android.gm/" }));
    expect(out).toMatchObject({ type: "insert", row: { referrer: null, refHost: "com.google.android.gm" } });
  });

  it("credits later pages of a visit to the source the visit arrived from", () => {
    const out = parseHit(
      req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/faq", r: "https://www.reddit.com/r/SaaS/", q: "?utm_source=reddit&utm_campaign=fall" }),
    );
    expect(out).toMatchObject({
      type: "insert",
      row: { path: "/faq", refHost: "reddit.com", utmSource: "reddit", utmCampaign: "fall", channel: "Social" },
    });
  });

  it("accepts a same-origin request that sends no Origin header", () => {
    const out = parseHit(req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/" }, { origin: "", "sec-fetch-site": "same-origin" }));
    expect(out?.type).toBe("insert");
  });

  it("drops a referrer from our own site", () => {
    const out = parseHit(req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/faq", r: "https://www.bengreenberg.dev/" }));
    expect(out).toMatchObject({ type: "insert", row: { referrer: null, refHost: null, channel: "Direct" } });
  });

  it("turns an engagement ping into an update capped at 30 minutes", () => {
    const out = parseHit(req({ k: "eng", id: ID, u: "https://www.bengreenberg.dev/", e: 99 * 60_000 }));
    expect(out).toEqual({ type: "engage", id: ID, visitor: expect.any(String), engagedMs: 30 * 60_000 });
  });

  it("stores an outbound click as its own event row", () => {
    const out = parseHit(req({ k: "out", id: ID, u: "https://www.bengreenberg.dev/partners", x: "github.com/hummusonrails" }));
    expect(out).toMatchObject({ type: "insert", row: { kind: "out", target: "github.com/hummusonrails", channel: "Event" } });
    if (out?.type === "insert") expect(out.row.id).not.toBe(ID);
  });

  it.each([
    ["a bot", req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/" }, { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" })],
    ["another site's page", req({ k: "pv", id: ID, u: "https://evil.example/" })],
    ["a foreign origin", req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/" }, { origin: "https://evil.example" })],
    ["an unknown kind", req({ k: "zz", id: ID, u: "https://www.bengreenberg.dev/" })],
    ["a bad id", req({ k: "pv", id: "nope", u: "https://www.bengreenberg.dev/" })],
    ["a request from outside a browser", req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/" }, { origin: "" })],
    ["the admin area", req({ k: "pv", id: ID, u: "https://www.bengreenberg.dev/admin/analytics" })],
  ])("ignores %s", (_name, input) => {
    expect(parseHit(input)).toBeNull();
  });

  it("ignores a body that is not JSON or is too large", () => {
    expect(parseHit({ ...req({}), body: "not json" })).toBeNull();
    expect(parseHit({ ...req({}), body: "x".repeat(5000) })).toBeNull();
  });
});

describe("visitorId", () => {
  it("is stable within a day and changes the next day", () => {
    const a = visitorId("salt", "203.0.113.5", UA, new Date("2026-10-18T01:00:00Z"));
    const b = visitorId("salt", "203.0.113.5", UA, new Date("2026-10-18T23:00:00Z"));
    const c = visitorId("salt", "203.0.113.5", UA, new Date("2026-10-19T01:00:00Z"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(22);
  });
});

import { describe, it, expect } from "vitest";
import { shouldTrack, outboundTarget, visitSource } from "@/scripts/analytics/track";

const base = { host: "www.bengreenberg.dev", path: "/", ignored: false, webdriver: false };

describe("shouldTrack", () => {
  it("tracks real visitors on the live site", () => {
    expect(shouldTrack(base)).toBe(true);
    expect(shouldTrack({ ...base, host: "bengreenberg.dev", path: "/partners" })).toBe(true);
  });
  it.each([
    ["local development", { host: "localhost" }],
    ["preview deployments", { host: "personal-site-git-main.vercel.app" }],
    ["the owner's browser", { ignored: true }],
    ["automated browsers", { webdriver: true }],
    ["the admin area", { path: "/admin/analytics" }],
  ])("skips %s", (_n, over) => {
    expect(shouldTrack({ ...base, ...over })).toBe(false);
  });
});

describe("outboundTarget", () => {
  it("names a link to another site by host and path", () => {
    expect(outboundTarget("https://github.com/hummusonrails?x=1", "https://www.bengreenberg.dev/partners")).toBe(
      "github.com/hummusonrails",
    );
    expect(outboundTarget("mailto:ben@yalladevrel.com", "https://www.bengreenberg.dev/")).toBe("mailto:ben@yalladevrel.com");
  });
  it("ignores links within the site", () => {
    expect(outboundTarget("/pricing", "https://www.bengreenberg.dev/")).toBeNull();
    expect(outboundTarget("https://www.bengreenberg.dev/faq", "https://www.bengreenberg.dev/")).toBeNull();
  });
});

describe("visitSource", () => {
  const host = "www.bengreenberg.dev";
  it("starts a visit from an outside referrer, keeping its landing query", () => {
    expect(visitSource(null, { referrer: "https://www.reddit.com/r/SaaS/", search: "?utm_source=reddit", host })).toEqual({
      r: "https://www.reddit.com/r/SaaS/",
      q: "?utm_source=reddit",
    });
  });
  it("keeps the visit's source while moving between our own pages", () => {
    const stored = { r: "https://www.reddit.com/", q: "?utm_source=reddit" };
    expect(visitSource(stored, { referrer: "https://www.bengreenberg.dev/partners", search: "", host })).toEqual(stored);
  });
  it("starts a new source when a tagged link is opened mid-visit", () => {
    const stored = { r: "https://www.reddit.com/", q: "" };
    expect(visitSource(stored, { referrer: "https://www.bengreenberg.dev/", search: "?utm_source=newsletter", host })).toEqual({
      r: "",
      q: "?utm_source=newsletter",
    });
  });
  it("is direct when there is no referrer and nothing stored", () => {
    expect(visitSource(null, { referrer: "", search: "", host })).toEqual({ r: "", q: "" });
  });
});

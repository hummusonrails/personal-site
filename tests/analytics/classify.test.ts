import { describe, it, expect } from "vitest";
import { browser, channel, cleanHost, device, isBot, os } from "@/lib/analytics/classify";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const WIN_EDGE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0";

describe("isBot", () => {
  it("drops crawlers, link previews and empty agents", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)")).toBe(true);
    expect(isBot("")).toBe(true);
  });
  it("keeps real browsers", () => {
    expect(isBot(IPHONE)).toBe(false);
    expect(isBot(MAC_CHROME)).toBe(false);
  });
});

describe("device, browser, os", () => {
  it("reads an iPhone as mobile Safari on iOS", () => {
    expect([device(IPHONE), browser(IPHONE), os(IPHONE)]).toEqual(["Mobile", "Safari", "iOS"]);
  });
  it("reads Edge before Chrome", () => {
    expect([device(WIN_EDGE), browser(WIN_EDGE), os(WIN_EDGE)]).toEqual(["Desktop", "Edge", "Windows"]);
  });
  it("reads desktop Chrome on macOS", () => {
    expect([browser(MAC_CHROME), os(MAC_CHROME)]).toEqual(["Chrome", "macOS"]);
  });
});

describe("channel", () => {
  it("lets an explicit email medium win over the referrer", () => {
    expect(channel("google.com", "newsletter", "email")).toBe("Email");
  });
  it("sorts referrers into search, AI, social and plain referral", () => {
    expect(channel("google.com", null, null)).toBe("Search");
    expect(channel("chatgpt.com", null, null)).toBe("AI assistants");
    expect(channel("reddit.com", null, null)).toBe("Social");
    expect(channel("affiliatelandscape.com", null, null)).toBe("Referral");
  });
  it("falls back to Direct", () => {
    expect(channel(null, null, null)).toBe("Direct");
  });
});

describe("cleanHost", () => {
  it("strips www and mobile prefixes", () => {
    expect(cleanHost("www.Reddit.com")).toBe("reddit.com");
    expect(cleanHost("m.facebook.com")).toBe("facebook.com");
  });
});

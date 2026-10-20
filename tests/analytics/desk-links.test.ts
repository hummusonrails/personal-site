import { describe, it, expect } from "vitest";
import { webHref, pageHref } from "@/scripts/analytics/desk-links";

describe("webHref", () => {
  it("links only http and https addresses", () => {
    expect(webHref("https://www.reddit.com/r/SaaS/")).toBe("https://www.reddit.com/r/SaaS/");
    expect(webHref("javascript:alert(1)")).toBeNull();
    expect(webHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(webHref("data:text/html,x")).toBeNull();
  });
});

describe("pageHref", () => {
  it("links a path on our own site", () => {
    expect(pageHref("/partners")).toBe("/partners");
  });
  it("refuses protocol-relative and other-site paths", () => {
    expect(pageHref("//evil.example/x")).toBeNull();
    expect(pageHref("/\\evil.example")).toBeNull();
    expect(pageHref("javascript:alert(1)")).toBeNull();
  });
});

#!/usr/bin/env node

/**
 * Fetch dev.to articles authored by @bengreenberg and convert them
 * to Astro blog content collection markdown files.
 *
 * Usage:
 *   node scripts/fetch-devto-articles.mjs
 *
 * Uses the public Forem API (no auth required for published articles).
 *
 * Dedup strategy (the site predates this importer, so overlap is heavy):
 *   1. Skip articles published before SINCE (importer is forward-looking;
 *      override with DEVTO_SINCE=YYYY-MM-DD for a backfill run)
 *   2. Skip articles whose canonical URL points back at this site
 *      (they originated here and were cross-posted TO dev.to)
 *   3. Skip articles whose canonical or dev.to URL already appears as a
 *      canonicalUrl in an existing post
 *   4. Skip articles whose slugified title matches an existing post file
 *      (older cross-posts carry no dev.to identifier in frontmatter)
 *   5. Skip articles whose title is fuzzy-similar to an existing post —
 *      the same piece is often cross-posted to X and dev.to under
 *      slightly different titles, so exact matching is not enough
 *
 * Also skips status-like shares (dev.to items whose "title" is a whole
 * paragraph) — those are not blog articles.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEVTO_USERNAME = "bengreenberg";
const SITE_HOSTS = new Set(["bengreenberg.dev", "www.bengreenberg.dev"]);
const SINCE = process.env.DEVTO_SINCE || "2026-07-16";
const BLOG_DIR = new URL("../src/content/blog", import.meta.url).pathname;
const TAGS_DIR = new URL("../src/content/tags", import.meta.url).pathname;
const API_BASE = "https://dev.to/api";

// Tags to auto-assign based on keyword matching in title only
// (same rules as fetch-x-articles.mjs)
const TAG_RULES = [
  { tag: "ai", keywords: ["claude", "openai", "llm", "gpt", "vibe cod", "ai ", "agent"] },
  { tag: "blockchain", keywords: ["arbitrum", "ethereum", "dapp", "smart contract", "web3", "x402", "solidity", "stylus"] },
  { tag: "career", keywords: ["hiring", "career", "candidates", "developer who doesn"] },
  { tag: "devrel", keywords: ["devrel", "developer relations", "developer advocacy"] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Status-like shares have paragraph-length "titles"; real article titles
// on this account max out well under this
const MAX_TITLE_LENGTH = 140;
const MAX_SLUG_LENGTH = 80;
// Minimum Jaccard similarity between title token sets to treat two posts
// as the same piece cross-posted under a different title
const FUZZY_TITLE_THRESHOLD = 0.6;

function slugify(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  const cut = slug.slice(0, MAX_SLUG_LENGTH);
  return cut.slice(0, cut.lastIndexOf("-")).replace(/-+$/, "") || cut;
}

function titleTokens(slugOrTitle) {
  return new Set(slugify(slugOrTitle).split("-").filter(Boolean));
}

// Find an existing post whose title tokens overlap enough to be the same
// piece under a different name. Differing numeric tokens veto the match so
// "Part 2" is never mistaken for an already-imported "Part 1".
function findSimilarExisting(title, existingSlugs) {
  const tokens = titleTokens(title);
  if (tokens.size === 0) return null;
  for (const slug of existingSlugs) {
    const other = titleTokens(slug);
    if (other.size === 0) continue;
    const intersection = [...tokens].filter((t) => other.has(t));
    const unionSize = tokens.size + other.size - intersection.length;
    if (intersection.length / unionSize < FUZZY_TITLE_THRESHOLD) continue;
    const diff = [
      ...[...tokens].filter((t) => !other.has(t)),
      ...[...other].filter((t) => !tokens.has(t)),
    ];
    if (diff.some((t) => /^\d+$/.test(t))) continue;
    return slug;
  }
  return null;
}

function getSiteTags() {
  const tags = new Set();
  if (!existsSync(TAGS_DIR)) return tags;
  for (const file of readdirSync(TAGS_DIR)) {
    if (file.endsWith(".md")) tags.add(file.replace(/\.md$/, ""));
  }
  return tags;
}

function detectTags(article, siteTags) {
  const matched = new Set();

  // dev.to tags that map directly onto an existing site tag
  for (const t of article.tag_list || []) {
    if (siteTags.has(t)) matched.add(t);
  }

  // keyword rules on the title, same approach as the X importer
  const text = article.title.toLowerCase();
  for (const rule of TAG_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) matched.add(rule.tag);
  }

  return matched.size > 0 ? [...matched] : ["posts"];
}

function parseDate(timestamp) {
  return new Date(timestamp).toISOString().split("T")[0];
}

function canonicalHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// dev.to body cleanup
// ---------------------------------------------------------------------------

function stripEmbeddedFrontmatter(body) {
  // Articles written in dev.to's v1 editor embed frontmatter in body_markdown
  const match = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return match ? body.slice(match[0].length) : body;
}

function convertLiquidTags(body) {
  return (
    body
      // {% embed url %} / {% link url %} → plain markdown link
      .replace(/{%\s*(?:embed|link)\s+(\S+?)\s*%}/g, "[$1]($1)")
      // {% youtube ID %} → watch link (IDs never contain a slash; full URLs pass through)
      .replace(/{%\s*youtube\s+(\S+?)\s*%}/g, (_, id) =>
        id.includes("/")
          ? `[${id}](${id})`
          : `[Watch on YouTube](https://www.youtube.com/watch?v=${id})`
      )
      // {% github owner/repo %} → repo link
      .replace(/{%\s*github\s+(\S+?)\s*%}/g, (_, ref) =>
        ref.startsWith("http")
          ? `[${ref}](${ref})`
          : `[github.com/${ref}](https://github.com/${ref})`
      )
      // any other liquid tag: keep an embedded URL if present, else drop
      .replace(/{%\s*\w+\s+(\S*?)\s*%}/g, (full, arg) =>
        /^https?:\/\//.test(arg) ? `[${arg}](${arg})` : ""
      )
  );
}

function cleanBody(body, title) {
  let out = stripEmbeddedFrontmatter(body.replace(/\r\n/g, "\n")).trim();
  out = convertLiquidTags(out);

  // Strip a leading H1 that duplicates the title
  const firstLine = out.split("\n")[0].trim();
  if (firstLine === `# ${title}` || firstLine === title) {
    out = out.slice(out.indexOf("\n") + 1).trimStart();
  }

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

function buildFrontmatter(article, siteTags) {
  const tags = detectTags(article, siteTags);
  const tagYaml = tags
    .map((t) => `  - slug: ${t}\n    collection: tags`)
    .join("\n");
  const date = parseDate(article.published_timestamp);
  const summary = (article.description || "").replace(/\s+/g, " ").trim();
  const truncSummary =
    summary.length > 200 ? summary.slice(0, 197) + "..." : summary;

  let fm = `---
title: "${article.title.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"
date: '${date}'
summary: >-
  ${truncSummary}
tags:
${tagYaml}
authors:
  - default
canonicalUrl: '${article.canonical_url || article.url}'`;

  if (article.cover_image) {
    fm += `\nimages: '${article.cover_image}'`;
  }

  fm += "\n---";
  return fm;
}

// ---------------------------------------------------------------------------
// Existing-content lookups (dedup sources)
// ---------------------------------------------------------------------------

function getExistingCanonicalUrls() {
  const urls = new Set();
  if (!existsSync(BLOG_DIR)) return urls;
  for (const file of readdirSync(BLOG_DIR)) {
    if (!file.endsWith(".md")) continue;
    const content = readFileSync(join(BLOG_DIR, file), "utf-8");
    const match = content.match(/canonicalUrl:\s*['"]?(https?:\/\/[^\s'"]+)/);
    if (match) urls.add(match[1].replace(/\/+$/, ""));
  }
  return urls;
}

function getExistingSlugs() {
  const slugs = new Set();
  if (!existsSync(BLOG_DIR)) return slugs;
  for (const file of readdirSync(BLOG_DIR)) {
    if (file.endsWith(".md")) {
      slugs.add(file.replace(/\.md$/, ""));
    }
  }
  return slugs;
}

// ---------------------------------------------------------------------------
// dev.to API
// ---------------------------------------------------------------------------

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "bengreenberg.dev article importer" },
  });
  if (!res.ok) {
    throw new Error(`dev.to API ${res.status} for ${url}`);
  }
  return res.json();
}

async function fetchArticleList() {
  console.log(`Fetching articles by @${DEVTO_USERNAME} from dev.to...`);
  return fetchJson(
    `${API_BASE}/articles?username=${DEVTO_USERNAME}&per_page=1000`
  );
}

async function fetchArticleFull(id) {
  return fetchJson(`${API_BASE}/articles/${id}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const articles = await fetchArticleList();
  console.log(`Found ${articles.length} published articles (importing those from ${SINCE} onward)`);

  const existingUrls = getExistingCanonicalUrls();
  const existingSlugs = getExistingSlugs();
  const siteTags = getSiteTags();

  let imported = 0;
  for (const article of articles) {
    if (parseDate(article.published_timestamp) < SINCE) continue;

    // Normalize: status-like shares embed newlines in the "title"
    article.title = article.title.replace(/\s+/g, " ").trim();

    const canonical = (article.canonical_url || article.url).replace(/\/+$/, "");
    const devtoUrl = article.url.replace(/\/+$/, "");

    if (article.title.length > MAX_TITLE_LENGTH) {
      console.log(`  SKIP (status-like share, not an article): ${article.title.slice(0, 60)}...`);
      continue;
    }
    if (SITE_HOSTS.has(canonicalHost(canonical))) {
      console.log(`  SKIP (originated on site): ${article.title}`);
      continue;
    }
    if (existingUrls.has(canonical) || existingUrls.has(devtoUrl)) {
      console.log(`  SKIP (canonical already imported): ${article.title}`);
      continue;
    }
    const slug = slugify(article.title) || article.slug;
    if (existingSlugs.has(slug)) {
      console.log(`  SKIP (matching post already exists): ${article.title}`);
      continue;
    }
    const similar = findSimilarExisting(article.title, existingSlugs);
    if (similar) {
      console.log(`  SKIP (similar to existing post "${similar}"): ${article.title}`);
      continue;
    }

    console.log(`  Fetching content: ${article.title}...`);
    const full = await fetchArticleFull(article.id);

    if (!full.body_markdown?.trim()) {
      console.log(`  WARN: Empty body for "${article.title}", skipping`);
      continue;
    }

    const body = cleanBody(full.body_markdown, article.title);
    const frontmatter = buildFrontmatter(article, siteTags);
    const md = `${frontmatter}\n\n${body}\n`;

    const filePath = join(BLOG_DIR, `${slug}.md`);
    writeFileSync(filePath, md, "utf-8");
    existingSlugs.add(slug);
    existingUrls.add(canonical);
    imported++;
    console.log(`  WROTE: ${filePath}`);
  }

  console.log(`\nDone. Imported ${imported} new article(s).`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

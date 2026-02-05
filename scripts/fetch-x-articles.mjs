#!/usr/bin/env node

/**
 * Fetch X articles authored by @hummusonrails and convert them
 * to Astro blog content collection markdown files.
 *
 * Usage:
 *   node scripts/fetch-x-articles.mjs
 *
 * Requires:
 *   - Bird CLI installed globally: npm i -g @steipete/bird
 *   - Auth via env vars AUTH_TOKEN and CT0, or browser cookies
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const X_HANDLE = "hummusonrails";
const BLOG_DIR = new URL("../src/content/blog", import.meta.url).pathname;
const TWEET_COUNT = 200;

// Tags to auto-assign based on keyword matching in title only (not body,
// to avoid false positives from incidental mentions)
const TAG_RULES = [
  { tag: "ai", keywords: ["claude", "openai", "llm", "gpt", "vibe cod", "ai "] },
  { tag: "blockchain", keywords: ["arbitrum", "ethereum", "dapp", "smart contract", "web3", "x402", "solidity", "stylus"] },
  { tag: "career", keywords: ["hiring", "career", "candidates", "developer who doesn"] },
  { tag: "devrel", keywords: ["devrel", "developer relations", "developer advocacy"] },
];

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function detectTags(title) {
  const text = title.toLowerCase();
  const matched = TAG_RULES.filter((rule) =>
    rule.keywords.some((kw) => text.includes(kw))
  ).map((rule) => rule.tag);

  const tags = [...new Set(matched)];
  return tags.length > 0 ? tags : ["posts"];
}

function parseDate(twitterDate) {
  // "Thu Feb 05 09:03:12 +0000 2026" -> "2026-02-05"
  const d = new Date(twitterDate);
  return d.toISOString().split("T")[0];
}

function buildFrontmatter(article) {
  const tags = detectTags(article.title);
  const tagYaml = tags
    .map((t) => `  - slug: ${t}\n    collection: tags`)
    .join("\n");
  const date = parseDate(article.createdAt);
  const summary = article.previewText || article.text.split("\n\n")[1] || "";
  // Truncate summary to ~200 chars
  const truncSummary =
    summary.length > 200 ? summary.slice(0, 197) + "..." : summary;
  const canonicalUrl = `https://x.com/${X_HANDLE}/article/${article.id}`;

  let fm = `---
title: "${article.title.replace(/"/g, '\\"')}"
date: '${date}'
summary: >-
  ${truncSummary.replace(/\n/g, " ")}
tags:
${tagYaml}
authors:
  - default
canonicalUrl: '${canonicalUrl}'`;

  if (article.coverImage) {
    fm += `\nimages: '${article.coverImage}'`;
  }

  fm += "\n---";
  return fm;
}

function articleToMarkdown(article) {
  const frontmatter = buildFrontmatter(article);
  // The text from Bird already has the title as first line — strip it
  let body = article.text;
  const firstNewline = body.indexOf("\n");
  if (firstNewline !== -1) {
    const firstLine = body.slice(0, firstNewline).trim();
    if (firstLine === article.title) {
      body = body.slice(firstNewline + 1).trimStart();
    }
  }

  return `${frontmatter}\n\n${body}\n`;
}

function getExistingCanonicalUrls() {
  const urls = new Set();
  if (!existsSync(BLOG_DIR)) return urls;
  for (const file of readdirSync(BLOG_DIR)) {
    if (!file.endsWith(".md")) continue;
    const content = readFileSync(join(BLOG_DIR, file), "utf-8");
    const match = content.match(/canonicalUrl:\s*['"]?(https?:\/\/[^\s'"]+)/);
    if (match) urls.add(match[1]);
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

function fetchTweets() {
  console.log(`Fetching tweets from @${X_HANDLE}...`);
  const cmd = `bird user-tweets @${X_HANDLE} -n ${TWEET_COUNT} --json`;
  const result = execSync(cmd, {
    encoding: "utf-8",
    timeout: 120_000,
    // Bird picks up AUTH_TOKEN and CT0 from env or browser cookies
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Skip any non-JSON preamble lines (bird prints info messages to stdout)
  const jsonStart = result.indexOf("{");
  if (jsonStart === -1) {
    throw new Error("No JSON output from bird CLI");
  }
  return JSON.parse(result.slice(jsonStart));
}

function extractArticles(data) {
  const articles = new Map();

  for (const tweet of data.tweets || []) {
    // Check direct tweet and quoted tweets
    for (const source of [tweet, tweet.quotedTweet].filter(Boolean)) {
      if (!source.article) continue;
      if (source.author?.username !== X_HANDLE) continue;
      if (articles.has(source.id)) continue;

      articles.set(source.id, {
        id: source.id,
        title: source.article.title,
        previewText: source.article.previewText || "",
        coverImage: source.article.coverImage || "",
        createdAt: source.createdAt,
        text: "", // will be filled by individual fetch
      });
    }
  }

  return [...articles.values()];
}

function fetchArticleContent(articleId) {
  const cmd = `bird read ${articleId} --json`;
  const result = execSync(cmd, {
    encoding: "utf-8",
    timeout: 30_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const jsonStart = result.indexOf("{");
  if (jsonStart === -1) throw new Error(`No JSON for article ${articleId}`);
  return JSON.parse(result.slice(jsonStart));
}

async function main() {
  // 1. Fetch timeline to discover articles
  const data = fetchTweets();
  const articles = extractArticles(data);
  console.log(`Found ${articles.length} articles by @${X_HANDLE}`);

  if (articles.length === 0) {
    console.log("No articles found. Done.");
    return;
  }

  // 2. Check which articles are already imported
  const existingUrls = getExistingCanonicalUrls();
  const existingSlugs = getExistingSlugs();

  // 3. Fetch full content and write markdown for new articles
  let imported = 0;
  for (const article of articles) {
    const canonicalUrl = `https://x.com/${X_HANDLE}/article/${article.id}`;
    if (existingUrls.has(canonicalUrl)) {
      console.log(`  SKIP (already imported): ${article.title}`);
      continue;
    }

    console.log(`  Fetching content: ${article.title}...`);
    const full = fetchArticleContent(article.id);
    article.text = full.text || "";
    article.coverImage = full.article?.coverImage || article.coverImage;

    if (!article.text) {
      console.log(`  WARN: Empty content for "${article.title}", skipping`);
      continue;
    }

    const md = articleToMarkdown(article);
    let slug = slugify(article.title);

    // Avoid collisions with existing posts
    if (existingSlugs.has(slug)) {
      slug = `${slug}-x-article`;
    }

    const filePath = join(BLOG_DIR, `${slug}.md`);
    writeFileSync(filePath, md, "utf-8");
    existingSlugs.add(slug);
    imported++;
    console.log(`  WROTE: ${filePath}`);
  }

  console.log(`\nDone. Imported ${imported} new article(s).`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

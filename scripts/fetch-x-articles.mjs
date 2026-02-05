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
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const X_HANDLE = "hummusonrails";
const BLOG_DIR = new URL("../src/content/blog", import.meta.url).pathname;
const TWEET_COUNT = 200;

// Tags to auto-assign based on keyword matching in title only
const TAG_RULES = [
  { tag: "ai", keywords: ["claude", "openai", "llm", "gpt", "vibe cod", "ai "] },
  { tag: "blockchain", keywords: ["arbitrum", "ethereum", "dapp", "smart contract", "web3", "x402", "solidity", "stylus"] },
  { tag: "career", keywords: ["hiring", "career", "candidates", "developer who doesn"] },
  { tag: "devrel", keywords: ["devrel", "developer relations", "developer advocacy"] },
];

// ---------------------------------------------------------------------------
// Draft.js → Markdown converter
// ---------------------------------------------------------------------------

function buildMediaUrlMap(articleResult) {
  const map = new Map();
  for (const me of articleResult.media_entities || []) {
    const url = me.media_info?.original_img_url;
    if (url) map.set(String(me.media_id), url);
  }
  return map;
}

function applyInlineStyles(text, inlineStyleRanges) {
  if (!text || !inlineStyleRanges?.length) return text;

  // Build a character-level style map
  const chars = [...text];
  const styles = chars.map(() => new Set());
  for (const { style, offset, length } of inlineStyleRanges) {
    for (let i = offset; i < offset + length && i < chars.length; i++) {
      styles[i].add(style);
    }
  }

  // Walk characters and insert markdown markers at style boundaries
  let result = "";
  let activeBold = false;
  let activeItalic = false;

  for (let i = 0; i < chars.length; i++) {
    const wantsBold = styles[i].has("Bold");
    const wantsItalic = styles[i].has("Italic");

    // Close styles in reverse order
    if (activeItalic && !wantsItalic) {
      result += "*";
      activeItalic = false;
    }
    if (activeBold && !wantsBold) {
      result += "**";
      activeBold = false;
    }

    // Open styles
    if (!activeBold && wantsBold) {
      result += "**";
      activeBold = true;
    }
    if (!activeItalic && wantsItalic) {
      result += "*";
      activeItalic = true;
    }

    result += chars[i];
  }

  // Close any still-open styles
  if (activeItalic) result += "*";
  if (activeBold) result += "**";

  return result;
}

function resolveEntityContent(entity, mediaUrlMap) {
  if (!entity?.value?.data) return null;
  const data = entity.value.data;
  const type = entity.value.type;

  if (data.mediaItems?.length) {
    const lines = [];
    for (const mi of data.mediaItems) {
      const url = mediaUrlMap.get(String(mi.mediaId));
      if (url) lines.push(`![](${url})`);
    }
    if (data.caption) lines.push(`*${data.caption}*`);
    return lines.length ? lines.join("\n") : null;
  }
  if (data.markdown) return data.markdown;
  if (type === "LINK" && data.url) return null; // inline links handled in text
  return null;
}

function draftJsToMarkdown(contentState, mediaUrlMap, entityMap) {
  const blocks = contentState.blocks || [];
  const entMap = Array.isArray(entityMap) ? entityMap : [];

  // X stores atomic blocks in authoring order, not visual order.
  // The entity's `key` field (a string number) gives the intended
  // visual position. We collect all atomic block slots, sort entities
  // by their key, then place the correctly-ordered content into each slot.
  const atomicSlots = []; // indices into blocks[] where atomic blocks sit
  const atomicEntities = []; // { entityVisualKey, entityIdx }

  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === "atomic") {
      const er = blocks[i].entityRanges?.[0];
      if (er != null) {
        atomicSlots.push(i);
        const ent = entMap[er.key];
        const visualKey = parseInt(ent?.key ?? "9999", 10);
        atomicEntities.push({ visualKey, entityIdx: er.key });
      }
    }
  }

  // Sort entities by visual key and assign to slots in order
  const sortedEntities = [...atomicEntities].sort(
    (a, b) => a.visualKey - b.visualKey
  );
  const slotToEntity = new Map();
  for (let i = 0; i < atomicSlots.length; i++) {
    if (i < sortedEntities.length) {
      slotToEntity.set(atomicSlots[i], sortedEntities[i].entityIdx);
    }
  }

  // Also collect entities referenced from non-atomic blocks (inline media)
  // that aren't already placed in an atomic slot
  const placedEntityIndices = new Set(slotToEntity.values());
  const inlineMediaEntities = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type !== "atomic") {
      for (const er of blocks[i].entityRanges || []) {
        const ent = entMap[er.key];
        if (
          ent?.value?.data?.mediaItems?.length &&
          !placedEntityIndices.has(er.key)
        ) {
          inlineMediaEntities.push({ blockIdx: i, entityIdx: er.key });
        }
      }
    }
  }

  const lines = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const type = block.type || "unstyled";
    const text = applyInlineStyles(block.text, block.inlineStyleRanges);

    switch (type) {
      case "header-one":
        lines.push(`# ${text}`, "");
        break;
      case "header-two":
        lines.push(`## ${text}`, "");
        break;
      case "header-three":
        lines.push(`### ${text}`, "");
        break;
      case "blockquote":
        lines.push(`> ${text}`, "");
        break;
      case "unordered-list-item":
        lines.push(`- ${text}`);
        break;
      case "ordered-list-item":
        lines.push(`1. ${text}`);
        break;
      case "atomic": {
        const entIdx = slotToEntity.get(i);
        if (entIdx != null) {
          const entity = entMap[entIdx];
          const content = resolveEntityContent(entity, mediaUrlMap);
          if (content) lines.push(content, "");
        }
        break;
      }
      default: {
        lines.push(text, "");
        // If this non-atomic block has an inline media entity, add it after
        const inlineMedia = inlineMediaEntities.find(
          (im) => im.blockIdx === i
        );
        if (inlineMedia) {
          const entity = entMap[inlineMedia.entityIdx];
          const content = resolveEntityContent(entity, mediaUrlMap);
          if (content) lines.push(content, "");
        }
        break;
      }
    }
  }

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const d = new Date(twitterDate);
  return d.toISOString().split("T")[0];
}

function buildFrontmatter(article) {
  const tags = detectTags(article.title);
  const tagYaml = tags
    .map((t) => `  - slug: ${t}\n    collection: tags`)
    .join("\n");
  const date = parseDate(article.createdAt);
  const summary = article.previewText || "";
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

// ---------------------------------------------------------------------------
// Bird CLI wrappers
// ---------------------------------------------------------------------------

function parseJsonOutput(raw) {
  const jsonStart = raw.indexOf("{");
  if (jsonStart === -1) throw new Error("No JSON in bird output");
  return JSON.parse(raw.slice(jsonStart));
}

function fetchTweets() {
  console.log(`Fetching tweets from @${X_HANDLE}...`);
  const result = execSync(
    `bird user-tweets @${X_HANDLE} -n ${TWEET_COUNT} --json`,
    { encoding: "utf-8", timeout: 120_000, stdio: ["pipe", "pipe", "pipe"] }
  );
  return parseJsonOutput(result);
}

function fetchArticleFull(articleId) {
  const result = execSync(`bird read ${articleId} --json-full`, {
    encoding: "utf-8",
    timeout: 30_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return parseJsonOutput(result);
}

function extractArticles(data) {
  const articles = new Map();
  for (const tweet of data.tweets || []) {
    for (const source of [tweet, tweet.quotedTweet].filter(Boolean)) {
      if (!source.article) continue;
      if (source.author?.username !== X_HANDLE) continue;
      if (articles.has(source.id)) continue;
      articles.set(source.id, {
        id: source.id,
        title: source.article.title,
        previewText: source.article.previewText || "",
        createdAt: source.createdAt,
      });
    }
  }
  return [...articles.values()];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const data = fetchTweets();
  const articles = extractArticles(data);
  console.log(`Found ${articles.length} articles by @${X_HANDLE}`);

  if (articles.length === 0) {
    console.log("No articles found. Done.");
    return;
  }

  const existingUrls = getExistingCanonicalUrls();
  const existingSlugs = getExistingSlugs();

  let imported = 0;
  for (const article of articles) {
    const canonicalUrl = `https://x.com/${X_HANDLE}/article/${article.id}`;
    if (existingUrls.has(canonicalUrl)) {
      console.log(`  SKIP (already imported): ${article.title}`);
      continue;
    }

    console.log(`  Fetching content: ${article.title}...`);
    const full = fetchArticleFull(article.id);

    // Extract Draft.js content from the raw API response
    const rawArticle =
      full._raw?.article?.article_results?.result || {};
    const contentState = rawArticle.content_state;

    if (!contentState?.blocks?.length) {
      console.log(`  WARN: No content blocks for "${article.title}", skipping`);
      continue;
    }

    // Build media URL lookup and convert Draft.js to markdown
    const mediaUrlMap = buildMediaUrlMap(rawArticle);
    const entityMap = contentState.entityMap || [];
    const body = draftJsToMarkdown(contentState, mediaUrlMap, entityMap);

    // Cover image
    const coverImage =
      rawArticle.cover_media?.media_info?.original_img_url || "";

    // Strip title if it's the first line
    let cleanBody = body;
    const firstLine = body.split("\n")[0].trim();
    if (firstLine === article.title) {
      cleanBody = body.slice(body.indexOf("\n") + 1).trimStart();
    }

    article.coverImage = coverImage;
    const frontmatter = buildFrontmatter(article);
    const md = `${frontmatter}\n\n${cleanBody}\n`;

    let slug = slugify(article.title);
    if (existingSlugs.has(slug)) slug = `${slug}-x-article`;

    const filePath = join(BLOG_DIR, `${slug}.md`);
    writeFileSync(filePath, md, "utf-8");
    existingSlugs.add(slug);
    imported++;
    console.log(`  WROTE: ${filePath} (${mediaUrlMap.size} images)`);
  }

  console.log(`\nDone. Imported ${imported} new article(s).`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

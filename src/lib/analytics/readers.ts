// Who read greenberg.md, from the request's user agent. Agents and scripts
// never run JavaScript, so this is worked out on the server for every request.
import { browser, isBot } from "./classify";

export const READER_KINDS = [
  "AI assistant", // fetched live while answering someone
  "AI search", // indexing for an AI search product
  "AI training", // collecting training data
  "Search engine",
  "Link preview",
  "Terminal or script",
  "Person",
  "Other bot",
] as const;
export type ReaderKind = (typeof READER_KINDS)[number];

// Most specific first: several of these also contain "bot" or "Mozilla".
const RULES: [RegExp, string, ReaderKind][] = [
  [/ChatGPT-User/i, "ChatGPT", "AI assistant"],
  [/Claude-User/i, "Claude", "AI assistant"],
  [/Perplexity-User/i, "Perplexity", "AI assistant"],
  [/MistralAI-User/i, "Mistral Le Chat", "AI assistant"],
  [/Meta-ExternalFetcher/i, "Meta AI", "AI assistant"],
  [/DuckAssistBot/i, "DuckDuckGo Assist", "AI assistant"],
  [/Google-NotebookLM/i, "NotebookLM", "AI assistant"],
  [/Gemini-Deep-Research/i, "Gemini Deep Research", "AI assistant"],
  [/Manus-User/i, "Manus", "AI assistant"],
  [/Devin\//i, "Devin", "AI assistant"],
  [/OAI-SearchBot/i, "ChatGPT search", "AI search"],
  [/Claude-SearchBot/i, "Claude search", "AI search"],
  [/PerplexityBot/i, "Perplexity", "AI search"],
  [/YouBot/i, "You.com", "AI search"],
  [/PhindBot/i, "Phind", "AI search"],
  [/GPTBot/i, "OpenAI GPTBot", "AI training"],
  [/ClaudeBot|anthropic-ai/i, "Anthropic ClaudeBot", "AI training"],
  [/Google-Extended|Google-CloudVertexBot/i, "Google AI", "AI training"],
  [/Applebot-Extended/i, "Apple AI", "AI training"],
  [/Meta-ExternalAgent|FacebookBot/i, "Meta AI crawler", "AI training"],
  [/Amazonbot/i, "Amazonbot", "AI training"],
  [/Bytespider|TikTokSpider/i, "ByteDance", "AI training"],
  [/CCBot/i, "Common Crawl", "AI training"],
  [/cohere-ai|cohere-training/i, "Cohere", "AI training"],
  [/AI2Bot|Ai2Bot/i, "Ai2", "AI training"],
  [/Diffbot/i, "Diffbot", "AI training"],
  [/Timpibot|ImagesiftBot|omgili|Kangaroo Bot|PanguBot|Webzio/i, "Other AI crawler", "AI training"],
  [/Googlebot|Google-InspectionTool|GoogleOther|Storebot-Google/i, "Google", "Search engine"],
  [/bingbot|BingPreview|msnbot/i, "Bing", "Search engine"],
  [/Applebot/i, "Apple", "Search engine"],
  [/DuckDuckBot/i, "DuckDuckGo", "Search engine"],
  [/YandexBot|YandexRenderResourcesBot/i, "Yandex", "Search engine"],
  [/Baiduspider/i, "Baidu", "Search engine"],
  [/Kagibot|Qwantbot|SeznamBot|Yeti\/|Mojeek/i, "Other search", "Search engine"],
  [/Slackbot|Slack-ImgProxy/i, "Slack", "Link preview"],
  [/Twitterbot/i, "X", "Link preview"],
  [/facebookexternalhit|facebookcatalog/i, "Facebook", "Link preview"],
  [/LinkedInBot/i, "LinkedIn", "Link preview"],
  [/Discordbot/i, "Discord", "Link preview"],
  [/TelegramBot/i, "Telegram", "Link preview"],
  [/WhatsApp/i, "WhatsApp", "Link preview"],
  [/redditbot/i, "Reddit", "Link preview"],
  [/Bluesky|Cardyb/i, "Bluesky", "Link preview"],
  [/Mastodon/i, "Mastodon", "Link preview"],
  [/Iframely|Embedly|SkypeUriPreview/i, "Other preview", "Link preview"],
  [/^curl\//i, "curl", "Terminal or script"],
  [/^Wget/i, "Wget", "Terminal or script"],
  [/HTTPie/i, "HTTPie", "Terminal or script"],
  [/python-requests|python-httpx|aiohttp|Python-urllib|^python/i, "Python", "Terminal or script"],
  [/node-fetch|undici|axios|^node|got \(/i, "Node.js", "Terminal or script"],
  [/^Deno/i, "Deno", "Terminal or script"],
  [/^Bun/i, "Bun", "Terminal or script"],
  [/Go-http-client/i, "Go", "Terminal or script"],
  [/^Ruby|Faraday/i, "Ruby", "Terminal or script"],
  [/okhttp|Java\//i, "Java", "Terminal or script"],
  [/PowerShell/i, "PowerShell", "Terminal or script"],
  [/libwww-perl|reqwest|rust/i, "Other script", "Terminal or script"],
];

/** Our own uptime check and Vercel's tooling: never counted. */
export const IGNORED_READER = /greenberg\.md profile check|vercel-(screenshot|favicon)|^Vercel/i;

export function reader(ua: string): { name: string; kind: ReaderKind } {
  if (!ua) return { name: "No user agent", kind: "Terminal or script" };
  for (const [re, name, kind] of RULES) if (re.test(ua)) return { name, kind };
  if (isBot(ua)) return { name: ua.split(/[\s/;(]/)[0].slice(0, 40) || "Unknown bot", kind: "Other bot" };
  return { name: browser(ua), kind: "Person" };
}

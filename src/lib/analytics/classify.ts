// Turns a raw hit (user agent, referrer, landing URL) into the dimensions the
// analytics desk groups by. Ported from the Kindled desk.

const BOT = /bot|crawl|spider|slurp|scrape|fetch|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python|httpx|axios|node-fetch|go-http|java\/|okhttp|facebookexternalhit|embedly|quora link|whatsapp|telegrambot|discordbot|slackbot|vercel|chrome-lighthouse|phantomjs|puppeteer|playwright|selenium/i;

export const isBot = (ua: string) => !ua || ua.length < 20 || BOT.test(ua);

export function device(ua: string): string {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "Tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

export function browser(ua: string): string {
  const rules: [RegExp, string][] = [
    [/FBAN|FBAV|FB_IAB/, "Facebook app"], [/Instagram/, "Instagram app"], [/LinkedInApp/, "LinkedIn app"],
    [/Twitter|TwitterAndroid/, "X app"], [/GSA\//, "Google app"], [/Edg(e|A|iOS)?\//, "Edge"],
    [/OPR\/|Opera/, "Opera"], [/SamsungBrowser/, "Samsung Internet"], [/YaBrowser/, "Yandex"],
    [/Brave/, "Brave"], [/Vivaldi/, "Vivaldi"], [/DuckDuckGo/, "DuckDuckGo"], [/Firefox|FxiOS/, "Firefox"],
    [/CriOS|Chrome|Chromium/, "Chrome"], [/Safari/, "Safari"],
  ];
  for (const [re, name] of rules) if (re.test(ua)) return name;
  return "Other";
}

export function os(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

const SEARCH = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yahoo\.com|ecosia\.org|search\.brave\.com|yandex\.[a-z.]+|baidu\.com|kagi\.com|startpage\.com|qwant\.com|naver\.com|seznam\.cz)$/;
const AI = /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com|phind\.com|meta\.ai|grok\.com|chat\.deepseek\.com|chat\.mistral\.ai)$/;
const SOCIAL = /(^|\.)(t\.co|x\.com|twitter\.com|facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|lnkd\.in|reddit\.com|youtube\.com|youtu\.be|tiktok\.com|threads\.net|threads\.com|bsky\.app|mastodon\.[a-z.]+|news\.ycombinator\.com|whatsapp\.com|wa\.me|t\.me|telegram\.org|substack\.com|pinterest\.com|quora\.com|discord\.com)$/;
const MAIL = /(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|mail\.yahoo\.com|mail\.proton\.me)$/;

// Where the visit came from, in one word. An explicit UTM medium wins, then
// the referrer.
export function channel(refHost: string | null, utmSource: string | null, utmMedium: string | null): string {
  const m = (utmMedium || "").toLowerCase();
  if (/e-?mail|newsletter/.test(m)) return "Email";
  if (/cpc|ppc|paid|ads?$|display|banner/.test(m)) return "Paid";
  if (/social|sm$|post|share/.test(m)) return "Social";
  if (refHost) {
    if (AI.test(refHost)) return "AI assistants";
    if (SEARCH.test(refHost)) return "Search";
    if (SOCIAL.test(refHost)) return "Social";
    if (MAIL.test(refHost)) return "Email";
    return "Referral";
  }
  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (/chatgpt|openai|perplexity|claude|gemini|copilot/.test(s)) return "AI assistants";
    if (/twitter|^x$|facebook|fb|instagram|linkedin|reddit|youtube|tiktok|threads|bluesky|bsky|whatsapp|telegram|mastodon/.test(s)) return "Social";
    if (/newsletter|mail/.test(s)) return "Email";
    return "Campaign";
  }
  return "Direct";
}

export const cleanHost = (h: string) => h.toLowerCase().replace(/^www\.|^m\.|^l\.|^lm\.|^mobile\./, "");

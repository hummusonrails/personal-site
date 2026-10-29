// Checks greenberg.md the way an agent and a browser see it: the Markdown and
// HTML versions answer, the facts were reviewed in the last 90 days, and no
// link on the page is dead. Writes what it found to profile-check.md and exits
// 1 when anything needs Ben's attention.
import { writeFileSync } from 'node:fs';

const URL_ = process.env.PROFILE_URL || 'https://greenberg.md/';
const MAX_AGE_DAYS = 90;
// These sites refuse automated requests whatever the page's state.
const SKIP_HOSTS = /(^|\.)(linkedin\.com|x\.com|twitter\.com)$/;

const problems = [];

async function get(url, accept) {
  return fetch(url, { headers: { Accept: accept, 'User-Agent': 'greenberg.md profile check' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
}

const md = await get(URL_, '*/*');
const markdown = await md.text();
if (!md.ok || !md.headers.get('content-type')?.startsWith('text/markdown')) {
  problems.push(`\`curl ${URL_}\` answered ${md.status} ${md.headers.get('content-type')} instead of Markdown.`);
}
if (!markdown.includes('## Rules for using this file')) problems.push('The Markdown has no "Rules for using this file" section.');

const html = await get(URL_, 'text/html');
const page = await html.text();
if (!html.ok || !html.headers.get('content-type')?.startsWith('text/html') || !page.includes('application/ld+json')) {
  problems.push(`A browser request answered ${html.status} ${html.headers.get('content-type')}, or the page has no JSON-LD.`);
}

const reviewed = markdown.match(/^facts_reviewed: (\d{4}-\d{2}-\d{2})$/m)?.[1];
if (!reviewed) {
  problems.push('The Markdown has no facts_reviewed date.');
} else {
  const age = Math.floor((Date.now() - Date.parse(reviewed)) / 86400000);
  if (age > MAX_AGE_DAYS) {
    problems.push(`The facts were last reviewed on ${reviewed}, ${age} days ago. Check src/data/profile.ts against reality and bump \`reviewed\`.`);
  }
}

const links = [...new Set([...markdown.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]))];
const dead = [];
await Promise.all(
  links.map(async (link) => {
    if (SKIP_HOSTS.test(new URL(link).hostname)) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await get(link, 'text/html,*/*');
        if (res.status === 404 || res.status === 410) dead.push(`${link} (${res.status})`);
        return;
      } catch (err) {
        if (attempt === 1) dead.push(`${link} (${err.cause?.code || err.name})`);
      }
    }
  }),
);
if (dead.length) problems.push(`Dead links on the page:\n${dead.sort().map((d) => `  - ${d}`).join('\n')}`);

const report = problems.length
  ? `greenberg.md needs attention (checked ${new Date().toISOString().slice(0, 10)}, ${links.length} links):\n\n${problems.map((p) => `- ${p}`).join('\n')}\n`
  : `greenberg.md is healthy: both formats answer, facts reviewed ${reviewed}, ${links.length} links checked.\n`;
writeFileSync('profile-check.md', report);
console.log(report);
process.exit(problems.length ? 1 : 0);

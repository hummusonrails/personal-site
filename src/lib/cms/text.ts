// Text helpers the CMS uses in the browser and on the server (no Node APIs).

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/, '');
}

/** Words and minutes to read, from markdown. */
export function readingStats(markdown: string): { words: number; minutes: number } {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const words = (text.match(/[\p{L}\p{N}'’-]+/gu) || []).length;
  return { words, minutes: Math.max(1, Math.round(words / 230)) };
}

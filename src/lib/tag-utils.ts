import { fetchAndSortBlogPosts } from '../functions';

export async function getTagCounts() {
  const posts = await fetchAndSortBlogPosts();

  const tagCounts: Record<string, number> = {};

  for (const post of posts) {
    const tags = Array.isArray(post.tags) ? post.tags : [post.tags];
    for (const tag of tags) {
      const normalized = tag.toLowerCase();
      tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
    }
  }

  return tagCounts;
}

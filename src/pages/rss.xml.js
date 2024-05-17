import rss from '@astrojs/rss';
import { SITE_METADATA } from '../consts';
import { fetchAndSortBlogPosts, excludeDrafts } from '../functions';

const { title, description } = SITE_METADATA;

export async function GET(context) {
  const posts = await fetchAndSortBlogPosts();
  const filteredPosts = posts.filter(excludeDrafts);

  return rss({
    title,
    description,
    site: context.site,
    items: filteredPosts.map(post => ({
      title: post.title,
      categories: post.tags,
      pubDate: new Date(post.date),
      description: post.summary,
      link: `/blog/${post.id}/`,
    })),
  });
}
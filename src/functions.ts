import { getBlogPosts } from './db/couchbase';

export const fetchAndSortBlogPosts = async () => {
  try {
    const posts = await getBlogPosts();
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error fetching and sorting blog posts:', error);
    return [];
  }
};

export const excludeDrafts = (post) => {
  return import.meta.env.PROD ? !post.draft : true;
};
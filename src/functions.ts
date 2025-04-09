export const fetchAndSortBlogPosts = async () => {
  const postFiles = import.meta.glob('../src/content/blog/*.md', { eager: true });
  
  const posts = Object.entries(postFiles).map(([file, mod]: any) => {
    return {
      ...mod.frontmatter,
      id: file.split('/').pop().replace('.md', ''),
      Component: mod.default,
    };
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const excludeDrafts = (post) => {
  return import.meta.env.PROD ? !post.draft : true;
};

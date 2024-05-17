import couchbase from 'couchbase';

let cluster;
async function init() {
  if (!cluster) {
    cluster = await couchbase.connect(import.meta.env.COUCHBASE_URL, {
      username: import.meta.env.COUCHBASE_USERNAME,
      password: import.meta.env.COUCHBASE_PASSWORD,
      configProfile: "wanDevelopment",
    });
  }
  return cluster;
}

const convertToDate = (post) => {
  if (post.date) {
    post.date = new Date(post.date);
  } else {
    post.date = new Date('2024-01-01');
  }
  return post;
};

const getBlogPosts = async () => {
  const cluster = await init();
  const query = 'SELECT META().id, * FROM `blogBucket` WHERE type = "blogPost"';
  const result = await cluster.query(query);
  return result.rows.map((row) => {
    const post = row.blogBucket;
    return convertToDate({
      id: row.id,
      title: post.title || 'Untitled',
      date: post.date,
      summary: post.summary || '',
      tags: post.tags || [],
      ...post,
    });
  });
};

const getBlogPost = async (id) => {
  const cluster = await init();
  const collection = cluster.bucket('blogBucket').defaultCollection();
  const result = await collection.get(id);
  const post = result.content;
  return convertToDate({
    id: result.id,
    title: post.title || 'Untitled',
    date: post.date,
    summary: post.summary || '',
    tags: post.tags || [],
    ...post,
  });
};

// Format the unique constraints of my tags to match the format of the tag IDs in the database
// If you are using this for your own project, modify accordingly
function formatTagId(slug) {
  const tag = slug.split('_')[1];
  let formattedTag;

  if (tag.toLowerCase() === 'ai') {
    formattedTag = 'AI';
  } else if (tag.toLowerCase() === 'github') {
    formattedTag = 'GitHub';
  } else if (tag.toLowerCase() === 'devrel') {
    formattedTag = 'DevRel';
  } else {
    formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
  }

  return `tag_${formattedTag}`;
}

const getTags = async () => {
  const cluster = await init();
  const query = 'SELECT META().id, * FROM `blogBucket` WHERE type = "tag"';
  const result = await cluster.query(query);
  return result.rows.map(row => {
    const tag = row.blogBucket;
    const formattedTag = formatTagId(row.id);
    return {
      id: formattedTag.replace('tag_', ''),
      ...tag
    };
  });
};

const getAuthors = async (authorIds) => {
  const cluster = await init();
  const query = `SELECT META().id, * FROM \`blogBucket\` WHERE type = "author" AND META().id IN ${JSON.stringify(authorIds)}`;
  const result = await cluster.query(query);
  return result.rows.map(row => {
    const author = row.blogBucket;
    return {
      id: row.id,
      ...author
    };
  });
};

async function getAuthor(authorId) {
  const cluster = await init();
  const bucket = cluster.bucket('blogBucket');
  const collection = bucket.defaultCollection();

  try {
    const result = await collection.get(authorId);
    return result.content;
  } catch (err) {
    console.error(`Error fetching author ${authorId}:`, err);
    return null;
  }
}

const getTagBySlug = async (slug) => {
  const cluster = await init();
  const bucket = cluster.bucket('blogBucket');
  const collection = bucket.defaultCollection();
  const tagId = formatTagId(slug);

  try {
    const result = await collection.get(tagId);
    return result.content;
  } catch (err) {
    console.error(`Error fetching tag ${tagId}:`, err);
    return null;
  }
};

export { getBlogPosts, getBlogPost, getTags, getAuthors, getAuthor, getTagBySlug };
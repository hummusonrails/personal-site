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
  const query = 'SELECT META().id, * FROM `blogBucket`.`_default`.`_default` WHERE `blogBucket`.type = "blogPost";';
  const result = await cluster.query(query);
  return result.rows.map((row) => {
    const post = row._default?.blogBucket;
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
  const parts = slug.split('_');
  if (parts.length < 2) {
    console.error('Unexpected slug format:', slug);
    return slug; 
  }
  
  const tag = parts[1]; 

  if (!tag) {
    console.error('Tag is undefined:', slug);
    return slug;
  }

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
  const query = 'SELECT META().id, * FROM `blogBucket`.`_default`.`_default` WHERE `blogBucket`.type = "tag"';
  const result = await cluster.query(query);
  
  if (!result.rows) {
    console.error('No rows returned from query.');
    return [];
  }
  
  return result.rows.map(row => {
    const tag = row._default?.blogBucket; 
    
    if (!tag) {
      console.error('Invalid tag structure:', row);
      return null;
    }

    const formattedTag = formatTagId(row._default?.blogBucket.id);
    return {
      id: formattedTag.replace('tag_', ''),
      ...tag
    };
  }).filter(Boolean); 
};

const getAuthors = async (authorIds) => {
  const cluster = await init();

  const caseVariants = authorIds.flatMap(id => {
    const [prefix, name] = id.split('_');
    return [
      `${prefix}_${name.toLowerCase()}`,
      `${prefix}_${name.charAt(0).toUpperCase() + name.slice(1)}`
    ];
  });

  const uniqueCaseVariants = [...new Set(caseVariants)];

  const query = `SELECT META().id, * FROM \`blogBucket\` WHERE \`blogBucket\`.type = 'author' AND META().id IN ${JSON.stringify(uniqueCaseVariants)}`;
  const result = await cluster.query(query);

  return result.rows.map(row => {
    const author = row.blogBucket;
    return {
      id: row.id,
      ...author
    };
  });
};


async function getAuthor() {
  const cluster = await init();
  const query = `
    SELECT _default.blogBucket 
    FROM \`blogBucket\`.\`_default\`.\`_default\`
    WHERE _default.blogBucket.id = 'authors_default';
  `;

  try {
    const result = await cluster.query(query);

    if (result.rows.length === 0) {
      console.error('Author with ID "authors_default" not found');
      return null;
    }

    const author = result.rows[0];
    return author;
  } catch (err) {
    console.error('Error fetching author "authors_default":', err);
    return null;
  }
}

const getTagBySlug = async (slug) => {
  console.log('Fetching tag with slug:', slug);
  const cluster = await init();

  let formattedSlug;
  let lowerSlug;
  let upperSlug;

  const baseSlug = slug.startsWith('tag_') ? slug.slice(4) : slug;

  if (baseSlug.toLowerCase() === 'github') {
    formattedSlug = 'tag_GitHub';
  } else if (baseSlug.toLowerCase() === 'devrel') {
    formattedSlug = 'tag_DevRel';
  } else if (baseSlug.toLowerCase() === 'ai') {
    formattedSlug = 'tag_AI';
  } else {
    lowerSlug = `tag_${baseSlug.toLowerCase()}`;
    upperSlug = `tag_${baseSlug.charAt(0).toUpperCase() + baseSlug.slice(1).toLowerCase()}`;

    console.log('Lower slug:', lowerSlug);
    console.log('Upper slug:', upperSlug);

    formattedSlug = [lowerSlug, upperSlug];
  }

  const query = `
    SELECT META().id, * 
    FROM \`blogBucket\`.\`_default\`.\`_default\` 
    WHERE \`blogBucket\`.type = "tag" 
    AND \`blogBucket\`.id IN $1
  `;
  
  const formattedSlugs = Array.isArray(formattedSlug) ? formattedSlug : [formattedSlug];
  console.log('Query parameters:', formattedSlugs);

  const result = await cluster.query(query, {
    parameters: [formattedSlugs],
  });

  if (result.rows.length === 0) {
    console.error(`Tag with slug "${slug}" not found`);
    return null;
  }

  const tag = result.rows[0]?._default?.blogBucket;
  if (!tag) {
    console.error(`Error: Expected blogBucket not found in result for slug "${slug}"`);
    return null;
  }

  return tag;
};

export { getBlogPosts, getBlogPost, getTags, getAuthors, getAuthor, getTagBySlug };
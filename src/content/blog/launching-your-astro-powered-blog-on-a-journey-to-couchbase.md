---
title: Launching Your Astro Powered Blog on a Journey to Couchbase
date: '2024-05-19'
summary: >-
  Learn how to transform your Astro site by integrating Couchbase for a more
  dynamic and high-performing blog. Discover the step-by-step process and the
  benefits of leveraging a NoSQL database for your content.
tags:
  - slug: tutorial
    collection: tags
image: >-
  https://dev-to-uploads.s3.amazonaws.com/uploads/articles/xaa988pg5o5idrmxiqmx.png
authors:
  - default
---
  
  ![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/xaa988pg5o5idrmxiqmx.png)

In this tutorial, you will learn how I increased the flexibility and performance of my Astro-powered blog by integrating Couchbase. We will walk through the step-by-step process in transforming an Astro static blog into one that leverages a NoSQL database, like Couchbase, for content storage.

*tl;dr You can find the full Astro site with the revisions [on GitHub](https://github.com/hummusonrails/personal-site) if you just want to skip to the code.*

## Table of Contents

- [What is NoSQL and Why Use It?](#what-is-nosql-and-why-use-it)
- [Setting up Couchbase Capella](#setting-up-couchbase-capella)
- [Migrating Your Existing Blog Posts](#migrating-your-existing-blog-posts)
- [Updating Your Astro Site to Fetch Data from Couchbase](#updating-your-astro-site-to-fetch-data-from-couchbase)
  - [Step 1: Define Couchbase Database Functions](#step-1-define-couchbase-database-functions)
  - [Step 2: Update Your Astro Site to Fetch Data from Couchbase](#step-2-update-your-astro-site-to-fetch-data-from-couchbase)
- [Adding New Blog Posts](#adding-new-blog-posts)
  - [Step 1: Create a New Repository for Blog Posts](#step-1-create-a-new-repository-for-blog-posts)
  - [Step 2: Create a GitHub Actions Workflow](#step-2-create-a-github-actions-workflow)
  - [Step 3: Create the Import Script](#step-3-create-the-import-script)
- [Conclusion](#conclusion)

First of all, let's make sure we understand the terms we will be using in this tutorial before moving forward.

- **Astro**: Astro is a modern web framework designed for building fast, optimized websites with a focus on developer experience. It allows developers to use their preferred JavaScript frameworks and languages, and features a unique island architecture that only hydrates interactive components on the client-side as needed. This approach reduces JavaScript load, leading to better performance. You can discover more about Astro and how to get started using it by exploring the [official documentation](https://docs.astro.build/).
- **Couchbase**: Couchbase is a NoSQL database that combines the capabilities of a document store and a key-value store with a flexible JSON data model. It supports high performance, scalability, and reliability, making it ideal for web, mobile, and IoT applications. Couchbase offers advanced features like full-text search, analytics, and eventing, and is designed for distributed, multi-cloud, and on-premises deployments. It provides a rich query language (N1QL), built-in caching, and seamless synchronization across devices. You can learn more about Couchbase and its features by visiting the [official documentation](https://docs.couchbase.com/home/index.html).
- **Couchbase Capella**: Couchbase Capella is a fully-managed NoSQL Database-as-a-Service (DBaaS) designed for high performance, scalability, and flexibility. It offers a secure, cloud-native platform with automated deployment, scaling, and management, ensuring continuous availability and data security. The service provides seamless integration with AWS, Azure, and GCP, along with advanced features like full-text search, analytics, and mobile synchronization. Couchbase Capella simplifies database operations while delivering enterprise-grade capabilities for mission-critical applications. You can explore more about Couchbase Capella and its benefits by checking out the [official documentation](https://docs.couchbase.com/capella/current/index.html).

Now that we've covered those details, let's move on to implementation. Are you ready? Oh wait, you may have a couple last questions that we did not address before moving forward.

**What is NoSQL and why use it?**

If we don't address those questions, then what is the point in even proceeding? Let's quickly address them.

## What is NoSQL and Why Use It?

A NoSQL database is a type of database designed to handle and store large volumes of unstructured, semi-structured, or structured data without relying on the traditional relational database model. Unlike SQL databases, NoSQL databases are schema-less and support a variety of data models, such as key-value pairs, documents, wide-columns, and graphs. This flexibility allows for easier scalability, faster performance, and better handling of big data and real-time web applications, making them ideal for dynamic and high-traffic environments.

There are many use cases for choosing a NoSQL database over a traditional SQL database. Perhaps you are building an Internet of Things (IoT) application that requires real-time data processing of data that is not consistent in structure. Or maybe you are developing a content management system (CMS) that needs to handle data with varying attributes and relationships. NoSQL databases are commonly used for mobile applications, e-commerce platforms and other applications that require flexibility, scalability, and high availability.

So why would I want to use it for my personal blog? I'm not running a high-traffic site (at least most of the time!) and I am not generating content at a very large scale. Well, for me, the benefit of migrating to a NoSQL database for my Astro blog is that it allows me to have a more flexible content management system. For example, I can add new fields to my posts without having to update the schema each time. I can also introduce other forms of content, like videos, that may not fit neatly into the traditional database model. 

Now that we've covered the basics, let's dive into the step-by-step process of integrating Couchbase with your Astro site.

## Setting up Couchbase Capella

Before doing anything to your site, you first need to create an account on the Couchbase Capella platform. It's very quick to sign up and get started. Head over to the [sign-up page](https://cloud.couchbase.com/sign-up) and create an account. You can create an account with your GitHub or Google credentials, or by providing an email address and password. Once you have created an account, you can log in to the Couchbase Capella console and create a new database. For this example of a blog posts database, perhaps you can name your database `blogPosts`. 

![screenshot of database ready in platform](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/sswb6y9ffpcgnmkedw5j.png)

After creating the database, you need to fetch your connection string. This is the URL that your Astro site will use to connect to the database. You can find those details by navigating to the `Connect` tab in the Couchbase Capella console.

![screenshot of the connect tab](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/is1d5budg6mj5two7l7m.png)

It is also a good idea at this time to create your database access credentials, which you will use to authenticate your Astro site with the database. From the `Connection` page, you can navigate directly to the area to create those credentials by following the link in `Step 2` as soon in the screenshot below.

![screenshot of the instructions with the link to create the db credentials](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ccblvmkq5micglvgjb0y.png)

Keep your connection string and credentials in a handy place, you will be using them later on in this tutorial.

You are almost done with the Couchbase setup!

At this point, let's update the allowed IP addresses for your database. You can find the dialog to do this by navigating to `Settings > Networking > Allowed IP Addresses` in the Couchbase Capella console.

Lastly, we need to create a bucket in the database. A bucket is what Couchbase calls a container for storing documents. Documents are the equivalent of rows in a traditional SQL database. You can create a bucket for your blog posts by navigating to the `Data Tools` page from the Couchbase Capella console and clicking on the `+ Create` button. Follow the prompts to create a new bucket. For the purposes of this tutorial, you can name your bucket `blogBucket`.

Now you've completed all the setup you need to do on the Couchbase Capella platform. Let's move on to preparing our existing blog data for the migration.

## Migrating Your Existing Blog Posts

The most straightforward way blog content can be stored on an Astro blog is as static markdown files hosted in the repository of the site itself. Let's assume that all of the markdown files were stored in `./src/content/blog` and had the same frontmatter. We'll work with the following frontmatter structure:

```markdown
tags: ['tutorial']
title: Title of blog post
date: '2024-05-19'
summary: Summary of blog post for social sharing
image: Link to header image
authors: ['default']
```

Couchbase does not store markdown files, so your first step is to create a script that will convert the markdown files into JSON, which is the format that Couchbase uses to store documents.

Let's go ahead and create a new file called `markdownToCouchbase.ts` in the `./scripts` folder at the root level of your site. This script will read all the markdown files stored in `./src/content/blog`, convert them to JSON and then send them to the Couchbase database.

Here is an example of how you can structure the script:

```javascript
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import couchbase from 'couchbase';

// Couchbase connection setup
const cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
  username: process.env.COUCHBASE_USERNAME,
  password: process.env.COUCHBASE_PASSWORD,
  configProfile: "wanDevelopment",
});
const bucket = cluster.bucket(process.env.COUCHBASE_BUCKET);
const collection = bucket.defaultCollection(); 

// Provide the path to your Markdown files
const markdownDir = './src/content/blog';

// Grab all Markdown files in the directory
const getMarkdownFiles = () => {
  return fs.readdirSync(markdownDir).filter(file => file.endsWith('.md') || file.endsWith('.mdx'));
};

// Read the content of a Markdown file
const readMarkdownFile = (fileName) => {
  const filePath = path.join(markdownDir, fileName);
  return fs.readFileSync(filePath, 'utf-8');
};

// Parse the frontmatter and content of a Markdown file
const parseMarkdown = (content) => {
  const { data, content: markdownContent } = matter(content);
  return { ...data, content: markdownContent };
};

// Insert the parsed blog post into Couchbase
// Note the use of the .upsert() method to insert or update a document
// This ensures that the document is always inserted, and if it already exists, it will be updated
const storeBlogPost = async (post) => {
  const id = `blog_${new Date(post.date).getTime()}`;
  await collection.upsert(id, { ...post, type: 'blogPost' });
  console.log(`Inserted: ${id}`);
};

// Migrate Markdown files to Couchbase
const migrateMarkdownToCouchbase = async () => {
  const files = getMarkdownFiles();
  
  for (const file of files) {
    const content = readMarkdownFile(file);
    const parsedData = parseMarkdown(content);
    await storeBlogPost(parsedData);
  }
  
  console.log('Migration completed.');
};

// Execute the migration
migrateMarkdownToCouchbase().catch(console.error);
```

In this script, it is using the `gray-matter` package to parse the frontmatter of the markdown files. It connects to the Couchbase database using the `couchbase` package and inserts the parsed blog posts into the database. It uses the `.upsert` method to ensure that it will either insert a new document or update an existing one.

Before running the script, you need to create a `.env` file in the root of your site with the following environment variables:

```plaintext
COUCHBASE_URL=your_couchbase_url
COUCHBASE_USERNAME=your_couchbase_username
COUCHBASE_PASSWORD=your_couchbase_password
COUCHBASE_BUCKET=your_couchbase_bucket
```

Replace `your_couchbase_url`, `your_couchbase_username`, `your_couchbase_password`, and `your_couchbase_bucket` with the appropriate values from your Couchbase Capella account.

Once you run the script by executing `node ./scripts/markdownToCouchbase.ts` and it successfully completes, you can view your data in the Couchbase Capella platform. You can click on any of the stored documents and see the data. It will look something like this snippet of a screenshot:

![screenshot of the stored document in Couchbase](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/xzeu45rnpqrthyrvv1x8.png)

You have successfully migrated your existing blog posts to Couchbase! You're now ready to update your Astro site to fetch the blog content from Couchbase instead of from the static markdown files. Let's do it!

## Updating Your Astro Site to Fetch Data from Couchbase

### Step 1: Define Couchbase Database Functions

The first step is to create a new file in `./src/db/couchbase.ts` that will host all the functions you need to interact with the Couchbase database. This file will have functions to connect to the database, fetch all blog posts, fetch a specific blog post, get data on tags and get data on authors. 

Let's break this down step by step. At the conclusion of all the steps, you will find the full code for the `couchbase.ts` file, and if you'd like, you can skip right there and just do a quick copy-paste if that's your style.

#### Connect to the Couchbase Database

First, let's create a function to connect to the Couchbase database. This function will use the `couchbase` package to establish a connection to the database using the provided connection string and credentials.

```typescript
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
```

While we are here, let's also create a helper function to convert the date string from the database to a JavaScript `Date` object.

```typescript
const convertToDate = (post) => {
  if (post.date) {
    post.date = new Date(post.date);
  } else {
    post.date = new Date('2024-01-01');
  }
  return post;
};
```

#### Fetch All Blog Posts

Next, let's create a function to fetch all blog posts from the database. This function will query the database for all documents of type `blogPost` and return them as an array of objects.

```typescript
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
```

#### Fetch a Specific Blog Post

Now, let's create a function to fetch a specific blog post from the database. This function will take an `id` as a parameter and query the database for the document with that `id`.

```typescript
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
```

#### Get Data on Tags

Next, let's create a function to get data on tags. This function will query the database for all unique tags used in the blog posts.

```typescript
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
```

At this point, it would be a good idea to introduce a function that normalizes the tag IDs. This will be unique for each blog, and what follows is one example of this helper function:

```typescript
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
```

Let's also create a function to get tags by slug. This function will take a tag slug as a parameter and query the database for the tag with that slug.

```typescript
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
```

#### Get Data on Authors

Next, let's create a function to get data on authors. This function will query the database for all unique authors of the blog posts.

```typescript
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
```

#### Get Data on a Specific Author

Finally, let's create a function to get data on a specific author. This function will take an `id` as a parameter and query the database for the author with that `id`.

```typescript
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
```

Now that we have defined all the functions to interact with the Couchbase database, let's put them all together in the `couchbase.ts` file.

```typescript
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
  const collection = cluster.bucket(import.meta.env.COUCHBASE_BUCKET).defaultCollection();
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
  const bucket = cluster.bucket(import.meta.env.COUCHBASE_BUCKET);
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
  const bucket = cluster.bucket(import.meta.env.COUCHBASE_BUCKET);
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
```

### Step 2: Update Your Astro Site to Fetch Data from Couchbase

Now that you have defined all the functions to interact with the Couchbase database, let's update the Astro site to fetch the blog content from Couchbase instead of from the static markdown files.

In this section, you are going to update the following files:

* `./src/functions.ts`: Add functions to fetch and sort the blog posts and exclude drafts using the Couchbase functions you defined.
* `./src/components/Tag.astro`: Update the tag component to fetch data from Couchbase for the tags.
* `./src/layouts/ListWithTagsLayout.astro`: Update the main blog layout to fetch blog post listings and tags from Couchbase.
* `./src/layouts/PostLayout.astro`: Update the post layout to fetch individual blog posts from Couchbase.
* `./src/pages/blog/[...page].astro`: Update the blog index page to fetch blog post listings from Couchbase.
* `./src/pages/tags/[slug]/[...page].astro`: Update the tag page by slug to fetch blog post listings by tag from Couchbase.
* `./src/pages/tags/index.astro`: Update the tag index page to fetch all tags from Couchbase.
* `./src/pages/rss.xml.js`: Update the RSS feed to fetch blog post listings from Couchbase.

#### Update `./src/functions.ts`

First, let's update the `./src/functions.ts` file to add functions to fetch and sort the blog posts and exclude drafts using the Couchbase functions you defined.


The functions here will use the `getBlogPosts` function from the `couchbase.ts` file. Then, you will define a new function called `fetchAndSortBlogPosts` that fetches all blog posts from Couchbase and sorts them by date in descending order. You will also define a function called `excludeDrafts` that filters out draft posts in production mode.

```typescript
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
```

#### Update `./src/components/Tag.astro`

You will use the the `getTagBySlug` function from the `couchbase.ts` file to fetch the tag data by slug provided. You will update the `Tag.astro` component to fetch data from Couchbase for the tags instead of using the Astro content collection (i.e. `astro:content`). Lastly, you will create a HTML link component that will be used to render the tag name and link to the tag page.

```typescript
---
import Link from "./Link.astro";
import { getTagBySlug } from "../db/couchbase";

interface Props {
    tag?: any;
    slug?: string;
}

let Tag = Astro.props.tag;

if (!Tag && Astro.props.slug) {
    Tag = await getTagBySlug(`tag_${Astro.props.slug}`);
}

if (!Tag) {
    throw new Error(`Tag with slug "${Astro.props.slug}" not found`);
}

const { slug, name } = Tag;
---
<Link href={`/tags/${slug}`}
      class="mr-3 text-sm font-medium uppercase text-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
    {name}
</Link>
```

#### Update `./src/layouts/ListWithTagsLayout.astro`

This Astro layout renders the main blog page with a list of blog posts and tags. You will update the `ListWithTagsLayout.astro` layout to fetch blog post listings and tags from Couchbase instead of using the Astro content collection. Pay close attention to the `import` statements at the top of the file to see which functions are being used from the `functions.ts` and `couchbase.ts` files. 

Besides creating the HTML component to render the blog postings listing page, this file also introduces two new functions: `tagCount` and `isSamePath`. The `tagCount` function will count the number of posts that have a specific tag, and the `isSamePath` function will check if the current path matches the provided path. The latter is used to determine what information to display about each tag, while the former is used to display the number of posts associated with each tag.

Only the relevant parts of the file are shown here. You can find the full file [on GitHub](https://github.com/hummusonrails/personal-site/blob/eee2bb58d3e59067bb0a785bc2967ef8da69759d/src/layouts/ListWithTagsLayout.astro).

```typescript
---
import { fetchAndSortBlogPosts, excludeDrafts } from '../functions';
import { getTags } from '../db/couchbase';
import Link from "../components/Link.astro";
import Pagination from "../components/Pagination.astro";
import RootLayout from "./RootLayout.astro";
import Tag from "../components/Tag.astro";
import FormattedDate from "../components/FormattedDate.astro";

interface Props {
    title: string;
    description: string;
    page: Page<CollectionEntry<'blog'>[]>;
}

const tags = await getTags();
const posts = await fetchAndSortBlogPosts();
const filteredPosts = posts.filter(excludeDrafts);

function tagCount(slug) {
    return filteredPosts.filter((post) => post.tags.includes(slug)).length;
}

function isSamePath(path) {
    return Astro.url.pathname === path;
}

const { title, description, page } = Astro.props;
const hasDefaultSlot = Astro.slots.has('default');
const isBlogPage = Astro.url.pathname.startsWith('/blog');
---
```

#### Update `./src/layouts/PostLayout.astro`

This Astro layout renders the individual blog post page. You will update the `PostLayout.astro` layout to fetch individual blog posts from Couchbase instead of using the Astro content collection just like you did in the `ListWithTagsLayout.astro` layout. Again, take a look at the `import` statements to see which functions are being used from the `functions.ts` and `couchbase.ts` files.

In addition, the rendering of the main blog post content which is fetched from the Couchbase document is done by using the `marked` package to convert the markdown content to HTML. The `set:html` directive is used to render the HTML content in the Astro layout.

The full file can be found [on GitHub](https://github.com/hummusonrails/personal-site/blob/eee2bb58d3e59067bb0a785bc2967ef8da69759d/src/layouts/PostLayout.astro)

```typescript
---
import { Image } from "astro:assets";
import SectionContainer from "../components/SectionContainer.astro";
import PageTitle from "../components/PageTitle.astro";
import Link from "../components/Link.astro";
import RootLayout from "./RootLayout.astro";
import FormattedDate from "../components/FormattedDate.astro";
import Tag from "../components/Tag.astro";
import ScrollTopAndComments from "../components/ScrollTopAndComments.astro";
import { getAuthor, getTags } from "../db/couchbase";
import { marked } from 'marked';


interface Props {
  post: any;
  next?: any;
  prev?: any;
}

const { post, next, prev } = Astro.props as Props;
const authors = await Promise.all(post.authors.map((author) => getAuthor(`authors_${author}`)));
const tags = await Promise.all(post.tags.map((tag) => getTags(tag)));

const content = post.content ? post.content : "";
---
<RootLayout title={post.title} description={post.summary}>
    // all of the layout content which can be found on GitHub

    // Render the blog post main body using the marked package to parse the markdown content
    <p set:html={marked.parse(content)} />

    // the rest of the layout content which can be found on GitHub
</RootLayout>
```

#### Update `./src/pages/blog/[...page].astro`

The `blog/[...page].astro` file is the blog index page that lists all the blog posts. You will update the `blog/[...page].astro` file to fetch blog post listings from Couchbase. 

```typescript
---
import { fetchAndSortBlogPosts, excludeDrafts } from '../../functions';
import ListWithTagsLayout from "../../layouts/ListWithTagsLayout.astro";
import { ITEMS_PER_PAGE } from "../../consts";

export async function getStaticPaths({ paginate }) {
  const posts = await fetchAndSortBlogPosts();
  const filteredPosts = posts.filter(excludeDrafts);
  return paginate(filteredPosts, { pageSize: ITEMS_PER_PAGE });
}

const { page } = Astro.props;
---
<ListWithTagsLayout title="Blog" page={page} />
```

#### Update `./src/pages/tags/[slug]/[...page].astro`

The `tags/[slug]/[...page].astro` file is the tag page that lists all the blog posts associated with a specific tag. You will update the `tags/[slug]/[...page].astro` file to fetch blog post listings by tag from Couchbase. Take note of the functions introduced prior to creating the HTML layout to help normalize the tag data. The `formatTagId` function can be modified to suit your own project's needs.

```typescript
---
import { type Page, type CollectionEntry } from 'astro:content';
import ListWithTagsLayout from "../../../layouts/ListWithTagsLayout.astro";
import { ITEMS_PER_PAGE } from "@/consts";
import { getTagBySlug } from '../../../db/couchbase';
import { fetchAndSortBlogPosts, excludeDrafts } from '../../../functions';

interface Props {
    page: Page<CollectionEntry<'blog'>>;
    tag: string;
    slug: string;
}

function formatTagId(slug) {
  const specialCases = {
    'ai': 'AI',
    'github': 'GitHub',
    'devrel': 'DevRel',
  };
  if (specialCases[slug.toLowerCase()]) {
    return `tag_${specialCases[slug.toLowerCase()]}`;
  }
  return `tag_${slug.charAt(0).toUpperCase() + slug.slice(1)}`;
}

export async function getStaticPaths({ paginate }) {
  const posts = await fetchAndSortBlogPosts();
  const filteredPosts = posts.filter(excludeDrafts);

  // Get unique tags from posts
  const tags = [...new Set(filteredPosts.flatMap(post => post.tags))];

  const paths = tags.flatMap(tag => {
    const tagPosts = filteredPosts.filter(post => post.tags.includes(tag));
    const paginatedTagPosts = paginate(tagPosts, { pageSize: ITEMS_PER_PAGE, params: { slug: tag } });

    return paginatedTagPosts.map(page => ({
      params: { slug: tag, page: page.currentPage ? page.currentPage.toString() : '1' },
      props: { page, tag }
    }));
  });

  return paths;
}

const { page, tag } = Astro.props;
const formattedTagId = formatTagId(tag);
const tagData = await getTagBySlug(formattedTagId);

if (!tagData) {
  console.error(`Tag data not found for: ${formattedTagId}`);
} else {
  console.log(`Tag data: ${JSON.stringify(tagData, null, 2)}`);
}
---
<ListWithTagsLayout title={`Posts tagged with "${tagData?.name || 'Unknown'}"`} page={page.props.page} description={tagData?.description || ''}>
</ListWithTagsLayout>
```

Similar refactoring is done to the `tags/index.astro` file and can be found in full [on GitHub](https://github.com/hummusonrails/personal-site/blob/9caed563c7e5bfee5cb33a2694e8849df9a47e8a/src/pages/tags/index.astro) as well.

#### Update `./src/pages/rss.xml.js`

Lastly, let's update the `rss.xml.js` to update the RSS feed to also use the Couchhbase data. The only update that must be made to the file is to import the data using the functions `fetchAndSortBlogPosts` and `excludeDrafts` from the `functions.ts` file instead of using the `getCollection` function from the Astro content collection. Everything else can remain the same.

```typescript
import { fetchAndSortBlogPosts, excludeDrafts } from '../functions';
```

Wow, that was a lot of updating, but you did it! You have successfully updated your Astro site to fetch data from Couchbase instead of from the static markdown files. You can now run your site and see the changes in action.

The last bit you may be wondering is how do you go about adding new blog posts in this revised setup? Let's walk through one way to do that.

## Adding New Blog Posts

There is a lot of convenience to writing blog content in markdown. One advantage is that you can easily export markdown content from your own blog and cross-post it to other platforms. Markdown is well recognized and supported across many platforms, and many content writers and developers are familiar with it, which opens up your content for collaboration. As such, let's build a workflow for new blog posts that still has you writing your content in markdown.

What will the process look like when we are finished?

1. You will write your blog post in markdown and submit a new pull request to a dedicated blog posts repository in your GitHub account.
2. When you are ready to merge the pull request, you will add a `publish` label to the pull request.
3. The combination of the merged pull request with the `publish` label will trigger a GitHub Actions workflow that will convert the markdown content to JSON and submit it in the Couchbase database.

Sound good? Let's get started!

### Step 1: Create a New Repository for Blog Posts

First, create a new repository in your GitHub account to store your blog posts. You can name it something like `blog-posts`. This repository will be used to store the markdown files for your blog posts.

The structure for the repository should look like this:

```
blog-posts/
  └── .github/
     └── workflows/
       └── import-posts.yml
     └── actions/
       └── import-posts/
         └── src/
           └── importPosts.js
  └── drafts/
      └── post-1.md
      └── post-2.md
      └── ...
  └── published/
      └── post-3.md
      └── post-4.md
      └── ...
```

The `drafts` folder will store all the markdown files for your blog posts that are still in draft mode. The `published` folder will store all the markdown files for your published blog posts. While, the GitHub Actions workflow will be stored in the `.github/workflows` folder and the script to convert the markdown files to JSON will be stored in the `actions/import-posts/src` folder.

### Step 2: Create a GitHub Actions Workflow

Next, create a new file called `import-posts.yml` in the `.github/workflows` folder of your `blog-posts` repository. This file will define the GitHub Actions workflow that will convert the markdown files to JSON and submit them to the Couchbase database.

```yaml
name: Import Blog Posts to Couchbase

on:
  pull_request:
    types: [closed]

jobs:
  import:
    if: github.event.pull_request.merged == true && contains(github.event.pull_request.labels.*.name, 'publish')
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install gray-matter couchbase dotenv

      - name: Import blog posts
        run: node .github/actions/import_posts/src/importPosts.js
        env:
          COUCHBASE_URL: ${{ secrets.COUCHBASE_URL }}
          COUCHBASE_USERNAME: ${{ secrets.COUCHBASE_USERNAME }}
          COUCHBASE_PASSWORD: ${{ secrets.COUCHBASE_PASSWORD }}
          COUCHBASE_BUCKET: ${{ secrets.COUCHBASE_BUCKET }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

You will notice that the workflow requires four secrets to be set in your repository. One of them, `GITHUB_TOKEN` is automatically available to your repository and you do not need to set it up. The other three, `COUCHBASE_URL`, `COUCHBASE_USERNAME`, and `COUCHBASE_PASSWORD` are the same credentials you used to connect to the Couchbase database in the `couchbase.ts` file. You can set these secrets in the repository settings under `Settings > Secrets`.

### Step 3: Create the Import Script

Now, let's create the import script that the action will use. It will be very similar to the one you created way back when you began this journey. Create a new file called `importPosts.js` in the `actions/import-posts/src` folder of your `blog-posts` repository. The primary difference is that this script will read the markdown files from the `published` folder and submit them to the Couchbase database and when finished move the migrates files to the `published/` folder. It also includes more error handling and logging to ensure that the process is smooth.

```javascript
const dotenv = require("dotenv");
dotenv.config();
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const couchbase = require('couchbase');

// Couchbase connection setup
let collection;

async function connectToCluster() {
  const cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
    username: process.env.COUCHBASE_USERNAME,
    password: process.env.COUCHBASE_PASSWORD,
    configProfile: "wanDevelopment",
  });
  const bucket = cluster.bucket(process.env.COUCHBASE_BUCKET);
  collection = bucket.defaultCollection();
}

// Directories in the repository
const draftsDir = './drafts';
const publishedDir = './published';

// Get all Markdown files in the drafts directory
const getMarkdownFiles = (dir) => {
  try {
    const files = fs.readdirSync(dir).filter(file => /\.(md|mdx)$/.test(file));
    if (files.length === 0) {
      console.error(`No Markdown files found in directory: ${dir}`);
      throw new Error('No Markdown files found.');
    }
    return files;
  } catch (error) {
    console.error(`Error reading directory: ${error.message}`);
    return [];
  }
};

// Read the content of a Markdown file
const readMarkdownFile = async (fileName, dir) => {
  const filePath = path.join(dir, fileName);
  return await fs.promises.readFile(filePath, 'utf-8');
};

// Parse the frontmatter and content of a Markdown file
const parseMarkdown = (content) => {
  const { data, content: markdownContent } = matter(content);
  return { ...data, content: markdownContent };
};

// Store the blog post in Couchbase
const storeBlogPost = async (post) => {
  try {
    const generatePostId = (post) => {
      return `blog_${post.title.replace(/\s+/g, '-').toLowerCase()}_${Date.parse(post.date)}`;
    };

    const id = generatePostId(post);
    await collection.upsert(id, { ...post, type: 'blogPost' });
    console.log(`Inserted or updated: ${id}`);
  } catch (error) {
    console.error(`Error storing blog post: ${error.message}`);
  }
};

// Move a file from the drafts directory to the published directory
const moveFileToPublished = async (fileName) => {
  const oldPath = path.join(draftsDir, fileName);
  const newPath = path.join(publishedDir, fileName);

  if (fs.existsSync(oldPath)) {
    try {
      await fs.promises.rename(oldPath, newPath);
      console.log(`File ${fileName} moved to published directory.`);
    } catch (error) {
      console.error(`Error moving file: ${error.message}`);
    }
  } else {
    console.error(`File ${oldPath} does not exist.`);
  }
};

// Migrate Markdown files to Couchbase and move them to the published folder
const migrateMarkdownToCouchbase = async () => {
  await connectToCluster();

  const files = getMarkdownFiles(draftsDir);

  for (const file of files) {
    const content = await readMarkdownFile(file, draftsDir);
    const parsedData = parseMarkdown(content);  // Parse the markdown content
    try {
      await storeBlogPost(parsedData);
    } catch (error) {
      console.error(`Error storing blog post: ${error.message}`);
      throw error;
    }
    try {
      await moveFileToPublished(file);
    } catch (error) {
      console.error(`Error moving file: ${error.message}`);
      throw error;
    }
  }

  console.log('Migration completed.');
};

// Execute the migration
migrateMarkdownToCouchbase().catch(console.error);
```

At this point, you have a workflow that will automatically convert markdown files to JSON and submit them to the Couchbase database when you merge a pull request with the `publish` label. You can now write your blog posts in markdown, submit them as pull requests to the `blog-posts` repository, and merge them when you are ready to publish. An additional benefit of this setup is that you have separated the blog content from the site codebase, making it easier to manage and collaborate on.

## Conclusion

In this tutorial, you learned how to migrate your existing blog posts from markdown files to Couchbase and update your Astro site to fetch data from Couchbase instead of from the static markdown files. You also learned how to create a workflow for adding new blog posts by writing them in markdown and submitting them as pull requests to a dedicated repository. 

You have accomplished quite a lot in this tutorial! Your Astro blog is now capable of handling flexible types of content that doesn't necessarily conform to a single schema, and while using Couchbase as your database backend, you have also introduced more optimization, scalability and speed to your site.

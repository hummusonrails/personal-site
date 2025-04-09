---
title: "Add Vector Search to Your Astro Blog"
date: "2024-05-24"
summary: "Learn how to transform user queries into vectors and search for similar content in your Astro blog. Turn user uncertainty into certainty with vector search."
tags: ["tutorial"]
image: "https://dev-to-uploads.s3.amazonaws.com/uploads/articles/pm8hf3a2n2swc171v3kp.png"
authors: ["default"]
---
  
  ![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/pm8hf3a2n2swc171v3kp.png)

Users expect a lot more nowadays when they search on any website. They want to find the most relevant content quickly and easily. They want the website to understand what they were looking for, even if they do not know exactly what they want. In other words, traditional keyword search is often not enough anymore.

When we talk about different search methodologies, there are a few primary options:

1. **Keyword Search**: This is the most common search method. It is based on the user's query and the content of the website. The search engine looks for the exact match of the query in the content and returns the results.
2. **Semantic Search**: This search method takes queries and turns them into dense vectors using methods like word embeddings or contextual embeddings. These dense vectors capture the meaning of words and phrases. Embedding models, trained on large datasets, understand the context and relationships between words, converting text into dense vectors that reflect semantic similarity.
3. **Vector Search**: Vector search efficiently retrieves similar items from a large dataset by converting data into dense vectors and finding the nearest vectors to the query using methods like cosine similarity. This method is similar to semantic search but instead of looking for conceptually similar items, it looks for items with a similar vector representation. 

There is also **hybrid search**, which combines multiple search methods to provide the best results. 

In this tutorial, we are going to focus on converting a search function in an Astro-powered blog into a vector search. We will use OpenAI embeddings to convert the content of the blog posts into vectors, store them in a vector database on Couchbase, and then build the search functionality to find similar posts based on the user query.

If you are looking for definitions of Astro, Couchbase, and how to get started with either of them, I encourage you to check out my first blog post on this topic [Launching Your Astro Powered Blog on a Journey to Couchbase](https://www.bengreenberg.dev/blog/blog_launching-your-astro-powered-blog-on-a-journey-to-couchbase_1716076800000) where I cover detailed step-by-step instructions on how to set up your Astro blog and Couchbase database.

Ready to get started? Let's go!

*tl;dr You can find the full Astro site with the revisions [on GitHub](https://github.com/hummusonrails/personal-site) if you just want to skip to the code.*

## Overview of the Process

Here is a high-level overview of the process we will follow:

1. **Convert Blog Posts into Vector Embeddings**: We will use the OpenAI embeddings API to convert the content of the blog posts into vector embeddings.
2. **Store Embeddings in Couchbase**: We will store the embeddings in our Couchbase database.
3. **Add Vector Search Index**: We will create a search index in Couchbase to search for similar embeddings.
4. **Build the Search Functionality**: We will build the search functionality in our Astro blog to find similar posts based on the user query using the Couchbase Node.js SDK.
5. **Create a Search API**: We will create an API to execute the search for our Astro blog.

First, let's write the code to convert our blog posts into vector embeddings.

## Convert Blog Posts to Vector Embeddings

We will use the OpenAI embeddings API to convert the content of the blog posts into vector embeddings. You will need to sign up for an API key on the OpenAI website to use the API. You will need to provide your credit card information as there is a cost associated with using the API. You can review the pricing on the [OpenAI website](https://openai.com/api/pricing/). There are alternatives to generate embeddings. [Hugging Face](https://huggingface.co/) provides [SentenceTransformers](https://huggingface.co/sentence-transformers) to create embeddings from text, and Hugging Face is free to use for non-commercial personal use. For the purpose of this tutorial, though, we will be using the OpenAI embeddings API.

Similar to when we converted our existing markdown blog posts into a JSON format for Couchbase in the previous tutorial, we will be writing a script to convert our existing JSON blog post documents into vector embeddings. Let's start by creating a new file in `./scripts` called `generateEmbeddings.js`.

In the script, we will begin by including the necessary libraries we will use:

```javascript
import dotenv from 'dotenv';
dotenv.config();

import couchbase from 'couchbase';
import { OpenAI } from "openai";
import { encoding_for_model } from 'tiktoken';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

First, we introduced `dotenv` to load our environment variables. Then, we included the `couchbase` and `openai` SDKs to interact with Couchbase and OpenAI, respectively. We also imported the `encoding_for_model` function from the `tiktoken` library, which we will use to calculate the amount of tokens needed for each blog post. We will use that calculation to determine how much we can send to the OpenAI API in one request. More on that last bit later.

Next, we will connect to our Couchbase cluster and bucket:

```javascript
let cluster;
async function init() {
  if (!cluster) {
    cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
      username: process.env.COUCHBASE_USERNAME,
      password: process.env.COUCHBASE_PASSWORD,
      configProfile: "wanDevelopment",
    });
  }
  return cluster;
}
```

If you are coming from the [previous tutorial](https://www.bengreenberg.dev/blog/blog_launching-your-astro-powered-blog-on-a-journey-to-couchbase_1716076800000), this will be very familiar to you. We are connecting to our Couchbase cluster using the environment variables we set up in the `.env` file and returning the cluster object.

Then, let's create a function to get all the blog posts from the Couchbase bucket:

```javascript
async function getBlogPosts() {
  const cluster = await init();
  const query = 'SELECT META().id, title, content FROM `blogBucket` WHERE type = "blogPost"';
  const result = await cluster.query(query);
  return result.rows;
}
```

This function will return all the blog posts from the Couchbase bucket. We are querying the bucket for documents with the type `blogPost` and returning the `id`, `title`, and `content` of each document. For your own blog, make sure to adjust the query to match the structure of your documents.

Lastly, let's define two functions, one that will generate embeddings for a blog post, and the second one that will store the embeddings in the Couchbase bucket:

```javascript
async function generateEmbeddings(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

async function storeEmbeddings(postId, embeddings) {
  const cluster = await init();
  const bucket = cluster.bucket('blogBucket');
  const collection = bucket.defaultCollection();
  const docId = `embedding::${postId}`;
  await collection.upsert(docId, { type: 'embedding', embeddings });
}
```

In this example, we are using the `text-emdedding-ada-002` model to generate embeddings for the blog post content. You can experiment with [different models](https://platform.openai.com/docs/guides/embeddings/embedding-models) to see which one works best for your use case. We are storing the embeddings in the Couchbase bucket with the document ID `embedding::${postId}` and a `type` of `embedding`.

Now, we're ready to put that all together in a `main` function and invoke it at the bottom of the script:

```javascript
async function main() {
  const MAX_TOKENS = 8192;
  const encoding = encoding_for_model('text-embedding-ada-002');
  const posts = await getBlogPosts();

  for (const post of posts) {
    const postId = post.id;
    let content = post.content;
    
    // Calculate tokens and shorten if necessary
    while (encoding.encode(content).length > MAX_TOKENS) {
      content = content.slice(0, -100);
    }
    
    const embeddings = await generateEmbeddings(content);
    await storeEmbeddings(postId, embeddings);
    console.log(`Processed and stored embeddings for post ${postId}`);
  }
}

main().catch(console.error);
```

In the `main` function, we are getting all the blog posts from the Couchbase bucket, iterating over each post, generating embeddings for the content, and storing the embeddings in the Couchbase bucket. 

We are also calculating the number of tokens for each blog post and shortening the content for the embedding generation if it exceeds the maximum number of tokens allowed by the OpenAI API. This is one approach to dealing with a token exceeded error that you may get for longer blog posts. Another option would be to split the content into smaller chunks and send them separately to the API, and then concatenate the embeddings at the end. Both approaches have their trade-offs, so you may need to experiment to see which one works best for your use case.

When you run this script from your console with `node ./scripts/generateEmbeddings.js`, it will generate embeddings for all the blog posts in your Couchbase bucket and store them in the bucket. The output will look similar to:

```
Processed and stored embeddings for post..
Processed and stored embeddings for post..
Processed and stored embeddings for post..
```

That's it! You've successfully converted your existing blog posts into vector embeddings using the OpenAI embeddings API and stored them in your Couchbase bucket. In the next section, we will add a search index to Couchbase to search for similar embeddings.

## Add Vector Search Index

To search for similar embeddings in Couchbase, we need to create a search index. What is a search index? Couchbase search indexes enhance the performance of query and search operations. Each index makes a predefined subset of data available for the search. You can learn more about search indexes on the [Couchbase docs](https://docs.couchbase.com/cloud/search/create-search-indexes.html).

Navigate in your browser to your [Couchbase Capella](https://cloud.couchbase.com/sign-in) platform and sign in. Once you have signed in, click on your database storing your blog posts. In my example, my blog posts database is called `blogPosts`. Then click on `{ } Data Tools` from the top navigation bar and then select `Search` from the second navigation bar from the top. 

![view of the navigation bars](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/2c0ywp337wfehditfcs1.png)

Now, you should see a blue button on the right-hand side of the page that says `Create Search Index`. Go ahead and click that.

You will be presented with a set of options to define your search index. When you have concluded it should look similar, but not exact because your data will be different, to the following:

![search index creation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6wjqm5dnzkvtys0gp0sj.png)

First, name your search index something that you will remember. I called mine `blog_index`. Then, you will need to define the rest of the options.

In the example shown in the screenshot above, the bucket the index is being created on is `blogBucket`. This is the bucket where my blog posts are stored. You will need to adjust this to match the bucket where your blog posts are stored. The scope and collection are both defined as `_default`, which is the default scope and collection names for a bucket. If you have a different scope or collection name, you will need to adjust these values accordingly. 

Then, the document field that the index is being created on is `embeddings`. This is the field where the embeddings are stored in the blog post documents. Once you click on `embeddings` a second panel of options will open up on the right-hand side. These options can be left as they are, and just click `Add` in that panel. Once you click `Add`, you will see the type mappings defined on the bottom of the page. 

Once that is all done, simply click `Create` and you now have a search index in Couchbase to search for similar vectors in your blog posts!

You are now ready to build the search functionality in your Astro blog to find similar posts based on the user query. In the next section, we will build the search functionality.

## Build the Search Functionality

### Add a Search Bar to Your Blog

For my example, I have added a search bar to my `Header` component and it looks like this:

```html
<form action="/search" method="GET" class="flex">
    <input 
        type="text" 
        name="q" 
        placeholder="Ask the blog a question..." 
        class="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md"
    />
    <button 
        type="submit" 
        class="px-4 py-2 bg-primary-500 text-white rounded-r-md"
    >
        Search
    </button>
</form>
```

The header now renders like the screenshow below.

![screenshot of header](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/orm8ucr9vc4o3n2j909q.png)

### Create a New Search Page

Next, we will create a new search page in our Astro blog to display the search results. Create a new file in the `src/pages` directory called `search.astro` and add the following code:

```html
---
import RootLayout from '../layouts/RootLayout.astro';
import { SITE_METADATA } from '@/consts';

let searchResults = [];
let searchTerm = '';

// Get the query parameter on the server side
if (Astro.request) {
  const url = new URL(Astro.request.url);
  searchTerm = url.searchParams.get('q') || '';

  // Fetch data using the query parameter on the server side
  if (searchTerm) {
    const encodedSearchTerm = encodeURIComponent(searchTerm);
    const response = await fetch(`${import.meta.env.SEARCH_URL}/search?q=${encodedSearchTerm}`);
    searchResults = await response.json();
  }
}

// Function to render search results
const renderSearchResults = (results) => {
  if (!results || results.length === 0) {
    return `<p>No posts found.</p>`;
  }

  return results.map(post => `
    <li class="py-4" key="${post.id}">
      <article class="space-y-2 xl:grid xl:grid-cols-4 xl:items-baseline xl:space-y-0">
        <dl>
          <dt class="sr-only">Published on</dt>
          <dd class="text-base font-medium leading-6 text-gray-500 dark:text-gray-400">
            ${new Date(post.date).toLocaleDateString()}
          </dd>
        </dl>
        <div class="space-y-3 xl:col-span-3">
          <div>
            <h3 class="text-2xl font-bold leading-8 tracking-tight">
              <a href="/blog/${post.id}" class="text-gray-900 dark:text-gray-100">
                ${post.title}
              </a>
            </h3>
            <div class="flex flex-wrap">
              ${post.tags.map(tag => `
                <a href="/tags/${tag}" class="mr-2 mb-2 inline-block px-2 py-1 text-sm font-medium leading-5 text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200">
                  #${tag}
                </a>
              `).join('')}
            </div>
          </div>
          <div class="prose max-w-none text-gray-500 dark:text-gray-400">
            ${post.summary}
          </div>
        </div>
      </article>
    </li>
  `).join('');
}
---

<RootLayout title={SITE_METADATA.title} description={SITE_METADATA.description}>
  <div class="divide-y divide-gray-200 dark:divide-gray-700">
    <div class="space-y-2 pb-8 pt-6 md:space-y-5">
      <h1 class="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
        Search Results for "{searchTerm}"
      </h1>
    </div>
    <ul id="search-results" set:html={renderSearchResults(searchResults)}></ul>
  </div>
</RootLayout>
```

That's a lot, so let's break down the main parts. 

First, we grab the search term from the query parameter in the URL. We then fetch the search results from the server using the search term. If there is no search term, we display a message saying "No posts found." However, if there is a search term, we display the search results. All of that HTML is formatting the search results to be rendered on the page, and it is inserted into the `RootLayout` inside the `ul` element with the id `search-results`.

Did you notice that the search results come from a `fetch` request? This is because we are going to create a search API in the next section to execute the search for our Astro blog.

In this tutorial, I've separated out the search API from the blog itself. This is a common pattern to separate concerns and make the codebase more maintainable. You can host the search API on a different server, and supply the URL path in your `.env` file. This way, you can easily switch between different search APIs or services without changing the code in your blog.

### Create a Search API

*tl;dr You can find the full search API code [on GitHub](https://github.com/hummusonrails/couchbase-search-blog) if you just want to skip to the code.*

For the search API, we will create a relatively straightforward Express.js server that will handle the search requests. We will use the Couchbase Node.js SDK to connect to the Couchbase cluster and execute the search query.

First, let's define our dependencies:

```javascript
const express = require('express');
const couchbase = require('couchbase');
const cors = require('cors');
const openai = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());

const openaiclient = new openai({apiKey: process.env.OPENAI_API_KEY});
```

We are using `express` to create the server, `couchbase` to connect to the Couchbase cluster, `cors` to enable cross-origin requests, and `openai` to interact with the OpenAI API. We are also loading the environment variables from the `.env` file.

Our search API will do two things:

* Convert the search term into a vector embedding using the OpenAI embeddings API.
* Search for similar embeddings in the Couchbase bucket and return the search results.

First, though, let's make sure it can establish a connection to Couchbase. This code will be very familiar at this point:

```javascript
let cluster;
async function init() {
  if (!cluster) {
    cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
      username: process.env.COUCHBASE_USERNAME,
      password: process.env.COUCHBASE_PASSWORD,
      configProfile: "wanDevelopment",
    });
  }
  return cluster;
}
```

Next, we'll convert the search term into an embedding using the OpenAI embeddings API:

```javascript
async function generateQueryEmbedding(query) {
  const response = await openaiclient.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });
  return response.data[0].embedding;
}
```

Now, we need to fetch the embeddings from the Couchbase bucket and search for similar embeddings using the vector search functionality in Couchbase. This is done with the following function:

```javascript
async function getStoredEmbeddings(queryEmbedding) {
  const cluster = await init();
  const scope = cluster.bucket('blogBucket').scope('_default');
  const search_index = process.env.COUCHBASE_VECTOR_SEARCH_INDEX;

  const search_req = couchbase.SearchRequest.create(
    couchbase.VectorSearch.fromVectorQuery(
      couchbase.VectorQuery.create(
        "embeddings",
        queryEmbedding
      ).numCandidates(5)
    )
  )

  const result = await scope.search(
    search_index,
    search_req
  )
  
  return result.rows;
}
```

Let's break down that function a bit. The search is done on the `scope` level of the Couchbase bucket. A scope is a way to group collections within a bucket. If you recall, when we created the search index in our Capella platform dashboard, we defined a scope as well, which is the default scope, `_default`. This is why, at the end of this function we call the `.search` method on the `scope` object.

Near the top of the function, we create the search request: `const search_req`, etc. The search request uses the `SearchRequest.create()` method. The `SearchRequest.create()` method can take different types of search requests, and in this case, we are creating a vector query using `VectorSearch.fromVectorQuery()` method, which also accepts an argument of a vector query. We create the query with `VectorQuery.create()`, which takes the following arguments:

* The field in the document where the embeddings are stored. In our case, this is `embeddings`.
* The query embedding that we generated from the search term.

In our example, we are also setting the number of *candidates* to 5. A candidate is a document that is considered a potential match for the query. In effect, this will return up to 5 documents that are most similar to the query embedding.

Lastly, we create a function that then searches for the blog posts that correspond to the IDs of the documents returned from the vector search. The function returns those blog posts:

```javascript
async function searchBlogPosts(query) {
  const queryEmbedding = await generateQueryEmbedding(query);
  const storedEmbeddings = await getStoredEmbeddings(queryEmbedding);


  const cluster = await init();
  const bucket = cluster.bucket('blogBucket');
  const collection = bucket.defaultCollection();
  const results = await Promise.all(
    storedEmbeddings.map(async ({ id }) => {
      const docId = id.replace('embedding::', '');
      const result = await collection.get(docId);
      return result.content;
    })
  );

  return results;
}
```

We put that all together in a `GET` route that will handle the search requests with some additional error handling:

```javascript
app.get('/search', async (req, res) => {
  const searchTerm = req.query.q || '';
  if (!searchTerm) {
    return res.status(400).json({ error: 'No search term provided' });
  }

  try {
    const searchResults = await searchBlogPosts(searchTerm);
    res.json(searchResults);
  } catch (err) {
    console.error('Error searching blog posts:', err);
    res.status(500).json({ error: 'Error searching blog posts' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

At this point, you have created everything you need for a vector search on your own site! In our example, we created this for search functionality on a blog, but the potential uses are endless. You could use this for a product search, a search for similar music or movies, or even search for similar code snippets. It's all up to what you are intending to build.

One possible implementation route is to deploy this search API separately from where you deploy your blog or site. For example, you may deploy your site to a static site host like Vercel or Netlify, and deploy your search API to a serverless platform like AWS Lambda or Google Cloud Functions or Render. This way, you maximize the benefits of each platform and keep your concerns separated.

## Conclusion

In this tutorial, we learned how to convert a search function in an Astro-powered blog into a vector search. We used the OpenAI embeddings API to convert the content of the blog posts into vector embeddings, stored them in a vector database on Couchbase, and built the search functionality to find similar posts based on the user query. We also created a search API to execute the search for our Astro blog.

You have done quite a lot in this journey. Your blog is now capable of handling less than certain user queries and returning relevant content to the user. There is a still a lot more that can be done to improve further the search functionality, perhaps by introducing hybrid search, but in the meantime you can celebrate your accomplishment!
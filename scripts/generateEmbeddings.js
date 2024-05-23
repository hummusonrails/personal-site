import dotenv from 'dotenv';
dotenv.config();

import couchbase from 'couchbase';
import { OpenAI } from "openai";
import { encoding_for_model } from 'tiktoken';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

async function getBlogPosts() {
  const cluster = await init();
  const query = 'SELECT META().id, title, content FROM `blogBucket` WHERE type = "blogPost"';
  const result = await cluster.query(query);
  return result.rows;
}

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

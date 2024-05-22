import dotenv from 'dotenv';
dotenv.config();

import couchbase from 'couchbase';
import { OpenAI } from "openai";

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

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
// const bucket = cluster.bucket('blogBucket');
// const collection = bucket.defaultCollection();

async function getBlogPosts() {
  const cluster = await init();
  const query = 'SELECT META().id, title, content FROM `blogBucket` WHERE type = "blogPost"';
  const result = await cluster.query(query);
  return result.rows;
}

function splitTextIntoChunks(text, maxTokens = 8192) {
    const words = text.split(' ');
    const chunks = [];
    let chunk = [];
    let chunkLength = 0;
  
    for (const word of words) {
      const wordLength = word.length + 1;
      if (chunkLength + wordLength > maxTokens) {
        chunks.push(chunk.join(' '));
        chunk = [];
        chunkLength = 0;
      }
      chunk.push(word);
      chunkLength += wordLength;
    }
  
    if (chunk.length > 0) {
      chunks.push(chunk.join(' '));
    }
  
    return chunks;
}

async function generateEmbeddings(text) {
    const chunks = splitTextIntoChunks(text, 8192);
    const embeddings = [];
  
    for (const chunk of chunks) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: chunk,
      });
      embeddings.push(response.data[0].embedding);
    }
  
    // Average the embeddings of all chunks
    // This combines the embeddings of all chunks into a single embedding
    const combinedEmbedding = new Array(embeddings[0].length).fill(0);
    embeddings.forEach(embedding => {
      embedding.forEach((value, index) => {
        combinedEmbedding[index] += value;
      });
    });
    for (let i = 0; i < combinedEmbedding.length; i++) {
      combinedEmbedding[i] /= embeddings.length;
    }
  
    return combinedEmbedding;
}

async function storeEmbeddings(postId, embeddings) {
  const cluster = await init();
  const bucket = cluster.bucket('blogBucket');
  const collection = bucket.defaultCollection();
  const docId = `embedding::${postId}`;
  await collection.upsert(docId, { type: 'embedding', embeddings });
}

async function main() {
  const posts = await getBlogPosts();
  for (const post of posts) {
    const postId = post.id;
    const content = post.content;
    const embeddings = await generateEmbeddings(content);
    await storeEmbeddings(postId, embeddings);
    console.log(`Processed and stored embeddings for post ${postId}`);
  }
}

main().catch(console.error);

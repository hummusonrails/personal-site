---
title: "Vector Search Is Still the Memory Layer Agents Actually Need"
date: '2026-08-27'
summary: >-
  When I was working on Vector Search with JavaScript, vector search was a hot topic. By the time the ...
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/vector-search-is-still-the-memory-layer-agents-actually-need-50dn'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fu6tdvdadgk26u0rpias8.png'
---

When I was working on [*Vector Search with JavaScript*](https://pragprog.com/titles/bgvector/vector-search-with-javascript/), vector search was a hot topic. By the time the  book was published some people had begun saying that because of LLMs and their advances, we have moved beyond vector search.

This couldn't be farther from the truth. LLMs and agentic development is amazing, but it often gets things wrong. They don't fail because the model is weak always, but they fail because the right context can be sitting somewhere else and they had no idea that it existed.

Your docs are in one place. Tool outputs are in another. Prior decisions are in chat history, issue comments, `AGENTS.md`, local files, and half a dozen API responses. You can paste more into the prompt, but that gets expensive and messy fast.

Vector search gives agents a memory layer they can inspect, query, move, and rebuild.

That still matters in an LLM-first world.

The [Agentic AI Foundation](https://aaif.io) is a good place to frame this because AAIF is about open agentic infrastructure: MCP, goose, AGENTS.md, agentgateway, and the protocols around them. If agents are going to work across tools and runtimes, memory can’t live as a hidden feature inside one hosted product. It needs to be part of the system you can reason about.

### The prompt is the wrong database

A prompt is a request. It’s not a storage layer.

Once you treat the prompt as storage, every workflow starts to rot. You add summaries. Then summaries of summaries. Then a “context” block, and then a "context" block for the original context block.

That doesn’t scale for project-specific agents.

You need retrieval that can answer questions like:

Which migration introduced this column?

What did the tool return the last time this failed?

Which internal doc explains this service boundary?

What did we decide about auth in the previous session?

Why does that happen? Because agents need working memory and reference memory at the same time. The model can reason over the current task, but your project context lives outside the model. Vector search gives you a way to fetch the few pieces that match the current intent instead of dragging the whole project into every turn.

### MCP makes retrieval a first-class interface

[MCP](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro) gives AI applications a standard way to connect to external systems. MCP servers can expose tools and resources, and resources are identified by URIs in the spec.

That maps cleanly to vector search.

You can build an MCP server with tools like:

`search_project_context(query, filters)`

`fetch_context_chunk(uri)`

`upsert_tool_result(source, content, metadata)`

`list_context_sources(project_id)`

The vector database doesn’t need to know about the agent. The agent doesn’t need to know about the vector database. MCP becomes the contract between them.

That contract matters when you want portability. Today your agent might run in an IDE. Tomorrow it might run in a local runtime like [goose](https://aaif.io/projects/goose). The retrieval layer should move with you.

### What should go into agent memory?

Start with the things you already look up manually.

Index your docs, READMEs, runbooks, schema notes, generated API references, issue threads, and selected tool outputs. Store the raw text or clean markdown. Keep metadata with every chunk: source URI, file path, repo, commit SHA when you have it, timestamp, author if useful, and content type.

Then be strict about retrieval.

Don’t return anonymous chunks. Return chunks with source links.

Don’t rely on similarity alone. Use metadata filters.

Don’t treat old context and new context equally. Add recency where the domain changes.

Don’t make the agent trust memory blindly. Give it enough source data to quote the file, open the URI, or ask for confirmation before making a risky change.

Vector search is useful because it’s probabilistic. Agent memory is useful when that probability is wrapped in provenance.

### A small useful pattern

A practical agent memory loop can stay straightforward.

First, chunk source material by meaning, not by arbitrary token count. Function-level chunks work better than splitting every thousand characters in code-heavy repos. Section-level chunks work better for docs.

Then embed each chunk and store it with metadata.

At runtime, the agent turns the current task into a retrieval query. The MCP server searches the vector index, filters by project or source type, and returns a small set of candidates with scores and URIs. The agent fetches the best chunks, reads them, and decides what to do next.

That’s enough for many workflows.

You can add hybrid search when exact identifiers matter. You can add reranking when your top results are noisy. You can add write-back when tool results become useful future context. But the base shape stays the same: retrieve, inspect, act.

### Vector search also makes memory debuggable

When an agent gives a bad answer, you need to know whether the reasoning failed or retrieval failed.

Those are different problems.

If retrieval returned the wrong chunks, fix chunking, filters, metadata, or ranking. If retrieval returned the right chunks and the model ignored them, fix the prompt or tool policy. If the index is stale, fix ingestion.

Without an inspectable retrieval layer, all of that collapses into “the agent was wrong.”

You can log the query, returned chunk IDs, scores, metadata filters, and final sources used. You can replay the retrieval step without running the full agent. You can delete bad documents from the index. You can rebuild from source.

That is what I would call operational memory.

Vector search didn’t become obsolete because models got better. It became more useful because agents now have more places to look.

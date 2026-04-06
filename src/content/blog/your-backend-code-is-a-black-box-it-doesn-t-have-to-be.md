---
title: "Your backend code is a black box. It doesn't have to be."
date: '2026-04-01'
summary: >-
  Your API takes inputs and returns outputs. The logic in between? Nobody outside your team can verify it. Regulators read the documentation you wrote about it. Partners call your endpoint and trust the
tags:
  - slug: posts
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2039263884125560917'
images: 'https://pbs.twimg.com/media/HEzqD8PaAAAO-gR.jpg'
---

Your API takes inputs and returns outputs. The logic in between? Nobody outside your team can verify it. Regulators read the documentation you wrote about it. Partners call your endpoint and trust the response. Users don't even get that.

This has worked for decades. But there's a growing category of backend logic where "trust us" isn't enough. Scoring algorithms, compliance checks, eligibility rules, validation pipelines. **Anywhere someone needs to independently confirm that your code does what you say it does.**

You don't have a code problem. You have a verifiability problem.

## The case for publicly auditable code

![](https://pbs.twimg.com/media/HEzp1x2akAAKoCh.jpg)

Most backend engineers don't think about code auditability because most code doesn't need it. Your CRUD endpoints, your auth flows, and your data transformations are internal concerns. Nobody outside your org needs to verify them.

But some functions carry weight. A scoring algorithm that determines loan eligibility. A validation pipeline that checks regulatory compliance. A pricing engine that partners depend on. For these functions, the standard answer is documentation: you write a spec, maybe you share pseudocode, and everyone agrees to trust that the running code matches the paper.

**That's not verification. That's trust with extra steps.**

Publicly auditable code means anyone can call the same function with the same inputs and confirm they get the same outputs. The logic is visible. Execution is deterministic. And the code can't change silently after deployment.

This isn't a new idea. Open source gives you code visibility. But open source doesn't prove that the code running in production is the same code in the repo. You need a runtime where the deployed code is the source of truth, and where every execution is independently reproducible.

That runtime exists. And you don't need to learn a new language to use it.

## **Rust in, verifiable execution out**

When most engineers hear "deploy code onchain," they picture learning Solidity, memorizing transaction fee ("gas") optimization tricks, and rewriting working logic in an unfamiliar language. That's a reasonable reason to stop listening.

Arbitrum Stylus skips that detour. **You write in your preferred production-ready language, compile to WASM, and deploy it to a blockchain that's optimized for low-cost computation. **Your existing toolchain, your existing crates, your existing mental model. The contract runs alongside Solidity smart contracts with shared state, but you never need to touch Solidity yourself.

This isn't about converting you to crypto. It's about giving you a deployment target where execution is publicly verifiable by default.

Three properties matter here:

Every execution is independently auditable. Anyone can call the contract with the same inputs and confirm they get the same outputs. **No trust required.**

The logic is immutable. Once deployed, the code can't change silently. If you push an update, that's a new deployment with its own address and its own history. No, "we patched it last Tuesday but forgot to tell you."

Execution is deterministic. Same inputs, same outputs, every time, on every node. No environment-specific drift, no floating point surprises across hardware.

## **What the architecture looks like**

I built a scoring engine to test this pattern. The architecture splits cleanly between what stays in your infrastructure and what moves onchain:

Your backend stays exactly where it is. An Axum API server handles business rules, authentication, and request routing. Normal backend work. The only difference is that when the API needs a computation verified, it calls an onchain contract instead of a local function.

The onchain piece is a Stylus contract. It takes parameters, runs the calculation, and returns results. No state storage, just pure computation. Think of it as a function you deploy instead of host.

A shared Rust crate holds the type definitions and compiles for both environments. The contract uses `no_std` for WASM. The API server uses `std` for native. **Same types, both sides. The compiler guarantees they match.** No serialization mismatches, no type drift between your API and your contract.

One language across the entire stack. The chain boundary becomes a function call, not a language barrier.

## **The performance question**

The first objection any backend engineer raises: what's the overhead?

Fair. Onchain computation has historically been expensive. That's the whole reason Solidity exists. It was designed to minimize execution cost on the EVM.

Stylus changes the math. WASM execution on Arbitrum is dramatically cheaper than EVM execution for compute-heavy workloads. **The scoring engine used over 90% less gas than the equivalent Solidity contract** performing the same work. Storage operations cost the same either way, but iterative math, weighted calculations, and loop-heavy logic is where WASM pulls ahead.

![](https://pbs.twimg.com/media/HEzpvL5a4AACH-8.jpg)

This isn't a contrived benchmark. RedStone, an oracle provider, published similar results after porting their verification logic to Stylus. Compute-intensive work is where this architecture pays for itself.

## **Where auditable code matters**

Not every function belongs onchain. But some backend logic sits in a category where "trust me" isn't good enough:

Scoring and risk calculations, where regulators want to audit the exact computation, not a description of it. Eligibility determinations, where partners want to verify outcomes independently instead of trusting your API response. Compliance validation, where auditors want proof that the logic running today is the same logic approved last quarter. Data pipelines, where counterparties want to confirm their data has passed through agreed-upon rules.

**If you've ever written documentation explaining how your algorithm works so someone else could trust it, that's the function that belongs onchain.** Let them verify the code instead of reading your summary of the code.

The scoring engine I built is one example of this pattern. But the pattern is the point, not the example. Any pure function where independent verification adds value is a candidate.

## **What you'd actually do on a Monday morning**

If you write Rust, the learning curve is smaller than you think.

Install `cargo-stylus`, which handles compilation and deployment. Write your function with `#[entrypoint]` and `#[public]` macros. Compile to WASM. Deploy to a testnet. Call it from your existing API using an RPC endpoint.

Your database, your auth, your business logic, none of that moves. You add a function that runs somewhere verifiable rather than somewhere trusted. Everything else stays the same.

The scoring engine repo has working code, setup instructions, and benchmarks comparing three execution paths: onchain Stylus, onchain Solidity, and offchain Rust. It's a concrete starting point, but the approach applies anywhere you need auditable computation.

![](https://pbs.twimg.com/media/HEzp5qNaIAAU24j.jpg)

## **You're adding a deployment target, not adopting a new lifestyle**

**The shift is smaller than it sounds.** The same way you might deploy a function to Lambda for serverless execution or to a TEE for confidential computing, you deploy to Arbitrum for verifiable execution.

Your Rust skills transfer directly. Your toolchain stays the same. The only thing that changes is who can verify your logic: everyone.

If you've been dismissing onchain as irrelevant to backend work, spend thirty minutes with the repo. The gap between "interesting in theory" and "I could actually use this" is shorter than you expect.

What's the first function in your codebase that someone else should be able to verify?

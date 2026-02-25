---
title: 'AI and Stylus: The Builder''s New Toolkit'
date: '2026-02-25'
tags:
  - slug: posts
    collection: tags
  - slug: blockchain
    collection: tags
  - slug: ai
    collection: tags
authors:
  - default
summary: >-
  AI tools are changing how developers build Stylus contracts on Arbitrum, while
  Stylus enables new AI workloads onchain. Here's what builders should know.
images: >-
  https://blog.arbitrum.foundation/content/images/size/w1200/2026/02/0226_Arbitrum_Blog_OnchainDevelopment-1.jpg
canonicalUrl: 'https://blog.arbitrum.foundation/ai-and-stylus-the-builders-new-toolkit/'
draft: false
---
If you write Rust, C, or C++ and you've looked at smart contract development, you've probably felt the friction. Solidity is its own world. The tooling is unfamiliar. The patterns don't transfer cleanly. And even if you've gotten comfortable with Stylus, which lets you write contracts in these languages and compile them to WASM, you still need to learn the Arbitrum-specific details: fee models, contract activation, devnode setup, cross-contract calls between Solidity and Rust.

That's a lot of context to carry. And it's exactly the kind of context that AI tools are getting good at holding for you.

## AI that knows the stack

Large language models are effective at generating boilerplate, explaining patterns, and scaffolding projects. But they struggle when the domain is new or niche. Ask a general-purpose LLM to write a Stylus contract and you'll likely get something that looks reasonable but misses the details that matter. SDK v0.10 introduced cross-contract calls through `#[public]` traits with the `contract-client-gen` feature flag, and Cargo workspace support with `Stylus.toml` markers. An LLM without that context will either generate code against an older SDK version or invent patterns that don't exist.

The fix isn't better prompting. It's better context.

That's the idea behind a recently released [Claude Code skill for Arbitrum dApp development](https://github.com/hummusonrails/arbitrum-dapp-skill?ref=blog.arbitrum.foundation). It's a set of structured reference files that load into Claude's context when you're working on an Arbitrum project. The skill encodes the full development workflow: Stylus contracts in Rust, Solidity contracts via Foundry, React frontends with viem and wagmi, and a local Docker-based devnode for testing.

<iframe width="560" height="315" src="https://www.youtube.com/embed/vsejiaOTmJA?si=nbAyP-rEoMEbGUfi" title="YouTube video player" frameborder="0" allowfullscreen></iframe>

The result is opinionated and intentional. It uses pnpm, Foundry, and Viem. That opinionation matters because LLMs produce dramatically more consistent output when you eliminate ambiguous tool choices. Instead of generating five slightly different project structures, the AI follows a single well-defined path.

You install it with one command and your AI assistant can scaffold a complete monorepo, write Stylus contracts that compile correctly, set up cross-language interop between Solidity and Rust, and configure a local devnode with pre-funded accounts.

## Beyond scaffolding: AI that builds with you

Scaffolding is the starting point, not the ceiling. Once your AI tooling understands the Stylus SDK, it can help you through the entire development cycle. Need to add a new entry point to your Stylus contract? The AI knows the `#[entrypoint]` macro pattern. Want to call your Rust contract from a Solidity contract? It can generate the interface on both sides. Debugging a failed deployment? It can check whether you've activated the contract and whether your Wasm binary is within size limits.

This matters because Stylus development is inherently multi-language. A typical project might have Rust contracts for compute-heavy logic, Solidity contracts for standard interfaces, and a TypeScript frontend tying it all together. Keeping the patterns consistent across three languages and two VMs is exactly where AI comes in handy. It holds the context you'd otherwise lose switching between files and toolchains.

## Stylus as the execution layer for AI workloads

The story has a second side. AI isn't just helping developers build on Stylus. Stylus is becoming a natural fit for AI-related workloads onchain.

The reason is compute efficiency. Wasm contracts on Stylus run at near-native speed and cost significantly less gas than equivalent EVM operations for compute-heavy tasks. This isn't theoretical. [RedStone](https://blog.arbitrum.foundation/how-wasm-elevates-performance-without-leaving-the-evm/), the modular oracle framework used across DeFi, ported their verification logic to Stylus and reported a 50% reduction in per-feed computation and a 34% reduction in base overhead compared to their EVM implementation. Their workload, cryptographic verification of aggregated price feeds, is both compute-heavy and latency-sensitive. Exactly the profile that AI workloads share.

| Metric | EVM | Stylus | Improvement |
| --- | --- | --- | --- |
| Base computational overhead | 35k | 23k | 34.3% reduction |
| Per-feed computation | 16k | 8k | 50.0% reduction |

That kind of headroom opens the door to onchain logic that would be impractical in Solidity: reputation scoring algorithms, proof verification, complex registry operations, and data-intensive validation.

You can see this playing out across the ecosystem right now.

[**ERC-8004**](https://blog.arbitrum.foundation/ai-on-arbitrum-establishing-an-agent-registry-with-erc-8004-2/), the standard for onchain AI agent identity, [went live on Arbitrum on February 5th](https://x.com/arbitrum/status/2019425576759730514?ref=blog.arbitrum.foundation). It defines registries for agent identity, reputation, and validation. The reputation registry in particular benefits from Stylus: algorithms that score agent reliability across a network involve iterative computation that's expensive in the EVM but feasible in Wasm. The [identity registry is live on Arbitrum One](https://arbiscan.io/token/0x8004a169fb4a3325136eb29fa0ceb6d2e539a432?ref=blog.arbitrum.foundation) and processing real transactions.

If you want to experiment before touching mainnet, the contracts are also deployed on Arbitrum Sepolia so you can register an agent and explore the registry yourself.

![Agent registered on Arbitrum Sepolia](https://blog.arbitrum.foundation/content/images/2026/02/Screenshot-2026-02-10-at-19.00.49.png)

**x402**, the protocol that gives HTTP's `402 Payment Required` status code an actual job, can be [built and demonstrated on Arbitrum](https://github.com/hummusonrails/x402-demo-arbitrum?ref=blog.arbitrum.foundation). It enables AI agents to pay for API access and settle payments onchain without human intervention at each transaction. The demo includes metered AI inference with automatic batch settlement in USDC, showing what autonomous agent commerce looks like in practice.

Neither of these projects are unique to Stylus. But both benefit from what Stylus makes possible: cheaper computation, efficient data handling, and the ability to run complex logic onchain without hitting gas ceilings.

## The feedback loop

Here's what's interesting about this moment. AI tools are making it easier to write Stylus contracts. And Stylus is making it practical to build AI infrastructure onchain. Each side accelerates the other.

A developer who's never written a Stylus contract can install an AI skill and have a working project in minutes. That same project might include a contract that registers an AI agent onchain, or processes payments for an AI service, or verifies the output of an inference model. The tools that help you build are also the tools you're building for.

This feedback loop is still early. The Claude Code skill covers the core development workflow, but it'll expand as the Stylus SDK matures and new patterns emerge. ERC-8004 is live but the ecosystem of registered agents is just starting to grow. x402 is demonstrating what's possible but it's up to builders to take the concept and run with it.

## Try it yourself

If you want to see what AI-assisted Stylus development feels like:

-   [**Arbitrum dApp Skill for Claude Code**](https://github.com/hummusonrails/arbitrum-dapp-skill?ref=blog.arbitrum.foundation): Install the skill and let your AI assistant scaffold a full Stylus + Solidity + React project.
    
-   [**ERC-8004 on Arbitrum**](https://blog.arbitrum.foundation/ai-on-arbitrum-establishing-an-agent-registry-with-erc-8004-2/): Read the deep dive on agent registries, or explore the [live contract on Arbiscan](https://sepolia.arbiscan.io/address/0x8004A818BFB912233c491871b3d84c89A494BD9e?ref=blog.arbitrum.foundation).
    
-   [**x402 Demo on Arbitrum**](https://github.com/hummusonrails/x402-demo-arbitrum?ref=blog.arbitrum.foundation): A full-stack demo of machine-to-machine payments with a custom facilitator on Arbitrum.
    
-   [**Stylus documentation**](https://docs.arbitrum.io/stylus/gentle-introduction?ref=blog.arbitrum.foundation): The official guide to writing WASM contracts on Arbitrum.
    

The intersection of AI and smart contract development is usually framed as a future thing. On Arbitrum, builders are already working in that intersection. The tools exist, the infrastructure is live, and the contracts are deployed. What gets built next depends on who shows up.

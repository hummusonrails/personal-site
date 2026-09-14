---
title: "The 24kb Limit for Smart Contracts is Gone"
date: '2026-09-09'
summary: >-
  TL;DR: ArbOS Elara gives Stylus 4x the contract size. I ported a Black-Scholes pricer that breaks the old 24kb limit to show what that’s now possible. Arbitrum Stylus contracts can now be up to four
tags:
  - slug: blockchain
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2097640765740761594'
images: 'https://pbs.twimg.com/media/HRxREbTaQAIuoHA.jpg'
---

*TL;DR: ArbOS Elara gives Stylus 4x the contract size. I ported a Black-Scholes pricer that breaks the old 24kb limit to show what that’s now possible.*

Arbitrum Stylus contracts can now be up to four times the deployed code size of an EVM contract. ArbOS Elara activated on Arbitrum One on August 20th raised the Stylus code size limit from 24kb to 96kb. If you had not considered working with Stylus before, now is the time to look at it again.

# The Limit Changed

Stylus launched with the same 24 KB deployed code size limit as the EVM, and that was deliberate. Stylus and EVM contracts are interoperable and can call one another, and matching the EVM ceiling made it easier for a Solidity developer moving to Rust to make the switch.

Yet, keeping Stylus artificially at 24kb introduced limitations into the dev experience, that I personally saw often. ArbOS 61 raises the ceiling to 96kb, but only for Stylus. EVM contracts stay at the 24 KB limit because increasing it would alter core EVM assumptions and diverge from Ethereum's rules, with potential impacts on node performance, developer tooling, and cross-chain compatibility.

The upgrade is already on mainnet. It activated on Arbitrum One on August 20th. You can start using it today.

Make sure your Stylus tooling is current before deploying a large contract. Fragmented deployment support was merged in cargo-stylus 0.10.1, and verification of fragmented contracts was fixed in 0.10.8, so use cargo-stylus 0.10.8 or later.

# Why Size Mattered

The prior 24 KB limit applied to the Brotli-compressed WebAssembly binary produced from your Rust contract, which made the ceiling harder to reason about than Solidity's deployed bytecode limit. Stylus compresses your WebAssembly output before deployment, but there is no fixed compression ratio: how much smaller it becomes depends heavily on the particular binary. That meant there was no fixed relationship between the 24 KB compressed deployment ceiling and the size of the uncompressed WASM. How much WASM fit depended heavily on how compressible the particular binary was. You had the help of cargo stylus check from the command line, which reported the resulting compressed size, but that was after you had already written enough code to compile the contract.

Rust's size problem in smart contract work is the other side of the coin for its appeal. Rust has an incredibly mature ecosystem of libraries called crates, but dependencies and some abstractions can add substantially to the compiled WASM and spend your size budget. Pull in a big integer implementation, a serialization library, or another dependency and a contract that previously fit can suddenly exceed the deployment limit.

Teams would spend time hand writing a smaller version of an existing Rust crate to avoid excess size. Earlier, Stylus introduced multi-contract support, which is useful for separation of concerns, but could just as easily be used as a workaround for size limitations.

The official guidance I had offered numerous times to teams struggling with size limitations was a list of do-nots and subtractions: strip debug symbols, minimize dependencies, and more. While technically good advice, these items were perhaps not the best first exposure to working in a new smart contract environment.

At this point, with 4x the size to work with, running up against this wall will be a lot less common.

How did Arbitrum manage to increase the contract size though? Let's take a look at how it all works. 

# How Merge on Activation Works

A Rust Stylus contract compiles to the wasm32-unknown-unknown target, the resulting WASM is Brotli-compressed for deployment, and the program code carries a prefix that lets ArbOS distinguish it from ordinary EVM bytecode. Before the ArbOS Elara upgrade, that compressed payload had to fit within a single EVM contract's 24,576-byte runtime-code limit.

You may think that Elara simply makes EVM code accounts bigger, but it does not. Instead, it lets a single Stylus program be represented using multiple code fragments.

A program too large for one fragment is represented by a Stylus collection contract that references fragments stored as ordinary contract code, with MaxFragmentCount defaulting to 4. Four fragments of up to 24,576 bytes each yield 98,304 bytes, or 96 KiB, of compressed program capacity.

During onchain activation, ArbOS reads the fragments, concatenates the compressed payload, decompresses it, and passes the reconstructed WASM through the normal Stylus activation and validation pipeline. It is then compiled for the node's supported Stylus execution targets and can use the normal native-code caching path for execution. From that point, callers interact with one program at one address and do not need to know how its compressed WASM was fragmented for storage.

![](https://pbs.twimg.com/media/HRxRFlmbMAA705j.jpg)
*Arbitrum Open House kicks off with the online buildathon on September 14th.*

The main point to take away from the mechanics is that whether the compressed WASM occupies one fragment or all four, once the program has been activated, callers interact with it through one contract address.

You can see this onchain. A Black-Scholes pricer I ported to the current SDK deploys as a 48 byte root contract at 0xd7be39d0a9199ed5dec224fe9fa32de88ec4819f plus two fragments: one of exactly 24,576 bytes, and one holding the remaining 4,584. Reading the root's code returns the 0xeff00200 prefix, the decompressed WASM size, and the two fragment addresses.

# What This Makes Possible

The compressed-code ceiling is not the only limit. Elara also raises the default MaxWasmSize to 256 KiB, so even if an unusually compressible module fits within the 96 KiB compressed limit, its uncompressed WASM still cannot exceed 256 KiB. These higher limits make contract designs practical that could not fit within the previous Stylus size constraints.

You can stop subtracting right away to make your code deployable. In many cases, you can now keep a Rust crate that previously would have pushed the contract over the deployment limit instead of reimplementing a smaller version of it. You can also keep more related logic in one contract instead of splitting it across multiple contracts solely to stay under the previous size limit.

As a concrete case, the pricer above uses rust_decimal for fixed point math with real transcendental functions, prices calls and puts, returns all five Greeks, and solves for implied volatility with Newton's method. It compiles to 29,160 bytes compressed, 4,584 over the old limit. 

If you are still near the edge, cargo-stylus v0.10.9 added an opt-in wasm-opt table in Stylus.toml that lets you configure additional WebAssembly optimizations consistently for deployment and verification.

The expanded 96 KB size limit removes a constraint that was forcing architectural decisions. It does not free you from designing optimized code or building on solid architectural foundations, but you now have much more room to do so. The repo has a make size target that prints the compressed size against both the old and new limits, if you want to see where your own contract sits.

# Try It at Open House Singapore

The next online Arbitrum Open House Buildathon begins on September 14th, and it is a good opportunity to explore what these expanded Stylus limits make possible.

Open House is where you can take your idea and get the support to launch it on Arbitrum in collaboration with our incredible partners in the ecosystem. The online Buildathon offers $115K in grants and prizes, while the broader Open House Singapore program includes $415K in prizes and grants, and Buildathon winners earn a spot at the in-person Founder House in Singapore this fall.

Previous winners of past Open House editions in Bangalore, NYC and London discovered unique and valuable ways to use the interoperable nature of Stylus to complement their application design and expand what was possible in their product. They did all of that while only having 24kb of contract size available. What will you do now that you have 4x the space?

![](https://pbs.twimg.com/media/HRxRElkasAAK53s.jpg)
*A diagram illustrating the changes in code size limits for Stylus and EVM after ArbOS Elara activation.*

*Take a peek at what went down at the Founder House in London. Participate in the buildathon, if you win, you earn an automatic spot in the next Founder House in Singapore.*

Take the expanded space, apply it to your idea that you want to turn into the next great onchain product, and bring it to Open House.

Sign up here for the Buildathon.

*The process of how the node accepts contracts larger than 24kb and presents it at the end as one address*

Let's see what you build.

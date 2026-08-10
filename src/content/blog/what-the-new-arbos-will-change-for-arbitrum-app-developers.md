---
title: "What the new ArbOS will change for Arbitrum app developers"
date: '2026-08-07'
summary: >-
  Stylus contracts are getting a 96 KB code size limit. That is four times what a Solidity contract gets, and four times what Stylus allows today.   The DAO approved ArbOS 61 Elara, which builds on
tags:
  - slug: blockchain
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2085729467549532619'
images: 'https://pbs.twimg.com/media/HPF5s7vbYAAoYFy.jpg'
---

Stylus contracts are getting a 96 KB code size limit. That is four times what a Solidity contract gets, and four times what Stylus allows today.

The DAO approved ArbOS 61 Elara, which builds on ArbOS 51 Dia. Arbitrum Sepolia has been running it since the end of June. Arbitrum One activates after the constitutional waiting period, which gives you a window to get ready.

What should you be looking for in this new release, especially if you're writing smart contracts and building apps? Let's talk about it.

## The 96 KB limit, and how it works

Stylus launched with the same 24 KB code size limit as Solidity, deliberately, so the two could call each other and so Solidity developers moving to Rust hit no new walls. Teams natively working from Rust however hit up against that code size limit all the time. Now, it's been quadrupled.

ArbOS 61 raises it to 96 KB, for Stylus only. Solidity keeps 24 KB, because changing it would break EVM assumptions that node performance and tooling depend on.

A Stylus contract too large for one code account gets stored as a root plus fragments, spread across several code accounts, with a default of four. At activation the node reassembles the compressed payload, decompresses it, and treats the result as one contract from then on. The feature is called merge-on-activate.

There is a second ceiling behind it. The decompressed WASM is still bounded by the chain's MaxWasmSize, which ArbOS 61 raises from 128 KB to 256 KB. The 96 KB governs the compressed code sitting onchain. The 256 KB governs what it expands into.

You need the new Stylus Rust SDK version to get any of this. The limit and the SDK ship together.

## What changes in your code

ArbOS 61 removes support for the WebAssembly multi-value extension.

In practice that means functions returning more than one value, and block, loop, or if blocks that take parameters. The Nitro changelog states the rule directly, which is activation of WASM programs using multi-value gets rejected. You can read the PR that introduced the rejection into Arbitrum Nitro a few months ago.

![](https://pbs.twimg.com/media/HPH_ma2boAA3wLB.jpg)

That rejection covers re-activation too. 

Stylus programs expire after a year by default unless you keep them alive, so a deployed contract built with a toolchain that emits multi-value fails its next reactivation, and a contract that cannot reactivate cannot be called.

I recommend checking your current code now for both new Stylus contracts you are working on and for existing contracts before re-activation comes up. 

## What to do now

If you write Stylus, two things. Upgrade the latest Rust SDK to get the 96 KB limit, and check whether your toolchain emits multi-value WASM before your next activation comes due.

Everything else in this release is either not active yet or aimed at custom Arbitrum chains. The full proposal, including the audit scope and the reasoning behind each decision, is on the forum under AIP: ArbOS 61 Elara.

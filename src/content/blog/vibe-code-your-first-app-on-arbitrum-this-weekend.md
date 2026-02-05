---
title: "Vibe Code Your First App on Arbitrum This Weekend"
date: '2026-01-09'
summary: >-
  You've seen the tweets. "I built this app in 20 minutes with Claude." Screenshots of working products, built by people who swear they've never written a line of code. As an old-school developer who
tags:
  - slug: ai
    collection: tags
  - slug: blockchain
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2009536865355940195'
---

You've seen the tweets. "I built this app in 20 minutes with Claude." Screenshots of working products, built by people who swear they've never written a line of code. As an old-school developer who started with Apache, MySQL, and PHP applications, this definitely feels unusual, but it's here to stay.

Vibe coding is real, and this weekend you can use it to ship your first Farcaster mini-app on Arbitrum.

> tl;dr I built a [starter template](https://github.com/hummusonrails/farcaster-arbitrum-miniapp-starter?utm_source=blog&utm_medium=social&utm_campaign=devrel-q4&utm_content=x-article) that's designed specifically for AI coding agents. Clone it, paste one prompt into Claude Code, and start building. The repo handles all the complexity so you can focus on describing what you want.

## What Is Vibe Coding?

Vibe coding is building software by describing what you want in plain English to an AI coding agent. You don't write code. You describe outcomes. The AI proposes changes, you approve them, and the code gets written.

But most repos aren't built for AI agents. They assume a developer who understands implicit conventions, remembers context across files, and knows which changes will break other things. AI agents need explicit guardrails: which files exist, which must stay synchronized, and in what order to make changes.

The [starter template](https://github.com/hummusonrails/farcaster-arbitrum-miniapp-starter?utm_source=blog&utm_medium=social&utm_campaign=devrel-q4&utm_content=x-article) I'm sharing does exactly that. It's a Farcaster mini-app with an Arbitrum smart contract, and it's architected so that AI agents can modify it without breaking things.

## What's in the Template?

Three pieces that work together:

- A Rust smart contract using Arbitrum Stylus. It's an ERC-721 NFT with minting and metadata. You can customize what the NFT represents without touching the underlying token mechanics.

- A React frontend with wallet connection, minting UI, and Farcaster sharing. It uses wagmi and viem for blockchain interaction, and the Farcaster MiniApp SDK for social features.

- Farcaster integration through the manifest file and frame meta tags. This is what makes your app discoverable and embeddable inside Farcaster.

The key aspect is in how these pieces are documented for AI agents. A CLAUDE.md file at the root gets automatically loaded by Claude Code. It explains the file structure, the synchronization requirements, and the rules the AI must follow.

## How to Get Started (The One-Prompt Version)

Open Claude Code. Paste this:

> Clone the repository at https://github.com/hummusonrails/farcaster-arbitrum-miniapp-starter. After cloning, read the CLAUDE.md file to understand how this codebase works. Then help me build a Farcaster mini-app. Here's what I want: App idea: [YOUR IDEA HERE] NFT name: [YOUR NFT NAME] Please propose what changes you'll make before writing any code. Wait for my approval before modifying files. Explain things simply.

That's the entire workflow. Claude Code clones the repo, reads the documentation, understands the architecture, and starts proposing changes based on your description. You say yes or no. You ask questions. You iterate until it matches what you imagined.

## Why This Works

The template includes explicit documentation that AI agents actually read:

- An architecture document explaining how the contract, frontend, and Farcaster config relate to each other.

- A synchronization requirements file that specifies exactly which files must stay in sync. When you change the smart contract, the ABI must be exported and updated in the frontend. When you change URLs, both the Farcaster manifest and the frame meta tag need to be updated. The agent knows this before it starts making changes.

- Task decomposition guides that break common modifications into safe steps. Want to change the NFT theme? Here are the five files you'll touch, in order. Want to add a mint price? Here's how the contract change flows to the frontend.

- Example prompts with fill-in-the-blank templates. You don't need to know how to prompt an AI. Just fill in your app idea and let the structure do the work.

Vibe coding is still the wild west of app creation. The amount of private data that is being shared with centralized AI servers is astounding. Yet, with the guardrails in this repo in place, the process of building your first Arbitrum mini-app is more structured and less random, and it minimizes the risk of failure.

## What Can You Build?

The template starts as an NFT minting app, but that's just the scaffolding.

You can use it to build whatever your heart desires:

- Membership passes for communities. Holders get access to gated content.

- Achievement badges for games, courses, or challenges.

- Collectibles tied to moments. For example, near the end of 2025, I put out an [Arbitrum Unwrapped mini-app](https://farcaster.xyz/miniapps/8idfqZvCXlsG/arbitrum-unwrapped) that minted your year on Arbitrum as a custom NFT.

The contract is ERC-721, so anything that makes sense as a unique, ownable digital item works. The Farcaster integration means you get social distribution built in. People can share directly from your app to their feed.

## Your Weekend Project

Here's what a realistic weekend looks like:

Saturday morning: Clone the repo, run the prompt, and get your customized version compiling. Change the NFT name, description, and image to match your idea.

Saturday afternoon: Test locally. Connect your wallet, mint a test NFT, and see it show up in the gallery. Make sure the Farcaster share button works.

Sunday: Deploy to Arbitrum Sepolia testnet. Update the URLs in the Farcaster manifest. Test the whole flow in the Farcaster Mini-App Previewer.

By Sunday night, you have a working Farcaster mini-app with onchain NFT minting running on Arbitrum, built by describing what you wanted.

There's no promise that the AI writes perfect code. In fact, it most likely will not. But the barrier between "I have an idea" and "I have a working prototype" has collapsed.

## Go Build Something

The repo is at [github.com/hummusonrails/farcaster-arbitrum-miniapp-starter](https://github.com/hummusonrails/farcaster-arbitrum-miniapp-starter?utm_source=blog&utm_medium=social&utm_campaign=devrel-q4&utm_content=x-article). The documentation is written for AI agents, but it's readable by humans too if you want to understand what's happening under the hood.

If you build something with it, share it on Farcaster, and let me know. I want to see what ideas emerge when you are sitting on your couch on a weekend morning, letting your thoughts take you somewhere.

This weekend, pick an idea you've been sitting on. Something small. Something you'd build if you knew how to code. Now you do. Claude will handle the syntax. You handle the vision.

Go vibe code something.

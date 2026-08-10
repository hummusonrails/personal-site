---
title: "What would change if Arbitrum replaced its state tree"
date: '2026-08-06'
summary: >-
  Reading one account onchain can cost seven or eight separate lookups on disk. Writing one rewrites a whole chain of records leading back to a single hash. That is fundamental to the core path of each
tags:
  - slug: blockchain
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2085370161075294208'
images: 'https://pbs.twimg.com/media/HPAzqDIaoAAEw_l.jpg'
---

Reading one account onchain can cost seven or eight separate lookups on disk. Writing one rewrites a whole chain of records leading back to a single hash. That is fundamental to the core path of each block. It comes from the very shape of the structure holding the state.

@Offchain published an RFC on the Arbitrum forum a few weeks ago asking the community what would change for you if Arbitrum replaced that structure. The work is in research phase now, but before you can even contribute you need to understand what's at stake. So, let's take a look.

## What makes a state root and why it matters

Every Arbitrum block header carries a state root: one hash that stands in for all account balances, nonces, code, and storage at that moment. Change any value anywhere and that hash changes. That property is what lets someone prove a fact about Arbitrum state to code that has not seen the state itself.

The structure producing that hash is a Merkle-Patricia Trie, the same one Ethereum uses. Think of it as a lookup table shaped like a tree. To find one account you hash its address, then walk down the tree step by step, each step picking the next branch based on the next piece of that hash, until you reach the record you want.

Because the keys are hashed, consecutive steps land in unrelated places on disk. The node cannot read ahead, because it does not know where step four lives until step three comes back. Reading a storage slot means doing this twice, once to find the contract account and once to find the slot inside it.

Writes cost more. Changing one value at the bottom means recomputing hashes all the way up to the root.

![](https://pbs.twimg.com/media/HPAuUdnaIAAtRcl.jpg)

## Why faster disks only get you so far

The usual approach addresses this from the storage side. Replace the general-purpose database underneath with an on-disk layout built specifically for tree access, and cache aggressively so repeat lookups skip the disk entirely.

Those fixes work. While also inheriting the very same tree that they are optimizing. If resolving one key requires eight lookups that each depend on the one before it, the fastest storage engine in the world still has to serve eight lookups in sequence.

**This is what Offchain is proposing to improve on Arbitrum. **

Tuning storage under the current structure keeps paying off, but the larger long-run gain may come from changing the structure itself. 

## What the RFC proposes

The state representation would move from a single Merkle-Patricia Trie to a new verifiable structure, with smaller purpose-built structures alongside it for specific access patterns. The exact design is still open. The question is not only relevant for people who love going down rabbit holes on data design. This has serious implications for the optimization of the very chain itself.

What are the practical consequences of all of this?

The proofs returned by `eth_getProof` change format, because a proof is a description of a path through the tree, and the tree is different. The hash function tying the structure together may change too. And the returned payload may carry a version number, so whoever receives it can tell which format they are holding.

However, a lot of what currently works stays exactly the same.

## What does not change

Contracts behave the same way. Reads, writes, and the gas your calls cost are not expected to move. If you are shipping an app on Arbitrum, this will mostly be an infrastructure change you should not even notice.

`eth_getProof` remains a supported method, and the values it returns still describe the same state. What changes is the proof material sitting alongside those values.

The security model holds. State stays authenticated, proofs stay verifiable, and settlement and fraud-proof security are preserved.

## How do I know if this will impact me?

Let's take a minute to figure out if this touches your work at all.

If you call eth_getProof and use the values it returns, you are on the easy side of it. Your code keeps working.

**If you check the proof yourself against a state root you trust, you are on the other side. **

That code has assumptions baked into it about how nodes are laid out, how they are encoded, and which hash function stitches them together. Those assumptions stop holding. Bridges, light clients, onchain verifier contracts, ZK circuits proving statements about Arbitrum state, and indexers doing their own validation all potentially impacted.

![](https://pbs.twimg.com/media/HPAvyr0aMAArII9.jpg)

If you are in one of those categories of work then you should most definitely join the conversation on the forum and reach out for support.

## It's been a few weeks what are people saying?

In just the last few weeks, members of the community have already begun to weigh in on the forum in regards to this RFC. 

The cost of migration for infra teams. The need for technical review before any formal DAO vote. The gas cost effects, transition mechanics, and more. All these topics and a lot of others are actively being discussed right now.

The only thing missing from the conversation is you. The large decisions are much easier to influence and have a say in at the research stage than later in the process. You can have a real voice in the development of the future spec that will guide this entire work.

If you consume Arbitrum state proofs, check them, or prove statements about them, that conversation on the forum is where your voice belongs.

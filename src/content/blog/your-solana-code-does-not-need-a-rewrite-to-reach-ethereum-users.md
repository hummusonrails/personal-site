---
title: "Your Solana code does not need a rewrite to reach Ethereum users"
date: '2026-06-30'
summary: >-
  You already made the hard bet: Rust, explicit accounts, serious state design, and performance-sensitive programs. StylusPort exists because that work should not be trapped on one runtime. If you are
tags:
  - slug: blockchain
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2071919664360288620'
images: 'https://pbs.twimg.com/media/HMDY4zEW0AEst6c.jpg'
---

You already made the hard bet: Rust, explicit accounts, serious state design, and performance-sensitive programs. StylusPort exists because that work should not be trapped on one runtime.

If you are moving a Solana project to Ethereum, Arbitrum Stylus gives you the shortest path that still respects how your code was built.

> tl;dr: StylusPort is Oak Security's handbook and migration guide for porting Solana programs to Arbitrum Stylus. Both ecosystems speak Rust, so the job is a port, not a rewrite. You keep the mental model you know, then map it into contracts Ethereum wallets, DEXs, and tooling already understand.

## You are closer to Ethereum than you think

Solana and Ethereum usually get described as opposing worlds. Account model versus contract storage. SPL tokens versus ERC20s. Runtime-passed accounts versus contract-owned state. Different execution environments, different tooling, different user bases.

That framing is true enough to be annoying, but it misses the part that matters for a developer.

**Both ecosystems now have a serious Rust path.**

On Solana, you write Rust programs that operate over accounts passed into each instruction. On Arbitrum Stylus, you write Rust contracts compiled to WebAssembly, deployed to an EVM-compatible chain, and callable through normal Ethereum ABI surfaces.

That changes the migration question.

You are not asking, "How do I rewrite this entire system in Solidity?" You are asking, "Which Solana concepts map directly, which need translation, and where does the Ethereum ecosystem give me better defaults?"

That is the job StylusPort is trying to make simple for you.

Oak Security's StylusPort handbook walks through the conceptual mapping from Solana programs to Stylus contracts. The accompanying repo gives you the handbook source and migration materials. The Arbitrum blog post on migrating from Solana to Arbitrum frames the same idea from the builder side: move the program model you understand into an Ethereum-compatible execution environment without pretending the two systems are identical.

![](https://pbs.twimg.com/media/HMDa5-oWwAArbJ6.jpg)

## Accounts become storage, not guesswork

The biggest mental shift is state ownership.

In Solana, your instruction receives accounts at runtime. You validate them, deserialize them, check owners, check seeds, check mutability, then operate on account data. That model is powerful, but it means every instruction carries a lot of state choreography.

In Stylus, your contract owns its storage. You declare the storage layout in Rust, and the contract's methods operate against that state.

**Accounts passed in at runtime become a contract that owns its own storage.**

That sounds like a small syntax change. It is not.

On Solana, if your vesting program needs a vesting account, token account, mint, source owner, and destination account, your instruction interface needs to receive and validate all of that. In Stylus, the contract can store the vesting schedule, balances, token address, recipient, and unlocked amounts as contract state. The caller passes method arguments. The contract controls its own storage.

The validation work does not disappear. It moves.

You still care about invalid tokens, invalid destinations, zero amounts, empty schedules, non-chronological schedules, and insufficient allowance. But instead of validating a loose bundle of accounts for every instruction, you design state transitions around a contract boundary.

That is a more familiar shape for Ethereum tooling, and it is also easier for wallets and indexers to reason about.

A Solana developer should read that as a practical tradeoff, not a culture war. You lose some of the runtime account flexibility. You gain a contract address with durable state, ABI methods, event logs, Ethereum-style composability, and access to the existing EVM application layer.

## Your token is already legible to Ethereum

The most immediate value prop is tokens.

On Solana, SPL token behavior lives through the token program and token accounts. On Ethereum, token behavior is usually expressed through ERC20 contracts. If you are moving an app that mints, transfers, escrows, unlocks, or accounts for tokens, that difference matters fast.

Stylus makes the Ethereum side less painful because you can use Rust and still expose standard Ethereum interfaces.

**Your token is an ERC20: one storage field, and every Ethereum wallet, DEX, and aggregator already understands it.**

That is not a small integration detail. It is distribution.

A token that conforms to ERC20 can show up in wallets, portfolio tools, block explorers, DEX routers, and analytics systems without asking every consumer to learn a new token model. A Solidity contract can call your Stylus contract. Your Stylus contract can call Solidity contracts. The Stylus SDK is designed for Rust contracts that are ABI-equivalent with Ethereum contracts, so you are not building inside a side room.

This is where Stylus feels different from "alternative VM" pitches.

The point is not Rust instead of Ethereum. The point is Rust inside Ethereum's composability layer.

For Solana teams, that means your existing Rust instincts become useful in a market where users expect MetaMask, Safe, Uniswap-style routing, ERC20 approvals, block explorer traces, and Solidity contract calls.

You do not need to teach Ethereum users a Solana-shaped interface before they can touch your app.

## The cost model changes under your feet

Solana developers are used to thinking about rent, account sizes, and keeping state alive. You pay attention to how many accounts your program needs and how much data each account stores.

Stylus sits in the Ethereum storage model.

You pay gas when you write storage. A new 32-byte slot write costs gas. Reading storage is much cheaper. There is no ongoing *rent* payment for keeping a contract's storage alive.

**Solana rent thinking turns into Ethereum storage discipline.**

That changes design pressure.

On Solana, you may split state across accounts because the runtime expects accounts to be passed explicitly and because PDAs are part of the design language. On Stylus, you should ask what belongs in contract storage, what can be derived, what can be emitted as an event, and what can stay offchain.

The other cost shift is compute.

Arbitrum's Stylus brings execution that's much cheaper for compute-heavy workloads over Solidity, often in the 10-100x range depending on the operation. That does not mean every contract becomes 100x cheaper. Storage is still storage. Calls are still calls. Bad architecture is still expensive.

But if your Solana program does meaningful computation, custom math, cryptography, parsing, simulation, compression, or other work that is awkward in Solidity, Stylus gives you room to bring more of that logic over in Rust.

That is the part Solana developers should notice.

You are not moving from a high-performance chain into a slow Solidity box. You are moving into Arbitrum's MultiVM, where Rust contracts compile to Wasm and execute alongside EVM contracts.

## StylusPort proves the path on real code

A migration guide is only useful if it survives contact with production-shaped programs.

Oak did not stop at a counter contract. The StylusPort handbook includes a case study porting Bonfida's token vesting program, an audited Solana program, into a Stylus contract. A user can set up a non-cancellable token escrow that unlocks over a schedule, and unlocks can be triggered permissionlessly.

![](https://pbs.twimg.com/media/HMDaDKiXMAABHBB.jpg)

**The proof point is an audited production vesting program ported with functional unit-test parity.**

That matters because vesting is full of edge cases.

The port's `motsu` test suite covers invalid token, invalid destination, empty schedule, zero amount, non-chronological schedule, and insufficient allowance. Those are the kinds of tests you want before believing a migration story, because they are not syntax checks. They test behavior.

This is the useful bar for migration tooling: real Solana code, mapped into Stylus, with tests that preserve expected behavior.

## How to start the port

Do not begin by translating every line.

Start by identifying the state model and instruction surface.

Take one Solana instruction and write down four things:

1. Which accounts does it require?
1. Which account fields does it read?
1. Which account fields does it mutate?
1. Which external programs does it call?
Then map that into Stylus:

1. Contract storage fields
1. Public method arguments
1. Internal validation functions
1. External contract calls
For a token vesting program, the shape is straightforward enough to see.

The Solana version has vesting accounts, token accounts, a mint, a destination, a source owner, schedules, and unlock instructions. The Stylus version can store schedules and vesting metadata directly, use ERC20-compatible token calls for transfers, and expose methods like create vesting, claim, and inspect schedule state.

The rough workflow looks like this:

- Read the StylusPort handbook concepts before touching code.
- Clone the StylusPort repo.
- Set up the pinned toolchain used by the examples.
- Port one instruction at a time.
- Keep the Solana tests open while writing Stylus tests.
- Treat every account validation as a storage or call-boundary validation.
- Run `motsu` tests until behavior matches.
## What you get at the end

The prize is not "Solana but on Arbitrum."

The prize is your Rust code, or at least your Rust design, living inside Ethereum's application layer.

**You keep the parts of Solana development that made you productive, then gain Ethereum distribution.**

That means ABI-compatible contracts. ERC20 compatibility. Solidity interoperability. Ethereum wallets. Existing DEX infrastructure. Arbitrum's lower fees. Stylus compute that makes heavier Rust logic practical. And a migration path that treats your existing program as an asset instead of something to throw away.

There are still hard parts.

You need to rethink storage ownership. You need to audit assumptions around callers, approvals, token transfers, reentrancy, and upgrade patterns. Stylus contracts are reentrancy-safe by default at the SDK level through storage-cache handling, but that does not excuse sloppy effects and interactions. You still need tests. You still need review. You still need threat modeling.

But the path is real now.

If you are a Solana developer looking at Ethereum users, do not start by rewriting your program in Solidity. Start with StylusPort. Map the state. Port the behavior. Keep the tests honest.

Then ask the better question: what becomes possible when your Solana-built Rust system can plug directly into Ethereum liquidity, wallets, and contracts?

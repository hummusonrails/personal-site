---
title: "Elysium is live on Hyperliquid. Here's what the Arbitrum stack lets you build."
date: '2026-11-12'
summary: >-
  Elysium is live on mainnet. Kinetiq built it with the Arbitrum Platform, and it settles on HyperEVM, Hyperliquid's smart contract environment. It's the first dedicated blockchain built with the
tags:
  - slug: blockchain
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2120830350557651091'
images: 'https://pbs.twimg.com/media/HW6z9D3aAAAZ4lF.jpg'
---

Elysium is live on mainnet. Kinetiq built it with the Arbitrum Platform, and it settles on HyperEVM, Hyperliquid's smart contract environment. It's the first dedicated blockchain built with the Arbitrum Platform to settle on HyperEVM (Arbitrum announcement).

Kinetiq's users trade on Hyperliquid, so Kinetiq took the Arbitrum stack to Hyperliquid. Elysium has its own execution capacity, uses HYPE for gas, settles on HyperEVM, and has a planned upgrade that connects it to HyperCore's order books.

If you're a founder thinking about a dedicated chain, that's the takeaway. With the Arbitrum stack you start from your product and your users, then configure the chain around them. Your chain can settle on an Arbitrum chain or on another supported environment where your ecosystem already lives. Elysium shows what that looks like for a trading product.

![](https://pbs.twimg.com/media/HW6z9bba8AA30Ff.png)
*Compares the application write patterns that motivate different execution configurations.*

Read Arbitrum's full Elysium announcement: 

## Execution shaped by the application

Say you run a market-making app. Prices move, your inventory changes, and your quotes have to follow several times a second. Each update is a transaction. On a chain you share with everyone else, your busiest moments land at the same time as everyone else's.

A dedicated chain gives that workload its own capacity, and the Arbitrum stack lets you size it. Kinetiq configured Elysium for 100 millisecond block times and an execution target of 300 million gas per second (Arbitrum announcement).

Kinetiq picked those numbers for a trading workload, and the Arbitrum stack let them make that call for their chain alone. The gas figure is a design target for capacity, separate from measured throughput and from settlement time on HyperEVM.

Your app might write once per turn in a game, or settle payments in batches at the end of the day. You'd configure execution for that pattern instead, and you'd get a chain sized for your product, without competing for block space with apps that have nothing to do with yours.

## Settlement and infrastructure choices

Elysium is an Arbitrum Layer 2 with HyperEVM as its parent chain. It settles inside the Hyperliquid ecosystem, next to the markets its applications are built for.

Kinetiq's other infrastructure choices follow the same reasoning. HYPE is Elysium's native gas token, so Hyperliquid users pay fees with an asset they already hold. For your chain, the gas token is part of onboarding: it's the first thing a new user needs before they can do anything.

For data availability, Elysium uses Arbitrum AnyTrust. A committee keeps transaction data available, and if the committee fails, the chain falls back to posting full data to HyperEVM (Arbitrum announcement). That trades some trust in the committee for cheaper data, and Kinetiq decided the trade fit a trading chain. You might weigh it differently, and the stack leaves that decision with you.

Your combination might look nothing like Elysium's. The Arbitrum stack supports settling on an Arbitrum chain or on another supported environment, and you configure execution, gas token, data availability, governance and validation separately (launch docs). Those choices have to work together, so confirm your settlement destination and configuration are supported before you commit to an architecture.

## Extending the chain

Kinetiq chose the Arbitrum Platform partly because it makes custom precompile development easier (Arbitrum blog). Elysium's roadmap shows what that unlocks.

![](https://pbs.twimg.com/media/HW6z9SKbUAAbw6e.jpg)
*Shows how Elysium’s platform, settlement environment, gas token, and planned integration fit together.*

Kinetiq plans a post-launch upgrade that adds custom precompiles for HyperCore integrations. Once they ship, an application on Elysium could read HyperCore market data and send trading instructions through authorized, trade-only agents (Arbitrum announcement).

Picture a vault contract on Elysium. It reads the HyperCore book, decides it needs to rebalance, and sends the order through a trade-only agent. The vault's logic runs on Elysium, and the trade executes on HyperCore's order books. The order books stay on HyperCore, and the integration connects the two halves of that workflow.

That's the power of building on the Arbitrum stack. You can add features at the chain level that only make sense for your ecosystem, and you don't have to build a blockchain from scratch to get them. The launch docs cover how under protocol extension.

## Explore your own chain

Elysium is one team's answer for one market: an Arbitrum Layer 2 configured for trading, settling on HyperEVM, with a planned extension into HyperCore.

Your answer starts with a short list: where your users are today, how often your app writes onchain, which asset should pay for gas, and what your chain needs to do that a general-purpose chain can't.

Take that list into the launch docs. Work through the configuration options for execution, gas tokens, data availability, governance and validation. Then go through deployment, protocol extension and operations with the team that will run your chain.

Start building your own chain with the Arbitrum stack.

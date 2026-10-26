---
title: "USDG markets are live. Your integration can be next."
date: '2026-10-23'
summary: >-
  USDG is live on Arbitrum One in GMX markets, the GMX Dollar Vault, Morpho vaults, Fluid, and Uniswap v4. If you're a dev at a DeFi, fintech or trading venue, you can evaluate an integration against
tags:
  - slug: posts
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2113526103801540807'
images: 'https://pbs.twimg.com/media/HVTAxvGacAEKHGd.jpg'
---

USDG is live on Arbitrum One in GMX markets, the GMX Dollar Vault, Morpho vaults, Fluid, and Uniswap v4. If you're a dev at a DeFi, fintech or trading venue, you can evaluate an integration against markets that exist today. You can also run open source examples for treasury and customer earn flows.

![](https://pbs.twimg.com/media/HVTAyVPaYAAi0dK.jpg)

![](https://pbs.twimg.com/media/HVTAx6aasAAovlS.jpg)
*One asset, two kinds of record*

Those flows can start with the same dollar balance. They leave your application responsible for different records.

## One dollar across the stack

Paxos issues USDG on behalf of the Global Dollar Network. On Arbitrum, you can build with it for trading, lending, payments, and treasury. A venue might use USDG in a market. A fintech might use it in a payment flow or connect customers to a third-party vault. A business treasury might need to move between bank funds and USDG while tracking its operating balance.

Using one asset across those activities can reduce the number of dollar assets your application has to handle. It doesn't remove the need to say what each balance represents. USDG in a treasury wallet is a business asset. USDG supplied to a vault through a customer-facing product creates a record of what each customer is owed. Your balance screen, ledger, and reconciliation process have to preserve that distinction.

Arbitrum has currently running ecosystem programs for eligible partners. These change regularly and I highly recommend bookmarking that product page to stay up to date.

Holding USDG in a wallet does not yield returns. Third-party products, such as vaults, offer rewards independently under their own terms. If you're designing an earn experience, that distinction belongs in the product behavior your team builds and the terms your customers see.

## Choose the obligation you're building for

The examples repo I built gives you two fully built available paths with more coming soon. Pick the one that resembles the records your application will need to keep.

The sample business treasury is a simulated app for a fictional company. It walks through converting USD into USDG, redeeming USDG back to a bank, maintaining a wallet within a balance band, and reconciling Paxos records against activity on Arbitrum. That gives you a concrete sequence to inspect: a request to move funds, the resulting records, the wallet balance, and the action taken when that balance moves outside the target band.

A balance band is an operating decision. Your team would still need to decide how much USDG the business should keep available and what should happen when a mint or redemption hasn't completed. The sample lets you inspect the flow and its failure handling before making those decisions for your own system.

The sample fintech earn example starts from a different obligation. In that simulated app, customers supply USDG to third-party vaults on Arbitrum. The application maintains a per-customer ledger, reconciles it against the chain, and handles how vault incentives are shared. An aggregate wallet or vault position can't tell a customer which portion belongs to them. Your internal ledger has to carry that answer through deposits, withdrawals, and reward claims.

I'll be adding perp DEX margin and spot DEX quote asset examples soon to the repo. If you're building a venue, the live integrations give you markets to examine, while the available treasury and earn apps give you code you can run now.

## Run the flow before you commit to it

You can run either available example locally on a fork of Arbitrum One. The examples start with local stand-ins for outside services, so exploring the flows requires no accounts or funds. You'll need Node.js 22.13 or newer, pnpm 10, and Foundry.

Start with the treasury app if your immediate problem is converting, moving, and reconciling a business balance. Follow a mint through to the wallet, then inspect the corresponding Paxos record. Try a redemption and watch what the app records before and after it. The repo's tests cover the automatic mint rule, restarts, and failure handling as well as the basic mint and redeem paths.

For the earn app, follow a customer deposit into a vault and then a withdrawal. Compare the customer ledger with the onchain position at each step. The tests also cover reward claims and reconciliation. Read those paths with your own product's accounting requirements in mind: your customer view and your operator records both need to remain explainable as activity changes onchain.

The local fork lets you study application behavior against Arbitrum One state while the outside-service stand-ins keep the setup contained. When you're ready to try the actual service APIs, the README points to the Paxos sandbox on Arbitrum Sepolia.

These examples are unaudited demonstration apps. They're useful for learning integration patterns and testing assumptions; don't use them as production fund-management software.

## Start with an example

Choose the obligation you need to model first: a business treasury balance or a customer claim on an earn product. Run that available example, trace its records through the app and the chain, and note where your own approval, accounting, and recovery requirements differ.

Then bring those findings to an USDG adoption and integration conversation with the Arbitrum team.

![](https://pbs.twimg.com/media/HVTAyGQa0AABQLA.jpg)

Start building with the fully open-source examples: https://github.com/hummusonrails/arbitrum-usdg-examples

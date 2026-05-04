---
title: "Shipping x402 on AWS and Arbitrum"
date: '2026-04-29'
summary: >-
  tl;dr I built an end-to-end x402 demo on Arbitrum One using AWS CloudFront + Lambda@Edge on the provider side and the CDP facilitator for settlement. The repo is at github.com/hummusonrails/arbitru...
tags:
  - slug: blockchain
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2049363842283544939'
images: 'https://pbs.twimg.com/media/HHDNXu5a8AAffnn.jpg'
---

> *tl;dr* I built an end-to-end x402 demo on Arbitrum One using AWS CloudFront + Lambda@Edge on the provider side and the CDP facilitator for settlement. The repo is at github.com/hummusonrails/arbitrum-x402-aws. Clone it, deploy the CDK stack, and watch a 402 come back from your own distribution.

If you spent the last decade shipping HTTP services on AWS, agentic payments probably look like someone else's problem. They are not. The protocol that makes AI agents pay for things on their own runs on the same request-response cycle you already operate, and the infrastructure to run it is the same CloudFront and Lambda you already deploy.

## Why this matters right now

AWS published a reference architecture on March 15 that puts a name on the pattern: HTTP 402 from CloudFront + Lambda@Edge, with a facilitator that settles USDC on-chain. AWS's own framing is that x402 is HTTP-native and platform-agnostic. That second word is the one to sit with. The settlement chain is a configuration choice, not an architectural one.

![](https://pbs.twimg.com/media/HHDKCfXbwAAb3sO.jpg)

Arbitrum One is a sensible choice for that slot. Sub-second confirmations, fees in fractions of a cent, native USDC, and an EVM you already know if you ever touched Solidity or Hardhat. I built a working demo to show what that actually looks like end-to-end.

## The HTTP handshake, end to end

Here is the entire flow. An agent hits GET /report. CloudFront forwards to a Lambda@Edge viewer-request function. With no X-PAYMENT header, the Lambda returns a 402 with the payment terms: chain, asset, recipient, amount. The agent signs an EIP-3009 transferWithAuthorization message offchain, retries the request with the signature in a header, and the Lambda hands the payload to the CDP facilitator for /verify and /settle. On success, the request passes through to the origin and the gated JSON comes back. The whole thing settles on Arbitrum One while you're taking your first sip of coffee.

![](https://pbs.twimg.com/media/HHDKt0YawAAe6y0.jpg)

The provider holds no private keys and writes no onchain code. The facilitator does the EIP-3009 call to USDC. Lambda@Edge does the gating.

## What you can ship this week

The repo is at github.com/hummusonrails/arbitrum-x402-aws. One CDK stack, deploys to us-east-1 in about fifteen minutes once CloudFront propagates. The agent side is a single shell script using OWS to manage the wallet, so you never see a raw private key locally.

If you have an AWS account and one dollar of USDC on Arbitrum One, you can stand up the full flow today. 

![](https://pbs.twimg.com/media/HHDMF3mbQAAcMhH.jpg)

If you are running production HTTP services and thinking about how AI agents will start paying for them, clone the repo, deploy the stack, and watch a 402 come back from your own CloudFront distribution.

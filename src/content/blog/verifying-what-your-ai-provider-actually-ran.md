---
title: "Verifying what your AI provider actually ran"
date: '2026-05-27'
summary: >-
  When you call an AI API, you are trusting the provider on faith. You ask for GPT 5.5, you get billed for GPT 5.5, and you have no way to check what actually ran on the GPU. Token counts and output
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2059564599217652006'
images: 'https://pbs.twimg.com/media/HJULA7IXoAE6ztZ.jpg'
---

When you call an AI API, you are trusting the provider on faith. You ask for GPT 5.5, you get billed for GPT 5.5, and you have no way to check what actually ran on the GPU. Token counts and output diffs do not tell you whether the bytes flowing through the silicon were the bytes of the model you paid for.

This is not a hypothetical concern. Per-token pricing creates a real incentive to substitute. Serving a 7B model is cheaper than serving a 70B. Quantized inference is cheaper than full precision. If a provider can route some fraction of requests through a smaller model and bill at the headline rate, the savings compound at scale.

The obvious fix is cryptography. There is a class of proofs that lets a server show it ran a specific computation without the client redoing the work. Same family of tools that secures zk-rollups.

The math holds. The performance does not. State of the art schemes like zkLLM produce a proof of inference for a 7B model in around 388 seconds per query. Fine for a research demo, useless for an API that needs to respond in under a second.

![](https://pbs.twimg.com/media/HJUJPFSWYAENVY1.jpg)

## A different angle

A new paper from Offchain Labs takes a different route. *T*owards Verifiable AI with Lightweight Cryptographic Proofs of Inference skips the full proof and uses spot-checking instead.

The server commits to two things up front. A fingerprint of the model weights, published once after training. A fingerprint of the internal values the model produced while answering a specific query. Then the client picks a random spot near the output and walks one path back through the layers, asking the server to reveal just the values along that path. At each step, the client checks one thing: does this value follow from the values feeding into it, using the weights the server committed to.

If the server swapped in a different model, the values along the path will not line up, and the check fails.

It is closer to spot-checking a math exam than re-grading it. A single path samples a tiny fraction of the network, but faking values that stay self-consistent across many possible paths gets exponentially harder as the network grows. The authors tested this against the attacks an adversary would actually try, including reverse-engineering activations from the output and swapping likely tokens. None produced a forged set of values that fooled the test across millions of evaluated paths.

## The performance picture

The difference between proving every step and spot-checking a path is several orders of magnitude. On the same Llama-2-7B model, prover time drops from 388 seconds to 5.8 milliseconds. Verification drops from 2.36 seconds to 12.44 milliseconds. The proof grows from 183 kilobytes to 3.4 megabytes, which is the honest tradeoff.

For an API serving millions of inferences a day, this is the right shape. You do not need a per-query proof that withstands an attacker willing to brute-force a single transcript. You need verification that runs at the speed of the request and detects cheating with high probability across volume. Combined with a real penalty for getting caught, that is enough to deter rational adversaries.

![](https://pbs.twimg.com/media/HJUJT9TW4AMjmHp.png)

## Where this gets familiar

If you have spent time thinking about how Arbitrum works, the spot-checking pattern is the thing you already know.

Optimistic rollups rest on the same intuition. Re-executing every step of a long computation on every machine is expensive. Sampling the contested step is cheap. If the system can guarantee that any disagreement gets surfaced and resolved by a tiny onchain check, you get the security of full re-execution without paying for it on the happy path.

The paper makes the connection explicit. Its protocol extends to a setup with two competing servers, and when they produce different claims about the same inference, a bisection procedure narrows in on the disagreement in a logarithmic number of rounds. That is the same dispute resolution structure that secures Arbitrum One, applied to neural network values instead of blockchain state transitions.

Different substrate, same economic logic. Trust the willingness to be challenged rather than the cryptographic load on the happy path.

## What the protocol actually proves

One thing worth being precise about before you build on this.

The paper proves a specific property called other-model soundness. It detects when the server ran a model other than the one it committed to. It does not prove the model's output is correct, it is not zero-knowledge, and the authors leave full LLM soundness against an adaptive adversary as an open problem.

Inside that scope, the protocol is useful. A provider serving a regulated industry can let auditors verify the certified model is the one actually running in production. A platform routing inference across multiple providers can verify each one is honoring its model commitment. A customer paying premium rates for a frontier model can confirm they are getting that model, not a quantized substitute routed in at peak load.

None of those use cases require proving output correctness. They require detecting substitution, at API latency, which is what the paper delivers.

## What gets built next

Settlement is converging on commodity rails. USDC, x402, agent-native payment flows are infrastructure questions now. The more interesting layer is what the agent can prove it did, not how it paid.

Today, "we use model X" is a trust statement. A protocol like this turns it into a verifiable statement. For customers in compliance-heavy domains, the distinction starts to matter quickly. A model transparency claim that holds up under audit is worth more than a marketing claim that does not.

The pattern generalizes too. Anywhere you outsource a deterministic computation to an untrusted service, spot-checking is a viable alternative to re-executing. Inference today, other workloads tomorrow. None of this requires the application developer to refactor anything. It requires someone in the system, the provider, the auditor, or the platform routing requests, to produce a verifiable claim instead of an asserted one. Once that primitive exists at speed, it gets adopted in the places where the trust gap is most expensive.

The signature builder program, Open House, is coming to London in July for an in-person Founder House, with agentic AI as one of the focus areas. Do you have an idea related to how to tackle trust in AI or any topic related to this emerging space? If you want to bring your idea to life with the support of leading ecosystem mentors and the chance to win grants and prizes totaling in the hundreds of thousands of dollars, apply to join today.

![](https://pbs.twimg.com/media/HJUKRkbWcAAChcR.png)

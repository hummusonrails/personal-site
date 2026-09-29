---
title: "Is Structured Human Input the Missing Link in Agentic Work?"
date: '2026-09-24'
summary: >-
  Have you ever told your agent to go do something and walked away? You set the spec clearly. You...
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/is-structured-human-input-the-missing-link-in-agentic-work-2bh1'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fafablonhowi5md397yrh.png'
---

Have you ever told your agent to go do something and walked away? You set the spec clearly. You defined what done should look like. You provided reference materials. You expected to come back later and find it finished. Yet, you come back and its paused waiting for your input.

The times it needs input from you in unpredictable and uneven. This clearly does not scale.

A long-running task can pause for hours. By the time you return, you need to know what it’s waiting for, what answers are valid, and how your response reconnects to the right piece of work. Free-form text can carry an answer, but it can’t reliably describe the interaction that produced it.

A pause needs a contract.

![A2A task pause and resume](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/xymjplsgl8aqnv08y1du.png)

## A2A already has the right lifecycle shape

The [Agent2Agent protocol](https://a2a-protocol.org/latest/) models long-running work as a stateful Task. An agent can move a task into `input-required`, and a client can continue the interaction with the same `contextId` and, where appropriate, the same `taskId`.

That gives you a durable handoff point. The task has an identity, a state, and a history.

A2A messages can also carry structured JSON in a `data` Part. So the protocol already has room for a client to return something more dependable than, “yes, please proceed.”

What’s missing is a standard way for the agent to describe the input it needs when it pauses.

That gap is the focus of [A2A Discussion #1016](https://github.com/a2aproject/A2A/discussions/1016), opened on August 29, 2025. The proposal is direct: when a task enters `input-required`, the agent can provide an input schema for the client. A confirmation can become a boolean. A choice can become a list. The client no longer has to infer a form from an English sentence.

## Text is a weak contract at the moment you need precision

Why does this break down? Because the text prompt is doing two different jobs.

It tries to explain a decision to a person, and it tries to define a data contract for software. Those are separate needs.

![Two jobs, one weak interface](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/oncibr25o0mniknvkw8b.png)

A framework-owned UI can make this work by knowing its own agent runtime. It can render a custom approval component, attach a callback, and translate the response into the format its agent expects. That’s fine inside one application.

The friction appears when the client and server are independent.

A generic A2A client can discover an agent through its Agent Card and run a task without knowing the agent’s framework. When that task pauses, the client should not need an adapter for every remote agent’s approval flow. It should be able to receive a declarative request, render an appropriate control, validate the answer, and send structured data back.

That’s the difference between a pause that works in a demo and one that travels across clients.

![Portable human input across clients](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/xy0m0l1uyfsnvlakazhh.png)

## Human input is part of the workflow state

Treating human participation as unstructured chat also makes operational questions harder than they need to be.

Can an operator see which tasks are blocked on a decision? Can a client distinguish a request for approval from a request for missing account data? Can it route an approval to the person who has authority to make it?

Without a structured request, every client invents its own answer.

With one, the task can say what it needs at the same layer where it reports that it is waiting. The client can then present the request as a form, an approval screen, or an API action, while preserving the same task identity and response shape.

That does not require A2A to dictate a single UI. It gives the UI enough information to act without guessing.

There’s also a practical boundary here. A schema tells a client the shape of input, not whether the client should trust the requested action. The client still owns its policy: who may approve it, what must be shown before approval, and whether the request can proceed. A portable input contract makes those controls easier to build because the request is legible to software.

![Schema and client policy](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/0ramw4ovcqj0ik8l8q7v.png)

## This belongs in an open agent ecosystem

The [Agentic AI Foundation](https://aaif.io) brings projects together around the protocols and infrastructure agents need to work across implementation boundaries. A2A’s task model is already a useful example of that work: agents can remain opaque while exposing enough state for another system to collaborate with them.

Human participation needs the same treatment.

An agent may call tools through MCP, delegate work through A2A, and run inside a client built by someone else. If it stops for a decision, that decision should not collapse back into framework-specific glue code. The request should move with the task.

This conversation is a serious next step in how we build agentic applications. The starting point is the question centered in [Discussion #1016](https://github.com/a2aproject/A2A/discussions/1016) and the work to advance it.

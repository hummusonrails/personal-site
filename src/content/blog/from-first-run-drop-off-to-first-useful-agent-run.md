---
title: "From First-Run Drop-Off to First Useful Agent Run"
date: '2026-07-16'
summary: >-
  I keep coming back to the same onboarding question: what happens in the first 10 minutes? For agent...
tags:
  - slug: ai
    collection: tags
  - slug: tutorial
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/from-first-run-drop-off-to-first-useful-agent-run-mde'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Febc1fqxyou19jpfck9ks.png'
---

I keep coming back to the same onboarding question: what happens in the first 10 minutes?

For agent tools, that window is brutal. A developer opens a repo, starts the agent, asks for a change, and waits to see if the tool understands the project. If the agent guesses the package manager, misses the test path, edits generated files, or asks the developer to explain the repo from scratch, trust drops fast.

That isn't an agent model problem every time. A lot of it is repo readiness.

The [Agentic AI Foundation](https://aaif.io), hosted by the Linux Foundation, is building an open home for projects like MCP, goose, AGENTS.md, and agentgateway. That work can sound big and infrastructural, but one of the most useful entry points is small: make your repo easier for an agent to understand on the first run.

AGENTS.md is the repo-side context. goose is a practical runtime path. Together, they give you a way to move from "the agent is poking around" to "the agent made a useful first pass."

![A structure diagram showing AGENTS.md as repo context and goose as the runtime path that uses it for a first-run task.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/xvraqfw49x6mtf73j6ys.png)

## Start With The First Useful Run

Don't begin by asking, "What should our agent docs say?"

Ask this instead: what should a developer be able to ask an agent to do in this repo within 10 minutes?

Pick one task. Not the whole system. One useful first run.

For example:

- Find the right entry point for a small bug
- Add a focused test around an existing function
- Update a docs page with a known source file nearby
- Explain how a specific package or module is wired

That first run gives your AGENTS.md a job. It isn't a policy dump. It's the context an agent needs to avoid wasting the developer's first session.

## Put Repo Truth Where Agents Can Find It

AGENTS.md is a simple open format for guiding coding agents, and the project site says it's already used by over 60k open-source projects: https://agents.md.

The reason it works is plain: agents need a predictable place for repo instructions. README files are written for humans. CI files are written for automation. AGENTS.md gives agents the details that usually live in maintainer heads.

Your first version should answer:

- What kind of project is this?
- Where does source code live?
- Where do tests live?
- Which files should agents avoid editing?
- What style or architecture choices should agents preserve?
- What should the agent do before claiming a task is done?

Keep it short enough that someone would maintain it. Stale agent instructions are worse than missing ones because they create confident mistakes.

## Write Instructions Like Maintainer Notes

An AGENTS.md file doesn't need brand language. It needs maintainer notes.

Say things like:

```md
# AGENTS.md

## Project Shape

This repo contains a web app and supporting packages. App code lives in `apps/web`. Shared code lives in `packages`.

## Working Rules

Prefer small changes that match nearby patterns. Do not rewrite public APIs unless the task asks for it.

## Tests

When changing behavior, add or update the closest existing test. If you can't run the test locally, say what you inspected and why the test wasn't run.

## Files To Avoid

Do not edit generated files, lockfiles, or vendored code unless the task is specifically about dependency updates.
```

Notice what's missing: fake certainty.

Don't say "run the full test suite" unless that's realistic. Don't list commands you haven't checked. Don't tell the agent to use a package manager you don't use. Your agent instructions should be as true as your README.

## Design The Goose Path

goose is an open-source AI agent runtime under AAIF. Its project page describes it as an agent that can install, execute, edit, and test with any LLM: https://aaif.io/projects/goose.

![An open source, extensible AI agent that goes beyond code suggestions. Install, execute, edit, and test with any LLM.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/sdp9cqni2w1qsq089nvb.png)

For onboarding, think of goose as the first-run path you can test against your repo instructions.

A good first-run path has three pieces:

- A clear starting task
- A repo-level AGENTS.md
- A visible stopping point

The stopping point matters. If the agent changes code, how does the developer know whether it did the right thing? Maybe the agent should point to the files it changed. Maybe it should explain the test it would run. Maybe it should stop before touching a migration, generated file, or public API.

That belongs in AGENTS.md.

## Make The Agent Ask Better Questions

A useful agent doesn't need to know everything. It needs to know when to stop guessing.

Add guidance for uncertainty:

```md
## When Unsure

If the requested change touches auth, billing, data deletion, or production configuration, ask before editing.

If there are multiple plausible implementations, describe the tradeoff and choose the smallest local change unless the user tells you otherwise.
```

Why does that help? Because first-run drop-off often comes from surprise. The agent edits the wrong layer, takes a broad refactor path, or treats a risky area like ordinary code.

Good instructions narrow the blast radius.

## Treat Docs As Product Surface

Developer onboarding isn't separate from product. The docs shape what users try, where they get stuck, and whether they come back.

For agent-ready repos, AGENTS.md is part of that product surface. So review it the same way you'd review a quickstart:

- Is the first task obvious?
- Are repo boundaries named?
- Are setup assumptions current?
- Are risky areas called out?
- Can a new contributor tell what "done" means?

This is where AAIF's open ecosystem angle becomes practical. If agent tools are going to work across projects, maintainers need shared conventions that don't depend on one vendor, one editor, or one model. AGENTS.md gives repos a portable instruction layer. goose gives developers an open way to run agent workflows against it.

Small file. Real leverage.

## A Practical Checklist

Use this before you point an agent at your repo:

![An iteration loop for improving AGENTS.md by running a first task, observing wrong guesses, and editing the instructions.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/gq2ty1041q8w51vv2yxl.png)

1. Pick one first-run task a new developer would value.
2. Add or update AGENTS.md with project shape, test expectations, and files to avoid.
3. Remove commands you haven't verified.
4. Tell the agent how to behave around risky code paths.
5. Run the first task through goose or your agent runtime of choice.
6. Edit AGENTS.md based on where the agent guessed wrong.
7. Repeat until the first run produces something you would review seriously.

The goal isn't to make the agent perfect. The goal is to make the first session legible.

A developer should be able to open the repo, start the agent, ask for one scoped task, and understand the result without becoming the repo tour guide.

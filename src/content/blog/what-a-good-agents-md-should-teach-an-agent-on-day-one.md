---
title: "What a good Agents.md should teach an agent on day one"
date: '2026-08-03'
summary: >-
  I hit this last week while working inside my own OpenClaw workspace: the agent had access to the...
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/what-a-good-agentsmd-should-teach-an-agent-on-day-one-3nen'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2F2gdmc204nncht6dynt8p.png'
---

I hit this last week while working inside my own OpenClaw workspace: the agent had access to the right files, the right tools, and the right project context, but the useful behavior didn't come from any one magic prompt. It came from a small stack of durable instructions.

The root `AGENTS.md` said what to read first. `SOUL.md` defined the assistant's operating posture. `USER.md` gave personal context. `TOOLS.md` separated reusable tool behavior from local machine details. Skill docs explained when to load specialized workflows.

That structure has proven useful for me time and time again.

![A stack showing AGENTS.md as the routing file that points agents to posture, user context, local tool notes, and deeper skill file](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/y64aiuyhqehi0cthf6d5.png)

AGENTS.md, now part of the [Agentic AI Foundation](https://aaif.io) ecosystem hosted by the Linux Foundation, gives developers a plain Markdown place to tell coding agents how to work in a repo. The format is intentionally simple. The hard part isn't the file. The hard part is deciding what deserves to live in it.

## Start with the first five minutes

A good `AGENTS.md` should answer one question first: what should the agent do before touching code?

In my workspace, the startup path is explicit:

1. Read `SOUL.md`
2. Read `USER.md`
3. Read today's and yesterday's daily memory files
4. In a main session, read `MEMORY.md`

That gives the agent a boot order. It doesn't need to guess which file matters, whether memory is allowed, or whether private context belongs in a shared chat.

Most repo instructions skip this. They say "follow project conventions" and then bury the conventions across a README, package scripts, CI config, old PRs, and comments. An agent can search, but search isn't the same as orientation.

Give it a first route through the repo.

![A boot flow for an agent: read AGENTS.md, load context, route by task type, act within boundaries, and update durable docs when needed.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/q983puhctwz0syu2q9e3.png)

## Separate identity from operating rules

Your repo probably doesn't need a `SOUL.md`, but the pattern is useful. One file can define working posture, while `AGENTS.md` defines project behavior.

For a software repo, that might look like this:

```md
## Working posture

- Read the existing code before proposing new abstractions.
- Prefer local helpers over new dependencies.
- Keep changes scoped to the user request.
- Run the narrowest useful test first, then broaden if the change touches shared behavior.
```

Those are judgment rules. They belong near the top because they shape every later decision.

Then put repo-specific mechanics somewhere else:

```md
## Commands

- Install dependencies: `pnpm install`
- Run unit tests: `pnpm test`
- Run type checks: `pnpm typecheck`
```

Why split them? Because commands change faster than principles. If you mix everything together, the file turns into a junk drawer. Agents will still read it, but you won't know which instruction is steering behavior.

## Put boundaries where the agent will trip over them

The best line in my workspace `AGENTS.md` is short: `trash > rm`.

That teaches a local safety rule in three tokens. It says destructive deletion should be recoverable. It doesn't explain Unix philosophy. It doesn't lecture. It gives the agent a rule it can apply while acting.

Your `AGENTS.md` should include boundaries like that:

```md
## Red lines

- Don't edit generated files directly.
- Don't change public API behavior without updating tests.
- Don't run migrations against shared databases.
- Use `trash` instead of `rm` when deleting local files.
```

Notice the shape: concrete verbs, concrete objects, concrete limits.

"Be careful with data" is too vague. "Don't run migrations against shared databases" gives the agent something it can obey.

## Teach context access rules

Agents often fail by reading too little or too much. Repo instructions can fix both.

In my workspace, `MEMORY.md` is only loaded in main sessions, not shared contexts. That's a privacy rule and a context rule at the same time. Daily notes are raw logs. Long-term memory is curated. `TOOLS.md` is for environment-specific notes, while skills are reusable.

That structure avoids a common problem: durable instructions become a dumping ground for every fact anyone might need someday.

For a team repo, you can use the same split:

```md
## Context files

- `README.md`: human setup and project overview.
- `AGENTS.md`: agent workflow and repo norms.
- `docs/architecture.md`: current service boundaries.
- `docs/runbooks/`: production procedures. Read only when the task touches operations.
- `.env.example`: allowed environment variable names. Never read real `.env` files unless asked.
```

That last sentence matters. It tells the agent where the map ends.

## Keep local details out of shared skills

![A decision tree for placing instructions in reusable skills, AGENTS.md, local tool notes, private memory, or temporary task notes.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/9aozg2ijufyysktbazrx.png)

`TOOLS.md` in my workspace makes a clean distinction: skills define how tools work, and `TOOLS.md` stores local specifics like camera names, SSH aliases, speakers, or preferred voices.

That maps well to engineering teams.

A reusable instruction might say:

```md
When debugging CI, inspect the failing job logs before changing code.
```

A local instruction might say:

```md
The staging dashboard is at <internal URL>.
```

Those shouldn't live in the same place. Reusable instructions can move across projects. Local details shouldn't leak, and they age faster.

This is one reason AGENTS.md fits naturally inside the AAIF project set. MCP describes how agents connect to tools. agentgateway works on routing and governing agent traffic. AGENTS.md handles repo-level behavior. You need all of those layers if agents are going to work across projects without each tool inventing its own private convention.

## Use skills for depth, not bulk

My workspace says: "Skills provide your tools. When you need one, check its `SKILL.md`."

That's the right division of labor. `AGENTS.md` should route the agent to deeper instructions. It shouldn't contain the full manual for every workflow.

Bad:

```md
## Release process

[900 lines of release rules, changelog policy, package registry notes, rollback steps, comms templates, and edge cases]
```

Better:

```md
## Release process

For release work, read `skills/release/SKILL.md` before making changes. Do not publish packages or create GitHub releases unless the user explicitly asks.
```

Why does this work? The root file stays readable, and the agent loads detail only when the task needs it.

That matters more as context grows. An instruction file can hurt you if it forces every task to carry every workflow. A CSS fix doesn't need your incident response manual.

## Tell the agent when to speak and when to stay quiet

This is an important part as well that shouldn't be ignored.

The workspace `AGENTS.md` has group chat rules. It tells the assistant to respond when directly mentioned, when it can add value, or when correcting meaningful misinformation. It also tells the assistant to stay quiet when the conversation is casual or already answered.

That's repo-relevant too. Agents need communication norms.

For a development repo, that might be:

```md
## PR comments

- Comment when a change affects behavior users can observe.
- Mention test gaps plainly.
- Don't restate the diff.
- Don't leave speculative security claims without a concrete path or file reference.
```

Agents generate a lot of text by default. Your instructions should define what useful text looks like in your project.

## Make maintenance part of the contract

The workspace instructions have a blunt rule: no "mental notes." If something should persist, write it to a file.

That belongs in more repos.

Agents learn project facts during a task: a flaky test command, a generated directory that shouldn't be edited, a local setup wrinkle, a service boundary that wasn't documented. If the agent only uses that knowledge once, the next run pays the same discovery cost.

Add a maintenance rule:

```md
## Updating these instructions

When you learn a durable repo rule, update `AGENTS.md` or the relevant doc in the same PR. Keep task-specific notes out of this file.
```

Then enforce the second sentence. Otherwise AGENTS.md becomes a chat transcript with headings.

## A practical structure

If I were starting a repo-level `AGENTS.md` today, I'd use this shape:

```md
# AGENTS.md

## Start here

- Read this file before making changes.
- Read `README.md` for setup.
- Read the nearest package-level `AGENTS.md` if one exists.

## Working posture

- Preserve existing patterns unless the task calls for changing them.
- Keep edits scoped.
- Prefer small tests close to the changed code.

## Commands

- Install:
- Test:
- Typecheck:
- Lint:

## Repo map

- `apps/web`: frontend
- `packages/api`: API client
- `packages/db`: schema and migrations

## Boundaries

- Don't edit generated files.
- Don't run destructive database commands.
- Ask before publishing, emailing, posting, or deploying.

## Workflow routing

- For releases, read `docs/release.md`.
- For security changes, read `docs/security.md`.
- For UI changes, inspect existing components first.

## Maintenance

- Add durable lessons here.
- Remove stale instructions when the code changes.
```

That's enough for day one. It creates the framework to build upon as you continue to iterate.

The goal isn't to make the agent know everything. The goal is to make the first move reasonabe, the dangerous moves constrained, and the next file obvious.

In an open agentic ecosystem, the shared convention doesn't need to be heavy to be useful. It needs to be predictable enough that any agent can arrive in your repo and know where to begin: `AGENTS.md`.

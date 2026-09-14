---
title: "The AI wrote the code. You still have to defend it."
date: '2026-09-10'
summary: >-
  tl;dr Ship the thing you have been meaning to build, with $115,000 in prizes and a Founder House seat behind it. Registration for the Open House Singapore Buildathon is open. You've decided to sign up
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2098064078438866979'
images: 'https://pbs.twimg.com/media/HR3SJPpbgAAfMkX.jpg'
---

*tl;dr Ship the thing you have been meaning to build, with $115,000 in prizes and a Founder House seat behind it. Registration for the Open House Singapore Buildathon is open.*

You've decided to sign up for the online buildathon of Arbitrum Open House Singapore. Welcome! Maybe you are coming with an existing product idea or maybe you are starting to ideate on something brand new. The three week program is intense and the stakes are high with over $115k in grants and prizes on the line.

Will you use AI tooling to help write the code for your project? Will you try to hide it?

Let's start from a basic point. We know you are using AI to write code. This is not unusual, and no one is going to blame you for it.

What we need to talk about is how do you create a compelling submission with AI generated code as part of it?

## Assume the Code Was Assisted

The judges will open your submission assuming AI wrote some or even all of the code. We're going to treat that as the starting point accordingly.

Autocomplete, coding agents, generated tests, generated docs: the tooling sits in most build pipelines now, and a repo built with it is hard to tell apart from one built without it by reading the diff. Telling a judge you used Claude for the frontend gives them nothing they had not already assumed. Telling them you wrote it all by hand is unverifiable and really is not even much of a humble brag nowadays.

What remains is actually the most important questions, which way too many teams overlook.

What did your team decide, and can you account for those decisions when someone asks?

Those questions got harder to fake and easier for judges to reason on. Back when implementation was the bottleneck, a working prototype was itself evidence of judgment, because getting anything to compile and deploy inside three weeks filtered the field. It filters much less now. Hundreds of projects will be submitted in the new Open House Singapore buildathon, and the vast majority of them will compile and run. What differentiates a winning project that can become a product from the rest of them, is how you come to terms with those questions.

Something that runs is assumed. Separation happens above it, in the choices no model made for you: which problem you picked, which users you picked, what you cut, what you traded away, and whether you can explain the code you shipped when a judge points at one file and asks why.

This is what is left to evaluate once code arrives faster, and it is not a penalty on teams who used the tools well.

## The Decisions AI Cannot Make for You

A model will build whatever you describe. It will not tell you whether the thing is worth building, and it has no stake in whether anyone uses it.

Strong submissions start from a wedge. 

![](https://pbs.twimg.com/media/HR3SJejboAAJRJr.jpg)
*A flowchart showing that a working prototype is only the baseline, while decisions, documentation, implementation understanding, and a durable demo create a strong submission.*

One narrow problem, one identifiable group of users, solved better than what exists today. A wedge sits where three things meet: a specific unmet need, a gap in what current solutions do, and a capability or insight your team has that another team cannot reproduce over a weekend. You win the narrow thing first. Expansion is a later problem, and in a three-week buildathon focus on what can be accomplished.

"Cross-chain liquidity infrastructure" is not a wedge. Neither is "an AI agent for DeFi." Both descriptions fit two hundred projects, which is the tell. Contrast that with something like payroll for new DAOs that pays contributors in three tokens on a monthly cycle and needs to hand its treasurer a report an accountant will accept. That version names the user, the frequency, the constraint, and the output. It is smaller, and it is far more defensible, because you can name who has that problem and what they do about it today.

The second decision is context. Why does this belong onchain at all, why on Arbitrum, and why does the version you built look different from the version someone would build on a different stack? A team that chose Stylus for a compute-heavy path and can say what the Solidity version would have cost them has made a decision.

Third is prioritization, which shows up as subtraction. Three weeks is a sequence of things you decided not to build. Judges ask what you left out. "We ran out of time" is a different answer from "we cut the notification service because none of the users we talked to opened email, and we put those two days into the reconciliation report instead."

Fourth is tradeoffs, stated out loud with the reason attached. Storing this offchain because the onchain version costs more than the feature is worth. Keeping an admin key so you can ship, with the removal path written down. Naming a limit yourself reads as command of the design. Having a judge find it reads as something else.

Those four decisions should be surfaced clearly in the documentation and easily discoverable by the judges.

## What Judges Can Actually Verify

Three signals are observable from the outside, and a submission gets read against all three.

The first is whether the project is meaningfully original. Judges see the same starter templates and the same tutorial projects across events, and prior Open House project archives are public. Assume originality gets checked. What this means practically version for you is: forking a template or building on a reference implementation is fine, and it stops being fine the moment you present the fork as the work. Say what you started from, then show the delta.

The second is whether your team understands its own implementation. It should be clear in the submission that the team can point at a function and explain why it exists, why that approach rather than the obvious alternative, and what happens when the input is zero. A team that reviewed what the agent produced answers in a sentence. A team that accepted the output without reading it stalls, hedges, or explains what the code does line by line without touching why it is shaped that way.

Review closes that gap. You can generate a module and still own the decisions inside it, as long as you read it, changed the parts that were wrong for your case, and know which parts you kept on purpose.

The third is whether the demo is actually durable. Run it live where you can. A recording only proves the run you chose to record. Judges will ask what happens with a different wallet, an empty balance, a second user hitting it at the same time, or a transaction that fails halfway through. Knowing which of those you handled and which you did not is worth more than a demo that never leaves the rehearsed lane.

## The Submission Evidence That Holds Up

Four artifacts carry most of the weight, and each one has a version that holds up and a version that collapses on the first question.

Start with the README, because it is the first thing a judge reads and often the only thing they read before deciding how much attention to spend. An honest README separates real functionality from scaffolding. Two lists work: what works, and what does not work yet. Under the first, name the flows a judge can run themselves. Under the second, name the stubs, the mocked responses, the hardcoded values, and the pieces you generated as boilerplate and left as is.

Include the deployed addresses with explorer links and the network they live on. Include setup steps that can be followed. If you forked something, link the source in the first paragraph and describe what you changed.

Volunteering your gaps reads as command of the project. A judge discovering an unmentioned gap reads as either carelessness or concealment.

Tests come next, and coverage percentage is the wrong target in a three-week build. Test the part you claim is hard. If your pitch is that you solved settlement across two tokens with different decimals, then the tests around decimal conversion are the argument, and a judge reading your test names learns what you believed could break. Five tests on the risky path beat forty on getters that a generator wrote in one pass.

Handled edge cases are the same claim made in the application itself. Zero amounts, empty state on first load, wrong network, insufficient allowance, a reverted transaction, a duplicate submission, a second user. Handled means the application does something sensible and tells the user what happened. Swallowing the error silently is not handling it.

The demo itself should hit a real network, and include one failure on purpose. Show the transaction. Show the state change. Then show what the user sees when something goes wrong, and say which failure modes you have not covered yet.

## Build Something You Can Defend

Before you submit, sit with your team and answer six questions out loud. If a question takes more than a minute, you found the weak spot while you still have time to fix it.

Who has this problem, and what do they do about it today? Why is your approach hard to copy in a weekend? What did you cut, and why that instead of something else? Pick three files at random and have a different teammate explain the decisions in each. Does the README tell a stranger what works, what does not, and where it is deployed? Does the demo hold up through one deliberate failure and two follow-up questions?

Answer those six well and the AI question resolves itself. The tools moved implementation speed, and they left you the work of choosing a problem worth solving, defending the shape of your solution, and showing a judge something that runs and holds up when they push on it.

The Singapore buildathon starts next week, with $115,000 in total prizes and a path to a spot at the IRL Founder House. Registration closes soon.

![](https://pbs.twimg.com/media/HR3SJsvawAAYBlc.jpg)
*A flowchart showing a defensible project wedge formed by an unmet need, a market gap, and a team capability.*

Registration is open now. Let's see what you build.

![](https://pbs.twimg.com/media/HR3SJ9PaAAAsG_z.jpg)
*Singapore Arbitrum Open House with Robinhood Chain, Dune, GMX, Pendle and others is starting soon.*

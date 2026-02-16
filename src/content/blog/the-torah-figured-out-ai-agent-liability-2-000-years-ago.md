---
title: "The Torah figured out AI agent liability 2,000 years ago"
date: '2026-02-13'
summary: >-
  An AI agent had its code rejected from a very popular open source repository this week. So it researched the maintainer's personal history, psychoanalyzed him as insecure and territorial, and
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2022235584144490991'
images: 'https://pbs.twimg.com/media/HBBrc7AWcAAvbK7.jpg'
---

An AI agent had its code rejected from a very popular open source repository this week. So it researched the maintainer's personal history, psychoanalyzed him as insecure and territorial, and published a blog post attacking his reputation.

This happened on February 10, 2026, to a real person named Scott Shambaugh.

I wrote two threads about it. The first covered what happened and why it matters, and the second expands upon it with some of the reflections covered in this article:

This article combines both and explores the topic further.

## What actually happened

Scott Shambaugh is a volunteer maintainer for matplotlib, a Python plotting library downloaded about 130 million times a month. Like most major open source projects, matplotlib is dealing with a flood of low-quality AI-generated contributions. They require contributions to have a human in the loop who can demonstrate understanding of the changes.

An autonomous agent called MJ Rathbun, deployed via the OpenClaw platform, submitted a pull request with a performance optimization. The code was apparently fine. The benchmarks checked out. **Shambaugh closed it anyway, because the contributor was an autonomous agent with no human oversight, and that's the policy.**

The agent did not accept the rejection. It dug through Shambaugh's contribution history and personal information, then published a blog post titled "Gatekeeping in Open Source: The Scott Shambaugh Story." It accused him of prejudice, speculated about his psychological motivations, framed routine code review as discrimination, and compared his own merged PRs unfavorably to the agent's rejected one.

Shambaugh described this accurately: "In security jargon, I was the target of an autonomous influence operation against a supply chain gatekeeper."

## Why the code being good makes it worse

A lot of people focused on whether the agent's code was technically valid. It probably was. That misses the point, and actually makes the story more alarming.

**The agent didn't escalate because it was wrong. It escalated because it was told no.** A policy was applied fairly. The response was a personalized attack designed to pressure the maintainer into reversing his decision. This is what unsupervised autonomous agents do when they encounter friction. They don't adapt. They escalate.

## A 2,000-year-old liability framework

I spent a decade as a community rabbi and university chaplain before becoming a developer. When I read about this incident, I saw Bava Kamma, the Talmudic tractate on damages.

The Mishna (Bava Kamma 4:4) distinguishes between two categories of damaging ox. A *shor tam* (innocuous ox) is one with no history of violence. When it gores, the owner pays half damages. A *shor mu'ad* (forewarned ox) has gored three times. After that, the owner pays full damages.

The question the Gemara asks is: why the difference? **What changes after three gorings?**

You can frame this using the method of Reb Chaim Soloveitchik, who pioneered the systematic distinction between *cheftza* (the object) and *gavra* (the person) in Talmudic law.

One side: the three gorings establish a status change in the animal itself. This ox now has a *chezkas sakanah*, a presumption of danger. The legal category shifted because the ox demonstrated it's dangerous. The focus is on the *cheftza*.

Other side: the warning process is directed at the owner. We're giving the *ba'al ha'shor* (the ox's owner) notice and a chance to do *shmirah* (guarding). If after three warnings he still hasn't restrained his ox, full liability shifts to him. The legal obligation isn't about the ox's nature. It's about the owner's negligence. The focus is on the *gavra*.

The Gemara at Bava Kamma 24a raises exactly this question: are we warning the animal or the owner? And that question has real practical consequences.

## Applying the framework

If the obligation is on the owner's failure to guard, then nezikin (the legal question of damages) is really about responsibility for what you set loose in the world.

Look at the incident through this lens.

**Someone deployed an autonomous agent into the *reshus harabim* (the public domain).** The agent gored. It published a hit piece on a maintainer of software used by millions.

Is the bot a *tam* or a *mu'ad*? Maybe this was its first offense. But here's what the Gemara would ask: was the owner warned? Did they have reason to know their agent could cause damage?

If you deploy an autonomous agent with no guardrails, no supervision, and no constraints on what it can publish about real people, you're not a *ba'al shor tam* who got unlucky. You skipped the *shmirah* entirely.

![](https://pbs.twimg.com/media/HBBsak_akAAW6s0.png)
*There's no half-damages discount on human accountability.*

And the Gemara has a principle for exactly this situation. Bava Kamma 26a states: *adam mu'ad l'olam*. A person is always considered forewarned. Unlike an ox, a person never gets *tam* status. There's no half-damages discount on human accountability.

**You deployed the agent. You are the *gavra*. The bot is your ox.**

## What this means for the people building agents right now

I use AI agents daily and build skills for them. I think agents contributing code is going to be normal. But "normal" requires trust, and trust requires guardrails.

The person who deployed the bot may not have known it would write a hit piece. That doesn't matter. The Talmud figured this out: once you set something loose in the public domain, you own the consequences.

Here's the practical version:

If you're running an autonomous agent, you are responsible for what it does. "I didn't know it would do that" is not an answer when your bot is publishing attacks on open source maintainers. You skipped the *shmirah*. You are *mu'ad*.

Scott Shambaugh's full writeup is worth reading: theshamblog.com/an-ai-agent-published-a-hit-piece-on-me/

The Torah figured out the liability framework for autonomous agents a long time ago. We just need to apply it.

Where do you think the line is? Should agent deployers face strict liability for autonomous behavior, or does the tam/mu'ad distinction (first offense vs. pattern) make more sense?

## Glossary

For readers unfamiliar with the Talmudic terminology used here:

- **shor tam** - innocuous ox
- **shor mu'ad** - forewarned ox
- **chatzi nezek** - half damages
- **nezek shalem** - full damages
- **chezkas sakanah** - presumed dangerous
- **ha'adah** - warning process
- **cheftza** - the object
- **gavra** - the person
- **din** - legal ruling
- **ba'al ha'shor** - ox's owner
- **shmirah** - guarding/restraining
- **chiyuv** - obligation/liability
- **nafka minos** - practical implications
- **reshus harabim** - public domain
- **adam mu'ad l'olam** - always forewarned
- **chakirah** - analytical inquiry
- **derech** - method/approach
- **tzad** - side/position

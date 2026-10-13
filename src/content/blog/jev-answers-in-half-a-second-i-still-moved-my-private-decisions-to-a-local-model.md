---
title: "Jev answers in half a second. I still moved my private decisions to a local model."
date: '2026-10-06'
summary: >-
  A few weeks ago I wrote about testing Jev, TypeSafe's decision model, against Claude Sonnet on a judging gate I run several times a year. Jev matched Sonnet's accuracy at roughly a fiftieth of the
tags:
  - slug: posts
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2107357595120067048'
images: 'https://pbs.twimg.com/media/HT7WjBdaAAAMn9G.jpg'
---

A few weeks ago I wrote about testing Jev, TypeSafe's decision model, against Claude Sonnet on a judging gate I run several times a year. Jev matched Sonnet's accuracy at roughly a fiftieth of the cost and a tenth of the latency.

That answered one question for me: a frontier LLM was overkill for bounded decisions. It also left a second one open. Some of the decisions I want automated should never leave my machine.

![](https://pbs.twimg.com/media/HT7WjMAbsAEDkaf.jpg)
*A bar chart showing Clef Flash agreement rates across different question types.*

## The decisions I kept out of the cloud

After the Sonnet experiment, I wired Jev into a lot of my personal assistant. Today it makes over a hundred small calls a day: is this post worth my attention, what is happening in the room my home robot is in, how urgent is this item in my morning briefing.

Then I hit a list of seven places where I said no.

These were the decisions that needed inputs I am not comfortable sending to any third party. My calendar and the meetings on it. My email inbox. Personal planning notes. The voice commands I give my other smart devices. A scan of my draft content for leaked secrets before anything goes public. Notes from my own knowledge base, and whether one of them is safe to share.

**Jev was a good fit for all seven decisions, and I still declined to send them.** I built the guardrail into the code: those seven surfaces are marked declined, and the client refuses to send them to TypeSafe at all. For weeks they ran on the old paths, which meant regex, heuristics, or nothing.

## Enter Clef Flash

Cloudflare released Clef Flash, a 9B open-weight model under Apache 2.0 that runs in Ollama. It speaks the same System One contract as Jev. Same Choice, Score and Noul primitives, same request shape, same response shape.

That meant my question sets worked unchanged. I did not have to rewrite a single prompt or parser to point a decision at a local model instead of a hosted one.

I had a second option on paper, Clef's 27B sibling. It needs about 18 GB loaded. My machine is a 36 GB M3 Max that also runs my daily workflows, including video calls, so that was off the table before I started. Flash with an 8K context window loads at about 12 GB.

## How I ran the comparison

I did not repeat the careful, gold-labelled setup from the Sonnet experiment. I wanted a quick read, so I chose speed over rigor.

I decided to run all the decisions I was running through Jev already also through Clef.

Every call Jev answered in production got written to a local spool. Every five minutes a background job replayed that spool against Clef Flash, one call at a time, and recorded both sets of answers next to each other. The job steps aside when I am in a meeting, when the machine is busy, or when free memory runs low, and it unloads the model after every batch so it is not sitting on 12 GB while I work.

Over three days that produced 379 replayed calls containing 1,783 individual questions.

**Agreement here means agreement with Jev, not with ground truth.** I did not review these answers by hand. When the two models disagree, I know they disagree. I do not always know who was right.

## Where they agree, and where they drift

Across all 1,783 questions, Clef gave the same answer as Jev 73.4% of the time. Only 31.7% of calls matched on every question, because one call might ask five or seven things at once.

Whether they agree or disagree depends almost entirely on the kind of question.

On yes/no questions (Nouls), the two models agreed 93.3% of the time, 754 of 808. Even when they agreed, the probabilities were close: the median gap between Jev's number and Clef's was 0.11.

On pick-one-of-several questions (Choices), agreement fell to 56.4%. On 0 to 4 scores, they landed within half a point of each other 59.2% of the time.

![](https://pbs.twimg.com/media/HT7WjXbaQAAYAKV.png)
*A bar chart comparing median confidence on Choice questions for two models.*

The confidence numbers explain why. **On Choice questions, Jev's median confidence was 0.89. Clef's was 0.47.** Clef hedges. 

![](https://pbs.twimg.com/media/HT7WjiKbAAAroi6.jpg)

Look at one example from the home robot's room read: both models picked "quiet company" for what was happening in the room, but Jev put 0.92 on it and Clef put 0.65, spreading the rest across resting, a meal and music. When the top two options are close, a model that hedges flips between them, and the agreement rate drops.

A forecast surface made mostly of yes/no questions agreed on 93% of its questions. My X timeline scoring landed at 76%. The robot's read of the room, which is mostly multi-way choices, agreed on only 53%.

## Speed is where Jev pulls ahead

On the replayed calls, Jev's median latency was between 350 and 520 milliseconds depending on the surface.

Clef Flash, already loaded, took a median 2.3 seconds. From a cold start it took 8.2 seconds, and 181 of the 379 replays were cold starts because I unload the model between batches on purpose.

Cloudflare quotes a 38.8 millisecond median for Clef Flash, with a p95 of 122.4 milliseconds, served from its own Workers AI infrastructure. On a laptop sharing memory with my work, the same model ran about 60 times slower than that warm, and more than 200 times slower cold.

![](https://pbs.twimg.com/media/HT7WjrmakAAV202.jpg)
*From the Cloudflare blog post: https://blog.cloudflare.com/clef-decision-models/*

Live traffic is slower still. The seven private surfaces send fuller inputs than I would ever send to a hosted model, because nothing leaves the machine. Planning judgments run 2,000 to 3,700 tokens of state. Across the first 49 live local calls, the median latency was 13.4 seconds. Three of those 49 hit a 60-second timeout I added and fell back to the old path.

![](https://pbs.twimg.com/media/HT7Wj05acAAIsiq.png)
*A bar graph comparing latency for different systems.*

**Jev answered 434 live calls over the same period at an average of 570 milliseconds.**

It is also why my home robot stays on Jev. When I ask it something, half a second feels like a conversation and three seconds feels like a broken toy.

## The cost argument evaporated

I expected cost to be the case for running local. It was not.

Over the last seven days Jev handled 825 calls in my assistant and cost me six cents.

At that price, saving money is not a reason to run anything locally. The cost of Clef shows up somewhere else. It takes 14 GB of my laptop's memory while loaded, the GPU sits at 99% during each call, and the drain job skipped 31 runs because the machine was already busy and 9 more because I was in a meeting.

**The trade is not dollars against dollars. It is a fast, cheap, external model against a slower one that never sends my data anywhere.**

## So I split the work

Once I framed it that way, the routing decision was easy.

Everything that already went to Jev stays on Jev. It is faster, more confident, and the inputs are things I am comfortable sending out.

The seven private surfaces now run live on Clef Flash on my own machine. Each one keeps a backstop: the secret scan still has a regex pass and a manual check by me before pressing publish, the knowledge-base suggestions still land in a review queue, and the prep gate before meetings fails open so I still get my brief if Clef times out. Local calls also hold during meetings, so a 13-second inference never competes with my video call for the GPU.

Those surfaces went from no model at all to a model that sees the full context.

## What I am checking next

The low Choice agreement does not tell me Clef is wrong. It tells me Clef is less certain, and on those questions I do not know yet which model reads the situation better.

The next thing I want to know is whether a confidence threshold does for Clef what it did for Jev in the Sonnet experiment, where gating at 0.5 automated 98% of decisions without a single error.

The bigger lesson for me is that the System One contract matters more than any one model. Because Jev and Clef answer the same shape, choosing between them is a routing decision per surface, not a rewrite. Speed-sensitive work goes to the hosted model. Private work stays on my machine.

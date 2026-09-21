---
title: "Jev vs Claude: Who Wins?"
date: '2026-09-18'
summary: >-
  I did not need Jev to beat Claude or Kimi on a benchmark. I needed to know whether I could trust it...
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/jev-vs-claude-who-wins-4mln'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fks97t21dtlzy5offfyaw.png'
---

I did not need Jev to beat Claude or Kimi on a benchmark. I needed to know whether I could trust it with a decision I actually make regularly, where a false pass matters and uncertainty cannot just be hidden behind confident prose.

*That is a much harder test of the product claim.*

## The decision I actually needed

A surprising amount of AI work starts with the assumption that the answer should come from a large language model.

I wanted to challenge that assumption.

I had a useful test case in a judging workflow that I have iterated upon numerous times and use multiple times a year. The dataset I used for this experiment was from the 2026 Arbitrum Open House London Online Buildathon. One part of that workflow is an *Arbitrum Alignment* gate. Given the evidence already collected for a project, the system has to make one bounded decision:

> satisfied, not_satisfied, or insufficient_evidence.

**That is not a writing task.**

The broader judging rubric absolutely contains work that benefits from a frontier LLM. There are 0 to 5 scores that require reading code, interpreting implementation quality, and weighing technical evidence. There are also prose fields where useful explanations need to be generated.

The full workflow never ends with a final score, rather a brief is given back to me, the human reviewer, to thoroughly analyze, source check and make a final call on.

I was not testing those.

I isolated the part of the workflow where the model is not being asked to write, brainstorm, explain, or synthesize an open-ended answer. It is being asked to apply a defined policy to a bounded evidence packet and choose one of three states.

**That is almost exactly the territory TypeSafe claims Jev is built for.**

So the question was not whether Jev could replace Claude, GLM, Kimi or Qwen.

It was whether those models were overkill for this decision in the first place.

## A fair fight, deliberately narrow

I tested 102 archived submissions, anonymized as P-numbers.

Each system received the same JSON evidence packet and the same four-step written decision procedure. Every configuration ran three times across all 102 submissions, producing 306 decisions per variant. I ran it against Claude Sonnet.

There was no Jev specific simplification of the policy and no additional context given to Sonnet. Both systems had to answer the same question from the same evidence.

![A controlled decision test](https://raw.githubusercontent.com/hummusonrails/devto-blog-assets/main/d8885df0478c4d2f9afebd1ba34e6ed0-diagram-1.png)

**The narrowness of the test is important here because it relates exactly to what TypeSafe claims Jev is all about.**

Jev is not a general-purpose text model. TypeSafe positions it as a System One model for structured decisions, with primitives such as Choice, Score, and Noul rather than free-form generation. Choice, the relevant primitive here, selects among a predefined set of outcomes and returns probabilities and confidence alongside the decision.

The workload also fit within Jev's current constraints. I was passing a structured evidence packet for one verification gate, not asking it to ingest an entire repository or execute the complete judging workflow.

That makes this a deliberately unfair place to make a sweeping model comparison.

It also makes it a very fair place to test Jev's actual claim.

If a model built specifically for bounded decisions cannot hold up here, then everything else about Jev pretty much falls to the sidelines.

## Same accuracy band, radically different operating cost

No more suspense, the tl;dr is it held up.

Jev choice plus four diagnostic Nouls reached 100.0% accuracy against the existing labels across the 306 decisions. It produced zero false passes, zero false flags, and was unanimous across all three runs.

Claude Sonnet 5 at high reasoning reached 99.0%.

On the headline metric, that is effectively the same accuracy band: 100.0% versus 99.0%.

**Then the economics diverge sharply.**

![Same accuracy band, different operating model](https://raw.githubusercontent.com/hummusonrails/devto-blog-assets/main/d8885df0478c4d2f9afebd1ba34e6ed0-diagram-2.png)

Jev's median latency was 378 milliseconds.

Sonnet high's was 3,554 milliseconds.

**That made Sonnet roughly 9.4 times slower on this task.**

At the measured usage and pricing, 10,000 evaluations would cost approximately $2.27 with Jev and $129.74 with Sonnet high.

That is roughly a 57x difference.

![Jev vs Sonnet high](https://raw.githubusercontent.com/hummusonrails/devto-blog-assets/main/d8885df0478c4d2f9afebd1ba34e6ed0-diagram-3.png)

This is where the experiment stops being an interesting model comparison and starts becoming a systems-design question.

If the output I need is one of three known states, and a decision-specific model can deliver comparable accuracy for roughly one-fiftieth the operating cost, what exactly am I buying from the generative model?

But raw accuracy gives good marks to both systems.

Of the 102 gold labels, 77 are satisfied, seven are not_satisfied, and 18 are insufficient_evidence.

A classifier that simply answered satisfied every time would already look pretty good on an accuracy chart while being completely unacceptable for the purpose of this gate.

The hard part is not recognizing the obvious passes. It is knowing what to do when the evidence is incomplete, ambiguous, or negative.

That is where the failures became much more interesting than the headline score.

## Confidence that changes the workflow

This was the result that changed how I thought about Jev.

Jev Choice alone made two incorrect decisions across the 306 runs. Both landed in its 0.2 to 0.3 confidence range.

Sonnet high made three incorrect decisions. All three landed in its 0.9 to 1.0 confidence bin.

Jev's Expected Calibration Error was 0.037. Sonnet high's was 0.058.

Those numbers matter, but the workflow implication matters more.

![Confidence changes the workflow](https://raw.githubusercontent.com/hummusonrails/devto-blog-assets/main/d8885df0478c4d2f9afebd1ba34e6ed0-diagram-4.png)

At a Jev confidence threshold of 0.5, I could have automated 98% of the decisions in this dataset while retaining 100% accuracy among the automated decisions.

The remaining 2% could have gone to human review.

That is a far more useful property than simply being right slightly more often.

A model does not need to be perfectly accurate to be useful in an automated decision pipeline. It needs its uncertainty to correlate with the places where automation becomes dangerous.

The two systems also failed differently.

Jev Choice's majority error was in an ambiguous row labeled insufficient_evidence that Jev passed as satisfied.

But Jev also assigned low confidence to the decision. A simple confidence gate would have stopped it from being automated.

Sonnet's failures centered on an empty-repository row labeled insufficient_evidence that it classified as not_satisfied.

That is a less serious outcome operationally, but it exposes another distinction in the policy: "the evidence shows the requirement was not met" and "there is not enough evidence to decide" are not the same state.

**Sonnet recognized that something was wrong, but it was highly confident in the wrong category.**

This is why I find the confidence result more serious than the 100.0% accuracy result.

The interesting question is not just whether a model can make the decision. It is whether the model gives the surrounding system enough information to know when not to let that decision through.

## Keep the policy whole

*What happened when I tried to make the system more deterministic?*

Jev exposes smaller decision primitives that make decomposition appealing. Alongside the final Choice, I used four Nouls as diagnostic sub-decisions. A Noul evaluates whether a statement is true and returns a probability.

That gives you something very helpful: inspectable intermediate state.

My instinct was to take those four individual judgments and implement the final four-step policy myself in code.

- Ask the model the atomic questions.
- Get four probabilities.
- Write the conditionals.
- Remove as much model judgment from the final step as possible.

It sounded safer. It was actually significantly worse.

![Whole-policy judgment beats reconstruction](https://raw.githubusercontent.com/hummusonrails/devto-blog-assets/main/d8885df0478c4d2f9afebd1ba34e6ed0-diagram-5.png)

Jev Choice alone reached 99.3%.

Choice plus the four diagnostic Nouls reached 100.0%.

**My hand-coded composite of those same four Nouls fell to 94.1% and produced six false passes.**

![How the evaluation method changed accuracy](https://raw.githubusercontent.com/hummusonrails/devto-blog-assets/main/d8885df0478c4d2f9afebd1ba34e6ed0-diagram-6.png)

That is beyond a rounding error, it is the worst failure mode for this gate.

The individual sub-decisions were useful. My reconstruction of the policy from them was not.

I learned something important from that:

Sub-decisions are valuable for diagnosis, auditability, and understanding why a result occurred. But an ordered decision policy is not necessarily equivalent to a bag of independent Boolean answers. The sequence matters. The interaction between conditions matters. The meaning of one piece of evidence can depend on what has already been established elsewhere in the procedure.

In this experiment, asking Jev to apply the written policy as a whole worked better than asking it for individually reasonable facts and assuming I could perfectly reassemble the judgment afterward.

**Jev does not replace the rest of this judging workflow.**

It accepts text rather than repositories. Its current context constraints make it unsuitable for simply dumping an entire codebase into the model. The judging rubric still includes code-reading scores, broader analysis, and generated prose where a frontier LLM remains the more appropriate tool.

The result is not "Jev replaces Claude." It is that in this very real workflow where there is a consistent bounded decision gate, a general LLM may not be the right tool anymore.

![Different jobs, different models](https://raw.githubusercontent.com/hummusonrails/devto-blog-assets/main/d8885df0478c4d2f9afebd1ba34e6ed0-diagram-7.png)

Once I separated those two things in what is needed for a generative LLM model and a System One model, the economics changed by roughly 57x, the latency changed by nearly an order of magnitude, and the confidence signal gave me a credible way to automate almost the entire workload while escalating the uncertain edge cases.

I'm still figuring out where and how to apply this new model into my workflows, but this experiment has given me a good starting point in understanding its strengths and its weaknesses. More importantly, it's opened my eyes up to the potential of AI systems that incorporate more than the current ways of doing things.

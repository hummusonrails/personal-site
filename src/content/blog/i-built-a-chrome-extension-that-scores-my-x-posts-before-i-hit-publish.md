---
title: "I built a Chrome extension that scores my X posts before I hit publish"
date: '2026-01-23'
summary: >-
  X gives you analytics after the fact. By then it's too late. Your post either worked or it didn't, and you're guessing why. I got tired of the guessing game. So I built something that tells me how a
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2014519864124182785'
---

X gives you analytics after the fact. By then it's too late. Your post either worked or it didn't, and you're guessing why.

I got tired of the guessing game. So I built something that tells me how a post will perform before I publish it.

## The algorithm weights aren't hidden

X open sourced their latest algorithm just this week, and have committed to continuing to do so. That offers us a treasure trove of individual insights when combined with one's own analytics.

An author reply adds +75 to the ranking score. A like adds +0.5. That's a 150x difference.

A post optimized for likes performs 27x worse than one optimized for replies. But nothing in the X interface tells you this while you're writing. You find out days later when you check your analytics and wonder what went wrong.

I wanted that feedback loop closed. Real-time, while I'm still drafting.

## What changed when I started using it

A score badge now sits in my composer. It updates as I type, 0-100, based on the signals the algorithm actually weighs.

The first thing I noticed: my instincts were wrong about hooks. Posts I thought were clever openers were actually weak patterns the algorithm depresses. "I've been thinking about..." felt conversational to me. The data said otherwise. Posts with that opening got 40-60% less engagement than ones starting with a specific claim or number.

The second thing: engagement surfaces matter more than good writing. A mediocre post ending with "What's your experience?" outperforms a brilliant essay that makes no ask. The algorithm weights replies at 27x likes. If your post doesn't invite a response, you're leaving that multiplier on the table.

The third thing: external links kill reach. I knew this abstractly. Seeing my score drop from 78 to 52 the instant I paste a link made it visceral. X wants people on the platform. Every link is a potential exit. Now I put links in replies.

## The timing data surprised me

I fed months of my own analytics into the scoring model. Tuesdays through Thursdays between 8am and noon showed 30-40% higher engagement than weekends. Weekend posts were consistently my worst performers.

The extension now warns me when I'm about to post at a bad time. It also tracks my posting frequency and reminds me to engage with others between posts. The algorithm penalizes accounts that broadcast without participating.

## What I've learned about my own patterns

Different post types have different ceilings. Technical content attracts focused engagement but lower raw numbers. Predictions spark debate. Questions directly invite responses. Once I understood my baseline by category, I stopped comparing apples to oranges in my own analytics.

The 140-character rule is real. That's what people see before "Show more." If your main value appears after character 140, most people never see it. They've already scrolled past.

And the biggest shift: I draft differently now. I used to write the post, then try to optimize it. Now I start with the engagement surface and work backward. What response am I inviting? What's the hook? Does anything trigger a negative signal? The score tells me immediately if I'm on track.

## The feedback loop matters more than the score

The number itself isn't the point. What matters is closing the gap between writing and learning. Instead of waiting days to see if something worked, I know within seconds whether I'm making the same mistakes.

I understand why certain posts work and others don't. That understanding compounds.

What patterns have you noticed the algorithm rewards or penalizes?

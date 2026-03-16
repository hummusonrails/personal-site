---
title: "When the sirens stop, the data starts"
date: '2026-03-15'
summary: >-
  There's a moment after a siren when everything is quiet, and you're standing in a shelter with your family, and you realize you have absolutely no control over what happens next. The Iron Dome will
tags:
  - slug: posts
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2033154825894891919'
images: 'https://pbs.twimg.com/media/HDc19KXW0AAQh6q.jpg'
---

There's a moment after a siren when everything is quiet, and you're standing in a shelter with your family, and you realize you have absolutely no control over what happens next. The Iron Dome will intercept or it won't. The alert will be the last one today or the first of fifty.

That loss of control is the part nobody really talks about. Not the explosions, not the running. The waiting.  **The not knowing when you can go back to living your life.**

When I'm in a stressful situation and don't know something, my instinct is to look at the data.

## **The shower problem**

It started with a genuinely absurd question: is it safe to take a shower right now?

When you have no control over your day because of incessant sirens, you begin to wonder if there's a pattern to the alerts. Turns out, there is. The data from Pikud HaOref, Israel's Home Front Command, is publicly available. Alert timestamps, affected cities, threat types. All of it.

So I built Best Shower Time. It fetches real-time alert data every 30 seconds and gives you a safety score from 0 to 100 for your area. 

**The response surprised me.**

Around 5,000 people started using it daily. The Jewish Chronicle, the Jerusalem Post, the Times of Israel, and the Times of London all covered it, amongst others. People called it funny, which it is. But most of them also used it, which tells you something about what people actually need during a war.

They don't need another news app. They need a small piece of predictability back.

## **Control as a coping mechanism**

Viktor Frankl, writing from the most extreme loss of control imaginable, observed something that stuck with me. In "Man's Search for Meaning" he wrote that between stimulus and response, there is a space, and in that space is our power to choose.

The stimulus here is a siren. The response is running to a shelter. But the space in between, the hours and the minutes between alerts, that's where the anxiety lives. And that's where data can do something useful.

**I'm not suggesting a spreadsheet cures trauma.**

But for a certain kind of person, turning chaos into a dataset is a way of reclaiming that space Frankl described. You can't control when the next rocket comes. But you can look at the pattern and make a slightly more informed decision about when to walk around the block.

Which is exactly what happened next. My wife can't take a work call without walking. So I built Best Walking Time. Then Best Sleeping Time, because knowing the distribution of nighttime alerts actually helps you decide whether to sleep in the bedroom or the shelter.

Each app does the same thing at its core: takes a chaotic, frightening situation and gives you one small metric you can use.

## **Going deeper**

After building three apps that answer one question each, I wanted to understand the patterns at a larger scale. Not "is it safe right now" but "what does two weeks of alerts actually look like?"

3,800 alerts in 14 days. That's the dataset. And when you start breaking it down, you can begin to answer some questions.

**Shabbat isn't always worse.**

The common assumption is that attacks intensify on Shabbat. Over 30 days, that's sometimes true, but it often isn't. The answer literally changes depending on what window you're looking at. That's the kind of thing you can only see when you build tools that let people adjust the timeframe themselves.

The evening hours between 18:00 and 06:00 account for roughly two-thirds of all alerts. The median time between distinct alert events is about 5 minutes during active periods. The longest quiet stretch in the past two weeks was 14 hours.

I built SirenWise to make all of this visible. An interactive map with clustered alert markers, 11 analytics dashboards, a chronological feed, region filtering, and bilingual support in English and Hebrew. Every chart has a methodology explanation so you can see exactly how the numbers are derived.

I added an AI assistant that runs entirely in the user's browser. No server. No API calls. No data leaving the device.

**The AI detects what your browser supports **and picks the best available engine: Chrome's built-in Gemini Nano if you have it, WebLLM via WebGPU if your GPU supports it, or a tiny WASM model that runs on CPU for everyone else. You can ask questions about the alert patterns in Hebrew or English and get answers drawn from the same analytics data that powers the dashboards.

The privacy angle matters here. This is sensitive data about where rockets are landing. People should be able to explore it without their queries going to someone's server.

## **What data can and can't do**

A safety score doesn't guarantee safety. The median gap between alerts is a statistical measure, not a promise.

**But there's a difference between helplessness and uncertainty.** 

Helplessness is not knowing anything. Uncertainty is knowing the base rates, the patterns, the distributions, and making a decision with that information. Data moves you from the first to the second.

Hartmut Rosa, the German sociologist, writes about "resonance," the idea that we feel alive when we're in a responsive relationship with the world around us. When the world becomes unpredictable and hostile, that resonance breaks down. You stop feeling like you can affect anything.

Building these tools is my way of restoring a small amount of resonance. The world is still unpredictable. But now I have a chart that shows me exactly how unpredictable it is, and somehow that helps.

## **If you're the data type**

All of these projects are open source. 

- SirenWise: https://www.sirenwise.com.
- Best Sleeping Time: https://www.bestsleepingtime.com
- Best Shower Time: https://wwww.bestshowertime.com
- Best Walking Time: https://www.bestwalkingtime.com
If you know someone in Israel who might find the data useful, or if you're the kind of person who calms down by looking at a data chart, share them.

And if you've found your own way of turning stress into something productive, I'd genuinely like to hear about it.

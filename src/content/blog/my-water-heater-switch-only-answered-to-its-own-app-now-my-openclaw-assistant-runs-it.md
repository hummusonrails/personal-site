---
title: "My water heater switch only answered to its own app. Now my OpenClaw assistant runs it."
date: '2026-10-31'
summary: >-
  In the mornings, the water heater in my house turns on so the water is hot for family morning showers. My OpenClaw assistant set the schedule on the switch itself, over my home network, on a device
tags:
  - slug: posts
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2116556733690868220'
images: 'https://pbs.twimg.com/media/HV-FILka4AABljM.jpg'
---

In the mornings, the water heater in my house turns on so the water is hot for family morning showers. My OpenClaw assistant set the schedule on the switch itself, over my home network, on a device whose maker expects you to control it from their phone app and nothing else.

Getting there took a long working session with a coding agent and a frontier model. Most of what made it work was how I framed the job, so this is about the process and the prompting, without the device's internals.

## Why some devices fight you

A lot of home hardware ships with a cloud account, an app and no local API. Sometimes a community library covers the older models and stalls on the newer ones. That was my situation. The library I relied on could read my new switch's state and power draw, and every command I sent came back rejected.

If you own a device like that, you're left guessing at a protocol nobody documented, and an agent can do the slow, evidence-heavy part of that work with you.

## Set the scope before the first prompt

Frontier models are careful around anything that looks like breaking into a system, and they should be. "Get past the authentication on this device" reads the same whether the device is yours or a stranger's, and the model has no way to tell from that sentence.

So I opened with the facts that make the work legitimate, in plain words:

- I own this switch and it is installed in my home.
- It is on my local network, and I want local control from my own home automation software.
- I have a working account in the vendor's app and the device credentials from my own pairing.
- The work stays on my network, with my device. The vendor's cloud and other people's devices are out of scope.
All of that is true, and it tells the model what job it is doing: helping two pieces of software I own talk to each other.

Keep the questions inside the work just as precise. I asked "how does the app open a session with the device" and "what does the app send when I press on". A precise question about your own software gets a precise answer, and it tells the model exactly what you're doing.

When the model hesitated, I treated it as a fair question. I added the context it was missing, like confirming that a capture came from my own phone talking to my own switch, and that settled it. If the honest version of your situation doesn't satisfy the model, take that as a sign the job may not be yours to do.

## Make the agent prove every step

A model will describe an undocumented protocol confidently and get it wrong. An agent harness fixes that because it can run code against the real thing. Give yours a loop like this one:

1. Capture what the official app sends when I tap a button.
1. Have the agent compare it with what the library sends.
1. Form one hypothesis about the difference.
1. Write a small script that tests only that hypothesis against the device.
1. Record the result, including the failures.
The answer came from studying how the vendor's own app builds its messages and reproducing that in a script. The library was skipping a step the app performs when it opens a session. Once the script did the same, the switch accepted commands.

Two rules kept the agent on track. A hypothesis wasn't solved until it worked against the live device, and a physical check closed the loop. When the agent said the heater was on, I walked over and looked. Anything short of that was not a definitive verification.

## Wire it into OpenClaw like any other device

Once control worked, it became an ordinary OpenClaw skill that switches the heater on with a timer and manages its schedules. The skill reports what the device supports, so my admin dashboard and my phone app only show controls that exist.

If you have a device like this, write your scope paragraph before you open the agent: what you own, where it lives, what you want it to do and what stays out of bounds. Keep it true and paste it at the top of every session. Then pick the smallest command the device should accept, usually on, and make it the only goal until a script turns the device on and you see it happen.

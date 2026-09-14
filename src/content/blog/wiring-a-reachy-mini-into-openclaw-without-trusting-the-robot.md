---
title: "Wiring a Reachy Mini into OpenClaw without trusting the robot"
date: '2026-09-08'
summary: >-
  I put a Reachy Mini in the living room. It is a small desktop robot from Pollen Robotics, now part...
tags:
  - slug: ai
    collection: tags
  - slug: productivity
    collection: tags
  - slug: tutorial
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/wiring-a-reachy-mini-into-openclaw-without-trusting-the-robot-3lgh'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fcdj4cnlm22xlptpgzywc.png'
---

I put a [Reachy Mini](https://pollen-robotics.com/reachy-mini/) in the living room.

It is a small desktop robot from Pollen Robotics, now part of Hugging Face. A head on a moving body, two antennas, a camera, a speaker, and a microphone array. Inside is a Raspberry Pi CM4 running a daemon that exposes the motors, the audio and the camera over an HTTP API on port 8000, plus an app system: you install a Python package onto the robot and the daemon runs it as the current app.

Out of the box it ships with demos. It waves, it dances, it follows a face. 

What I wanted was a voice touchpoint for the family, and a way to interact with the family while I am traveling. I already run OpenClaw in the house. I call my instance Jeeves, which is my sarcastic but helpful British butler. It holds my calendar, the home automation devices in every room, a Jewish holiday and Sabbath scheduler, a knowledge base, and the skills that act on all of it. I talk to it through Telegram and a dashboard.

So the robot is a face and a microphone in the room where my family sits, and Jeeves is everything worth saying back. Wiring the two together was my last weekend's project.

## The obvious wiring, and why I did not ship it

The obvious version is to put the agent behind the robot. Install an app on the Reachy that captures audio, sends the transcript to the OpenClaw gateway, and speaks the answer. The robot becomes a client of my agent. 

I got that working and then took it apart, for two reasons.

The first is that the robot is not a machine I can trust. Its own daemon API has no authentication of any kind. I checked this rather than assumed it: fetch `/openapi.json` off the robot and you get 100 endpoints and zero security schemes. Anything on the LAN can drive the motors, open the camera, or stop the running app. The security threat is low, but still not tolerable. We maintain separate guest WiFi, but even with that, I didn't like that exposure.

If the agent runs on the robot, then the robot holds a gateway token. The gateway token reaches an agent with my calendar, my house and my shell. Not acceptable to me.

The second reason showed up in the audit trail once it was answering questions in the room. A general question was a full agent turn: a system prompt around 30k tokens carrying tool profiles, the skills index and the workspace bootstrap, on a persistent session that had grown to 51k, with a reasoning model spending about 500 tokens of thought before its first word.

Median 15 seconds to answer "what's the weather today?". 

At fifteen seconds nobody in the room waits for the answer. They go find a phone instead, and the robot goes back to being just a cute toy and an ornament on the shelf.

## The shape I landed on

One rule drives the whole design: the robot is untrusted, and everything that could leak lives behind all the security I invested in my OpenClaw setup.

![The untrusted Reachy Mini can communicate only with a scoped broker, which routes approved requests to deterministic home handlers or a lean OpenClaw agent. Appears after: "One rule drives the whole design:"](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/yjw4s4z9havt15ih1xr6.png)

```plaintext
Living room                          Mac mini
Reachy Mini (CM4)                    reachy-broker :8092
  reachy-mini-daemon :8000   --->      one scoped bearer token
  jeeves_hub app             Tailscale 
    mic, speaker, motors               redaction at the boundary
    one token, no data                 whisper / OpenClaw gateway
```

The robot runs one app, `jeeves_hub`. It does wake-word matching, voice activity detection, motion and expressions, and it holds exactly one bearer token scoped to the broker. It never sees a credential, a model, or a calendar entry. Audio goes up, a policy and a reply come down.

The broker is a small Python HTTP server on the machine. It is the only path between the robot and my data, and it is the only thing that talks to OpenClaw.

If the robot were fully compromised tomorrow, what the attacker gets the highly restricted intent allowlist and nothing else.

## Tailscale, not the LAN

The broker binds the tailnet interface and not `0.0.0.0`:

The robot is on my tailnet, so the broker addresses it by its tailnet address too, never its LAN address. Nothing else in the house can reach the broker, and the traffic between the two is WireGuard rather than plaintext HTTP across a shared network.

Tailscale also handles the remote case as well. When I "teleport" in from a hotel, that is direct WireGuard, not the vendor's WebRTC path. 

## The intent allowlist

This is an essential part of the design.

The robot cannot phrase a request. It names an intent and passes typed arguments. Free text only ever reaches one intent, `general.ask`, which is also the least privileged one: no house access, no calendar, no files.

```python
"""The intent allowlist.

This is the closed set of things a shared-room robot may ask for. An unknown
intent is refused before any data source is touched, so the blast radius of a
fully compromised robot is exactly what is listed here and nothing else.
"""
```

Routing a transcript to an intent is done with rules, not a model. That was deliberate. An LLM router adds a second model round trip to every turn, and it can be talked into picking a different intent by whatever is said in the room.

```python
AC_MENTION = re.compile(
    r"\b(?:a\.?[/ ]?c\.?|air[ -]?condition(?:er|ing|ers)?"
    r"|air[ -]?cons?|cooling)\b",
    re.I,
)
```

The doctrine there is one line: an imperative actuates, a question never does, and a command that names no known room asks which one. "Is the ac on" is a read. "Turn on the ac" is a write. Anything ambiguous falls to the read.

![A deterministic router distinguishes commands, questions, ambiguous requests, and unknown intents before any home data or device is accessed.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/ck5ey40vva3icmnc3eyl.png)

Redaction happens on the broker side of the boundary, before a word is spoken. My calendar status is coarse: busy or free, until when, and a whereabouts word from a closed vocabulary. Never event titles, locations, attendees or company names. 

## The lean OpenClaw agent

This is how I dropped the response time on Reachy from 15 seconds to about 3 seconds.

Instead of routing general questions at `main`, I gave the robot its own agent in `config/openclaw.json`:

```json
{
  "name": "Reachy family hub",
  "description": "Lean voice agent for the living-room robot: no skills, no tools, no workspace context. The persona rides in each message.",
  "workspace": "/Users/you/.openclaw/workspace-reachy",
  "model": {
    "primary": "FILL_IN_YOUR_LLM_MODEL_HERE",
    "fallbacks": [
      "FALLBACK_MODEL_1",
      "FALLBACK_MODEL_2"
    ]
  },
  "skills": [],
  "tools": { "profile": "minimal" },
  "heartbeat": { "every": "0m" },
  "contextInjection": "never",
  "thinkingDefault": "off",
  "reasoningDefault": "off",
  "memory": { "search": { "enabled": false } }
}
```

Every line there is removing something. No skills means no skills index in the prompt. The minimal tool profile means no coding tools. `contextInjection: never` means the workspace is not injected, so the persona files on disk are documentation for me rather than tokens I buy on every question. Thinking and reasoning off, because a living room answer is not a research task.

The same question that measured 15 seconds now measures about 2.9 seconds for the model leg and 3.4 to 3.9 seconds for the whole turn including speech synthesis, at roughly 5k prompt tokens instead of 30k. About a tenth of the cost.

The persona is composed per turn by the broker and rides in the message, so every request is stateless. No `user` field, no session header. A persistent session would re-buy the persona on every question anyway.

The broker POSTs to the gateway's OpenAI-compatible endpoint and addresses the agent by name:

```python
body = json.dumps({
    "model": "openclaw/reachy",          # the agent, not a model id
    "messages": messages,
    "max_completion_tokens": 200,
}).encode()

req = urllib.request.Request(
    f"{GATEWAY_URL}/v1/chat/completions",
    data=body,
    headers={"Content-Type": "application/json",
             "Authorization": f"Bearer {token}"},
    method="POST",
)
```

There is a second agent, `openclaw/reachy-deep`, with the same lean shape and a stronger model, reached only when somebody says "think carefully". Everything else stays on the fast path.

## Keeping the model out of the house

The lean agent handles general knowledge. It does not touch the house, and that is the other half of the speed story.

Before the deterministic router existed, "turn off the kitchen light" reached the model, which rediscovered the automation skill with its shell tool on every single request. 43 seconds when it worked, and a timeout when it did not.

Now every device is a closed table and a deterministic intent, and a light takes one to two seconds. Same for the time, for greetings, for "what can you help with", which is spoken from a command guide generated out of the router itself so it can never advertise a phrase the robot does not understand.

Zero tokens for any of it.

## Running it under launchd

Both the broker and the speech service are launchd agents on the Mac.

```bash
#!/bin/bash
...

cd "$HOME/path/to/reachy-broker"
exec /opt/homebrew/bin/python3 -m api.server
```

That's all it takes it boot it up.

## What it feels like now

You say "hey Jeeves" and then a sentence. The hub matches the wake phrase locally, streams the audio to the broker, whisper transcribes it, the router picks an intent, and either a deterministic handler or the lean agent answers. 

![The request path transcribes audio, routes house requests to deterministic handlers, and sends general questions to a stateless lean agent.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/1lnjebv7nrv1wgimx6e6.png)

House questions and house commands never leave the Mac. General questions go to the LLM through the gateway and never carry a fact about my family. The robot holds one token that can do exactly the things on a list I wrote.

The part I did not expect to care about is that setting thatg boundary made the fun parts possible. Once the robot could only ever name an intent, I stopped worrying about what it might be talked into doing and started adding things: games, ambient motion randomly making the kids laugh. None of that needed a new trust decision, because there is only one, and it is enforced in a single file.

If you are wiring a device you cannot trust into an agent that can act on your life, put a broker between them and give the device a closed list of things it may ask for. Then, once you take care of that bit, you can just get down to building it for both productivity and joy.

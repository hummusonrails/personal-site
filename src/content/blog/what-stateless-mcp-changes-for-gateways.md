---
title: "What stateless MCP changes for gateways"
date: '2026-10-05'
summary: >-
  The MCP spec went stateless on July 28. If you run one MCP server, that mostly means deleting your...
tags:
  - slug: ai
    collection: tags
  - slug: tutorial
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/what-stateless-mcp-changes-for-gateways-74h'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fb0waokmp76i76nztjf94.png'
---

The MCP spec went stateless on July 28. If you run one MCP server, that mostly means deleting your session handling and adding a `server/discover` method. If you run a gateway that sits in front of a dozen MCP servers and presents them to clients as one, it changes how the whole thing works.

I've been following how [Agent Router](https://github.com/theagentrouter/agent-router) (the AAIF project formerly known as Envoy AI Gateway) is handling this. In September the team merged [PR #2545](https://github.com/theagentrouter/agent-router/pull/2545), which adds stateless fan-out for discovery and list requests. It isn't serving traffic yet, and that's on purpose. But it's the clearest look so far at what an MCP gateway looks like once sessions go away.

## What the gateway used to lean on

Under the old spec, a client opened a session with `initialize` and carried an `Mcp-Session-Id` on everything after that. Agent Router used that session as its backbone. When a client initialized, the gateway sent `initialize` to each backend on the route, collected each backend's session ID and capabilities, and packed all of it into one encrypted session ID that it handed back to the client.

From then on, each request carried what the gateway needed: which route this was, who the caller was, the upstream session ID for each backend, and what each backend could do. The gateway itself didn't have to remember anything. The client was carrying the gateway's memory around for it.

The 2026-07-28 spec removes all of that. There's no `initialize` handshake, no `Mcp-Session-Id`, and no session. Each request carries its own protocol version, client info, and client capabilities in `_meta`, plus `Mcp-Method` and `Mcp-Name` headers so infrastructure can see what the request is without parsing the body. If a client wants to know a server's capabilities up front, it calls `server/discover`. Server-initiated requests like elicitation and sampling become multi round-trip requests, where the server returns an `input_required` result and the client retries with the answer.

So the gateway had to find a new home for each piece of information that used to live in that session ID.

The same `tools/list` call looks different under each spec. Under 2025-11-25, the client has to open a session first and carry its ID from then on:

```http
POST /mcp
Content-Type: application/json

{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
  "protocolVersion": "2025-11-25",
  "clientInfo": {"name": "my-agent", "version": "1.4.0"},
  "capabilities": {}
}}

# Response header: Mcp-Session-Id: <encrypted gateway session>
# Client then sends notifications/initialized with that session ID

POST /mcp
MCP-Protocol-Version: 2025-11-25
Mcp-Session-Id: <encrypted gateway session>

{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
```

Under 2026-07-28, there's no first step. The request names its own method in a header and brings its version, identity, and capabilities in `_meta`:

```http
POST /mcp
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/list
Authorization: Bearer <token>

{"jsonrpc": "2.0", "id": 7, "method": "tools/list", "params": {
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientInfo": {"name": "my-agent", "version": "1.4.0"},
    "io.modelcontextprotocol/clientCapabilities": {}
  }
}}
```

![Agent Router before and after the 2026-07-28 spec. Before, the client opens a session and each backend holds one. After, each request stands alone, and a failed backend is skipped while the others' results are merged.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/ku73q31hymlmh8cf1vfa.png)

## Where each piece goes now

The [design proposal](https://github.com/theagentrouter/agent-router/blob/main/docs/proposals/012-mcp-new-spec-rc/proposal.md) for this work walks through it piece by piece, and most of the answers turned out to be things Agent Router already had.

The route name already arrives on each request in a header that Envoy sets. The old code only read it during `initialize`. Now it reads it on each request.

The backend for a single-target call like `tools/call` is already encoded in the tool name. Agent Router exposes tools as `backend__toolname`, so the name itself tells the gateway where to send the call. Under the new spec that name also shows up in the `Mcp-Name` header.

Per-backend session IDs aren't needed anymore, since modern backends don't have sessions either.

Identity comes from the bearer token on each request, which the gateway was already checking. With no session, there's also no session to hijack.

Capabilities are the one piece that needed new work. The gateway now asks each backend with `server/discover` and merges the answers.

## What #2545 adds

The PR builds the stateless path for the five requests that have to go to more than one backend: `server/discover`, `tools/list`, `resources/list`, `resources/templates/list`, and `prompts/list`. The gateway sends the request to each selected backend, merges the responses, and returns one JSON-RPC result.

A few details stood out to me.

Backend selection happens on each request now. Under sessions, the set of backends a client could see got fixed at `initialize`. In the review thread, the author pointed out that re-evaluating on each request is the right stateless behavior, because a new token can change which backends a caller is allowed to see. Revoke someone's access to a backend and their next `tools/list` reflects it. Under the old model, they'd keep seeing it until their session ended.

Capability merging uses one shared helper for both the old session path and the new stateless path, so a capability advertised by any backend that answered shows up in the merged result the same way in both.

Cache hints from the new spec (`ttlMs` and `cacheScope`) get merged by taking the most restrictive values. If one backend says its tool list goes stale immediately, the merged list goes stale immediately. If any backend marks its results private, the merged result is private.

Put together, a merged response from a route with a `docs` backend and a `tickets` backend looks roughly like this. The tool names carry their backend as a prefix, which is how a later `tools/call` finds its way back. If `docs` said its list was good for 60 seconds and `tickets` said 30, the merged list gets 30:

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "tools": [
      {"name": "docs__search", "description": "Search the docs", "inputSchema": {"type": "object"}},
      {"name": "tickets__create", "description": "Open a ticket", "inputSchema": {"type": "object"}}
    ],
    "ttlMs": 30000,
    "cacheScope": "public",
    "resultType": "complete"
  }
}
```

Partial failure doesn't take down the route. If one backend is unreachable or sends back something malformed, the gateway skips it, logs a warning with the backend's name, records an error metric for it, and returns what the others sent. If none of them answer, you get a 500 instead of an empty list that looks like a healthy server with no tools. One reviewer, mohitgurnani, pushed for that all-failed check to cover the four list handlers, not only discovery, and it went in before merge.

## Why it isn't live yet

If you go looking for where the new code gets called, you won't find a caller outside the tests. That's the plan, not an oversight.

The proposal splits the work into phases. Phase 0 builds the entire stateless path as unreferenced code, one stage of the request lifecycle at a time: classifying the incoming request, selecting and discovering backends, forwarding and merging, then `subscriptions/listen`. The proposal says outright that nothing in Phase 0 is reachable and existing behavior doesn't change. Phase 1 is where the dispatcher gets flipped so requests from modern clients start going down the new path.

So #2545 is staged code waiting for activation. [PR #2692](https://github.com/theagentrouter/agent-router/pull/2692), which covers single-target calls like `tools/call` and the integration work, was still open when I checked. `subscriptions/listen` is a separate follow-up.

![Agent Router's rollout of the 2026-07-28 spec as of October 5, 2026. Ingress and classification (#2518) and discovery and list fan-out (#2545) are merged. Single-target calls (#2692) are open, subscriptions/listen is not on main yet, and activation comes after. Mixed-version translation, result caching, and auth hardening are deferred.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/wqk8jg50muzx2zmo54y7.png)

## What this enables once it's switched on

The biggest change is for whoever operates the gateway and the servers behind it. Agent Router's encrypted session ID already let any gateway instance handle any request, but the setup still started with an `initialize` sent to each backend on the route, and each backend kept its own session that later requests had to land on. Under the new model, nothing in the chain holds a session. A request carries what it needs, the gateway forwards it, and a stateless backend can answer it from whichever instance the load balancer picks. You can scale gateway instances and backend instances behind plain round-robin balancing without sticky routing, and the proposal explicitly rules out adding a shared session store like Redis for the modern path.

Routing gets cheaper too. One of the proposal's goals is to let Envoy route on the `Mcp-Method` and `Mcp-Name` headers without parsing the JSON-RPC body. That opens up per-tool rate limits, per-method policies, and routing decisions made at the edge from headers alone.

Approval flows get easier to run through a gateway. Under the old spec, a server that wanted to ask the user something mid-call needed an open stream back to the client, and the gateway had to rewrite request IDs to route answers back to the right backend. With multi round-trip requests, the backend returns `input_required`, the client retries with the answer, and the gateway routes the retry by tool name like any other call. The proposal plans to pass these through untouched.

Access changes take effect on the next request. Because backend selection runs per request, revoking a caller's access to a backend takes effect on their next call, not the next time they reconnect.

## What I'd still watch

The fan-out talks to backends one after another, so a route with several slow backends adds up. And a partial result looks identical to a complete one from the client's side. If eight tools come back from a ten-backend route, the client can't tell whether that's everything or whether two backends dropped out. The author agreed that surfacing which backends failed would help but deferred it, since the old session path would need the same change to stay consistent. Until that lands, the per-backend logs and metrics are the only place to see it, so make sure your monitoring is watching them.

There's also a small inconsistency in the discovery response. It includes a line saying how many backends the gateway is aggregating, and that number counts the backends selected, not the ones that answered. With one of two backends down, it still says two.

The larger open piece is mixed deployments. Phase 1 covers modern clients talking to modern backends. A modern client reaching a backend that still uses sessions, or an older client reaching a stateless backend, needs the gateway to translate between the two models, and the proposal defers that to Phase 2. Its reasoning is that most new backends will ship on the new spec from day one. Whether that holds depends on how fast the MCP servers you already depend on upgrade.

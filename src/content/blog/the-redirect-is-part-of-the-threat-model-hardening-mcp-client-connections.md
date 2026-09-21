---
title: "The Redirect Is Part of the Threat Model: Hardening MCP Client Connections"
date: '2026-09-14'
summary: >-
  I was reading the release notes for the MCP Python SDK while planning this month’s AAIF Ambassador...
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/the-redirect-is-part-of-the-threat-model-hardening-mcp-client-connections-3oa0'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fjykevcvfakriutxj34b2.png'
---

I was reading the release notes for the MCP Python SDK while planning this month’s AAIF Ambassador contribution, and one change stopped me: clients on 2.x now follow HTTP redirects only when they remain within the endpoint’s origin.

That’s a good default.

![Redirect decision tree](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/r2d6a0wkvt0sf7fghq9i.png)

A redirect can move a client from the server it was configured to trust to somewhere else. If your client carries an authenticated session, OAuth state, or tool-discovery requests along for that move, you’ve expanded the set of endpoints that can receive them.

The [MCP Python SDK v2.2.0 release](https://github.com/modelcontextprotocol/python-sdk/releases/tag/v2.2.0), published September 7, makes the boundary explicit. `Client("https://...")`, `streamable_http_client`, and `sse_client` follow redirects only when the scheme, host, and port stay the same. An `http` to `https` upgrade on the same host is allowed. A redirect anywhere else fails, and the session remains usable.

![What an origin-bound redirect check compares](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/qgc24f1an1pxtm05y1cf.png)

## Treat the configured origin as an authority boundary

MCP clients connect to endpoints that can expose tools and prompts, then ask users and agents to act on the results. That makes the endpoint URL more than a convenience setting. It identifies where your client can establish a session and where it can send authenticated requests.

Why does a redirect change that? Because HTTP redirects carry authority in a way application code can easily overlook. A client starts with:

```text
https://mcp.example.com/mcp
```

Then the server responds with a redirect to:

```text
https://other.example.net/mcp
```

A general-purpose HTTP client may be happy to follow it. An MCP client needs a stricter answer: `other.example.net` was never the configured server.

The Python SDK now applies this rule to OAuth provider requests too. That closes a gap where the MCP transport might enforce an origin boundary while the authentication flow followed a different redirect policy.

![Redirect policy must cover every client path](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/lzbrrqk8sm1avuzqyfle.png)

This is a small rule with a direct consequence: if the server you intended to use lives at another origin, configure that URL explicitly. Don’t let a redirect decide it for you.

## Redirects are also deployment changes

Same-origin redirects still have valid uses. A server may redirect `/mcp` to `/mcp/`, or route traffic through a path that preserves the same scheme, host, and port. The SDK release notes call out the trailing-slash case: clients no longer need an `httpx.AsyncClient` configured with `follow_redirects` for MCP requests.

That means maintainers should treat endpoint changes as part of their security review, even when the change looks like routing cleanup.

![Endpoint migration decision](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/v3529zfwxm3oypik63sb.png)

Ask one question before shipping an endpoint redirect: does the final URL have the same scheme, host, and port as the URL users configure?

If the answer is no, publish the new endpoint and let clients opt into it. A redirect is the wrong migration mechanism when it crosses an origin boundary.

## A review checklist for MCP client maintainers

When you change MCP connection handling, check the following:

![MCP redirect review areas](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/0ie1di0os8ot6k2ohu4j.png)

- **Endpoint normalization:** Confirm that adding or removing a trailing slash stays within the configured origin. Don’t rewrite a user-provided endpoint to a different host or port.

- **Redirect behavior:** Enforce the origin check in every MCP transport you support. The Python SDK’s release names standard client connections, Streamable HTTP, and SSE connections. Your implementation should not leave one transport with a looser policy.

- **OAuth flows:** Apply the same redirect rule to authorization, token, and metadata requests that your MCP client makes. Authentication code often uses a separate HTTP client or redirect setting.

- **Session state:** When a redirect is rejected, keep the existing session state usable where your transport allows it. The Python SDK reports an `MCPError` for disallowed redirects and keeps the session available. An SSE connection fails with `httpx2.HTTPStatusError`.

- **Authenticated tool discovery:** Don’t send credentials or session-bound headers to an origin that wasn’t explicitly configured. This includes requests used to discover which tools a server offers.

- **Error messages:** Tell the user the redirect was rejected because it left the endpoint’s origin, and show the target URL only when it is safe to expose. The useful remediation is clear: configure the intended endpoint directly.

- **Tests:** Add cases for a same-origin path redirect, an `http` to `https` upgrade on the same host, and a redirect to a different host. Also test OAuth requests separately from transport requests.

The [Agentic AI Foundation](https://aaif.io) gives projects such as MCP a neutral home for the protocols and open-source software that let agents work across tools and frameworks. Interoperability depends on clients agreeing on predictable behavior at boundaries like this one.

A configured MCP endpoint should remain the authority boundary.

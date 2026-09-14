---
title: "Where MCP Ends and A2A Begins: Building a Two-Agent Support Workflow Without Tool-Wrapping"
date: '2026-09-11'
summary: >-
  When an agent needs help from another service, there is an architectural question to answer first:...
tags:
  - slug: ai
    collection: tags
  - slug: tutorial
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/where-mcp-ends-and-a2a-begins-building-a-two-agent-support-workflow-without-tool-wrapping-3l20'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fqskcorvz84bbg0k4ynjd.png'
---

When an agent needs help from another service, there is an architectural question to answer first: should that service be exposed as a tool, or should the agent delegate work to another agent?

The distinction matters when the service on the other side is itself autonomous.

A diagnostic agent, for example, may need to request missing context, investigate across several systems, maintain state across multiple exchanges, and eventually return a report. Exposing that agent as a function such as `run_diagnostics()` can flatten those behaviors into a tool-shaped interface.

MCP and A2A provide a cleaner separation.

[MCP](https://modelcontextprotocol.io/) standardizes how models and agents interact with tools, APIs, data sources, and other capabilities. [A2A](https://a2a-protocol.org/latest/topics/a2a-and-mcp/) standardizes communication between independent agents that need to discover one another, exchange context, delegate work, and manage stateful tasks.

For the support workflow in this tutorial, the boundary is:

* MCP is how the support agent directly uses tools and resources available within its operating environment.
* A2A is how the support agent delegates work to another agent that owns its own execution process.

That distinction changes the interface you build.

A2A and MCP now also share a governance home. A2A became a Growth Stage project of the [Agentic AI Foundation](https://aaif.io/blog/a2a-joins-aaif), joining MCP and other open agentic infrastructure projects under the Linux Foundation.

Let’s build the smallest useful version of that boundary.

## The support workflow

Consider two agents:

1. A support agent receives a developer issue: “My deployment completed, but the API returns 401.”
2. A diagnostic agent knows how to inspect deployment configuration and identity-provider state.

The support agent has MCP tools for operations it performs directly: searching the support knowledge base, reading the ticket, and retrieving deployment metadata from systems it can access.

Those tools do not have to run on the same machine as the support agent. The important distinction is that the support agent invokes them as capabilities and controls how they are composed into its workflow.

The diagnostic agent is different. It owns its own process. It may inspect several systems, request additional context, perform a longer-running investigation, or produce a report after several interactions.

That is where A2A fits.

The handoff looks like this:

![A developer reports an API authentication problem to a support agent, which directly uses MCP tools and delegates the investigation to an A2A diagnostic agent.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/6mo70z2hamyriiv947so.png)

The useful boundary is not simply “local versus remote.” It is capability use versus agent delegation.

If an agent needs to invoke a defined capability directly, MCP is usually the appropriate interface. If it needs to delegate a goal to an independently operating agent and let that agent manage its own process, A2A provides the protocol primitives for that interaction.

## Start with the Agent Card

Before the support agent delegates anything, it needs to know whether the diagnostic agent can handle the request.

A2A uses an [Agent Card](https://a2a-protocol.org/latest/topics/agent-discovery/) for this. It is a JSON metadata document describing an agent’s identity, service interfaces, supported capabilities, security requirements, and skills.

For agents using well-known discovery, the card can be published at:

```text
https://your-agent-domain/.well-known/agent-card.json
```

The official [A2A CLI](https://github.com/a2aproject/a2a-cli) provides a direct way to inspect it:

```bash
a2a card get https://agent.example.com
```

Replace `https://agent.example.com` with an A2A agent endpoint you operate or can access.

The agent card is the client’s description of how the remote agent can be used.

For this workflow, the support agent needs answers to a few practical questions:

* Does this agent advertise a skill related to deployment diagnostics?
* Does it support streaming?
* Which security schemes does it declare?
* Which A2A interfaces and endpoints does it expose?

The support agent can use that information to determine whether the agent is appropriate before sending ticket or deployment context across the boundary.

This is different from a conventional tool call. With an MCP tool, the client can discover a defined tool schema and invoke that capability. With A2A, the client discovers an agent capable of accepting broader work and interacting through the A2A message and task model.

## Keep directly operated capabilities in MCP

Before delegating the investigation, the support agent might use MCP tools such as:

```text
search_knowledge_base("deployment completed API 401")
get_ticket_context(ticket_id)
get_deployment_metadata(deployment_id)
```

These are capabilities the support agent is operating directly. It chooses the calls, controls their sequence, and consumes the results as part of its own reasoning process.

It might be tempting to expose the diagnostic agent as another tool:

```text
diagnose_deployment(deployment_id, error)
```

That can work when the interaction really is equivalent to a discrete capability invocation.

The abstraction becomes less useful when the system behind it needs to behave as an agent. It may need information that was not available when the call started. It may need the caller to authorize access. It may perform work long enough to require lifecycle tracking. It may generate one or more artifacts as the investigation proceeds.

Those cases can lead the tool wrapper to accumulate custom state, polling, callbacks, and continuation mechanisms.

A2A already provides protocol concepts for those interactions.

Use MCP to gather the information needed for a useful delegation request. Then send the goal and relevant context to the diagnostic agent through A2A.

## Delegate the investigation

![The support agent fetches the diagnostic agent's Agent Card, gathers local context using MCP tools, and sends an A2A delegation request that returns either a message or task.](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/h9i7vnj9i925qdhyxvnm.png)

Once the Agent Card has been checked and the initial context collected, the support agent can send a message:

```bash
a2a send -a https://agent.example.com \
  "Investigate deployment dep_123. The deployment completed, but requests return 401. The affected API is orders."
```

The official CLI can negotiate among the A2A interfaces advertised by the agent, including JSON-RPC, HTTP+JSON/REST, and gRPC.

That means the client can interact through the A2A abstraction instead of maintaining a different application-level integration for every agent implementation.

There is one important detail here: sending an A2A message does not always create a task.

According to the protocol, the remote agent can return either:

* a `Message`, for an immediate interaction that does not require task tracking, or
* a `Task`, for stateful work that needs lifecycle management.

For a diagnostic investigation that takes time or may require additional input, a `Task` is the more relevant model.

A task gives the agents a shared unit of stateful work. It has an identifier, a lifecycle, status information, and potentially artifacts representing outputs of the work.

A task can remain active while the diagnostic agent investigates. It can move into a state indicating that more input or authorization is required. It can produce artifacts such as a diagnostic report. The client can later retrieve the task or request cancellation.

That is a different interaction model from invoking a function and waiting for its return value.

## Stream updates when the user is waiting

Support workflows become difficult to reason about when a remote investigation starts and the calling application receives no information until completion.

A2A supports streaming for agents that advertise the capability in their Agent Card.

With the CLI:

```bash
a2a send -a https://agent.example.com --stream \
  "Investigate deployment dep_123. The deployment completed, but requests return 401."
```

For task-based interactions, the A2A protocol can stream task status updates and artifact updates while the work progresses.

The support agent can translate those events into useful information for the developer:

```text
The deployment details have been sent to the diagnostic agent.

The deployment is reachable. The diagnostic agent is now checking identity-provider configuration.

The diagnostic report is ready.
```

Those messages should correspond to real information received from the remote agent. The support agent should not manufacture intermediate progress simply to make the interface appear responsive.

Streaming is only one option for following work.

A2A also defines task operations for retrieving task state, listing tasks, canceling active work, subscribing to task updates, and configuring push notifications. These mechanisms support workflows where the client cannot or should not keep one streaming connection open for the entire investigation.

The A2A CLI exposes task-oriented commands as well, including task inspection and cancellation, which makes the lifecycle visible while developing and debugging an integration.

## Let the remote agent ask for context

The initial diagnostic request may not contain enough information to finish the investigation.

That is a normal part of a stateful agent interaction.

Suppose the diagnostic agent determines that it needs the deployment region before it can continue. It can return the task in an `input-required` state and explain what information is missing.

The support agent can then use an MCP tool it already controls:

```text
get_deployment_metadata("dep_123")
```

Suppose the result contains:

```text
region = us-east-1
```

The support agent can send that information back while referencing the existing A2A task rather than beginning an unrelated investigation.

This preserves an important boundary.

The diagnostic agent does not need direct access to the support agent’s deployment metadata tool. The support agent remains responsible for its own systems and decides what context crosses the agent boundary.

That can also reduce unnecessary privilege sharing. Instead of giving the diagnostic agent standing access to another system, the support agent can provide the specific piece of context needed for the current task.

A2A uses task and context identifiers to support these continued interactions. A `taskId` identifies the stateful unit of work, while a `contextId` can group related interactions.

The result is a multi-turn collaboration between agents without requiring either side to expose its internal tools, memory, or implementation to the other.

## A decision rule you can use

Before adding another integration to an agent, ask:

> Does this agent need to invoke a capability, or delegate a goal to another independently operating agent?

If it needs to invoke a capability, expose that capability through MCP.

If it needs to delegate a goal, discover the other agent through its Agent Card, verify that its advertised skills and security requirements fit the request, and communicate through A2A.

For this support workflow, that gives a clear split:

| Capability                                          | Protocol  | Reason                                                                                                              |
| --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| Read ticket context                                 | MCP       | The support agent directly operates the ticket-system integration.                                                  |
| Search troubleshooting documentation                | MCP       | The support agent directly invokes a retrieval capability.                                                          |
| Investigate a deployment through a diagnostic agent | A2A       | The diagnostic agent owns the investigation and its execution process.                                              |
| Request additional diagnostic context               | A2A + MCP | A2A carries the request between agents; the support agent can use MCP to retrieve information from its own systems. |
| Return a diagnostic report                          | A2A       | The report can be represented as an artifact produced by the delegated work.                                        |

The two agents do not need to belong to different companies, frameworks, or repositories for this boundary to be useful.

They can initially live in the same codebase.

The protocol boundary becomes especially valuable when the diagnostic agent later moves to another framework, team, service, or organization. The support agent can continue using MCP for its tools while communicating with the diagnostic system as an agent rather than reducing it to a tool-shaped wrapper.

That is the practical boundary between MCP and A2A: MCP equips an agent with capabilities. A2A gives independently operating agents a standard way to work together.

The official A2A CLI is a useful place to start experimenting with that boundary:

https://github.com/a2aproject/a2a-cli

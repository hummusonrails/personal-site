---
title: "Your MCP Debug Log Should Not Become a Credential Store"
date: '2026-10-15'
summary: >-
  MCP logs should tell me what failed and enough info to debug it. If it also gives me my access token...
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/your-mcp-debug-log-should-not-become-a-credential-store-4p5m'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fgofx330yovvt00srpkic.png'
---

MCP logs should tell me what failed and enough info to debug it. If it also gives me my access token that accompanied it, then we're in trouble.

An OAuth failure can cross that line without anyone deliberately logging a token. A URL might carry a secret in its query string. A form body might contain one. Then an error handler copies the request into a message you paste into an issue. 

Why does a debugging aid become a credential store? Because the copied error outlives the short session you were trying to fix.

![From failed request to lasting exposure](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/yzpj7iizumgwy0xl75nt.png)

[MCP Inspector 2.9.0](https://github.com/modelcontextprotocol/inspector/releases/tag/2.9.0) gives us an interesting use case of this. 

[https://github.com/modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector)

The release moves acquired OAuth tokens into a secret store and includes fixes for redacting URL query secrets in CLI error envelopes and form secrets in recorded bodies. One fix addresses a form secret whose tail was split by a raw `&`. Those details tell you where to look when you review your own MCP tooling: storage, error text, and recorded requests don't necessarily handle secrets the same way.

![Review each secret-handling surface](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/1fujda88iltp0lnvxybp.png)

## Review the artifact you’re about to share

Before you attach an Inspector log, terminal capture, or tool-call trace to a public issue, read the copy that will leave your machine. Don't rely on a reassuring UI view if you're about to share the underlying file.

Start with URLs. Keep the endpoint, status, and the fact that an OAuth step failed. Remove credentials from query parameters before you paste the URL anywhere. Check error messages too; they may quote the URL rather than showing it as a separate request field.

Next, inspect request and response bodies. Form data deserves a close look, especially when an error records the raw body. Redaction code has to handle imperfect input, as Inspector's raw-`&` fixes show. A field looking masked in one view isn't proof that every recorded copy is masked.

Then check where tokens live between runs. Inspector 2.9.0 stores acquired OAuth tokens in a secret store, but storage deserves its own review. The release notes document a known issue: OAuth profiles sharing a server can overwrite each other's tokens. If you use `MCP_INSPECTOR_OAUTH_STATE_PATH` for separate profiles against that server, the notes say to give each profile a distinct secret store using `MCP_INSPECTOR_SECRET_STORE=file` and a separate `MCP_INSPECTOR_SECRET_FILE`, or a per-profile `MCP_STORAGE_DIR`. The default single-profile setup is unaffected.

Finally, treat an exposed credential as exposed. Editing it out of a later issue comment doesn't remove it from an earlier notification, download, or copied trace. Revoke or rotate it through the provider, then replace the shared artifact with a sanitized version.

MCP is one of the open projects under the [Agentic AI Foundation](https://aaif.io). Its tools are meant to be inspected, tested, and discussed in public. You should be able to report the failed OAuth step and the response that led you there without handing the next reader a working credential. Keep the diagnostic detail. Leave out the token.

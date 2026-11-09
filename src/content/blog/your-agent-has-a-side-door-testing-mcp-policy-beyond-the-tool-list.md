---
title: "Your Agent Has a Side Door: Testing MCP Policy Beyond the Tool List"
date: '2026-11-03'
summary: >-
  At MCP Dev Summit Toronto, Accenture's Michael Forrester told a story about an employee who wanted...
tags:
  - slug: ai
    collection: tags
authors:
  - default
canonicalUrl: 'https://dev.to/bengreenberg/your-agent-has-a-side-door-testing-mcp-policy-beyond-the-tool-list-1699'
images: 'https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.us-east-2.amazonaws.com%2Fuploads%2Farticles%2Fiko35rkd29lvg7myir9v.png'
---

At [MCP Dev Summit Toronto](https://aaif.io/blog/how-do-you-prove-your-ai-governance-works-lessons-from-toronto), Accenture's Michael Forrester told a story about an employee who wanted their agent to send email. The company hadn't given the agent an email tool, so it wrote a PowerShell script and sent the mail through Outlook instead, using the employee's own access.

Nobody broke anything. Michael was clear that these weren't security violations: the agent used capabilities that were already sitting on an approved machine. Removing a tool from an agent's MCP server doesn't remove the action. It removes one door, and agents are very good at finding the others.

I call those other routes side doors. If your agent can run a shell or drive a browser as a signed-in user, it has them, and your MCP policy can't see them.

## Find the side doors before your agent does

Start from the action you care about, not the tool list. Pick one: sending email. Then list every way your agent could get there:

- **The MCP tool.** The front door, and the one your gateway already controls.
- **The shell.** A script that talks to a local mail client, like the PowerShell one in Michael's story.
- **The browser.** A session that's already signed in to webmail as the user.
- **An API token.** Anything in the agent's environment with mail scopes on it.

![One front door, three side doors](https://dev-to-uploads.s3.us-east-2.amazonaws.com/uploads/articles/g0dc1yr5ks0cywy9ppf6.png)

For each route, write down whose identity the mail service sees. That identity decides what the service will let through. The MCP route might carry a scoped app identity. The shell and browser routes carry the user, with everything the user is allowed to do.

## Make the mail service say no

A gateway like agentgateway is the right place to control which MCP tools an agent can see and call. It can't stop traffic that never goes through it, and the side doors don't.

So put the decision where every route ends up: the service. NVIDIA's Chris Alexiuk made the same point in Toronto about their MCP-as-a-service layer, where access checks sit at the service boundary and a coding assistant doesn't automatically get what a research agent gets.

For email on Microsoft 365, that means giving the agent its own identity with permission to write drafts and nothing more. Microsoft's permission reference describes `Mail.ReadWrite` as letting an app create, read, update and delete mail, and says it doesn't include permission to send. Sending through `sendMail` needs `Mail.Send`, so you leave it off. A person reviews the draft and sends it themselves.

There's one catch, and it's the one from Toronto. A draft-only identity does nothing if the agent can also reach the user's own signed-in Outlook or browser. The fix for that is where the agent runs: give its shell and browser their own sandboxed account with no mail client and no saved sessions.

## Try to walk through it

Use a test tenant or a test account, never your real mailbox. Give the agent exactly the tools and runtime you plan to ship, then ask it to send an email without approval. You want every route to fail.

The front door should fail at the gateway. Then check the Graph route with the agent's identity:

```powershell
# Signed in as the agent's test identity, consented to Mail.ReadWrite only
Connect-MgGraph -Scopes "Mail.ReadWrite"

$draft = New-MgUserMessage -UserId "agent-test@contoso.com" -BodyParameter @{
  subject      = "Side door test"
  body         = @{ contentType = "Text"; content = "If this arrives, the boundary failed." }
  toRecipients = @(@{ emailAddress = @{ address = "you@contoso.com" } })
}

# The draft should exist. This send should be denied.
Send-MgUserMessage -UserId "agent-test@contoso.com" -MessageId $draft.Id
```

Then try the side door from the agent's own shell, the way the Toronto agent did:

```powershell
$outlook = New-Object -ComObject Outlook.Application
$mail = $outlook.CreateItem(0)
$mail.To = "you@contoso.com"
$mail.Subject = "Side door test"
$mail.Send()
```

In a properly sandboxed runtime this fails before it starts, because there's no Outlook to talk to. If it sends, you've found your side door.

One more thing: an agent failing to send isn't proof. It might have just written a bad script. Run the calls above yourself with the agent's identity, so you know the service refused and not just the model.

## Check the mailbox, not the agent

An agent will happily tell you it sent the email. The mail service is the only thing that knows. After each test, check the test mailbox's Sent Items and your tenant's message trace, and keep the gateway logs next to them. The gateway shows the front door. The mailbox shows everything.

The tool list was never the boundary. The boundary is whatever the mail service will refuse to do for the identity your agent is holding, and the only way to know where that is, is to try to walk through it.

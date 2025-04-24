---
title: Docker Does What?!? Run AI Models Locally with Docker
date: '2025-03-30'
summary: >-
  Docker Model Runner is a new feature that allows you to run, manage, and
  interact with AI models directly on your local machine. Forget about cloud
  setup hassles, expensive infrastructure, and latency. Now you can incorporate
  generative AI capabilities into your development workflow right from your
  machine.
tags:
  - slug: ai
    collection: tags
  - slug: docker
    collection: tags
  - slug: productivity
    collection: tags
image: >-
  https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fbj1ve2hwdxafvxfwugqp.png
authors:
  - default
---

![header image](https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fbj1ve2hwdxafvxfwugqp.png)

Docker has always been about simplifying developers' lives, making it effortless to build, ship, and run applications anywhere. But now Docker has decided to take things one big step further.

Introducing Docker Model Runner, a feature that allows you to run, manage, and interact with AI models directly on your local machine. Forget about cloud setup hassles, expensive infrastructure, and latency. Now you can incorporate generative AI capabilities into your development workflow right from your machine. This new capability opens doors to easier experimentation, quicker prototyping, and smarter automation tasks.

## Why Docker Model Runner?

As developers, we're constantly seeking ways to boost productivity, enhance workflows, and reduce unnecessary friction. Traditional methods of integrating AI into development processes often involve complicated cloud setups, API keys, network latency, and security concerns around sensitive data leaving local environments. Docker Model Runner resolves these issues by enabling you to run AI models locally, securely, and efficiently.

By using Docker's familiar containerization paradigm, you get predictable results, isolation of dependencies, and the convenience of interacting with AI models as easily as you interact with standard Docker containers. 

Whether you're building AI-driven internal tools, developing chatbots, automating mundane tasks, or prototyping ideas rapidly, Docker Model Runner provides an easy and privacy-first path forward.

Let's look at one practical example involving an area that we interact with all the time: Creating Git commit messages.

## Automatically Generate Git Commit Messages

One practical, immediately useful scenario for every developer is automating the creation of Git commit messages. Writing meaningful, clear commit messages is crucial for maintaining an understandable project history. Unfortunately, we often rush or overlook this step, resulting in vague or unclear commit messages.

You can use Docker Model Runner to address this pain point easily. 

Let's integrate the model runner into a [Git hook](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) in a project repository that analyzes the code you've changed and automatically generates clear, concise, and descriptive commit messages.

First, before we move forward, make sure you have Docker Desktop v4.40 or greater installed on your machine. Beginning in v4.40 the new CLI command `docker model` is introduced as a first-class citizen.

Once you have installed Docker Desktop v4.40 or greater make sure you have the Model Runner enabled as you see in the screenshot below.

![Enabling Model Runner in Docker Desktop](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/rjmkcaol3lm548ocz5ec.png)

With that out of the way, you're ready to get started.

Here's how you set it up:

**Step 1: Pull the AI Model**

First, you'll want to get your local copy of the AI model from Docker Hub, we'll use the `llama3.2` example here.

```bash
docker model pull ai/llama3.2
```

**Step 2: Set Up a Git Hook**

Next, you will set up a Git hook that automatically invokes Docker Model Runner each time you commit code. Navigate to your project's `.git/hooks/` directory, and create a new file named `prepare-commit-msg` with this content:

```
#!/bin/bash

COMMIT_MSG_FILE=$1

# Capture staged code changes
CODE_DIFF=$(git diff --cached)

# Generate commit message using Docker Model Runner
COMMIT_MESSAGE=$(docker model run ai/llama3.2 "Generate a concise and descriptive Git commit message based on the following code changes, only return the commit message and nothing else, do not include any other text or explanation, do not include backticks or code blocks. Here is the code diff:
$CODE_DIFF")

# Write the AI-generated message into the commit message file
echo "$COMMIT_MESSAGE" > "$COMMIT_MSG_FILE"
```

Make the script executable with this command:

```
chmod +x .git/hooks/prepare-commit-msg
```

**Step 3: Commit Your Changes**

With the Git hook set up, simply stage your changes as usual:

```
git add -p
```

Then commit:

```
git commit
```

Docker Model Runner immediately generates an accurate and descriptive commit message tailored specifically to your changes, streamlining your commit process.

## Try It Yourself

The full, working example used in this article is available on [GitHub](https://github.com/hummusonrails/docker-ai-model-runner-examples)

Clone the repository, follow the simple instructions, and experience firsthand how Docker Model Runner can elevate your dev experience.


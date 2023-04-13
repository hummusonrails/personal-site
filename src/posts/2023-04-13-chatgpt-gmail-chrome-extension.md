---
layout: post 
tags: ['posts']
title: "ChatGPT for Gmail: The Chrome Extension to Fine-Tune Your Emails"
date: 2023-04-13
teaser: "Transform Your Gmail Drafts with Style: An Open Source Chrome Extension Powered by ChatGPT"
image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/shdqscanh9wyou3mfy0h.png
---

## ChatGPT for Gmail: The Chrome Extension to Fine-Tune Your Emails

![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/shdqscanh9wyou3mfy0h.png)

### Ben Greenberg
#### April 13, 2023

Email communication is a crucial part of modern life, and the way we present our messages can impact how they are received. During some recent time off, I explored several small projects ([example one](https://www.bengreenberg.dev/posts/2023-04-04-github-action-gpt-language-check/), and [example two](https://www.bengreenberg.dev/posts/2023-04-09-github-profile-dynamic-content/)), with the final one being the [ChatGPT Email Reviewer](https://github.com/hummusonrails/chatgpt-gmail-suggestions-chrome-extension) —- a Chrome extension that integrates with Gmail to offer stylistic suggestions for email drafts using ChatGPT, an AI language model developed by OpenAI.

In this post, we'll dive into the inspiration behind this project, how it operates under the hood, and how you can use it to elevate your email writing.

## The Inspiration

Writing an email often involves careful consideration of tone and style to match the intended audience. The choice between a friendly reminder, an authoritative notice, or a heartfelt message can affect the email's effectiveness. I often can sit for way too much time trying to find the right words to convey my message, simply staring at a blank Gmail draft message.

With this challenge in mind, I leveraged the capabilities of ChatGPT to create a Chrome extension that provides real-time style suggestions within Gmail, helping users, notably myself, craft emails that align with communication goals.

## How It Works

The [ChatGPT Email Reviewer Chrome extension](https://github.com/hummusonrails/chatgpt-gmail-suggestions-chrome-extension) integrates seamlessly with Gmail's user interface, offering stylistic suggestions for your email drafts. To achieve this, the extension consists of two main components: the content script (`contentScript.js`) and the popup script (`popup.js`).

Let's explore these components in more detail:

### The Content Script: Interacting with Gmail's DOM

The content script is responsible for interacting with Gmail's DOM and extracting the email draft text. This script is injected into the Gmail page and listens for messages from the popup script.

```javascript
// contentScript.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reviewEmail") {
    const selectedStyles = request.styles;

    if (request) {
      chrome.storage.sync.get(["apiKey", "signatureDelimiter"], result => {
        if (result.apiKey) {
          const emailBody = getEmailBody(result.signatureDelimiter);
          sendToChatGPT(emailBody, selectedStyles, result.apiKey, result.signatureDelimiter).then(() => {
            sendResponse({ success: true });
          }).catch(() => {
            sendResponse({ success: false });
          });
        } else {
          alert("Please enter and save your OpenAI API key in the extension settings.");
          sendResponse({ success: false });
        }
      });
    } else {
      sendResponse({ success: false });
    }

    return true;
  }
});
```

The content script listens for the `reviewEmail` action and retrieves the email draft text using the `getEmailText` helper function. It then calls the `sendToChatGPT` function, which sends the text to the OpenAI API, and displays the suggestions using the `displaySuggestions` function.

### The Popup Script: Handling User Interactions

The popup script manages user interactions with the extension's interface. It provides options for selecting writing styles, entering an OpenAI API key, and configuring other settings.

```javascript
// popup.js

document.getElementById("reviewButton").addEventListener("click", () => {
  const selectedStyles = Array.from(document.querySelectorAll('input[name="style"]:checked')).map(input => input.value);

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "reviewEmail", styles: selectedStyles });
  });
});
```

When the user clicks the "Review Email" button, the script collects the selected writing styles and sends a message to the content script with the `reviewEmail` action and the chosen styles. The content script takes over from here, analyzing the email draft and providing suggestions.

### Communicating with the OpenAI API

The extension communicates with the OpenAI API to analyze the email text and generate style suggestions. This process is handled by the `sendToChatGPT` function within the content script.

```javascript
// contentScript.js

async function sendToChatGPT(text, styles, apiKey, signatureDelimiter) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      messages: [{"role": "user", "content": `Review and provide suggestions for the following email draft combining the following styles or only a single style if only one is provided: ${styles.join(', ')}. Please return only the revised email text without suggesting a subject. Email draft: ${text}`}],
      model: "gpt-3.5-turbo",
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.8
    })
  });

  const data = await response.json();
  if (data.choices && data.choices.length > 0) {
    displaySuggestions(data.choices[0].message.content, signatureDelimiter);
  } else {
    console.log("No suggestions received");
  }
}
```

The `sendToChatGPT` function creates a prompt based on the email text and selected styles, then makes a `POST` request to the OpenAI API using the provided API key. The function returns the suggestions generated by the API for display to the user.

You can explore the rest of the code on [GitHub](https://github.com/hummusonrails/chatgpt-gmail-suggestions-chrome-extension) and I welcome your contributions!

## Getting Started

To start using the ChatGPT Email Reviewer, visit the [GitHub repository](https://github.com/hummusonrails/chatgpt-gmail-suggestions-chrome-extension) to install the extension on your Chrome browser. Follow the instructions in the `README` to configure your OpenAI API key, which you can obtain by creating an account on the OpenAI website.

The extension also provides an option to specify a signature delimiter to distinguish your email signature from the main content, ensuring the analysis is focused solely on the message.

Once set up, you can begin crafting compelling emails that reflect your chosen style with just a few clicks!

## Code Contributions Welcome!

The ChatGPT Email Reviewer is currently available only on GitHub and is under review for the Chrome Web Store. As you explore and use this tool, I welcome your feedback, suggestions, and experiences. Your input is invaluable in refining and enhancing the tool for everyone. Please feel free to reach out to me on [Twitter](https://twitter.com/hummusonrails) or raise an issue or PR on the [GitHub repository](https://github.com/hummusonrails/chatgpt-gmail-suggestions-chrome-extension) with enhancements or bug fixes.

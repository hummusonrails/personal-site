---
layout: post 
tags: ['posts']
title: "A ChatGPT GitHub Action for Reviewing Text for Potentially Discriminatory Language"
date: 2023-04-04
teaser: Discover the ChatGPT GitHub Action Language Check, an AI-powered tool that helps you eliminate discriminatory language in your writing and foster a more inclusive world.
image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/fanioqnqfago5k9stj78.png
---

## A ChatGPT GitHub Action for Reviewing Text for Potentially Discriminatory Language

![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/fanioqnqfago5k9stj78.png)

### Ben Greenberg
#### April 4, 2023

As we navigate the complexities of our increasingly connected world, it's more important than ever to ensure our communications are inclusive and respectful. With that in mind, I am sharing a new tool I built, the [ChatGPT GitHub Action Language Check](https://github.com/bencgreenberg/github-action-gpt-language-check) - it will help you review text for potentially discriminatory language, fostering a more inclusive and empathetic writing environment.

In this blog post, I'll walk you through the motivation behind this project, the technical implementation using Rust and the OpenAI API, and the potential impact it can have on our everyday writing.

## The Motivation

Language is a powerful force in shaping our perceptions, beliefs, and attitudes. However, it can also be a double-edged sword, as words can hurt and alienate people when used carelessly. It's crucial that we use language thoughtfully and inclusively, ensuring that our communications are respectful and do not marginalize anyone. 

One of the best stories I grew up hearing about the power of language is briefly recapped as a person who goes to their rabbi distraught about the words they uttered and wants to find a way to undo their damage. The rabbi tells them to take a pillow full of feathers up to the roof and disperse the feathers, then try to gather them all back up. The person tries, but it's impossible. The rabbi then tells them that words are like feathers, once they're out, they can't be taken back. This story has always stuck with me and I think it's a great reminder of the power of language.

This story has been a motivating principle behind my life for a long time, and therefore, whenever I've worked on docs, I've thought about how I could ensure that exclusionary words, even unintentionally, did not make their way into the final copy. During my time at Nexmo, a communications API company, I introduced [Alex](https://www.npmjs.com/package/alex), an NPM package that helps you identify potentially exclusionary language in your writing, into the [CI/CD pipeline for the documentation](https://github.com/Nexmo/nexmo-developer/blob/main/.github/workflows/ci.yml#L74).

Since then, I've thought if there were other ways to ensure that the language we use is inclusive. I've been playing with the [OpenAI API](https://openai.com/) for different projects and purposes -- whether to [help people generate meaningful speeches](https://www.clinked.ai) or to [generate tutorial topics based on StackExchange questions](https://github.com/bencgreenberg/stackexchange-tutorial-themes) -- and I thought maybe it could be helpful in this context as well.

The GitHub Action created as a result of this experiment can identify problematic language in our writing and replace it with more inclusive alternatives, fostering a more empathetic and understanding world.

## The Technical Implementation

The [ChatGPT GitHub Action Language Check](https://github.com/bencgreenberg/github-action-gpt-language-check) is written in Rust, but it is easy to interact with the OpenAI API in any language. My previous projects using it were written in Ruby and JavaScript, respectively.

The program uses the `reqwest` library, a popular HTTP client for Rust, to send requests to the OpenAI API, which leverages the GPT-3.5-turbo model to analyze text for discriminatory language. The GPT-4 model is not yet fully available as of this writing in their API access, so I chose to keep it at the most recent and most available model available. The process is simple:

- The program reads a markdown file provided by the user.
- It extracts the text from the file and sends it to the OpenAI API.
- The API returns a review, highlighting any potential discriminatory language found and suggesting alternatives when appropriate.

To use the ChatGPT GitHub Action Language Check, you'll need an OpenAI API key. You can obtain one by signing up for an OpenAI account.

## A Closer Look at the Code

The code begins with several imports, including the `reqwest` library for HTTP requests and `serde` for serialization and deserialization. It also defines a custom error type, `SuggestionError`, which helps handle errors related to suggestions returned by the API.

The main function serves as the entry point for the program, calling the `review_text` function and printing the results.

In the `review_text` function, the program reads the provided markdown file, extracts the text, and sends it to the OpenAI API by calling the `call_openai_api` function. The result, a review highlighting any problematic language and suggesting alternatives, is printed to the console.

The `call_openai_api` function is responsible for communicating with the OpenAI API. It creates a new HTTP client using the `reqwest` library, formats the prompt text to include the user-provided text, and sends a POST request to the API with the appropriate model parameters and prompt text.

Upon receiving a response from the API, the function extracts the suggestion and returns it to the caller.

## Testing the ChatGPT GitHub Action Language Check

To demonstrate the effectiveness of the ChatGPT GitHub Action Language Check, I've included a test module in the code. This module contains two tests, one for reviewing text without discriminatory language and another for reviewing text with discriminatory language.

The tests use the `mockito` library, a HTTP mocking library for Rust, to simulate API responses. By defining mock responses for the OpenAI API, we can test the program's functionality in a controlled environment.

In the first test, `test_review_without_discriminatory_language`, we provide a normal sentence without any discriminatory language. The expected result is a review stating that there's no discriminatory language in the text. The second test, `test_review_with_discriminatory_language`, supplies an example sentence containing discriminatory language. In this case, the expected result is a review highlighting the problematic language and suggesting an alternative.

I could most likely include more testing for the tool in the testing suite, but these two cover the basic functionality. If you'd like to add more tests, you are welcome to do so by [opening a pull request in the repository](https://github.com/bencgreenberg/github-action-gpt-language-check/blob/main/CONTRIBUTING.md)!

## The Impact on Our Everyday Writing - A Sample Workflow

The intention for this tool is to be incorporated in the CI/CD pipeline for any project that wants to ensure that their writing is inclusive and respectful. The repository contains a [sample GitHub Action workflow](https://github.com/bencgreenberg/github-action-gpt-language-check/blob/main/docs/review_markdown.yml) that can be used to run the tool on markdown files included in a pull request. The Action then leaves a comment on the pull request with the review, highlighting any problematic language and suggesting alternatives, or stating that there's no problematic language in the text.

You can find the [sample workflow in the repository](https://github.com/bencgreenberg/github-action-gpt-language-check/blob/main/docs/review_markdown.yml) and use it as a template for your own project. You'll need to include your OpenAI API key as a secret in your repository settings. You can find more information about GitHub Actions in the [GitHub Actions documentation](https://docs.github.com/en/actions), including how to add a secret to your repository.


## Your Invitation to Give It a Try

Now that you know what the [ChatGPT GitHub Action Language Check](https://github.com/bencgreenberg/github-action-gpt-language-check) is all about, I invite you to give it a try. Your feedback, suggestions, and contributions are invaluable in refining this tool. 

To get started, visit the project repository on GitHub, clone it to your local machine, and follow the setup instructions. Remember, you'll need an OpenAI API key to use the tool. Once you've set it up, you can start reviewing your text for potentially discriminatory language and make your writing more inclusive.

You can find the project at [https://github.com/bencgreenberg/github-action-gpt-language-check](https://github.com/bencgreenberg/github-action-gpt-language-check). I look forward to hearing about how it helps you in your writing!
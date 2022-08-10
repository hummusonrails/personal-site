---
layout: page 
tags: ['posts']
title: Build your own synthetic user testing
date: 2022-07-05
canonical: https://newrelic.com/blog/how-to-relic/synthetic-user-testing
teaser: A resilient testing suite for your application includes unit tests, integration tests, acceptance tests, and more. All those tests go a long way in ensuring the reliability of your application and providing confidence when you deploy code changes. But there’s another kind of testing that’s important to add to your suite if you haven’t already - simulating the behavior of your users. 
image: https://newrelic.com/sites/default/files/styles/16x9_600w/public/2022-05/Brand-blog_1440x736.jpg
---

# Build your own synthetic user testing

![header image](https://newrelic.com/sites/default/files/styles/16x9_600w/public/2022-05/Brand-blog_1440x736.jpg)

### Ben Greenberg
#### July 5, 2022

A resilient testing suite for your application includes unit tests, integration tests, acceptance tests, and more. All those tests go a long way in ensuring the reliability of your application and providing confidence when you deploy code changes. But there’s another kind of testing that’s important to add to your suite if you haven’t already: simulating the behavior of your users.

So, what does it mean to simulate the behavior of your users? Imagine you have an e-commerce platform. You want to be confident that a new refactor or feature you deploy works and is performant. You also want to make sure that you have anticipated all the ways your users will interact with your platform. Users of your applications often do things that you don’t want them to do, sometimes intentionally, but most often unintentionally. You want to know what those actions are, what kind of responses it produces, and to account for those responses in your application.

These tests are called synthetic user testing, sometimes just synthetics. You can [get started with New Relic synthetic monitoring options](https://docs.newrelic.com/docs/synthetics/synthetic-monitoring/getting-started/get-started-synthetic-monitoring/) to cover the full range of items you want to account for. In this blog post, you’ll learn how to build your own synthetics. You’ll gain a deeper technical understanding of how synthetic monitoring works, which gives you a deeper perspective on what New Relic offers for synthetic monitoring.

Let’s get started!

## Prerequisites

First, make sure you have Node.js, Chromedriver and Selenium installed on your machine. If you need help, here are the  installation instructions:

-   [Node.js](https://nodejs.org/en/download/package-manager/)
-   [Chromedriver](https://chromedriver.chromium.org/getting-started)
-   [Selenium](https://www.selenium.dev/documentation/webdriver/getting_started/install_library/)

When you have the right libraries installed, you’re ready to go.

## Building a synthetic monitoring test manually

In this tutorial, you’ll build a synthetic monitoring test for a form on a website. The synthetics test will simulate how your users are behaving when they fill out and submit a form. A test like this is essential to ensure your website is working correctly and the form is meeting its specified requirements. Is the form working correctly? Does it allow the users to fill out each field and submit it?

Real users navigate to the form on your site in their browsers. A synthetics test also uses a headless browser such as Chromedriver, so you need to identify all the form elements that the browser will interact with.

1\. With the Node.js implementation of Selenium, you can use the `.findElement` function on an instance of the webdriver and pass in an argument specifying how you want to find the element. For example, you can find an element by its CSS tag:

```
driver.findElement(By.css(‘input’));
```

This finds an element with a CSS `input` tag, which will locate the input element of a form. Assuming you’re working with a single input form, that’s perfect.

Another option is to find the form with its `xpath`. Using the `xpath` you can grab all the elements of the form. This works well for a form that has more than one element:

```
driver.FindElements(By.xpath('//form]//input'));
```

Let’s continue with the example of a single input form. Just picture all the email signup forms you have encountered on the web. Maybe you’ve  added your own email signup form to your application and you need to make sure it works. You’ll also want to make sure it responds to incorrect inputs. Because you don’t want to manually test all the happy and unhappy paths in your user journey, you decide to build a synthetics test.

First, let’s review the entire test. Then we’ll break it down to its individual parts:

```
const {Builder, By, Key, until} = require('selenium-webdriver');

(async function formTest() {
  let url = 'THE SITE YOU ARE TESTING'
  let driver = await new Builder().forBrowser('chrome').build();

  try {
      await driver.get(url);

      await driver.wait(until.elementLocated(By.css('input')), 30000);
      form = await driver.findElement(By.css('input'));
      form.sendKeys('example@notarealemail.com', Key.RETURN);
      await driver.wait(until.elementLocated(By.css('h2')), 30000);
      let title = await driver.findElement(By.css('h2')).getText();
      if (title == 'Thank you!') {
        console.log('Success!')
      } else {
        console.log('The form is not working')
      };
  }
  finally {
      await driver.quit();
  }
})();
```

This example includes the Selenium Webdriver npm package and assign it to four distinct variables: `Builder`, `By`, `Key`, and `until`. You’ll use each one of those in your code.

2\. After you’ve included the Selenium Webdriver npm package, you create an async function. There are several ways to handle asynchronous non-blocking programming in JavaScript, in this example you’ll use the async/await pattern, which waits for the results of the web interactions to resolve before moving to the next line of code.

-   The first action you perform in the function is to fetch the URL of the sample application you are testing. When the site is loaded, you then include another `wait` until the [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction) is fully resolved. The way to know that is when an element you are certain should be there can be located. In this case, it’s the `input` tag that you’ll be testing against. 
-   Then, when the DOM is fully resolved, you grab the `input` element and instruct the computer to send keys to it as if it was a real human being. The test wraps up by sending the form and grabbing the response. If the response is what you expect, then you output a success message. If not, then you output a failure and the test does not pass.

## Unhappy paths

This test clearly is working through the happy path of our signup form. What would some of the unhappy paths be? Here are just some possibilities:

-   A user clicks submit without entering any text.
-   A user enters text that is not an email address and clicks submit.
-   A user enters an email address but never clicks submit.
-   Is there a threshold to the characters a user can enter?
-   Is there a minimum to the characters a user can enter?
-   A user clicks submit numerous times in quick succession. Does that fire multiple POST requests?
-   There are many ways for things to go wrong. Just because none of them _do_ go wrong now, doesn’t mean you can expect the same behavior in future iterations of your application. The only way to ensure they never go wrong is to build a robust synthetics testing suite.

## Building a synthetic testing suite

Many folks dislike building tests or have joined teams that haven’t been diligent with testing. Thankfully, there's another option. Instead of building multiple synthetic tests for your web applications, you can use New Relic to write synthetic tests for you.

In one click within the top-level navigation bar on New Relic, you can start creating numerous synthetic monitors that are fully managed for you.

![picture of menu choices](https://newrelic.com/sites/default/files/styles/1200w/public/2022-06/synthetics-create-monitor.webp?itok=RhainD-e)

Now that you have experienced and learned a bit how to create your own synthetic testing suite using Node.js, Selenium Webdriver, and Chromedriver, you can more fully appreciate what New Relic synthetics can do for you.

## Next steps

Whether you choose to use New Relic [synthetic monitoring](https://newrelic.com/platform/synthetics) or build your own synthetic tests, incorporating a robust synthetic testing suite into your testing framework is essential for creating confidence in your code as you continue refactoring and introducing new features.

If you don’t already have New Relic, [sign up for a free account](https://newrelic.com/signup) to try out synthetic monitoring with your own applications.

Have any questions? Drop a note to the New Relic DevRel team at [devrel@newrelic.com](mailto:devrel@newrelic.com), or join us on [Slack](https://newrelicusers-signup.herokuapp.com/)!
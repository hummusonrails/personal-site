---
title: My Mac Dev Tools
date: '2022-02-22'
summary: >-
  You have a new Mac and you are so excited to get going on creating awesome
  applications on it. First, though, you need to install some dev tools. What do
  you put on your brand new machine?
tags:
  - slug: productivity
    collection: tags
image: >-
  https://res.cloudinary.com/practicaldev/image/fetch/s--DMiM_dIC--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kkb2pld463z5rxa1uvhj.png
authors:
  - default
---
  
  ![header](https://res.cloudinary.com/practicaldev/image/fetch/s--DMiM_dIC--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kkb2pld463z5rxa1uvhj.png)


You have a new Mac and you are so excited to get going on creating awesome applications on it. First, though, you need to install some dev tools. What do you put on your brand new machine?

Here is my list of what I run through whenever setting up a new Mac.

### [Oh My Zsh](https://ohmyz.sh/)
  
```bash
$ sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

I love using Oh My ZSH instead of the default Bash. Why? Here are just some of the reasons:

* Thousands of custom plugins and themes. I can constantly update my terminal in look and functionality whenever I need to, pretty easily.
* Autocompletion of the `cd` command. Less keys I need to type the better.
* Spelling correction. This one is a big one for me. Who wants to get thrown off course because your finger hit the a instead of the s key?
  
### [Homebrew](https://brew.sh/)
  
```bash
$ /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

MacOS does not have a default package manager unlike Linux, for example. That means managing your dependencies can be a real challenge. This is precisely what Homebrew takes care of for you. It gives you a universal package manager for your Mac that you can use for just about everything. Want to see an example?

```bash
$ brew install NAME_OF_PACKAGE
```

That's all it takes to use it. Pretty nice, right?
  
### [fig](https://fig.io/)
  
[Download it here](https://fig.io/).

This is the newest tool I install regularly on my machines, and I've really come to enjoy having it. Fig adds MacOS style autocomplete to your terminal. It is also completely customizable, so you can add custom autocompletions as you need them.

![Example of fig in use](https://media.giphy.com/media/Rvwp4jSKWf1ZOvFxCF/giphy.gif)
  
### [asdf](https://asdf-vm.com/)
  
```bash
$ brew install asdf
```

No matter what language you are working with, chances are you will need to install it on your computer. Furthermore, you will probably need to maintain different versions of that language for robust testing and compatibility. Doing all of this manually can be a real headache, while `asdf` makes it as straightforward as it can be.

Want to install a particular version of Ruby with `asdf`?

```bash
$ asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git
$ asdf install ruby 3.1.0
```

Want to switch between versions of Ruby using `asdf` that are installed on your machine?

```bash
$ asdf global ruby 3.1.0
```
  
### [yarn](https://yarnpkg.com/)/[npm](https://www.npmjs.com/)
  
```bash
$ brew install yarn
```

If you are working on modern web applications, chances are you will need a Node package manager. The two most common options are either `yarn` or `npm`. They operate functionally very similarly, so choose the one that makes sense for your application development. You may even need to install both depending on the stacks you work in.
  
### [GitHub CLI](https://cli.github.com/)
  
```bash
$ brew install gh
```

The GitHub CLI brings all the functionality you need in working with GitHub to your command line. It collapses sometimes complex git commands into a few words, for example to create a new pull request:

```bash
$ gh pr create
```

To clone a repository on your machine:

```bash
$ gh repo clone path/to/repo
```

I use it practically every day when navigating through pull requests, issues, and committing changes.
  
### [New Relic CLI](https://developer.newrelic.com/automate-workflows/get-started-new-relic-cli/)
  
```bash
$ curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash && sudo NEW_RELIC_API_KEY=YOUR_NEW_RELIC_API_KEY_HERE NEW_RELIC_ACCOUNT_ID=YOUR_NEW_RELIC_ACCOUNT_ID_HERE /usr/local/bin/newrelic install
```

This one might seem a bit interesting. Why would you install an application performance monitoring and monitoring tool on your machine? Because, it provides incredible data on your local computer!

Take a look at this screenshot just of the summary view of what is going on within my computer.

![Summary view of New Relic One monitoring local machine](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/alh0moo62iu3yo36l0iu.png)

When you start intensively developing on your computer, you are going to want to have an understanding of the health of your machine, and New Relic gives you that perspective. Best of all, a [New Relic account is always free](https://newrelic.com/signup), so there's really nothing to lose and a whole lot to gain.

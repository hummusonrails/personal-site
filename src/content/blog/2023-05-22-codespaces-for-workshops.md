---
tags: ['github', 'blockchain']
title: "Unlocking GitHub Codespaces for Workshops"
date: '2023-05-22'
summary: "Teaching code to people of all skill levels has never been easier thanks to Codespaces"
image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/h8fo7aokdcnsrwh6wu6j.png
authors: ['default']
---

![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/h8fo7aokdcnsrwh6wu6j.png)

I remember the first time I taught a technical workshop. It involved building inside the context of a Ruby on Rails application. I had practiced the delivery of the workshop for hours. I rehearsed all the elements of the workshop, from the introduction all the way through to the conclusion. Yet, there was one aspect I did not consider: the challenge of creating a development environment for the attendees.

This problem has not become any simpler over the years. In fact, it has only become more challenging, as the requirements for many projects have become more complex involving a lot more dependencies and specific configurations on local machines before anyone can even touch the code of the project. All of this does not even mention the often enormous amount of data that needs to be downloaded during a local environment configuration. If you have ever tried to watch a movie on hotel WiFi, now imagine trying to install an entire Rust environment on that same connection.

This is where [GitHub Codespaces](https://github.com/features/codespaces) comes in. Codespaces is a cloud-based development environment that allows you to create a development environment that is accessible from anywhere. This means you can have Codespaces do all the heavy-lifting for your workshop setup for you, so your attendees can spend more time learning and less time configuring their local machines.

Doing so, though, requires a bit of configuration to get things ready. In this article we're going to explore how I set up Codespaces to teach an intro to smart contracts workshop for attendees from all over the world and from all different skill levels. People who had never touched a line of code before in their lives had the chance to build their own smart contract and deploy it to their own local node and see firsthand how it works without hours of setup before they could even get started.

First, we're going to look at what the workshop was about and what the attendees were able to accomplish. Then, we'll look at how I set up Codespaces to make this possible. Finally, we'll look at some of the challenges I faced and how I overcame them.

Let's get started!

## The Workshop

I believe strongly that everyone should have the opportunity if they so desire to experience tech firsthand, and to have the chance to get their hands immersed in code. I think this is especially true for developer-facing companies where people work in a variety of important roles, and not all of those roles are technical in nature. Giving people from all backgrounds the chance to experience themselves the power of code is a great way to build empathy and understanding across teams, and help bridge any divides between the engineering sides of a company and the non-engineering sides.

This is why I was so excited to have the opportunity to teach a workshop for everyone at [the company I work at](https://parity.io) on how to build, deploy and interact with smart contracts within the context of the [Substrate](https://substrate.io) blockchain framework. 

The workshop taught attendees the following things:

- How to create a new smart contract using the [cargo contract](https://github.com/paritytech/cargo-contract) CLI tool
- How to test the contract from the command line
- How to build the contract into a WASM binary
- How to run a [Substrate node](https://substrate.io) locally
- How to deploy the contract to a local node
- How to interact with the contract from the command line

As you can see there was quite a lot to accomplish in a workshop! The last thing I wanted to do was spend valuable workshop time also downloading and building all the dependencies for the workshop. If you have ever worked in a Rust-based project before, you know that this can take quite a long time.

This is where Codespaces came to the rescue.

Let's take a look at how I set up Codespaces to make this possible.

## Setting Up Codespaces for the Workshop

The first thing I did was fork a copy of the [Substrate Contracts Node Template](https://github.com/hummusonrails/substrate-contracts-node). The Substrate Contracts Node template is a great starting point for building a Substrate-based blockchain that supports smart contracts. It comes with a lot of the boilerplate code already set up for you, so you can focus on building your smart contracts. I forked it because I needed to add the Codespaces configuration, which lives inside the `.devcontainer` directory.

Inside the `.devContainer` folder I added two files:

* `devContainer.json` - This file contains the configuration for the Codespaces environment. It tells Codespaces what to install and how to configure the environment.
* `updateContentCommand.sh` - This file contains the commands to run to update the content of the Codespaces environment. This runs after the Codespaces environment is created, and is a great place to put any commands that need to be run after the environment is created.

The `devContainer.json` file accomplishes two tasks required for creating a Codespaces environment suitable for a Substrate workshop. It sets up Rust on the Codespaces image and WASM support for Rust. Once that is finished, it then runs the `updateContentCommand.sh` file, which is an executable that finishes the setup for the workshop. 

Within the `updateContentCommand.sh` file, I added the following commands:

```bash
#!/bin/sh

echo "Installing Rust and WASM toolchain..."
curl https://sh.rustup.rs -sSf | sh -s -- -y
rustup default stable
rustup update
rustup update nightly
rustup target add wasm32-unknown-unknown
rustup target add wasm32-unknown-unknown --toolchain nightly

echo "Installing protoc..."
sudo apt update
sudo apt install -y unzip
PROTOC_VERSION=$(curl -s "https://api.github.com/repos/protocolbuffers/protobuf/releases/latest" | grep -Po '"tag_name": "v\K[0-9.]+')
curl -Lo protoc.zip "https://github.com/protocolbuffers/protobuf/releases/latest/download/protoc-${PROTOC_VERSION}-linux-x86_64.zip"
sudo unzip -q protoc.zip bin/protoc -d /usr/local
sudo chmod a+x /usr/local/bin/protoc
rm -rf protoc.zip

echo "Building Substrate Node Template..."
cargo build --release --locked

echo "Installing cargo-contract CLI tool..."
cargo install --force --locked cargo-contract --version 2.0.0-rc
```

Let's break the above commands down one by one.

The first thing we do is use the `rustup` tool to set the stable version of Rust as our default version. We then update both the stable and the nightly versions of Rust, and add the `wasm32-unknown-unknown` target to both versions. This is required for building WASM binaries, which is what we need to do in order to build our smart contracts. (Bonus content: What is the `unknown-unknown` part of that target? It basically means compile on just about any machine, and run on just about any machine. Pretty cool, right? Just another way WASM is awesome.)

Then, we install `protoc`, which is the protobuf compiler. Protobuf is a binary serialization format that is used by Substrate to communicate between nodes. We need to install this in order to build the Substrate node template. This requires a bit more work as you can see in the example above. We need to first get the latest version of `protoc` from GitHub, and then unzip it and move it to the `/usr/local/bin` directory. This is because Codespaces does not come with `protoc` installed by default.

Lastly, we build and install both the Substrate Contracts Node template, and the `cargo-contract` CLI tool.

Once, this is all done, the Codespaces environment is ready for the workshop!

Now, there are only a couple of issues here that needed to be addressed before using this for the workshop, and they both revolve around the fact that all of this setup takes a lot of time! On the default Codespaces image, this can take upwards of one hour to complete. This is not ideal for a workshop, where you want to get people up and running as quickly as possible. The secondary issue is that while this takes time, it also takes some familiarity with GitHub to set up. What do you do when your attendees are not familiar with GitHub? How do you get them up and running quickly?

This is how I solved these issues.

## Codespaces Prebuilds

It was as if the creators of Codespaces understood these problems intuitively and that is why they enabled prebuilds for environments. Prebuilding a Codespace environment means that as soon as someone enters into the environment everything is ready to go. No waiting for the dependencies to install and no waiting for the environment to be configured. 

To enable prebuilds you only need to choose the option from within the settings in the Codespaces options inside the repository.

![Prebuild Option in GitHub](static/images/posts/codespaces_workshops/github_menu_option_for_prebuilds.png)

This seems simple enough, yet if someone doesn't have *any* experience with GitHub it can be still quite overwhelming. Think about it. Just to get to that point, you need to create a GitHub account, fork the repositority, enter into its options, navigate to the Codespaces section of those options, and enable Prebuilds. That is a lot of steps for someone who has never used GitHub before.

I wanted to make this as manageable as possible, so I included a step-by-step guide in a Google Doc, that included pictures similar to the above that walked attendees through that process from creating an account all the way until they enabled the prebuild.

The steps continued in the Google Doc until they reached the end, and just needed to click on one last button.

![Prebuild Option in GitHub](static/images/posts/codespaces_workshops/github_prebuilds_final_step.png)

This build took time just like it would if the attendee was doing it during the workshop itself, approximately an hour of time. However, if they finished these steps up to two hours before the workshop began they were pretty much guaranteed to have a prebuild ready to go by the time the workshop started.

There were still some issues present during the workshop. Let's take a look at them now.

## Pain Points

The primary pain points experienced by the attendees were about the limitations on Codespaces for free users and simply the challenges of cloud environments in general.

Codespaces for free use is currently limited to 60 hours of free use and 15 GB of free storage per month. Rust projects can be resource intensive when they are compiling, and Substrate is not particularly small, which means that users of Codespaces on the free tier will run out of both time and storage relatively quickly. Of course, a user can purchase more of both on GitHub, and GitHub Pro accounts do get more time and storage included, but this is still a pain point. 

![Codespaces pricing as of May 2023](static/images/posts/codespaces_workshops/github_codespaces_pricing.png)

The other challenge can simply be stated as the finnicky nature of cloud environments. During the workshop of about 60 attendees, some attendees reported exceptionally slow access to their prebuilt Codespace environment, while other users had no speed issues at all. It is hard to know at any given time what the load on the Codespaces servers are, and how that will affect the performance of the Codespaces environment. This is not a problem unique to Codespaces, but it is a problem that is present in all cloud environments. Nonetheless, it is something to consider. I would still argue that that unknown beats the unknown of hotel or conference center WiFi. 

## What's Next?

I plan to continue to iterate on using Codespaces for future workshops. I think the benefits of using Codespaces, and other services like it, are really great. My next steps for future iteration on this is to reduce even further the prerequisite work required by attendees prior to the workshop, I would like to see that ideally go down to zero. I would also like the ability to provide attendees with credit vouchers on GitHub, if it is feasible, to give them more time and storage to work with, to avoid some of those issues when participating in a workshop with a large codebase.

Are you using Codespaces for workshops? I would love to hear about your experiences! Feel free to reach out to me to share your experiences, or if you have any questions about this post. You can find me at [hummusonrails.com](https://www.hummusonrails.com).

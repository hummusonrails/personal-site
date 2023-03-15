---
layout: post 
tags: ['posts']
title: "Accelerating Substrate Blockchain Testing with GitHub Codespaces"
date: 2023-03-15
teaser: Accelerate your Substrate blockchain development with GitHub Codespaces, a cloud-based development environment that lets you create and test your code in the cloud
image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zlfdb0dpk1lni6s4erwz.png
---

Building a blockchain is not always for the faint of heart. It can require extensive knowledge in an array of subjects. Thankfully, there are tools like [Substrate](https://substrate.io/), a Rust-based SDK for blockchains, that can help you in the process. Yet, even with Substrate, you may want to further accelerate the development testing of your blockchain. [GitHub Codespaces](https://github.com/features/codespaces) provides an environment that lets you do that and a whole lot more.

Codespaces is a cloud-based development environment that allows developers to create and test their code in the cloud. Whether you are at home on your favorite work laptop or traveling and need to check something far from your development setup, you can standardize your dev setup with Codespaces and access it from anywhere. You can also share the container setup for Codespaces with anyone else working on the project, thereby saving lots of time used in recreating environments necessary to even build and run the code.

*What does this all mean for your Substrate blockchain development?*

**It means that you can, with a few clicks, create a shareable developer environment accessible from anywhere to experiment with your current work progress and get quick feedback from others.**

Interested in giving it a try? Let's walk through how to set it up and get you started! For this example, we'll be setting up a Codespaces environment for the [substrate-contracts-node template](https://github.com/paritytech/substrate-contracts-node).

First, navigate to the GitHub repository of the [substrate-contracts-node](https://github.com/paritytech/substrate-contracts-node) and make a fork of the node under your own GitHub username by clicking on the Fork button on the upper-left corner of the page.

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1678880491457/680e3966-90aa-4fda-b595-9617cb719cff.png align="center")

Now, pull down your own forked copy of the node template on your machine. You are going to create a single new file called `postCreateCommand.sh` in a `.devcontainer` top-level folder. This file will have all the instructions necessary for setting up the Codespace environment for Substrate.

Open the local copy of the forked code in your preferred code editor and make a new directory called `.devcontainer` at the top-level, and add a single file called `postCreateCommand.sh` in that directory. Copy the following code and paste it into your new file:

```powershell
#!/bin/sh

echo "Installing Rust and Wasm toolchain..."
curl https://sh.rustup.rs -sSf | sh -s -- -y
rustup default stable
rustup update
rustup update nightly
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

As you can see from the code above, this new shell script does several things:

* Installs Rust and Wasm
    
* Installs the [Protocol buffer library](https://github.com/protocolbuffers/protobuf), needed for the compilation of Substrate
    
* Builds the Substrate node template using `cargo`
    
* Installs the `cargo-contract` CLI tool also using `cargo`
    

Go ahead and save and close the file. Once the file is saved, you need to make it executable, so it can be run from within the Codespace environment, and push it up to your forked copy of the node template on GitHub.

To make the file executable and add it to what will be committed up to GitHub run the following command from your terminal:

```powershell
git add postCreateCommand.sh --chmod=+x
```

Then, create a commit message by running `git commit -m "YOUR MESSAGE"` and then `git push` to send it up to the repository on GitHub.

You are now ready to see your new Codespace all set up for Substrate hacking!

Navigate in your browser to your copy of the Node template that you just pushed up to, and click on the `< > Code` green button, then click on the `Codespaces` tab.

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1678881174323/a9f3989a-101e-47b9-ba6d-2e4817186eac.png align="center")

Finally, click on the `+` button to create a new Codespace. If you find you want an environment with more processing power, you can click on the `...` instead, and customize the virtual machine's memory and CPU.

GitHub will spin up a full developer environment in your Codespace following the instructions you specified in the shell script. You will have a compiled `substrate-contracts-node` and the `cargo-contract` CLI ready to use. To make sure it works, you can try running `cargo contract --help` from inside the terminal in the Codespace and you should see helpful output from the CLI.

You're now ready to start testing your work on your Substrate blockchain on the virtual machine provided by Codespaces! Want to get a friend started hacking on your code also? All you need to do is share your `postCreateCommand.sh` file with them, and they have everything they need to boot up their own Codespace and get going, too.

In conclusion, using GitHub Codespaces to test your Substrate code can greatly simplify the development and testing of your custom blockchains. The cloud-based environment allows you to access your work from anywhere, collaborate easily, and standardize your development setup. With just a few clicks, you can create a shareable developer environment for testing your Substrate blockchain and getting quick feedback from others. By leveraging these powerful tools, you can speed up your development workflow and bring your custom blockchain projects to life more quickly and efficiently.
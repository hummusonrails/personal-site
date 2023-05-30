---
layout: post 
tags: ['posts']
title: "Decoding Polkadot"
date: 2023-05-30
teaser: "Breaking down the core concepts of Polkadot for developers"
image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kcn4uyjw5utqa87wp1di.png
---

## Decoding Polkadot

![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kcn4uyjw5utqa87wp1di.png)

### Ben Greenberg
#### May 30, 2023

In [the first post](https://parity.link/2O6tS) of this three-part series, we broke down some of the major features of blockchain that could be useful for developers building applications. We discussed how blockchains in general can boost trust and security, increase transparency and ways in which we can ensure compatibility across all device types. In this blog post, we are going to dive into some of the design decisions of Polkadot, and what makes it a compelling place to build.

The core offering of Polkadot for developers is blockspace. You may be wondering what exactly blockspace is? It is the "raw material created from decentralized trust," [according to Robert Habermeier](https://parity.link/l8bcq), the co-founder of Polkadot. In other words, it is what blockchains provide as its fundamental product. It is the space to build applications, store data and execute transactions. If that's the case, let's take a look at Polkadot's blockspace and try to understand more of the decisions behind how it was designed and how that impacts you as you begin to build and develop on its blockspace.

We are going to discuss three specific areas:

* Heterogeneous Sharding
* Cross-Consensus Messaging
* Shared Security

### Heterogeneous Sharding

Sharding is a term that is used to describe breaking a database into smaller pieces. When you break up a database into smaller bits then the database can become more efficient, particularly as it grows in size. The reason for this is that it allows you to run queries in parallel, which gives you the ability to run many queries on the database at the same time. This has been a useful feature in data management for a very long time, and it is also just as useful in blockchains. 

Polkadot uses sharding to accomplish similar throughput and speed efficiency, but it does it through heterogeneous shards. Imagine if you had a PostgreSQL database and you sharded it to allow for more parallelization, but instead of creating exactly identical duplicative shards of the database, you created shards that were optimized for specific types of data. You could have a shard that was perfect for storing images, another for text, and yet another for video. This is precisely what Polkadot was designed to do. Each shard is its own application-specific blockchain that connects to the Polkadot relay chain. These shards are called parachains. You can discover all the current parachains by visiting [parachains.info](https://parity.link/YObvS).

It seems obvious why Polkadot architected its blockspace to be a sharded network. It creates the ability for parallelization of queries, thereby increasing the overall speed and efficiency of the network. But, why make it a heterogeneously sharded network? The heterogeneity, if anything, only increases the complexity of the architecture. The reason why the builders of Polkadot bet big on heterogenity is because at the center of all of Polkadot is a big bet on a multi-chain future.

This is to say that instead of seeing a future realization of Web3 where all blockchain networks are consolidated into a single network, Polkadot envisions a Web3 future where there are many sovereign blockchains working on their specific use cases and that share the ability to communicate with one another. This is why Polkadot was created from the start as a heterogenous sharded network, and it is also why cross-consensus messaging is a core feature of the network.

Practically speaking, a homogenous sharded network can only handle shards that are identical to one another. An example of this would be the proposed [Danksharding concept](https://notes.ethereum.org/@vbuterin/proto_danksharding_faq#What-is-Danksharding) in the Ethereum roadmap. In the Danksharding concept, the shards are focused primarily on data storage, essentially acting as data availability layers. This design is fundamentally different from Polkadot's heterogeneous sharding, where each shard is a fully functional and potentially unique blockchain. Ethereum's design aims to provide scalability by increasing the availability of data for layer-2 protocols - secondary frameworks built on top of the existing Ethereum blockchain. These layer-2 protocols can handle a higher volume of transactions off the main chain, independently interpret and process the data, and then record the outcomes back to the main chain, thereby offloading computational load from the Ethereum blockchain itself. This model keeps the shards simple and uniform, reducing complexity and the potential for errors.

However, the homogeneity of the shards limits their functionality. Each shard in Ethereum's design is similar to one another and handles blobs of data that the Ethereum protocol itself does not interpret. This is in stark contrast to Polkadot's heterogeneous shards, where each shard (or parachain) can be specialized to handle unique tasks or serve particular use cases. This heterogeneity allows for a multitude of diverse blockchains, each with its own features and capabilities, to exist and interoperate within the Polkadot ecosystem.

In other words, the trade-off for the increased complexity in a heterogeneous sharded network like Polkadot is the ability to handle a more diverse range of applications, enabling a more vibrant and diverse multi-chain ecosystem. Conversely, a homogeneous sharded network like Ethereum's proposed Danksharding, while simpler and potentially more efficient in terms of raw data throughput, is geared towards handling a more uniform type of load, primarily to support scalable layer-2 solutions. Both of these designs reflect different philosophies and visions for the future of Web3 and blockchain technology.

### Cross-Consensus Messaging

In a context of a multi-chain network where each chain is an independent sovereign blockchain optimized for its own use case, it can become very hard to share data and assets between those chains. This is where cross-consensus messaging comes in. When we talk about cross-consensus messaging in Polkadot, we typically talk about two related but distinct concepts:

* [XCMP - Cross-Consensus Message Passing](https://parity.link/aLALy)
* [XCM - Cross-Consensus Message Format](https://parity.link/QeoNb)

It is important to not confuse the two. The first, XCMP, is the transport protocol that allows for cross-consensus communication. The latter, XCM, is the formatting of those messages. XCMP can be seen as another communications layer, similar to HTTP or similar protocols in their own context. XCM is the format of the messages that are passed through XCMP.

FRAME, the Substrate runtime module library *(we'll discuss FRAME and Substrate in the final post in this three-part series)* [has a pallet (the name for modules in FRAME) to help make working with XCM easier called `pallet-xcm`](https://parity.link/NjrtN) that provides pre-defined commonly used extrinsics to build XCM messages. When building cross-consensus asset transfers or cross-consensus calls, you can use `pallet-xcm` to make it easier to build those messages.

For example, this is what it might look like to deposit an asset into a parachain using `pallet-xcm`:

```rust
DepositAsset { 
  assets: Wild(All), 
  max_assets: 1, 
  beneficiary: X1(AccountId32 { 
    network: NetworkId::Any, 
    id: ALICE.into() 
  }).into() 
}
```

If all of that did not entirely make sense to you, that's ok! You can dig deep into the format specs [on GitHub](https://parity.link/7IRhY), read Dr. Gavin Wood's detailed and thorough [paper on the format](https://parity.link/We15Q) and also read through [the code for the pallet](https://parity.link/2ICpZ) along with the code comments to get a fuller understanding. The important thing to understand for right now is that XCM is the format of the messages that are passed through XCMP, and that XCMP is the transport protocol that allows for cross-consensus communication.

We have seen that heterogeneous sharding and cross-consensus messaging lays at the heart of the value proposition of Polkadot, but we are missing another critical component of that value proposition: shared security.

### Shared Security

Building anything is hard. It's hard to get the fundamentals of your project right. It does not matter if we're talking about the schema for your database, the frontend framework you choose, the authentication layer you incorporate, or anything else. This is especially true when we talk about security. Your code, your architecture, your design and your implementation all have to be secure. There are lots of tools and IDE extensions you can use to help you write secure code. But, just one security breach, and you could dramatically erode user trust, and when you are just starting out, an erosion of user confidence could be fatal to your project.

What does [shared security](https://parity.link/zz1SV) mean on Polkadot?

It means that when you build your own heterogeneous shard on Polkadot-- your own parachain -- it inherits the full security of the Polkadot relay chain. This also enables secure message passing between parachains. This is not the same thing as other protocols that rely on a bridge architecture to connect to other chains. In those architectures, the security of the bridge is only as strong as the security of the weakest chain. In Polkadot, the security of the parachain is as strong as the security of the Polkadot relay chain. This is because the parachain is not a bridge, it is a shard. It is a shard that is connected to the Polkadot relay chain, and it inherits the full security of the relay chain.

Shawn Tabrizi offered a fantastic overview of the shared security model recently at ETHDenver, and you can watch the recording of it [on YouTube](https://parity.link/FO73l). I highly recommend taking the 20 minutes and watching the presentation.

The shared security model of Polkadot rests on three "building blocks" as Shawn calls them:

* Wasm (WebAssembly)
* Parachains Protocol
* Relay Chain

WebAssembly is a binary instruction format that is designed to be secure, fast and highly portable. It can take code written in many languages and compile it into a binary format that can be run in the browser, on a server, a mobile device, an IoT device, and more. In Polkadot, the state transition function for each chain is compiled into a [Wasm blob](https://parity.link/4lEfj) that then lives on the chain itself. This introduces transparency into the state transition function, and it also allows for the state transition function to be upgraded without having to hard fork the chain. 

The [parachains protocol](https://parity.link/ud3l3) is the process for a block to go from being authored to included in the ledger of the chain. This is the way that the Polkadot network efficiently is sharded amongst parachains. It includes roles such as validators who validate the proposed blocks by checking the proof of validity of the blocks, and collators who create the proof of validity that the validators check. 

![Representation of a parachain with collators and validators](https://wiki.polkadot.network/assets/images/parachain-protocol-summary-1e262cdee5cfa5b1f576962f12b0b8a5.png)

There's a lot more to be said about the parachain protocol and I encourage you to read the [Polkadot Wiki](https://parity.link/ud3l3) on the subject to go deeper. The Wiki has explanations for each aspect along with helpful illustrations like the one I shared above.

The last building block in the shared security model is the [relay chain](https://parity.link/0pLux). The relay chain is the center of the Polkadot network. It is the chain that all the parachains, the heterogeneous shards, connect to. The types of transactions that can be done on the relay chain are limited, mainly to governance, parachain auctions and staking. In Polkadot, applications exist on the parachains, not on the relay chain. The relay chain is the central chain that provides security to the application layer. 

![Representation of the Polkadot network with the relay chain at the center](https://wiki.polkadot.network/assets/images/polkadot_relay_chain-c411a282aa36af0f20d04389919a6275.png)

Together, these three aspects of Wasm, the parachains protocol and the relay chain form the shared security model of Polkadot. In short, it provides you with the confidence to start building something new, introduce it to the world, and begin iterating on it with a community of users and developers. 

Thus far, we have introduced core concepts of Web3, blockchain, and Polkadot specifically in this three-part blog series. We have gone over some of the design decisions of Polkadot that make it a unique blockspace to build in. We have discussed the reasons why you may choose to incorporate Web3 into your design decisions for your own applications, and the benefits it may provide to your development work and to your users. In the last post in this series, we are going to take the ideas we have covered and apply them to a real-world example. We will walk through what it takes to build your first application on Polkadot together.

Until then, keep on learning and exploring!
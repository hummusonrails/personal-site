---
layout: post 
tags: ['posts']
title: "Develop Your First Decentralized App: A Beginner's Walkthrough"
date: 2023-06-21
teaser: "Explore building decentralized apps using Polkadot's FRAME and Substrate"
image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/fkak0t5vgskzej977rd7.png
---

## Develop Your First Decentralized App: A Beginner's Walkthrough

![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/fkak0t5vgskzej977rd7.png)

### Ben Greenberg
#### June 21, 2023

In the first two articles of this three-part series, you learned [the basics of blockchain](https://www.bengreenberg.dev/posts/2023-05-16-importance-of-blockchain-for-new-devs/) and [delved into the architecture of Polkadot](https://www.bengreenberg.dev/posts/2023-05-31-decoding-polkadot/). Now, it's time to start building! By following the steps in this blog post, you will create your first decentralized application, or DApp, ready for Polkadot!

What will you be building?

You will construct the foundation of an on-chain message board. Why would someone want to place a message board on a blockchain? There could be numerous reasons for this choice. A blockchain message board provides unchangeable records of conversations, useful in journalism, law, and situations needing non-repudiable evidence. It offers censorship resistance, critical in spaces where free speech is threatened or trust is decentralized. Moreover, it promotes transparency, allowing participants to independently verify information without a central authority.

In this article, you will learn how to create a custom Rust module using [FRAME](https://docs.substrate.io/reference/frame-pallets/), the framework used to create blockchains in the Polkadot and [Substrate](https://substrate.io/) ecosystem. In this custom module or "pallet", you will define the functionality to post a new message on the board. Once you have completed the steps in this article, you will be equipped to continue building the rest of the message board's functionality on your own.

*tl;dr You can find the full working code for this pallet on [GitHub](https://github.com/hummusonrails/substrate-message-board-node-template).*

Let's get started!

## Understanding the Structure of a Pallet

First, take a look at the skeleton code for our new message board pallet. We'll walk through each part of this code, so we can have a better idea of what we need to build:

```rust
#![cfg_attr(not(feature = "std"), no_std)]

pub use self::pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::pallet_prelude::*;
    use frame_system::pallet_prelude::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;
    }

    #[pallet::pallet]
    #[pallet::generate_store(pub(super) trait Store)]
    pub struct Pallet<T>(_);

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {}

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        // Dispatchable functions go here
    }

    #[pallet::event]
    #[pallet::metadata(T::AccountId = "AccountId")]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        // Events go here
    }

    #[pallet::error]
    pub enum Error<T> {
        // Errors go here
    }
}
```

Before we start developing the functionality for our simple message board, it is essential to understand the purpose of each component within this skeleton code for a pallet. Here's an explanation for each part:

1. `#![cfg_attr(not(feature = "std"), no_std)]` - This line is telling the Rust compiler to use the standard library (`std`) only when it's available. In Polkadot, we typically compile to a no\_std environment, meaning the standard library is not available, because blockchain runtimes require a deterministic environment, where the execution of the code always produces the same output given the same input. The full standard library contains non-deterministic features and system dependencies, which could cause consensus issues between different nodes in the network.
    
2. `pub use self::pallet::*;` - This line makes all items under the module pallet available under the `message_board` namespace.
    
3. `#[frame_support::pallet]` - This is an attribute that's applied to the pallet module, enabling FRAME's macro system which provides the pallet with the ability to include important runtime development functionalities.
    
4. `pub mod pallet {...}` - This line begins the definition of the pallet module, which will contain the actual logic for your functionality.
    
5. `pub trait Config: frame_system::Config {...}` - This is the configuration trait for your pallet. It inherits from `frame_system::Config`, and you can add additional configuration options as associated types.
    
6. `pub struct Pallet(_);` - This is the main struct for your pallet. It holds the implementation of your pallet's runtime logic.
    
7. `impl<T: Config> Hooks<BlockNumberFor> for Pallet {}` - This section is for defining runtime lifecycle hooks, where you can insert custom logic to be performed at different stages of the block execution process.
    
8. `impl<T: Config> Pallet {...}` - This is where you define the dispatchable calls for your pallet. Dispatchable calls represent the public API of your pallet, and they are the primary way that users and other pallets interact with your pallet.
    
9. `pub enum Event<T: Config> {...}` - This section defines the events that your pallet can emit. Events are a way for your pallet to signal that something important has happened, and they are typically used for reporting state changes to external entities.
    
10. `pub enum Error {...}` - This is where you define the errors that your dispatchable functions can return. Errors are used for reporting problems to the user or the caller of a dispatchable function.
    

For our purposes, we will primarily work with the `Pallet` struct, the `impl` for the Pallet, the `Event` enum, and the `Error` enum. Within the `Pallet` struct, we will add our methods (the dispatchable calls) for our message board. In the `impl` for the Pallet, we will include a function that allows users to post messages. Within the `Event` enum, we will create an event to emit when a new message is posted. Lastly, we will develop a custom error and incorporate it into the `Error` enum.

## Defining the Dispatchable Call

As you recall from above, the `impl` for the Pallet is where we define essentially the public API for our message board. Within it, we create a function, a dispatchable call, that allows users to post new messages to the message board. Take a moment to look at the code below and try to understand what's happening on your own before moving on. We'll explain each part of it below.

```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    #[pallet::weight(10_000 + T::DbWeight::get().writes(1).ref_time())]       
    #[pallet::call_index(0)]
    pub fn post_message(origin: OriginFor<T>, message: Vec<u8>) -> DispatchResult {
        let sender = ensure_signed(origin)?;

        let bounded_message: BoundedVec<u8, T::MaxMessageLength> = message.try_into().map_err(|_| Error::<T>::MessageTooLong)?;

        Messages::<T>::try_mutate(|messages| {
            messages.try_push((sender.clone(), bounded_message.clone()))
                .map_err(|_| Error::<T>::MessageBoardFull)
        })?;

        Self::deposit_event(Event::MessagePosted { account: sender, message: bounded_message } );

        Ok(().into())
    }
}
```

Now that you spent a moment reading the code, let's take a look at it together.

First, within the body of the function, we ensure that the message creator is a valid signed account and we extract the `AccountId` from the sender and assign it to the `sender` variable. You may also notice the `?` at the end of the `ensure_signed(origin)?;` statement. This is called the question mark operator in Rust and is used for error propagation. If the `ensure_signed(origin)` function call results in an `Err`, the `?` operator immediately returns this `Err` value from the current function (in this case, `post_message`). You will notice this operator quite a lot in FRAME pallets, because it provides a convenient way to handle errors and propagate them up the call stack, ensuring that errors are dealt with effectively and that the code remains concise and readable.

Then, we create a `BoundedVec` of bytes representing the message. A `BoundedVec` is a vector of bytes with a maximum length defined by the runtime configuration. If the message exceeds the maximum length, it returns an error. We will define the `MaxMessageLength` in the configuration section of our pallet later.            

The next thing we do is add a new message to the message board. We modify the `Messages` storage by appending a new message to the vector of messages. The `mutate` function as seen in the example above is used to change the state of the storage, in this case, adding a tuple consisting of the sender's `AccountId` and their message to the existing list of messages.

The next line of code is depositing, or logging, an event to indicate that a message has been posted. `Self::deposit_event` is a method provided by the FRAME system to emit events from the pallet. The event in this case, `Event::MessagePosted { account: sender, message: bounded_message }`, is an instance of the `MessagePosted` variant that we will define in our `Event` enum later, carrying the `sender`'s account ID and the posted `bounded_message` as its data.

The final line, `Ok(().into())`, signifies a successful completion of the function.

The `Ok(())` part indicates that the function was completed without any errors, as `Ok` is the variant of the `Result` enum used to denote success. The `.into()` call is then used to convert the `Ok(())` value into a `DispatchResult`. The `into` method is a way to convert between types in Rust, and in this context, it is used to construct a `DispatchResult`.

One other thing you may notice at the top of this function are the `#[pallet::weight(...)]` and `#[pallet::call_index(...)]` attributes. These are used to define the weight of the function and the index of the function, respectively. We are not going to discuss these in great detail, but in short, they are used to determine the cost of the function and the index of the function in the runtime. The `call_index` can be any number, but it must be unique for each dispatchable function in your pallet. The `weight` is a bit more complex, but in this case, we are saying that the function has a base weight of 10,000, plus the weight of one write to storage, plus the weight of the time it takes to execute the function. 

## Creating the Messages Storage

It's time for a quick detour before we continue into the `Event` and `Error` enums. We need to create the storage item for our messages. We have not done so yet!

Within FRAME, it's relatively straightforward. You need to know how you want to store your data, and what type of access you need for it. In our case, we're using a `StorageValue` with a `BoundedVec<(T::AccountId, BoundedVec<u8, T::MaxMessageLength>)>` as its type. This represents a single value (our messages) that stores a list of tuples. Each tuple contains an `AccountId` (the user who posted the message) and a `BoundedVec<u8>` (the message itself). This setup allows us to easily append new messages to the end of the list, providing a simple and efficient way to manage our on-chain message board.

```rust
#[pallet::storage]
pub type Messages<T: Config> = StorageValue<_, BoundedVec<(T::AccountId, BoundedVec<u8, T::MaxMessageLength>), T::MaxMessages>, ValueQuery>;
```

You may be wondering what exactly a `StorageValue` is? The [FRAME Rust docs](https://paritytech.github.io/substrate/master/frame_support/pallet_prelude/struct.StorageValue.html) explain in a bit more detail, but essentially it is a type provided by FRAME that allows us to store a single value in the blockchain's storage. This value is accessible from anywhere in your pallet. In the context of our message board, as we mentioned above, we're using a `StorageValue` to store a `BoundedVec<(T::AccountId, BoundedVec<u8>)>`, which represents a list of messages posted by users.

Now that we have created our storage item for the message board, we can continue by building the `Event` and `Error` enums.

## Emitting an Event

Events in the context of a blockchain serve to notify the network of significant occurrences or changes in state. They are crucial to transparency and traceability as they provide an auditable trail of all the activities that take place. In our message board pallet, every time a message is posted, an event is emitted, signalling this action to the entire network.

For this post, we are going to create a single event to indicate a new message has been posted:

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    Event::MessagePosted { account: sender, message: bounded_message },
}
```

Let's break that code down line by line.

1. `#[pallet::event]`: This is an attribute macro provided by FRAME that signifies that the following enum (`Event`) will be used to define events that can be emitted by the pallet.
    
2. `#[pallet::generate_deposit(pub(super) fn deposit_event)]`: This attribute macro generates a helper function, `deposit_event`, which can be used to emit the events defined in the `Event` enum. The visibility of this function is defined as `pub(super)`, meaning it's publicly accessible to the parent module of this pallet.
    
3. `pub enum Event<T: Config>`: This is the declaration of the `Event` enum itself. `Event` is defined as a public enum, and it's generic over the `Config` trait, meaning it can use types defined in `Config` (in this case `T::AccountId`).
    
4. `Event::MessagePosted { account: sender, message: bounded_message }`: This is the definition of a variant of the `Event` enum. `MessagePosted` represents the event that a new message has been posted. The event carries the `AccountId` of the sender and the message (a bounded byte vector) as its data.
    

## Enumerating Custom Errors

Lastly, let's create a couple custom errors for our message board DApp. These custom errors will signify to the user when they have submitted a message that is too long or if the message board is full. We'll start with these error type to emphasize another key factor in designing blockchain applications, which is size matters. In blockchain systems, data storage and transmission come at a cost, so it's crucial to control the size of the data we're dealing with. For our DApp, we'll set a limit on the length of the messages and how many messages it can hold. Attempting to post a message that exceeds either of these limits will trigger a custom error. This not only helps in maintaining the efficiency of our application but also gives a clear signal to the users about the constraints they need to work within.

It is important to note that if we were building this DApp for a production use, we would most likely not store the actual message data on chain. Rather, we would store a hash of the message data on chain, and then store the actual message data off chain. This would allow us to maintain the integrity of the message data while also keeping the size of the data stored on chain to a minimum. However, for the sake of simplicity, we are going to store the actual message data on chain in this blog post.

In a FRAME pallet, custom errors go inside the `Error` enum as follows:

```rust
#[pallet::error]
pub enum Error<T> {
    MessageTooLong,
    MessageBoardFull,
}
```

Then, we can use it inside the dispatchable call, for example, like this:

```rust
let bounded_message: BoundedVec<u8, T::MaxMessageLength> = message.try_into().map_err(|_| Error::<T>::MessageTooLong)?;
```

In the above code snippet, we are attempting to convert the `message` into a `BoundedVec<u8, T::MaxMessageLength>`. If the conversion fails, we return the `MessageTooLong` error. If the conversion succeeds, we continue on with the dispatchable call.

Now that we have incorporated our new error, we have a fully working new FRAME pallet!

Do you want to see how to add this new pallet to a Substrate runtime? Check out the [full working code on GitHub](https://github.com/hummusonrails/substrate-message-board-node-template).

## What's Next?

Now that we have walked through the steps in creating a new FRAME pallet, and you've explored the full working code on GitHub, it's time to add more functionality!

Right now, our message board only allows users to post new messages to the board. What is missing? What about replying to a message? Modifying a message? Deleting a message? How would you go about adding those features?

Your challenge, if you choose to accept it, is to [fork the repository with the working code](https://github.com/hummusonrails/substrate-message-board-node-template), and add a feature! It doesn't need to be perfect, we can build it together.

I look forward to seeing what you build!

The other step in making this a fully functioning DApp is to be able to interact with it. In the next post, we'll explore how to use [Polkadot JS](https://polkadot.js.org/) to navigate through our Substrate blockchain with the message board pallet and interact with it by creating a new message.
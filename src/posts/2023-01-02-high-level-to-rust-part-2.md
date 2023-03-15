---
layout: post 
tags: ['posts']
title: "From High-Level to Systems Programming: A Practical Guide to Rust, Part 2"
date: 2023-01-02
teaser: In this series, we will be looking at Rust, a language that has been ranked as the most loved language seven years in a row by the Stack Overflow annual survey. 
image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1sz90e9gxnd3wdgsgi1n.png
---

## From High-Level to Systems Programming: A Practical Guide to Rust, Part 2

![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1sz90e9gxnd3wdgsgi1n.png)

### Ben Greenberg
#### January 2, 2023

## Introduction

Welcome to the second post in my "From High-Level to Systems Programming: A Practical Guide to Rust" series! In the first post, I introduced the basics of Rust and covered topics such as its syntax, type system, error handling, and working with external libraries.

In this post, we will focus on Rust's capabilities for systems programming. Rust is known for its emphasis on safety and efficiency, and it is particularly well-suited for systems programming tasks such as building operating systems, web servers, and low-level applications. We will discuss the reasons why Rust is a good choice for systems programming and provide examples of how it can be used in these contexts.

We will also look at how Rust allows developers to have low-level control over their code, such as through its support for inline assembly and its ability to interoperate with C code. We will discuss the trade-offs and considerations involved in using these low-level features.

Finally, we will introduce Rust's support for concurrent programming and provide examples of how to write concurrent code in Rust.

By the end of this post, you should have a good beginning understanding of Rust's capabilities for systems programming and how to use Rust to build efficient reliable systems-level applications.

## Rust for Systems Programming

Rust is particularly well-suited for systems programming tasks due to its focus on safety and efficiency. Rust has a number of features that make it well-suited for systems programming, including:

* **Memory safety**: Rust's ownership and borrowing system helps to prevent common memory errors such as null or dangling pointer references. This is particularly important for systems programming tasks, where such errors can have serious consequences. In Rust, every value has a single owner, and when the owner goes out of scope, the value is automatically deallocated. This helps to prevent memory leaks and other errors.
* **Concurrent programming capabilities**: Rust has strong support for concurrent programming, including a threading model and synchronization primitives such as mutexes and atomic variables. This makes it well-suited for building systems that need to handle multiple tasks concurrently. Rust's threading model is based on the concept of ownership and borrowing, which helps to prevent data races and other concurrent programming errors.
* **Efficient code**: Rust is designed to produce efficient code, with a focus on minimizing the overhead of runtime checks and garbage collection. This makes it well-suited for building systems that need to be fast and performant.

Here are a few examples of how Rust can be used for systems programming tasks:

* **Building operating systems**: Rust has been used to build some operating systems, including [Redox](https://www.redox-os.org/) and [Fuchsia](https://fuchsia.dev/). Its memory safety and concurrent programming capabilities make it well-suited for this type of task. For example, the Redox OS uses Rust's ownership and borrowing system to prevent memory errors and its threading model to support concurrency. 
* **Building web servers**: Rust has some libraries and frameworks for building web servers, such as [Rocket](https://rocket.rs/) and [Actix](https://actix.rs/). Its efficiency and concurrent programming capabilities make it a great choice for handling high levels of traffic and requests. For example, Rocket uses Rust's macro system to provide a clean and expressive API for building web applications.
* **Building low-level applications**: Rust's low-level control and efficient code make it well-suited for building applications that need to interact directly with hardware or perform other low-level tasks. For example, Rust can be used to build device drivers or other applications that need to interface with hardware directly. It also has support for inline assembly and the ability to interoperate with C code, which gives developers the flexibility to use low-level features when needed.

In the next section, we will explore how Rust allows developers to have low-level control over their code.

## Low-Level Control in Rust

Rust allows developers to have low-level control over their code through a number of features. These features can be useful when building systems-level applications that need to interact directly with hardware or perform other low-level tasks.

### Inline assembly 

Rust allows developers to use inline assembly in their code using the `asm!` macro. This allows developers to write assembly code directly in their Rust code, which can be useful for tasks that require precise control over the hardware:

```rust
let result: u32;
unsafe {
    asm!("mov eax, 1; mov ebx, 2; add eax, ebx" : "={eax}"(result) ::: "intel");
}
assert_eq!(result, 3);
```

In the above example, we use the `asm!` macro to execute some inline assembly code that adds two numbers and stores the result in a variable. 

An even more practical example of using inline assembly could be reading the exact time stamp counter (TSC) on the machine itself. The time stamp counter is a hardware counter that goes forward at a constant rate and can be used as a high-resolution timer. By using inline assembly we can directly access this hardware time from our code in Rust!

```rust
let result: u32;
unsafe {
    asm!("rdtsc" : "={eax}"(result) ::: "intel");
}
println!("The current time stamp counter is: {}", result);
```

### Interoperability with C

Rust also has strong support for interoperating with C code. This allows developers to use existing C libraries in their Rust code, or to write Rust code that can be called from C:

```rust
extern "C" {
    fn add(a: c_int, b: c_int) -> c_int;
}

fn main() {
    unsafe {
        let result = add(1, 2);
        assert_eq!(result, 3);
    }
}
```

In this example, we use the `extern` keyword to declare a C function called `add`, and we call it from our Rust code using the `unsafe` keyword. This allows us to use the C function in our Rust code and interact with C libraries.

The ability to interoperate with C libraries opens up a world of potential. For example, the [Amethyst game engine](https://amethyst.rs/) is a popular game engine built with Rust that uses C libraries such as [OpenGL](http://www.opengl-tutorial.org/beginners-tutorials/) to accomplish all that it provides developers.

It's important to note that these low-level features come with trade-offs and considerations. Using inline assembly or interoperating with C code can make your code less portable and more difficult to maintain. It's important to carefully weigh the benefits and drawbacks of using these features before deciding to use them in your code. However, having the ability to easily incorporate assembly or C code into your Rust applications provides a limitless expansive potential for the kinds of applications and systems you can build.

In the next section, we will introduce Rust's support for concurrent programming and provide examples of how to write concurrent code in Rust.

## Concurrency in Rust

Rust has strong support for concurrent programming, with many built-in features and libraries for writing concurrent code.

One of the key features of Rust's concurrency model is the concept of ownership and borrowing as we've mentioned throughout this post and this entire series. In Rust, every value has a single owner, and when the owner goes out of scope, the value is automatically deallocated. This helps to prevent data races and other concurrent programming errors.

Rust also has a number of [synchronization primitives](http://www.cs.columbia.edu/~hgs/os/sync.html), such as mutexes and atomic variables, which can be used to protect shared data in a concurrent environment.

A mutex (short for "mutual exclusion") is a synchronization primitive that can be used to protect shared data from concurrent access. In Rust, the `Mutex` type provides a way to lock shared data and prevent multiple threads from accessing it at the same time. Using a mutex can help to prevent data races and other concurrent programming errors, but it comes with a performance cost. Acquiring and releasing a mutex can be relatively expensive, so it's important to use them wisely and only when necessary.

Similarly, an atomic variable is a type of variable that can be accessed and modified concurrently without the need for explicit synchronization. In Rust, the `Atomic` type provides a way to use atomic variables. Atomic variables are implemented using low-level hardware features such as CPU instructions or memory barriers, and they are designed to be efficient and lock-free. They can be a useful tool for concurrent programming tasks that require high performance or low overhead.

Here is an example of how to use a mutex to protect shared data in Rust:

```rust
use std::sync::{Mutex, Arc};
use std::thread;

fn main() {
    let data = Arc::new(Mutex::new(0));

    for i in 0..10 {
        let data = data.clone();
        thread::spawn(move || {
            let mut data = data.lock().unwrap();
            *data += 1;
        });
    }

    thread::sleep(Duration::from_millis(50));

    println!("Result: {}", *data.lock().unwrap());
}
```

In this example, we use an `Arc` (atomic reference count) to share a `Mutex`-protected value between multiple threads. We create a new thread for each iteration of the loop, and we pass a clone of the `Arc` to each thread. The threads increment the shared value using the mutex to protect the shared data.

Here is another example using the `join` method to wait for multiple threads to complete:

```rust
use std::thread;

fn main() {
    let handle_one = thread::spawn(|| {
        println!("Thread 1");
    });

    let handle_two = thread::spawn(|| {
        println!("Thread 2");
    });

    let handle_three = thread::spawn(|| {
        println!("Thread 3");
    });

    handle_one.join().unwrap();
    handle_two.join().unwrap();
    handle_three.join().unwrap();
}
```

In this example, we create three threads using the `thread::spawn` function and store the resulting `JoinHandle` values in variables `handle_one`, `handle_two`, and `handle_three`. We then use the `join` method on each `JoinHandle` to wait for the corresponding thread to complete.

The `join` method blocks the current thread until the specified thread has been completed, and it returns a `Result` containing the value returned by the thread's closure. In this example, we use the `unwrap` method to ignore the `Result` and simply wait for the threads to complete.

Rust's concurrency model and synchronization primitives make it well-suited for building systems that need to handle multiple tasks concurrently. Its focus on safety and efficiency makes it a good choice for concurrent programming tasks, especially in the context of systems programming.

In the final section of this series, we will explore some of the resources and tools available for learning and using Rust for systems programming tasks.

## Resources and Tools

In this post, we have explored the basics of Rust and how it can be used for systems programming tasks. From its strong support for ownership and borrowing, to its low-level control features and concurrent programming capabilities, Rust has a lot to offer for systems programming projects.

If you're interested in learning more about Rust and how to use it for systems programming, here are some resources and tools that you might find helpful:

* The [Rust book](https://doc.rust-lang.org/stable/book/) is a great resource for learning about Rust's syntax, features, and standard library. It includes detailed explanations and examples of Rust's core concepts and features, as well as guidance on best practices for using Rust.
* The [Rust By Example](https://doc.rust-lang.org/stable/rust-by-example/) website is another helpful resource for learning Rust. It provides a series of interactive examples that demonstrate how to use various Rust features and libraries.
* The [Rust Standard Library documentation](https://doc.rust-lang.org/stable/std/) is a comprehensive reference for Rust's standard library. It includes descriptions of the types, traits, and functions available in the standard library, as well as examples of how to use them.
* The [Rust toolchain](https://www.rust-lang.org/tools/install) is a suite of tools that are used to develop Rust programs. It includes the Rust compiler (`rustc)`, the Rust package manager (`cargo`), and other utilities. The Rust toolchain is available for a variety of platforms and is easy to install and use.
* The [Rust Community](https://www.rust-lang.org/community) is a welcoming community of Rust users and developers. 

In the last post, we'll look at building a real-world example using all that we have covered in the previous two posts. Until then, keep on exploring and best of luck in your Rust journey!
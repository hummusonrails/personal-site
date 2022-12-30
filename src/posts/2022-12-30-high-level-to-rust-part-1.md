---
layout: post 
tags: ['posts']
title: "From High-Level to Systems Programming: A Practical Guide to Rust, Part 1"
date: 2022-12-30
teaser: In this series, we will be looking at Rust, a language that has been ranked as the most loved language seven years in a row by the Stack Overflow annual survey. 
image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1sz90e9gxnd3wdgsgi1n.png
---

## From High-Level to Systems Programming: A Practical Guide to Rust, Part 1

![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1sz90e9gxnd3wdgsgi1n.png)

### Ben Greenberg
#### December 30, 2022

## Introduction

Welcome to the first post in my "From High-Level to Systems programming: A Practical Guide to Rust" series! In this series, we will be looking at Rust, a language that has been ranked as [the most loved language](https://survey.stackoverflow.co/2022/) seven years in a row by the Stack Overflow annual survey.

Rust is known for its emphasis on safety, and it is particularly great for systems programming tasks such as building operating systems, web servers, and low-level applications. However, you can also use Rust to build anything you're interested in, from [games](https://blog.logrocket.com/5-rust-game-engines-consider-next-project/#5-popular-rust-game-engines) to [blockchains](https://substrate.io/). In this series, we will start by introducing the basics of Rust and move on to more advanced topics such as its capabilities for systems programming and building real-world applications.

In this first post, we will cover the basics of Rust's syntax and type system, as well as some of its unique features such as ownership and borrowing. We will also look at Rust's approach to error handling and how to work with external libraries. By the end of this post, you should have a good foundational place to start from in Rust and be ready to move on to other topics in the subsequent posts in this series.

## Rust basics

Let's dive into the basics of Rust's syntax and type system.

Rust is a statically typed language, which means that all variables must have a type declared at the time of their creation. If you're coming from other languages such as Ruby or Python this can feel very different, but eventually you get used to it! Rust's type system is designed to be safe and expressive, and it includes a wide range of primitive types such as integers, floating-point numbers, booleans, and characters, as well as more complex types such as arrays, tuples, and structs.

Rust also has a number of control flow constructs that will be familiar to those who have experience in other languages, whether typed or not. These include `if/else` statements for conditional execution, `loop` and `while` loops for repetitive execution, and `match` expressions for pattern matching. The last language I learned before Rust was Elixir, which is well known for its pattern matching, and I really appreciate how frequently and deeply the technique is applied here in Rust as well.

One of the unique features of Rust is its approach to memory management, which is based on a concept called ownership. In Rust, every value has a single owner, and when the owner goes out of scope, the value is automatically deallocated. This helps to prevent common memory errors such as null or dangling pointer references. Yet, do be mistaken. Rust's unique take on ownership is very challenging to get down practically, and do not be discouraged if it takes you a while to fully grasp it in your own code.

In addition to ownership, Rust also has a borrowing system that allows multiple references to a value as long as they are all borrowed in a way that follows the borrowing rules. This allows for more flexible memory management and can help to prevent data races in concurrent code. This, too, as related to ownership, can be very hard to understand. Give yourself some time to study it. At the end of this post, I provide some more resources to further your exploration of the basics of Rust that will cover a lot more in depth both ownership and borrowing.

Let's take a look at a straightforward code example to show how ownership and borrowing work in Rust:

```rust
fn main() {
    let s = String::from("hello");  
    // s is a String type and has ownership of the value inside of it

    // We can give s to a function as a param, and this transfers ownership to that function
    let t = take_ownership(s);  
    // s is no longer valid and cannot be used anymore

    // However, we can also borrow s instead of transferring
    let u = borrow_only(&s); 
     // u is a reference to s using the special keyword &, but s remains valid and can still be used

    // We can also move ownership back by returning the value from the function
    let v = give_it_back(t);  
    // t is invalid and cannot be used, but v is a valid value
}

fn take_ownership(s: String) -> String {
    println!("s: {}", s);
    s  
    // s is returned and ownership is transferred back to the caller
}

fn borrow_only(s: &String) -> &String {
    println!("s: {}", s);
    s  
    // a reference to s is returned, but ownership is not transferred
}

fn give_it_back(s: String) -> String {
    println!("s: {}", s);
    s  
    // s is returned and ownership is transferred back to the caller
}
```

The example above uses small functions to try to concisely demonstrate how ownership and borrowing work. As we see, a variable can quickly become invalid if it loses ownership, and the special keyword `&` allows us to create a `Reference` to the value and borrow it, instead of directly claiming ownership of it. While this system takes a while to get used to, it greatly reduces the chance of errors for dangling references and other problems.

Now that we have covered some of the basics of Rust's syntax and type system, let's take a look at how Rust handles errors.

## Error handling in Rust

One of the ways in which Rust prioritizes safety is through its approach to error handling. In Rust, errors are represented as values, and the `Result` type is used to indicate the success or failure of a process.

The `Result` type is an `enum` (a type that can have a fixed set of values) that has two variants: `Ok` and `Err`. `Ok` represents success and contains a value, while `Err` represents failure and contains an error value. Knowing that a `Result` has either two possibilities -- success or failure -- lets you build both paths out in your code and handle both possible outcomes.

To handle errors in Rust, you can use the `?` operator, which is similar to the `try` keyword in other languages. The `?` operator allows you to propagate errors up the call stack without having to manually check the return value of each function. You can also write out in longhand the same process without using the `?` keyword, but using it saves you a lot of extra time typing on your keyboard!

Here is an example of how to use the `Result` type and the `?` operator in Rust:

```rust
fn divide(numerator: i32, denominator: i32) -> Result<i32, &'static str> {
    if denominator == 0 {
        return Err("Division by zero");
    }
    Ok(numerator / denominator)
}

fn main() {
    let result = divide(10, 2)?;
    println!("The result is {}", result);
}
```

In this example, the `divide` function returns a `Result` with an integer value if the division is successful, or a string error message if the denominator is zero. The main function uses the `?` keyword to handle the `Result` value and either print the result or the error message.

By using the `Result` type and the `?` operator, Rust encourages you to explicitly handle errors and provides a clear and concise way to do so.

The same thing could be done using a `match` statement instead, but why type more when you can type less?

```rust
// ... divide function from previous example here

fn main() {
    let result = divide(10, 2);
    match result {
        Ok(value) => println!("The result is {}", value),
        Err(error) => println!("An error occurred: {}", error),
    }
}
```

In the next section, we will look at how to use external libraries in Rust.

## Working with external libraries

In Rust, external libraries are managed using the [Cargo](https://crates.io/) package manager and the packages managed in Cargo are called crates. Cargo makes it straightforward to manage dependencies, build and test your code, and create and publish Rust packages. 

To use an external library in your Rust project, you will first need to add it as a dependency in your `Cargo.toml` file. This file lists all of the dependencies for your project and specifies the version of each dependency that you want to use.

Here is an example of how to add a dependency to your `Cargo.toml` file incorporating an example package called `my_library`:

```rust
[dependencies]
my_library = "1.0.0"
```

Once you have added a dependency to your `Cargo.toml` file, you can use it in your Rust code by linking to it in your `main.rs` or `lib.rs` file. Here is an example of how to import and use a library in Rust:

```rust
extern crate my_library;

use my_library::{MyStruct, my_function};

fn main() {
    let my_struct = MyStruct::new();
    let result = my_function(my_struct);
    println!("The result is {}", result);
}
```

In this example, we use the `extern crate` directive to link to the `my_library` library, and the `use` keyword to import the `MyStruct` struct and the `my_function` function from the library. We can then use these imported types and functions in our code just like any other Rust types and functions.

There's a lot more we can do with packages in our code, and we'll explore that in a bit more depth in the following blog posts. 

## Conclusion

In this first post of our "From high-level to systems programming: A practical guide to Rust" series, we have covered some of the basics of Rust's syntax and type system, as well as some of its unique features such as ownership and borrowing. We have also looked at Rust's approach to error handling and began to work with external libraries using Cargo.

In the next two posts, we will explore Rust's capabilities for systems programming and building real-world applications.

If you want to learn more about Rust in the meantime, here are a few resources that you may find helpful:

* The [Rust documentation](https://doc.rust-lang.org/std/index.html) is an excellent resource for learning more about Rust's syntax, types, and features.
* The [Rust Book](https://doc.rust-lang.org/book/) is an official guide to Rust that covers a wide range of topics in depth. Check out [this version from Brown University](https://rust-book.cs.brown.edu/) that includes end of chapter challenges to help reinforce your learning!
* [Rustlings](https://github.com/rust-lang/rustlings/) is a CLI-based open source project of small challenges that help to grow your knowledge of the language.

Best of luck in the beginning of your Rust learning journey and see you for part two of this series!
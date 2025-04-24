---
title: Rails Caching With Couchbase in Under 5 Minutes
date: '2024-06-24'
summary: >-
  Reduce your data sprawl and learn how to implement caching in a Rails
  application using Couchbase in under 5 minutes.
tags:
  - slug: tutorial
    collection: tags
image: >-
  https://dev-to-uploads.s3.amazonaws.com/uploads/articles/dsljn7699sl2xypflfmn.png
authors:
  - default
---
  
  ![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/dsljn7699sl2xypflfmn.png)

Every new Rails application when it is first deployed comes along with it several other services that are used to allow it to run smoothly and efficiently. As Rails developers we are all familiar with them: PostgreSQL, Redis, Sidekiq, etc. 

**What if you could begin to reduce the sprawl of services that you need to run your application?**

In under 5 minutes, you can combine both your database and caching layer into a single service with Couchbase. Many people know Couchbase as a NoSQL database, but it can also be used as a caching service that can be used to store data in memory and reduce the number of queries that hit your database. By doing so, you can reduce the number of services that you need to run your application and make it more efficient.

Enough with the introduction, let's get started!

## Step 1: Create a Couchbase Capella Account

If you already have a Couchbase Capella account, you can skip this step and proceed right to Step 2. If you don't have an account, you can create one by visiting the [Couchbase Capella website](https://cloud.couchbase.com/). You can create an account using your GitHub or Google credentials, or you can create an account using your email address and a password.

Once you have done so, you will proceed to create a new project with a new database, and a new bucket. You can name your project, database, and bucket whatever you like. For the purposes of this tutorial, I will name my project `rails-couchbase-caching`, my database `rails-couchbase-caching`, and my bucket `cachingExampleWithRails`.

After you have created your project, database, and bucket, you will need to create database credentials. You can do so by clicking on the `Connect` button and then the `Database Access` link.

![Connect Button Screenshot](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/is1d5budg6mj5two7l7m.png)

Make sure to take note of the username and password that you have created, and also the connection string that you will use to connect to your Couchbase database. You will be using them in the next step.

## Step 2: Add the Couchbase Gem to Your Rails Application

To add the Couchbase gem to your Rails application, you will need to add the following line to your `Gemfile`:

```ruby
gem "couchbase", "~> 3.5.1"
```

Then, run `bundle install` to install the gem.

At this point, make sure to add your Couchbase connection string, username, and password to your Rails application. You can do so by adding the following to your `.env` file or to however you manage your environment variables in your application:

```ruby
COUCHBASE_CONNECTION_STRING=your_connection_string
COUCHBASE_USER=your_username
COUCHBASE_PASSWORD=your_password
COUCHBASE_BUCKET_NAME=your_bucket_name
```

Now, you are ready to connect to your Couchbase database in your Rails application.

## Step 3: Implement Caching in Your Rails Application

To implement caching in your Rails application, you can use the following code snippet inside your `config/application.rb` file:

```ruby
config.cache_store = :couchbase_store, {
    connection_string: env.fetch("COUCHBASE_CONNECTION_STRING"),
    username: env.fetch("COUCHBASE_USER"),
    password: env.fetch("COUCHBASE_PASSWORD"),
    bucket: env.fetch("COUCHBASE_BUCKET"),
}
```

This code snippet will configure your Rails application to use Couchbase as the caching store. You can now use the `ActiveSupport::Cache` API to interact with your Couchbase cache as you would with any other caching store.

## Step 4: Use the Cache in Your Rails Application

To use the cache in your Rails application, you can use the following code snippet:

```ruby
@cached_data = Rails.cache.fetch("key", expires_in: 1.minute) do
    # Your caching data here
end
```

This code snippet will cache the data that you have inside the block for 1 minute. After 1 minute, the data will be removed from the cache. The `#fetch` method will return the data if it is present in the cache, otherwise it will execute the block and store the data in the cache. The [Rails docs](https://api.rubyonrails.org/classes/ActiveSupport/Cache/Store.html) has more information on how to use the `ActiveSupport::Cache` API.

That's it! You have now implemented caching in your Rails application using Couchbase in under 5 minutes. You can now reduce the number of services that you need to run your application and make it more efficient.

## Wrapping Up

In this tutorial, you have learned how to implement caching in a Rails application using Couchbase in under 5 minutes. By doing so, you can reduce the number of services that you need to run your application and make it more efficient. You can now store data in memory and reduce the number of queries that hit your database.

The next time you deploy a Rails app and need a caching layer, you can remove at least one more service from your stack and consolidate your database and caching layer into a single service with Couchbase.

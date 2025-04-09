---
title: "Use GitHub Actions to Make Your GitHub Profile Dynamic"
date: "2023-04-09"
summary: "Automatically Update Your Profile with Fresh Content and Showcase Your Latest Work"
tags: ["github","career"]
image: "https://dev-to-uploads.s3.amazonaws.com/uploads/articles/t3ggg3o8so8btyijcxg3.png"
authors: ["default"]
---
  
  ![header image](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/t3ggg3o8so8btyijcxg3.png)

Where do people first discover you online? Perhaps your social media presence is the first thing people find when they search for you, or perhaps it's the portfolio site you created for yourself. However, if you use GitHub to share your code and participate in open source projects, then your GitHub profile may be the first place people go to in order to learn more about you.

What do you want your GitHub profile to say about you? How do you want to express what is important to you and who you are in a concise and easy to read manner for visitors? Whether they are a prospective employer or a prospective partner in an open source project, it's imperative you have a profile that stands out.

Using GitHub Actions, you can turn a static markdown document into a dynamic experience that stays up to date on the latest information about you. How do you do that?

I'll show you an example of how you can do this quickly and without too much effort. In this example, you'll learn how to scrape a website and use that data to dynamically update your GitHub profile. We'll show this example in Ruby, but you can do this with JavaScript, TypeScript, Python, or other languages.

## How Your GitHub Profile Works

Your GitHub profile is found by going to `github.com/[your-username]` in a web browser, [here's mine](https://github.com/hummusonrails) for example. Where does the content for that view come from?

It lives in a special repository in your account with the name of your account username. If you do not have this repository yet, you will not see any special content when you visit `github.com/[your-username]`, so the first step is to ensure you have that repository created, and if you do not, go ahead and create it.

### Exploring the files in the profile repository

The only required file in the repository is a `README.md` file that is the source of your profile page.

```bash
./
├── README.md
```

Go ahead and add some content in that file, save it, and refresh your username homepage, and you will see that content reflected there.

### Adding the right folders for dynamic content

Before we create the code to make our profile dynamic, let's add the folder structure.

Inside the top-level add a new folder called `.github` and inside `.github` add two new sub-folders: `scripts/` and `workflows/`.

Your file structure should now look like this:

```bash
./
├── .github/
│   ├── scripts/
│   └── workflows/
└── README.md
```

## Making a Dynamic Profile

We need to do three things for this example:

* Define a place in the `README` where the dynamic content will be
* Add a script inside `scripts/` that will do the scraping work
* Add a workflow for GitHub Actions inside `workflows/` that will run the script on a schedule

Let's do each of those steps now.

### Updating the README

We need to add a section to the README that can be grabbed using Regex by the script to modify. It can be whatever you need it to be for your specific use case. For this example, we'll add a section for recent blog posts in the README.

Open up the `README.md` file in a code editor and add the following:

```markdown
### Recent blog posts
```

Now we have an area for the script to find.

### Creating the script

The example script we are building is written in Ruby and uses the GitHub gem `octokit` to interact with your repository, the `nokogiri` gem to scrape the website, and the `httparty` gem to make the HTTP request. 

In this example below, the element to be scraped has already been identified. In your own use case, you'll need to discover the path to the element on the site you wish to scrape, and it will undoubtedly be different than what is shown below as defined in the `posts` variable and for each `title` and `link` of each `post`. 

Here is the example code, which goes in the `scripts/` folder:

```ruby
require 'httparty'
require 'nokogiri'
require 'octokit'

# Scrape blog posts from the website
url = "https://www.bengreenberg.dev/blog/"
response = HTTParty.get(url)
parsed_page = Nokogiri::HTML(response.body)
posts = parsed_page.css('.flex.flex-col.rounded-lg.shadow-lg.overflow-hidden')

# Generate the updated blog posts list (top 5)
posts_list = ["\n### Recent Blog Posts\n\n"]
posts.first(5).each do |post|
  title = post.css('p.text-xl.font-semibold.text-gray-900').text.strip
  link = "https://www.bengreenberg.dev#{post.at_css('a')[:href]}"
  posts_list << "* [#{title}](#{link})"
end

# Update the README.md file
client = Octokit::Client.new(access_token: ENV['GITHUB_TOKEN'])
repo = ENV['GITHUB_REPOSITORY']
readme = client.readme(repo)
readme_content = Base64.decode64(readme[:content]).force_encoding('UTF-8')

# Replace the existing blog posts section
posts_regex = /### Recent Blog Posts\n\n[\s\S]*?(?=<\/td>)/m
updated_content = readme_content.sub(posts_regex, "#{posts_list.join("\n")}\n")

client.update_contents(repo, 'README.md', 'Update recent blog posts', readme[:sha], updated_content)
```

As you can see, first an HTTP request is made to the website and the section with the blog posts is gathered and the data is assigned to a `posts` variable. Then, the script iterates through the blog posts inside the `posts` variable and gathers the first 5 of them. You may want to change that number for your own needs. Each loop through the blog posts, a post is added to an array of `posts_list` with the title and the URL to the blog post.

Lastly, the README file is updated by first finding it using the `octokit` gem, and then locating the spot in the README to update with some regex: `posts_regex = /### Recent Blog Posts\n\n[\s\S]*?(?=<\/td>)/m`.

This script will do the job, but nothing is actually invoking this script. How does it get run? This is where GitHub Actions comes to the rescue!

### Creating the Action workflow

Now that we have the script in place, we need a way to automatically run it on a schedule. GitHub Actions provides a powerful way to automate a wide variety of tasks, including running scripts. In this case, we'll create a GitHub Actions workflow that runs the script once a week at midnight on Sunday.

The workflow file should be placed in the .github/workflows/ directory and can be named something like update_blog_posts.yml. Here's the content of the workflow file:

```yaml
name: Update Recent Blog Posts

on:
  schedule:
    - cron: '0 0 * * 0' # Run once a week at 00:00 (midnight) on Sunday
  workflow_dispatch:

jobs:
  update_posts:
    runs-on: ubuntu-latest

    steps:
    - name: Check out repository
      uses: actions/checkout@v2

    - name: Set up Ruby
      uses: ruby/setup-ruby@v1
      with:
        ruby-version: 3.1

    - name: Install dependencies
      run: gem install httparty nokogiri octokit

    - name: Scrape posts and update README
      run: ruby ./.github/scripts/update_posts.rb
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        GITHUB_REPOSITORY: ${{ github.repository }}
```

This workflow is triggered on a schedule defined by the `cron` syntax, which specifies that it should run at 00:00 (midnight) every Sunday. Additionally, the workflow can be manually triggered using the `workflow_dispatch` event.

The `update_posts` job consists of several steps:

* Checking out the repository using the `actions/checkout@v2` action.
* Setting up Ruby using the `ruby/setup-ruby@v1` action, with the specified Ruby version of 3.1.
* Installing the required Ruby gems (`httparty`, `nokogiri`, and `octokit`) using the `gem install` command.
* Running the script `update_posts.rb` located in the `.github/scripts/` directory. The `GITHUB_TOKEN` and `GITHUB_REPOSITORY` environment variables are provided to the script, allowing it to interact with the repository.

With this workflow in place, your script will automatically run every week to scrape the blog posts and update the README file. GitHub Actions takes care of all the scheduling and execution, making the process seamless and efficient.

## Putting it all Together

Nowadays, your online presence is often the first point of contact for people looking to connect with you—whether they're prospective employers, collaborators, or contributors to open source projects. Your GitHub profile, in particular, is a valuable platform for showcasing your skills, projects, and interests. So, how can you ensure that your GitHub profile remains up to date, relevant, and truly reflective of who you are?

By harnessing the power of GitHub Actions, we've demonstrated how you can transform your GitHub profile from a static Markdown document into a dynamic, ever-changing example of who you are. Through the example provided in this guide, you've learned how to scrape data from a website and use it to dynamically update your GitHub profile. And while our example was implemented in Ruby, the same principles can be applied using JavaScript, TypeScript, Python, or any other language of your choice.

To recap, we walked through the process of creating a Ruby script that scrapes blog posts from a website, extracts relevant information, and updates the "Recent Blog Posts" section of your `README.md` file. Then, we used GitHub Actions to set up a workflow that runs the script on a regular schedule, ensuring that your profile remains current with your latest content.

But our journey doesn't end here! The techniques and approaches shared in this guide can serve as a foundation for further exploration and creativity. Whether it's pulling in data from other sources, integrating with APIs, or experimenting with different content formats, the possibilities are endless.

So go ahead and make your GitHub profile a vibrant and dynamic extension of yourself. Let it tell your story, highlight your achievements, and invite collaboration with others.
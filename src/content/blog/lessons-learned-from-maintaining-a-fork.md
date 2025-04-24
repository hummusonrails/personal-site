---
title: Lessons learned from maintaining a fork
date: '2022-02-14'
summary: >-
  Committing to maintain a fork of an active project has distinct challenges I
  have learned. In brief, they center on two themes...
tags:
  - slug: github
    collection: tags
image: >-
  https://res.cloudinary.com/practicaldev/image/fetch/s--uQPm8vCF--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/aguuykcq634wqlhvmr6i.png
authors:
  - default
---
  
  ![header image](https://res.cloudinary.com/practicaldev/image/fetch/s--uQPm8vCF--/c_imagga_scale,f_auto,fl_progressive,h_420,q_auto,w_1000/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/aguuykcq634wqlhvmr6i.png)

At the last RubyConf in Denver [I delivered a talk on supporting older career changers into software](https://www.youtube.com/watch?v=_YhBMu43Lm4). It's a topic that I have invested a lot of time and thought into as someone who made the transition into tech myself as a second career.

After delivering the talk, I continued to think on ways that I could further support the community of second career devs, particularly around the job search.

It was then that I came across the open-source work of [Joe Masilotti](https://twitter.com/joemasilotti) in building [railsdevs](https://railsdevs.com), a reverse job board for Ruby on Rails developers.

![screenshot of railsdevs](https://user-images.githubusercontent.com/2092156/147028085-eea40303-c572-48c0-b107-0be93cce067c.png)

I was inspired by the idea of the **reverse job board** and what that could mean for people making the pivot into tech. All too often pivoters need to minimize their previous career experience because it is perceived as a liability, but what would it look like to create a site that recruiters and hiring managers specifically came to looking for developers with supplemental skillsets like customer relations, project management, and more?

I reached out to Joe and shared with him my idea, and asked if he would be okay with me forking his project and creating a reverse job board for career changers. Technically, as an open-source app, I could have just forked it and have been done with it as long as I stayed within the parameters of the license, but I wanted to express my appreciation for what he was doing and to start a relationship, not just an act of utilitarian copying.

Then, after a great conversation, I did it. I remember distinctly making the fork of railsdevs and starting my project, [hirethePIVOT](https://hirethepivot.com).

![screenshot of hirethePIVOT](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hzz8iwf29sj626t9vp1n.png) 

It felt so simple... *at first*.

Committing to maintain a fork of an active project has distinct challenges I have learned. In brief, they center on two themes:

* Divergence
* Synchrony

Let me expand on each topic and how it applies.

## Divergence

Two reverse job boards. They sound pretty similar, right?

Well, yes, in concept they have similar objectives and they function in similar ways. Yet, there are significant differences based on the community of job seekers they are created for.

A reverse job board for Rails developers does not need to think so much about things like displaying specific technical skills. It is true there are variations and sub-specialties within a framework expertise, but overwhelmingly, the developers listed on a Rails job board will be Rails developers.

That is not the case for a job board of career changers.

We have Python, Node.js, .NET, Ruby, frontend, backend, data science specialties, and the list goes on.

Second, the entire point of [hirethePIVOT](https://hirethepivot.com) is to celebrate the *pivot skills* that career changers bring, like sales or graphic design, so we need to also find a way to highlight those as well.

As a result of those needs, I began introducing some changes to the database schema and the `Developer` model. I added new columns for `pivot_skills` and `technical_skills`. Those new columns impacted downwind the controllers and views for `Developers`.

Over time, additional changes were introduced that incrementally diverged my fork more and more from the original codebase. Whether it was introducing more record validations, or adding my own version of a search functionality, each change made it harder to keep parity with the original.

At what point does a fork of an original project stop being a fork? Is it based on a percentage of code that has been changed? If you reach a certain threshold, maybe 30% of new or deleted code, then it's sufficiently different? Perhaps, it's not a percentage but a qualitative measurement. You have substantially changed some significant things, and it no longer can be seen as the same codebase.

This leads to the second issue, which is keeping things aligned.

## Synchrony

When you maintain a fork of a project on GitHub you have a lovely little indicator in your repository that the main project has had some new changes, and you can fetch upstream those changes. You can even do so in a single click.

Of course, nothing is that simple. 

The more divergent your codebase becomes, the more challenging it is to fetch upstream the new additions from the original. 

Initially, my attempts at keeping up with the main codebase would take just a few minutes every few days. I hadn't changed much on my fork, so there were very little conflicts. Over time the time factor grew exponentially.

You do not only need to worry about the merge conflicts that git conveniently makes you aware of, and IDEs like VSCode highlight for you. You also need to make sure you pay close attention to the entirely new changes that no longer align with where your fork is going.

For example, I built a search functionality in my fork prior to the main codebase introducing a search function. Once railsdevs introduced search, I had two options:

* Remove mine and integrate the new one
* Maintain mine and not integrate the new one

For various reasons, I chose the latter. This means that I need to constantly be vigilant for code being introduced in an upstream fetch that can negatively impact my search function, or just simply introduce an entirely duplicative function.

Now, at this point, fetching upstream could take me an hour or two to do it deliberately and carefully. 

If you have read this far, you may be asking yourself what I call **the big question**. Is it worth it? Let's take a look.

## The big question

Was building [hirethePIVOT](https://hirethepivot.com) as a fork of [railsdevs](https://railsdevs.com) worth it? Was it worth the increasing level of complexity in the ways described above?

I think the answer is... *it depends*.

If the purpose of your fork will not in essence change from the purpose of the main project then starting it out as a fork  is not a bad idea. Yes, your code will diverge, but it will diverge in specific areas and you can watch out for those areas when fetching upstream.

If, however, your project will become something substantially different from the original, then starting it out as a fork doesn't really make sense. For example, if I wanted to build an image-editing app, but I chose to fork a job board to begin that process because both the job board and the image-editing app will have user accounts, that really won't hold for too long. The differences between an image-editing app and a job board are just too vast.

The second area, and this I think is actually the most important, is what is your purpose in forking from the original project? Is it to simply borrow the existing code to save time or is it something more?

When I reached out to Joe before forking railsdevs, it was because I wanted to start a conversation on the ways our two projects might be able to lift each other up. My aspiration was to be able to give back and to maintain a line of communication. **You can argue that a forked project is the git embodiment of that ideal.**

What if you only want to borrow the existing open source code for your own project and do not have intentions of starting a dialogue with the original project? I would recommend probably not to fork it, and simply attribute the existing code properly in your own project as the original open source license requires. The extra cognitive work of a fork is just not worth it in that case.

*Did you create a fork of a project to start your own? How did it go? Share your experiences in the comments below!*

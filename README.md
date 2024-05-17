# Personal Portfolio Website

This is my personal portfolio website built with [Astro](https://astro.build) and utilizing the [Tailwind Astro Starter Blog template](https://github.com/wanoo21/tailwind-astro-starting-blog) for design and [Couchbase Capella](https://www.couchbase.com/products/capella/) for database as a service.

## Usage

### Extend / Customize

`src/consts.ts` contains a list of constants that you can customize to your liking, including the blog title, description, author, social media links, etc.

`src/functions.ts` contains a list of functions that changes the default behavior of the template, including default post sorting and exclude draft posts.

`src/db/couchbase.ts` contains connection functions to interact with Couchbase, including formatting tag capitalization for your specific needs and the name of the Couchbase bucket you created.

### Blog

The blog feature of this personal site uses [Couchbase](https://www.couchbase.com/) to store the blog data: blog posts, author information and blog tags.

#### Environment Setup

You need to provide several environment variables for your site for it to interact with Couchbase. To do so first create a `.env` file in the root of the project and add the following variables:

```
COUCHBASE_URL=<Your Couchbase Capella URL>
COUCHBASE_USERNAME=<Your Couchbase Username>
COUCHBASE_PASSWORD=<Your Couchbase Password>
```

Once you have setup your Couchbase cluster with your authentication information, you can fetch this information from the Couchbase dashboard.

#### Couchbase Capella

Capella is the Database as a Service (DBaaS) offering from Couchbase, and it is what this site uses for the blog. You can sign up for a free 30-day trial of Capella by doing the following:

1. Visit the [Couchbase Capella website](https://www.couchbase.com/products/capella/).
2. Sign up for a free trial.
3. Set up your cluster and get the connection details for your .env file.

**Please note the Couchbase bucket name is hardcoded into this project as `blogBucket`. You can rename it in the codebase to whatever you would like or set it up as a environment variable in your `.env` file and use the environment variable to introduce more flexibility.**

### 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

This project is under the [MIT License](LICENSE).

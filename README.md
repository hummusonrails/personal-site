# Personal Portfolio Website

This is my personal portfolio website built with [Astro](https://astro.build) and utilizing the [Tailwind Astro Starter Blog template](https://github.com/wanoo21/tailwind-astro-starting-blog).

## Usage

### Extend / Customize

`src/consts.ts` contains a list of constants that you can customize to your liking, including the blog title, description, author, social media links, etc.

`src/functions.ts` contains a list of functions that changes the default behavior of the template, including default post sorting and exclude draft posts.

`src/content/authors/default.mdx` contains the default author information. You can add more authors by adding more `.mdx` files in the `src/content/authors` folder.

`src/content/tags/default.mdx` contains the default tag information. You can add more tags by adding more `.mdx` files in the `src/content/tags` folder.

`src/content/config.ts` contains all fields for author, blog and tags pages. Check what's required and what's not. You can also add more fields if you want to.

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

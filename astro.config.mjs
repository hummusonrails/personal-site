import {defineConfig} from 'astro/config';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

import tailwind from "@astrojs/tailwind";

import {SITE_METADATA} from "./src/consts.js";

// https://astro.build/config
export default defineConfig({
    site: SITE_METADATA.siteUrl,
    integrations: [mdx(), sitemap(), tailwind()],
    output: 'server',
    adapter: vercel({
        maxDuration: 60,
      })
});

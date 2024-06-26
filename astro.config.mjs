import {defineConfig} from 'astro/config';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel/serverless';
import sitemap from '@astrojs/sitemap';

import tailwind from "@astrojs/tailwind";

import astroEmbed from 'astro-embed';

import {SITE_METADATA} from "./src/consts.ts";

// https://astro.build/config
export default defineConfig({
    site: SITE_METADATA.siteUrl,
    integrations: [mdx(), sitemap(), tailwind(), astroEmbed()],
    output: 'server',
    adapter: vercel({
        maxDuration: 60,
      })
});

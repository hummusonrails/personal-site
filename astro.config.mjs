import {defineConfig} from 'astro/config';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import {SITE_METADATA} from "./src/consts.js";

// https://astro.build/config
export default defineConfig({
    site: SITE_METADATA.siteUrl,
    // /privacy exists for the Jeeves YouTube Google OAuth app only; it stays out of the sitemap.
    integrations: [mdx(), sitemap({filter: (page) => !page.includes('/privacy')}), react()],
    output: 'server',
    compressHTML: true,
    adapter: vercel({
        maxDuration: 60,
      })
});

import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Replaces the deprecated @astrojs/tailwind integration (no Astro 6/7
// support). Tailwind base/components/utilities are imported via
// src/styles/global.css.
export default {
  plugins: [tailwindcss(), autoprefixer()],
};

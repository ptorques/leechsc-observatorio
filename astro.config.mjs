// @ts-check
import { defineConfig } from 'astro/config';

// `site` + `base` assume hosting on GitHub Pages at
// https://ptorques.github.io/leechsc-observatorio/.
// Change both if you move to a custom domain (then base becomes '/').
export default defineConfig({
  site: 'https://ptorques.github.io',
  base: '/leechsc-observatorio',
  trailingSlash: 'ignore',
  vite: {
    // ECharts is one shared ~190 kB (gzipped) chunk, loaded only on pages with charts.
    build: { chunkSizeWarningLimit: 800 },
  },
});

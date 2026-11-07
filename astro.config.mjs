import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { brand } from './src/config/brand.ts';

// Static output: every marketing page is pre-rendered and indexable.
// Interactive tools (simulator, configurator, trial) hydrate small vanilla-TS islands.
export default defineConfig({
  site: brand.siteUrl,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({
      // Private, per-visitor and transactional pages stay out of the sitemap.
      filter: (page) => !/\/(my-setup|onboarding|sign-in|trial|configurator|design-system|checkout|story-lab)/.test(page),
    }),
  ],
});

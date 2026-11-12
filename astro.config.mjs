import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';

// The production address. Set SITE_URL in Vercel once the domain is attached; until then links, the sitemap and the feed use this.
const site = process.env.SITE_URL || 'https://valleycapitalpartner.com';

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  markdown: { processor: unified({ smartypants: false }) },   // keep straight quotes, matching the hand-written pages exactly
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404/') })],
});

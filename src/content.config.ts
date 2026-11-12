import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Blog posts: src/content/blog/<slug>.md. Files whose name starts with "_" are ignored (see _TEMPLATE.md).
const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(220),              // shown in lists, search results and link previews
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().default('Valley Capital Partners'),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),             // drafts show in `npm run dev` but never in a production build
  }),
});

// Library: longer technical notes on hotel loan workouts, src/content/library/<slug>.md.
const library = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/library' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    topic: z.string(),                             // short label beside the title, for example "Franchise"
    order: z.number().default(100),                // lower comes first in the Library list
    draft: z.boolean().default(false),
  }),
});

// Glossary: one short definition per file, src/content/glossary/<slug>.md. The file name is the anchor: /glossary/#<slug>.
const glossary = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/glossary' }),
  schema: z.object({
    term: z.string(),                              // as shown, for example "Revenue per available room (RevPAR)"
  }),
});

export const collections = { blog, library, glossary };

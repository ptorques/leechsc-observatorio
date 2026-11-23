import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per lab project in src/content/projects/.
// The body is the short explanation shown next to the chart.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    /** position on the Projetos page */
    order: z.number(),
    /** which chart to show: a key of `projectData` in src/data/placeholder.ts */
    chart: z.enum(['sector-radar', 'officials-event', 'urban-history']),
    /** caption under the figure */
    caption: z.string(),
    /** link to the article / working paper; omit until it exists */
    article: z.url().optional(),
    authors: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  }),
});

export const collections = { projects };

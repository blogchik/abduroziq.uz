import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Posts live in `packages/content/posts/<locale>/<slug>.mdx`.
 * The entry id is `<locale>/<slug>` (for example `en/hello-world`); `src/lib/posts.ts`
 * derives locale and slug from it. See docs/ARCHITECTURE.md section 5.1.
 */
const posts = defineCollection({
  loader: glob({ base: '../../packages/content/posts', pattern: '**/*.mdx' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      description: z.string().min(70).max(160),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      tags: z
        .array(
          z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: 'Tags are lowercase kebab-case' }),
        )
        .default([]),
      draft: z.boolean().default(false),
      cover: image().optional(),
      coverAlt: z.string().default(''),
      translationKey: z.string().optional(),
    }),
});

export const collections = { posts };

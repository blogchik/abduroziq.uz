import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { locales, type Locale } from '@abduroziq/content';
import { POST_KINDS } from './lib/post-data';

/**
 * Posts live in `packages/content/posts/<locale>/<slug>.mdx`.
 * The entry id is `<locale>/<slug>` (for example `en/hello-world`); `src/lib/posts.ts`
 * derives locale and slug from it. See docs/ARCHITECTURE.md section 5.1.
 *
 * `kind: note` marks the short kind of entry (at most 300 words, text only). A note may leave
 * out the description (it is derived from the text) and has no cover; whether its body is
 * short and plain enough is checked in `lib/posts.ts`, where the body is at hand.
 */
const posts = defineCollection({
  loader: glob({ base: '../../packages/content/posts', pattern: '**/*.mdx' }),
  schema: ({ image }) =>
    z
      .strictObject({
        kind: z.enum(POST_KINDS).default('post'),
        title: z.string().min(1),
        description: z.string().min(70).max(160).optional(),
        date: z.coerce.date(),
        updated: z.coerce.date().optional(),
        tags: z
          .array(
            z
              .string()
              .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: 'Tags are lowercase kebab-case' }),
          )
          .default([]),
        draft: z.boolean().default(false),
        cover: image().optional(),
        coverAlt: z.string().default(''),
        translationKey: z.string().optional(),
      })
      .refine((data) => data.kind === 'note' || data.description !== undefined, {
        error:
          'A post needs a description (70 to 160 characters); only a note (kind: note) may leave it out.',
        path: ['description'],
      })
      .refine((data) => data.kind !== 'note' || !data.cover, {
        error: 'A note cannot have a cover: remove the cover, or make it a post (drop kind: note).',
        path: ['cover'],
      }),
});

/** `{ en, uz }`: one value per site language, built from the one locale list. */
const localized = <T extends z.ZodType>(schema: T) =>
  z.strictObject(
    Object.fromEntries(locales.map((locale) => [locale, schema])) as Record<Locale, T>,
  );

const text = z.string().trim().min(1);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'Colours are #RRGGBB' });

/**
 * Projects: one folder per project, `packages/content/projects/<slug>/project.yaml`, holding
 * every fact in both languages. The entry id is the folder name (the slug). Relative paths
 * (cover, gallery images, posters) resolve from the yaml file. Videos are plain paths here,
 * because `image()` handles images only; `src/lib/projects.ts` resolves them to built URLs.
 * A video states its `width` and `height`, because nothing reads them from the file.
 * See packages/content/projects/README.md.
 */
const projects = defineCollection({
  loader: glob({
    base: '../../packages/content/projects',
    pattern: '*/project.yaml',
    generateId: ({ entry }) => entry.split('/')[0] ?? entry,
  }),
  schema: ({ image }) => {
    const caption = localized(text).optional();
    const media = z.union([
      z.strictObject({ image: image(), alt: localized(text), caption }),
      z.strictObject({
        video: z.string().min(1),
        // The video's own size in pixels: the page reserves its space and decides from it
        // how it sits in the frame (like a picture) before the file has loaded.
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        poster: image().optional(),
        alt: localized(text),
        caption,
      }),
    ]);
    return z
      .strictObject({
        name: text,
        order: z.number().int(),
        year: z.string().regex(/^\d{4}$/, { error: 'year is a four-digit string, e.g. "2026"' }),
        status: z.enum(['live', 'design', 'planned']),
        url: z.url().optional(),
        repo: z.url().optional(),
        role: localized(text),
        summary: localized(text),
        description: localized(z.string().trim().min(70).max(160)),
        stack: z.array(text).default([]),
        colors: z.tuple([hex, hex]),
        glyph: z.string().min(1).max(2),
        cover: image().optional(),
        coverAlt: localized(text).optional(),
        gallery: z.array(media).default([]),
      })
      .refine((data) => !data.cover || data.coverAlt, {
        error: 'coverAlt ({ en, uz }) is required when there is a cover',
        path: ['coverAlt'],
      });
  },
});

/**
 * The long text of a project page, per language: `projects/<slug>/<locale>.mdx`, body only.
 * The entry id is `<slug>/<locale>`. Optional: a page without one is still complete.
 */
const projectBodies = defineCollection({
  loader: glob({
    base: '../../packages/content/projects',
    pattern: '*/*.mdx',
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
});

export const collections = { posts, projects, projectBodies };

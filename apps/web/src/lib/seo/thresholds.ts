/**
 * Indexing rules shared by the pages (robots meta) and the sitemap setup. Plain TypeScript
 * with no imports: `astro.config.ts` reads it too.
 */

/** A tag page needs at least this many posts (in its language) to be indexed and listed. */
export const MIN_POSTS_PER_TAG = 3;

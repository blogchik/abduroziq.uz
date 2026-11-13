/**
 * Pure helpers behind `lib/projects.ts`: no `astro:*` imports, so `node --test` can run
 * them (`project-data.test.ts`). Pages and components import `lib/projects.ts`, not this.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The slug of a project entry (its folder name), checked: it becomes a URL. */
export function parseProjectSlug(id: string): string {
  if (!SLUG.test(id)) {
    throw new Error(
      `Project folder "${id}" must be a lowercase kebab-case slug (projects/<slug>/project.yaml).`,
    );
  }
  return id;
}

/** Slug and locale of a project body entry: `payzone/en` -> `{ slug: 'payzone', locale: 'en' }`. */
export function parseProjectBodyId<L extends string>(
  id: string,
  locales: readonly L[],
): { slug: string; locale: L } {
  const [slug = '', file = '', ...rest] = id.split('/');
  const locale = locales.find((candidate) => candidate === file);
  if (!locale || rest.length > 0) {
    throw new Error(
      `Project text "${id}.mdx" must be projects/<slug>/<locale>.mdx with locale one of ${locales.join(', ')}.`,
    );
  }
  return { slug: parseProjectSlug(slug), locale };
}

/** Ascending `order`, which must be unique: two projects in the same place is a data error. */
export function sortByOrder<T extends { slug: string; order: number }>(items: readonly T[]): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  sorted.forEach((item, index) => {
    const before = sorted[index - 1];
    if (before && before.order === item.order) {
      throw new Error(
        `Projects "${before.slug}" and "${item.slug}" share order ${item.order}; give each its own.`,
      );
    }
  });
  return sorted;
}

/** Neighbours in an ordered list: `prev` comes before `slug`, `next` after it. No wrap-around. */
export function adjacentBySlug<T extends { slug: string }>(
  items: readonly T[],
  slug: string,
): { prev?: T; next?: T } {
  const index = items.findIndex((item) => item.slug === slug);
  if (index === -1) return {};
  const prev = items[index - 1];
  const next = items[index + 1];
  return { ...(prev ? { prev } : {}), ...(next ? { next } : {}) };
}

/**
 * Key of a media file relative to the projects folder: a path written in
 * `projects/<slug>/project.yaml` (relative to that file) -> `<slug>/<path>`.
 * `./media/demo.mp4` in payzone -> `payzone/media/demo.mp4`. A path that leaves the
 * project's folder is refused, so one project cannot point at another's files.
 */
export function mediaKey(slug: string, ref: string): string {
  const parts: string[] = [];
  for (const part of ref.replaceAll('\\', '/').split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) {
        throw new Error(`Project "${slug}": media path "${ref}" leaves the project's folder.`);
      }
      parts.pop();
    } else parts.push(part);
  }
  if (parts.length === 0) throw new Error(`Project "${slug}": media path "${ref}" is empty.`);
  return [slug, ...parts].join('/');
}

/**
 * Built URL of a video referenced by a project. `files` maps keys (see `mediaKey`) to URLs;
 * a missing file fails the build with a message naming the project and the path.
 */
export function resolveVideo(
  slug: string,
  ref: string,
  files: Readonly<Record<string, string>>,
  extensions: readonly string[],
): string {
  const key = mediaKey(slug, ref);
  const url = files[key];
  if (url === undefined) {
    throw new Error(
      `Project "${slug}": video "${ref}" not found (looked for packages/content/projects/${key}). ` +
        `Videos must live in the project's folder and end in ${extensions.map((ext) => `.${ext}`).join(' or ')}.`,
    );
  }
  return url;
}

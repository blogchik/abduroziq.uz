import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { localePath, locales, type Locale } from '@/i18n';
import {
  adjacentBySlug,
  parseProjectBodyId,
  parseProjectSlug,
  resolveVideo,
  sortByOrder,
} from './project-data';

/**
 * The single access point to projects for pages and components. The data lives in
 * `packages/content/projects/<slug>/` (docs/ARCHITECTURE.md section 5.2); every function
 * returns strings already picked for one locale.
 */

export type ProjectStatus = 'live' | 'design' | 'planned';

export interface ProjectCover {
  src: ImageMetadata;
  alt: string;
}

export interface ProjectSummary {
  slug: string;
  name: string;
  /** The current build year, not a launch date. */
  year: string;
  status: ProjectStatus;
  role: string;
  /** One sentence for lists and under the title. */
  summary: string;
  /** The meta description (70 to 160 characters). */
  description: string;
  /** Live address. */
  url?: string;
  /** Public repository. */
  repo?: string;
  /** Technology names in display order; may be empty. */
  stack: string[];
  colors: [background: string, foreground: string];
  /** One or two characters drawn on the ticket preview. */
  glyph: string;
  cover?: ProjectCover;
  /** Locale-correct path of the project page: `/uz/projects/payzone/`. */
  href: string;
}

export type ProjectMedia =
  | { kind: 'image'; src: ImageMetadata; alt: string; caption?: string }
  | {
      kind: 'video';
      src: string;
      /** The file's own size in pixels, from the yaml. */
      width: number;
      height: number;
      poster?: ImageMetadata;
      alt: string;
      caption?: string;
    };

export type ProjectBodyEntry = CollectionEntry<'projectBodies'>;

export interface ProjectDetail extends ProjectSummary {
  gallery: ProjectMedia[];
  /** The page's long text in this locale, for `render()`. Absent when not written. */
  body?: ProjectBodyEntry;
}

type ProjectEntry = CollectionEntry<'projects'>;

const VIDEO_EXTENSIONS = ['mp4', 'webm'] as const;
const PROJECTS_DIR = '../../../../packages/content/projects/';

/**
 * Every video under the projects folder as a built URL, keyed `<slug>/<path>`. `no-inline`
 * keeps a small clip a real file in `dist/_astro` instead of a base64 `data:` URL.
 */
const videoFiles: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../../../packages/content/projects/*/**/*.{mp4,webm}', {
      query: '?url&no-inline',
      import: 'default',
      eager: true,
    }),
  ).map(([file, url]) => [file.slice(PROJECTS_DIR.length), url]),
);

async function getProjectEntries(): Promise<(ProjectEntry & { slug: string })[]> {
  const entries = await getCollection('projects');
  return sortByOrder(
    entries.map((entry) => ({
      ...entry,
      slug: parseProjectSlug(entry.id),
      order: entry.data.order,
    })),
  );
}

function toSummary(entry: ProjectEntry & { slug: string }, locale: Locale): ProjectSummary {
  const { data, slug } = entry;
  return {
    slug,
    name: data.name,
    year: data.year,
    status: data.status,
    role: data.role[locale],
    summary: data.summary[locale],
    description: data.description[locale],
    ...(data.url ? { url: data.url } : {}),
    ...(data.repo ? { repo: data.repo } : {}),
    stack: data.stack,
    colors: data.colors,
    glyph: data.glyph,
    ...(data.cover && data.coverAlt
      ? { cover: { src: data.cover, alt: data.coverAlt[locale] } }
      : {}),
    href: localePath(locale, `/projects/${slug}/`),
  };
}

function toMedia(
  slug: string,
  item: ProjectEntry['data']['gallery'][number],
  locale: Locale,
): ProjectMedia {
  const caption = item.caption ? { caption: item.caption[locale] } : {};
  if ('image' in item) return { kind: 'image', src: item.image, alt: item.alt[locale], ...caption };
  return {
    kind: 'video',
    src: resolveVideo(slug, item.video, videoFiles, VIDEO_EXTENSIONS),
    width: item.width,
    height: item.height,
    ...(item.poster ? { poster: item.poster } : {}),
    alt: item.alt[locale],
    ...caption,
  };
}

/** Every project, ascending by `order`, with strings in `locale`. */
export async function getProjects(locale: Locale): Promise<ProjectSummary[]> {
  return (await getProjectEntries()).map((entry) => toSummary(entry, locale));
}

/**
 * One project with its gallery and its body in `locale` (when written), or `undefined`
 * for an unknown slug. A gallery video whose file is missing fails the build.
 */
export async function getProject(locale: Locale, slug: string): Promise<ProjectDetail | undefined> {
  const entries = await getProjectEntries();
  const entry = entries.find((candidate) => candidate.slug === slug);
  if (!entry) return undefined;
  let body: ProjectBodyEntry | undefined;
  for (const candidate of await getCollection('projectBodies')) {
    const parsed = parseProjectBodyId(candidate.id, locales);
    // A text without its project.yaml would never be shown: say so instead.
    if (!entries.some((other) => other.slug === parsed.slug)) {
      throw new Error(`Project text "${candidate.id}.mdx" has no ${parsed.slug}/project.yaml.`);
    }
    if (parsed.slug === slug && parsed.locale === locale) body = candidate;
  }
  return {
    ...toSummary(entry, locale),
    gallery: entry.data.gallery.map((item) => toMedia(entry.slug, item, locale)),
    ...(body ? { body } : {}),
  };
}

/** The projects before and after `slug` in the ordered list (no wrap-around). */
export async function getAdjacentProjects(
  locale: Locale,
  slug: string,
): Promise<{ prev?: ProjectSummary; next?: ProjectSummary }> {
  return adjacentBySlug(await getProjects(locale), slug);
}

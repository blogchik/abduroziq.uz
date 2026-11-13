import { PUBLIC_SITE_URL } from 'astro:env/client';
import {
  defaultLocale,
  dictionaries,
  locales,
  namespaces,
  type Dictionary,
  type Locale,
  type Namespace,
} from '@abduroziq/content';

// The list of languages lives in one place, packages/content/src/locales.ts (also read by astro.config.ts).
export { defaultLocale, locales };
export type { Locale };

const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

/** Locale from a route parameter. `undefined` (no prefix) is the default locale. */
export function resolveLocale(param: string | undefined): Locale {
  if (param === undefined || param === '') return defaultLocale;
  if (isLocale(param)) return param;
  throw new Error(`Unknown locale "${param}". Expected one of: ${locales.join(', ')}.`);
}

/** The route parameter for a locale in `[...locale]` routes: `undefined` for the default locale. */
export function localeParam(locale: Locale): Locale | undefined {
  return locale === defaultLocale ? undefined : locale;
}

/** Removes a leading locale segment: `/uz/blog/` -> `/blog/`. */
export function stripLocale(path: string): string {
  const match = /^\/([^/]+)(\/.*)?$/.exec(path);
  if (match?.[1] && isLocale(match[1]) && match[1] !== defaultLocale) return match[2] ?? '/';
  return path;
}

/** Which locale a pathname belongs to: `/uz/blog/` -> `uz`, everything else -> default. */
export function localeFromPath(path: string): Locale {
  const first = path.split('/')[1];
  return first && isLocale(first) ? first : defaultLocale;
}

/**
 * Locale-prefixed path with a trailing slash (paths with a file extension keep none):
 * `localePath('uz', '/blog/')` -> `/uz/blog/`, `localePath('en', 'blog')` -> `/blog/`.
 */
export function localePath(locale: Locale, path: string): string {
  let clean = stripLocale(path.startsWith('/') ? path : `/${path}`);
  const last = clean.split('/').pop() ?? '';
  if (!clean.endsWith('/') && !last.includes('.') && !clean.includes('#') && !clean.includes('?')) {
    clean = `${clean}/`;
  }
  return locale === defaultLocale ? clean : `/${locale}${clean}`;
}

/** Absolute URLs of a locale-agnostic path in every locale. */
export function alternates(path: string): { locale: Locale; href: string }[] {
  return locales.map((locale) => ({
    locale,
    href: new URL(localePath(locale, path), PUBLIC_SITE_URL).href,
  }));
}

function lookup(dict: Dictionary | undefined, parts: string[]): string | undefined {
  let node: string | Dictionary | undefined = dict;
  for (const part of parts) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * UI string for `namespace.dot.path`, for example `t('uz', 'common.nav.writing')`.
 * `{name}` placeholders are filled from `vars`. A missing key throws in development and
 * falls back to English in production (still throwing when English lacks it too).
 */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const [namespace, ...path] = key.split('.');
  const known = (namespaces as readonly string[]).includes(namespace ?? '');
  if (!known || path.length === 0) {
    throw new Error(
      `Invalid i18n key "${key}". Use "<namespace>.<path>" with namespace one of: ${namespaces.join(', ')}.`,
    );
  }
  const ns = namespace as Namespace;

  let value = lookup(dictionaries[locale][ns], path);
  if (value === undefined) {
    if (import.meta.env.DEV) throw new Error(`Missing i18n key "${key}" for locale "${locale}".`);
    value = lookup(dictionaries[defaultLocale][ns], path);
    if (value === undefined) throw new Error(`Missing i18n key "${key}" in every locale.`);
  }
  return vars
    ? value.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      )
    : value;
}

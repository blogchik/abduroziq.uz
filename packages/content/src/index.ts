import enBlog from '../i18n/en/blog.json';
import enCommon from '../i18n/en/common.json';
import enHome from '../i18n/en/home.json';
import enSeo from '../i18n/en/seo.json';
import uzBlog from '../i18n/uz/blog.json';
import uzCommon from '../i18n/uz/common.json';
import uzHome from '../i18n/uz/home.json';
import uzSeo from '../i18n/uz/seo.json';
import type { Locale } from './types';

export { profile } from './site';
export { projects } from './projects';
export type { Locale, Localized, Profile, Project, SentencePart } from './types';

export const namespaces = ['common', 'home', 'blog', 'seo'] as const;
export type Namespace = (typeof namespaces)[number];

/** A nested dictionary of UI strings. Leaves are strings. */
export interface Dictionary {
  [key: string]: string | Dictionary;
}

/** UI strings by locale and namespace (`packages/content/i18n/<locale>/<namespace>.json`). */
export const dictionaries: Record<Locale, Record<Namespace, Dictionary>> = {
  en: { common: enCommon, home: enHome, blog: enBlog, seo: enSeo },
  uz: { common: uzCommon, home: uzHome, blog: uzBlog, seo: uzSeo },
};

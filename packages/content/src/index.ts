import enBlog from '../i18n/en/blog.json';
import enCommon from '../i18n/en/common.json';
import enHome from '../i18n/en/home.json';
import enProjects from '../i18n/en/projects.json';
import enSeo from '../i18n/en/seo.json';
import uzBlog from '../i18n/uz/blog.json';
import uzCommon from '../i18n/uz/common.json';
import uzHome from '../i18n/uz/home.json';
import uzProjects from '../i18n/uz/projects.json';
import uzSeo from '../i18n/uz/seo.json';
import type { Locale } from './locales';

export { defaultLocale, locales } from './locales';
export { profile } from './site';
export type { Locale, Localized, Profile, SentencePart } from './types';

export const namespaces = ['common', 'home', 'blog', 'projects', 'seo'] as const;
export type Namespace = (typeof namespaces)[number];

/** A nested dictionary of UI strings. Leaves are strings. */
export interface Dictionary {
  [key: string]: string | Dictionary;
}

/** UI strings by locale and namespace (`packages/content/i18n/<locale>/<namespace>.json`). */
export const dictionaries: Record<Locale, Record<Namespace, Dictionary>> = {
  en: { common: enCommon, home: enHome, blog: enBlog, projects: enProjects, seo: enSeo },
  uz: { common: uzCommon, home: uzHome, blog: uzBlog, projects: uzProjects, seo: uzSeo },
};

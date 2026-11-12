import type { Locale } from '@/i18n';

/**
 * Date pieces for the date block and month tabs, in Tashkent time like `@/lib/dates`.
 * Kept here because the shared module has no short-month or comma-free month formatter.
 */
const TIME_ZONE = 'Asia/Tashkent';
const cache = new Map<string, Intl.DateTimeFormat>();

function part(
  date: Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
  type: Intl.DateTimeFormatPartTypes,
): string {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: TIME_ZONE });
    cache.set(key, formatter);
  }
  return formatter.formatToParts(date).find((p) => p.type === type)?.value ?? '';
}

/** `Nov` / `Noy`. */
export const monthShort = (date: Date, locale: Locale): string =>
  part(date, locale, { month: 'short' }, 'month').replace(/\.$/, '');

/** `November` / `noyabr`. */
export const monthLong = (date: Date, locale: Locale): string =>
  part(date, locale, { month: 'long' }, 'month');

/** `2026`. */
export const year = (date: Date, locale: Locale): string =>
  part(date, locale, { year: 'numeric' }, 'year');

/** `2026-11` in Tashkent time, for `<time datetime>` on a month. */
export const isoMonth = (date: Date): string =>
  `${part(date, 'en', { year: 'numeric' }, 'year')}-${part(date, 'en', { month: '2-digit' }, 'month')}`;

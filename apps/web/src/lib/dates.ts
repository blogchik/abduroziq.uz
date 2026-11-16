import type { Locale } from '@/i18n';

/** All site dates are shown in Tashkent time so the day never shifts with the build machine. */
const TIME_ZONE = 'Asia/Tashkent';

type Formatter = (date: Date, locale: Locale) => string;

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let instance = cache.get(key);
  if (!instance) {
    instance = new Intl.DateTimeFormat(locale, { ...options, timeZone: TIME_ZONE });
    cache.set(key, instance);
  }
  return instance;
}

/** Short weekday: `Thu` / `Pay`. */
export const formatWeekdayShort: Formatter = (date, locale) =>
  formatter(locale, { weekday: 'short' }).format(date);

/** Day of the month, no padding: `12`. */
export const formatDay: Formatter = (date, locale) =>
  formatter(locale, { day: 'numeric' }).format(date);

/** Month and year: `November 2026` / `noyabr, 2026`. */
export const formatMonthYear: Formatter = (date, locale) =>
  formatter(locale, { month: 'long', year: 'numeric' }).format(date);

/** Full date: `November 12, 2026` / `12-noyabr, 2026`. */
export const formatDate: Formatter = (date, locale) =>
  formatter(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

/** `YYYY-MM-DD` in Tashkent time, for `<time datetime>`. */
export function isoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** `YYYY-MM` in Tashkent time: the key posts are grouped under on the blog index. */
export function monthKey(date: Date): string {
  return isoDate(date).slice(0, 7);
}

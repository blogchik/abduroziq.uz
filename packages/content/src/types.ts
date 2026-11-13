import type { Locale } from './locales';

export type { Locale };
export type Localized<T = string> = Record<Locale, T>;

/**
 * One piece of the hero statement: words, or the capsule (a small accent pill set on the line
 * after his name; the page rolls drawn glyphs of his work through it). Joined in order, the
 * `value`s read as the plain sentence. `quiet` words are set in the soft ink: the sentence
 * leads with who he is and lets the rest step back. The capsule stays on one line with
 * whatever touches it without a space.
 */
export type SentencePart = { kind: 'text'; value: string; quiet?: boolean } | { kind: 'capsule' };

export interface Profile {
  name: string; // "Abduroziq"
  fullName: string; // "Jabborov Abduroziq"
  email: string;
  role: Localized;
  tagline: string; // "Think beyond limits."
  location: {
    city: Localized;
    country: Localized;
    lat: number;
    lon: number;
    timeZone: string;
  };
  sentence: Localized<SentencePart[]>;
  summary: Localized; // one line about him, for structured data
  about: Localized<{ text: string; strong?: boolean }[][]>; // paragraphs of spans
  facts: { id: string; label: Localized; value: Localized }[];
  agentTag: string; // "AI agent": the name tag of the second cursor in the hero
  desk: { stickyNote: string; polaroidCaption: string; pialaNote: Localized };
  socials: {
    id: 'github' | 'telegram' | 'linkedin' | 'instagram';
    label: string;
    handle: string;
    href: string;
  }[];
}

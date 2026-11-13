import type { Locale } from './locales';

export type { Locale };
export type Localized<T = string> = Record<Locale, T>;

/**
 * One piece of the hero statement: words, or the eyes (a drawn stand-in for the author, set
 * on the line after his name). Joined in order, the `value`s read as the plain sentence.
 * The eyes stay on one line with whatever touches them without a space.
 */
export type SentencePart = { kind: 'text'; value: string } | { kind: 'eyes' };

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

export interface Project {
  id: string;
  name: string;
  year: string;
  description: Localized;
  role: Localized;
  status: 'live' | 'design' | 'planned';
  url?: string;
  colors: [background: string, foreground: string];
  glyph: string; // one or two characters drawn on the ticket preview
}

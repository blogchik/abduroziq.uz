import type { Locale } from './locales';

export type { Locale };
export type Localized<T = string> = Record<Locale, T>;

export type SentencePart =
  | { kind: 'text' | 'em'; value: string }
  | { kind: 'capsule'; id: 'portrait' | 'craft' | 'tashkent' }
  | { kind: 'break' };

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
  support: Localized;
  about: Localized<{ text: string; strong?: boolean }[][]>; // paragraphs of spans
  facts: { id: string; label: Localized; value: Localized }[];
  labelStrip: { instructions: string; role: string; madeIn: string }; // decorative, English
  desk: {
    stickyNote: string;
    polaroidCaption: string;
    ticket: string;
    keycap: string;
    pialaNote: Localized;
    cursorFlag: string;
  };
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

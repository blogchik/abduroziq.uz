import type { Locale } from './locales';

export type { Locale };
export type Localized<T = string> = Record<Locale, T>;

/**
 * One piece of the hero statement. Joined in order, the `value`s read as the plain sentence
 * (chips carry no text). Spaces are written in the text parts: a chip stays on one line
 * with whatever touches it without a space, so the space goes on its other side.
 *  - `text`: words; `ring` draws a hand-drawn ellipse around them.
 *  - `chip`: a small living drawing set on the line (`eyes` follows the pointer, `design` is
 *    an interface frame with a multiplayer cursor, `build` a terminal line).
 *  - `star`: one letter that is drawn as the turning starburst; the letter stays in the text.
 */
export type SentencePart =
  | { kind: 'text'; value: string; ring?: boolean }
  | { kind: 'chip'; id: 'eyes' | 'design' | 'build' }
  | { kind: 'star'; value: string };

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

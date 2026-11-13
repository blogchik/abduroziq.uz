/**
 * Keeps one-letter words (a, I, и, o, ...) with the word that follows by turning the space
 * after them into a no-break space, so a heading never ends a line on a stranded "a".
 * Applied at render time to titles; the stored titles stay plain text.
 */
export function keepShortWordsTogether(text: string): string {
  return text.replace(/(^|\s)(\p{L})\s+(?=\S)/gu, '$1$2 ');
}

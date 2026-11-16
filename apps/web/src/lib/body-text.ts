/**
 * The readable text of an MDX post body: without import/export lines, fenced code, JSX tags
 * and Markdown punctuation. Word count (structured data) and reading time both use it, so
 * the two never disagree because of MDX syntax.
 */
export function bodyText(body: string | undefined): string {
  return (body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*(import|export)\s.*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~[\]()!|-]+/g, ' ');
}

/** Number of words in the readable text, or `undefined` when there is none. */
export function countWords(body: string | undefined): number | undefined {
  const words = bodyText(body)
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  return words.length > 0 ? words.length : undefined;
}

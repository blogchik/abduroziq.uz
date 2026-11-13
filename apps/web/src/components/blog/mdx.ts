import Figure from './Figure.astro';
import H2 from './H2.astro';
import H3 from './H3.astro';
import H4 from './H4.astro';
import Img from './Img.astro';
import Link from './Link.astro';
import Note from './Note.astro';
import Pre from './Pre.astro';
import PullQuote from './PullQuote.astro';
import Table from './Table.astro';

/**
 * The MDX element mapping for posts: `<Content components={mdxComponents} />`.
 * Standard elements are replaced by the components above; `Figure`, `Note` and `PullQuote`
 * are available in every post without an import. Remark and rehype plugins do not work with
 * Astro 7's Satteri processor, so this mapping is how the output is shaped.
 */
export const mdxComponents = {
  a: Link,
  img: Img,
  pre: Pre,
  h2: H2,
  h3: H3,
  h4: H4,
  table: Table,
  Figure,
  Note,
  PullQuote,
};

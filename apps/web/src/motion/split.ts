/**
 * SplitText, loaded lazily: only pages with text reveals (or page scripts that use
 * `splitLines`) download it. A failed download is not cached: the next call tries again.
 *
 * Splits use `aria: 'none'`: SplitText's default puts an `aria-label` on the element and
 * hides the pieces, which is not allowed on a paragraph (assistive tech would read
 * nothing). The pieces are plain inline wrappers, so the text reads as it is.
 */
import type { SplitText as SplitTextClass } from 'gsap/SplitText';
import { currentPage, gsap, inPage, isCurrent } from './core';

type SplitTextCtor = typeof SplitTextClass;

let SplitText: SplitTextCtor | undefined;
let loading: Promise<SplitTextCtor> | undefined;

export function loadSplitText(): Promise<SplitTextCtor> {
  if (SplitText) return Promise.resolve(SplitText);
  loading ??= import('gsap/SplitText').then(
    (mod) => {
      gsap.registerPlugin(mod.SplitText);
      SplitText = mod.SplitText;
      return mod.SplitText;
    },
    (error: unknown) => {
      loading = undefined;
      throw error;
    },
  );
  return loading;
}

export function getSplitText(): SplitTextCtor | undefined {
  return SplitText;
}

export interface LineSplit {
  lines: Element[];
  revert(): void;
}

/**
 * Splits an element into masked lines for a page-specific timeline. Call it from an
 * `onPageEnter` callback: it loads SplitText when needed, then splits the element and calls
 * `use` with the lines, inside the page's context, so the split and whatever `use` creates
 * (tweens, ScrollTriggers) are reverted when the page is left (the split earlier with
 * `revert()`). `use` does not run when the page has been left by then, or when SplitText
 * cannot be loaded: the text then stays as written.
 */
export function splitLines(el: Element, use: (split: LineSplit) => void): void {
  const page = currentPage();
  loadSplitText().then(
    (SplitTextCtor) => {
      if (!isCurrent(page)) return;
      inPage(() => {
        try {
          const split = SplitTextCtor.create(el, {
            type: 'lines',
            mask: 'lines',
            linesClass: 'm-line',
            aria: 'none',
          });
          use({
            lines: split.lines,
            revert() {
              split.revert();
            },
          });
        } catch (error) {
          console.error('[motion] splitLines failed', error);
        }
      });
    },
    (error: unknown) => {
      console.error('[motion] SplitText unavailable', error);
    },
  );
}

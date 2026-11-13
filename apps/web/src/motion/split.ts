/**
 * SplitText, loaded lazily: only pages with text reveals (or page scripts that use
 * `splitLines`) download it. A failed download is not cached: the next call tries again.
 *
 * Splits use `aria: 'none'`: SplitText's default puts an `aria-label` on the element and
 * hides the pieces, which is not allowed on a paragraph (assistive tech would read
 * nothing). The pieces are plain inline wrappers, so the text reads as it is.
 */
import type { SplitText as SplitTextClass } from 'gsap/SplitText';
import { gsap } from './core';

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

/**
 * Splits an element into masked lines for a page-specific timeline. Call it from an
 * `onPageEnter` callback (the kit has loaded SplitText by then); the split is reverted
 * automatically when the page is left, or earlier with `revert()`.
 */
export function splitLines(el: Element): { lines: Element[]; revert(): void } {
  if (!SplitText) {
    throw new Error('[motion] splitLines() needs SplitText: call it inside onPageEnter().');
  }
  const split = SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'm-line',
    aria: 'none',
  });
  return {
    lines: split.lines,
    revert() {
      split.revert();
    },
  };
}

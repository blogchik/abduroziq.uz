/**
 * Motion kit entry (docs/ARCHITECTURE.md section 7). Markup opts in through data
 * attributes; see README.md in this folder for the reference.
 *
 * This module is bundled once and never re-executes during client-side navigation, so all
 * per-page work hangs off the `astro:*` events: everything a page creates lives in one
 * `gsap.context` plus a list of cleanups and is released on `astro:before-swap`. The cursor,
 * the transition panel, Lenis and the scroll listener persist for the session.
 *
 * Switching motion while a page is open (the footer's motion switch dispatches `site:motion`
 * after updating `data-motion`) releases the page and enters it again in the new mode:
 * cursor, smooth scrolling, marquees, reveals and page callbacks follow at once, and
 * nothing already on screen replays its entrance (the new page context has `late: true`).
 *
 * Public exports (keep them stable): `onPageEnter`, `prefersReducedMotion`, `splitLines`,
 * `afterGate`, the motion tokens (`dur`, `ease`, `cssEase`), `gsap`, `ScrollTrigger`.
 * Page code imports from this entry only, never from the kit's internal modules.
 */
import { reveal } from './config';
import {
  beginPage,
  currentPage,
  endPage,
  gsap,
  inPage,
  isCurrent,
  prefersReducedMotion,
  ScrollTrigger,
  track,
} from './core';
import { refreshCursorTarget, restoreCursor, updateCursor, watchCursorConditions } from './cursor';
import { initDesks } from './desk';
import { initFollowers } from './follower';
import { initMagnetic } from './magnetic';
import { initMarquees } from './marquee';
import { initProgress } from './progress';
import { initReveals } from './reveal';
import { applyScrollState } from './root-state';
import {
  destroySmoothScroll,
  initSmoothScroll,
  pauseSmoothScroll,
  resumeSmoothScroll,
  syncSmoothScroll,
} from './smooth-scroll';
import { loadSplitText, splitLines } from './split';
import { finishTransition, installTransitions, restorePanel } from './transition';

type Cleanup = () => void;
/**
 * `first` is true only for the document's initial page (not for client-side navigations);
 * `late` is true when that initial load was slow enough for the CSS failsafe to have shown
 * the page already, or when the page is entered again after a switch of the motion mode, so
 * entrance choreography should be skipped.
 */
type PageContext = { reduced: boolean; first: boolean; late: boolean };
type PageEnterCallback = (ctx: PageContext) => void | Cleanup;

const callbacks = new Set<PageEnterCallback>();
let entered = false;
let firstLoad = true;
let pageFirst = false;
let pageLate = false;

/** SplitText is ready before page callbacks run, so they can call `splitLines`. */
async function callbacksReady(): Promise<void> {
  try {
    await loadSplitText();
  } catch (error) {
    console.error('[motion] SplitText unavailable', error);
  }
}

function run(cb: PageEnterCallback): void {
  const page = currentPage();
  void callbacksReady().then(() => {
    if (!isCurrent(page)) return;
    try {
      // Keep the cleanup out of gsap.context's own revert list, or it would run twice.
      let cleanup: void | Cleanup = undefined;
      inPage(() => {
        cleanup = cb({ reduced: prefersReducedMotion(), first: pageFirst, late: pageLate });
      });
      if (typeof cleanup === 'function') track(cleanup);
    } catch (error) {
      console.error('[motion] onPageEnter callback failed', error);
    }
  });
}

/**
 * Runs `cb` on every page load (first load and after each client-side navigation), inside
 * the page's `gsap.context`: tweens, ScrollTriggers and splits it creates are reverted when
 * the page is left. A function returned from `cb` also runs then. Callbacks are global for
 * the session, so return early when your elements are not on the page.
 */
export function onPageEnter(cb: PageEnterCallback): void {
  if (callbacks.has(cb)) return;
  callbacks.add(cb);
  if (entered) run(cb);
}

function step(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.error(`[motion] ${name} failed`, error);
  }
}

function enter(again = false): void {
  if (entered) return;
  entered = true;
  const reduced = prefersReducedMotion();
  // On a very slow first load the CSS failsafe has already shown the page; after a switch of
  // the motion mode the visitor is in the middle of the page and nothing should replay.
  const late = again || (firstLoad && performance.now() > reveal.failsafeMs - 150);
  pageFirst = firstLoad;
  pageLate = late;
  firstLoad = false;

  beginPage();
  applyScrollState();
  updateCursor();
  refreshCursorTarget();
  void initSmoothScroll();

  inPage(() => {
    step('reveals', () => initReveals(reduced, late));
    step('marquee', () => initMarquees(reduced));
    step('desk', () => initDesks(reduced, late));
    step('follower', () => initFollowers(reduced));
    step('progress', () => initProgress());
    step('magnetic', () => initMagnetic(reduced));
  });
  for (const cb of callbacks) run(cb);
  ScrollTrigger.refresh();
  finishTransition();
}

function leave(): void {
  if (!entered) return;
  entered = false;
  endPage();
}

function afterSwap(): void {
  applyScrollState(true);
  restoreCursor();
  restorePanel();
  syncSmoothScroll();
}

/** The motion mode changed on this page (`data-motion` is already updated). */
function onMotionChange(): void {
  if (!entered) return;
  leave();
  if (prefersReducedMotion()) destroySmoothScroll();
  enter(true);
}

function onMenu(event: Event): void {
  const open = (event as CustomEvent<{ open?: boolean }>).detail?.open;
  if (open) pauseSmoothScroll();
  else resumeSmoothScroll();
}

installTransitions();
watchCursorConditions();
document.addEventListener('astro:page-load', () => enter());
document.addEventListener('astro:before-swap', leave);
document.addEventListener('astro:after-swap', afterSwap);
document.addEventListener('site:menu', onMenu);
document.addEventListener('site:motion', onMotionChange);

// The first `astro:page-load` can fire before or after this module runs; `enter` is
// idempotent per page.
if (document.readyState !== 'loading') enter();
else document.addEventListener('DOMContentLoaded', () => enter(), { once: true });

export { afterGate } from './core';
export { cssEase, dur, ease } from './config';
export { gsap, prefersReducedMotion, ScrollTrigger, splitLines };

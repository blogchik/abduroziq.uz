/**
 * Smooth scrolling: one Lenis instance for the session, driven by `gsap.ticker` and synced
 * with ScrollTrigger. Loaded lazily and only for fine pointers with full motion. Light by
 * design: a tight lerp, normal wheel speed, native touch.
 *
 * Same-page anchors (`#building`, `#top`) glide as well, with or without Lenis: see
 * `installAnchorGlide`.
 */
import type Lenis from 'lenis';
import { smooth } from './config';
import { finePointer, gsap, prefersReducedMotion, ScrollTrigger } from './core';

let lenis: Lenis | undefined;
let loading: Promise<void> | undefined;
let raf: ((time: number) => void) | undefined;

/**
 * Creates the instance on the first page that wants it; later calls are no-ops. A failed
 * download is not cached: the next page tries again.
 */
export function initSmoothScroll(): Promise<void> {
  if (lenis || loading) return loading ?? Promise.resolve();
  if (prefersReducedMotion() || !finePointer()) return Promise.resolve();
  loading = import('lenis')
    .then(({ default: LenisClass }) => {
      loading = undefined;
      // Motion may have been switched off while the chunk was loading.
      if (prefersReducedMotion() || !finePointer()) return;
      lenis = new LenisClass({
        lerp: smooth.lerp,
        wheelMultiplier: smooth.wheelMultiplier,
        smoothWheel: true,
        syncTouch: false,
        // Anchors are the router's (see `installAnchorGlide`): Lenis would measure the target
        // after the browser's jump and add its own stale position to it.
        anchors: false,
        autoRaf: false,
        // Nested scrollers (code blocks, menus) keep their own native scrolling.
        allowNestedScroll: true,
        // The kit decides from `data-motion` (the footer's switch can turn motion on over a
        // system preference); Lenis must not make scrolling instant on its own.
        respectReducedMotion: false,
      });
      lenis.on('scroll', ScrollTrigger.update);
      raf = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    })
    .catch((error: unknown) => {
      loading = undefined;
      console.error('[motion] smooth scroll unavailable', error);
    });
  return loading;
}

/** Removes smooth scrolling (motion switched off); `initSmoothScroll` can create it again. */
export function destroySmoothScroll(): void {
  if (!lenis) return;
  if (raf) gsap.ticker.remove(raf);
  raf = undefined;
  lenis.destroy();
  lenis = undefined;
  // Back to GSAP's default lag smoothing (500ms threshold, 33ms adjusted lag).
  gsap.ticker.lagSmoothing(500, 33);
  document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
}

/** Holds the page still (the mobile menu sheet is open). */
export function pauseSmoothScroll(): void {
  lenis?.stop();
}

export function resumeSmoothScroll(): void {
  lenis?.start();
}

/**
 * After a swap: Astro has already moved the window (top for a new page, the saved position
 * for back/forward), so Lenis adopts that position instead of animating to its old one.
 * Astro also replaced the <html> attributes, so the `lenis` class is restored. Lenis measures
 * the new page first: it clamps a position to the scroll limit it knows, and the previous
 * page's limit would pull a restored position on a longer page back up.
 */
export function syncSmoothScroll(): void {
  if (!lenis) return;
  lenis.start();
  lenis.resize();
  lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  // Lenis only rewrites its classes on state changes; the base class is the one that matters.
  document.documentElement.classList.add('lenis');
}

/** Where the page was when a same-page anchor was clicked; set only during that click. */
let anchorFrom: number | undefined;

/** Capture phase, before the router: note where a same-page anchor is clicked from. */
function onAnchorCapture(event: MouseEvent): void {
  anchorFrom = undefined;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(anchor instanceof HTMLAnchorElement) || !anchor.hash) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (
    anchor.origin !== location.origin ||
    anchor.pathname !== location.pathname ||
    anchor.search !== location.search
  ) {
    return;
  }
  anchorFrom = window.scrollY;
}

/** Bubble phase on the window, after the router: glide to where the browser has jumped. */
function onAnchorBubble(): void {
  const from = anchorFrom;
  anchorFrom = undefined;
  if (from === undefined || prefersReducedMotion()) return;
  const to = window.scrollY;
  if (Math.abs(to - from) < 2) return;
  // Held still (the menu sheet is open): the jump stands.
  if (lenis?.isStopped) return;
  // Back to where the click happened, then on to where the browser had jumped.
  window.scrollTo({ top: from, behavior: 'instant' });
  if (lenis) {
    // Ends a glide that was still running; a no-op when Lenis is already at rest there.
    lenis.scrollTo(from, { immediate: true, force: true });
    lenis.scrollTo(to, { duration: smooth.anchorDuration, easing: smooth.anchorEase });
  } else {
    window.scrollTo({ top: to, behavior: 'smooth' });
  }
}

let anchorsInstalled = false;
/**
 * Same-page anchors (`#building`, `#top`). The router owns the navigation: inside the click
 * it adds the history entry and lets the browser jump to the fragment, so the address, the
 * history, the focus position and the destination itself (`scroll-padding-top`,
 * `scroll-margin`) are the browser's own. The kit only adds the glide: once the router is
 * done, it puts the page back where the click happened and scrolls it to where the browser
 * had jumped. Both happen in the click's own task, so the jump is never painted. Under
 * reduced motion the jump stands.
 */
export function installAnchorGlide(): void {
  if (anchorsInstalled) return;
  anchorsInstalled = true;
  document.addEventListener('click', onAnchorCapture, { capture: true });
  window.addEventListener('click', onAnchorBubble);
}

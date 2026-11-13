/**
 * Smooth scrolling: one Lenis instance for the session, driven by `gsap.ticker` and synced
 * with ScrollTrigger. Loaded lazily and only for fine pointers with full motion. Light by
 * design: a tight lerp, normal wheel speed, native touch.
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
        anchors: true,
        autoRaf: false,
        // Nested scrollers (code blocks, menus) keep their own native scrolling.
        allowNestedScroll: true,
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
 * Astro also replaced the <html> attributes, so the `lenis` class is restored.
 */
export function syncSmoothScroll(): void {
  if (!lenis) return;
  lenis.start();
  lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  lenis.resize();
  // Lenis only rewrites its classes on state changes; the base class is the one that matters.
  document.documentElement.classList.add('lenis');
}

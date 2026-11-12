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

/** Creates the instance on the first page that wants it; later calls are no-ops. */
export function initSmoothScroll(): Promise<void> {
  if (lenis || loading) return loading ?? Promise.resolve();
  if (prefersReducedMotion() || !finePointer()) return Promise.resolve();
  loading = import('lenis')
    .then(({ default: LenisClass }) => {
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
      gsap.ticker.add((time) => lenis?.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    })
    .catch((error: unknown) => {
      console.error('[motion] smooth scroll unavailable', error);
    });
  return loading;
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

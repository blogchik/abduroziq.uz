/**
 * The hero's client side: the time in Tashkent and the small entrance at the statement
 * (DESIGN 7.1).
 *
 * The sentence (the page's `h1` and its largest paint) and the action are never hidden or
 * moved: they are painted with the first frame and stay as written. The only thing that
 * enters here is the eyes, which pop with the spring after 100ms; the name is revealed by
 * the motion kit (`data-reveal`) and the dots of the meeting by `meeting.ts`.
 *
 * The eyes are held back by CSS (Hero.astro) until this module applies their start pose and
 * marks the hero `data-hero-ready`. Without JavaScript, under reduced motion, or when the
 * CSS failsafe has already shown them, they stay as written.
 */
import { afterGate, dur, ease, gsap, onPageEnter } from '@/motion';

declare global {
  interface Window {
    /** Defined by the inline script in Hero.astro: writes the time. */
    __heroNow?: (hero: HTMLElement) => void;
  }
}

/** The CSS failsafe in Hero.astro shows the eyes after this long (keep in sync). */
const FAILSAFE_MS = 2500;
/** How long after its end an entrance without frames is completed by hand. */
const WATCHDOG_MS = 600;

/** Keeps the clock current, minute by minute; returns the function that stops it. */
function keepTime(hero: HTMLElement): () => void {
  let timer = 0;
  const tick = (): void => {
    window.__heroNow?.(hero);
    // Again just after the next full minute.
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  };
  tick();
  return () => window.clearTimeout(timer);
}

/** Marks the hero while it is off screen, so its CSS loops can pause. */
function watchVisibility(hero: HTMLElement): () => void {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry) hero.toggleAttribute('data-offscreen', !entry.isIntersecting);
  });
  observer.observe(hero);
  return () => {
    observer.disconnect();
    hero.removeAttribute('data-offscreen');
  };
}

onPageEnter(({ reduced, first, late }) => {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const stopClock = keepTime(hero);
  const stopWatching = watchVisibility(hero);
  const cleanup = (): void => {
    stopClock();
    stopWatching();
  };

  // Shown as written: reduced motion, a first load so slow that the CSS failsafe has
  // revealed the page (the kit's `late`, or the failsafe passing while the kit got ready),
  // or a hero already scrolled past (history restore).
  const eyes = hero.querySelector<HTMLElement>('[data-hero-eyes]');
  const failsafePassed = first && performance.now() > FAILSAFE_MS - 100;
  if (!eyes || reduced || late || failsafePassed || hero.getBoundingClientRect().bottom < 0) {
    hero.setAttribute('data-hero-ready', '');
    return cleanup;
  }

  // The pose is applied now (after a client-side navigation the transition panel still
  // covers the page); from here on the eyes are hidden by it, no longer by the CSS hold.
  gsap.set(eyes, { scale: 0 });
  hero.setAttribute('data-hero-ready', '');
  const entrance = gsap.to(eyes, {
    scale: 1,
    duration: dur[3],
    ease: ease.springSoft,
    delay: 0.1,
    paused: true,
    onComplete: () => gsap.set(eyes, { clearProps: 'transform' }),
  });

  // The pop plays once the panel has left. Where it cannot be seen (a hidden tab) it is
  // completed at once, and a watchdog completes it when no animation frame has run by the
  // time it should have ended (a view that is not painting).
  let watchdog = 0;
  afterGate(() => {
    if (document.visibilityState === 'hidden') {
      entrance.progress(1);
      return;
    }
    entrance.play();
    const frame = gsap.ticker.frame;
    watchdog = window.setTimeout(
      () => {
        if (gsap.ticker.frame === frame && entrance.progress() < 1) entrance.progress(1);
      },
      (entrance.duration() + entrance.delay()) * 1000 + WATCHDOG_MS,
    );
  });
  return () => {
    window.clearTimeout(watchdog);
    cleanup();
  };
});

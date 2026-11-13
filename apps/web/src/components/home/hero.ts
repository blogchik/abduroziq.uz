/**
 * The hero's client side: the live data and the entrance around the statement (DESIGN 7.1).
 *
 * The sentence (the page's `h1` and its largest paint), the supporting line and the actions
 * are never hidden or moved: they are painted with the first frame and stay as written.
 * The entrance is spent on the decoration around them:
 *   0.10  the three chips pop with the spring, 110ms apart
 *   0.55  the ring draws itself around its word
 *   0.95  the starburst pops into its letter (and keeps turning, in CSS)
 * The meta chips and the name are revealed by the motion kit (`data-reveal`), the dots of
 * the meeting by `meeting.ts`; the whole sequence is over after about 1.8s.
 *
 * The chips, the ring and the starburst are held back by CSS (Hero.astro) until this module
 * applies their start poses and marks the hero `data-hero-ready`. Without JavaScript, under
 * reduced motion, or when the CSS failsafe has already shown them, everything stays as
 * written.
 */
import { afterGate, dur, ease, gsap, onPageEnter } from '@/motion';

declare global {
  interface Window {
    /** Defined by the inline script in Hero.astro: paints sky, clock and month. */
    __heroNow?: (hero: HTMLElement) => void;
  }
}

/** The CSS failsafe in Hero.astro shows the held parts after this long (keep in sync). */
const FAILSAFE_MS = 2500;
/** How long after its end an entrance without frames is completed by hand. */
const WATCHDOG_MS = 600;
const CHIP_STAGGER = 0.11;

function all(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

/** Keeps the clock, the month and the sky current; returns the function that stops it. */
function keepTime(hero: HTMLElement): () => void {
  const tick = (): void => window.__heroNow?.(hero);
  tick();
  let interval = 0;
  // Start on the next full second so the display changes when the second does.
  const timeout = window.setTimeout(
    () => {
      tick();
      interval = window.setInterval(tick, 1000);
    },
    1000 - (Date.now() % 1000),
  );
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
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

/** Applies the start poses and returns the paused entrance. */
function buildEntrance(hero: HTMLElement): gsap.core.Timeline {
  const chips = all(hero, '[data-hero-statement] [data-chip]');
  const ring = all(hero, '[data-hero-ring]');
  const star = all(hero, '.star-o__burst');

  gsap.set(chips, { scale: 0 });
  gsap.set(ring, { strokeDashoffset: 1 });
  gsap.set(star, { scale: 0 });
  // From here on the parts are hidden by their poses, no longer by the CSS hold.
  hero.setAttribute('data-hero-ready', '');

  // Each part goes back to the markup as written when it is done.
  const entrance = gsap.timeline({
    paused: true,
    onComplete: () => {
      gsap.set([...chips, ...star], { clearProps: 'transform' });
      gsap.set(ring, { clearProps: 'strokeDashoffset' });
    },
  });
  entrance
    .to(chips, { scale: 1, duration: dur[3], ease: ease.springSoft, stagger: CHIP_STAGGER }, 0.1)
    .to(ring, { strokeDashoffset: 0, duration: dur[3], ease: ease.inOut }, 0.55)
    .to(star, { scale: 1, duration: dur[3], ease: ease.springSoft }, 0.95);
  return entrance;
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
  const failsafePassed = first && performance.now() > FAILSAFE_MS - 100;
  if (reduced || late || failsafePassed || hero.getBoundingClientRect().bottom < 0) {
    hero.setAttribute('data-hero-ready', '');
    return cleanup;
  }

  // The poses are applied now (after a client-side navigation the transition panel still
  // covers the page); the entrance plays once the panel has left. Where it cannot be seen
  // (a hidden tab) it is completed at once, and a watchdog completes it when no animation
  // frame has run by the time it should have ended (a view that is not painting): the CSS
  // failsafe no longer covers parts this module has taken over.
  const entrance = buildEntrance(hero);
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
      entrance.totalDuration() * 1000 + WATCHDOG_MS,
    );
  });
  return () => {
    window.clearTimeout(watchdog);
    cleanup();
  };
});

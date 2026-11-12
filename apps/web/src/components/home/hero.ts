/**
 * The hero's client side: the entrance sequence (DESIGN 7.1) and the live data.
 *
 * The sentence (the page's `h1` and its largest paint) is never hidden or moved: it is
 * painted with the first frame and stays as written. The entrance is spent around it:
 *   0.30  the capsules pop in with the spring (120ms stagger); the supporting line rises
 *         from behind its mask
 *   0.50  the name's letters rise from the baseline (35ms stagger, dur-4)
 *   0.90  the label strip's print wipes in from the left; the meta bar rises
 *   0.75  (the desk objects drop in: the motion kit's `data-desk-entrance` in Hero.astro)
 * The name and the strip join the timeline only when they are on screen at that moment;
 * on a short viewport they start below the fold and play when they are scrolled to.
 *
 * Only the strip's print and the meta bar are held back by CSS (Hero.astro) until this
 * module applies their start poses and marks the hero `data-hero-ready`. The capsules, the
 * supporting line and the name are painted as written and only offset here, so the worst
 * case is text that is simply already there. Nothing waits for fonts: no line is measured.
 * Without JavaScript, under reduced motion, or when the CSS failsafe has already shown the
 * page, everything stays as written.
 */
import { afterGate, dur, ease, gsap, onPageEnter, ScrollTrigger } from '@/motion';

declare global {
  interface Window {
    /** Defined by the inline script in Hero.astro: paints sky, clock, month and year. */
    __heroNow?: (hero: HTMLElement) => void;
  }
}

/** DESIGN 7.1 and 7.2: masked parts rise this far (percent of their height). */
const MASK_OFFSET = 110;
const CHAR_STAGGER = 0.035;
const RISE = 16;
/** Same start as the kit's scroll reveals. */
const BELOW_FOLD_START = 'top 88%';
/** The CSS failsafe in Hero.astro shows the held parts after this long (keep in sync). */
const FAILSAFE_MS = 2500;

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
  return () => observer.disconnect();
}

/**
 * Puts `segment` on the entrance at `at` seconds when `trigger` is on screen; a part that
 * starts below the fold plays when it is scrolled to instead (nothing animates unseen).
 */
function schedule(
  entrance: gsap.core.Timeline,
  segment: gsap.core.Timeline,
  trigger: Element | undefined,
  at: number,
): void {
  if (!trigger) return;
  if (trigger.getBoundingClientRect().top < window.innerHeight * 0.9) {
    entrance.add(segment.paused(false), at);
    return;
  }
  ScrollTrigger.create({
    trigger,
    start: BELOW_FOLD_START,
    once: true,
    onEnter: () => afterGate(() => segment.play()),
  });
}

/** Applies the start poses and returns the paused entrance. */
function buildEntrance(hero: HTMLElement): gsap.core.Timeline {
  const capsules = all(hero, '[data-hero-sentence] [data-capsule]');
  const support = all(hero, '[data-hero-support]');
  const name = all(hero, '[data-hero-part="name"]');
  const letters = all(hero, '[data-hero-part="name"] [data-giant-letter]');
  const strip = all(hero, '[data-hero-strip]');
  const print = all(hero, '[data-strip-part]');
  const meta = all(hero, '[data-hero-part="meta"]');

  gsap.set(capsules, { scale: 0 });
  gsap.set(support, { yPercent: MASK_OFFSET });
  gsap.set(letters, { yPercent: MASK_OFFSET });
  // The held parts: CSS hides them by opacity until `data-hero-ready`; from here on the
  // print is hidden by its wipe instead.
  gsap.set(print, { opacity: 1, clipPath: 'inset(0% 100% 0% 0%)' });
  gsap.set(meta, { opacity: 0, y: RISE });
  hero.setAttribute('data-hero-ready', '');

  // Each part goes back to the markup as written when it is done. Only the properties set
  // here are cleared: the capsules carry their own inline width.
  const clear = (targets: HTMLElement[]) => () =>
    gsap.set(targets, { clearProps: 'transform,opacity,clipPath' });

  const entrance = gsap.timeline({ paused: true, onComplete: clear([...capsules, ...support]) });
  entrance
    .to(capsules, { scale: 1, duration: dur[4], ease: ease.spring, stagger: 0.12 }, 0.3)
    .to(support, { yPercent: 0, duration: dur[3], ease: ease.out }, 0.3);

  const nameIn = gsap.timeline({ paused: true, onComplete: clear(letters) }).to(letters, {
    yPercent: 0,
    duration: dur[4],
    ease: ease.out,
    stagger: CHAR_STAGGER,
  });
  schedule(entrance, nameIn, name[0], 0.5);

  const stripIn = gsap
    .timeline({ paused: true, onComplete: clear([...print, ...meta]) })
    .to(print, { clipPath: 'inset(0% 0% 0% 0%)', duration: dur[2], ease: ease.inOut, stagger: 0.06 }, 0)
    .to(meta, { opacity: 1, y: 0, duration: dur[3], ease: ease.out }, 0.2);
  schedule(entrance, stripIn, strip[0], 0.9);

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
  // covers the page); the entrance plays once the panel has left.
  const entrance = buildEntrance(hero);
  afterGate(() => entrance.play());
  return cleanup;
});

/**
 * The piala gag: a click on a bowl (never a drag: the motion kit swallows the click after
 * one) drinks what is left, refills it, lets a little steam rise and counts the cup. The
 * count is kept per calendar day in localStorage and shared by every bowl on the page; where
 * storage is blocked it is kept in memory for the visit.
 */
import { dur, ease, gsap, onPageEnter } from '@/motion';

const KEY = 'cups';

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** The last count written, and its day: what counts when storage is blocked. */
let memory = { day: '', n: 0 };

function readCups(): number {
  const day = today();
  const kept = memory.day === day ? memory.n : 0;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null') as {
      day?: unknown;
      n?: unknown;
    } | null;
    if (stored && stored.day === day && typeof stored.n === 'number' && stored.n > 0) {
      return Math.max(kept, Math.floor(stored.n));
    }
  } catch {
    // Storage blocked or the value is not ours: the count in memory, if any.
  }
  return kept;
}

function writeCups(n: number): void {
  memory = { day: today(), n };
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: today(), n }));
  } catch {
    // The counter still works for this visit.
  }
}

onPageEnter(({ reduced }) => {
  const bowls = Array.from(document.querySelectorAll<HTMLElement>('[data-piala]'));
  if (bowls.length === 0) return;
  let cups = readCups();

  const render = (): void => {
    for (const bowl of bowls) {
      const count = bowl.querySelector('[data-piala-count]');
      if (count) count.textContent = String(cups);
      bowl.toggleAttribute('data-filled', cups > 0);
    }
  };
  render();

  function pour(bowl: HTMLElement, wasFilled: boolean): void {
    const tea = bowl.querySelector<HTMLElement>('[data-piala-tea]');
    const steam = bowl.querySelectorAll('[data-piala-steam]');
    if (!tea || reduced) return;
    gsap.killTweensOf([tea, steam]);
    // Drink what is left, then pour: the disc springs out to the wall of the bowl.
    gsap
      .timeline({ onComplete: () => gsap.set(tea, { clearProps: 'transform' }) })
      .fromTo(tea, { scale: wasFilled ? 1 : 0.4 }, { scale: 0.3, duration: dur[1], ease: ease.out })
      .to(tea, { scale: 1, duration: dur[3], ease: ease.spring });
    gsap.fromTo(
      steam,
      { opacity: 0, y: 8 },
      {
        keyframes: [
          { opacity: 0.9, y: -2, duration: dur[2], ease: ease.out },
          { opacity: 0, y: -16, duration: dur[3], ease: 'none' },
        ],
        delay: dur[2],
        stagger: 0.09,
      },
    );
  }

  const offs = bowls.map((bowl) => {
    const button = bowl.querySelector<HTMLElement>('[data-piala-button]');
    if (!button) return () => {};
    const onClick = (): void => {
      // The day may have changed since the page was opened.
      const wasFilled = bowl.hasAttribute('data-filled');
      cups = readCups() + 1;
      writeCups(cups);
      pour(bowl, wasFilled);
      render();
    };
    button.addEventListener('click', onClick);
    return () => button.removeEventListener('click', onClick);
  });

  return () => offs.forEach((off) => off());
});

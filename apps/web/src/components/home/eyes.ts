/**
 * The eyes in the first capsule of the hero sentence (SentenceCapsule.astro): they follow
 * the pointer, look around on their own while it rests (and on touch screens, where there
 * is no pointer to follow), and wink when clicked. Blinking is CSS. Without JavaScript or
 * under reduced motion they keep their static glance at the name.
 */
import { onPageEnter } from '@/motion';

/** Pointer distance, in pixels, at which a pupil reaches the rim of its eye. */
const REACH = 220;
/** How long the pointer must rest before the eyes start to wander. */
const REST_MS = 2600;
const WANDER_MS = 2100;
const WINK_MS = 420;

onPageEnter(({ reduced }) => {
  const root = document.querySelector<HTMLElement>('[data-eyes]');
  if (!root || reduced) return;

  const hero = root.closest<HTMLElement>('[data-hero]');
  const eyes = [...root.querySelectorAll<HTMLElement>('[data-eye]')];
  let lastMove = -Infinity;
  let winkTimer = 0;

  const aim = (eye: HTMLElement, x: number, y: number): void => {
    eye.style.setProperty('--look-x', x.toFixed(3));
    eye.style.setProperty('--look-y', y.toFixed(3));
  };

  const follow = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    lastMove = performance.now();
    root.removeAttribute('data-idle');
    for (const eye of eyes) {
      const box = eye.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const distance = Math.hypot(dx, dy);
      if (distance < 1) {
        aim(eye, 0, 0);
        continue;
      }
      const pull = Math.min(1, distance / REACH);
      aim(eye, (dx / distance) * pull, (dy / distance) * pull);
    }
  };

  const wander = (): void => {
    if (performance.now() - lastMove < REST_MS) return;
    if (document.hidden || hero?.hasAttribute('data-offscreen')) return;
    root.setAttribute('data-idle', '');
    const angle = Math.random() * Math.PI * 2;
    const pull = 0.35 + Math.random() * 0.65;
    // Both eyes look the same way; the vertical range is a little smaller.
    for (const eye of eyes) aim(eye, Math.cos(angle) * pull, Math.sin(angle) * pull * 0.7);
  };

  const wink = (): void => {
    root.setAttribute('data-wink', '');
    window.clearTimeout(winkTimer);
    winkTimer = window.setTimeout(() => root.removeAttribute('data-wink'), WINK_MS);
  };

  window.addEventListener('pointermove', follow, { passive: true });
  root.addEventListener('click', wink);
  const wanderTimer = window.setInterval(wander, WANDER_MS);

  return () => {
    window.removeEventListener('pointermove', follow);
    root.removeEventListener('click', wink);
    window.clearInterval(wanderTimer);
    window.clearTimeout(winkTimer);
    root.removeAttribute('data-idle');
    root.removeAttribute('data-wink');
  };
});

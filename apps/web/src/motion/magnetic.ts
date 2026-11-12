/**
 * Magnetic: `data-magnetic` (optional strength, default 0.25) pulls the element a little
 * toward the pointer while it is over it, and springs back on leave. Fine pointers with
 * full motion only. The kit owns the element's transform (put rotations on a child).
 */
import { dur, ease, magnetic as cfg } from './config';
import { finePointer, gsap, listen, num } from './core';

function setup(el: HTMLElement): void {
  const strength = num(el.dataset['magnetic'], cfg.strength);
  const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
  let back: gsap.core.Tween | undefined;

  listen(el, 'pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    back?.kill();
    back = undefined;
    const rect = el.getBoundingClientRect();
    // The element's own offset is part of the rect: measure from its resting centre.
    const cx = rect.left + rect.width / 2 - Number(gsap.getProperty(el, 'x'));
    const cy = rect.top + rect.height / 2 - Number(gsap.getProperty(el, 'y'));
    xTo((event.clientX - cx) * strength);
    yTo((event.clientY - cy) * strength);
  });
  listen(el, 'pointerleave', () => {
    // Created after the quickTo tweens, so it renders last and wins until a new move.
    back = gsap.to(el, { x: 0, y: 0, duration: dur[3], ease: ease.spring });
  });
}

export function initMagnetic(reduced: boolean): void {
  if (reduced || !finePointer()) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-magnetic]')) setup(el);
}

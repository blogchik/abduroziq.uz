/**
 * Progress: `data-progress` + `data-progress-target="<selector>"` sets `--progress` (0 to 1)
 * on the element while the target is scrolled through: 0 when its top reaches the top of
 * the viewport, 1 when its bottom reaches the bottom (or 1px later for a short target). `data-progress-start` and
 * `data-progress-end` take ScrollTrigger positions to change that. Active in both motion
 * modes: it reports state, it does not animate anything by itself.
 */
import { ScrollTrigger } from './core';

export function initProgress(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-progress]')) {
    const selector = el.dataset['progressTarget'];
    const target = selector ? document.querySelector(selector) : el;
    if (!target) continue;
    el.style.setProperty('--progress', '0');
    // Default end: 'bottom bottom', but never before the start (a target shorter than the
    // viewport would otherwise run backwards).
    const end =
      el.dataset['progressEnd'] ??
      (() => `+=${Math.max(1, (target as HTMLElement).offsetHeight - window.innerHeight)}`);
    ScrollTrigger.create({
      trigger: target,
      start: el.dataset['progressStart'] ?? 'top top',
      end,
      onUpdate(self) {
        el.style.setProperty('--progress', self.progress.toFixed(4));
      },
      onRefresh(self) {
        el.style.setProperty('--progress', self.progress.toFixed(4));
      },
    });
  }
}

/**
 * Follower preview: inside `data-follower-scope`, hovering or focusing a
 * `data-follower-item="<id>"` shows the `data-follower-panel` next to the pointer (soft lag,
 * tilt from velocity) with only its `data-follower-for="<id>"` child visible. Fine pointers
 * with full motion only; otherwise the panel stays hidden (motion.css).
 *
 * The panel sits 32px beside the pointer (further when the cursor shows a label), centred
 * on it vertically, and pivots on its near edge. It lags behind the pointer but never
 * slides under it: when a fast move would bring its near edge closer than the gap, the
 * edge is pushed along with the pointer.
 */
import { dur, ease, follower as cfg } from './config';
import { clamp, finePointer, gsap, listen } from './core';
import { cursorExtent } from './cursor';

/** Space between the pointer and the near edge of the panel, in px. */
const GAP = 32;

function setup(scope: HTMLElement): void {
  const panel = scope.querySelector<HTMLElement>('[data-follower-panel]');
  if (!panel) return;
  const children = Array.from(panel.querySelectorAll<HTMLElement>('[data-follower-for]'));

  const xTo = gsap.quickTo(panel, 'x', { duration: cfg.lag, ease: 'power3.out' });
  const yTo = gsap.quickTo(panel, 'y', { duration: cfg.lag, ease: 'power3.out' });
  const rTo = gsap.quickTo(panel, 'rotation', { duration: cfg.lag, ease: 'power3.out' });

  let current: string | null = null;
  let shown = false;
  let lastX = 0;
  let lastT = 0;

  gsap.set(panel, { autoAlpha: 0, scale: 0.92 });
  panel.setAttribute('data-follower-ready', '');

  let side: 'right' | 'left' = 'right';

  function target(clientX: number, clientY: number): { x: number; y: number; gap: number } {
    const w = panel!.offsetWidth;
    const h = panel!.offsetHeight;
    const gap = Math.max(GAP, cursorExtent() + 12);
    let x = clientX + gap;
    let next: typeof side = 'right';
    if (x + w > window.innerWidth - 8) {
      x = clientX - gap - w;
      next = 'left';
    }
    if (next !== side) {
      side = next;
      gsap.set(panel, { transformOrigin: side === 'right' ? '0% 50%' : '100% 50%' });
    }
    const y = clamp(clientY - h / 2, 8, Math.max(8, window.innerHeight - h - 8));
    return { x, y, gap };
  }

  /** Keeps the lagging panel from sliding under the pointer. */
  function keepClear(clientX: number, p: { x: number; gap: number }): void {
    const now = Number(gsap.getProperty(panel, 'x'));
    if (side === 'right' && now < clientX + p.gap) xTo(p.x, clientX + p.gap);
    else if (side === 'left' && now + panel!.offsetWidth > clientX - p.gap)
      xTo(p.x, clientX - p.gap - panel!.offsetWidth);
    else xTo(p.x);
  }

  function select(id: string): void {
    if (id === current) return;
    current = id;
    for (const child of children) {
      child.toggleAttribute('data-follower-current', child.dataset['followerFor'] === id);
    }
  }

  function show(id: string, clientX: number, clientY: number): void {
    select(id);
    const p = target(clientX, clientY);
    if (!shown) {
      shown = true;
      // Appear where the pointer is, then follow from there.
      gsap.set(panel, { x: p.x, y: p.y });
      xTo(p.x, p.x);
      yTo(p.y, p.y);
      gsap.to(panel, {
        autoAlpha: 1,
        scale: 1,
        duration: dur[2],
        ease: ease.out,
        overwrite: 'auto',
      });
    } else {
      keepClear(clientX, p);
      yTo(p.y);
    }
  }

  function hide(): void {
    if (!shown) return;
    shown = false;
    current = null;
    rTo(0);
    gsap.to(panel, {
      autoAlpha: 0,
      scale: 0.92,
      duration: dur[2],
      ease: ease.out,
      overwrite: 'auto',
    });
  }

  function itemOf(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? target.closest<HTMLElement>('[data-follower-item]') : null;
  }

  listen(scope, 'pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const item = itemOf(event.target);
    if (!item) return hide();
    const id = item.dataset['followerItem'] ?? '';
    show(id, event.clientX, event.clientY);
    const now = performance.now();
    const vx = ((event.clientX - lastX) / Math.max(1, now - lastT)) * 1000;
    lastX = event.clientX;
    lastT = now;
    rTo(clamp(vx * cfg.tiltPerVelocity, -cfg.maxTilt, cfg.maxTilt));
  });
  listen(scope, 'pointerleave', hide);
  listen(scope, 'focusin', (event) => {
    const item = itemOf(event.target);
    if (!item) return;
    const rect = item.getBoundingClientRect();
    // Next to the focused row, roughly where a pointer would be.
    show(
      item.dataset['followerItem'] ?? '',
      rect.left + rect.width * 0.6,
      rect.top + rect.height / 2,
    );
  });
  listen(scope, 'focusout', (event) => {
    if (!itemOf(event.relatedTarget)) hide();
  });
  // The panel is fixed: it would drift away from its row while the page scrolls.
  listen(
    window,
    'scroll',
    () => {
      if (shown && !scope.matches(':hover')) hide();
    },
    { passive: true },
  );
}

export function initFollowers(reduced: boolean): void {
  if (reduced || !finePointer()) return;
  for (const scope of document.querySelectorAll<HTMLElement>('[data-follower-scope]')) setup(scope);
}

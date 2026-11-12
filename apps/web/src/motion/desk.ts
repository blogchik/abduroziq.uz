/**
 * Desk: `data-desk` holds `data-draggable` objects placed from `data-x`, `data-y` (percent of
 * the desk, top-left corner, kept inside the desk) and `data-rotate` (deg). Placement,
 * resize, the optional drop-in entrance (`data-desk-entrance="<delay s>"`) and the
 * double-click reset live here; dragging (Draggable + InertiaPlugin) is loaded lazily from
 * `desk-drag.ts`, only on pages with a desk.
 */
import { desk as cfg, dur, ease } from './config';
import {
  afterGate,
  clamp,
  currentPage,
  gsap,
  inPage,
  isCurrent,
  listen,
  num,
  ScrollTrigger,
  track,
} from './core';

export interface DeskObject {
  el: HTMLElement;
  home: { x: number; y: number; r: number };
  /** Current resting place in percent of the desk, and the resting rotation. */
  pos: { x: number; y: number };
  rest: number;
}

export interface DeskState {
  desk: HTMLElement;
  objects: DeskObject[];
  reduced: boolean;
  /** Objects being held or thrown: layout leaves them alone. */
  busy: Set<HTMLElement>;
  /** Pixel position for an object's stored percentages, clamped to the desk. */
  toPx(o: DeskObject): { x: number; y: number };
  /** Stores an object's pixel position as percentages. */
  save(o: DeskObject, x: number, y: number): void;
  /** Called after every layout pass (the drag module refreshes its bounds). */
  onLayout?: () => void;
}

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"]';

function setupDesk(desk: HTMLElement, reduced: boolean): void {
  const objects: DeskObject[] = Array.from(
    desk.querySelectorAll<HTMLElement>('[data-draggable]'),
  ).map((el) => {
    const home = {
      x: num(el.dataset['x'], 0),
      y: num(el.dataset['y'], 0),
      r: num(el.dataset['rotate'], 0),
    };
    return { el, home, pos: { x: home.x, y: home.y }, rest: home.r };
  });
  if (objects.length === 0) return;

  const state: DeskState = {
    desk,
    objects,
    reduced,
    busy: new Set(),
    toPx(o) {
      const W = desk.clientWidth;
      const H = desk.clientHeight;
      return {
        x: clamp((o.pos.x / 100) * W, 0, Math.max(0, W - o.el.offsetWidth)),
        y: clamp((o.pos.y / 100) * H, 0, Math.max(0, H - o.el.offsetHeight)),
      };
    },
    save(o, x, y) {
      const W = desk.clientWidth || 1;
      const H = desk.clientHeight || 1;
      o.pos = { x: (x / W) * 100, y: (y / H) * 100 };
    },
  };

  function layout(): void {
    for (const o of objects) {
      if (state.busy.has(o.el)) continue;
      const p = state.toPx(o);
      gsap.set(o.el, { x: p.x, y: p.y });
    }
    state.onLayout?.();
  }

  for (const o of objects) {
    const p = state.toPx(o);
    gsap.set(o.el, { x: p.x, y: p.y, rotation: o.home.r });
  }
  desk.setAttribute('data-desk-ready', '');

  // Drop-in entrance.
  const entrance = desk.getAttribute('data-desk-entrance');
  if (!reduced && entrance !== null) {
    const tl = gsap.timeline({ paused: true, delay: num(entrance, 0) });
    objects.forEach((o, i) => {
      const p = state.toPx(o);
      gsap.set(o.el, { opacity: 0 });
      tl.fromTo(
        o.el,
        { opacity: 0, y: p.y - cfg.entranceDrop, rotation: o.home.r + (i % 2 ? 10 : -10) },
        {
          opacity: 1,
          y: p.y,
          rotation: o.home.r,
          duration: dur[3],
          ease: ease.springSoft,
          immediateRender: false,
        },
        i * cfg.entranceStagger,
      );
    });
    tl.eventCallback('onComplete', () => {
      gsap.set(
        objects.map((o) => o.el),
        { clearProps: 'opacity' },
      );
    });
    ScrollTrigger.create({
      trigger: desk,
      start: 'top 85%',
      once: true,
      onEnter: () => afterGate(() => tl.play()),
    });
  }

  // Double-click on the desk puts everything back.
  listen(desk, 'dblclick', (event) => {
    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
    window.getSelection()?.removeAllRanges();
    objects.forEach((o, i) => {
      o.pos = { x: o.home.x, y: o.home.y };
      o.rest = o.home.r;
      const p = state.toPx(o);
      gsap.to(o.el, {
        x: p.x,
        y: p.y,
        rotation: o.home.r,
        scale: 1,
        opacity: 1,
        duration: reduced ? 0 : dur[3],
        delay: reduced ? 0 : i * cfg.resetStagger,
        ease: ease.springSoft,
        overwrite: 'auto',
      });
    });
  });

  // Keep the poses (in percent) after a resize.
  let frame = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(layout);
  });
  ro.observe(desk);
  track(() => {
    ro.disconnect();
    cancelAnimationFrame(frame);
  });

  const page = currentPage();
  import('./desk-drag')
    .then(({ enableDrag }) => {
      if (isCurrent(page)) inPage(() => enableDrag(state));
    })
    .catch((error: unknown) => console.error('[motion] desk dragging unavailable', error));
}

export function initDesks(reduced: boolean): void {
  for (const desk of document.querySelectorAll<HTMLElement>('[data-desk]'))
    setupDesk(desk, reduced);
}

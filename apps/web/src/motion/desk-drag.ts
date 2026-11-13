/**
 * Desk dragging (lazy chunk): Draggable with InertiaPlugin throws inside the desk, lifts the
 * held object (scale, `data-dragging` for the shadow), tilts it with the horizontal velocity
 * and settles it on landing. A click on an interactive child still works when the object
 * was not dragged, and never fires after a drag. Reduced motion: plain dragging, no
 * inertia, lift or tilt.
 */
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { desk as cfg, dur, ease } from './config';
import { clamp, gsap, listen, track } from './core';
import type { DeskObject, DeskState } from './desk';

gsap.registerPlugin(Draggable, InertiaPlugin);

export function enableDrag(state: DeskState): void {
  const { desk, objects, reduced, busy } = state;
  let justDragged = false;
  const draggables: Draggable[] = [];

  for (const o of objects) draggables.push(makeDraggable(o));

  function makeDraggable(o: DeskObject): Draggable {
    const el = o.el;
    let lastX = 0;
    let lastT = 0;
    let vx = 0;
    let tilt = 0;
    let landed = true;
    const rotateTo = reduced
      ? undefined
      : gsap.quickTo(el, 'rotation', { duration: 0.35, ease: 'power3.out' });

    function sample(x: number): void {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      vx = vx * 0.7 + ((x - lastX) / dt) * 1000 * 0.3;
      lastX = x;
      lastT = now;
      if (!rotateTo) return;
      tilt = clamp(vx * cfg.tiltPerVelocity, -cfg.maxTilt, cfg.maxTilt);
      rotateTo(o.rest + tilt);
    }

    function land(x: number, y: number): void {
      if (landed) return;
      landed = true;
      busy.delete(el);
      el.removeAttribute('data-dragging');
      state.save(o, x, y);
      if (reduced) return;
      o.rest = o.home.r + clamp(tilt * cfg.settleKeep, -cfg.maxSettle, cfg.maxSettle);
      gsap.to(el, {
        rotation: o.rest,
        scale: 1,
        duration: dur[3],
        ease: ease.spring,
        overwrite: 'auto',
      });
    }

    const [draggable] = Draggable.create(el, {
      type: 'x,y',
      bounds: desk,
      inertia: !reduced,
      edgeResistance: 0.85,
      zIndexBoost: true,
      dragClickables: true,
      minimumMovement: 6,
      allowContextMenu: true,
      onPress(this: Draggable) {
        gsap.killTweensOf(el);
        gsap.set(el, { opacity: 1 });
        landed = false;
        busy.add(el);
        el.setAttribute('data-dragging', '');
        lastX = this.x;
        lastT = performance.now();
        vx = 0;
        tilt = 0;
        if (!reduced) gsap.to(el, { scale: cfg.liftScale, duration: dur[1], ease: ease.out });
      },
      onDragStart() {
        justDragged = true;
      },
      onDrag(this: Draggable) {
        sample(this.x);
      },
      onThrowUpdate(this: Draggable) {
        sample(this.x);
      },
      onThrowComplete(this: Draggable) {
        land(this.x, this.y);
      },
      onRelease(this: Draggable) {
        el.removeAttribute('data-dragging');
        // A throw (if any) has started by the next tick; otherwise land right here.
        gsap.delayedCall(0, () => {
          if (!this.isThrowing) land(this.x, this.y);
        });
      },
    });
    return draggable!;
  }

  // No click after a drag; a plain click on a child goes through.
  listen(desk, 'pointerdown', () => (justDragged = false), { capture: true });
  listen(
    desk,
    'click',
    (event) => {
      if (!justDragged) return;
      event.preventDefault();
      event.stopPropagation();
      justDragged = false;
    },
    { capture: true },
  );

  state.onLayout = () => {
    for (const d of draggables) if (!d.isDragging && !d.isThrowing) d.applyBounds(desk);
  };

  track(() => {
    delete state.onLayout;
    for (const d of draggables) d.kill();
  });
}

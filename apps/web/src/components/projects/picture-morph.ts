/**
 * The picture of a list row grows into the cover of its project page (DESIGN 6.2).
 *
 * The site's page transition is a paper panel that wipes over the old page before the new
 * one is swapped in (motion/transition.ts). A shared element that was simply named in both
 * pages would be covered by the panel and then pop back on top of it. So the picture is
 * held instead: when a row is followed, a copy of its picture is fixed above the panel at
 * the same place, and that copy carries the view-transition name. It stays while the page
 * is wiped away, then moves and grows into the cover, and the panel lifts off the rest.
 *
 * Only the followed row takes part, and only on a link click (`sourceElement`): the cover of
 * a page reached any other way is not a shared element and arrives with its page. Without
 * view transitions, and with motion reduced, nothing here runs.
 */
import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from 'astro:transitions/client';
import { prefersReducedMotion } from '@/motion';

const NAME = 'project-picture';
const PICTURE = 'data-project-picture';
const HELD = 'data-project-picture-held';

/** The project whose picture is being held, between the click and the swap. */
let slug: string | undefined;

function hold(event: Event): void {
  slug = undefined;
  document.querySelector(`[${HELD}]`)?.remove();
  if (prefersReducedMotion() || !('startViewTransition' in document)) return;

  const source = (event as TransitionBeforePreparationEvent).sourceElement;
  const picture = source?.querySelector<HTMLElement>(`[${PICTURE}]`);
  if (!picture) return;

  const rect = picture.getBoundingClientRect();
  const held = picture.cloneNode(true) as HTMLElement;
  held.setAttribute(HELD, '');
  held.setAttribute('aria-hidden', 'true');
  Object.assign(held.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    margin: '0',
    // Above the panel, under the cursor.
    zIndex: 'calc(var(--z-wipe) + 1)',
    pointerEvents: 'none',
    viewTransitionName: NAME,
  });
  // The old body leaves with the swap, and the copy with it.
  document.body.append(held);
  slug = picture.getAttribute(PICTURE) ?? undefined;
}

/** Names the cover of the new page, and takes the name back when the move is over. */
function receive(event: Event): void {
  const expected = slug;
  slug = undefined;
  if (!expected) return;
  const transition = (event as TransitionBeforeSwapEvent).viewTransition;
  document.addEventListener(
    'astro:after-swap',
    () => {
      const cover = document.querySelector<HTMLElement>(`[${PICTURE}="${CSS.escape(expected)}"]`);
      if (!cover) return;
      cover.style.setProperty('view-transition-name', NAME);
      const release = (): void => {
        cover.style.removeProperty('view-transition-name');
      };
      transition.finished.then(release, release);
    },
    { once: true },
  );
}

document.addEventListener('astro:before-preparation', hold);
document.addEventListener('astro:before-swap', receive);

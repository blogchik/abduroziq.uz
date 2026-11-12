/**
 * Dev-only helpers for the motion lab pages (not a route: only `.astro` files are injected).
 * The toggle shows the current `data-motion` and sets the `localStorage.motion` override,
 * then reloads.
 */
import { onPageEnter } from '@/motion';

onPageEnter(() => {
  const box = document.querySelector<HTMLElement>('[data-motion-toggle]');
  if (!box) return;
  const current = box.querySelector('[data-motion-current]');
  if (current) {
    const forced = localStorage.getItem('motion');
    current.textContent = `${document.documentElement.dataset['motion'] ?? '?'}${forced ? ' (forced)' : ''}`;
  }
  const onClick = (event: Event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-motion-set]');
    if (!button) return;
    const value = button.dataset['motionSet'];
    if (value) localStorage.setItem('motion', value);
    else localStorage.removeItem('motion');
    location.reload();
  };
  box.addEventListener('click', onClick);
  return () => box.removeEventListener('click', onClick);
});

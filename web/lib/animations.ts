import { animate, createTimeline, stagger } from 'animejs';

/**
 * Checks if the user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate page entrance subtly (150-250ms fade & slight translateY).
 */
export function animatePageEnter(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  animate(element, {
    opacity: [0, 1],
    translateY: [8, 0],
    duration: 220,
    ease: 'outQuad',
  });
}

/**
 * Staggered entrance animation for lists of elements (rows, items, cards).
 */
export function animateStaggerList(containerSelector: string, itemSelector: string) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;

  const items = document.querySelectorAll(`${containerSelector} ${itemSelector}`);
  if (!items.length) return;

  animate(items, {
    opacity: [0, 1],
    translateY: [10, 0],
    delay: stagger(30, { start: 50 }),
    duration: 200,
    ease: 'outQuad',
  });
}

/**
 * Animate slide-over drawer entrance from right.
 */
export function animateDrawerOpen(drawerEl: HTMLElement | null, backdropEl: HTMLElement | null) {
  if (!drawerEl) return;

  if (prefersReducedMotion()) {
    if (backdropEl) backdropEl.style.opacity = '1';
    drawerEl.style.transform = 'translateX(0)';
    drawerEl.style.opacity = '1';
    return;
  }

  if (backdropEl) {
    animate(backdropEl, {
      opacity: [0, 1],
      duration: 180,
      ease: 'outQuad',
    });
  }

  animate(drawerEl, {
    translateX: ['100%', '0%'],
    opacity: [0.6, 1],
    duration: 240,
    ease: 'outCubic',
  });
}

/**
 * Animate slide-over drawer exit to right.
 */
export function animateDrawerClose(
  drawerEl: HTMLElement | null,
  backdropEl: HTMLElement | null,
  onComplete?: () => void
) {
  if (!drawerEl) {
    if (onComplete) onComplete();
    return;
  }

  if (prefersReducedMotion()) {
    if (onComplete) onComplete();
    return;
  }

  const tl = createTimeline({
    onComplete,
  });

  if (backdropEl) {
    tl.add(backdropEl, {
      opacity: [1, 0],
      duration: 150,
      ease: 'inQuad',
    });
  }

  tl.add(
    drawerEl,
    {
      translateX: ['0%', '100%'],
      opacity: [1, 0.4],
      duration: 180,
      ease: 'inCubic',
    },
    0
  );
}

/**
 * Animate modal dialog pop entrance.
 */
export function animateModalOpen(modalEl: HTMLElement | null, backdropEl: HTMLElement | null) {
  if (!modalEl) return;

  if (prefersReducedMotion()) {
    if (backdropEl) backdropEl.style.opacity = '1';
    modalEl.style.opacity = '1';
    modalEl.style.transform = 'scale(1)';
    return;
  }

  if (backdropEl) {
    animate(backdropEl, {
      opacity: [0, 1],
      duration: 150,
      ease: 'outQuad',
    });
  }

  animate(modalEl, {
    opacity: [0, 1],
    scale: [0.96, 1],
    translateY: [6, 0],
    duration: 200,
    ease: 'outCubic',
  });
}

/**
 * Animate tab indicator smooth sliding between active tabs.
 */
export function animateTabIndicator(indicatorEl: HTMLElement | null, targetTabEl: HTMLElement | null) {
  if (!indicatorEl || !targetTabEl || prefersReducedMotion()) return;

  const targetRect = targetTabEl.getBoundingClientRect();
  const parentRect = targetTabEl.parentElement?.getBoundingClientRect() || targetRect;

  const left = targetRect.left - parentRect.left;
  const width = targetRect.width;

  animate(indicatorEl, {
    left: `${left}px`,
    width: `${width}px`,
    duration: 180,
    ease: 'outCubic',
  });
}

/**
 * Subtle feedback pulse for success states.
 */
export function flashSuccess(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  animate(element, {
    backgroundColor: ['rgba(34, 197, 94, 0.25)', 'transparent'],
    duration: 600,
    ease: 'outQuad',
  });
}

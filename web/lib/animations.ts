import { animate, createTimeline, stagger, createScope, createLayout } from 'animejs';

/**
 * Checks if the user has requested reduced motion in system preferences.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Smooth staged page entrance sequence (150–220ms).
 * Animate page container, title, controls, and main body gracefully.
 */
export function animatePageEnter(container: HTMLElement | null) {
  if (!container || prefersReducedMotion()) return;

  const tl = createTimeline({
    defaults: { ease: 'outCubic' },
    onComplete: () => {
      if (container) {
        container.style.transform = '';
        container.querySelectorAll<HTMLElement>('[data-animate-section]').forEach((s) => {
          s.style.transform = '';
        });
      }
    },
  });

  tl.add(container, {
    opacity: [0, 1],
    translateY: [6, 0],
    duration: 180,
  });

  // Stagger child sections if present
  const sections = container.querySelectorAll<HTMLElement>('[data-animate-section]');
  if (sections.length > 0) {
    tl.add(
      sections,
      {
        opacity: [0, 1],
        translateY: [8, 0],
        delay: stagger(35),
        duration: 160,
      },
      '-=100'
    );
  }
}

/**
 * Dropdown / Popover entrance animation.
 */
export function animateDropdownOpen(el: HTMLElement | null) {
  if (!el) return;
  if (prefersReducedMotion()) {
    el.style.opacity = '1';
    el.style.transform = 'scale(1) translateY(0)';
    return;
  }

  animate(el, {
    opacity: [0, 1],
    scale: [0.96, 1],
    translateY: [-4, 0],
    duration: 160,
    ease: 'outCubic',
  });
}

/**
 * Dropdown / Popover exit animation.
 */
export function animateDropdownClose(el: HTMLElement | null, onComplete?: () => void) {
  if (!el || prefersReducedMotion()) {
    if (onComplete) onComplete();
    return;
  }

  const tl = createTimeline({
    onComplete: onComplete ? () => onComplete() : undefined,
  });

  tl.add(el, {
    opacity: [1, 0],
    scale: [1, 0.96],
    translateY: [0, -4],
    duration: 120,
    ease: 'inCubic',
  });
}

/**
 * Slide-over contextual drawer entrance from right.
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
      duration: 160,
      ease: 'outQuad',
    });
  }

  animate(drawerEl, {
    translateX: ['100%', '0%'],
    opacity: [0.7, 1],
    duration: 220,
    ease: 'outCubic',
  });
}

/**
 * Slide-over contextual drawer exit to right.
 */
export function animateDrawerClose(
  drawerEl: HTMLElement | null,
  backdropEl: HTMLElement | null,
  onComplete?: () => void
) {
  if (!drawerEl || prefersReducedMotion()) {
    if (onComplete) onComplete();
    return;
  }

  const tl = createTimeline({
    onComplete: onComplete ? () => onComplete() : undefined,
  });

  if (backdropEl) {
    tl.add(backdropEl, {
      opacity: [1, 0],
      duration: 140,
      ease: 'inQuad',
    });
  }

  tl.add(
    drawerEl,
    {
      translateX: ['0%', '100%'],
      opacity: [1, 0],
      duration: 180,
      ease: 'inCubic',
    },
    0
  );
}

/**
 * Modal dialog pop-in entrance.
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
    scale: [0.95, 1],
    translateY: [4, 0],
    duration: 180,
    ease: 'outCubic',
  });
}

/**
 * Modal dialog exit.
 */
export function animateModalClose(
  modalEl: HTMLElement | null,
  backdropEl: HTMLElement | null,
  onComplete?: () => void
) {
  if (!modalEl || prefersReducedMotion()) {
    if (onComplete) onComplete();
    return;
  }

  const tl = createTimeline({
    onComplete: onComplete ? () => onComplete() : undefined,
  });

  if (backdropEl) {
    tl.add(backdropEl, {
      opacity: [1, 0],
      duration: 130,
      ease: 'inQuad',
    });
  }

  tl.add(
    modalEl,
    {
      opacity: [1, 0],
      scale: [1, 0.95],
      translateY: [0, 4],
      duration: 150,
      ease: 'inCubic',
    },
    0
  );
}

/**
 * Tab indicator sliding transition.
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
    duration: 170,
    ease: 'outCubic',
  });
}

/**
 * Tactile button press / click feedback.
 */
export function animatePress(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  animate(element, {
    scale: [1, 0.97, 1],
    duration: 140,
    ease: 'outQuad',
  });
}

/**
 * Flash feedback for successful actions.
 */
export function flashSuccess(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  animate(element, {
    backgroundColor: ['rgba(34, 197, 94, 0.2)', 'transparent'],
    duration: 500,
    ease: 'outQuad',
  });
}

/**
 * Flash feedback for warning / error states.
 */
export function flashError(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  animate(element, {
    backgroundColor: ['rgba(239, 68, 68, 0.2)', 'transparent'],
    duration: 500,
    ease: 'outQuad',
  });
}

export { createScope, createLayout };

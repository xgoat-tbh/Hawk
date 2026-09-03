import { animate, createTimeline, stagger } from 'animejs';

/**
 * Checks if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Smooth staged page entrance sequence (160–220ms).
 */
export function animatePageEnter(container: HTMLElement | null) {
  if (!container || prefersReducedMotion()) return;

  const sections = Array.from(
    container.querySelectorAll<HTMLElement>('[data-animate-section]')
  );

  const tl = createTimeline({
    defaults: { ease: 'outCubic' },
    onComplete: () => {
      if (container) {
        container.style.opacity = '';
        container.style.transform = '';
      }
      sections.forEach((s) => {
        s.style.opacity = '';
        s.style.transform = '';
      });
    },
  });

  // Base container reveal
  tl.add(container, {
    opacity: [0, 1],
    y: [4, 0],
    duration: 160,
  });

  // Stagger child sections if present
  if (sections.length > 0) {
    tl.add(
      sections,
      {
        opacity: [0, 1],
        y: [6, 0],
        delay: stagger(30),
        duration: 160,
      },
      '-=80'
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
    el.style.transform = 'none';
    return;
  }

  animate(el, {
    opacity: [0, 1],
    scale: [0.97, 1],
    y: [-3, 0],
    duration: 140,
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

  animate(el, {
    opacity: [1, 0],
    scale: [1, 0.97],
    y: [0, -3],
    duration: 100,
    ease: 'inCubic',
    onComplete: () => {
      if (onComplete) onComplete();
    },
  });
}

/**
 * Slide-over contextual drawer entrance from right.
 */
export function animateDrawerOpen(drawerEl: HTMLElement | null, backdropEl: HTMLElement | null) {
  if (!drawerEl) return;

  if (prefersReducedMotion()) {
    if (backdropEl) backdropEl.style.opacity = '1';
    drawerEl.style.opacity = '1';
    drawerEl.style.transform = 'none';
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
    x: ['100%', '0%'],
    opacity: [0.8, 1],
    duration: 200,
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

  let backdropDone = !backdropEl;
  let drawerDone = false;

  const checkDone = () => {
    if (backdropDone && drawerDone && onComplete) {
      onComplete();
    }
  };

  if (backdropEl) {
    animate(backdropEl, {
      opacity: [1, 0],
      duration: 140,
      ease: 'inQuad',
      onComplete: () => {
        backdropDone = true;
        checkDone();
      },
    });
  }

  animate(drawerEl, {
    x: ['0%', '100%'],
    opacity: [1, 0],
    duration: 160,
    ease: 'inCubic',
    onComplete: () => {
      drawerDone = true;
      checkDone();
    },
  });
}

/**
 * Modal dialog pop-in entrance.
 */
export function animateModalOpen(modalEl: HTMLElement | null, backdropEl: HTMLElement | null) {
  if (!modalEl) return;

  if (prefersReducedMotion()) {
    if (backdropEl) backdropEl.style.opacity = '1';
    modalEl.style.opacity = '1';
    modalEl.style.transform = 'none';
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
    y: [4, 0],
    duration: 170,
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

  let backdropDone = !backdropEl;
  let modalDone = false;

  const checkDone = () => {
    if (backdropDone && modalDone && onComplete) {
      onComplete();
    }
  };

  if (backdropEl) {
    animate(backdropEl, {
      opacity: [1, 0],
      duration: 120,
      ease: 'inQuad',
      onComplete: () => {
        backdropDone = true;
        checkDone();
      },
    });
  }

  animate(modalEl, {
    opacity: [1, 0],
    scale: [1, 0.96],
    y: [0, 4],
    duration: 140,
    ease: 'inCubic',
    onComplete: () => {
      modalDone = true;
      checkDone();
    },
  });
}

/**
 * Tactile button press feedback.
 */
export function animatePress(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  animate(element, {
    scale: [1, 0.97, 1],
    duration: 120,
    ease: 'outQuad',
  });
}

/**
 * Floating SaveBar entrance & exit.
 */
export function animateSaveBarEnter(barEl: HTMLElement | null) {
  if (!barEl || prefersReducedMotion()) return;

  animate(barEl, {
    opacity: [0, 1],
    y: [16, 0],
    scale: [0.97, 1],
    duration: 180,
    ease: 'outCubic',
  });
}

export function animateSaveBarExit(barEl: HTMLElement | null, onComplete?: () => void) {
  if (!barEl || prefersReducedMotion()) {
    if (onComplete) onComplete();
    return;
  }

  animate(barEl, {
    opacity: [1, 0],
    y: [0, 16],
    scale: [1, 0.97],
    duration: 140,
    ease: 'inCubic',
    onComplete: () => {
      if (onComplete) onComplete();
    },
  });
}

/**
 * Flash feedback for successful actions.
 */
export function flashSuccess(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  animate(element, {
    backgroundColor: ['rgba(34, 197, 94, 0.16)', 'transparent'],
    duration: 400,
    ease: 'outQuad',
  });
}

/**
 * Flash feedback for errors.
 */
export function flashError(element: HTMLElement | null) {
  if (!element || prefersReducedMotion()) return;

  animate(element, {
    backgroundColor: ['rgba(239, 68, 68, 0.16)', 'transparent'],
    duration: 400,
    ease: 'outQuad',
  });
}

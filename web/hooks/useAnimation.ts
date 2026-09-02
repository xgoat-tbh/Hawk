'use client';

import { useEffect, useRef } from 'react';
import { animatePageEnter, createScope, prefersReducedMotion } from '@/lib/animations';

/**
 * Hook to trigger a smooth page entrance sequence when mounting.
 */
export function usePageEntrance() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      animatePageEnter(containerRef.current);
    }
  }, []);

  return containerRef;
}

/**
 * Hook for scoping Anime.js animations to a component root and automatically cleaning them up on unmount.
 */
export function useScopedAnimation(callback: (scope: any) => void, deps: any[] = []) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;

    let scope: any = null;
    try {
      scope = createScope({ root: rootRef.current });
      callback(scope);
    } catch {
      // Fallback
    }

    return () => {
      if (scope && typeof scope.revert === 'function') {
        scope.revert();
      }
    };
  }, deps);

  return rootRef;
}

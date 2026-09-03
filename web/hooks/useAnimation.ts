'use client';

import { useEffect, useRef } from 'react';
import { animatePageEnter, prefersReducedMotion } from '@/lib/animations';

/**
 * Hook to trigger a smooth, calm page entrance sequence.
 * Takes optional `isReady` flag so entrance animation can trigger when data is ready.
 */
export function usePageEntrance(isReady = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!isReady || animatedRef.current || prefersReducedMotion()) return;

    if (containerRef.current) {
      animatedRef.current = true;
      // Slight frame delay to ensure React DOM commit before animation
      const raf = requestAnimationFrame(() => {
        animatePageEnter(containerRef.current);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isReady]);

  return containerRef;
}

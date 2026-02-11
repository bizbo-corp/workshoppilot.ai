'use client';

import { useEffect, useRef } from 'react';

/**
 * Prevents page scroll when touching canvas on iOS Safari.
 * Uses native addEventListener with { passive: false } because
 * React synthetic events can't call preventDefault on iOS Safari 11.3+.
 *
 * @param containerRef - Ref to the canvas container element
 */
export function usePreventScrollOnCanvas(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the .react-flow element within the container
    const reactFlowEl = container.querySelector('.react-flow');
    if (!reactFlowEl) return;

    const handleTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const target = touchEvent.target as HTMLElement;

      // Allow default touch behavior on interactive elements (buttons, inputs, textareas)
      if (
        target.closest('button') ||
        target.closest('textarea') ||
        target.closest('input') ||
        target.closest('.canvas-toolbar')
      ) {
        return;
      }

      // Prevent page scroll when panning canvas or dragging nodes
      touchEvent.preventDefault();
    };

    // CRITICAL: { passive: false } required for preventDefault on iOS Safari 11.3+
    reactFlowEl.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      reactFlowEl.removeEventListener('touchmove', handleTouchMove);
    };
  }, [containerRef]);
}

'use client';

import * as React from 'react';

interface StepTransitionWrapperProps {
  stepId: string;
  children: React.ReactNode;
}

/**
 * Wraps step content with a 150ms fade-in transition whenever the stepId changes.
 * Uses a key prop to re-mount on step navigation, triggering the animation.
 * No external animation library — pure CSS transition via useEffect.
 */
function StepTransitionContent({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Start invisible, then animate to visible on next frame
    el.style.opacity = '0';
    const raf = requestAnimationFrame(() => {
      el.style.opacity = '1';
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      className="contents"
      style={{ transition: 'opacity 150ms ease-out', opacity: 0 }}
    >
      {children}
    </div>
  );
}

/**
 * Re-mounts StepTransitionContent on each stepId change via React key,
 * producing a fresh fade-in for every step navigation.
 */
export function StepTransitionWrapper({ stepId, children }: StepTransitionWrapperProps) {
  return (
    <StepTransitionContent key={stepId}>
      {children}
    </StepTransitionContent>
  );
}

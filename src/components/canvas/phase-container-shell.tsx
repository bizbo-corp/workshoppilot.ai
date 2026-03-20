'use client';

import type { ReactNode } from 'react';

// Phase accent colors for active containers — single source of truth
export const PHASE_ACCENTS: Record<number, string> = {
  1: '#6b7280', // gray — mind mapping
  2: '#f59e0b', // amber — crazy eights
  3: '#3b82f6', // blue — voting
  4: '#8b5cf6', // purple — brain rewriting
};

export const SHELL_HEADER_HEIGHT = 48;

export type PhaseContainerShellProps = {
  stepNumber: number;
  title: string;
  isActive: boolean;
  width: number | string;
  height: number | string;
  headerExtra?: ReactNode;        // right-side badges (card count, voting status)
  footer?: ReactNode;             // e.g. BR "Proceed" button
  showPlaceholder?: boolean;
  placeholderContent?: ReactNode;
  dragHandleClassName?: string;   // default: 'phase-drag-handle'
  children?: ReactNode;
};

/** Inactive header: muted badge + "Coming up" label */
function SkeletonHeader({ stepNumber, title }: { stepNumber: number; title: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: SHELL_HEADER_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'var(--color-card)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-border) 30%, transparent)',
        borderRadius: '14px 14px 0 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: 'var(--color-muted-foreground)',
            opacity: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-card)',
          }}
        >
          {stepNumber}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted-foreground)' }}>
          {title}
        </span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted-foreground)', opacity: 0.5, fontStyle: 'italic' }}>
        Coming up
      </span>
    </div>
  );
}

/**
 * PhaseContainerShell — shared visual wrapper for all 4 ideation phases.
 *
 * Renders border, header bar with step badge + title, body area, optional footer.
 * Inactive state shows SkeletonHeader + placeholder content.
 * Active state shows drag-handle header + children + optional footer.
 */
export function PhaseContainerShell({
  stepNumber,
  title,
  isActive,
  width,
  height,
  headerExtra,
  footer,
  showPlaceholder,
  placeholderContent,
  dragHandleClassName = 'phase-drag-handle',
  children,
}: PhaseContainerShellProps) {
  const accent = PHASE_ACCENTS[stepNumber] ?? '#6b7280';

  if (!isActive) {
    return (
      <div
        style={{
          width,
          height,
          border: '1px solid color-mix(in srgb, var(--color-border) 25%, transparent)',
          borderRadius: 16,
          backgroundColor: 'color-mix(in srgb, var(--color-card) 50%, transparent)',
          pointerEvents: 'none',
          position: 'relative',
        }}
      >
        <SkeletonHeader stepNumber={stepNumber} title={title} />
        {placeholderContent}
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        border: `1.5px solid color-mix(in srgb, ${accent} 20%, transparent)`,
        borderRadius: 16,
        backgroundColor: 'color-mix(in srgb, var(--color-card) 50%, transparent)',
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      {/* Drag-handle header bar */}
      <div
        className={dragHandleClassName}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: SHELL_HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: 'var(--color-card)',
          borderBottom: '1px solid color-mix(in srgb, var(--color-border) 15%, transparent)',
          borderRadius: '14px 14px 0 0',
          pointerEvents: 'auto',
          cursor: 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            {stepNumber}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>
            {title}
          </span>
        </div>
        {headerExtra}
      </div>

      {/* Body */}
      {showPlaceholder && placeholderContent}
      {children}

      {/* Optional footer */}
      {footer}
    </div>
  );
}

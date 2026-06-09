import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared shell for the large fixed-width canvas nodes (concept cards, HMW cards).
 * These nodes are drag-only (no NodeResizer) — the shell renders the outer
 * container and the identical state-glow treatment, while the drag handle and
 * react-flow <Handle>s stay as children so all drag wiring is untouched.
 */

interface NodeGlowState {
  isFilled?: boolean;
  isActive?: boolean;
  selected?: boolean;
  /** Ring color used for the `selected` state. */
  borderSelected: string;
}

/**
 * The state-glow rule shared verbatim by concept + HMW cards:
 * filled → green ring, active → animated glow class, selected → selection ring.
 */
export function getCanvasNodeGlow({
  isFilled,
  isActive,
  selected,
  borderSelected,
}: NodeGlowState): { boxShadow?: string; glowClass: string } {
  if (isFilled) {
    return { boxShadow: '0 0 0 2px #22c55e, 0 0 16px 4px #22c55e40', glowClass: '' };
  }
  if (isActive) {
    return { boxShadow: undefined, glowClass: 'concept-card-active-glow' };
  }
  if (selected) {
    return { boxShadow: `0 0 0 2px ${borderSelected}`, glowClass: '' };
  }
  return { boxShadow: undefined, glowClass: '' };
}

export interface CanvasNodeShellProps extends NodeGlowState {
  /** Width + variant class (e.g. "persona-card w-[680px]" / "hmw-card w-[700px]"). */
  className?: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth?: number;
  /** Optional base text color for the node. */
  color?: string;
  isNonOwned?: boolean;
  children: React.ReactNode;
}

export function CanvasNodeShell({
  className,
  backgroundColor,
  borderColor,
  borderWidth = 1,
  color,
  isFilled,
  isActive,
  selected,
  borderSelected,
  isNonOwned,
  children,
}: CanvasNodeShellProps) {
  const { boxShadow, glowClass } = getCanvasNodeGlow({
    isFilled,
    isActive,
    selected,
    borderSelected,
  });

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-node shadow-xl',
        glowClass,
        isNonOwned && 'concept-card-non-owned',
        className,
      )}
      style={{ backgroundColor, color, borderWidth, borderStyle: 'solid', borderColor, boxShadow }}
    >
      {children}
    </div>
  );
}

/**
 * QuadrantCard — one cell of a 2×2 grid (SWOT, empathy map, etc). The accent
 * color drives a 10%-tinted background, a 25% border, and a solid label dot.
 */
export interface QuadrantCardProps {
  /** Accent color or CSS var, e.g. 'var(--persona-empathy-gains)'. */
  accent: string;
  /** Label text color (often a darker variant of the accent). */
  labelColor: string;
  label: string;
  children: React.ReactNode;
}

export function QuadrantCard({ accent, labelColor, label, children }: QuadrantCardProps) {
  return (
    <div
      className="flex flex-col space-y-1 rounded-xl border p-3"
      style={{
        backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-3 w-3 rounded" style={{ backgroundColor: accent }} />
        <h5
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: labelColor }}
        >
          {label}
        </h5>
      </div>
      {children}
    </div>
  );
}

'use client';

import { Panel } from '@xyflow/react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FlowArchetype } from '@/lib/journey-flow/types';
import { ARCHETYPE_LABELS } from '@/lib/journey-flow/types';

// ---------------------------------------------------------------------------
// JourneyFlowToolbar — top-left Panel (back link + mark complete / approved badge)
// ---------------------------------------------------------------------------

export interface JourneyFlowToolbarProps {
  sessionId: string;
  isReadOnly?: boolean;
  isApproved: boolean;
  isApproving?: boolean;
  onApprove: () => void;
  /** Optional: callback to regenerate the baseline flow. Shown when not read-only and a baseline exists. */
  onRegenerate?: () => void;
  /** When true, the Regenerate button shows a spinner and is disabled. */
  isGenerating?: boolean;
  /** When set, renders a small archetype badge after the action buttons. */
  archetype?: FlowArchetype;
  /**
   * Navigation context — determines the back-link label and destination.
   *  'validate' → "← Validation Plan" back to the workshop's validate step
   *  undefined / anything else → "← Build Pack" back to outputs
   */
  from?: string;
}

export function JourneyFlowToolbar({
  sessionId,
  isReadOnly,
  isApproved,
  isApproving,
  onApprove,
  onRegenerate,
  isGenerating,
  archetype,
  from,
}: JourneyFlowToolbarProps) {
  const backHref =
    from === 'validate'
      ? `/workshop/${sessionId}/step/validate`
      : `/workshop/${sessionId}/outputs`;
  const backLabel = from === 'validate' ? 'Validation Plan' : 'Build Pack';

  return (
    <Panel position="top-left" className="flex items-center gap-2">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
      >
        <Icon name="arrow-left" className="h-3.5 w-3.5" />
        {backLabel}
      </Link>

      <div className="h-5 w-px bg-border" />

      {!isReadOnly && onRegenerate && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={onRegenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Icon name="spinner" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon name="refresh" className="h-3.5 w-3.5" />
          )}
          Regenerate
        </Button>
      )}

      {!isReadOnly && !isApproved && (
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={onApprove}
          disabled={isApproving}
        >
          {isApproving ? (
            <Icon name="spinner" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon name="check-circle" className="h-3.5 w-3.5" />
          )}
          Mark complete
        </Button>
      )}

      {isApproved && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
            'text-[10px] font-medium bg-primary/10 text-primary'
          )}
        >
          <Icon name="check-circle" className="h-3 w-3" />
          Flow approved
        </span>
      )}

      {archetype && (
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
          {ARCHETYPE_LABELS[archetype]}
        </span>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// JourneyFlowCanvasToolbar — bottom-center floating bar (pointer/hand + Add Screen)
// ---------------------------------------------------------------------------

export interface JourneyFlowCanvasToolbarProps {
  activeTool: 'pointer' | 'hand';
  onToolChange: (tool: 'pointer' | 'hand') => void;
  onAddScreen: () => void;
  isReadOnly?: boolean;
}

function IconButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        active && 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </button>
  );
}

export function JourneyFlowCanvasToolbar({
  activeTool,
  onToolChange,
  onAddScreen,
  isReadOnly,
}: JourneyFlowCanvasToolbarProps) {
  if (isReadOnly) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-card rounded-xl shadow-md border border-border px-1 py-1 gap-0.5">
      {/* Pointer / Hand tools */}
      <div className="flex items-center">
        <IconButton
          onClick={() => onToolChange('pointer')}
          active={activeTool === 'pointer'}
          title="Pointer tool"
        >
          <Icon name="mouse-pointer" className="w-4 h-4" />
        </IconButton>
        <IconButton
          onClick={() => onToolChange('hand')}
          active={activeTool === 'hand'}
          title="Hand tool"
        >
          <Icon name="hand" className="w-4 h-4" />
        </IconButton>
      </div>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Add Screen button */}
      <button
        onClick={onAddScreen}
        title="Add a new screen"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Icon name="plus" className="w-3.5 h-3.5" />
        <span>Add Screen</span>
      </button>
    </div>
  );
}

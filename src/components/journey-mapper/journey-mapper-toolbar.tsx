'use client';

import { Panel } from '@xyflow/react';
import { RefreshCw, LayoutGrid, Wand2, Plus, ArrowLeft, Loader2, CheckCircle2, Rocket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { StrategicIntent } from '@/lib/journey-mapper/types';
import { INTENT_LABELS, INTENT_ADD_LABELS, normalizeIntent } from '@/lib/journey-mapper/types';

interface JourneyMapperToolbarProps {
  sessionId: string;
  isReadOnly?: boolean;
  isRegenerating?: boolean;
  isApproved?: boolean;
  strategicIntent?: StrategicIntent;
  onRegenerate: () => void;
  onAutoLayout: () => void;
  onGenerateV0Prompt: () => void;
  onAddFeature: () => void;
  onApprove: () => void;
  onCreatePrototype: () => void;
  onReset: () => void;
  isResetting?: boolean;
}

export function JourneyMapperToolbar({
  sessionId,
  isReadOnly,
  isRegenerating,
  isApproved,
  strategicIntent,
  onRegenerate,
  onAutoLayout,
  onGenerateV0Prompt,
  onAddFeature,
  onApprove,
  onCreatePrototype,
  onReset,
  isResetting,
}: JourneyMapperToolbarProps) {
  return (
    <Panel position="top-left" className="flex items-center gap-2 flex-wrap">
      <Link
        href={`/workshop/${sessionId}/outputs`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Build Pack
      </Link>

      <div className="h-5 w-px bg-border" />

      {/* Intent badge */}
      {strategicIntent && (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
          {INTENT_LABELS[strategicIntent]}
        </span>
      )}

      {!isReadOnly && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="h-7 text-xs gap-1.5"
          >
            {isRegenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Re-generate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onAutoLayout}
            className="h-7 text-xs gap-1.5"
          >
            <LayoutGrid className="h-3 w-3" />
            Auto-layout
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onAddFeature}
            className="h-7 text-xs gap-1.5"
          >
            <Plus className="h-3 w-3" />
            {INTENT_ADD_LABELS[normalizeIntent(strategicIntent ?? 'web-app')]}
          </Button>
        </>
      )}

      <div className="h-5 w-px bg-border" />

      <Button
        variant="outline"
        size="sm"
        onClick={onGenerateV0Prompt}
        className="h-7 text-xs gap-1.5"
      >
        <Wand2 className="h-3 w-3" />
        Preview v0 Prompt
      </Button>

      {/* Approve / Create Prototype flow */}
      {!isReadOnly && !isApproved && (
        <Button
          variant="default"
          size="sm"
          onClick={onApprove}
          className="h-7 text-xs gap-1.5"
        >
          <CheckCircle2 className="h-3 w-3" />
          Approve Journey
        </Button>
      )}

      {isApproved && (
        <Button
          variant="default"
          size="sm"
          onClick={onCreatePrototype}
          className="h-7 text-xs gap-1.5"
        >
          <Rocket className="h-3 w-3" />
          Create Prototype
        </Button>
      )}

      {!isReadOnly && (
        <>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isResetting}
            className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isResetting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Reset
          </Button>
        </>
      )}
    </Panel>
  );
}

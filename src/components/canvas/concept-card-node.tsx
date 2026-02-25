'use client';

import { memo, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Rocket,
  Sparkles,
  Target,
  BarChart3,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';

export type ConceptCardNodeRendererData = ConceptCardData & {
  onFieldChange?: (id: string, field: string, value: string) => void;
  onSWOTChange?: (id: string, quadrant: string, index: number, value: string) => void;
  onFeasibilityChange?: (
    id: string,
    dimension: string,
    score?: number,
    rationale?: string
  ) => void;
};

export type ConceptCardNodeType = Node<ConceptCardNodeRendererData, 'conceptCard'>;

/* ── Reuse persona palette (CSS custom properties from globals.css) ── */
const SAGE = {
  bg: 'var(--persona-bg)',
  border: 'var(--persona-border)',
  borderSelected: 'var(--persona-border-selected)',
  headerBg: 'var(--persona-header-bg)',
  sectionBorder: 'var(--persona-section-border)',
  avatarBg: 'var(--persona-avatar-bg)',
};

/**
 * Inline-editable text — uncontrolled with external sync.
 * Uses defaultValue + onBlur for editing, but imperatively syncs the DOM
 * value when the prop changes externally (e.g. AI fills in a field)
 * without interrupting active editing (skips sync when focused).
 *
 * autoGrow: for multiline fields, auto-expands height to fit content.
 */
function EditableField({
  value,
  placeholder,
  onBlur,
  className,
  multiline,
  rows,
  autoGrow,
}: {
  value?: string;
  placeholder: string;
  onBlur: (value: string) => void;
  className?: string;
  multiline?: boolean;
  rows?: number;
  autoGrow?: boolean;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync external value changes to DOM (skip if user is editing)
  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || '';
      // Auto-grow after external sync
      if (autoGrow && ref.current instanceof HTMLTextAreaElement) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    }
  }, [value, autoGrow]);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (autoGrow) {
      const el = e.currentTarget;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        className={cn(
          'nodrag nopan w-full resize-none bg-transparent outline-none transition-colors',
          'placeholder:text-olive-500/40',
          'focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1',
          className
        )}
        rows={rows ?? 3}
        placeholder={placeholder}
        defaultValue={value || ''}
        onBlur={(e) => onBlur(e.target.value)}
        onInput={handleInput}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      className={cn(
        'nodrag nopan w-full bg-transparent outline-none transition-colors',
        'placeholder:text-olive-500/40',
        'focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1',
        className
      )}
      placeholder={placeholder}
      defaultValue={value || ''}
      onBlur={(e) => onBlur(e.target.value)}
    />
  );
}

/**
 * FeasibilityDimension — dot scoring (1-5) with rationale
 */
function FeasibilityDimension({
  label,
  score,
  rationale,
  onScoreChange,
  onRationaleChange,
}: {
  label: string;
  score: number;
  rationale: string;
  onScoreChange: (score: number) => void;
  onRationaleChange: (rationale: string) => void;
}) {
  const rationaleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (rationaleRef.current && rationaleRef.current !== document.activeElement) {
      rationaleRef.current.value = rationale || '';
    }
  }, [rationale]);

  const getScoreColor = (s: number) => {
    if (s >= 4) return 'bg-green-500';
    if (s >= 2) return 'bg-amber-500';
    if (s >= 1) return 'bg-red-500';
    return 'bg-muted';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--persona-text-strong)' }}>{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((dotScore) => (
            <button
              key={dotScore}
              onClick={(e) => {
                e.stopPropagation();
                onScoreChange(dotScore);
              }}
              className={cn(
                'nodrag nopan h-3 w-3 rounded-full transition-colors hover:opacity-80',
                dotScore <= score ? getScoreColor(score) : 'bg-neutral-olive-300 dark:bg-neutral-olive-700'
              )}
              aria-label={`Set ${label} score to ${dotScore}`}
            />
          ))}
        </div>
      </div>
      <textarea
        ref={rationaleRef}
        className="nodrag nopan w-full resize-none rounded border bg-transparent px-2 py-1 text-xs outline-none placeholder:text-olive-500/40"
        style={{
          borderColor: SAGE.sectionBorder,
          color: 'var(--persona-text-muted)',
        }}
        rows={2}
        placeholder="Rationale..."
        defaultValue={rationale}
        onBlur={(e) => onRationaleChange(e.target.value)}
      />
    </div>
  );
}

export const ConceptCardNode = memo(
  ({ data, id, selected }: NodeProps<ConceptCardNodeType>) => {
    return (
      <div
        className="persona-card w-[680px] rounded-2xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: SAGE.bg,
          color: 'var(--persona-text-strong)',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: selected ? SAGE.borderSelected : SAGE.border,
        }}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!opacity-0 !w-0 !h-0"
        />

        {/* ── 1. Hero: Sketch Image with gradient overlay + title ── */}
        <div className="relative w-full overflow-hidden" style={{ height: 480 }}>
          {/* Background: image or solid color */}
          {data.sketchImageUrl ? (
            <img
              src={data.sketchImageUrl}
              alt="Concept sketch"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ backgroundColor: SAGE.headerBg }}
            >
              <ImageIcon className="h-12 w-12 text-white/30" />
              <span className="text-sm font-medium text-white/40">Awaiting sketch...</span>
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
            }}
          />

          {/* Concept name + source overlay — positioned at bottom-left */}
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-6 pb-5">
            <EditableField
              value={data.conceptName}
              placeholder="Concept Name"
              onBlur={(v) => data.onFieldChange?.(id, 'conceptName', v)}
              className="text-2xl font-bold text-white placeholder:text-white/40 drop-shadow-md focus:bg-white/10"
            />
            <p className="mt-1 text-sm font-medium text-white/80 drop-shadow-md">
              From: {data.ideaSource || 'Unknown source'}
            </p>
          </div>
        </div>

        {/* ── 2. Elevator Pitch ── */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: `1px solid ${SAGE.sectionBorder}` }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              Elevator Pitch
            </h4>
          </div>
          <EditableField
            value={data.elevatorPitch}
            placeholder="2-3 sentence elevator pitch..."
            onBlur={(v) => data.onFieldChange?.(id, 'elevatorPitch', v)}
            className="text-sm leading-relaxed"
            multiline
            rows={3}
            autoGrow
          />
        </div>

        {/* ── 3. USP ── */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: `1px solid ${SAGE.sectionBorder}` }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              Unique Selling Proposition
            </h4>
          </div>
          <EditableField
            value={data.usp}
            placeholder="What makes this different from current solutions..."
            onBlur={(v) => data.onFieldChange?.(id, 'usp', v)}
            className="text-sm leading-relaxed"
            multiline
            rows={2}
            autoGrow
          />
        </div>

        {/* ── 4. SWOT Analysis ── */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: `1px solid ${SAGE.sectionBorder}` }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              SWOT Analysis
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Strengths */}
            <div
              className="flex flex-col space-y-1 rounded-xl border p-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--persona-empathy-gains) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--persona-empathy-gains) 25%, transparent)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: 'var(--persona-empathy-gains)' }} />
                <h5 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--persona-empathy-gains-text)' }}>
                  Strengths
                </h5>
              </div>
              {data.swot.strengths.map((item, idx) => (
                <EditableField
                  key={`s-${idx}`}
                  value={item}
                  placeholder={`Strength ${idx + 1}`}
                  onBlur={(v) => data.onSWOTChange?.(id, 'strengths', idx, v)}
                  className="text-xs leading-relaxed"
                  multiline
                  rows={2}
                  autoGrow
                />
              ))}
            </div>

            {/* Weaknesses */}
            <div
              className="flex flex-col space-y-1 rounded-xl border p-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--persona-empathy-pains) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--persona-empathy-pains) 25%, transparent)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: 'var(--persona-empathy-pains)' }} />
                <h5 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--persona-empathy-pains-text)' }}>
                  Weaknesses
                </h5>
              </div>
              {data.swot.weaknesses.map((item, idx) => (
                <EditableField
                  key={`w-${idx}`}
                  value={item}
                  placeholder={`Weakness ${idx + 1}`}
                  onBlur={(v) => data.onSWOTChange?.(id, 'weaknesses', idx, v)}
                  className="text-xs leading-relaxed"
                  multiline
                  rows={2}
                  autoGrow
                />
              ))}
            </div>

            {/* Opportunities */}
            <div
              className="flex flex-col space-y-1 rounded-xl border p-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--persona-empathy-says) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--persona-empathy-says) 25%, transparent)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: 'var(--persona-empathy-says)' }} />
                <h5 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--persona-text-muted)' }}>
                  Opportunities
                </h5>
              </div>
              {data.swot.opportunities.map((item, idx) => (
                <EditableField
                  key={`o-${idx}`}
                  value={item}
                  placeholder={`Opportunity ${idx + 1}`}
                  onBlur={(v) => data.onSWOTChange?.(id, 'opportunities', idx, v)}
                  className="text-xs leading-relaxed"
                  multiline
                  rows={2}
                  autoGrow
                />
              ))}
            </div>

            {/* Threats */}
            <div
              className="flex flex-col space-y-1 rounded-xl border p-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--persona-empathy-feels) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--persona-empathy-feels) 25%, transparent)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: 'var(--persona-empathy-feels)' }} />
                <h5 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--persona-text-muted)' }}>
                  Threats
                </h5>
              </div>
              {data.swot.threats.map((item, idx) => (
                <EditableField
                  key={`t-${idx}`}
                  value={item}
                  placeholder={`Threat ${idx + 1}`}
                  onBlur={(v) => data.onSWOTChange?.(id, 'threats', idx, v)}
                  className="text-xs leading-relaxed"
                  multiline
                  rows={2}
                  autoGrow
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── 5. Feasibility Assessment ── */}
        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              Feasibility Assessment
            </h4>
          </div>
          <div className="space-y-3">
            <FeasibilityDimension
              label="Technical Feasibility"
              score={data.feasibility.technical.score}
              rationale={data.feasibility.technical.rationale}
              onScoreChange={(score) =>
                data.onFeasibilityChange?.(id, 'technical', score, undefined)
              }
              onRationaleChange={(rationale) =>
                data.onFeasibilityChange?.(id, 'technical', undefined, rationale)
              }
            />
            <FeasibilityDimension
              label="Business Viability"
              score={data.feasibility.business.score}
              rationale={data.feasibility.business.rationale}
              onScoreChange={(score) =>
                data.onFeasibilityChange?.(id, 'business', score, undefined)
              }
              onRationaleChange={(rationale) =>
                data.onFeasibilityChange?.(id, 'business', undefined, rationale)
              }
            />
            <FeasibilityDimension
              label="User Desirability"
              score={data.feasibility.userDesirability.score}
              rationale={data.feasibility.userDesirability.rationale}
              onScoreChange={(score) =>
                data.onFeasibilityChange?.(id, 'userDesirability', score, undefined)
              }
              onRationaleChange={(rationale) =>
                data.onFeasibilityChange?.(id, 'userDesirability', undefined, rationale)
              }
            />
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          className="!opacity-0 !w-0 !h-0"
        />
      </div>
    );
  }
);

ConceptCardNode.displayName = 'ConceptCardNode';

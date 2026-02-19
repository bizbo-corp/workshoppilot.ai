'use client';

import { memo, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Rocket,
  Sparkles,
  Target,
  BarChart3,
  Megaphone,
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
        <span className="text-sm font-medium text-card-foreground">{label}</span>
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
        className="nodrag nopan w-full resize-none rounded border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground outline-none focus:border-olive-600 dark:focus:border-olive-400 placeholder:text-olive-500/40"
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
        className={cn(
          'w-[680px] rounded-2xl shadow-xl overflow-hidden border-2 bg-card',
          selected ? 'border-olive-700 dark:border-olive-400' : 'border-border'
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!opacity-0 !w-0 !h-0"
        />

        {/* ── 1. Header Band ── */}
        <div className="bg-olive-800 dark:bg-olive-900 px-6 py-5">
          <EditableField
            value={data.conceptName}
            placeholder="Concept Name"
            onBlur={(v) => data.onFieldChange?.(id, 'conceptName', v)}
            className="text-2xl font-bold text-white placeholder:text-white/40 focus:bg-white/15"
          />
          <p className="mt-1 text-sm font-medium text-white/75">
            From: {data.ideaSource || 'Unknown source'}
          </p>
        </div>

        {/* ── 2. Sketch Image ── */}
        {data.sketchImageUrl ? (
          <div className="flex items-center justify-center bg-neutral-olive-100 dark:bg-neutral-olive-800 border-b border-border">
            <img
              src={data.sketchImageUrl}
              alt="Concept sketch"
              className="max-h-[200px] w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground/30 border-b border-border">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}

        {/* ── 3. Elevator Pitch ── */}
        <div className="px-6 py-5 border-b border-border">
          <div className="mb-2 flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5 shrink-0 text-olive-600 dark:text-olive-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-olive-600 dark:text-olive-400">
              Elevator Pitch
            </h4>
          </div>
          <EditableField
            value={data.elevatorPitch}
            placeholder="2-3 sentence elevator pitch..."
            onBlur={(v) => data.onFieldChange?.(id, 'elevatorPitch', v)}
            className="text-sm leading-relaxed text-card-foreground/85"
            multiline
            rows={3}
            autoGrow
          />
        </div>

        {/* ── 4. USP ── */}
        <div className="px-6 py-5 border-b border-border">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-olive-600 dark:text-olive-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-olive-600 dark:text-olive-400">
              Unique Selling Proposition
            </h4>
          </div>
          <EditableField
            value={data.usp}
            placeholder="What makes this different from current solutions..."
            onBlur={(v) => data.onFieldChange?.(id, 'usp', v)}
            className="text-sm leading-relaxed text-card-foreground/85"
            multiline
            rows={2}
            autoGrow
          />
        </div>

        {/* ── 5. SWOT Analysis ── */}
        <div className="px-6 py-5 border-b border-border">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 shrink-0 text-olive-600 dark:text-olive-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-olive-600 dark:text-olive-400">
              SWOT Analysis
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Strengths */}
            <div className="space-y-1 rounded-xl border border-green-500/30 bg-green-50 p-3 dark:bg-green-950/20">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-green-900 dark:text-green-100">
                  Strengths
                </h5>
              </div>
              {data.swot.strengths.map((item, idx) => (
                <EditableField
                  key={`s-${idx}`}
                  value={item}
                  placeholder={`Strength ${idx + 1}`}
                  onBlur={(v) => data.onSWOTChange?.(id, 'strengths', idx, v)}
                  className="text-xs leading-relaxed text-green-800 dark:text-green-200"
                  multiline
                  rows={2}
                  autoGrow
                />
              ))}
            </div>

            {/* Weaknesses */}
            <div className="space-y-1 rounded-xl border border-red-500/30 bg-red-50 p-3 dark:bg-red-950/20">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-red-500" />
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-red-900 dark:text-red-100">
                  Weaknesses
                </h5>
              </div>
              {data.swot.weaknesses.map((item, idx) => (
                <EditableField
                  key={`w-${idx}`}
                  value={item}
                  placeholder={`Weakness ${idx + 1}`}
                  onBlur={(v) => data.onSWOTChange?.(id, 'weaknesses', idx, v)}
                  className="text-xs leading-relaxed text-red-800 dark:text-red-200"
                  multiline
                  rows={2}
                  autoGrow
                />
              ))}
            </div>

            {/* Opportunities */}
            <div className="space-y-1 rounded-xl border border-olive-500/30 bg-olive-50 p-3 dark:bg-olive-950/20">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-olive-600" />
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-olive-900 dark:text-olive-100">
                  Opportunities
                </h5>
              </div>
              {data.swot.opportunities.map((item, idx) => (
                <EditableField
                  key={`o-${idx}`}
                  value={item}
                  placeholder={`Opportunity ${idx + 1}`}
                  onBlur={(v) => data.onSWOTChange?.(id, 'opportunities', idx, v)}
                  className="text-xs leading-relaxed text-olive-800 dark:text-olive-200"
                  multiline
                  rows={2}
                  autoGrow
                />
              ))}
            </div>

            {/* Threats */}
            <div className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-50 p-3 dark:bg-amber-950/20">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-amber-500" />
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100">
                  Threats
                </h5>
              </div>
              {data.swot.threats.map((item, idx) => (
                <EditableField
                  key={`t-${idx}`}
                  value={item}
                  placeholder={`Threat ${idx + 1}`}
                  onBlur={(v) => data.onSWOTChange?.(id, 'threats', idx, v)}
                  className="text-xs leading-relaxed text-amber-800 dark:text-amber-200"
                  multiline
                  rows={2}
                  autoGrow
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── 6. Feasibility Assessment ── */}
        <div className="px-6 py-5 border-b border-border">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 shrink-0 text-olive-600 dark:text-olive-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-olive-600 dark:text-olive-400">
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

        {/* ── 7. Billboard Hero ── */}
        <div className="px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 shrink-0 text-olive-600 dark:text-olive-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-olive-600 dark:text-olive-400">
              Billboard Hero
            </h4>
          </div>
          <div className="space-y-3 rounded-xl bg-olive-100/50 dark:bg-olive-950/30 p-4">
            <EditableField
              value={data.billboardHero?.headline}
              placeholder="Headline (6-10 words)"
              onBlur={(v) => data.onFieldChange?.(id, 'billboardHero.headline', v)}
              className="text-center text-lg font-bold text-card-foreground"
            />
            <EditableField
              value={data.billboardHero?.subheadline}
              placeholder="Subheadline (1-2 sentences)"
              onBlur={(v) => data.onFieldChange?.(id, 'billboardHero.subheadline', v)}
              className="text-center text-sm text-card-foreground/80"
              multiline
              rows={2}
              autoGrow
            />
            <div className="flex justify-center rounded-lg bg-olive-800 dark:bg-olive-700 px-4 py-2">
              <EditableField
                value={data.billboardHero?.cta}
                placeholder="Call to Action"
                onBlur={(v) => data.onFieldChange?.(id, 'billboardHero.cta', v)}
                className="text-center font-semibold text-white placeholder:text-white/40"
              />
            </div>
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

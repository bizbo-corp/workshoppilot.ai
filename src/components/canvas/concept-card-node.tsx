'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Rocket,
  Sparkles,
  Target,
  BarChart3,
  ImageIcon,
  ChevronDown,
  Check,
  Wand2,
  Loader2,
  RefreshCw,
  Send,
  GripHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import type { ConceptFieldId } from '@/lib/canvas/concept-card-utils';

export type ConceptCardNodeRendererData = ConceptCardData & {
  onFieldChange?: (id: string, field: string, value: string) => void;
  onSWOTChange?: (id: string, quadrant: string, index: number, value: string) => void;
  onFeasibilityChange?: (
    id: string,
    dimension: string,
    score?: number,
    rationale?: string
  ) => void;
  onReassign?: (cardId: string, ownerId: string, ownerName: string, ownerColor: string) => void;
  onGenerateField?: (id: string, field: ConceptFieldId) => void;
  onGenerateAll?: (id: string) => void;
  onElaborate?: (id: string, field: ConceptFieldId, content: string, instructions: string) => void;
  generatingState?: Record<string, boolean>;
  availableOwners?: Array<{ ownerId: string; ownerName: string; ownerColor: string }>;
  isFacilitator?: boolean;
  isOwner?: boolean;
  isMultiplayer?: boolean;
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
  accentColor,
  onScoreChange,
  onRationaleChange,
}: {
  label: string;
  score: number;
  rationale: string;
  accentColor?: string;
  onScoreChange: (score: number) => void;
  onRationaleChange: (rationale: string) => void;
}) {
  const rationaleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (rationaleRef.current && rationaleRef.current !== document.activeElement) {
      rationaleRef.current.value = rationale || '';
      // Auto-grow after external sync
      rationaleRef.current.style.height = 'auto';
      rationaleRef.current.style.height = `${rationaleRef.current.scrollHeight}px`;
    }
  }, [rationale]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--persona-text-strong)' }}>{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((dotScore) => {
            const filled = dotScore <= score;
            return (
              <button
                key={dotScore}
                onClick={(e) => {
                  e.stopPropagation();
                  onScoreChange(dotScore);
                }}
                className={cn(
                  'nodrag nopan h-3 w-3 rounded-full transition-colors hover:opacity-80',
                  !filled && 'bg-neutral-olive-300 dark:bg-neutral-olive-700',
                )}
                style={filled ? { backgroundColor: accentColor || '#608850' } : undefined}
                aria-label={`Set ${label} score to ${dotScore}`}
              />
            );
          })}
        </div>
      </div>
      <textarea
        ref={rationaleRef}
        className="nodrag nopan w-full resize-none bg-transparent text-xs outline-none transition-colors placeholder:text-olive-500/40 focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1"
        style={{
          color: 'var(--persona-text-muted)',
        }}
        rows={1}
        placeholder="Rationale..."
        defaultValue={rationale}
        onBlur={(e) => onRationaleChange(e.target.value)}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
        }}
      />
    </div>
  );
}

/**
 * ReassignDropdown — facilitator-only dropdown to reassign a concept card to another participant
 */
function ReassignDropdown({
  cardId,
  currentOwnerId,
  availableOwners,
  onReassign,
}: {
  cardId: string;
  currentOwnerId?: string;
  availableOwners: Array<{ ownerId: string; ownerName: string; ownerColor: string }>;
  onReassign: (cardId: string, ownerId: string, ownerName: string, ownerColor: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const otherOwners = availableOwners.filter((o) => o.ownerId !== currentOwnerId);
  if (otherOwners.length === 0) return null;

  return (
    <div ref={ref} className="relative nodrag nopan">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        Reassign
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-card rounded-lg shadow-lg border border-border p-1 min-w-[160px] z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {otherOwners.map((owner) => (
            <button
              key={owner.ownerId}
              onClick={(e) => {
                e.stopPropagation();
                onReassign(cardId, owner.ownerId, owner.ownerName, owner.ownerColor);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors"
            >
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: owner.ownerColor }}
              />
              {owner.ownerName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SectionAiButton — small AI wand icon next to section headers.
 * Empty field: single click generates. Has content: opens popover with Regenerate/Elaborate.
 */
function SectionAiButton({
  field,
  hasContent,
  isGenerating,
  canGenerate,
  onGenerate,
  onElaborate,
}: {
  field: ConceptFieldId;
  hasContent: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onElaborate: (instructions: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showElaborate, setShowElaborate] = useState(false);
  const [instructions, setInstructions] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as globalThis.Node)) {
        setShowMenu(false);
        setShowElaborate(false);
        setInstructions('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (showElaborate && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showElaborate]);

  if (!canGenerate) return null;

  if (isGenerating) {
    return (
      <Loader2 className="h-3 w-3 shrink-0 animate-spin text-olive-500" />
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasContent) {
      onGenerate();
    } else {
      setShowMenu(!showMenu);
    }
  };

  return (
    <div ref={menuRef} className="relative nodrag nopan">
      <button
        onClick={handleClick}
        className="flex items-center justify-center rounded-md p-0.5 text-olive-500/60 hover:text-olive-600 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label={`AI generate ${field}`}
      >
        <Wand2 className="h-3 w-3" />
      </button>
      {showMenu && (
        <div className="absolute top-full mt-1 right-0 bg-card rounded-lg shadow-lg border border-border p-1 min-w-[160px] z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate();
              setShowMenu(false);
            }}
            className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Regenerate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowElaborate(true);
            }}
            className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors"
          >
            <Wand2 className="h-3 w-3" />
            Elaborate
          </button>
          {showElaborate && (
            <div className="mt-1 border-t border-border pt-1">
              <div className="flex items-center gap-1 px-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && instructions.trim()) {
                      onElaborate(instructions.trim());
                      setShowMenu(false);
                      setShowElaborate(false);
                      setInstructions('');
                    }
                  }}
                  placeholder="How to improve..."
                  className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (instructions.trim()) {
                      onElaborate(instructions.trim());
                      setShowMenu(false);
                      setShowElaborate(false);
                      setInstructions('');
                    }
                  }}
                  disabled={!instructions.trim()}
                  className="rounded p-1 hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ConceptCardNode = memo(
  ({ data, id, selected }: NodeProps<ConceptCardNodeType>) => {
    const isFilled = data.cardState === 'filled';
    const isActive = data.cardState === 'active';
    const isNonOwned = data.isMultiplayer && !data.isOwner && !data.isFacilitator;

    // AI generation state
    const gs = data.generatingState || {};
    const isGeneratingAll = !!gs['all'];
    const canGenerate = !data.isMultiplayer || !!data.isOwner || !!data.isFacilitator;
    const anyGenerating = Object.values(gs).some(Boolean);

    // Guard against incomplete data from DB
    const defaultDim = { score: 0, rationale: '' };
    const feasibility = {
      technical: data.feasibility?.technical ?? defaultDim,
      business: data.feasibility?.business ?? defaultDim,
      userDesirability: data.feasibility?.userDesirability ?? defaultDim,
    };
    const emptySwot = { strengths: ['', '', ''], weaknesses: ['', '', ''], opportunities: ['', '', ''], threats: ['', '', ''] };
    const swot = data.swot ?? emptySwot;

    // Owner color tinting — faint wash across card background + borders
    const oc = data.ownerColor;
    const cardBg = oc ? `color-mix(in srgb, ${oc} 6%, ${SAGE.bg})` : SAGE.bg;
    const cardBorder = oc ? `color-mix(in srgb, ${oc} 30%, ${SAGE.border})` : SAGE.border;
    const sectionBorder = oc ? `color-mix(in srgb, ${oc} 15%, ${SAGE.sectionBorder})` : SAGE.sectionBorder;

    // State glows layer on top of owner tint
    let boxShadow: string | undefined;
    let glowClass = '';

    if (isFilled) {
      boxShadow = `0 0 0 2px #22c55e, 0 0 16px 4px #22c55e40`;
    } else if (isActive) {
      glowClass = 'concept-card-active-glow';
    } else if (selected) {
      boxShadow = `0 0 0 2px ${SAGE.borderSelected}`;
    }

    return (
      <div
        className={cn(
          'persona-card relative w-[680px] rounded-2xl shadow-xl overflow-hidden',
          glowClass,
          isNonOwned && 'concept-card-non-owned',
        )}
        style={{
          backgroundColor: cardBg,
          color: 'var(--persona-text-strong)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: cardBorder,
          boxShadow,
        }}
      >
        {/* Filled checkmark badge */}
        {isFilled && (
          <div className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 shadow-md">
            <Check className="h-5 w-5 text-white" strokeWidth={3} />
          </div>
        )}

        {/* ── Header Top: Drag handle bar — full owner color ── */}
        <div
          className="card-drag-handle relative flex items-center justify-center cursor-grab active:cursor-grabbing rounded-t-2xl py-2"
          style={{
            backgroundColor: oc || 'var(--persona-header-bg)',
          }}
        >
          <GripHorizontal className="h-4 w-4 text-white/50" />

          {/* Generate All — top-right on drag bar */}
          {canGenerate && data.onGenerateAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onGenerateAll?.(id);
              }}
              disabled={anyGenerating}
              className={cn(
                'nodrag nopan absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                'text-white/70 hover:bg-white/15 hover:text-white',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              aria-label="Generate all fields"
            >
              {isGeneratingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {isGeneratingAll ? 'Generating...' : 'Generate All'}
            </button>
          )}
        </div>

        {/* ── Header Bottom: Info section — 20% owner color tint ── */}
        <div
          className="relative px-6 pb-4 pt-3"
          style={{
            backgroundColor: oc
              ? `color-mix(in srgb, ${oc} 20%, ${SAGE.bg})`
              : SAGE.bg,
          }}
        >
          {/* Concept name — editable, dark text for accessibility */}
          <div style={{ color: 'var(--persona-text-strong)' }}>
            <EditableField
              value={data.conceptName}
              placeholder="Concept Name"
              onBlur={(v) => data.onFieldChange?.(id, 'conceptName', v)}
              className="text-2xl font-bold text-inherit placeholder:text-olive-500/40 focus:bg-black/5"
            />
          </div>

          {/* Owner name + source + Reassign */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex flex-col">
              {data.ownerName && (
                <span className="text-sm font-medium" style={{ color: 'var(--persona-text-medium)' }}>
                  {data.ownerName}
                </span>
              )}
              {data.ideaSource && (
                <span className="text-xs" style={{ color: 'var(--persona-text-muted)' }}>
                  From: {data.ideaSource}
                </span>
              )}
            </div>
            {data.isFacilitator && data.availableOwners && data.onReassign && (
              <ReassignDropdown
                cardId={id}
                currentOwnerId={data.ownerId}
                availableOwners={data.availableOwners}
                onReassign={data.onReassign}
              />
            )}
          </div>
        </div>

        <Handle
          type="target"
          position={Position.Top}
          className="!opacity-0 !w-0 !h-0"
        />

        {/* ── 1. Sketch Image — multiply blend onto tinted background ── */}
        {data.sketchImageUrl ? (
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: 480,
              backgroundColor: oc
                ? `color-mix(in srgb, ${oc} 12%, ${SAGE.bg})`
                : cardBg,
            }}
          >
            <img
              src={data.sketchImageUrl}
              alt="Concept sketch"
              className="h-full w-full object-cover"
              style={{ mixBlendMode: 'multiply' }}
            />
          </div>
        ) : (
          <div
            className="relative w-full flex flex-col items-center justify-center gap-3"
            style={{
              height: 480,
              backgroundColor: oc
                ? `color-mix(in srgb, ${oc} 15%, ${SAGE.bg})`
                : SAGE.headerBg,
            }}
          >
            <ImageIcon className="h-12 w-12" style={{ color: 'var(--persona-text-muted)', opacity: 0.3 }} />
            <span className="text-sm font-medium" style={{ color: 'var(--persona-text-muted)', opacity: 0.5 }}>Awaiting sketch...</span>
          </div>
        )}

        {/* Generate-all shimmer overlay */}
        {isGeneratingAll && (
          <div className="absolute inset-0 z-20 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse pointer-events-none" />
        )}

        {/* ── 2. Elevator Pitch ── */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: `1px solid ${sectionBorder}` }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="flex-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              Elevator Pitch
            </h4>
            <SectionAiButton
              field="elevatorPitch"
              hasContent={!!data.elevatorPitch}
              isGenerating={!!gs['elevatorPitch'] || isGeneratingAll}
              canGenerate={canGenerate && !!data.onGenerateField}
              onGenerate={() => data.onGenerateField?.(id, 'elevatorPitch')}
              onElaborate={(instr) => data.onElaborate?.(id, 'elevatorPitch', data.elevatorPitch || '', instr)}
            />
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
          style={{ borderBottom: `1px solid ${sectionBorder}` }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="flex-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              Unique Selling Proposition
            </h4>
            <SectionAiButton
              field="usp"
              hasContent={!!data.usp}
              isGenerating={!!gs['usp'] || isGeneratingAll}
              canGenerate={canGenerate && !!data.onGenerateField}
              onGenerate={() => data.onGenerateField?.(id, 'usp')}
              onElaborate={(instr) => data.onElaborate?.(id, 'usp', data.usp || '', instr)}
            />
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
          style={{ borderBottom: `1px solid ${sectionBorder}` }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="flex-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              SWOT Analysis
            </h4>
            <SectionAiButton
              field="swot"
              hasContent={!!swot.strengths?.some((s) => !!s)}
              isGenerating={!!gs['swot'] || isGeneratingAll}
              canGenerate={canGenerate && !!data.onGenerateField}
              onGenerate={() => data.onGenerateField?.(id, 'swot')}
              onElaborate={() => {/* SWOT elaborate not supported — use regenerate */}}
            />
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
              {swot.strengths.map((item, idx) => (
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
              {swot.weaknesses.map((item, idx) => (
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
              {swot.opportunities.map((item, idx) => (
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
              {swot.threats.map((item, idx) => (
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
            <h4 className="flex-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              Feasibility Assessment
            </h4>
            <SectionAiButton
              field="feasibility"
              hasContent={feasibility.technical.score > 0}
              isGenerating={!!gs['feasibility'] || isGeneratingAll}
              canGenerate={canGenerate && !!data.onGenerateField}
              onGenerate={() => data.onGenerateField?.(id, 'feasibility')}
              onElaborate={() => {/* Feasibility elaborate not supported — use regenerate */}}
            />
          </div>
          <div className="space-y-3">
            <FeasibilityDimension
              label="Technical Feasibility"
              score={feasibility.technical.score}
              rationale={feasibility.technical.rationale}
              accentColor={oc}
              onScoreChange={(score) =>
                data.onFeasibilityChange?.(id, 'technical', score, undefined)
              }
              onRationaleChange={(rationale) =>
                data.onFeasibilityChange?.(id, 'technical', undefined, rationale)
              }
            />
            <FeasibilityDimension
              label="Business Viability"
              score={feasibility.business.score}
              rationale={feasibility.business.rationale}
              accentColor={oc}
              onScoreChange={(score) =>
                data.onFeasibilityChange?.(id, 'business', score, undefined)
              }
              onRationaleChange={(rationale) =>
                data.onFeasibilityChange?.(id, 'business', undefined, rationale)
              }
            />
            <FeasibilityDimension
              label="User Desirability"
              score={feasibility.userDesirability.score}
              rationale={feasibility.userDesirability.rationale}
              accentColor={oc}
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

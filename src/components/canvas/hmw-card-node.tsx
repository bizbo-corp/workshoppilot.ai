'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Check, Lightbulb, Loader2, RefreshCw, Send, Sparkles, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';

export type HmwCardNodeRendererData = HmwCardData & {
  onFieldChange?: (id: string, field: string, value: string) => void;
  onChipSelect?: (id: string, field: string, value: string) => void;
  onStatementChange?: (id: string, value: string) => void;
  onDelete?: (id: string) => void;
  onFieldFocus?: (id: string, field: string) => void;
  onGenerateField?: (id: string, field: string) => void;
  onGenerateAll?: (id: string) => void;
  onElaborate?: (id: string, field: string, content: string, instructions: string) => void;
  generatingState?: Record<string, boolean>;
};

export type HmwCardNodeType = Node<HmwCardNodeRendererData, 'hmwCard'>;

/* ── Sage palette (adapts via CSS custom properties in globals.css) ── */
const SAGE = {
  bg: 'var(--hmw-bg)',
  border: 'var(--hmw-border)',
  borderSelected: 'var(--hmw-border-selected)',
  headerBg: 'var(--hmw-header-bg)',
  headerText: 'var(--hmw-header-text)',
  sectionBorder: 'var(--hmw-section-border)',
  sectionBg: 'var(--hmw-section-bg)',
  chipBg: 'var(--hmw-chip-bg)',
  chipHover: 'var(--hmw-chip-hover)',
  chipText: 'var(--hmw-chip-text)',
  labelText: 'var(--hmw-label-text)',
  prefixText: 'var(--hmw-prefix-text)',
  hintText: 'var(--hmw-hint-text)',
  statementBg: 'var(--hmw-statement-bg)',
};

/** Field configuration for the 4-part HMW builder */
const HMW_FIELDS = [
  { key: 'givenThat', prefix: 'Given that', hint: 'context, situation from journey dip' },
  { key: 'persona', prefix: 'how might we (help)', hint: 'persona, user group' },
  { key: 'immediateGoal', prefix: 'do/be/feel/achieve', hint: 'immediate goal from research' },
  { key: 'deeperGoal', prefix: 'So they can', hint: 'deeper, broader emotional goal' },
] as const;

/**
 * Inline-editable text field — auto-growing textarea.
 * Uses defaultValue + onBlur pattern matching PersonaTemplateNode.
 */
function EditableField({
  value,
  placeholder,
  onBlur,
  onFocus,
  className,
  disabled,
}: {
  value?: string;
  placeholder: string;
  onBlur: (value: string) => void;
  onFocus?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || '';
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className={cn(
        'nodrag nopan w-full bg-transparent outline-none transition-colors resize-none',
        'placeholder:text-[var(--hmw-placeholder)]',
        'focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1',
        disabled && 'pointer-events-none',
        className
      )}
      placeholder={placeholder}
      defaultValue={value || ''}
      onBlur={(e) => onBlur(e.target.value)}
      onFocus={onFocus}
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      }}
      disabled={disabled}
    />
  );
}

/**
 * Inline suggestion chips — rendered below a field when suggestions exist
 */
function SuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (value: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="nodrag nopan rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: SAGE.chipBg,
            color: SAGE.chipText,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = SAGE.chipHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = SAGE.chipBg; }}
        >
          {suggestion}
        </button>
      ))}
      <button
        type="button"
        className="nodrag nopan rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border border-dashed"
        style={{
          borderColor: SAGE.chipBg,
          color: SAGE.hintText,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = SAGE.chipBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        onClick={() => {
          const parent = document.activeElement?.closest('[data-field-row]');
          const input = parent?.querySelector('textarea');
          input?.focus();
        }}
      >
        Custom...
      </button>
    </div>
  );
}

/**
 * Editable complete statement — textarea that auto-sizes and syncs on blur.
 */
function EditableStatement({
  value,
  placeholder,
  onBlur,
  disabled,
}: {
  value?: string;
  placeholder: string;
  onBlur: (value: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || '';
      // Auto-resize
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={cn(
        'nodrag nopan w-full bg-transparent outline-none resize-none',
        'text-sm leading-relaxed font-medium select-text cursor-text',
        'placeholder:text-[var(--hmw-placeholder)]',
        'focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1',
        disabled && 'pointer-events-none',
      )}
      style={{ color: SAGE.prefixText }}
      placeholder={placeholder}
      defaultValue={value || ''}
      rows={2}
      onBlur={(e) => onBlur(e.target.value)}
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      }}
      disabled={disabled}
    />
  );
}

/**
 * Skeleton shimmer bar for skeleton state
 */
function SkeletonBar({ width, className }: { width: string; className?: string }) {
  return (
    <div
      className={cn('h-5 rounded-md animate-pulse', className)}
      style={{ width, backgroundColor: SAGE.sectionBorder }}
    />
  );
}

/**
 * SectionAiButton — small AI wand icon next to field labels.
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
  field: string;
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

export const HmwCardNode = memo(
  ({ data, id, selected }: NodeProps<HmwCardNodeType>) => {
    const isSkeleton = data.cardState === 'skeleton';
    const isFilled = data.cardState === 'filled';
    const isActive = data.cardState === 'active';
    const isNonOwned = data.isMultiplayer && !data.isOwner && !data.isFacilitator;

    const gs = data.generatingState || {};
    const isGeneratingAll = !!gs['all'];
    const anyGenerating = Object.values(gs).some(Boolean);

    // Owner color tinting
    const oc = data.ownerColor;
    const cardBg = oc ? `color-mix(in srgb, ${oc} 6%, ${SAGE.bg})` : SAGE.bg;
    const cardBorder = oc ? `color-mix(in srgb, ${oc} 30%, ${SAGE.border})` : SAGE.border;
    const sectionBorder = oc ? `color-mix(in srgb, ${oc} 15%, ${SAGE.sectionBorder})` : SAGE.sectionBorder;

    // State glow
    let boxShadow: string | undefined;
    let glowClass = '';
    if (isFilled) {
      boxShadow = `0 0 0 2px #22c55e, 0 0 16px 4px #22c55e40`;
    } else if (isActive) {
      glowClass = 'concept-card-active-glow';
    } else if (selected) {
      boxShadow = `0 0 0 2px ${SAGE.borderSelected}`;
    }

    // Check if all 4 fields are filled for statement assembly
    const allFieldsFilled = !!(data.givenThat && data.persona && data.immediateGoal && data.deeperGoal);

    // Strip trailing periods so the assembled sentence reads cleanly (e.g. "happy family." → "happy family")
    const strip = (s?: string) => s?.replace(/\.+$/, '') ?? '';
    // Lowercase first character so field values flow as part of one sentence
    const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

    // Auto-assembled statement
    const assembledStatement = allFieldsFilled
      ? `Given that ${lcFirst(strip(data.givenThat))}, how might we help ${lcFirst(strip(data.persona))} ${lcFirst(strip(data.immediateGoal))} so they can ${lcFirst(strip(data.deeperGoal))}?`
      : null;

    return (
      <div
        className={cn(
          'hmw-card w-[700px] rounded-2xl shadow-xl overflow-hidden relative',
          glowClass,
          isNonOwned && 'concept-card-non-owned',
        )}
        style={{
          backgroundColor: cardBg,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: selected ? SAGE.borderSelected : cardBorder,
          boxShadow,
        }}
      >
        {/* Green checkmark badge for filled state */}
        {isFilled && (
          <div className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 shadow-md">
            <Check className="h-5 w-5 text-white" strokeWidth={3} />
          </div>
        )}

        {/* Drag handle grip bar + Generate All button */}
        <div
          className="card-drag-handle flex items-center justify-center w-full h-6 cursor-grab active:cursor-grabbing hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-t-2xl relative"
          style={{ backgroundColor: oc || 'transparent' }}
        >
          <svg width="32" height="4" viewBox="0 0 32 4" fill="currentColor" className="text-neutral-olive-400">
            <rect x="0" y="0" width="32" height="2" rx="1" />
          </svg>
          {data.onGenerateAll && !isNonOwned && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onGenerateAll?.(id);
              }}
              disabled={anyGenerating}
              className="nodrag nopan absolute right-2 top-0.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-50"
              style={{ color: SAGE.headerText }}
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

        <Handle
          type="target"
          position={Position.Top}
          className="!opacity-0 !w-0 !h-0"
        />

        {/* ── Header band ── */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: SAGE.headerBg }}
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5" style={{ color: SAGE.headerText, opacity: 0.8 }} />
            <span
              className="text-lg font-bold tracking-wide"
              style={{ color: SAGE.headerText }}
            >
              HOW MIGHT WE CARD
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: 'var(--hmw-badge-bg)', color: SAGE.headerText }}
            >
              HMW
            </span>
            {data.onDelete && (
              <button
                type="button"
                onClick={() => data.onDelete?.(id)}
                className="nodrag nopan rounded-full p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                title="Delete card"
              >
                <X className="h-4 w-4" style={{ color: SAGE.headerText, opacity: 0.6 }} />
              </button>
            )}
          </div>
        </div>

        {/* ── Owner name band (multiplayer only) ── */}
        {data.ownerName && (
          <div
            className="px-6 py-2 flex items-center gap-2"
            style={{
              backgroundColor: oc ? `color-mix(in srgb, ${oc} 15%, ${SAGE.sectionBg})` : SAGE.sectionBg,
              borderBottom: `1px solid ${sectionBorder}`,
            }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.ownerColor || SAGE.headerText }}
            />
            <span
              className="text-xs font-semibold tracking-wide"
              style={{ color: SAGE.labelText }}
            >
              {data.ownerName}
            </span>
          </div>
        )}

        {/* ── Section bar ── */}
        <div
          className="px-6 py-2.5"
          style={{ backgroundColor: SAGE.sectionBg, borderBottom: `1px solid ${sectionBorder}` }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: SAGE.labelText }}
          >
            Reframed Challenge Statement
          </span>
          {data.cardIndex !== undefined && data.cardIndex > 0 && (
            <span
              className="ml-2 text-[11px] font-semibold"
              style={{ color: SAGE.hintText }}
            >
              (Alternative #{data.cardIndex + 1})
            </span>
          )}
        </div>

        {/* ── 4 Field Rows ── */}
        <div className="px-6 py-4 space-y-4">
          {HMW_FIELDS.map(({ key, prefix, hint }) => {
            const fieldValue = data[key as keyof HmwCardData] as string | undefined;
            const fieldSuggestions = data.suggestions?.[key as keyof NonNullable<HmwCardData['suggestions']>] || [];

            return (
              <div
                key={key}
                data-field-row={key}
                className="space-y-1"
                style={{ borderBottom: `1px solid ${sectionBorder}`, paddingBottom: 16 }}
              >
                {isSkeleton ? (
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-semibold shrink-0"
                      style={{ color: SAGE.prefixText, opacity: 0.5 }}
                    >
                      {prefix}
                    </span>
                    <SkeletonBar width="60%" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-sm font-bold shrink-0"
                        style={{ color: SAGE.prefixText }}
                      >
                        {prefix}
                      </span>
                      <EditableField
                        value={fieldValue}
                        placeholder={hint}
                        onBlur={(v) => data.onFieldChange?.(id, key, v)}
                        onFocus={() => {
                          if (!fieldValue && (!fieldSuggestions || fieldSuggestions.length === 0)) {
                            data.onFieldFocus?.(id, key);
                          }
                        }}
                        className="text-sm font-normal text-[var(--hmw-field-text)]"
                        disabled={isSkeleton || isNonOwned}
                      />
                      <SectionAiButton
                        field={key}
                        hasContent={!!fieldValue}
                        isGenerating={!!gs[key] || isGeneratingAll}
                        canGenerate={!isNonOwned && !!data.onGenerateField}
                        onGenerate={() => data.onGenerateField?.(id, key)}
                        onElaborate={(instr) => data.onElaborate?.(id, key, fieldValue || '', instr)}
                      />
                    </div>
                    <div className="pl-0">
                      <span className="text-[11px] italic" style={{ color: SAGE.hintText }}>
                        {hint}
                      </span>
                    </div>
                    {!fieldValue && !isNonOwned && (
                      <SuggestionChips
                        suggestions={fieldSuggestions}
                        onSelect={(v) => data.onChipSelect?.(id, key, v)}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Complete Statement Preview ── */}
        {(assembledStatement || isFilled) && (
          <div
            className="mx-6 mb-5 rounded-xl p-4"
            style={{ backgroundColor: SAGE.statementBg, border: `1px solid ${sectionBorder}` }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5" style={{ color: SAGE.labelText }} />
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: SAGE.labelText }}
              >
                Complete Statement
              </span>
            </div>
            <EditableStatement
              value={data.fullStatement || assembledStatement || ''}
              placeholder="Complete all four fields above to see the assembled statement."
              onBlur={(v) => data.onStatementChange?.(id, v)}
              disabled={isNonOwned}
            />
          </div>
        )}

        <Handle
          type="source"
          position={Position.Bottom}
          className="!opacity-0 !w-0 !h-0"
        />
      </div>
    );
  }
);

HmwCardNode.displayName = 'HmwCardNode';

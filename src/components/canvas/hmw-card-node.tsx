'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CanvasNodeShell } from '@/components/canvas/canvas-node-shell';
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

/**
 * Returns 'white' or a dark color based on perceived luminance of a hex color.
 * Uses the W3C relative luminance formula for WCAG contrast.
 */
function contrastText(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff';
}

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
        <Button
          key={i}
          type="button"
          variant="secondary"
          onClick={() => onSelect(suggestion)}
          className="nodrag nopan w-full h-auto min-h-8 items-start justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-xs font-medium leading-snug"
        >
          {suggestion}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        className="nodrag nopan h-auto rounded-full border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground"
        onClick={() => {
          const parent = document.activeElement?.closest('[data-field-row]');
          const input = parent?.querySelector('textarea');
          input?.focus();
        }}
      >
        Custom...
      </Button>
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
 * ReassignDropdown — facilitator-only dropdown to reassign card ownership.
 */
function ReassignDropdown({
  cardId,
  currentOwnerId,
  availableOwners,
  onReassign,
  triggerClassName,
}: {
  cardId: string;
  currentOwnerId?: string;
  availableOwners: Array<{ ownerId: string; ownerName: string; ownerColor: string }>;
  onReassign: (cardId: string, ownerId: string, ownerName: string, ownerColor: string) => void;
  triggerClassName?: string;
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
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
          triggerClassName ?? 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10',
        )}
      >
        Reassign
        <Icon name="chevron-down" className="h-3 w-3" />
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
      <Button variant="secondary" size="icon-xs" className="nodrag nopan" disabled>
        <Icon name="spinner" className="h-3 w-3 animate-spin text-olive-500" />
      </Button>
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
      <Button
        variant="secondary"
        size="icon-xs"
        onClick={handleClick}
        className="nodrag nopan text-olive-600"
        aria-label={`AI generate ${field}`}
      >
        <Icon name="magic-wand" className="h-3 w-3" />
      </Button>
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
            <Icon name="refresh" className="h-3 w-3" />
            Regenerate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowElaborate(true);
            }}
            className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors"
          >
            <Icon name="magic-wand" className="h-3 w-3" />
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
                  <Icon name="send" className="h-3 w-3" />
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

    // Olive treatment — the card is uniformly olive (matching journey-map group
    // containers and stakeholder mapping); the owner is identified by a colored
    // badge in the header, not by tinting the whole card.
    const oc = data.ownerColor;
    const cardBg = SAGE.bg;
    const cardBorder = SAGE.border;
    const sectionBorder = SAGE.sectionBorder;
    // Participant badge — their assigned color, with auto-contrast text.
    const badgeBg = oc || 'rgba(255,255,255,0.15)';
    const badgeText = oc ? contrastText(oc) : SAGE.headerText;

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
      <CanvasNodeShell
        className="hmw-card w-[700px]"
        backgroundColor={cardBg}
        borderColor={selected ? SAGE.borderSelected : cardBorder}
        borderWidth={2}
        isFilled={isFilled}
        isActive={isActive}
        selected={selected}
        borderSelected={SAGE.borderSelected}
        isNonOwned={isNonOwned}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!opacity-0 !w-0 !h-0"
        />

        {/* ── Olive header — full-width drag handle, journey-map olive ── */}
        <div className="card-drag-handle cursor-grab active:cursor-grabbing px-5 py-4 flex items-center justify-between gap-3 bg-olive-800 dark:bg-olive-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="grip-vertical" className="h-4 w-4 shrink-0 text-white/50" />
            <span className="text-lg font-bold tracking-wide shrink-0 text-white">
              HOW MIGHT WE CARD
            </span>
            {/* Participant badge — owner's colour + name */}
            {data.ownerName && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold min-w-0 shrink truncate ring-1 ring-black/5"
                style={{ backgroundColor: badgeBg, color: badgeText }}
                title={data.ownerName}
              >
                {data.ownerName}
              </span>
            )}
            {data.isFacilitator && data.availableOwners && data.onReassign && (
              <ReassignDropdown
                cardId={id}
                currentOwnerId={data.ownerId}
                availableOwners={data.availableOwners}
                onReassign={data.onReassign}
                triggerClassName="text-white/70 hover:bg-white/15 hover:text-white"
              />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Filled indicator */}
            {isFilled && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                <Icon name="check" className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              </span>
            )}
            {data.onDelete && (
              <button
                type="button"
                onClick={() => data.onDelete?.(id)}
                className="nodrag nopan rounded-full p-1 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                title="Delete card"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Section bar (second-level header) ── */}
        <div
          className="px-6 py-2 flex items-center justify-between gap-3"
          style={{ backgroundColor: SAGE.sectionBg, borderBottom: `1px solid ${sectionBorder}` }}
        >
          <div className="min-w-0 truncate">
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
          {data.onGenerateAll && !isNonOwned && (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={anyGenerating}
              onClick={(e) => {
                e.stopPropagation();
                data.onGenerateAll?.(id);
              }}
              className="nodrag nopan shrink-0"
              aria-label="Generate all fields"
            >
              {isGeneratingAll ? (
                <Icon name="spinner" className="h-3 w-3 animate-spin" />
              ) : (
                <Icon name="sparkles" className="h-3 w-3" />
              )}
              {isGeneratingAll ? 'Generating...' : 'Generate All'}
            </Button>
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
                      {/* No onFocus suggestion-fetch: completing a field (chip or
                          custom typing) advances and requests the next field's
                          suggestions. A focus-triggered request duplicated that and
                          raced the chip click, so it was removed. */}
                      <EditableField
                        value={fieldValue}
                        placeholder={hint}
                        onBlur={(v) => data.onFieldChange?.(id, key, v)}
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
                    {/* Hint shows inline as the placeholder while empty; once
                        the field has content it moves below the entered text. */}
                    {fieldValue && (
                      <div className="pl-0">
                        <span className="text-[11px] italic" style={{ color: SAGE.hintText }}>
                          {hint}
                        </span>
                      </div>
                    )}
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
              <Icon name="lightbulb" className="h-3.5 w-3.5" style={{ color: SAGE.labelText }} />
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
      </CanvasNodeShell>
    );
  }
);

HmwCardNode.displayName = 'HmwCardNode';

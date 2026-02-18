'use client';

import { memo, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';

export type HmwCardNodeRendererData = HmwCardData & {
  onFieldChange?: (id: string, field: string, value: string) => void;
  onChipSelect?: (id: string, field: string, value: string) => void;
};

export type HmwCardNodeType = Node<HmwCardNodeRendererData, 'hmwCard'>;

/* ── Sage palette (matches persona & empathy map) ── */
const SAGE = {
  bg: '#f4f7ef',
  border: '#c5d1a8',
  borderSelected: '#6b7f4e',
  headerBg: '#6b7f4e',
  headerText: '#ffffff',
  sectionBorder: '#dde5cc',
  sectionBg: '#e8eddb',
  chipBg: '#dde5cc',
  chipHover: '#c5d1a8',
  chipText: '#3a4a2a',
  labelText: '#6b7f4e',
  prefixText: '#4a5a32',
  hintText: '#8a9a5b',
  statementBg: '#eef2e4',
};

/** Field configuration for the 4-part HMW builder */
const HMW_FIELDS = [
  { key: 'givenThat', prefix: 'Given that', hint: 'context, situation from journey dip' },
  { key: 'persona', prefix: 'how might we (help)', hint: 'persona, user group' },
  { key: 'immediateGoal', prefix: 'do/be/feel/achieve', hint: 'immediate goal from research' },
  { key: 'deeperGoal', prefix: 'So they can', hint: 'deeper, broader emotional goal' },
] as const;

/**
 * Inline-editable text field — uncontrolled with external sync.
 * Uses defaultValue + onBlur pattern matching PersonaTemplateNode.
 */
function EditableField({
  value,
  placeholder,
  onBlur,
  className,
  disabled,
}: {
  value?: string;
  placeholder: string;
  onBlur: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || '';
    }
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      className={cn(
        'nodrag nopan w-full bg-transparent outline-none transition-colors',
        'placeholder:text-[#8a9a5b]/40',
        'focus:bg-white/60 focus:rounded-md focus:px-2 focus:py-1',
        disabled && 'pointer-events-none',
        className
      )}
      placeholder={placeholder}
      defaultValue={value || ''}
      onBlur={(e) => onBlur(e.target.value)}
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
          // Focus the input field above — find the closest field row's input
          const parent = document.activeElement?.closest('[data-field-row]');
          const input = parent?.querySelector('input');
          input?.focus();
        }}
      >
        Custom...
      </button>
    </div>
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

export const HmwCardNode = memo(
  ({ data, id, selected }: NodeProps<HmwCardNodeType>) => {
    const isSkeleton = data.cardState === 'skeleton';
    const isFilled = data.cardState === 'filled';

    // Check if all 4 fields are filled for statement assembly
    const allFieldsFilled = !!(data.givenThat && data.persona && data.immediateGoal && data.deeperGoal);

    // Strip trailing periods so the assembled sentence reads cleanly (e.g. "happy family." → "happy family")
    const strip = (s?: string) => s?.replace(/\.+$/, '') ?? '';

    // Auto-assembled statement
    const assembledStatement = allFieldsFilled
      ? `Given that ${strip(data.givenThat)}, how might we help ${strip(data.persona)} ${strip(data.immediateGoal)} so they can ${strip(data.deeperGoal)}?`
      : null;

    return (
      <div
        className="w-[700px] rounded-2xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: SAGE.bg,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: selected ? SAGE.borderSelected : SAGE.border,
          opacity: isSkeleton ? 0.7 : 1,
        }}
      >
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
            <Lightbulb className="h-5 w-5 text-white/80" />
            <span className="text-lg font-bold text-white tracking-wide">
              HOW MIGHT WE CARD
            </span>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
          >
            HMW
          </span>
        </div>

        {/* ── Section bar ── */}
        <div
          className="px-6 py-2.5"
          style={{ backgroundColor: SAGE.sectionBg, borderBottom: `1px solid ${SAGE.sectionBorder}` }}
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
                style={{ borderBottom: `1px solid ${SAGE.sectionBorder}`, paddingBottom: 16 }}
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
                        className="text-sm text-[#3a4a2a] font-normal"
                        disabled={isSkeleton}
                      />
                    </div>
                    <div className="pl-0">
                      <span className="text-[11px] italic" style={{ color: SAGE.hintText }}>
                        {hint}
                      </span>
                    </div>
                    <SuggestionChips
                      suggestions={fieldSuggestions}
                      onSelect={(v) => data.onChipSelect?.(id, key, v)}
                    />
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
            style={{ backgroundColor: SAGE.statementBg, border: `1px solid ${SAGE.sectionBorder}` }}
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
            <p className="text-sm leading-relaxed font-medium" style={{ color: SAGE.prefixText }}>
              {assembledStatement || data.fullStatement || 'Complete all four fields above to see the assembled statement.'}
            </p>
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

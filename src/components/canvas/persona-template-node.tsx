'use client';

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  MessageSquare,
  Brain,
  Heart,
  Activity,
  AlertTriangle,
  TrendingUp,
  User,
  Briefcase,
  Quote,
  BookOpen,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';

export type PersonaTemplateNodeRendererData = PersonaTemplateData & {
  onFieldChange?: (id: string, field: string, value: string) => void;
  onGenerateAvatar?: (id: string) => Promise<string | null>;
};

export type PersonaTemplateNodeType = Node<PersonaTemplateNodeRendererData, 'personaTemplate'>;

/* ── Sage palette (matches Step 4 empathy map) ── */
const SAGE = {
  bg: '#f4f7ef',           // very light sage background
  border: '#c5d1a8',       // soft sage border
  borderSelected: '#6b7f4e', // dark sage for selected
  headerBg: '#6b7f4e',     // dark sage header
  headerText: '#ffffff',
  sectionBorder: '#dde5cc', // subtle divider
  avatarBg: '#8a9a5b',     // olive avatar
  avatarText: '#ffffff',
};

/** Empathy zone config: icon, label, color tints keyed to the sage palette */
const EMPATHY_ZONES = [
  { key: 'empathySays',   label: 'Says',   Icon: MessageSquare, bg: 'bg-[#8a9a5b]/10', border: 'border-[#8a9a5b]/25', text: 'text-[#4a5a32]', iconColor: 'text-[#8a9a5b]' },
  { key: 'empathyThinks', label: 'Thinks', Icon: Brain,          bg: 'bg-[#a3b18a]/10', border: 'border-[#a3b18a]/25', text: 'text-[#4a5a32]', iconColor: 'text-[#a3b18a]' },
  { key: 'empathyFeels',  label: 'Feels',  Icon: Heart,          bg: 'bg-[#6b7f4e]/10', border: 'border-[#6b7f4e]/25', text: 'text-[#4a5a32]', iconColor: 'text-[#6b7f4e]' },
  { key: 'empathyDoes',   label: 'Does',   Icon: Activity,       bg: 'bg-[#95a873]/10', border: 'border-[#95a873]/25', text: 'text-[#4a5a32]', iconColor: 'text-[#95a873]' },
  { key: 'empathyPains',  label: 'Pains',  Icon: AlertTriangle,  bg: 'bg-[#c4856b]/10', border: 'border-[#c4856b]/25', text: 'text-[#8b4f3b]', iconColor: 'text-[#c4856b]' },
  { key: 'empathyGains',  label: 'Gains',  Icon: TrendingUp,     bg: 'bg-[#6b9a7a]/10', border: 'border-[#6b9a7a]/25', text: 'text-[#3d6b4f]', iconColor: 'text-[#6b9a7a]' },
] as const;

/**
 * Extracts initials from a name string
 */
function getInitials(name?: string): string {
  return name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
}

/**
 * PersonaAvatar — handles three states:
 * - No image: initials circle with sparkle hover overlay
 * - Loading: shimmer/pulse animation
 * - Has image: 48px thumbnail (used in identity row when portrait section is showing)
 */
function PersonaAvatar({
  name,
  avatarUrl,
  isGenerating,
  onGenerate,
  size = 'large',
}: {
  name?: string;
  avatarUrl?: string;
  isGenerating: boolean;
  onGenerate?: () => void;
  size?: 'large' | 'small';
}) {
  const initials = getInitials(name);
  const sizeClass = size === 'large' ? 'h-24 w-24 text-2xl' : 'h-12 w-12 text-sm';

  // Loading state
  if (isGenerating) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full animate-pulse',
          sizeClass
        )}
        style={{ backgroundColor: SAGE.avatarBg, color: SAGE.avatarText }}
      >
        <Sparkles className={size === 'large' ? 'h-8 w-8 animate-spin' : 'h-4 w-4 animate-spin'} style={{ animationDuration: '3s' }} />
      </div>
    );
  }

  // Has image — show as thumbnail
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Persona'}
        className={cn('shrink-0 rounded-full object-cover', sizeClass)}
      />
    );
  }

  // No image — initials circle with sparkle hover
  return (
    <button
      type="button"
      onClick={onGenerate}
      className={cn(
        'nodrag nopan group relative flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight cursor-pointer transition-all',
        sizeClass
      )}
      style={{ backgroundColor: SAGE.avatarBg, color: SAGE.avatarText }}
      title="Generate portrait"
    >
      <span className="transition-opacity group-hover:opacity-30">{initials}</span>
      <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <Sparkles className={size === 'large' ? 'h-8 w-8' : 'h-4 w-4'} />
      </div>
    </button>
  );
}

/**
 * Large portrait section — shown between header and identity row when avatarUrl exists
 */
function PortraitSection({
  avatarUrl,
  name,
  isGenerating,
  onRegenerate,
}: {
  avatarUrl: string;
  name?: string;
  isGenerating: boolean;
  onRegenerate?: () => void;
}) {
  return (
    <div
      className="relative w-full flex items-center justify-center overflow-hidden"
      style={{
        height: 280,
        backgroundColor: '#f9faf5',
        borderBottom: `1px solid ${SAGE.sectionBorder}`,
      }}
    >
      {isGenerating ? (
        <div className="flex items-center justify-center w-full h-full animate-pulse">
          <Sparkles className="h-12 w-12 animate-spin" style={{ color: SAGE.avatarBg, animationDuration: '3s' }} />
        </div>
      ) : (
        <button
          type="button"
          onClick={onRegenerate}
          className="nodrag nopan group relative w-full h-full cursor-pointer"
          title="Regenerate portrait"
        >
          <img
            src={avatarUrl}
            alt={name || 'Persona portrait'}
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
              <RefreshCw className="h-4 w-4 text-[#4a5a32]" />
              <span className="text-sm font-medium text-[#4a5a32]">Regenerate</span>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

/**
 * Inline-editable text — uncontrolled with external sync.
 * Uses defaultValue + onBlur for editing, but imperatively syncs the DOM
 * value when the prop changes externally (e.g. AI fills in a field)
 * without interrupting active editing (skips sync when focused).
 *
 * autoWidth: sizes the input to its content via a hidden measuring span.
 */
function EditableField({
  value,
  placeholder,
  onBlur,
  className,
  multiline,
  rows,
  autoWidth,
  minWidth,
}: {
  value?: string;
  placeholder: string;
  onBlur: (value: string) => void;
  className?: string;
  multiline?: boolean;
  rows?: number;
  autoWidth?: boolean;
  minWidth?: number;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Sync external value changes to DOM (skip if user is editing)
  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || '';
    }
  }, [value]);

  // Auto-size input width to content
  const syncWidth = () => {
    if (autoWidth && ref.current && measureRef.current) {
      const text = ref.current.value || placeholder;
      measureRef.current.textContent = text;
      const measured = measureRef.current.offsetWidth;
      ref.current.style.width = `${Math.max(measured + 4, minWidth ?? 40)}px`;
    }
  };

  useEffect(syncWidth, [value, autoWidth, placeholder, minWidth]);

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        className={cn(
          'nodrag nopan w-full resize-none bg-transparent outline-none transition-colors',
          'placeholder:text-[#8a9a5b]/40',
          'focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1',
          className
        )}
        rows={rows ?? 3}
        placeholder={placeholder}
        defaultValue={value || ''}
        onBlur={(e) => onBlur(e.target.value)}
      />
    );
  }

  if (autoWidth) {
    return (
      <span className="relative inline-block">
        {/* Hidden span to measure text width */}
        <span
          ref={measureRef}
          className={cn('invisible absolute whitespace-pre', className)}
          aria-hidden
        />
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type="text"
          className={cn(
            'nodrag nopan bg-transparent outline-none transition-colors',
            'placeholder:text-[#8a9a5b]/40',
            'focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1',
            className
          )}
          placeholder={placeholder}
          defaultValue={value || ''}
          onBlur={(e) => onBlur(e.target.value)}
          onInput={syncWidth}
        />
      </span>
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      className={cn(
        'nodrag nopan w-full bg-transparent outline-none transition-colors',
        'placeholder:text-[#8a9a5b]/40',
        'focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1',
        className
      )}
      placeholder={placeholder}
      defaultValue={value || ''}
      onBlur={(e) => onBlur(e.target.value)}
    />
  );
}

export const PersonaTemplateNode = memo(
  ({ data, id, selected }: NodeProps<PersonaTemplateNodeType>) => {
    const hasEmpathyData = EMPATHY_ZONES.some(
      z => data[z.key as keyof PersonaTemplateData]
    );

    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAvatar = useCallback(async () => {
      if (!data.onGenerateAvatar || isGenerating) return;
      setIsGenerating(true);
      try {
        await data.onGenerateAvatar(id);
      } finally {
        setIsGenerating(false);
      }
    }, [data.onGenerateAvatar, id, isGenerating]);

    const hasPortrait = !!data.avatarUrl;

    return (
      <div
        className="w-[680px] rounded-2xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: SAGE.bg,
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

        {/* ── Header band ── */}
        <div
          className="px-6 py-5"
          style={{ backgroundColor: SAGE.headerBg }}
        >
          <EditableField
            value={data.archetype}
            placeholder="Archetype Title"
            onBlur={(v) => data.onFieldChange?.(id, 'archetype', v)}
            className="text-2xl font-bold text-white placeholder:text-white/40 focus:bg-neutral-olive-100/15"
          />
          <EditableField
            value={data.archetypeRole}
            placeholder="Role / Tagline"
            onBlur={(v) => data.onFieldChange?.(id, 'archetypeRole', v)}
            className="text-sm font-medium text-white/75 placeholder:text-white/30 focus:bg-neutral-olive-100/15"
          />
        </div>

        {/* ── Portrait section (shown when avatarUrl exists) ── */}
        {hasPortrait && (
          <PortraitSection
            avatarUrl={data.avatarUrl!}
            name={data.name}
            isGenerating={isGenerating}
            onRegenerate={handleGenerateAvatar}
          />
        )}

        {/* ── Identity row ── */}
        <div
          className="flex items-center gap-5 px-6 py-5"
          style={{ borderBottom: `1px solid ${SAGE.sectionBorder}` }}
        >
          <PersonaAvatar
            name={data.name}
            avatarUrl={data.avatarUrl}
            isGenerating={isGenerating}
            onGenerate={handleGenerateAvatar}
            size={hasPortrait ? 'small' : 'large'}
          />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-baseline gap-2">
              <User className="h-4 w-4 shrink-0 translate-y-[1px]" style={{ color: SAGE.avatarBg }} />
              <EditableField
                value={data.name}
                placeholder="Full Name"
                onBlur={(v) => data.onFieldChange?.(id, 'name', v)}
                className="text-lg font-semibold text-[#3a4a2a]"
                autoWidth
                minWidth={80}
              />
              <span className="shrink-0 text-lg font-semibold text-[#3a4a2a]">,</span>
              <EditableField
                value={data.age ? String(data.age) : ''}
                placeholder="Age"
                onBlur={(v) => data.onFieldChange?.(id, 'age', v)}
                className="text-lg font-semibold text-[#3a4a2a]"
                autoWidth
                minWidth={28}
              />
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0" style={{ color: SAGE.avatarBg }} />
              <EditableField
                value={data.job}
                placeholder="Job Title"
                onBlur={(v) => data.onFieldChange?.(id, 'job', v)}
                className="text-sm text-[#6b7f4e]"
              />
            </div>
          </div>
        </div>

        {/* ── Empathy Map Insights (6 zones in 3x2 grid) ── */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: `1px solid ${SAGE.sectionBorder}` }}
        >
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#6b7f4e]">
              Empathy Map Insights
            </h4>
            {hasEmpathyData && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                style={{ backgroundColor: '#dde5cc', color: '#4a5a32' }}
              >
                From Step 4
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {EMPATHY_ZONES.map(({ key, label, Icon, bg, border, text, iconColor }) => (
              <div
                key={key}
                className={cn('rounded-xl border p-3', bg, border)}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
                  <span className={cn('text-[11px] font-bold uppercase tracking-wider', text)}>
                    {label}
                  </span>
                </div>
                <EditableField
                  value={data[key as keyof PersonaTemplateData] as string | undefined}
                  placeholder="Awaiting insights..."
                  onBlur={(v) => data.onFieldChange?.(id, key, v)}
                  className={cn('text-xs leading-relaxed', text)}
                  multiline
                  rows={4}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Narrative ── */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: `1px solid ${SAGE.sectionBorder}` }}
        >
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#6b7f4e]">
              Narrative
            </h4>
          </div>
          <EditableField
            value={data.narrative}
            placeholder="Awaiting AI draft..."
            onBlur={(v) => data.onFieldChange?.(id, 'narrative', v)}
            className="text-sm leading-relaxed text-[#3a4a2a]/85"
            multiline
            rows={4}
          />
        </div>

        {/* ── Quote ── */}
        <div className="px-6 py-5">
          <div className="mb-2 flex items-center gap-2">
            <Quote className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#6b7f4e]">
              In Their Words
            </h4>
          </div>
          <div
            className="rounded-xl py-3 pl-5 pr-4"
            style={{ backgroundColor: '#e8eddb', borderLeft: `4px solid ${SAGE.avatarBg}` }}
          >
            <EditableField
              value={data.quote}
              placeholder="Awaiting AI draft..."
              onBlur={(v) => data.onFieldChange?.(id, 'quote', v)}
              className="text-sm italic leading-relaxed text-[#3a4a2a]/80"
              multiline
              rows={2}
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

PersonaTemplateNode.displayName = 'PersonaTemplateNode';

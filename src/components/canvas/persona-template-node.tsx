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

/* ── Persona palette (adapts via CSS custom properties in globals.css) ── */
const SAGE = {
  bg: 'var(--persona-bg)',
  border: 'var(--persona-border)',
  borderSelected: 'var(--persona-border-selected)',
  headerBg: 'var(--persona-header-bg)',
  sectionBorder: 'var(--persona-section-border)',
  avatarBg: 'var(--persona-avatar-bg)',
};

/** Empathy zone config: icon, label, CSS variable references for adaptive colors */
const EMPATHY_ZONES = [
  { key: 'empathySays',   label: 'Says',   Icon: MessageSquare, accent: 'var(--persona-empathy-says)',   textColor: 'var(--persona-text-muted)' },
  { key: 'empathyThinks', label: 'Thinks', Icon: Brain,         accent: 'var(--persona-empathy-thinks)', textColor: 'var(--persona-text-muted)' },
  { key: 'empathyFeels',  label: 'Feels',  Icon: Heart,         accent: 'var(--persona-empathy-feels)',  textColor: 'var(--persona-text-muted)' },
  { key: 'empathyDoes',   label: 'Does',   Icon: Activity,      accent: 'var(--persona-empathy-does)',   textColor: 'var(--persona-text-muted)' },
  { key: 'empathyPains',  label: 'Pains',  Icon: AlertTriangle, accent: 'var(--persona-empathy-pains)',  textColor: 'var(--persona-empathy-pains-text)' },
  { key: 'empathyGains',  label: 'Gains',  Icon: TrendingUp,    accent: 'var(--persona-empathy-gains)',  textColor: 'var(--persona-empathy-gains-text)' },
] as const;

/**
 * Converts semicolon-separated text to paragraph-separated (newline-delimited)
 */
function semicolonsToParagraphs(text?: string): string | undefined {
  if (!text) return text;
  return text.replace(/;\s*/g, '\n\n').trim();
}

/**
 * Extracts initials from a name string
 */
function getInitials(name?: string): string {
  return name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
}

/**
 * Small circular avatar for the profile bar — shows initials, image thumbnail, or loading state
 */
function ProfileAvatar({
  name,
  avatarUrl,
  isGenerating,
}: {
  name?: string;
  avatarUrl?: string;
  isGenerating: boolean;
}) {
  const initials = getInitials(name);

  if (isGenerating) {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full animate-pulse"
        style={{ backgroundColor: SAGE.avatarBg, color: '#ffffff' }}
      >
        <Sparkles className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
    );
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Persona'}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold text-sm tracking-tight"
      style={{ backgroundColor: SAGE.avatarBg, color: '#ffffff' }}
    >
      {initials}
    </div>
  );
}

/**
 * Hero section — full-width cover image with gradient overlay and archetype text.
 * When no image: shows a solid background with generate prompt.
 */
function HeroSection({
  avatarUrl,
  archetype,
  archetypeRole,
  name,
  isGenerating,
  isSkeleton,
  onGenerate,
  onFieldChange,
  nodeId,
}: {
  avatarUrl?: string;
  archetype?: string;
  archetypeRole?: string;
  name?: string;
  isGenerating: boolean;
  isSkeleton?: boolean;
  onGenerate?: () => void;
  onFieldChange?: (id: string, field: string, value: string) => void;
  nodeId: string;
}) {
  const hasImage = !!avatarUrl;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 320 }}
    >
      {/* Background: image or solid color */}
      {isGenerating ? (
        <div
          className="absolute inset-0 flex items-center justify-center animate-pulse"
          style={{ backgroundColor: SAGE.headerBg }}
        >
          <Sparkles className="h-12 w-12 animate-spin text-white/60" style={{ animationDuration: '3s' }} />
        </div>
      ) : isSkeleton ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ backgroundColor: SAGE.headerBg }}
        >
          <User className="h-16 w-16 text-white/30 animate-pulse" />
          <span className="text-sm font-medium text-white/40 animate-pulse">Awaiting generation...</span>
        </div>
      ) : hasImage ? (
        <button
          type="button"
          onClick={onGenerate}
          className="nodrag nopan group absolute inset-0 cursor-pointer"
          title="Regenerate portrait"
        >
          <img
            src={avatarUrl}
            alt={name || 'Persona portrait'}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hover regenerate overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
              <RefreshCw className="h-4 w-4 text-card-foreground" />
              <span className="text-sm font-medium text-card-foreground">Regenerate</span>
            </div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          className="nodrag nopan group absolute inset-0 cursor-pointer"
          style={{ backgroundColor: SAGE.headerBg }}
          title="Generate portrait"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
            <Sparkles className="h-10 w-10 text-white/70" />
            <span className="text-sm font-medium text-white/70">Generate portrait</span>
          </div>
        </button>
      )}

      {/* Gradient overlay for text readability */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
        }}
      />

      {/* Archetype title overlay — positioned at bottom-left */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-6 pb-5">
        <EditableField
          value={archetype}
          placeholder="Archetype Title"
          onBlur={(v) => onFieldChange?.(nodeId, 'archetype', v)}
          className="text-2xl font-bold text-white placeholder:text-white/40 drop-shadow-md focus:bg-white/10"
        />
        <EditableField
          value={archetypeRole}
          placeholder="Role / Tagline"
          onBlur={(v) => onFieldChange?.(nodeId, 'archetypeRole', v)}
          className="text-sm font-medium text-white/80 placeholder:text-white/30 drop-shadow-md focus:bg-white/10"
        />
      </div>
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
  autoResize,
}: {
  value?: string;
  placeholder: string;
  onBlur: (value: string) => void;
  className?: string;
  multiline?: boolean;
  rows?: number;
  autoWidth?: boolean;
  minWidth?: number;
  autoResize?: boolean;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Sync external value changes to DOM (skip if user is editing)
  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || '';
    }
  }, [value]);

  // Auto-resize textarea height to fit content
  // Uses minHeight so flex-1 can still stretch the textarea to fill taller grid siblings
  const syncHeight = useCallback(() => {
    if (autoResize && ref.current && ref.current.tagName === 'TEXTAREA') {
      const el = ref.current as HTMLTextAreaElement;
      el.style.minHeight = 'auto';
      el.style.minHeight = `${el.scrollHeight}px`;
    }
  }, [autoResize]);

  // Re-sync height when value changes or on mount
  useEffect(syncHeight, [value, syncHeight]);
  useEffect(() => {
    // Defer to next frame so the textarea is rendered with defaultValue
    if (autoResize) {
      requestAnimationFrame(syncHeight);
    }
  }, [autoResize, syncHeight]);

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
          'nodrag nopan w-full resize-none bg-transparent outline-none transition-colors overflow-hidden',
          'focus:bg-card/60 focus:rounded-md focus:px-2 focus:py-1',
          autoResize && 'flex-1',
          className
        )}
        rows={autoResize ? 1 : (rows ?? 3)}
        placeholder={placeholder}
        defaultValue={value || ''}
        onBlur={(e) => onBlur(e.target.value)}
        onInput={autoResize ? syncHeight : undefined}
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
    const isSkeleton = !!data.archetype && !data.name;
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

    return (
      <div
        className="persona-card w-[680px] rounded-2xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: SAGE.bg,
          color: 'var(--persona-text-strong)',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: selected ? SAGE.borderSelected : SAGE.border,
          opacity: isSkeleton ? 0.6 : 1,
        }}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!opacity-0 !w-0 !h-0"
        />

        {/* ── Hero section: full-width image with overlaid archetype text ── */}
        <HeroSection
          avatarUrl={data.avatarUrl}
          archetype={data.archetype}
          archetypeRole={data.archetypeRole}
          name={data.name}
          isGenerating={isGenerating}
          isSkeleton={isSkeleton}
          onGenerate={handleGenerateAvatar}
          onFieldChange={data.onFieldChange}
          nodeId={id}
        />

        {/* ── Profile bar: avatar + name + job ── */}
        <div
          className="flex items-center gap-4 px-6 py-4"
          style={{
            borderBottom: `1px solid ${SAGE.sectionBorder}`,
            backgroundColor: SAGE.headerBg,
          }}
        >
          <ProfileAvatar
            name={data.name}
            avatarUrl={data.avatarUrl}
            isGenerating={isGenerating}
          />
          {isSkeleton ? (
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded bg-white/20 animate-pulse" />
              <div className="h-4 w-48 rounded bg-white/10 animate-pulse" />
            </div>
          ) : (
            <div className="flex-1 space-y-0.5">
              <div className="flex items-baseline gap-2">
                <User className="h-4 w-4 shrink-0 translate-y-[1px]" style={{ color: 'var(--persona-text-muted)' }} />
                <EditableField
                  value={data.name}
                  placeholder="Full Name"
                  onBlur={(v) => data.onFieldChange?.(id, 'name', v)}
                  className="text-base font-semibold text-white placeholder:text-white/40 focus:bg-white/10"
                  autoWidth
                  minWidth={80}
                />
                <span className="shrink-0 text-base font-semibold text-white/80">,</span>
                <EditableField
                  value={data.age ? String(data.age) : ''}
                  placeholder="Age"
                  onBlur={(v) => data.onFieldChange?.(id, 'age', v)}
                  className="text-base font-semibold text-white placeholder:text-white/40 focus:bg-white/10"
                  autoWidth
                  minWidth={28}
                />
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--persona-text-muted)' }} />
                <EditableField
                  value={data.job}
                  placeholder="Job Title"
                  onBlur={(v) => data.onFieldChange?.(id, 'job', v)}
                  className="text-sm text-white/70 placeholder:text-white/30 focus:bg-white/10"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Empathy Map Insights (6 zones in 3x2 grid) ── */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: `1px solid ${SAGE.sectionBorder}` }}
        >
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              Empathy Map Insights
            </h4>
            {hasEmpathyData && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                style={{ backgroundColor: 'var(--persona-badge-bg)', color: 'var(--persona-badge-text)' }}
              >
                From Step 4
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {EMPATHY_ZONES.map(({ key, label, Icon, accent, textColor }) => (
              <div
                key={key}
                className="flex flex-col rounded-xl border p-3"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
                  color: textColor,
                }}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {label}
                  </span>
                </div>
                {isSkeleton ? (
                  <div className="h-3 w-20 rounded animate-pulse mt-1" style={{ backgroundColor: 'currentColor', opacity: 0.15 }} />
                ) : (
                  <EditableField
                    value={semicolonsToParagraphs(data[key as keyof PersonaTemplateData] as string | undefined)}
                    placeholder="Awaiting insights..."
                    onBlur={(v) => data.onFieldChange?.(id, key, v)}
                    className="text-xs leading-relaxed"
                    multiline
                    autoResize
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Narrative ── */}
        <div
          className="px-6 py-5"
          style={{ borderBottom: `1px solid ${SAGE.sectionBorder}`, color: 'var(--persona-text-narrative)' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              Narrative
            </h4>
          </div>
          {isSkeleton ? (
            <div className="space-y-2">
              <div className="h-3 w-full rounded animate-pulse" style={{ backgroundColor: 'currentColor', opacity: 0.12 }} />
              <div className="h-3 w-3/4 rounded animate-pulse" style={{ backgroundColor: 'currentColor', opacity: 0.12 }} />
            </div>
          ) : (
            <EditableField
              value={data.narrative}
              placeholder="Awaiting AI draft..."
              onBlur={(v) => data.onFieldChange?.(id, 'narrative', v)}
              className="text-sm leading-relaxed"
              multiline
              autoResize
            />
          )}
        </div>

        {/* ── Quote ── */}
        <div className="px-6 py-5" style={{ color: 'var(--persona-text-quote)' }}>
          <div className="mb-2 flex items-center gap-2">
            <Quote className="h-3.5 w-3.5 shrink-0" style={{ color: SAGE.avatarBg }} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--persona-text-medium)' }}>
              In Their Words
            </h4>
          </div>
          <div
            className="rounded-xl py-3 pl-5 pr-4"
            style={{ backgroundColor: 'var(--persona-quote-bg)', borderLeft: `4px solid ${SAGE.avatarBg}` }}
          >
            {isSkeleton ? (
              <div className="h-3 w-48 rounded animate-pulse" style={{ backgroundColor: 'currentColor', opacity: 0.12 }} />
            ) : (
              <EditableField
                value={data.quote}
                placeholder="Awaiting AI draft..."
                onBlur={(v) => data.onFieldChange?.(id, 'quote', v)}
                className="text-sm italic leading-relaxed"
                multiline
                autoResize
              />
            )}
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

'use client';

import { useState } from 'react';
import { ChevronDown, Undo2, Redo2, MousePointer2, Hand, LayoutGrid, Copy, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StickyNoteColor } from '@/stores/canvas-store';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const EMOTION_PRESETS: { label: string; emoji: string; color: StickyNoteColor }[] = [
  { label: 'Positive', emoji: '\u{1F60A}', color: 'green' },
  { label: 'Neutral', emoji: '\u{1F610}', color: 'yellow' },
  { label: 'Negative', emoji: '\u{1F61F}', color: 'pink' },
  { label: 'Blocker', emoji: '\u{1F6AB}', color: 'pink' },
  { label: 'Opportunity', emoji: '\u{1F4A1}', color: 'blue' },
  { label: 'Question', emoji: '\u{2753}', color: 'orange' },
];

const POST_IT_COLORS: { value: StickyNoteColor; label: string; bg: string }[] = [
  { value: 'yellow', label: 'Yellow', bg: 'bg-[var(--sticky-note-yellow)]' },
  { value: 'pink', label: 'Pink', bg: 'bg-[var(--sticky-note-pink)]' },
  { value: 'blue', label: 'Blue', bg: 'bg-[var(--sticky-note-blue)]' },
  { value: 'green', label: 'Green', bg: 'bg-[var(--sticky-note-green)]' },
  { value: 'orange', label: 'Orange', bg: 'bg-[var(--sticky-note-orange)]' },
];

const COLOR_DOTS: Record<StickyNoteColor, string> = {
  yellow: 'bg-amber-300',
  pink: 'bg-pink-300',
  blue: 'bg-blue-300',
  green: 'bg-green-300',
  orange: 'bg-orange-300',
  red: 'bg-red-300',
};

export interface CanvasToolbarProps {
  onAddStickyNote: (color?: StickyNoteColor) => void;
  onAddEmotionStickyNote: (emoji: string, color: StickyNoteColor) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeTool: 'pointer' | 'hand';
  onToolChange: (tool: 'pointer' | 'hand') => void;
  onOpenDraw?: () => void;
  onThemeSort?: () => void;
  showThemeSort?: boolean;
  onDeduplicate?: () => void;
  showDedup?: boolean;
}

function IconButton({
  onClick,
  disabled,
  title,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-colors',
        disabled
          ? 'opacity-40 cursor-not-allowed text-muted-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        active && 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </button>
  );
}

export function CanvasToolbar({
  onAddStickyNote,
  onAddEmotionStickyNote,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeTool,
  onToolChange,
  onOpenDraw,
  onThemeSort,
  showThemeSort,
  onDeduplicate,
  showDedup,
}: CanvasToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <>
      {/* Bottom-center dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-card rounded-xl shadow-md border border-border px-1 py-1 gap-0.5">
        {/* Pointer / Hand tools */}
        <div className="flex items-center">
          <IconButton
            onClick={() => onToolChange('pointer')}
            active={activeTool === 'pointer'}
            title="Pointer tool (V)"
          >
            <MousePointer2 className="w-4 h-4" />
          </IconButton>
          <IconButton
            onClick={() => onToolChange('hand')}
            active={activeTool === 'hand'}
            title="Hand tool (Space)"
          >
            <Hand className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Sticky note split button — looks like a sticky note extruding above the toolbar */}
        <div className="flex items-stretch mx-0.5 rounded-sm shadow-[0_1px_4px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Main sticky note button (adds default yellow) */}
          <button
            onClick={() => onAddStickyNote()}
            title="Add sticky note"
            className="relative flex items-center gap-1 px-2.5 py-1.5 bg-[var(--sticky-note-yellow)] text-amber-900/80 text-sm font-semibold transition-all hover:brightness-[0.97] active:brightness-[0.95] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sticky note</span>
          </button>

          {/* Dropdown arrow trigger */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                title="Sticky note options"
                className="flex items-center px-1.5 bg-[var(--sticky-note-yellow)] text-amber-900/60 border-l border-amber-400/40 transition-all hover:brightness-[0.97] hover:text-amber-900/80 cursor-pointer"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={8} className="w-52">
              {/* Emoji card presets */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Emoji Cards</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EMOTION_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.label}
                  onClick={() => onAddEmotionStickyNote(preset.emoji, preset.color)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-base leading-none">{preset.emoji}</span>
                  <span>{preset.label}</span>
                  <span className={cn('ml-auto w-3 h-3 rounded-full', COLOR_DOTS[preset.color])} />
                </DropdownMenuItem>
              ))}

              {/* Color options */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Colors</DropdownMenuLabel>
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                {POST_IT_COLORS.map(({ value, label, bg }) => (
                  <button
                    key={value}
                    onClick={() => { onAddStickyNote(value); setDropdownOpen(false); }}
                    title={label}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 border-border transition-transform hover:scale-110 hover:border-foreground/40 cursor-pointer',
                      bg
                    )}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Draw button (only if onOpenDraw provided) */}
        {onOpenDraw && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={onOpenDraw}
              title="Draw"
              aria-label="Open drawing canvas"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
              </svg>
              <span>Draw</span>
            </button>
          </>
        )}

        {/* Organize button (ring-based steps only) */}
        {showThemeSort && onThemeSort && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={onThemeSort}
              title="Organize sticky notes by cluster"
              aria-label="Organize sticky notes by cluster"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Organize</span>
            </button>
          </>
        )}

        {/* Deduplicate button (ring-based steps only) */}
        {showDedup && onDeduplicate && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={onDeduplicate}
              title="Remove duplicate sticky notes"
              aria-label="Remove duplicate sticky notes"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Dedup</span>
            </button>
          </>
        )}

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Undo / Redo */}
        <div className="flex items-center">
          <IconButton onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </IconButton>
          <IconButton onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
    </>
  );
}

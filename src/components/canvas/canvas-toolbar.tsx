'use client';

import { Plus, ChevronDown, Undo2, Redo2, MousePointer2, Hand, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostItColor } from '@/stores/canvas-store';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const EMOTION_PRESETS: { label: string; emoji: string; color: PostItColor }[] = [
  { label: 'Positive', emoji: '\u{1F60A}', color: 'green' },
  { label: 'Neutral', emoji: '\u{1F610}', color: 'yellow' },
  { label: 'Negative', emoji: '\u{1F61F}', color: 'pink' },
  { label: 'Blocker', emoji: '\u{1F6AB}', color: 'pink' },
  { label: 'Opportunity', emoji: '\u{1F4A1}', color: 'blue' },
  { label: 'Question', emoji: '\u{2753}', color: 'orange' },
];

const COLOR_DOTS: Record<PostItColor, string> = {
  yellow: 'bg-amber-300',
  pink: 'bg-pink-300',
  blue: 'bg-blue-300',
  green: 'bg-green-300',
  orange: 'bg-orange-300',
};

export interface CanvasToolbarProps {
  onAddPostIt: () => void;
  onAddEmotionPostIt: (emoji: string, color: PostItColor) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeTool: 'pointer' | 'hand';
  onToolChange: (tool: 'pointer' | 'hand') => void;
  onOpenDraw?: () => void;
  onThemeSort?: () => void;
  showThemeSort?: boolean;
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
          ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200',
        active && 'bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200'
      )}
    >
      {children}
    </button>
  );
}

export function CanvasToolbar({
  onAddPostIt,
  onAddEmotionPostIt,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeTool,
  onToolChange,
  onOpenDraw,
  onThemeSort,
  showThemeSort,
}: CanvasToolbarProps) {
  return (
    <>
      {/* Bottom-center dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-200 dark:border-zinc-700 px-1 py-1 gap-0.5">
        {/* Pointer / Hand tools */}
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

        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-600 mx-0.5" />

        {/* Add post-it */}
        <button
          onClick={onAddPostIt}
          title="Add post-it"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Post-it</span>
        </button>

        {/* Draw button (only if onOpenDraw provided) */}
        {onOpenDraw && (
          <>
            <div className="w-px h-5 bg-gray-200 dark:bg-zinc-600 mx-0.5" />
            <button
              onClick={onOpenDraw}
              title="Draw"
              aria-label="Open drawing canvas"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
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
            <div className="w-px h-5 bg-gray-200 dark:bg-zinc-600 mx-0.5" />
            <button
              onClick={onThemeSort}
              title="Organize post-its by cluster"
              aria-label="Organize post-its by cluster"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Organize</span>
            </button>
          </>
        )}

        {/* Emoji post-it dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Add emotion post-it"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <span className="text-base leading-none">{'\u{1F60A}'}</span>
              <span>Emoji</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-48">
            <DropdownMenuLabel className="text-xs text-gray-500">Emotion Post-its</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {EMOTION_PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => onAddEmotionPostIt(preset.emoji, preset.color)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-base leading-none">{preset.emoji}</span>
                <span>{preset.label}</span>
                <span className={cn('ml-auto w-3 h-3 rounded-full', COLOR_DOTS[preset.color])} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-600 mx-0.5" />

        {/* Undo / Redo */}
        <IconButton onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </IconButton>
        <IconButton onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="w-4 h-4" />
        </IconButton>
      </div>
    </>
  );
}

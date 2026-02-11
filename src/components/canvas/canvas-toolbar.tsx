'use client';

import { Plus, ChevronDown, Undo2, Redo2, MousePointer2, Hand } from 'lucide-react';
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
          ? 'opacity-40 cursor-not-allowed text-gray-400'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800',
        active && 'bg-gray-100 text-gray-800'
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
}: CanvasToolbarProps) {
  return (
    <>
      {/* Bottom-center dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-white rounded-xl shadow-md border border-gray-200 px-1 py-1 gap-0.5">
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

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Add post-it */}
        <button
          onClick={onAddPostIt}
          title="Add post-it"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Post-it</span>
        </button>

        {/* Emoji post-it dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Add emotion post-it"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
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

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

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

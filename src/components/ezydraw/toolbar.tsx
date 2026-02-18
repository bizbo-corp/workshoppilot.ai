'use client';

import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import {
  Pencil,
  Square,
  Circle,
  Type,
  MousePointer2,
  Eraser,
  ArrowRight,
  Minus,
  Diamond,
  Undo2,
  Redo2,
  Trash2,
  Save,
  X,
  MessageCircle,
  Smile,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { EmojiPickerTool } from '@/components/ezydraw/tools/emoji-picker-tool';
import type { DrawingElement } from '@/lib/drawing/types';

interface EzyDrawFooterProps {
  onSave: () => void;
  onCancel: () => void;
}

const TOOL_BUTTONS = [
  { tool: 'select', icon: MousePointer2, label: 'Select (V)', hotkey: 'v' },
  { tool: 'pencil', icon: Pencil, label: 'Pencil (P)', hotkey: 'p' },
  { tool: 'rectangle', icon: Square, label: 'Rectangle (R)', hotkey: 'r' },
  { tool: 'circle', icon: Circle, label: 'Circle (C)', hotkey: 'c' },
  { tool: 'diamond', icon: Diamond, label: 'Diamond (D)', hotkey: 'd' },
  { tool: 'arrow', icon: ArrowRight, label: 'Arrow (A)', hotkey: 'a' },
  { tool: 'line', icon: Minus, label: 'Line (L)', hotkey: 'l' },
  { tool: 'text', icon: Type, label: 'Text (T)', hotkey: 't' },
  { tool: 'speechBubble', icon: MessageCircle, label: 'Speech Bubble (B)', hotkey: 'b' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser (E)', hotkey: 'e' },
] as const;

const STROKE_WIDTH_OPTIONS = [
  { value: 1, label: 'Thin' },
  { value: 2, label: 'Medium' },
  { value: 4, label: 'Thick' },
];

/** SVG icon showing three horizontal lines of increasing thickness */
function StrokeWidthIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor">
      <rect x="2" y="3" width="12" height="1" rx="0.5" />
      <rect x="2" y="7" width="12" height="2" rx="1" />
      <rect x="2" y="12" width="12" height="3" rx="1" />
    </svg>
  );
}

/**
 * Header toolbar: drawing tools + stroke/fill options
 */
export function EzyDrawToolbar() {
  const activeTool = useDrawingStore((state) => state.activeTool);
  const setActiveTool = useDrawingStore((state) => state.setActiveTool);
  const strokeColor = useDrawingStore((state) => state.strokeColor);
  const setStrokeColor = useDrawingStore((state) => state.setStrokeColor);
  const fillColor = useDrawingStore((state) => state.fillColor);
  const setFillColor = useDrawingStore((state) => state.setFillColor);
  const strokeWidth = useDrawingStore((state) => state.strokeWidth);
  const setStrokeWidth = useDrawingStore((state) => state.setStrokeWidth);
  const addElement = useDrawingStore((state) => state.addElement);

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  // Keyboard shortcuts for tools
  TOOL_BUTTONS.forEach(({ tool, hotkey }) => {
    useHotkeys(hotkey, () => setActiveTool(tool as any));
  });

  const handleEmojiSelect = (emoji: string) => {
    addElement({
      type: 'emoji',
      x: 400,
      y: 300,
      emoji,
      fontSize: 48,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
    } as Omit<DrawingElement, 'id'>);
  };

  const currentWidthLabel = STROKE_WIDTH_OPTIONS.find((o) => o.value === strokeWidth)?.label ?? 'Thick';

  return (
    <div className="z-10 flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b bg-card/95 px-3 backdrop-blur">
      {/* Tool buttons */}
      <div className="flex items-center gap-0.5">
        {TOOL_BUTTONS.map(({ tool, icon: Icon, label }) => (
          <Button
            key={tool}
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              activeTool === tool &&
                'bg-olive-100 text-olive-700 ring-1 ring-olive-300 hover:bg-olive-100 dark:bg-olive-900/50 dark:text-olive-300 dark:ring-olive-700 dark:hover:bg-olive-900/50'
            )}
            onClick={() => setActiveTool(tool as any)}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Emoji button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8',
          emojiPickerOpen && 'bg-olive-100 text-olive-700 ring-1 ring-olive-300 hover:bg-olive-100 dark:bg-olive-900/50 dark:text-olive-300 dark:ring-olive-700 dark:hover:bg-olive-900/50'
        )}
        onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
        title="Emoji"
      >
        <Smile className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Stroke & fill options */}
      <div className="flex items-center gap-2">
        {/* Stroke color */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Stroke:</span>
          <label className="relative cursor-pointer">
            <div
              className="h-6 w-6 rounded border border-border shadow-sm"
              style={{ backgroundColor: strokeColor }}
              title="Stroke color"
            />
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>

        {/* Stroke width dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5" title="Stroke width">
              <StrokeWidthIcon className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[100px]">
            <DropdownMenuRadioGroup
              value={String(strokeWidth)}
              onValueChange={(v) => setStrokeWidth(Number(v))}
            >
              {STROKE_WIDTH_OPTIONS.map(({ value, label }) => (
                <DropdownMenuRadioItem key={value} value={String(value)}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block rounded-full bg-current"
                      style={{ width: 20, height: value }}
                    />
                    {label}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fill color */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Fill:</span>
          <label className="relative cursor-pointer">
            <div
              className="h-6 w-6 rounded border border-border shadow-sm"
              style={{
                backgroundColor: fillColor === 'transparent' ? '#fff' : fillColor,
                backgroundImage:
                  fillColor === 'transparent'
                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                    : undefined,
                backgroundSize: fillColor === 'transparent' ? '8px 8px' : undefined,
                backgroundPosition:
                  fillColor === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
              }}
              title="Fill color"
            />
            <input
              type="color"
              value={fillColor === 'transparent' ? '#ffffff' : fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      {/* Emoji picker popup */}
      <EmojiPickerTool
        isOpen={emojiPickerOpen}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setEmojiPickerOpen(false)}
      />
    </div>
  );
}

/**
 * Footer bar: undo, redo, clear, cancel, save
 */
export function EzyDrawFooter({ onSave, onCancel }: EzyDrawFooterProps) {
  const canUndo = useDrawingStore((state) => state.canUndo);
  const canRedo = useDrawingStore((state) => state.canRedo);
  const undo = useDrawingStore((state) => state.undo);
  const redo = useDrawingStore((state) => state.redo);
  const clearAll = useDrawingStore((state) => state.clearAll);

  useHotkeys('mod+z', () => undo(), { enabled: canUndo });
  useHotkeys('mod+shift+z', () => redo(), { enabled: canRedo });

  const handleClearAll = () => {
    if (window.confirm('Clear entire drawing? This cannot be undone.')) {
      clearAll();
    }
  };

  return (
    <div className="z-10 flex h-12 shrink-0 items-center justify-between border-t bg-card/95 px-3 backdrop-blur">
      {/* Left: undo / redo / clear */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClearAll}
          title="Clear all"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: cancel / save */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={onCancel}
          title="Cancel"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-8"
          onClick={onSave}
          title="Save drawing"
        >
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}

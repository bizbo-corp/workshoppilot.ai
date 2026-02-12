'use client';

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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EzyDrawToolbarProps {
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
  { tool: 'eraser', icon: Eraser, label: 'Eraser (E)', hotkey: 'e' },
] as const;

const STROKE_WIDTH_OPTIONS = [
  { value: 1, label: 'Thin' },
  { value: 2, label: 'Medium' },
  { value: 4, label: 'Thick' },
];

export function EzyDrawToolbar({ onSave, onCancel }: EzyDrawToolbarProps) {
  const activeTool = useDrawingStore((state) => state.activeTool);
  const setActiveTool = useDrawingStore((state) => state.setActiveTool);
  const strokeColor = useDrawingStore((state) => state.strokeColor);
  const setStrokeColor = useDrawingStore((state) => state.setStrokeColor);
  const fillColor = useDrawingStore((state) => state.fillColor);
  const setFillColor = useDrawingStore((state) => state.setFillColor);
  const strokeWidth = useDrawingStore((state) => state.strokeWidth);
  const setStrokeWidth = useDrawingStore((state) => state.setStrokeWidth);
  const canUndo = useDrawingStore((state) => state.canUndo);
  const canRedo = useDrawingStore((state) => state.canRedo);
  const undo = useDrawingStore((state) => state.undo);
  const redo = useDrawingStore((state) => state.redo);
  const clearAll = useDrawingStore((state) => state.clearAll);

  // Keyboard shortcuts
  useHotkeys('mod+z', () => undo(), { enabled: canUndo });
  useHotkeys('mod+shift+z', () => redo(), { enabled: canRedo });

  TOOL_BUTTONS.forEach(({ tool, hotkey }) => {
    useHotkeys(hotkey, () => setActiveTool(tool as any));
  });

  const handleClearAll = () => {
    if (window.confirm('Clear entire drawing? This cannot be undone.')) {
      clearAll();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-10 flex h-12 items-center gap-1 border-b bg-white/95 px-3 backdrop-blur">
      {/* Left section: Tool buttons */}
      <div className="flex items-center gap-0.5">
        {TOOL_BUTTONS.map(({ tool, icon: Icon, label }) => (
          <Button
            key={tool}
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              activeTool === tool &&
                'bg-blue-100 text-blue-700 ring-1 ring-blue-300 hover:bg-blue-100'
            )}
            onClick={() => setActiveTool(tool as any)}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-1 h-6 w-px bg-gray-300" />

      {/* Center section: Options */}
      <div className="flex items-center gap-2">
        {/* Stroke color */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-600">Stroke:</span>
          <label className="relative cursor-pointer">
            <div
              className="h-6 w-6 rounded border border-gray-300 shadow-sm"
              style={{ backgroundColor: strokeColor }}
              title="Stroke color"
            />
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-1">
          {STROKE_WIDTH_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2 text-xs',
                strokeWidth === value &&
                  'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
              )}
              onClick={() => setStrokeWidth(value)}
              title={`${label} stroke (${value}px)`}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Fill color */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-600">Fill:</span>
          <label className="relative cursor-pointer">
            <div
              className="h-6 w-6 rounded border border-gray-300 shadow-sm"
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
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section: Actions */}
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

        <div className="mx-1 h-6 w-px bg-gray-300" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClearAll}
          title="Clear all"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-6 w-px bg-gray-300" />

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
          className="h-8 bg-blue-600 hover:bg-blue-700"
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

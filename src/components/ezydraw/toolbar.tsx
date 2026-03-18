'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import {
  Pencil,
  Highlighter,
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
  Stamp,
  ChevronDown,
  Sparkles,
  Loader2,
  PersonStanding,
  Smartphone,
  Car,
  AppWindow,
  MessagesSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { EmojiPickerTool } from '@/components/ezydraw/tools/emoji-picker-tool';
import { StampPickerTool } from '@/components/ezydraw/tools/stamp-picker-tool';
import type { DrawingElement } from '@/lib/drawing/types';
import type { AssetData } from '@/lib/asset-library/asset-library-types';

interface EzyDrawFooterProps {
  onSave: () => void;
  onCancel: () => void;
  slotTitle?: string;
  slotDescription?: string;
  onSlotInfoChange?: (updates: { title?: string; description?: string; sketchPrompt?: string }) => void;
  onGenerateImage?: () => void;
  isGeneratingImage?: boolean;
  iterationPrompt?: string;
  onIterationPromptChange?: (prompt: string) => void;
  editablePrompt?: string;
  onEditablePromptChange?: (prompt: string) => void;
  isRewritingPrompt?: boolean;
  useExistingDrawing?: boolean;
  onUseExistingDrawingChange?: (value: boolean) => void;
  hasCanvasContent?: boolean;
}

// --- Tool section constants ---

const NAVIGATION_TOOLS = [
  { tool: 'select', icon: MousePointer2, label: 'Select (V)', hotkey: 'v' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser (E)', hotkey: 'e' },
] as const;

const DRAWING_TOOLS = [
  { tool: 'pencil', icon: Pencil, label: 'Pencil (P)', hotkey: 'p' },
  { tool: 'text', icon: Type, label: 'Text (T)', hotkey: 't' },
  { tool: 'highlighter', icon: Highlighter, label: 'Highlighter (H)', hotkey: 'h' },
] as const;

const SHAPE_TOOLS = [
  { tool: 'rectangle', icon: Square, label: 'Rectangle', hotkey: 'r' },
  { tool: 'circle', icon: Circle, label: 'Circle', hotkey: 'c' },
  { tool: 'diamond', icon: Diamond, label: 'Diamond', hotkey: 'd' },
  { tool: 'arrow', icon: ArrowRight, label: 'Arrow', hotkey: 'a' },
  { tool: 'line', icon: Minus, label: 'Line', hotkey: 'l' },
  { tool: 'speechBubble', icon: MessageCircle, label: 'Speech Bubble', hotkey: 'b' },
] as const;

const ALL_TOOLS = [...NAVIGATION_TOOLS, ...DRAWING_TOOLS, ...SHAPE_TOOLS] as const;

const STAMP_CATEGORIES = [
  { key: 'people', icon: PersonStanding, label: 'Stick Person' },
  { key: 'devices', icon: Smartphone, label: 'Devices' },
  { key: 'vehicles', icon: Car, label: 'Vehicles' },
  { key: 'ui', icon: AppWindow, label: 'UI Elements' },
  { key: 'speech', icon: MessagesSquare, label: 'Speech Bubbles' },
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

const ACTIVE_TOOL_CLASS =
  'bg-olive-100 text-olive-700 ring-1 ring-olive-300 hover:bg-olive-100 dark:bg-olive-900/50 dark:text-olive-300 dark:ring-olive-700 dark:hover:bg-olive-900/50';

/**
 * Header toolbar: 3-section layout (Navigation | Drawing | Stamps)
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
  const textAlign = useDrawingStore((state) => state.textAlign);
  const setTextAlign = useDrawingStore((state) => state.setTextAlign);
  const selectedElementId = useDrawingStore((state) => state.selectedElementId);
  const selectElement = useDrawingStore((state) => state.selectElement);
  const elements = useDrawingStore((state) => state.elements);
  const updateElement = useDrawingStore((state) => state.updateElement);
  const addElement = useDrawingStore((state) => state.addElement);
  const setPointerLocked = useDrawingStore((state) => state.setPointerLocked);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeStampCategory, setActiveStampCategory] = useState<string | null>(null);
  const [stampAnchorEl, setStampAnchorEl] = useState<HTMLElement | null>(null);
  const otherStampRef = useRef<HTMLButtonElement>(null);
  const [lastShape, setLastShape] = useState<string>('rectangle');

  const toggleStampCategory = (key: string, el: HTMLElement) => {
    if (activeStampCategory === key) {
      setActiveStampCategory(null);
      setStampAnchorEl(null);
      setPointerLocked(false);
    } else {
      setActiveStampCategory(key);
      setStampAnchorEl(el);
      setPointerLocked(true);
      setEmojiPickerOpen(false);
    }
  };

  const closeStampPicker = () => {
    setActiveStampCategory(null);
    setStampAnchorEl(null);
    setPointerLocked(false);
  };

  // Keyboard shortcuts — nav + drawing tools
  [...NAVIGATION_TOOLS, ...DRAWING_TOOLS].forEach(({ tool, hotkey }) => {
    useHotkeys(hotkey, () => {
      setActiveTool(tool as any);
      setEmojiPickerOpen(false);
      closeStampPicker();
    });
  });

  // Shape hotkeys — also update lastShape
  SHAPE_TOOLS.forEach(({ tool, hotkey }) => {
    useHotkeys(hotkey, () => {
      setActiveTool(tool as any);
      setLastShape(tool);
      setEmojiPickerOpen(false);
      closeStampPicker();
    });
  });

  // Stamp hotkey (K)
  useHotkeys('k', () => {
    if (activeStampCategory === 'other') {
      closeStampPicker();
    } else {
      setActiveStampCategory('other');
      setStampAnchorEl(otherStampRef.current);
      setPointerLocked(true);
      setEmojiPickerOpen(false);
    }
  });

  const handleStampSelect = (asset: AssetData) => {
    let src = asset.blobUrl;
    if (asset.inlineSvg && asset.mimeType === 'image/svg+xml') {
      src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(asset.inlineSvg)))}`;
    }

    let naturalW = asset.width || 0;
    let naturalH = asset.height || 0;
    if ((!naturalW || !naturalH) && asset.inlineSvg) {
      const vbMatch = asset.inlineSvg.match(/viewBox=["'][\s]*[\d.]+[\s]+[\d.]+[\s]+([\d.]+)[\s]+([\d.]+)/);
      if (vbMatch) {
        naturalW = naturalW || parseFloat(vbMatch[1]);
        naturalH = naturalH || parseFloat(vbMatch[2]);
      } else {
        const wMatch = asset.inlineSvg.match(/<svg[^>]*\bwidth=["']([\d.]+)/);
        const hMatch = asset.inlineSvg.match(/<svg[^>]*\bheight=["']([\d.]+)/);
        if (wMatch) naturalW = naturalW || parseFloat(wMatch[1]);
        if (hMatch) naturalH = naturalH || parseFloat(hMatch[1]);
      }
    }
    naturalW = naturalW || 100;
    naturalH = naturalH || 100;

    const maxW = 320;
    const maxH = 240;
    const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
    const width = naturalW * scale;
    const height = naturalH * scale;

    const newId = addElement({
      type: 'stamp',
      x: 400 - width / 2,
      y: 300 - height / 2,
      assetId: asset.id,
      src,
      width,
      height,
      naturalWidth: naturalW,
      naturalHeight: naturalH,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
    } as Omit<DrawingElement, 'id'>);
    closeStampPicker();
    setActiveTool('select');
    selectElement(newId);
  };

  const handleEmojiSelect = (emoji: string) => {
    const newId = addElement({
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
    setEmojiPickerOpen(false);
    setActiveTool('select');
    selectElement(newId);
  };

  // Determine if any shape tool is currently active
  const isShapeActive = SHAPE_TOOLS.some((s) => s.tool === activeTool);
  const lastShapeConfig = SHAPE_TOOLS.find((s) => s.tool === lastShape) ?? SHAPE_TOOLS[0];
  const ShapeIcon = lastShapeConfig.icon;

  return (
    <>
      <div className="z-10 flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b bg-card/95 px-3 backdrop-blur">
        {/* === Section 1: Navigation === */}
        <div className="flex items-center gap-0.5">
          {NAVIGATION_TOOLS.map(({ tool, icon: Icon, label }) => (
            <Button
              key={tool}
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', activeTool === tool && ACTIVE_TOOL_CLASS)}
              onClick={() => setActiveTool(tool as any)}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="w-3" />

        {/* === Section 2: Drawing === */}
        <div className="flex items-center gap-0.5">
          {/* Stroke/Fill — Figma-style overlapping circles */}
          <div className="relative mr-1 h-8 w-10">
            {/* Fill circle (back, top-right) */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="absolute top-0 right-0 h-6 w-6 rounded-full border-2 border-background shadow-sm"
                  style={{
                    backgroundColor: fillColor === 'transparent' ? '#fff' : fillColor,
                    backgroundImage:
                      fillColor === 'transparent'
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : undefined,
                    backgroundSize: fillColor === 'transparent' ? '6px 6px' : undefined,
                    backgroundPosition:
                      fillColor === 'transparent' ? '0 0, 0 3px, 3px -3px, -3px 0px' : undefined,
                  }}
                  title="Fill color"
                />
              </PopoverTrigger>
              <PopoverContent align="start" className="z-[60] w-auto p-3">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Fill</p>
                  <input
                    type="color"
                    value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="h-8 w-full cursor-pointer"
                  />
                  <button
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent',
                      fillColor === 'transparent' && 'bg-accent'
                    )}
                    onClick={() => setFillColor('transparent')}
                  >
                    <span className="inline-block h-4 w-4 rounded border border-border" style={{
                      backgroundImage:
                        'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                      backgroundSize: '6px 6px',
                      backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                    }} />
                    Transparent
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Stroke circle (front, bottom-left, z-10) */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="absolute bottom-0 left-0 z-10 h-6 w-6 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: strokeColor }}
                  title="Stroke color & width"
                />
              </PopoverTrigger>
              <PopoverContent align="start" className="z-[60] w-auto p-3">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Stroke</p>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="h-8 w-full cursor-pointer"
                  />
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Width</p>
                    <div className="flex items-center gap-1">
                      {STROKE_WIDTH_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          className={cn(
                            'flex items-center gap-1.5 rounded px-2 py-1.5 text-xs hover:bg-accent',
                            strokeWidth === value && 'bg-accent'
                          )}
                          onClick={() => setStrokeWidth(value)}
                        >
                          <span
                            className="inline-block rounded-full bg-current"
                            style={{ width: 16, height: value }}
                          />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Pencil */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', activeTool === 'pencil' && ACTIVE_TOOL_CLASS)}
            onClick={() => setActiveTool('pencil')}
            title="Pencil (P)"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* Shapes dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8 relative', isShapeActive && ACTIVE_TOOL_CLASS)}
                title={`${lastShapeConfig.label} (${lastShapeConfig.hotkey.toUpperCase()})`}
              >
                <ShapeIcon className="h-4 w-4" />
                <ChevronDown className="absolute bottom-0.5 right-0.5 h-2 w-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {SHAPE_TOOLS.map(({ tool, icon: Icon, label, hotkey }) => (
                <DropdownMenuItem
                  key={tool}
                  onClick={() => {
                    setActiveTool(tool as any);
                    setLastShape(tool);
                  }}
                  className={cn(activeTool === tool && 'bg-accent')}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{hotkey.toUpperCase()}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Text */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', activeTool === 'text' && ACTIVE_TOOL_CLASS)}
            onClick={() => setActiveTool('text')}
            title="Text (T)"
          >
            <Type className="h-4 w-4" />
          </Button>

          {/* Highlighter */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', activeTool === 'highlighter' && ACTIVE_TOOL_CLASS)}
            onClick={() => setActiveTool('highlighter')}
            title="Highlighter (H)"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-3" />

        {/* === Section 3: Stamps === */}
        <div className="flex items-center gap-0.5">
          {/* Emoji button — real emoji character */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', emojiPickerOpen && ACTIVE_TOOL_CLASS)}
            onClick={() => {
              setEmojiPickerOpen(!emojiPickerOpen);
              closeStampPicker();
            }}
            title="Emoji"
          >
            <span className="text-base leading-none">😊</span>
          </Button>

          {/* Catch-all stamp button */}
          <Button
            ref={otherStampRef}
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', activeStampCategory === 'other' && ACTIVE_TOOL_CLASS)}
            onClick={(e) => toggleStampCategory('other', e.currentTarget)}
            title="More Stamps (K)"
          >
            <Stamp className="h-4 w-4" />
          </Button>

          {/* Stamp category buttons */}
          {STAMP_CATEGORIES.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', activeStampCategory === key && ACTIVE_TOOL_CLASS)}
              onClick={(e) => toggleStampCategory(key, e.currentTarget)}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        {/* Text alignment (visible when text or speechBubble tool is active) */}
        {(activeTool === 'text' || activeTool === 'speechBubble') && (() => {
          const selectedEl = selectedElementId ? elements.find(el => el.id === selectedElementId) : null;
          const activeAlign = (selectedEl && (selectedEl.type === 'text' || selectedEl.type === 'speechBubble'))
            ? ((selectedEl as any).textAlign || 'left')
            : textAlign;
          return (
            <>
              <div className="w-3" />
              <div className="flex items-center gap-0.5">
                {([
                  { align: 'left' as const, icon: AlignLeft, label: 'Align left' },
                  { align: 'center' as const, icon: AlignCenter, label: 'Align center' },
                  { align: 'right' as const, icon: AlignRight, label: 'Align right' },
                ]).map(({ align, icon: Icon, label }) => (
                  <Button
                    key={align}
                    variant="ghost"
                    size="icon"
                    className={cn('h-7 w-7', activeAlign === align && ACTIVE_TOOL_CLASS)}
                    onClick={() => {
                      setTextAlign(align);
                      if (selectedElementId) {
                        const sel = elements.find(el => el.id === selectedElementId);
                        if (sel && (sel.type === 'text' || sel.type === 'speechBubble')) {
                          updateElement(selectedElementId, { textAlign: align } as any);
                        }
                      }
                    }}
                    title={label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* Pickers rendered OUTSIDE the toolbar's overflow-x-auto container */}
      <EmojiPickerTool
        isOpen={emojiPickerOpen}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setEmojiPickerOpen(false)}
      />
      <StampPickerTool
        isOpen={activeStampCategory !== null}
        fixedTag={
          activeStampCategory && activeStampCategory !== 'other'
            ? ({ people: 'stickperson', devices: 'device' } as Record<string, string>)[activeStampCategory] ?? activeStampCategory
            : undefined
        }
        tagOptions={
          activeStampCategory === 'other'
            ? ['All', 'Arrows']
            : undefined
        }
        searchPlaceholder={
          activeStampCategory === 'people' ? 'Search stick people...'
            : activeStampCategory === 'devices' ? 'Search devices...'
            : activeStampCategory === 'vehicles' ? 'Search vehicles...'
            : activeStampCategory === 'ui' ? 'Search UI elements...'
            : activeStampCategory === 'speech' ? 'Search speech bubbles...'
            : 'Search stamps...'
        }
        onStampSelect={handleStampSelect}
        onClose={closeStampPicker}
        anchorEl={stampAnchorEl}
      />
    </>
  );
}

/**
 * Footer bar: stacked title/description, undo/redo/clear, AI generate, cancel/save
 */
export function EzyDrawFooter({
  onSave,
  onCancel,
  slotTitle,
  slotDescription,
  onSlotInfoChange,
  onGenerateImage,
  isGeneratingImage,
  iterationPrompt,
  onIterationPromptChange,
  editablePrompt,
  onEditablePromptChange,
  isRewritingPrompt,
  useExistingDrawing,
  onUseExistingDrawingChange,
  hasCanvasContent,
}: EzyDrawFooterProps) {
  const canUndo = useDrawingStore((state) => state.canUndo);
  const canRedo = useDrawingStore((state) => state.canRedo);
  const undo = useDrawingStore((state) => state.undo);
  const redo = useDrawingStore((state) => state.redo);
  const clearAll = useDrawingStore((state) => state.clearAll);

  useHotkeys('mod+z', () => undo(), { enabled: canUndo });
  useHotkeys('mod+shift+z', () => redo(), { enabled: canRedo });

  const handleClearAll = useCallback(() => {
    clearAll();
  }, [clearAll]);

  // Auto-resize textarea refs
  const descRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => { autoResize(descRef.current); }, [slotDescription, autoResize]);
  useEffect(() => { autoResize(promptRef.current); }, [editablePrompt, autoResize]);

  return (
    <div className="z-10 shrink-0 border-t bg-card/95 backdrop-blur">
      {/* Stacked title + description (only for Crazy 8s) */}
      {onSlotInfoChange && (
        <div className="space-y-0 border-b border-border/50 px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-8">Title</span>
            <input
              type="text"
              value={slotTitle || ''}
              onChange={(e) => onSlotInfoChange({ title: e.target.value })}
              placeholder="Sketch title..."
              className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-8 pt-0.5">Desc</span>
            <textarea
              ref={descRef}
              value={slotDescription || ''}
              onChange={(e) => onSlotInfoChange({ description: e.target.value })}
              placeholder="Brief description..."
              rows={1}
              className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-xs outline-none placeholder:text-muted-foreground/40 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Iteration prompt (Brain Rewriting) */}
      {onIterationPromptChange && (
        <div className="flex items-center gap-2 border-b border-purple-200/50 dark:border-purple-800/50 px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-500" />
          <input
            type="text"
            value={iterationPrompt || ''}
            onChange={(e) => onIterationPromptChange(e.target.value)}
            placeholder="Describe changes for AI generation... (e.g. &quot;add a search bar&quot;)"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-purple-400/60"
          />
        </div>
      )}

      {/* Editable sketch prompt (Crazy 8s) */}
      {onGenerateImage && onEditablePromptChange && (
        <div className="space-y-1 border-b border-amber-200/50 dark:border-amber-800/50 px-3 py-1.5">
          {hasCanvasContent && onUseExistingDrawingChange && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useExistingDrawing ?? false}
                onChange={(e) => onUseExistingDrawingChange(e.target.checked)}
                className="h-3 w-3 rounded border-amber-400 text-amber-600 accent-amber-600"
              />
              <span className="text-[10px] text-amber-700 dark:text-amber-400">Use my drawing as starting point</span>
            </label>
          )}
          <div className="flex items-start gap-1.5">
            {isRewritingPrompt ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
            )}
            <textarea
              ref={promptRef}
              value={editablePrompt || ''}
              onChange={(e) => onEditablePromptChange(e.target.value)}
              placeholder={isRewritingPrompt ? 'Writing concept prompt...' : 'Describe what to generate...'}
              rows={1}
              className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-xs outline-none placeholder:text-amber-400/60 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Button bar */}
      <div className="flex h-12 items-center justify-between px-3">
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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Clear all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear entire drawing?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all elements and any generated image. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} variant="destructive">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Center: AI generate */}
        {onGenerateImage && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onGenerateImage}
            disabled={isGeneratingImage}
            title="Generate AI sketch from description"
          >
            {isGeneratingImage ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            {isGeneratingImage ? 'Generating...' : 'Generate Sketch'}
          </Button>
        )}

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
    </div>
  );
}

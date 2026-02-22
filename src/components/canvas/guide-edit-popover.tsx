'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Save, Check, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuideColorPicker } from './guide-color-picker';
import type {
  CanvasGuideData,
  CanvasGuideVariant,
  CanvasGuideDismissBehavior,
  CanvasGuidePlacementMode,
  CanvasGuideLayer,
} from '@/lib/canvas/canvas-guide-types';

const VARIANT_OPTIONS: { value: CanvasGuideVariant; label: string }[] = [
  { value: 'sticker', label: 'Sticker' },
  { value: 'note', label: 'Note' },
  { value: 'hint', label: 'Hint' },
  { value: 'image', label: 'Image' },
  { value: 'template-postit', label: 'Template Post-it' },
  { value: 'frame', label: 'Frame' },
  { value: 'arrow', label: 'Arrow' },
];

const DISMISS_OPTIONS: { value: CanvasGuideDismissBehavior; label: string }[] = [
  { value: 'hover-x', label: 'Hover X' },
  { value: 'auto-dismiss', label: 'Auto-dismiss' },
  { value: 'persistent', label: 'Persistent' },
];

const PLACEMENT_OPTIONS: { value: CanvasGuidePlacementMode; label: string }[] = [
  { value: 'pinned', label: 'Pinned (viewport)' },
  { value: 'on-canvas', label: 'On-canvas (moves)' },
];

const POSITION_OPTIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'center', label: 'Center' },
  { value: 'bottom-center', label: 'Bottom Center' },
];

const LAYER_OPTIONS: { value: CanvasGuideLayer; label: string }[] = [
  { value: 'foreground', label: 'Foreground' },
  { value: 'background', label: 'Background' },
];

const ARROW_PRESETS = [
  { label: 'Right', value: 0 },
  { label: 'Down', value: 90 },
  { label: 'Left', value: 180 },
  { label: 'Up', value: 270 },
];

// Variants that are always on-canvas and persistent
const CANVAS_ONLY_VARIANTS: CanvasGuideVariant[] = ['template-postit', 'frame', 'arrow'];
// Variants that don't show body textarea
const NO_BODY_VARIANTS: CanvasGuideVariant[] = ['frame', 'arrow', 'image'];

/** Simple SVG sanitizer — strips <script> tags and on* event attributes. Admin-only feature. */
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
}

interface GuideEditPopoverProps {
  guide: CanvasGuideData;
  position: { x: number; y: number };
  onUpdate: (guideId: string, updates: Partial<CanvasGuideData>) => void;
  onDelete: (guideId: string) => void;
  onSave: () => Promise<void>;
  hasPendingChanges: boolean;
  onClose: () => void;
}

export function GuideEditPopover({ guide, position, onUpdate, onDelete, onSave, hasPendingChanges, onClose }: GuideEditPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clampedPos, setClampedPos] = useState(position);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const isImage = guide.variant === 'image';
  const isCanvasOnly = CANVAS_ONLY_VARIANTS.includes(guide.variant);
  const hideBody = NO_BODY_VARIANTS.includes(guide.variant);

  // Clamp position to viewport after first render
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;
    setClampedPos({
      x: Math.min(Math.max(position.x, pad), vw - rect.width - pad),
      y: Math.min(Math.max(position.y, pad), vh - rect.height - pad),
    });
  }, [position]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const update = useCallback(
    (updates: Partial<CanvasGuideData>) => onUpdate(guide.id, updates),
    [onUpdate, guide.id]
  );

  // When variant changes to a canvas-only type, force placement/dismiss
  const handleVariantChange = useCallback(
    (newVariant: CanvasGuideVariant) => {
      const updates: Partial<CanvasGuideData> = { variant: newVariant };
      if (CANVAS_ONLY_VARIANTS.includes(newVariant)) {
        updates.placementMode = 'on-canvas';
        updates.dismissBehavior = 'persistent';
      }
      update(updates);
    },
    [update]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [onSave]);

  const handleSvgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const svgText = event.target?.result as string;
      if (svgText) update({ imageSvg: svgText });
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [update]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-50 w-[340px] max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-xl space-y-3"
        style={{ left: clampedPos.x, top: clampedPos.y }}
      >
        {/* Header: variant dropdown + save + delete */}
        <div className="flex items-center justify-between gap-2">
          <select
            value={guide.variant}
            onChange={(e) => handleVariantChange(e.target.value as CanvasGuideVariant)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
          >
            {VARIANT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={handleSave}
              disabled={isSaving || (!hasPendingChanges && !isSaving)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Save changes"
            >
              {showSaved ? (
                <>
                  <Check className="h-3 w-3" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-3 w-3" />
                  {isSaving ? 'Saving...' : 'Save'}
                </>
              )}
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDelete(guide.id)}
                  className="rounded px-2 py-1 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded px-2 py-1 text-xs border border-border hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete guide"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title — hidden for image variant */}
        {!isImage && (
          <input
            type="text"
            placeholder={guide.variant === 'frame' ? 'Frame label (optional)' : 'Title (optional)'}
            value={guide.title || ''}
            onChange={(e) => update({ title: e.target.value || null })}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
          />
        )}

        {/* Body — shown only for text-based variants */}
        {!hideBody && (
          <textarea
            placeholder="Body text..."
            value={guide.body}
            onChange={(e) => update({ body: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm resize-y"
          />
        )}

        {/* Image SVG editor */}
        {isImage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">SVG Markup</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground border border-border hover:bg-muted transition-colors"
              >
                <Upload className="h-3 w-3" />
                Upload SVG
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleSvgUpload}
                className="hidden"
              />
            </div>
            <textarea
              placeholder="Paste SVG markup..."
              value={guide.imageSvg || ''}
              onChange={(e) => update({ imageSvg: e.target.value })}
              rows={5}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono resize-y"
            />
            {guide.imageSvg && (
              <div className="rounded-md border border-border bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground mb-1">Preview</p>
                <div
                  className="[&>svg]:max-w-full [&>svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(guide.imageSvg) }}
                />
              </div>
            )}
          </div>
        )}

        {/* Width/Height — for template-postit, frame, arrow */}
        {isCanvasOnly && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Width</label>
              <input
                type="number"
                value={guide.width ?? (guide.variant === 'frame' ? 400 : guide.variant === 'template-postit' ? 160 : 120)}
                onChange={(e) => update({ width: parseInt(e.target.value, 10) || null })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                min={40}
                max={2000}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Height</label>
              <input
                type="number"
                value={guide.height ?? (guide.variant === 'frame' ? 300 : guide.variant === 'template-postit' ? 100 : 40)}
                onChange={(e) => update({ height: parseInt(e.target.value, 10) || null })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                min={20}
                max={2000}
              />
            </div>
          </div>
        )}

        {/* Arrow rotation */}
        {guide.variant === 'arrow' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Rotation</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={359}
                value={guide.rotation ?? 0}
                onChange={(e) => update({ rotation: parseInt(e.target.value, 10) })}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{guide.rotation ?? 0}°</span>
            </div>
            <div className="flex gap-1 mt-1">
              {ARROW_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => update({ rotation: p.value })}
                  className={cn(
                    'rounded px-2 py-0.5 text-[10px] border transition-colors',
                    (guide.rotation ?? 0) === p.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color — hidden for image variant */}
        {!isImage && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="mt-1">
              <GuideColorPicker
                value={guide.color}
                onChange={(color) => update({ color })}
                variant={guide.variant}
              />
            </div>
          </div>
        )}

        {/* Placement + Position — hidden for canvas-only variants */}
        {!isCanvasOnly && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Placement</label>
              <select
                value={guide.placementMode}
                onChange={(e) => update({ placementMode: e.target.value as CanvasGuidePlacementMode })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {PLACEMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {guide.placementMode === 'pinned' ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Position</label>
                <select
                  value={guide.pinnedPosition || 'center'}
                  onChange={(e) => update({ pinnedPosition: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {POSITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Canvas X, Y</label>
                <div className="mt-1 flex gap-1">
                  <input
                    type="number"
                    value={guide.canvasX ?? 0}
                    onChange={(e) => update({ canvasX: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={guide.canvasY ?? 0}
                    onChange={(e) => update({ canvasY: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                    placeholder="Y"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layer + Dismiss — dismiss hidden for canvas-only variants */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Layer</label>
            <select
              value={guide.layer}
              onChange={(e) => update({ layer: e.target.value as CanvasGuideLayer })}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {LAYER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {!isCanvasOnly && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Dismiss</label>
              <select
                value={guide.dismissBehavior}
                onChange={(e) => update({ dismissBehavior: e.target.value as CanvasGuideDismissBehavior })}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {DISMISS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Show only when empty — hidden for canvas-only variants */}
        {!isCanvasOnly && (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={guide.showOnlyWhenEmpty}
              onChange={(e) => update({ showOnlyWhenEmpty: e.target.checked })}
              className="rounded border-border"
            />
            <span className="text-muted-foreground">Show only when canvas is empty</span>
          </label>
        )}
      </div>
    </>
  );
}

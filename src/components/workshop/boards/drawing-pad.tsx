'use client';

import { useEffect, useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

type Point = [number, number, number];
interface Stroke {
  points: Point[];
  color: string;
  size: number;
  eraser: boolean;
}

const COLOURS = ['#2b2f26', '#6b7a5a', '#b4533c', '#3b6ea5'];
const W = 640;
const H = 400;

function strokePath(points: Point[], size: number): string {
  const outline = getStroke(points, { size, thinning: 0.6, smoothing: 0.6, streamline: 0.5, simulatePressure: true });
  if (!outline.length) return '';
  const [first, ...rest] = outline;
  return `M ${first[0]} ${first[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(' ')} Z`;
}

/**
 * A small sketch pad: pen, eraser, four colours, undo, clear. Saves a PNG
 * that goes up like any other photo. Enough for a Crazy 8s sketch or a
 * concept doodle, by mouse or finger.
 */
export function DrawingPad({ title, onSave, onCancel }: { title: string; onSave: (png: Blob) => Promise<void>; onCancel: () => void }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [color, setColor] = useState(COLOURS[0]);
  const [size, setSize] = useState(6);
  const [eraser, setEraser] = useState(false);
  const [saving, setSaving] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') setStrokes((s) => s.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function pos(e: React.PointerEvent<SVGSVGElement>): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H, e.pressure || 0.5];
  }

  async function save() {
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      for (const s of strokes) {
        const p = new Path2D(strokePath(s.points, s.size));
        ctx.fillStyle = s.eraser ? '#ffffff' : s.color;
        ctx.fill(p);
      }
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (blob) await onSave(blob);
    } finally {
      setSaving(false);
    }
  }

  const all = current ? [...strokes, current] : strokes;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-label={`Draw ${title}`}>
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="text-sm font-medium">Sketch {title}</div>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          {COLOURS.map((c) => (
            <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => { setColor(c); setEraser(false); }} className={cn('h-6 w-6 rounded-full border-2', color === c && !eraser ? 'border-foreground' : 'border-transparent')} style={{ background: c }} />
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          {[3, 6, 12].map((s) => (
            <button key={s} type="button" aria-label={`Pen size ${s}`} onClick={() => { setSize(s); setEraser(false); }} className={cn('flex h-6 w-6 items-center justify-center rounded-md border', size === s && !eraser ? 'border-foreground' : 'border-border')}>
              <span className="rounded-full bg-foreground" style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
          <button type="button" aria-pressed={eraser} onClick={() => setEraser((v) => !v)} className={cn('flex h-6 items-center gap-1 rounded-md border px-2 text-xs', eraser ? 'border-foreground' : 'border-border')}>
            <Icon name="eraser" className="h-3 w-3" /> Eraser
          </button>
          <span className="mx-1 h-5 w-px bg-border" />
          <button type="button" onClick={() => setStrokes((s) => s.slice(0, -1))} className="flex h-6 items-center gap-1 rounded-md border border-border px-2 text-xs" aria-label="Undo">
            <Icon name="undo" className="h-3 w-3" /> Undo
          </button>
          <button type="button" onClick={() => setStrokes([])} className="flex h-6 items-center gap-1 rounded-md border border-border px-2 text-xs" aria-label="Clear">
            <Icon name="trash" className="h-3 w-3" /> Clear
          </button>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="aspect-[8/5] w-full touch-none bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setCurrent({ points: [pos(e)], color, size: eraser ? size * 3 : size, eraser });
          }}
          onPointerMove={(e) => {
            if (!current) return;
            setCurrent({ ...current, points: [...current.points, pos(e)] });
          }}
          onPointerUp={() => {
            if (current) setStrokes((s) => [...s, current]);
            setCurrent(null);
          }}
          onPointerLeave={() => {
            if (current) setStrokes((s) => [...s, current]);
            setCurrent(null);
          }}
        >
          {all.map((s, i) => (
            <path key={i} d={strokePath(s.points, s.size)} fill={s.eraser ? '#ffffff' : s.color} />
          ))}
        </svg>
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="text-xs text-muted-foreground">Rough is fine. Esc to close, Cmd+Z to undo.</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving || strokes.length === 0}>
              {saving ? <Icon name="spinner" className="h-4 w-4 animate-spin" /> : null}
              Add to the board
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

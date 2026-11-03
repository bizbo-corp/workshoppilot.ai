'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

type Layout = '2x4' | '4x2';

/**
 * One photo of an A4 sheet folded into eight becomes eight sketches. The
 * user picks the layout, checks the grid lines over their photo, and the
 * cells are cropped in reading order (left to right, top to bottom).
 */
export function SheetSplitter({ file, onCancel, onSplit }: { file: File; onCancel: () => void; onSplit: (cells: Blob[]) => Promise<void> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>('2x4');
  const [busy, setBusy] = useState(false);
  const img = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    const i = new Image();
    i.onload = () => {
      img.current = i;
      setLayout(i.width > i.height ? '4x2' : '2x4');
    };
    i.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const cols = layout === '2x4' ? 2 : 4;
  const rows = layout === '2x4' ? 4 : 2;

  async function split() {
    const i = img.current;
    if (!i) return;
    setBusy(true);
    try {
      const cellW = i.width / cols;
      const cellH = i.height / rows;
      const blobs: Blob[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 800 / Math.max(cellW, cellH));
          canvas.width = Math.round(cellW * scale);
          canvas.height = Math.round(cellH * scale);
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(i, c * cellW, r * cellH, cellW, cellH, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
          if (blob) blobs.push(blob);
        }
      }
      await onSplit(blobs);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-label="Split a sheet into eight">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="text-sm font-medium">Split a sheet into eight ideas</div>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Fold an A4 page into eight, sketch one idea per cell, photograph it flat and straight. The grid below should sit on your fold lines; cells are read left to right, top to bottom.
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Layout</span>
            {(['2x4', '4x2'] as Layout[]).map((l) => (
              <button key={l} type="button" onClick={() => setLayout(l)} className={cn('rounded-md border px-2 py-1', layout === l ? 'border-foreground' : 'border-border')}>
                {l === '2x4' ? 'Portrait, 2 across × 4 down' : 'Landscape, 4 across × 2 down'}
              </button>
            ))}
          </div>
          {url && (
            <div className="relative mx-auto max-h-[55vh] w-fit overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Your sheet" className="max-h-[55vh] w-auto" />
              <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
                {Array.from({ length: 8 }, (_, n) => (
                  <div key={n} className="border border-olive-500/80">
                    <span className="m-1 inline-block rounded bg-background/80 px-1 text-[10px] font-medium">{n + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={split} disabled={busy || !url}>
            {busy ? <Icon name="spinner" className="h-4 w-4 animate-spin" /> : null}
            Split and add all eight
          </Button>
        </div>
      </div>
    </div>
  );
}

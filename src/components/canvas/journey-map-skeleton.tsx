'use client';

import { useRef, useState, useEffect } from 'react';
import type { GridConfig } from '@/lib/canvas/grid-layout';

interface JourneyMapSkeletonProps {
  config: GridConfig;
}

// Deterministic post-it count per cell (rowIdx-colIdx → count).
// Varies between 1-3 to look natural.
const CELL_COUNTS: Record<string, number> = {
  '0-0': 2, '0-1': 1, '0-2': 2, '0-3': 1, '0-4': 2,
  '1-0': 1, '1-1': 2, '1-2': 1, '1-3': 2, '1-4': 1,
  '2-0': 2, '2-1': 1, '2-2': 1, '2-3': 2, '2-4': 1,
  '3-0': 1, '3-1': 2, '3-2': 2, '3-3': 1, '3-4': 2,
  '4-0': 1, '4-1': 1, '4-2': 1, '4-3': 1, '4-4': 1,
  '5-0': 1, '5-1': 1, '5-2': 2, '5-3': 1, '5-4': 1,
  '6-0': 2, '6-1': 1, '6-2': 1, '6-3': 2, '6-4': 1,
};

/**
 * Decorative skeleton preview of a journey map grid.
 * Rendered at real grid proportions then CSS-scaled to fit the viewport.
 * Shown on Step 6 when the canvas is empty so users immediately
 * understand the row/column structure they'll be filling in.
 */
export function JourneyMapSkeleton({ config }: JourneyMapSkeletonProps) {
  const { rows, columns, origin } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.55);

  // Total grid pixel dimensions (at 1:1)
  const gridWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const gridHeight = rows.reduce((sum, r) => sum + r.height, 0);
  const totalWidth = origin.x + gridWidth;
  const totalHeight = origin.y + gridHeight;

  // Measure container and compute scale to fit
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const padding = 80; // px breathing room on each side
      const scaleX = (width - padding) / totalWidth;
      const scaleY = (height - padding) / totalHeight;
      setScale(Math.min(scaleX, scaleY, 1)); // never upscale past 1:1
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [totalWidth, totalHeight]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]"
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {/* 1:1 pixel grid */}
        <div className="relative opacity-[0.35]" style={{ width: totalWidth, height: totalHeight }}>
          {/* Column headers */}
          {columns.map((col, colIdx) => {
            let x = origin.x;
            for (let i = 0; i < colIdx; i++) x += columns[i].width;
            return (
              <div
                key={col.id}
                className="absolute flex items-end justify-center pb-2 text-[13px] font-semibold"
                style={{
                  left: x,
                  top: 0,
                  width: col.width,
                  height: origin.y,
                  color: 'var(--canvas-label-muted)',
                }}
              >
                Stage {colIdx + 1}
              </div>
            );
          })}

          {/* Row labels */}
          {rows.map((row, rowIdx) => {
            let y = origin.y;
            for (let i = 0; i < rowIdx; i++) y += rows[i].height;
            return (
              <div
                key={row.id}
                className="absolute flex items-center justify-end pr-3 text-[13px] font-semibold"
                style={{
                  left: 0,
                  top: y,
                  width: origin.x - 8,
                  height: row.height,
                  color: 'var(--canvas-label-muted)',
                }}
              >
                {row.label}
              </div>
            );
          })}

          {/* Grid cells + skeleton post-its */}
          {rows.map((row, rowIdx) => {
            let cellY = origin.y;
            for (let i = 0; i < rowIdx; i++) cellY += rows[i].height;

            return columns.map((col, colIdx) => {
              let cellX = origin.x;
              for (let i = 0; i < colIdx; i++) cellX += columns[i].width;

              const isEmotionRow = row.id === 'emotions';
              const count = CELL_COUNTS[`${rowIdx}-${colIdx}`] ?? 1;

              return (
                <div
                  key={`${row.id}-${col.id}`}
                  className="absolute border border-dashed rounded-sm"
                  style={{
                    left: cellX,
                    top: cellY,
                    width: col.width,
                    height: row.height,
                    borderColor: 'var(--canvas-grid-line-light)',
                  }}
                >
                  <div className="flex flex-wrap gap-2 p-3">
                    {isEmotionRow ? (
                      /* Emotion row: single circle emoji placeholder */
                      <div
                        className="h-8 w-8 rounded-full"
                        style={{ backgroundColor: 'var(--canvas-grid-line-light)' }}
                      />
                    ) : (
                      /* Regular cells: 1-3 post-it rectangles */
                      Array.from({ length: count }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-md"
                          style={{
                            width: 120,
                            height: count > 2 ? 56 : 72,
                            backgroundColor: 'var(--canvas-grid-line-light)',
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            });
          })}
        </div>

        {/* Hint message — positioned below the grid */}
        <p
          className="text-center mt-4 text-sm font-medium"
          style={{ color: 'var(--canvas-label-subtle)' }}
        >
          Your journey map will appear here
        </p>
      </div>
    </div>
  );
}

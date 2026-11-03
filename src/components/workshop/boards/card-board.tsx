'use client';

import { BOARDS } from '@/lib/engine/boards';
import type { BoardId } from '@/lib/engine/types';
import { useBoard, itemsIn } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';

/**
 * A labelled card: one row per zone. Used for the concept card and the
 * test card, where each zone is a named slot rather than a space.
 */
export function CardBoard({ board, hint }: { board: Extract<BoardId, 'concept_card' | 'test_card'>; hint?: string }) {
  const { state } = useBoard();
  const def = BOARDS[board];
  return (
    <BoardFrame title={def.label} hint={hint}>
      <dl className="divide-y divide-border">
        {def.zones.map((z) => {
          const items = itemsIn(state, board, z.id);
          return (
            <div key={z.id} data-zone-container={z.id} className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-2.5">
              <dt className="pt-1.5 text-xs font-medium text-muted-foreground">{z.label}</dt>
              <dd className="flex flex-wrap items-start gap-2">
                {items.map((it) => (
                  <Sticky key={it.id} item={it} tone="white" className="max-w-full" />
                ))}
                <AddSticky board={board} zone={z.id} label={z.label} full={items.length >= def.maxPerZone} />
              </dd>
            </div>
          );
        })}
      </dl>
    </BoardFrame>
  );
}

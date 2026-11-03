'use client';

import { cn } from '@/lib/utils';
import { BOARDS } from '@/lib/engine/boards';
import type { BoardItem } from '@/lib/engine/types';
import { useBoard, itemsIn } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';

/**
 * Three concentric bands. The core sits in the middle; each outer band is a
 * ring around it. Items wrap inside their band; sub-groups that share a
 * broad label sit together under that label.
 */
export function StakeholderRings() {
  const { state } = useBoard();
  const def = BOARDS.stakeholder_rings;
  const zones = ['indirect', 'direct', 'core'] as const;

  const render = (i: number): React.ReactNode => {
    const zoneId = zones[i];
    const zone = def.zones.find((z) => z.id === zoneId)!;
    const items = itemsIn(state, 'stakeholder_rings', zoneId);
    const inner = i < zones.length - 1 ? render(i + 1) : null;
    return (
      <div
        key={zoneId}
        data-zone-container={zoneId}
        className={cn(
          'rounded-[1.75rem] border border-border/70 p-3 sm:p-4',
          zoneId === 'indirect' && 'bg-background',
          zoneId === 'direct' && 'bg-muted/40',
          zoneId === 'core' && 'bg-muted/80',
        )}
      >
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="text-xs font-semibold">{zone.label}</span>
          <span className="text-[11px] text-muted-foreground">{zone.hint}</span>
          <div className="ml-auto">
            <AddSticky board="stakeholder_rings" zone={zoneId} label={zone.label} full={items.length >= def.maxPerZone} placeholder="A person or group" />
          </div>
        </div>
        {items.length > 0 && <RingItems items={items} />}
        {inner}
      </div>
    );
  };

  return (
    <BoardFrame title={def.label} hint="The closer to the middle, the more the challenge is theirs">
      <div className="p-3 sm:p-4">{render(0)}</div>
    </BoardFrame>
  );
}

function RingItems({ items }: { items: BoardItem[] }) {
  const groups = new Map<string, BoardItem[]>();
  const loose: BoardItem[] = [];
  for (const it of items) {
    const g = typeof it.meta?.group === 'string' ? it.meta.group : null;
    if (g) groups.set(g, [...(groups.get(g) ?? []), it]);
    else loose.push(it);
  }
  return (
    <div className="mb-3 flex flex-wrap items-start gap-2 px-1">
      {loose.map((it) => (
        <Sticky key={it.id} item={it} className="max-w-[12rem]" />
      ))}
      {[...groups.entries()].map(([label, members]) => (
        <div key={label} className="rounded-lg border border-dashed border-border p-1.5" data-group={label}>
          <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="flex flex-wrap gap-1.5">
            {members.map((it) => (
              <Sticky key={it.id} item={it} className="max-w-[11rem]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

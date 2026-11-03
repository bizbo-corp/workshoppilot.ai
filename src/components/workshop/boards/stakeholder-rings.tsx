'use client';

import { BOARDS } from '@/lib/engine/boards';
import { useBoard, itemsIn } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';

const RING_STYLE: Record<string, string> = {
  indirect: 'bg-olive-50/60 dark:bg-neutral-olive-900/40',
  direct: 'bg-olive-100/70 dark:bg-neutral-olive-800/50',
  core: 'bg-olive-200/70 dark:bg-neutral-olive-700/60',
};

/**
 * Three concentric bands. The core sits in the middle; each outer band is a
 * ring around it. Items wrap inside their band, so nothing overlaps.
 */
export function StakeholderRings() {
  const { state } = useBoard();
  const def = BOARDS.stakeholder_rings;
  const max = def.maxPerZone;
  const zones = ['indirect', 'direct', 'core'];

  // Render outermost first and nest inward.
  const render = (i: number): React.ReactNode => {
    const zoneId = zones[i];
    const zone = def.zones.find((z) => z.id === zoneId)!;
    const items = itemsIn(state, 'stakeholder_rings', zoneId);
    const inner = i < zones.length - 1 ? render(i + 1) : null;
    return (
      <div
        key={zoneId}
        data-zone-container={zoneId}
        className={`rounded-[2rem] p-3 sm:p-4 ${RING_STYLE[zoneId]}`}
      >
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="text-xs font-medium text-foreground">{zone.label}</span>
          <span className="text-xs text-muted-foreground">{zone.hint}</span>
          <div className="ml-auto">
            <AddSticky board="stakeholder_rings" zone={zoneId} label={zone.label} full={items.length >= max} />
          </div>
        </div>
        {items.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 px-1">
            {items.map((it) => (
              <Sticky key={it.id} item={it} tone={zoneId === 'core' ? 'yellow' : zoneId === 'direct' ? 'blue' : 'white'} className="max-w-[12rem]" />
            ))}
          </div>
        )}
        {inner}
      </div>
    );
  };

  return (
    <BoardFrame title={def.label} hint="Who lives the problem sits in the middle">
      <div className="p-3 sm:p-4">{render(0)}</div>
    </BoardFrame>
  );
}

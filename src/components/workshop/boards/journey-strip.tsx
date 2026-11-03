'use client';

import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { BOARDS } from '@/lib/engine/boards';
import { getLens } from '@/lib/engine/lenses';
import { useBoard, itemsIn } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';

/**
 * Five moments left to right, labelled by the lens. One card per moment.
 * The dip is the moment that hurts most; the user or the AI marks it.
 */
export function JourneyStrip() {
  const { state, update } = useBoard();
  const def = BOARDS.journey_strip;
  const lens = getLens(state.ideaType);

  return (
    <BoardFrame title={def.label} hint={lens ? lens.label : 'Five moments, in order'}>
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-5">
        {def.zones.map((z, i) => {
          const items = itemsIn(state, 'journey_strip', z.id);
          const item = items[0];
          const isDip = item?.meta?.dip === true;
          return (
            <div key={z.id} data-zone-container={z.id} className={cn('flex min-h-[9rem] flex-col bg-card p-3', isDip && 'bg-[var(--canvas-red-pastel)]/30 dark:bg-destructive/10')}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">
                  <span className="mr-1 text-muted-foreground">{i + 1}</span>
                  {lens?.journeyMomentLabels[i] ?? z.label}
                </span>
                <AddSticky board="journey_strip" zone={z.id} label={lens?.journeyMomentLabels[i] ?? z.label} full={items.length >= def.maxPerZone} placeholder="Doing, feeling, pain" />
              </div>
              {item && (
                <Sticky item={item} tone="white" className="flex-1">
                  <button
                    type="button"
                    onClick={() => update(item.id, { meta: { dip: !isDip } })}
                    className={cn('mt-2 flex items-center gap-1 text-[11px]', isDip ? 'text-destructive' : 'text-muted-foreground hover:text-foreground')}
                    aria-pressed={isDip}
                  >
                    <Icon name="target" className="h-3 w-3" /> {isDip ? 'The dip' : 'Mark as the dip'}
                  </button>
                </Sticky>
              )}
            </div>
          );
        })}
      </div>
    </BoardFrame>
  );
}

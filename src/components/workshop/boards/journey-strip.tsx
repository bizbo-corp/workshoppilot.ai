'use client';

import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { BOARDS } from '@/lib/engine/boards';
import { getLens } from '@/lib/engine/lenses';
import { useBoard, itemsIn } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';

/**
 * Five moments left to right, labelled by the lens. One card per moment.
 * The dip is the moment that hurts most; the user or Wanda marks it.
 */
export function JourneyStrip() {
  const { state, update } = useBoard();
  const def = BOARDS.journey_strip;
  const lens = getLens(state.ideaType);

  return (
    <BoardFrame title={def.label} hint="As it is today, not how it should be">
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-5">
        {def.zones.map((z, i) => {
          const items = itemsIn(state, 'journey_strip', z.id);
          const item = items[0];
          const isDip = item?.meta?.dip === true;
          const label = lens?.journeyMomentLabels[i] ?? z.label;
          return (
            <div key={z.id} data-zone-container={z.id} className={cn('flex min-h-[10rem] flex-col bg-card p-3', isDip && 'bg-destructive/5')}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">
                  <span className="mr-1 text-muted-foreground">{i + 1}</span>
                  {label}
                </span>
                <AddSticky board="journey_strip" zone={z.id} label={label} full={items.length >= def.maxPerZone} placeholder="Doing, feeling, pain" />
              </div>
              {item ? (
                <Sticky item={item} className="flex-1">
                  <button
                    type="button"
                    onClick={() => update(item.id, { meta: { dip: !isDip } })}
                    className={cn('mt-2 flex items-center gap-1 text-[11px]', isDip ? 'font-medium text-destructive' : 'text-muted-foreground hover:text-foreground')}
                    aria-pressed={isDip}
                  >
                    <Icon name="target" className="h-3 w-3" /> {isDip ? 'The dip' : 'Mark as the dip'}
                  </button>
                </Sticky>
              ) : (
                <p className="mt-auto text-[11px] text-muted-foreground/70">Wanda drafts this; you adjust.</p>
              )}
            </div>
          );
        })}
      </div>
    </BoardFrame>
  );
}

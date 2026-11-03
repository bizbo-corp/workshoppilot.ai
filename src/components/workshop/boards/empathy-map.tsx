'use client';

import { cn } from '@/lib/utils';
import { BOARDS } from '@/lib/engine/boards';
import { fieldKey } from '@/lib/engine/stages';
import { useBoard, itemsIn } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';

const TONES = { says: 'yellow', thinks: 'blue', feels: 'pink', does: 'green', pains: 'white', gains: 'white' } as const;

/**
 * Says / Thinks / Feels / Does around the persona, Pains and Gains below.
 */
function Zone({ id, className }: { id: string; className?: string }) {
  const { state } = useBoard();
  const def = BOARDS.empathy_map;
  const zone = def.zones.find((z) => z.id === id)!;
  const items = itemsIn(state, 'empathy_map', id);
  return (
    <div data-zone-container={id} className={cn('min-h-[8rem] bg-card p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium">{zone.label}</span>
        <AddSticky board="empathy_map" zone={id} label={zone.label} full={items.length >= def.maxPerZone} />
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Sticky key={it.id} item={it} tone={TONES[id as keyof typeof TONES]} className="max-w-[13rem]" />
        ))}
      </div>
    </div>
  );
}

export function EmpathyMap() {
  const { state } = useBoard();
  const def = BOARDS.empathy_map;
  const persona = state.fields[fieldKey('define', 'persona')] ?? state.fields[fieldKey('setup', 'audience')];

  return (
    <BoardFrame title={def.label} hint="Evidence above the line, synthesis below">
      <div className="grid grid-cols-2 gap-px bg-border">
        <Zone id="says" />
        <Zone id="thinks" />
        <div className="col-span-2 flex items-center justify-center bg-olive-100/70 px-4 py-2 text-center text-xs text-foreground dark:bg-neutral-olive-800/60" data-zone-container="persona">
          <span className="font-medium">{persona ? persona.slice(0, 120) : 'The person at the centre'}</span>
        </div>
        <Zone id="feels" />
        <Zone id="does" />
        <Zone id="pains" className="border-t-2 border-olive-300 dark:border-neutral-olive-600" />
        <Zone id="gains" className="border-t-2 border-olive-300 dark:border-neutral-olive-600" />
      </div>
    </BoardFrame>
  );
}

'use client';

import { BOARDS } from '@/lib/engine/boards';
import { fieldKey } from '@/lib/engine/stages';
import { useBoard, itemsIn } from './board-context';
import { BoardFrame, Zone } from './sticky';

/**
 * Says / Thinks / Feels / Does around the person, Pains and Gains below.
 */
export function EmpathyMap({ focus }: { focus?: 'evidence' | 'synthesis' }) {
  const { state } = useBoard();
  const def = BOARDS.empathy_map;
  const personaName = itemsIn(state, 'persona_card', 'name')[0]?.text;
  const persona = personaName ?? state.fields[fieldKey('setup', 'audience')];
  const z = (id: string, extra?: { hint?: string; className?: string; tone?: 'plain' | 'tint' }) => {
    const zone = def.zones.find((x) => x.id === id)!;
    return <Zone board="empathy_map" id={id} label={zone.label} items={itemsIn(state, 'empathy_map', id)} max={def.maxPerZone} {...extra} />;
  };

  return (
    <BoardFrame title={def.label} hint={focus === 'synthesis' ? 'Pains and gains are the synthesis' : 'What the research says, sorted'}>
      <div className="grid grid-cols-2 gap-px bg-border">
        {z('says', { hint: 'their words' })}
        {z('thinks', { hint: 'what they believe' })}
        <div className="col-span-2 flex items-center justify-center bg-muted/60 px-4 py-2 text-center text-xs" data-zone-container="persona">
          <span className="font-medium">{persona ? persona.slice(0, 120) : 'The person at the centre'}</span>
        </div>
        {z('feels', { hint: 'emotions' })}
        {z('does', { hint: 'behaviour and workarounds' })}
        {z('pains', { hint: 'what hurts', tone: 'tint', className: 'border-t-2 border-border' })}
        {z('gains', { hint: 'what good looks like', tone: 'tint', className: 'border-t-2 border-border' })}
      </div>
    </BoardFrame>
  );
}

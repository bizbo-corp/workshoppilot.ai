'use client';

import { BOARDS } from '@/lib/engine/boards';
import { useBoard, itemsIn } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';

function Field({ id }: { id: string }) {
  const { state } = useBoard();
  const def = BOARDS.persona_card;
  const zone = def.zones.find((z) => z.id === id)!;
  const items = itemsIn(state, 'persona_card', id);
  return (
    <div data-zone-container={id} className="min-w-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{zone.label}</span>
        <AddSticky board="persona_card" zone={id} label={zone.label} full={items.length >= def.maxPerZone} />
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <Sticky key={it.id} item={it} />
        ))}
        {items.length === 0 && <p className="text-[11px] text-muted-foreground/70">Not yet.</p>}
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

/**
 * One person who stands for the people you are designing for. Name and
 * role up top, quote under them, then goals, pains and behaviours.
 */
export function PersonaCard() {
  const { state } = useBoard();
  const def = BOARDS.persona_card;
  const name = itemsIn(state, 'persona_card', 'name')[0];
  const role = itemsIn(state, 'persona_card', 'role')[0];
  const situation = itemsIn(state, 'persona_card', 'situation')[0];
  const quote = itemsIn(state, 'persona_card', 'quote')[0];

  return (
    <BoardFrame title={def.label} hint="Built from the research, not imagined">
      <div className="space-y-5 p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold text-foreground">{name ? initials(name.text) : '?'}</div>
          <div className="min-w-0 flex-1 space-y-2">
            <div data-zone-container="name" className="flex items-center gap-2">
              {name ? <Sticky item={name} className="text-base font-semibold" /> : <AddSticky board="persona_card" zone="name" label="Name" full={false} placeholder="First name" />}
            </div>
            <div data-zone-container="role" className="flex items-center gap-2">
              {role ? <Sticky item={role} /> : <AddSticky board="persona_card" zone="role" label="Age and role" full={false} placeholder="Age and role" />}
            </div>
          </div>
        </div>
        <div data-zone-container="quote" className="border-l-2 border-olive-500 pl-3">
          {quote ? <Sticky item={quote} className="border-0 bg-transparent px-0 py-0 text-sm italic shadow-none" /> : <AddSticky board="persona_card" zone="quote" label="In their words" full={false} placeholder="One line in their voice" />}
        </div>
        <div data-zone-container="situation">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Their situation</div>
          {situation ? <Sticky item={situation} /> : <AddSticky board="persona_card" zone="situation" label="Their situation" full={false} />}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="goals" />
          <Field id="pains" />
          <Field id="behaviours" />
        </div>
      </div>
    </BoardFrame>
  );
}

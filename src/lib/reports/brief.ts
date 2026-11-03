import { createHash } from 'node:crypto';
import { BOARDS } from '@/lib/engine/boards';
import { getLens } from '@/lib/engine/lenses';
import { STAGES, STAGE_ORDER, fieldKey } from '@/lib/engine/stages';
import type { WorkshopState } from '@/lib/engine/types';

/**
 * The workshop as a document: everything the report jobs need, in plain
 * text, with each fact labelled by the stage it came from so the model can
 * cite its sources. Chat is deliberately left out; the fields, boards and
 * stage summaries are the agreed record.
 */
export function workshopBrief(state: WorkshopState): string {
  const lens = getLens(state.ideaType);
  const lines: string[] = [`IDEA (as first typed): ${state.idea}`, `IDEA TYPE: ${lens?.label ?? 'unknown'}`];
  for (const s of STAGE_ORDER) {
    const stage = STAGES[s];
    const done = state.completedStages.includes(s);
    lines.push('', `== ${stage.label}${done ? '' : ' (not completed)'} ==`);
    if (state.stageSummaries[s]) lines.push(`Summary: ${state.stageSummaries[s]}`);
    for (const f of stage.fields.filter((x) => !x.hidden)) {
      const v = state.fields[fieldKey(s, f.id)];
      if (v) lines.push(`${f.label}: ${v}`);
    }
    for (const b of stage.boards) {
      const items = state.boards[b];
      if (!items.length) continue;
      lines.push(`${BOARDS[b].label}:`);
      for (const z of BOARDS[b].zones) {
        const inZone = items.filter((i) => i.zone === z.id);
        if (!inZone.length) continue;
        const label = b === 'journey_strip' && lens ? lens.journeyMomentLabels[Number(z.id.slice(1)) - 1] : z.label;
        lines.push(`  ${label}: ${inZone.map((i) => `${i.text}${i.meta?.dip ? ' [THE DIP]' : ''}${i.meta?.shortlisted ? ' [shortlisted]' : ''}${i.createdBy === 'ai' ? ' (suggested by the facilitator)' : ''}`).join(' | ')}`);
      }
    }
  }
  return lines.join('\n');
}

/** Stable hash of what a report is built from, so unchanged workshops reuse the last report. */
export function stateHash(state: WorkshopState): string {
  const h = createHash('sha256');
  h.update(JSON.stringify({ idea: state.idea, ideaType: state.ideaType, fields: state.fields, boards: state.boards, summaries: state.stageSummaries, completed: state.completedStages }));
  return h.digest('hex').slice(0, 24);
}

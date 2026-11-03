import type { ModelMessage } from 'ai';
import { BOARDS } from './boards';
import { getLens } from './lenses';
import { FACILITATOR, STAGES, STAGE_ORDER, currentActivity, fieldKey, missingFields } from './stages';
import { stageBoards } from './tools';
import type { BoardId, EngineEvent, WorkshopState } from './types';
import { SOUL as soul } from '@/lib/ai/soul';

/** How many recent chat messages the model sees verbatim. */
const RECENT_MESSAGES = 10;

/**
 * Build the model's context from state, not from chat history. The stable
 * part (voice, tools, stage, lens) is cached by the provider; the volatile
 * part (the activity script, what is filled, what is on the boards, the
 * checklist) is re-read each turn.
 */
export function buildSystemPrompt(state: WorkshopState): string {
  const { stable, volatile } = buildSystemParts(state);
  return `${stable}\n\n${volatile}`;
}

export function buildSystemParts(state: WorkshopState): { stable: string; volatile: string } {
  const stage = STAGES[state.stage];
  const lens = getLens(state.ideaType);
  const boards = stageBoards(state);

  const parts: string[] = [`You are ${FACILITATOR.name} ${FACILITATOR.emoji}, the workshop facilitator.\n\n${soul.trim()}`];

  parts.push(`# Tools

You change the workshop only through tools. Never write field values, board items or stage changes as text and hope someone copies them; call the tool, then talk about it. Never mention tool names to the user.

- set_field: record a stage field once you and the user have a draft. Update it again when they change it.
- add_board_item / update_board_item / remove_board_item: put things on the boards this stage uses. Add what the user says in their words; add your own suggestions where the script says to, and say they are yours.
- set_idea_type: your best guess at what kind of thing this is, with confidence. Call it during Setup.
- set_activity: move to the next activity in the stage when the current one is done, or back if the user asks.
- start_interview / end_interview: step into and out of a practice interviewee (Discover only).
- complete_stage: when the required fields are set and the user has agreed. Include a two to four line summary of what the stage produced; later stages read it instead of the chat.
- suggest_replies: two or three short replies the user could tap. Use it on most turns that end in a question.

Rules: one question per message. Keep replies under 120 words unless you are presenting a draft or a board. Lead with the point.`);

  parts.push(`# Stage: ${stage.label}\n\nGoal: ${stage.goal}\n\n${stage.guidance}\n\nActivities in this stage, in order: ${stage.activities.map((a) => `${a.id} (${a.label})`).join(' → ')}.`);

  if (boards.length) {
    parts.push(
      `# Boards in this stage\n\n` +
        boards.map((b) => `## ${BOARDS[b].label} (${b})\n${BOARDS[b].aiGuidance}\nZones: ${BOARDS[b].zones.map((z) => `${z.id} = ${z.label}`).join(', ')}`).join('\n\n'),
    );
  }

  if (lens) {
    parts.push(
      `# Idea type: ${lens.label}\n\n${lens.promptNotes}\n\nCall the people "${lens.personNoun}s" and the thing "the ${lens.thingNoun}". Journey moments for this type: ${lens.journeyMomentLabels.join(' → ')}.\n\nWhat counts as evidence here: ${lens.evidenceBar.join('; ')}.\nCheap tests to offer: ${lens.cheapTests.join('; ')}.`,
    );
  } else {
    parts.push(`# Idea type: not yet known\n\nWork it out from the user's words and call set_idea_type. Types: digital_product, service, process_change, physical_product, offering, experience, brand, campaign.`);
  }

  const stable = parts.join('\n\n');

  const activity = currentActivity(state);
  const volatileParts: string[] = [];
  volatileParts.push(`# Current activity: ${activity.label} (${activity.id})\n\nWhat: ${activity.what}\nWhy: ${activity.why}\n\n${activity.script}`);

  if (state.interview) {
    const who = state.boards.interviewees.find((i) => i.id === state.interview!.itemId);
    volatileParts.push(`# IN CHARACTER\n\nYou are currently ${who?.text ?? state.interview.name}${who?.meta?.tension ? ` (${who.meta.tension})` : ''}, in a practice interview. Questions asked so far: ${state.interview.questions} of 4. Answer the user's questions fully as this person, in their voice, with specific detail and real contradictions. You have never seen the challenge statement. After each answer add one headline note to insights/synthetic with meta.source "${state.interview.name}", then offer three follow-up questions. After the fourth question, say so and offer "One more question", "Next interviewee" and "Wrap up the interviews". Call end_interview when the user moves on.`);
  }

  volatileParts.push(describeState(state));
  volatileParts.push(`# Before every reply, check

0. Did the user ask you a question, or ask to lock, close or move on? Answer the question in your first sentence, or do what they asked (set_activity or complete_stage) and say so. Never skip past it to your own next step.
1. Did the user just agree to, or did you just write, a value for a field above? Then call set_field with it FIRST. A draft that only appears in your text is lost.
2. Did the user name people, quotes, pains, ideas or moments that belong on a board in this stage? Call add_board_item for each, in their words.
3. Is the idea type still unknown? Call set_idea_type with your best guess.
4. Is the current activity done (see the status list) and has the user agreed to move on? Call set_activity for the next one. Is the whole stage done and the user agreed? Call complete_stage now; do not ask another question first.
5. Does your reply end in a question? Call suggest_replies.

Evidence rule: anything the user has not shown (a quote with who said it, a number, something observed) is a belief. Write "if groomers really do lose jobs this way", never "groomers lose jobs this way". Credit only what the record shows. Practice-interview lines are hypotheses, never evidence.

Board rule: when the note says the user added or changed something on the board, your first sentence is about that item, by name, and what it changes. Then one question that builds on it.

Past the target number of exchanges for this activity, stop gathering: draft what is missing from what you have (beliefs labelled as beliefs), set it, and ask the user to confirm.

Then write the reply: lead with the point, one question, under 120 words. When you have just completed a stage, two lines at most and no question; the next stage opens with its own.`);
  return { stable, volatile: volatileParts.join('\n\n') };
}

/** Plain-language description of the workshop state for the model. */
export function describeState(state: WorkshopState): string {
  const lines: string[] = [`# Workshop state`, `The idea as first typed: "${state.idea}"`];

  const earlier = STAGE_ORDER.filter((s) => s !== state.stage && state.completedStages.includes(s));
  if (earlier.length) {
    lines.push('', '## Earlier stages');
    for (const s of earlier) {
      lines.push(`### ${STAGES[s].label}`, state.stageSummaries[s] ?? '(no summary)');
      for (const f of STAGES[s].fields.filter((x) => !x.hidden)) {
        const v = state.fields[fieldKey(s, f.id)];
        if (v) lines.push(`- ${f.label}: ${v}`);
      }
      for (const b of earlierBoardsToShow(s)) {
        if (state.boards[b].length) lines.push(`${BOARDS[b].label}: ${describeBoard(state, b).replace(/\n/g, ' | ')}`);
      }
    }
  }

  const stage = STAGES[state.stage];
  const activity = currentActivity(state);
  lines.push('', `## This stage: ${stage.label}`);
  lines.push(`Activity status: ${stage.activities.map((a) => `${a.id} ${a.done(state) ? 'done' : a.id === activity.id ? 'IN PROGRESS' : 'not started'}`).join('; ')}.`);
  for (const f of stage.fields.filter((x) => !x.hidden)) {
    const v = state.fields[fieldKey(state.stage, f.id)];
    lines.push(`- ${f.label} (${f.id}${f.required ? ', required' : ''}): ${v ? v : 'NOT SET. ' + f.description}`);
  }
  const missing = missingFields(state);
  lines.push(missing.length ? `Still needed before this stage can complete: ${missing.map((f) => f.id).join(', ')}.` : 'All required fields are set; complete the stage once the user agrees.');

  for (const b of stageBoards(state)) {
    lines.push('', `## ${BOARDS[b].label} (${b})`, describeBoard(state, b));
  }

  lines.push('', `Exchanges so far in this activity: about ${countActivityTurns(state)}. Aim to wrap it up by ${activity.targetTurns}.`);
  return lines.join('\n');
}

/** Boards from earlier stages that later stages lean on. */
function earlierBoardsToShow(stage: (typeof STAGE_ORDER)[number]): BoardId[] {
  switch (stage) {
    case 'discover':
      return ['stakeholder_rings', 'insights', 'empathy_map'];
    case 'define':
      return ['empathy_map', 'persona_card', 'journey_strip'];
    case 'develop':
      return ['concept_card'];
    default:
      return [];
  }
}

export function describeBoard(state: WorkshopState, board: BoardId): string {
  const items = state.boards[board];
  if (!items.length) return 'Empty.';
  const byZone = new Map<string, typeof items>();
  for (const it of items) byZone.set(it.zone, [...(byZone.get(it.zone) ?? []), it]);
  return BOARDS[board].zones
    .filter((z) => byZone.has(z.id))
    .map(
      (z) =>
        `${z.label}: ` +
        byZone
          .get(z.id)!
          .map(
            (i) =>
              `[${i.id}] ${i.text}${i.meta?.source ? ` (${i.meta.source})` : ''}${i.meta?.group ? ` {${i.meta.group}}` : ''}${i.imageUrl ? ' (has image)' : ''}${i.meta?.dip ? ' (THE DIP)' : ''}${i.meta?.shortlisted ? ' (shortlisted)' : ''}${i.meta?.done ? ' (interviewed)' : ''}${i.createdBy === 'ai' ? ' (yours)' : ''}`,
          )
          .join('; '),
    )
    .join('\n');
}

function countActivityTurns(state: WorkshopState): number {
  return state.messages.filter((m) => m.role === 'user' && m.seq > state.stageEnteredSeq).length;
}

/**
 * The message list: recent chat, with a note before the final turn listing
 * canvas changes the user made since the AI last spoke.
 */
export function buildMessages(state: WorkshopState, eventsSinceAiSpoke: EngineEvent[], opts: { trigger: 'chat' | 'canvas' | 'greeting' }): ModelMessage[] {
  const recent = state.messages.slice(-RECENT_MESSAGES);
  const out: ModelMessage[] = recent.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

  const canvasNote = describeCanvasChanges(eventsSinceAiSpoke);
  const activity = currentActivity(state);

  if (opts.trigger === 'greeting') {
    out.push({ role: 'user', content: `[The user has just opened the ${STAGES[state.stage].label} stage, activity "${activity.label}". No welcome line. Open the activity the way its script says, then your first question. Do not repeat what they typed back to them. Do not restate fields from earlier stages; they are on the board.]` });
  } else if (opts.trigger === 'canvas') {
    out.push({ role: 'user', content: `[The user has been working on the board, not typing.]\n${canvasNote}\n[Respond briefly to what they did, or ask the next question. If nothing useful can be said, reply with exactly: (quiet)]` });
  } else if (canvasNote) {
    const last = out.pop();
    out.push({ role: 'user', content: `${canvasNote}\n\n${typeof last?.content === 'string' ? last.content : ''}` });
  }

  if (out[0]?.role === 'assistant') out.unshift({ role: 'user', content: '[Workshop opened]' });
  return out;
}

export function describeCanvasChanges(events: EngineEvent[]): string {
  const lines: string[] = [];
  for (const e of events) {
    if (e.actor !== 'user') continue;
    const p = e.payload;
    if (p.type === 'board.item_added') lines.push(`added to ${p.item.board}/${p.item.zone}: "${p.item.text}"${p.item.imageUrl ? ' (with an image)' : ''}`);
    else if (p.type === 'board.item_updated') lines.push(`changed item ${p.id}: ${JSON.stringify(p.patch)}`);
    else if (p.type === 'board.item_removed') lines.push(`removed item ${p.id}`);
    else if (p.type === 'field.set') lines.push(`edited ${p.field}: "${p.value}"`);
    else if (p.type === 'idea_type.set') lines.push(`set the idea type to ${p.ideaType}`);
    else if (p.type === 'activity.entered') lines.push(`opened the "${p.activity}" activity`);
  }
  return lines.length ? `[Since you last spoke the user: ${lines.join('; ')}]` : '';
}

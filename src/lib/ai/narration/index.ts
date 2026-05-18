/**
 * Workshop pulse narration extraction.
 *
 * Runs server-side in the chat route's `onFinish` hook for each facilitator
 * AI message on a step that has an extractor. The output is persisted to
 * `workshop_step_narration` and broadcast as `FACILITATOR_NARRATION` so the
 * participant-side "pulse" card stays in sync.
 *
 * Design notes:
 * - Extractors are pure: `(text, ctx) → NarrationPayload`. No DB / IO inside.
 *   The caller does persistence + broadcast.
 * - One extractor per facilitator-driven step. Steps without an extractor
 *   simply produce no narration (and no pulse card on participant side).
 * - CTA shapes mirror the literal phrasings the prompt teaches the AI.
 *   When the AI deviates, `cta` is null and the pulse falls back to a
 *   default neutral line; the cleaned `content` still updates so participants
 *   see something.
 */

import type { StickyNote } from '@/stores/canvas-store';

export type NarrationPayload = {
  /** Cleaned narrative text — all markup stripped, ready to render as prose. */
  content: string;
  /** Extracted next-step prompt, null if the AI didn't fit a known pattern. */
  cta: string | null;
  /** Step-specific position marker. For journey-mapping this is the row id
   *  of the row that was just populated ('actions', 'goals', etc.). */
  rowId: string | null;
  /** Pre-formatted progress label like "Row 3/7 (Barriers)" — derived from
   *  canvas state at extraction time so participants don't need access to it. */
  progressLabel: string | null;
};

export type NarrationCtx = {
  stepId: string;
  /** Canvas sticky notes at the time the AI message finished — used to derive
   *  step-specific progress (rows populated, personas filled, etc.). */
  stickyNotes: StickyNote[];
};

/** Returns true if this step ever produces narration. Used as a cheap gate
 *  in the chat route to skip extraction overhead on steps that don't need it. */
export function stepHasNarrationExtractor(stepId: string): boolean {
  return EXTRACTORS[stepId] !== undefined;
}

/** Run the registered extractor for this step. Returns null if no extractor
 *  is registered or the extractor decides the message isn't pulse-worthy
 *  (e.g. content is empty after stripping). */
export function extractNarration(
  text: string,
  ctx: NarrationCtx,
): NarrationPayload | null {
  const extractor = EXTRACTORS[ctx.stepId];
  if (!extractor) return null;
  return extractor(text, ctx);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Strip every markup tag the chat-panel display chain knows about. Kept here
 * (rather than imported from chat-panel.tsx) because narration runs server-
 * side and chat-panel is a client component. The patterns must stay in sync
 * with the client strip chain — when a new markup tag is added there, add it
 * here too.
 */
function stripAllMarkup(text: string): string {
  return (
    text
      // Block-style tags
      .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, '')
      .replace(/\[SUGGESTIONS\][\s\S]*$/g, '')
      .replace(/\[INTERVIEW_MODE\][\s\S]*?\[\/INTERVIEW_MODE\]/g, '')
      .replace(/\[INTERVIEW_MODE\][\s\S]*$/g, '')
      .replace(/\[PERSONA_SELECT\][\s\S]*?\[\/PERSONA_SELECT\]/g, '')
      .replace(/\[PERSONA_SELECT\][\s\S]*$/g, '')
      .replace(/\[PERSONA_PLAN\][\s\S]*?\[\/PERSONA_PLAN\]/g, '')
      .replace(/\[PERSONA_PLAN\][\s\S]*$/g, '')
      .replace(/\[PERSONA_TEMPLATE\][\s\S]*?\[\/PERSONA_TEMPLATE\]/g, '')
      .replace(/\[PERSONA_TEMPLATE\][\s\S]*$/g, '')
      .replace(/\[JOURNEY_STAGES\][\s\S]*?\[\/JOURNEY_STAGES\]/g, '')
      .replace(/\[JOURNEY_STAGES\][\s\S]*$/g, '')
      .replace(/\[JOURNEY_POLL_OPTIONS\][\s\S]*?\[\/JOURNEY_POLL_OPTIONS\]/g, '')
      .replace(/\[JOURNEY_POLL_OPTIONS\][\s\S]*$/g, '')
      .replace(/\[HMW_CARD\][\s\S]*?\[\/HMW_CARD\]/g, '')
      .replace(/\[HMW_CARD\][\s\S]*$/g, '')
      .replace(/\[CONCEPT_CARD\][\s\S]*?\[\/CONCEPT_CARD\]/g, '')
      .replace(/\[CONCEPT_CARD\][\s\S]*$/g, '')
      .replace(/\[CLUSTER:[\s\S]*?\]/g, '')
      .replace(/\[MIND_MAP_NODE(?:\s+[^\]]*?)?\][\s\S]*?\[\/MIND_MAP_NODE\]/g, '')
      .replace(/\[MIND_MAP_NODE[^\]]*\]/g, '')
      // Inline canvas markup
      .replace(/\[CANVAS_ITEM[^\]]*\][\s\S]*?\[\/CANVAS_ITEM\]/g, '')
      .replace(/\[CANVAS_ITEM:[^\]]*\]/g, '')
      .replace(/\[CANVAS_DELETE:[^\]]*\]/g, '')
      .replace(/\[GRID_ITEM[^\]]*\][\s\S]*?\[\/GRID_ITEM\]/g, '')
      // Bare flags
      .replace(/\s*\[THEME_SORT\]\s*/g, ' ')
      .replace(/\s*\[COMPILE_READY\]\s*/g, ' ')
      .replace(/\s*\[STEP_CONFIRMED\]\s*/g, ' ')
      .replace(/\s*\[CONCEPT_COMPLETE\]\s*/g, ' ')
      // Trim runs of whitespace produced by stripping
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

// ---------------------------------------------------------------------------
// Journey mapping extractor
// ---------------------------------------------------------------------------

const JOURNEY_ROW_ORDER = [
  'actions',
  'goals',
  'barriers',
  'touchpoints',
  'emotions',
  'moments',
  'opportunities',
] as const;

const JOURNEY_ROW_LABEL: Record<string, string> = {
  actions: 'Actions',
  goals: 'Goals',
  barriers: 'Barriers',
  touchpoints: 'Touchpoints',
  emotions: 'Emotions',
  moments: 'Moments of Truth',
  opportunities: 'Opportunities',
};

/**
 * Pull a "Move on to X" CTA out of the AI's trailing row-handoff phrasing.
 *
 * Prompt teaches these shapes (06_journey_mapping.ts row follow-up section):
 *   "Ready for **Goals**? Say 'next' or adjust..."
 *   "Next is **Barriers** — where things start..."
 *   "Let's map **Touchpoints** next..."
 *   "Time for **Emotions** — how they actually feel..."
 *   "Almost there — **Moments of Truth**, the make-or-break moments."
 *   "Last layer — **Opportunities**, where we spot room..."
 *   "When you're ready, hit **Next**..." (step end after dip confirmed)
 *
 * Match order matters: most-specific-first. The first successful match wins.
 */
function extractJourneyCta(text: string): string | null {
  // End-of-step: AI tells the user to hit Next
  if (/hit\s+\*\*Next\*\*/i.test(text)) {
    return 'Hit Next when ready';
  }

  // Find-the-dip phase: AI asks the team to confirm the most painful stage
  if (/(?:find|identify).{0,40}(?:the\s+)?dip/i.test(text)) {
    return 'Find the dip together';
  }

  // Row handoff — the prompt always wraps the next row name in **bold**
  // immediately after a "Ready for" / "Next is" / "Let's map" / etc. lead-in.
  const rowHandoffPatterns: RegExp[] = [
    /Ready\s+for\s+\*\*([A-Za-z][A-Za-z\s]*?)\*\*/i,
    /Next\s+is\s+\*\*([A-Za-z][A-Za-z\s]*?)\*\*/i,
    /Let'?s\s+map\s+\*\*([A-Za-z][A-Za-z\s]*?)\*\*/i,
    /Time\s+for\s+\*\*([A-Za-z][A-Za-z\s]*?)\*\*/i,
    /Almost\s+there\s+[—–-]\s+\*\*([A-Za-z][A-Za-z\s]*?)\*\*/i,
    /Last\s+layer\s+[—–-]\s+\*\*([A-Za-z][A-Za-z\s]*?)\*\*/i,
  ];
  for (const re of rowHandoffPatterns) {
    const m = text.match(re);
    if (m) {
      const rowName = m[1].trim();
      // Title-case for display ("goals" → "Goals", "moments of truth" → "Moments of Truth")
      const display = rowName
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      return `Move on to ${display}`;
    }
  }

  return null;
}

/**
 * Pre-format a "Row 3/7 · Barriers" progress label based on which rows have
 * at least one populated cell.
 *
 * Union of two sources:
 * - Existing sticky notes (loaded from DB at extraction time)
 * - Rows the AI just emitted in THIS response (parsed from [GRID_ITEM] tags)
 *
 * Both are needed because the client-side autosave debounce hasn't landed by
 * the time onFinish fires server-side, so the DB lags by one AI turn. Without
 * including the AI's just-emitted rows, the pulse would show "Working on
 * Actions" while the AI is already telling the team "Ready for Goals?" —
 * confusingly off-by-one.
 */
function deriveJourneyProgress(
  text: string,
  stickyNotes: StickyNote[],
): { rowId: string | null; label: string | null } {
  const populatedRows = new Set<string>();
  for (const note of stickyNotes) {
    const row = note.cellAssignment?.row;
    if (row && JOURNEY_ROW_LABEL[row]) populatedRows.add(row);
  }

  // Pick up rows the AI is populating in this very message. The prompt's tag
  // shape is `[GRID_ITEM row="<id>" col="<id>" ...]content[/GRID_ITEM]` — we
  // only need the row attribute. Tolerates either attribute order.
  const gridItemRowRe = /\[GRID_ITEM[^\]]*\brow="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = gridItemRowRe.exec(text)) !== null) {
    const row = m[1];
    if (JOURNEY_ROW_LABEL[row]) populatedRows.add(row);
  }

  if (populatedRows.size === 0) {
    return { rowId: null, label: 'Setting up the journey' };
  }

  // Latest populated row = furthest along in the canonical row order
  let latestRowId: string | null = null;
  for (const id of JOURNEY_ROW_ORDER) {
    if (populatedRows.has(id)) latestRowId = id;
  }

  const idx = latestRowId
    ? JOURNEY_ROW_ORDER.indexOf(latestRowId as (typeof JOURNEY_ROW_ORDER)[number]) + 1
    : 0;
  const total = JOURNEY_ROW_ORDER.length;
  const label =
    latestRowId && idx > 0
      ? `Row ${idx}/${total} · ${JOURNEY_ROW_LABEL[latestRowId]}`
      : `Setting up the journey`;

  return { rowId: latestRowId, label };
}

function extractJourneyMapping(text: string, ctx: NarrationCtx): NarrationPayload | null {
  const content = stripAllMarkup(text);
  if (!content) return null;

  const cta = extractJourneyCta(text);
  const { rowId, label: progressLabel } = deriveJourneyProgress(text, ctx.stickyNotes);

  return { content, cta, rowId, progressLabel };
}

// ---------------------------------------------------------------------------
// Extractor registry
// ---------------------------------------------------------------------------

type Extractor = (text: string, ctx: NarrationCtx) => NarrationPayload | null;

const EXTRACTORS: Record<string, Extractor> = {
  'journey-mapping': extractJourneyMapping,
};

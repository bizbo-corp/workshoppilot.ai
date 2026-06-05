/**
 * Journey Template Poll — types
 *
 * Step 6 (journey-mapping) coordination: the facilitator's AI proposes a small
 * set of journey templates, every participant votes, the facilitator locks the
 * team's choice. The locked template's stages then populate the grid columns
 * via the existing [JOURNEY_STAGES] parse path.
 *
 * Persisted under `_canvas.journeyPoll` in the step artifact (multiplayer +
 * solo) and synced via Liveblocks Storage in multiplayer.
 */

export type JourneyPollOption = {
  /** Matches a `JourneyTemplate.id` from `src/lib/workshop/journeyTemplates.ts`,
   *  OR `custom` for an AI-built journey that isn't in the catalog. */
  templateId: string;
  /** Display name. The AI localises this to the workshop's domain (e.g.
   *  "Booking & visit flow") rather than the generic catalog title. */
  templateName: string;
  /** Short description for the poll card body — also localised by the AI. */
  description: string;
  /** Up to ~3 stage names shown as a preview row on the option card. */
  stagePreview: string[];
  /** Full localised stage list (3–8). Drives the grid columns on lock so the
   *  map header matches exactly what the card showed. Falls back to the
   *  catalog template's stages when the AI emits only a bare id. */
  stages?: string[];
}

export type JourneyPollVote = {
  /** Liveblocks userId (e.g. `user_xxx` for owner, `guest-xxx` for participants). */
  voterId: string;
  voterName: string;
  /** Hex pastel from PARTICIPANT_COLORS — used for the avatar dot. */
  voterColor: string;
  /** Which option they picked. */
  templateId: string;
  /** Wall-clock ms for tie-breaking; not displayed. */
  votedAt: number;
}

export type JourneyPoll = {
  /** Options presented to the team. Set once when the facilitator's AI opens
   *  the poll; not mutated after that. */
  options: JourneyPollOption[];
  /** Current vote ledger — replace-on-change-of-mind, so length ≤ active voters. */
  votes: JourneyPollVote[];
  /** Set once the facilitator hits "Lock template". Null while voting is open.
   *  `stages` carries the locked option's localised stage list so the grid
   *  columns (and the AI's [JOURNEY_STAGES]) match the card — required for
   *  custom journeys, which have no catalog entry to fall back on. */
  lockedTemplate: {
    templateId: string;
    templateName: string;
    stages?: string[];
  } | null;
  /** Wall-clock ms when the poll was opened. */
  openedAt: number;
}

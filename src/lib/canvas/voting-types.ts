/**
 * Dot Voting type definitions for the WorkshopPilot canvas.
 *
 * These types establish the foundational data model for the dot voting feature
 * used in Crazy 8s workshops. They are consumed by the solo canvas store (Zustand)
 * and, in Phase 61, by the multiplayer store (Liveblocks storageMapping).
 *
 * Design decisions:
 * - `voteBudget` defaults to 2 per the NNGroup 25%-of-options rule (8 slots × 25% = 2)
 * - No `isVisible` or `isAnonymous` fields on DotVote — anonymity is a UI rendering concern
 * - `DotVote.voterId` uses Liveblocks userId format ('user_xxx' for owners, 'guest-xxx' for guests)
 */

/**
 * A single dot vote cast by a participant on a Crazy 8s slot.
 * Created at cast time with a generated `id`; removed on retraction.
 */
export type DotVote = {
  /** Unique identifier assigned via `crypto.randomUUID()` at cast time. */
  id: string;
  /** The Crazy 8s slot that received this vote (e.g., 'slot-3'). */
  slotId: string;
  /**
   * The Liveblocks userId of the voter.
   * Format: 'user_xxx' for authenticated workshop owners, 'guest-xxx' for participants.
   * Enables per-voter retraction (VOTE-06) and completion tracking (Phase 61).
   */
  voterId: string;
  /**
   * 0-based index within this voter's budget (0 to voteBudget-1).
   * Used for retraction by position when multiple votes exist on a slot.
   */
  voteIndex: number;
  /**
   * Voting round this vote belongs to.
   * Votes from previous rounds are ignored after a reset.
   * Defaults to 0 for backwards compatibility with existing data.
   */
  round?: number;
};

/**
 * A ranked result entry populated when a voting session closes.
 * Results are computed by `setVotingResults()` and displayed in the results view.
 */
export type VotingResult = {
  /** The Crazy 8s slot this result corresponds to. */
  slotId: string;
  /** Total number of dot votes received by this slot. */
  totalVotes: number;
  /**
   * Rank position (1 = most votes).
   * Ties share the same rank (e.g., two slots with 3 votes each both get rank 1).
   * Satisfies VOTE-07 tie-handling requirement.
   */
  rank: number;
};

/**
 * Session-scoped voting configuration and lifecycle state.
 * Owned by the workshop session; a single VotingSession exists per workshop at a time.
 */
export type VotingSession = {
  /**
   * Lifecycle state of the voting session:
   * - 'idle'   — voting has not been opened yet (initial state)
   * - 'open'   — voting is active; participants can cast and retract votes (VOTE-05)
   * - 'closed' — voting is finished; results are visible (VOTE-05)
   */
  status: 'idle' | 'open' | 'closed';
  /**
   * Maximum number of votes each participant can cast.
   * Default: 2 (NNGroup 25%-of-options rule: 8 slots × 25% = 2).
   * Configurable range: 1–8 (VOTE-01).
   */
  voteBudget: number;
  /**
   * Ranked results populated by `setVotingResults()` when voting closes.
   * Empty array while status is 'idle' or 'open' (VOTE-07).
   */
  results: VotingResult[];
  /**
   * Monotonically increasing round counter. Incremented on each vote reset.
   * Votes with a `round` value less than this are stale and ignored.
   * Avoids CRDT merge conflicts when clearing the dotVotes array.
   */
  votingRound: number;
};

/**
 * Initial/default voting session state.
 * `voteBudget: 5` — generous default that works for both solo (8 slots) and
 * multiplayer (16+ slots). Scaled dynamically when voting opens.
 */
export const DEFAULT_VOTING_SESSION: VotingSession = {
  status: 'idle',
  voteBudget: 5,
  results: [],
  votingRound: 0,
};

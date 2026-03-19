/**
 * Voting utility functions shared between FacilitatorControls and VotingEventListener.
 *
 * These utilities are pure functions with no React dependencies — safe to import
 * in any context.
 */

import type { DotVote, VotingResult, VotingSession } from './voting-types';
import type { Crazy8sSlot, SlotGroup } from './crazy-8s-types';

/**
 * Filter dot votes to only include votes from the current voting round.
 * Votes without a `round` field (pre-existing data) are treated as round 0.
 */
export function currentRoundVotes(dotVotes: DotVote[], votingSession: VotingSession): DotVote[] {
  const round = votingSession.votingRound ?? 0;
  return dotVotes.filter((v) => (v.round ?? 0) === round);
}

/**
 * computeVotingResults — tallies dot votes across target IDs and
 * returns ranked results with tie handling.
 *
 * All targets appear in results (including zero-vote targets).
 * Ties share the same rank (e.g., two targets with 3 votes both get rank 1).
 *
 * IMPORTANT: Callers should pass fresh state (via storeApi.getState()) rather
 * than closure-captured values to avoid stale closure bugs (Pitfall 2, RESEARCH.md).
 */
export function computeVotingResults(
  dotVotes: DotVote[],
  targetIds: string[]
): VotingResult[] {
  const voteCounts = new Map<string, number>();
  for (const vote of dotVotes) {
    voteCounts.set(vote.slotId, (voteCounts.get(vote.slotId) ?? 0) + 1);
  }

  const sortedIds = [...targetIds].sort((a, b) => {
    return (voteCounts.get(b) ?? 0) - (voteCounts.get(a) ?? 0);
  });

  const results: VotingResult[] = [];
  let currentRank = 1;
  for (let i = 0; i < sortedIds.length; i++) {
    const slotId = sortedIds[i];
    const totalVotes = voteCounts.get(slotId) ?? 0;
    if (i > 0) {
      const prevVotes = voteCounts.get(sortedIds[i - 1]) ?? 0;
      if (totalVotes < prevVotes) currentRank = i + 1;
    }
    results.push({ slotId, totalVotes, rank: currentRank });
  }

  return results;
}

/**
 * Get all votable target IDs — ungrouped filled slots + group IDs.
 * In solo mode (no groups), returns all filled slot IDs.
 */
export function getVotableTargetIds(
  crazy8sSlots: Crazy8sSlot[],
  slotGroups: SlotGroup[]
): string[] {
  const groupedSlotIds = new Set(slotGroups.flatMap((g) => g.slotIds));
  const seen = new Set<string>();
  const ungroupedIds: string[] = [];
  for (const s of crazy8sSlots) {
    if (s.imageUrl && !groupedSlotIds.has(s.slotId) && !seen.has(s.slotId)) {
      seen.add(s.slotId);
      ungroupedIds.push(s.slotId);
    }
  }
  const groupIds = slotGroups.map((g) => g.id);
  return [...ungroupedIds, ...groupIds];
}

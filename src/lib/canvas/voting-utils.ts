/**
 * Voting utility functions shared between FacilitatorControls and VotingEventListener.
 *
 * These utilities are pure functions with no React dependencies — safe to import
 * in any context.
 */

import type { DotVote, VotingResult } from './voting-types';
import type { Crazy8sSlot } from './crazy-8s-types';

/**
 * computeVotingResults — tallies dot votes across all crazy 8s slots and
 * returns ranked results with tie handling.
 *
 * All slots appear in results (including zero-vote slots).
 * Ties share the same rank (e.g., two slots with 3 votes both get rank 1).
 *
 * Used by:
 * - FacilitatorControls: when timer expires or is cancelled while votingMode active
 * - VotingEventListener: when VOTING_CLOSED broadcast is received by participants
 * - VotingHud: inline close voting action (solo + multiplayer facilitator)
 *
 * IMPORTANT: Callers should pass fresh state (via storeApi.getState()) rather
 * than closure-captured values to avoid stale closure bugs (Pitfall 2, RESEARCH.md).
 */
export function computeVotingResults(
  dotVotes: DotVote[],
  crazy8sSlots: Crazy8sSlot[]
): VotingResult[] {
  const voteCounts = new Map<string, number>();
  for (const vote of dotVotes) {
    voteCounts.set(vote.slotId, (voteCounts.get(vote.slotId) ?? 0) + 1);
  }

  const allSlotIds = crazy8sSlots.map((s) => s.slotId);
  const sortedSlotIds = [...allSlotIds].sort((a, b) => {
    return (voteCounts.get(b) ?? 0) - (voteCounts.get(a) ?? 0);
  });

  const results: VotingResult[] = [];
  let currentRank = 1;
  for (let i = 0; i < sortedSlotIds.length; i++) {
    const slotId = sortedSlotIds[i];
    const totalVotes = voteCounts.get(slotId) ?? 0;
    if (i > 0) {
      const prevVotes = voteCounts.get(sortedSlotIds[i - 1]) ?? 0;
      if (totalVotes < prevVotes) currentRank = i + 1;
    }
    results.push({ slotId, totalVotes, rank: currentRank });
  }

  return results;
}

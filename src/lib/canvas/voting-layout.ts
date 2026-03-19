/**
 * Auto-layout utility for the shared voting canvas.
 *
 * Computes initial grid positions for voting cards (individual slots + groups).
 * Pure function with no React dependencies.
 */

import type { Crazy8sSlot, SlotGroup } from './crazy-8s-types';

export const VOTING_CARD_WIDTH = 240;
export const VOTING_CARD_HEIGHT = 320;
export const VOTING_GROUP_WIDTH = 300;
export const VOTING_GROUP_HEIGHT = 340;
export const GAP_X = 40;
export const GAP_Y = 40;
export const COLUMNS = 5;

/** Vertical gap between canvas sections (crazy 8s → voting → brain rewriting) */
export const SECTION_GAP = 100;
/** Padding inside the voting container around the card grid */
export const CONTAINER_PADDING = 40;
/** Height of the container header bar */
export const CONTAINER_HEADER_HEIGHT = 48;

/**
 * Compute grid positions for all votable targets.
 * - Filters to filled slots only (imageUrl present)
 * - Sorts by ownerId then slotId (groups ideas by participant)
 * - Skips grouped slots (they're represented by their group node)
 * - Places ungrouped slots in grid, then group nodes after them
 */
export function computeVotingGridLayout(
  slots: Crazy8sSlot[],
  groups: SlotGroup[]
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const groupedSlotIds = new Set(groups.flatMap((g) => g.slotIds));

  // Filled, ungrouped slots sorted by owner then slotId (deduplicated)
  const seen = new Set<string>();
  const ungroupedSlots = slots
    .filter((s) => {
      if (!s.imageUrl || groupedSlotIds.has(s.slotId) || seen.has(s.slotId)) return false;
      seen.add(s.slotId);
      return true;
    })
    .sort((a, b) => {
      const ownerCmp = (a.ownerId ?? '').localeCompare(b.ownerId ?? '');
      if (ownerCmp !== 0) return ownerCmp;
      return a.slotId.localeCompare(b.slotId);
    });

  let index = 0;

  // Place ungrouped slots
  for (const slot of ungroupedSlots) {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    positions[slot.slotId] = {
      x: col * (VOTING_CARD_WIDTH + GAP_X),
      y: row * (VOTING_CARD_HEIGHT + GAP_Y),
    };
    index++;
  }

  // Place group nodes after ungrouped slots
  for (const group of groups) {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    positions[group.id] = {
      x: col * (VOTING_GROUP_WIDTH + GAP_X),
      y: row * (VOTING_GROUP_HEIGHT + GAP_Y),
    };
    index++;
  }

  return positions;
}

/**
 * Compute the outer dimensions of the voting container node
 * based on the number of individual cards and group nodes.
 */
export function computeVotingContainerSize(
  cardCount: number,
  groupCount: number
): { width: number; height: number } {
  const totalItems = cardCount + groupCount;
  if (totalItems === 0) return { width: 400, height: CONTAINER_HEADER_HEIGHT + CONTAINER_PADDING * 2 };

  const cols = Math.min(totalItems, COLUMNS);
  const rows = Math.ceil(totalItems / COLUMNS);

  // Use the wider group width for column sizing when groups exist
  const cellWidth = groupCount > 0 ? VOTING_GROUP_WIDTH : VOTING_CARD_WIDTH;
  const cellHeight = groupCount > 0 ? VOTING_GROUP_HEIGHT : VOTING_CARD_HEIGHT;

  const width = cols * (cellWidth + GAP_X) - GAP_X + CONTAINER_PADDING * 2;
  const height = rows * (cellHeight + GAP_Y) - GAP_Y + CONTAINER_HEADER_HEIGHT + CONTAINER_PADDING * 2;

  return { width, height };
}

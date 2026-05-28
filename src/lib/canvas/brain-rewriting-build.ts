/**
 * Pure builder for Brain Writing matrices from a set of selected Crazy 8s slots/groups.
 *
 * Extracted from use-ideation-phases so both the (legacy) in-ideation path and the
 * dedicated Brain Writing step can build matrices from the same selection data without
 * depending on React state.
 */

import { createEmptyMatrix, type BrainRewritingMatrix, type BrainRewritingParticipant } from './brain-rewriting-types';
import type { Crazy8sSlot, SlotGroup } from './crazy-8s-types';

export interface BrainwritingOwner {
  ownerId: string;
  ownerName: string;
}

/**
 * Build one matrix per selected unit (an ungrouped slot, or a merged group).
 * Mirrors the original in-ideation logic: groups collapse to a single matrix, the
 * source sketch image/description carry forward, and in multiplayer every participant
 * except the creator gets an iteration cell.
 */
export function buildBrainwritingMatrices(
  selectedIds: string[],
  crazy8sSlots: Crazy8sSlot[],
  slotGroups: SlotGroup[],
  owners: BrainwritingOwner[] = [],
): BrainRewritingMatrix[] {
  type SelectionUnit = { type: 'slot'; slotId: string } | { type: 'group'; group: SlotGroup };
  const units: SelectionUnit[] = [];
  const processedSlotIds = new Set<string>();

  for (const id of selectedIds) {
    if (processedSlotIds.has(id)) continue;

    // Direct group ID match (from shared voting canvas)
    const directGroup = slotGroups.find((g) => g.id === id);
    if (directGroup) {
      units.push({ type: 'group', group: directGroup });
      directGroup.slotIds.forEach((sid) => processedSlotIds.add(sid));
      processedSlotIds.add(id);
      continue;
    }

    // Slot that belongs to a group
    const group = slotGroups.find((g) => g.slotIds.includes(id));
    if (group) {
      units.push({ type: 'group', group });
      group.slotIds.forEach((sid) => processedSlotIds.add(sid));
    } else {
      units.push({ type: 'slot', slotId: id });
      processedSlotIds.add(id);
    }
  }

  const ownerNameById = new Map(owners.map((o) => [o.ownerId, o.ownerName]));
  const hasMultipleOwners = owners.length > 1;

  return units.map((unit) => {
    const sourceSlot =
      unit.type === 'group'
        ? crazy8sSlots.find((s) => s.slotId === unit.group.slotIds[0])
        : crazy8sSlots.find((s) => s.slotId === unit.slotId);
    const creatorOwnerId = sourceSlot?.ownerId;

    let participants: BrainRewritingParticipant[] | undefined;
    let creatorName: string | undefined;
    let creatorId: string | undefined;

    if (hasMultipleOwners && creatorOwnerId) {
      creatorName = ownerNameById.get(creatorOwnerId) || 'Creator';
      creatorId = creatorOwnerId;
      participants = owners
        .filter((o) => o.ownerId !== creatorOwnerId)
        .map((o) => ({ id: o.ownerId, name: o.ownerName }));
    }

    const sourceImage =
      unit.type === 'group' ? unit.group.mergedImageUrl || sourceSlot?.imageUrl : sourceSlot?.imageUrl;

    const slotId = unit.type === 'group' ? unit.group.slotIds[0] : unit.slotId;
    const matrix = createEmptyMatrix(slotId, sourceImage, participants);

    if (unit.type === 'group') matrix.groupId = unit.group.id;
    matrix.sourceDescription = sourceSlot?.description;
    matrix.sourceSketchPrompt = sourceSlot?.sketchPrompt;
    if (creatorName) matrix.creatorName = creatorName;
    if (creatorId) matrix.creatorId = creatorId;

    return matrix;
  });
}

export type ConceptCardData = {
  id: string;
  position: { x: number; y: number };
  cardState?: 'skeleton' | 'active' | 'filled';
  cardIndex?: number;          // 0-based index for AI targeting
  conceptName: string;
  ideaSource: string;
  sketchSlotId?: string;       // Crazy 8s slot ID for traceability
  sketchImageUrl?: string;     // Vercel Blob URL from Crazy 8s slot
  sketchGroupId?: string;      // Group ID for traceability (merged group)
  ownerId?: string;             // participantId or 'facilitator' (multiplayer ownership)
  ownerName?: string;           // display name shown on card
  ownerColor?: string;          // hex color for owner indicator dot
  elevatorPitch: string;
  usp: string;
  swot: {
    strengths: string[];       // Exactly 3 items
    weaknesses: string[];      // Exactly 3 items
    opportunities: string[];   // Exactly 3 items
    threats: string[];         // Exactly 3 items
  };
  feasibility: {
    technical: { score: number; rationale: string };
    business: { score: number; rationale: string };
    userDesirability: { score: number; rationale: string };
  };
};

/**
 * Factory function to create a default concept card with empty values
 */
export function createDefaultConceptCard(
  partial?: Partial<ConceptCardData>
): ConceptCardData {
  return {
    id: partial?.id || crypto.randomUUID(),
    position: partial?.position || { x: 0, y: 0 },
    conceptName: partial?.conceptName || '',
    ideaSource: partial?.ideaSource || '',
    sketchSlotId: partial?.sketchSlotId,
    sketchImageUrl: partial?.sketchImageUrl,
    sketchGroupId: partial?.sketchGroupId,
    ownerId: partial?.ownerId,
    ownerName: partial?.ownerName,
    ownerColor: partial?.ownerColor,
    elevatorPitch: partial?.elevatorPitch || '',
    usp: partial?.usp || '',
    swot: partial?.swot || {
      strengths: ['', '', ''],
      weaknesses: ['', '', ''],
      opportunities: ['', '', ''],
      threats: ['', '', ''],
    },
    feasibility: {
      technical: { score: 0, rationale: '', ...partial?.feasibility?.technical },
      business: { score: 0, rationale: '', ...partial?.feasibility?.business },
      userDesirability: { score: 0, rationale: '', ...partial?.feasibility?.userDesirability },
    },
    cardState: partial?.cardState || 'skeleton',
    cardIndex: partial?.cardIndex,
  };
}

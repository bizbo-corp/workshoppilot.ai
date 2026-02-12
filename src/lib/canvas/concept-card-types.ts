export type ConceptCardData = {
  id: string;
  position: { x: number; y: number };
  conceptName: string;
  ideaSource: string;
  sketchSlotId?: string;       // Crazy 8s slot ID for traceability
  sketchImageUrl?: string;     // Vercel Blob URL from Crazy 8s slot
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
  billboardHero?: {
    headline: string;
    subheadline: string;
    cta: string;
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
    elevatorPitch: partial?.elevatorPitch || '',
    usp: partial?.usp || '',
    swot: partial?.swot || {
      strengths: ['', '', ''],
      weaknesses: ['', '', ''],
      opportunities: ['', '', ''],
      threats: ['', '', ''],
    },
    feasibility: partial?.feasibility || {
      technical: { score: 3, rationale: '' },
      business: { score: 3, rationale: '' },
      userDesirability: { score: 3, rationale: '' },
    },
    billboardHero: partial?.billboardHero,
  };
}

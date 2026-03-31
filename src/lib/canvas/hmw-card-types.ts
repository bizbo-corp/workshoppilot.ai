export type HmwFieldId = 'givenThat' | 'persona' | 'immediateGoal' | 'deeperGoal' | 'fullStatement';

export function hasExistingHmwContent(card: HmwCardData): boolean {
  return !!(card.givenThat || card.persona || card.immediateGoal || card.deeperGoal);
}

export type HmwCardData = {
  id: string;
  position: { x: number; y: number };
  cardState: 'skeleton' | 'active' | 'filled';
  givenThat?: string;
  persona?: string;
  immediateGoal?: string;
  deeperGoal?: string;
  fullStatement?: string;
  suggestions?: {
    givenThat?: string[];
    persona?: string[];
    immediateGoal?: string[];
    deeperGoal?: string[];
  };
  team?: string;
  cardIndex?: number;
  ownerId?: string;    // participantId or 'facilitator'
  ownerName?: string;  // display name shown on card
  ownerColor?: string; // hex color for dot indicator
  isOwner?: boolean;
  isMultiplayer?: boolean;
  isFacilitator?: boolean;
  availableOwners?: Array<{ ownerId: string; ownerName: string; ownerColor: string }>;
  onReassign?: (cardId: string, ownerId: string, ownerName: string, ownerColor: string) => void;
};

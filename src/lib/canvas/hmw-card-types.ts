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
};

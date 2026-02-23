export type PersonaTemplateData = {
  id: string;
  position: { x: number; y: number };
  personaId?: string;       // Stable AI-assigned ID (e.g. "persona-1") — survives name/archetype renames
  archetype?: string;       // "The Dreamer"
  archetypeRole?: string;   // "Business Leader"
  name?: string;
  age?: number;
  job?: string;
  empathySays?: string;     // Pre-filled from Step 4
  empathyThinks?: string;   // Pre-filled from Step 4
  empathyFeels?: string;    // Pre-filled from Step 4
  empathyDoes?: string;     // Pre-filled from Step 4
  empathyPains?: string;    // Pre-filled from Step 4
  empathyGains?: string;    // Pre-filled from Step 4
  narrative?: string;       // AI-generated backstory
  quote?: string;           // From Step 3 or AI-generated
  avatarUrl?: string;       // AI-generated portrait image URL
};

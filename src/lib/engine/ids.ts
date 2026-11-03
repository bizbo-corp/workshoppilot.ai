/**
 * Stage and idea-type ids. Shared by the database schema and the client, so
 * this file must stay free of server-only imports.
 */
export const STAGE_IDS = ['setup', 'discover', 'define', 'develop', 'deliver'] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const IDEA_TYPES = [
  'digital_product',
  'service',
  'process_change',
  'physical_product',
  'offering',
  'experience',
  'brand',
  'campaign',
] as const;
export type IdeaType = (typeof IDEA_TYPES)[number];

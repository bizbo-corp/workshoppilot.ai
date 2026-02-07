import { createId as generateCuid } from '@paralleldrive/cuid2';

/**
 * Generate a CUID2 identifier
 */
export const createId = generateCuid;

/**
 * Generate a prefixed CUID2 identifier for improved debuggability
 *
 * Prefixes:
 * - ws: workshop
 * - wm: workshop_member
 * - sd: step_definition (though these use semantic IDs)
 * - wst: workshop_step
 * - ses: session
 * - bp: build_pack
 *
 * @param prefix - Short prefix identifying the entity type
 * @returns Prefixed ID in format: prefix_cuid2
 */
export function createPrefixedId(prefix: string): string {
  return `${prefix}_${generateCuid()}`;
}

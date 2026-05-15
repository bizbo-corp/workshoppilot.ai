/**
 * Minimum gap between consecutive nudges for the same invitation. Prevents the
 * facilitator from accidentally double-sending while still allowing recovery
 * from a typo/wrong-email within reason.
 *
 * Lives outside `invitation-actions.ts` because that file is marked `'use server'`
 * and can only export async functions.
 */
export const NUDGE_COOLDOWN_MS = 5 * 60 * 1000;

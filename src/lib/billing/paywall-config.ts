/**
 * Paywall configuration constants.
 *
 * Kept in a separate non-'use server' module so these values can be imported
 * by both server actions ('use server') and Server Components without violating
 * Next.js's rule that 'use server' files may only export async functions.
 */

/**
 * Cutoff timestamp for grandfathering existing workshops.
 * Default: migration 0008 timestamp (when credit_consumed_at column was added).
 * Any workshop created before this timestamp predated the paywall.
 *
 * Override via PAYWALL_CUTOFF_OVERRIDE env var (epoch ms) for testing:
 *   PAYWALL_CUTOFF_OVERRIDE=0  → disables grandfathering (all workshops hit paywall)
 *
 * Default value: 1772051653843 ms = 2026-02-25T20:34:13.843Z
 */
const CUTOFF_MS = process.env.PAYWALL_CUTOFF_OVERRIDE
  ? parseInt(process.env.PAYWALL_CUTOFF_OVERRIDE, 10)
  : 1772051653843;

export const PAYWALL_CUTOFF_DATE = new Date(CUTOFF_MS);

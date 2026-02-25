/**
 * Paywall configuration constants.
 *
 * Kept in a separate non-'use server' module so these values can be imported
 * by both server actions ('use server') and Server Components without violating
 * Next.js's rule that 'use server' files may only export async functions.
 */

/**
 * Cutoff timestamp for grandfathering existing workshops.
 * Equals the `when` field from migration journal entry 0008_shocking_sphinx.sql,
 * which added the `credit_consumed_at` column — the moment paywall enforcement
 * became possible. Any workshop created before this timestamp predated the paywall.
 *
 * Value: 1772051653843 ms = 2026-02-26T23:54:13.843Z
 */
export const PAYWALL_CUTOFF_DATE = new Date(1772051653843);

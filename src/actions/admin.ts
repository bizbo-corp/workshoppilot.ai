'use server';

import { requireAdmin } from '@/lib/auth/current-user';
import { runDummyWorkshop } from '@/lib/testing/dummy-workshop';
import type { ActionResult } from './types';

/** Runs one random dummy workshop now. Takes a minute or two and spends a few cents. */
export async function startDummyWorkshop(): Promise<ActionResult<{ seed: string; pass: boolean; summary: string }>> {
  const admin = await requireAdmin();
  try {
    const { report, seed } = await runDummyWorkshop({ triggeredBy: `admin:${admin.email}`, maxTurns: 16 });
    return { success: true, data: { seed, pass: report.pass, summary: report.summary } };
  } catch (err) {
    return { success: false, error: String(err instanceof Error ? err.message : err) };
  }
}

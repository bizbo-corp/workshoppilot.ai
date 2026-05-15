/**
 * Unit tests for assembleStepContext sentinel injection (HALL-01)
 *
 * Test runner: vitest (NOT YET INSTALLED in this repo as of 2026-05-16).
 * These tests require: npm install -D vitest
 * Then run: npx vitest run src/lib/context/__tests__/assemble-context.test.ts
 *
 * RUNNABLE ALTERNATIVE (no vitest required):
 * npx tsx scripts/verify-sentinel.ts
 *
 * The three scenarios below verify:
 * 1. Sentinel IS injected when stakeholder-mapping has no challenge summary in DB
 * 2. Sentinel is NOT injected for Step 1 (challenge) — empty deps [] is intentional
 * 3. Sentinel is NOT injected when a real summary IS present
 *
 * NOTE: Tests require DATABASE_URL set and accessible (uses real Neon dev DB).
 * Fixture workshops: ws_sentinel_test_empty_fixture (no summaries)
 *                    real dev workshop with challenge summary (for scenario 3)
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — vitest not installed; this file is a design-time artifact
// Install vitest to make it executable: npm install -D vitest
import { describe, it, expect, vi } from 'vitest';
import { assembleStepContext } from '@/lib/context/assemble-context';

const SENTINEL = '⚠️ NO PRIOR STEP CONTEXT AVAILABLE — DO NOT INVENT ONE';

describe('assembleStepContext sentinel injection', () => {
  it('injects sentinel when stakeholder-mapping has no challenge summary', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // ws_sentinel_test_empty_fixture: fixture workshop with no step_summaries rows
    const ctx = await assembleStepContext('ws_sentinel_test_empty_fixture', 'stakeholder-mapping');
    expect(ctx.summaries).toBe(SENTINEL);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No prior step summaries found')
    );
    warnSpy.mockRestore();
  });

  it('does NOT inject sentinel for Step 1 (challenge) — has no deps', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = await assembleStepContext('ws_sentinel_test_empty_fixture', 'challenge');
    expect(ctx.summaries).toBe('');
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does NOT inject sentinel when summary IS present', async () => {
    // ws_sentinel_test_with_summary_fixture: fixture workshop with seeded challenge summary
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = await assembleStepContext('ws_sentinel_test_with_summary_fixture', 'stakeholder-mapping');
    expect(ctx.summaries).not.toContain('NO PRIOR STEP CONTEXT');
    expect(ctx.summaries.length).toBeGreaterThan(0);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

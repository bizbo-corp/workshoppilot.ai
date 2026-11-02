import { describe, it, expect, afterEach } from 'vitest';
import { AI_JOBS, getJobConfig, estimateCostCents, MODEL_PRICES, CREDIT_UNIT_CENTS, MIN_MARGIN_MULTIPLE } from './jobs';

describe('job registry', () => {
  afterEach(() => {
    for (const k of Object.keys(process.env)) if (k.startsWith('AI_MODEL_')) delete process.env[k];
  });

  it('every job has a priced model', () => {
    for (const job of AI_JOBS) {
      const cfg = getJobConfig(job);
      expect(MODEL_PRICES[cfg.model], `${job} uses unpriced model ${cfg.model}`).toBeDefined();
    }
  });

  it('env overrides swap the model without code changes', () => {
    process.env.AI_MODEL_FACILITATE = 'anthropic/claude-haiku-5-5';
    expect(getJobConfig('facilitate').model).toBe('anthropic/claude-haiku-5-5');
  });

  it('costs a typical free facilitation turn at a fraction of a cent', () => {
    const cents = estimateCostCents('google/gemini-2.5-flash-lite', { inputTokens: 3000, outputTokens: 250 });
    expect(cents).toBeLessThan(0.05);
  });

  it('bills image jobs per image', () => {
    expect(estimateCostCents('google/gemini-3.1-flash-image', { imageCount: 2 })).toBeCloseTo(7.8, 3);
  });

  it('returns 0 for unknown models rather than throwing', () => {
    expect(estimateCostCents('nobody/mystery', { inputTokens: 1e6 })).toBe(0);
  });

  it('every paid job clears the margin rule on a generous token estimate', () => {
    // Worst-case token use per paid job; the admin view checks real numbers later.
    const worstCase: Record<string, { inputTokens?: number; outputTokens?: number; imageCount?: number }> = {
      verdict: { inputTokens: 40_000, outputTokens: 6_000 },
      clean_sketch: { imageCount: 1 },
    };
    for (const job of AI_JOBS) {
      const cfg = getJobConfig(job);
      if (cfg.credits === 0) continue;
      const cost = estimateCostCents(cfg.model, worstCase[job] ?? { inputTokens: 20_000, outputTokens: 2_000 });
      const revenue = cfg.credits * CREDIT_UNIT_CENTS;
      expect(revenue / cost, `${job}: ${revenue}c revenue vs ${cost.toFixed(2)}c cost`).toBeGreaterThanOrEqual(MIN_MARGIN_MULTIPLE);
    }
  });
});

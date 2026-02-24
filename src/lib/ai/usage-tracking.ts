import { db } from '@/db/client';
import { aiUsageEvents } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Pricing per model (current as of Feb 2026)
 *
 * gemini-2.0-flash: $0.10 per 1M input tokens, $0.40 per 1M output tokens
 * imagen-4.0-fast-generate-001: $0.02 per image
 */
const PRICING = {
  'gemini-2.0-flash': {
    inputPerMillionTokens: 0.10, // dollars
    outputPerMillionTokens: 0.40,
  },
  'imagen-4.0-fast-generate-001': {
    perImage: 0.02, // dollars
  },
} as const;

/**
 * Calculate cost in US cents for an AI call
 */
export function calculateCostCents(params: {
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  imageCount?: number | null;
}): number {
  const { model, inputTokens, outputTokens, imageCount } = params;

  if (model === 'gemini-2.0-flash') {
    const pricing = PRICING['gemini-2.0-flash'];
    const inputCost = ((inputTokens || 0) / 1_000_000) * pricing.inputPerMillionTokens;
    const outputCost = ((outputTokens || 0) / 1_000_000) * pricing.outputPerMillionTokens;
    return (inputCost + outputCost) * 100; // convert dollars to cents
  }

  if (model === 'imagen-4.0-fast-generate-001') {
    const pricing = PRICING['imagen-4.0-fast-generate-001'];
    return (imageCount || 0) * pricing.perImage * 100; // convert dollars to cents
  }

  return 0;
}

/**
 * Record an AI usage event to the database.
 * Fire-and-forget: catches errors internally so it never breaks AI workflows.
 */
export function recordUsageEvent(params: {
  workshopId: string;
  stepId?: string | null;
  operation: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  imageCount?: number | null;
}): { costCents: number } {
  const costCents = calculateCostCents(params);

  // Fire-and-forget insert
  db.insert(aiUsageEvents)
    .values({
      workshopId: params.workshopId,
      stepId: params.stepId || null,
      operation: params.operation,
      model: params.model,
      inputTokens: params.inputTokens || null,
      outputTokens: params.outputTokens || null,
      imageCount: params.imageCount || null,
      costCents,
    })
    .catch((error) => {
      console.error('[usage-tracking] Failed to record usage event:', error);
    });

  return { costCents };
}

/**
 * Get aggregated usage summary for a workshop
 */
export async function getWorkshopUsageSummary(workshopId: string) {
  const rows = await db
    .select({
      operation: aiUsageEvents.operation,
      totalInputTokens: sql<number>`coalesce(sum(${aiUsageEvents.inputTokens}), 0)`.as('total_input_tokens'),
      totalOutputTokens: sql<number>`coalesce(sum(${aiUsageEvents.outputTokens}), 0)`.as('total_output_tokens'),
      totalImages: sql<number>`coalesce(sum(${aiUsageEvents.imageCount}), 0)`.as('total_images'),
      totalCostCents: sql<number>`coalesce(sum(${aiUsageEvents.costCents}), 0)`.as('total_cost_cents'),
      callCount: sql<number>`count(*)`.as('call_count'),
    })
    .from(aiUsageEvents)
    .where(eq(aiUsageEvents.workshopId, workshopId))
    .groupBy(aiUsageEvents.operation);

  const totals = rows.reduce(
    (acc, row) => ({
      totalInputTokens: acc.totalInputTokens + Number(row.totalInputTokens),
      totalOutputTokens: acc.totalOutputTokens + Number(row.totalOutputTokens),
      totalImages: acc.totalImages + Number(row.totalImages),
      totalCostCents: acc.totalCostCents + Number(row.totalCostCents),
      callCount: acc.callCount + Number(row.callCount),
    }),
    { totalInputTokens: 0, totalOutputTokens: 0, totalImages: 0, totalCostCents: 0, callCount: 0 }
  );

  return {
    ...totals,
    totalCostDollars: totals.totalCostCents / 100,
    byOperation: rows.map((r) => ({
      operation: r.operation,
      inputTokens: Number(r.totalInputTokens),
      outputTokens: Number(r.totalOutputTokens),
      images: Number(r.totalImages),
      costCents: Number(r.totalCostCents),
      calls: Number(r.callCount),
    })),
  };
}

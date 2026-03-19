import { db } from '@/db/client';
import { aiUsageEvents } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { IMAGE_GEN_CAP } from './constants';

/**
 * Count how many image generations have been recorded for a specific item.
 */
export async function checkImageGenerationCap(itemId: string): Promise<{
  count: number;
  remaining: number;
  allowed: boolean;
}> {
  const result = await db
    .select({
      count: sql<number>`count(*)`.as('count'),
    })
    .from(aiUsageEvents)
    .where(
      and(
        eq(aiUsageEvents.itemId, itemId),
        sql`${aiUsageEvents.imageCount} > 0`,
      )
    );

  const count = Number(result[0]?.count || 0);
  const remaining = Math.max(0, IMAGE_GEN_CAP - count);

  return { count, remaining, allowed: remaining > 0 };
}

/**
 * Build the 403 response when generation cap is exceeded.
 */
export function imageCapExceededResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'generation_limit_reached',
      message: `You've used all ${IMAGE_GEN_CAP} generations for this item. Each sketch or persona allows ${IMAGE_GEN_CAP} AI generations to encourage thoughtful prompting.`,
      remainingGenerations: 0,
      cap: IMAGE_GEN_CAP,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

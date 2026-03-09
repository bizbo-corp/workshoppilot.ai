import { auth } from '@clerk/nextjs/server';
import { checkImageGenerationCap } from '@/lib/ai/image-generation-cap';
import { IMAGE_GEN_CAP } from '@/lib/ai/constants';

/**
 * POST /api/ai/image-gen-remaining
 * Batch check remaining image generations for multiple items.
 *
 * Request body: { itemIds: string[] }
 * Response: { results: Record<string, { remaining: number, cap: number }> }
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { itemIds } = await req.json();

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'itemIds[] is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Cap batch size to prevent abuse
    const limitedIds = itemIds.slice(0, 50);

    const results: Record<string, { remaining: number; cap: number }> = {};
    await Promise.all(
      limitedIds.map(async (itemId: string) => {
        const check = await checkImageGenerationCap(itemId);
        results[itemId] = { remaining: check.remaining, cap: IMAGE_GEN_CAP };
      }),
    );

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('image-gen-remaining error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check generation limits' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

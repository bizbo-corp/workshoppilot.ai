/**
 * Create V0 Chat API
 *
 * POST /api/build-pack/create-v0-chat
 * Sends the generated prompt to V0 Platform API to create a live prototype.
 * Requires V0_API_KEY environment variable.
 */

import { v0 } from 'v0-sdk';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { buildPacks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const rl = checkRateLimit(getRateLimitId(req, userId), 'build-pack');
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  // Check for V0 API key
  if (!process.env.V0_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'V0 API key is not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { buildPackId, prompt: promptOverride, systemPrompt: systemPromptOverride } = body;

    if (!buildPackId) {
      return new Response(
        JSON.stringify({ error: 'buildPackId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fast path: availability check from the dialog (no DB hit needed)
    if (buildPackId === '__check__') {
      return new Response(
        JSON.stringify({ available: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load saved prompt from build_packs
    const [buildPack] = await db
      .select()
      .from(buildPacks)
      .where(eq(buildPacks.id, buildPackId))
      .limit(1);

    if (!buildPack || !buildPack.content) {
      return new Response(
        JSON.stringify({ error: 'Build pack not found. Generate a prompt first.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const saved = JSON.parse(buildPack.content);

    // Allow caller to override prompt/systemPrompt (e.g. user edited in dialog)
    const finalPrompt = promptOverride || saved.prompt;
    const finalSystemPrompt = systemPromptOverride || saved.systemPrompt;

    if (!finalPrompt) {
      return new Response(
        JSON.stringify({ error: 'Build pack has no prompt. Regenerate the prompt first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call V0 Platform API in async mode — returns immediately with a pending chat
    // This prevents serverless function timeout (V0 sync can take 60-120s)
    const chat = await v0.chats.create({
      message: finalPrompt,
      system: finalSystemPrompt,
      responseMode: 'async',
    }) as { id: string; webUrl: string; latestVersion?: { status: string; demoUrl?: string; files?: { name: string; content: string }[] } };

    const versionStatus = chat.latestVersion?.status ?? 'pending';
    const demoUrl = chat.latestVersion?.demoUrl ?? '';
    const files = chat.latestVersion?.files?.map((f) => ({ name: f.name, content: f.content })) ?? [];

    // Save chatId + webUrl immediately so v0-status can poll V0 for completion
    const updatedContent = JSON.stringify({
      ...saved,
      ...(promptOverride ? { prompt: promptOverride } : {}),
      ...(systemPromptOverride ? { systemPrompt: systemPromptOverride } : {}),
      v0ChatId: chat.id,
      v0EditorUrl: chat.webUrl,
      // Only set demoUrl/files if V0 already completed (unlikely in async mode)
      ...(versionStatus === 'completed' && demoUrl ? { v0DemoUrl: demoUrl, v0Files: files } : {}),
    });

    await db
      .update(buildPacks)
      .set({ content: updatedContent })
      .where(eq(buildPacks.id, buildPackId));

    return new Response(
      JSON.stringify({
        chatId: chat.id,
        editorUrl: chat.webUrl,
        status: versionStatus,
        demoUrl,
        files,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('create-v0-chat error:', msg);
    if (stack) console.error('Stack:', stack);
    return new Response(
      JSON.stringify({ error: `Failed to create V0 prototype: ${msg}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

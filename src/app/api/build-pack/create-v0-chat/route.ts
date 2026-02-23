/**
 * Create V0 Chat API
 *
 * POST /api/build-pack/create-v0-chat
 * Sends the generated prompt to V0 Platform API to create a live prototype.
 * Requires V0_API_KEY environment variable.
 */

import { v0 } from 'v0-sdk';
import { db } from '@/db/client';
import { buildPacks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  // Check for V0 API key
  if (!process.env.V0_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'V0 API key is not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { buildPackId } = body;

    if (!buildPackId) {
      return new Response(
        JSON.stringify({ error: 'buildPackId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
    if (!saved.prompt) {
      return new Response(
        JSON.stringify({ error: 'Build pack has no prompt. Regenerate the prompt first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call V0 Platform API (non-streaming returns ChatDetail)
    const chat = await v0.chats.create({
      message: saved.prompt,
      system: saved.systemPrompt,
    }) as { id: string; webUrl: string; latestVersion?: { demoUrl?: string; files: { name: string; content: string }[] } };

    const demoUrl = chat.latestVersion?.demoUrl ?? '';
    const files = chat.latestVersion?.files?.map((f) => ({ name: f.name, content: f.content })) ?? [];

    // Save V0 response to build_packs
    const updatedContent = JSON.stringify({
      ...saved,
      v0DemoUrl: demoUrl,
      v0ChatId: chat.id,
      v0EditorUrl: chat.webUrl,
      v0Files: files,
    });

    await db
      .update(buildPacks)
      .set({ content: updatedContent })
      .where(eq(buildPacks.id, buildPackId));

    return new Response(
      JSON.stringify({
        demoUrl,
        chatId: chat.id,
        files,
        editorUrl: chat.webUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('create-v0-chat error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to create V0 prototype' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

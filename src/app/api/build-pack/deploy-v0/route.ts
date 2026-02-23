/**
 * Deploy V0 Prototype API
 *
 * POST /api/build-pack/deploy-v0
 * Deploys a V0 chat prototype to a public Vercel URL.
 * Requires V0_API_KEY environment variable.
 */

import { v0 } from 'v0-sdk';
import { db } from '@/db/client';
import { buildPacks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
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

    // Load saved V0 data from build_packs
    const [buildPack] = await db
      .select()
      .from(buildPacks)
      .where(eq(buildPacks.id, buildPackId))
      .limit(1);

    if (!buildPack?.content) {
      return new Response(
        JSON.stringify({ error: 'Build pack not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const saved = JSON.parse(buildPack.content);

    if (!saved.v0ChatId) {
      return new Response(
        JSON.stringify({ error: 'V0 prototype not created yet. Create in V0 first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already deployed
    if (saved.deploymentUrl) {
      return new Response(
        JSON.stringify({
          deploymentUrl: saved.deploymentUrl,
          deploymentId: saved.deploymentId,
          cached: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the chat to find the version ID
    const chat = await v0.chats.getById({ chatId: saved.v0ChatId });
    const versionId = chat.latestVersion?.id;

    if (!versionId) {
      return new Response(
        JSON.stringify({ error: 'No completed version found for this V0 chat' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create a V0 project for this chat
    let projectId: string;
    try {
      const project = await v0.projects.getByChatId({ chatId: saved.v0ChatId });
      projectId = project.id;
    } catch {
      // No project exists — create one
      const conceptName = saved.conceptName || buildPack.title || 'Workshop Prototype';
      const project = await v0.projects.create({
        name: conceptName,
        description: `Prototype generated from WorkshopPilot.ai design thinking workshop`,
      });
      // Assign the chat to the project
      await v0.projects.assign({ projectId: project.id, chatId: saved.v0ChatId });
      projectId = project.id;
    }

    // Ensure a Vercel project is linked (required for deployment)
    const projectDetail = await v0.projects.getById({ projectId });
    if (!projectDetail.vercelProjectId) {
      const conceptName = saved.conceptName || buildPack.title || 'Workshop Prototype';
      // Sanitize name for Vercel: lowercase, alphanumeric + hyphens, max 100 chars
      const vercelName = conceptName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 100) || 'workshop-prototype';
      await v0.integrations.vercel.projects.create({
        projectId,
        name: vercelName,
      });
    }

    // Deploy
    const deployment = await v0.deployments.create({
      projectId,
      chatId: saved.v0ChatId,
      versionId,
    });

    // Save deployment data
    const updatedContent = JSON.stringify({
      ...saved,
      deploymentUrl: deployment.webUrl,
      deploymentId: deployment.id,
      projectId,
    });

    await db
      .update(buildPacks)
      .set({ content: updatedContent })
      .where(eq(buildPacks.id, buildPackId));

    return new Response(
      JSON.stringify({
        deploymentUrl: deployment.webUrl,
        deploymentId: deployment.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && error.cause ? String(error.cause) : undefined;
    console.error('deploy-v0 error:', message, cause || '');
    return new Response(
      JSON.stringify({ error: message || 'Failed to deploy prototype' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * V0 Prototype Status Check
 *
 * GET /api/build-pack/v0-status?workshopId=xxx
 *
 * Polls the journey map build pack to check if v0 prototype creation is complete.
 * When we have a v0ChatId but no demoUrl, actively polls V0 API for the version status.
 */

import { v0 } from 'v0-sdk';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workshopId = searchParams.get('workshopId');
    const directBuildPackId = searchParams.get('buildPackId');

    if (!workshopId && !directBuildPackId) {
      return Response.json({ error: 'workshopId or buildPackId is required' }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let journeyMapBp: { id: string; content: string | null } | undefined;

    if (directBuildPackId) {
      // Direct build pack lookup (from PrdViewerDialog)
      const [bp] = await db
        .select({ id: buildPacks.id, content: buildPacks.content, workshopId: buildPacks.workshopId })
        .from(buildPacks)
        .where(eq(buildPacks.id, directBuildPackId))
        .limit(1);

      if (bp) {
        // Verify ownership via workshop
        const [workshop] = await db
          .select({ clerkUserId: workshops.clerkUserId })
          .from(workshops)
          .where(eq(workshops.id, bp.workshopId))
          .limit(1);
        if (!workshop || workshop.clerkUserId !== userId) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
        journeyMapBp = bp;
      }
    } else if (workshopId) {
      // Verify workshop ownership
      const [workshop] = await db
        .select({ id: workshops.id, clerkUserId: workshops.clerkUserId })
        .from(workshops)
        .where(eq(workshops.id, workshopId))
        .limit(1);

      if (!workshop || workshop.clerkUserId !== userId) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Find journey map build pack
      const rows = await db
        .select()
        .from(buildPacks)
        .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Map:%')));
      journeyMapBp = rows.find((r) => r.formatType === 'json');
    }

    if (!journeyMapBp || !journeyMapBp.content) {
      return Response.json({ status: 'not_found' });
    }

    const content = JSON.parse(journeyMapBp.content);

    // Already have demo URL — done
    if (content.v0DemoUrl) {
      return Response.json({
        status: 'ready',
        demoUrl: content.v0DemoUrl,
        editorUrl: content.v0EditorUrl ?? '',
        fileCount: content.v0Files?.length ?? 0,
      });
    }

    // Have chatId but no demoUrl — poll V0 API directly for version status
    if (content.v0ChatId && process.env.V0_API_KEY) {
      try {
        const chat = await v0.chats.getById({ chatId: content.v0ChatId }) as {
          id: string;
          webUrl: string;
          latestVersion?: {
            status: string;
            demoUrl?: string;
            files?: { name: string; content: string }[];
          };
        };

        const version = chat.latestVersion;

        if (version?.status === 'completed' && version.demoUrl) {
          // V0 is done — save results to build pack
          const files = version.files?.map((f) => ({ name: f.name, content: f.content })) ?? [];
          const updated = {
            ...content,
            v0DemoUrl: version.demoUrl,
            v0EditorUrl: chat.webUrl,
            v0Files: files,
          };
          await db
            .update(buildPacks)
            .set({ content: JSON.stringify(updated) })
            .where(eq(buildPacks.id, journeyMapBp.id));

          return Response.json({
            status: 'ready',
            demoUrl: version.demoUrl,
            editorUrl: chat.webUrl,
            fileCount: files.length,
          });
        }

        if (version?.status === 'failed') {
          return Response.json({ status: 'failed', error: 'V0 generation failed' });
        }

        // Still pending
        return Response.json({ status: 'pending', editorUrl: chat.webUrl });
      } catch (err) {
        console.error('v0-status V0 API poll error:', err instanceof Error ? err.message : err);
        // Fall through to generic pending response
        return Response.json({ status: 'pending' });
      }
    }

    // Has prompt but no chatId yet — create-v0-chat hasn't saved yet
    if (content.prompt) {
      return Response.json({ status: 'pending' });
    }

    return Response.json({ status: 'no_prompt' });
  } catch (error) {
    console.error('v0-status error:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

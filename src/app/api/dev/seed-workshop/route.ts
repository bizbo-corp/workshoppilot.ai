/**
 * Dev-Only Seed Workshop API Route
 *
 * GET /api/dev/seed-workshop?upToStep=persona
 *
 * Creates a pre-populated "PawPal Pet Care App" workshop with steps 1-N fully
 * populated so developers can jump directly to any step for testing.
 *
 * - Validates all fixture artifacts against current Zod schemas before DB writes
 * - Returns 403 in production (NODE_ENV !== 'development')
 * - Requires Clerk authentication (returns 401 if not signed in)
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import {
  workshops,
  sessions,
  workshopSteps,
  stepArtifacts,
  stepSummaries,
} from '@/db/schema';
import { createPrefixedId } from '@/lib/ids';
import { STEPS } from '@/lib/workshop/step-metadata';
import { getSchemaForStep } from '@/lib/schemas';
import { PAWPAL_FIXTURES } from './fixtures';

export async function GET(request: Request) {
  // ── Guard: dev-only ────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 },
    );
  }

  // ── Guard: authenticated ──────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized — sign in first' },
      { status: 401 },
    );
  }

  // ── Parse upToStep param ──────────────────────────────────────────
  const url = new URL(request.url);
  const upToStepParam = url.searchParams.get('upToStep');

  // Default: seed all 10 steps (up to 'validate')
  const upToStepId = upToStepParam || 'validate';
  const upToStepDef = STEPS.find((s) => s.id === upToStepId);

  if (!upToStepDef) {
    return NextResponse.json(
      {
        error: `Invalid upToStep: "${upToStepId}". Valid values: ${STEPS.map((s) => s.id).join(', ')}`,
      },
      { status: 400 },
    );
  }

  const seedUpToOrder = upToStepDef.order;

  // ── Validate all fixture artifacts against Zod schemas ────────────
  const validationErrors: string[] = [];
  for (const step of STEPS) {
    if (step.order > seedUpToOrder) break;

    const fixture = PAWPAL_FIXTURES[step.id];
    if (!fixture) {
      validationErrors.push(`Missing fixture for step "${step.id}"`);
      continue;
    }

    const schema = getSchemaForStep(step.id);
    if (!schema) {
      validationErrors.push(`Missing Zod schema for step "${step.id}"`);
      continue;
    }

    const result = schema.safeParse(fixture.artifact);
    if (!result.success) {
      validationErrors.push(
        `Schema validation failed for "${step.id}": ${result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      );
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: 'Fixture validation failed', details: validationErrors },
      { status: 422 },
    );
  }

  // ── Generate IDs ──────────────────────────────────────────────────
  const workshopId = createPrefixedId('ws');
  const sessionId = createPrefixedId('ses');
  const now = new Date();

  // Pre-generate workshop step IDs so we can reference them in artifacts
  const stepIdMap: Record<string, string> = {};
  for (const step of STEPS) {
    stepIdMap[step.id] = createPrefixedId('wst');
  }

  // ── Determine step statuses ───────────────────────────────────────
  // Steps up to seedUpToOrder = 'complete'
  // Step seedUpToOrder + 1 = 'in_progress' (the one you'll test next)
  // Remaining = 'not_started'
  function getStepStatus(order: number): 'complete' | 'in_progress' | 'not_started' {
    if (order <= seedUpToOrder) return 'complete';
    if (order === seedUpToOrder + 1) return 'in_progress';
    return 'not_started';
  }

  try {
    // ── Insert workshop ───────────────────────────────────────────────
    await db.insert(workshops).values({
      id: workshopId,
      clerkUserId: userId,
      title: 'PawPal Pet Care App',
      originalIdea:
        'A mobile app that helps busy urban pet owners manage their pets\' health, nutrition, and daily care needs without it feeling like a second job.',
      status: seedUpToOrder >= 10 ? 'completed' : 'active',
      color: 'green',
      emoji: '\uD83D\uDC3E',
    });

    // ── Insert session ────────────────────────────────────────────────
    await db.insert(sessions).values({
      id: sessionId,
      workshopId,
      startedAt: now,
    });

    // ── Insert all 10 workshop steps ──────────────────────────────────
    await db.insert(workshopSteps).values(
      STEPS.map((step) => {
        const status = getStepStatus(step.order);
        return {
          id: stepIdMap[step.id],
          workshopId,
          stepId: step.id,
          status,
          arcPhase: status === 'complete' ? ('complete' as const) : ('orient' as const),
          startedAt: status !== 'not_started' ? now : null,
          completedAt: status === 'complete' ? now : null,
        };
      }),
    );

    // ── Insert step artifacts (seeded steps only) ─────────────────────
    const artifactRows = [];
    for (const step of STEPS) {
      if (step.order > seedUpToOrder) break;
      const fixture = PAWPAL_FIXTURES[step.id];
      if (!fixture) continue;

      // Merge _canvas into artifact JSONB if canvas data exists
      let artifactData = fixture.artifact;

      if (fixture.canvasData) {
        // New format: full canvas state with all types
        artifactData = { ...fixture.artifact, _canvas: fixture.canvasData };
      } else if (fixture.canvas) {
        // Legacy format: StickyNote[] only
        artifactData = { ...fixture.artifact, _canvas: { stickyNotes: fixture.canvas } };
      }

      artifactRows.push({
        id: createPrefixedId('art'),
        workshopStepId: stepIdMap[step.id],
        stepId: step.id,
        artifact: artifactData,
        schemaVersion: '1.0',
        extractedAt: now,
        version: 1,
      });
    }

    if (artifactRows.length > 0) {
      await db.insert(stepArtifacts).values(artifactRows);
    }

    // ── Insert step summaries (seeded steps only) ─────────────────────
    const summaryRows = [];
    for (const step of STEPS) {
      if (step.order > seedUpToOrder) break;
      const fixture = PAWPAL_FIXTURES[step.id];
      if (!fixture) continue;

      summaryRows.push({
        id: createPrefixedId('sum'),
        workshopStepId: stepIdMap[step.id],
        stepId: step.id,
        summary: fixture.summary,
        generatedAt: now,
      });
    }

    if (summaryRows.length > 0) {
      await db.insert(stepSummaries).values(summaryRows);
    }

    // ── Build response ────────────────────────────────────────────────
    const seededSteps = STEPS.filter((s) => s.order <= seedUpToOrder).map((s) => s.id);
    const nextStep = STEPS.find((s) => s.order === seedUpToOrder + 1);
    const navigateToStep = nextStep || upToStepDef;

    return NextResponse.json({
      success: true,
      workshopId,
      sessionId,
      seededSteps,
      nextStep: nextStep?.id ?? null,
      url: `/workshop/${workshopId}/${navigateToStep.slug}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to seed workshop', details: message },
      { status: 500 },
    );
  }
}

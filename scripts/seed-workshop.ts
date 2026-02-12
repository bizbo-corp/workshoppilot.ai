/**
 * CLI Seed Script for PawPal Workshop
 *
 * Creates a complete PawPal workshop directly in the database (bypasses HTTP/Clerk auth).
 *
 * Usage:
 *   npm run db:seed:workshop
 *   npm run db:seed:workshop -- --clerk-user-id user_abc123
 *   npm run db:seed:workshop -- --clerk-user-id user_abc123 --up-to-step persona
 *
 * Requires: DATABASE_URL in .env.local
 */

import { db } from '../src/db/client';
import {
  workshops,
  sessions,
  workshopSteps,
  stepArtifacts,
  stepSummaries,
} from '../src/db/schema';
import { createPrefixedId } from '../src/lib/ids';
import { STEPS } from '../src/lib/workshop/step-metadata';
import { getSchemaForStep } from '../src/lib/schemas';
import { PAWPAL_FIXTURES } from '../src/app/api/dev/seed-workshop/fixtures';

// ── CLI Arguments ──────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let clerkUserId = 'user_seed_pawpal';
  let upToStep = 'validate';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--clerk-user-id' && args[i + 1]) {
      clerkUserId = args[i + 1];
      i++;
    } else if (args[i] === '--up-to-step' && args[i + 1]) {
      upToStep = args[i + 1];
      i++;
    }
  }

  return { clerkUserId, upToStep };
}

// ── Validation ─────────────────────────────────────────────────────
function validateFixtures(upToStepOrder: number): string[] {
  const validationErrors: string[] = [];

  for (const step of STEPS) {
    if (step.order > upToStepOrder) break;

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

  return validationErrors;
}

// ── Step Status Helper ─────────────────────────────────────────────
function getStepStatus(
  order: number,
  seedUpToOrder: number,
): 'complete' | 'in_progress' | 'not_started' {
  if (order <= seedUpToOrder) return 'complete';
  if (order === seedUpToOrder + 1) return 'in_progress';
  return 'not_started';
}

// ── Main Seed Function ─────────────────────────────────────────────
async function seedWorkshop() {
  console.log('🌱 Seeding PawPal workshop...\n');

  const { clerkUserId, upToStep } = parseArgs();

  // Validate upToStep argument
  const upToStepDef = STEPS.find((s) => s.id === upToStep);
  if (!upToStepDef) {
    console.error(
      `❌ Invalid --up-to-step: "${upToStep}". Valid values: ${STEPS.map((s) => s.id).join(', ')}`,
    );
    process.exit(1);
  }

  const seedUpToOrder = upToStepDef.order;

  // Validate fixtures against Zod schemas
  console.log('🔍 Validating fixtures against Zod schemas...');
  const validationErrors = validateFixtures(seedUpToOrder);

  if (validationErrors.length > 0) {
    console.error('\n❌ Fixture validation failed:\n');
    validationErrors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  console.log('✓ All fixtures validated successfully\n');

  // Generate IDs
  const workshopId = createPrefixedId('ws');
  const sessionId = createPrefixedId('ses');
  const now = new Date();

  // Pre-generate workshop step IDs
  const stepIdMap: Record<string, string> = {};
  for (const step of STEPS) {
    stepIdMap[step.id] = createPrefixedId('wst');
  }

  try {
    // ── Insert workshop ──────────────────────────────────────────────
    console.log('📝 Inserting workshop...');
    await db.insert(workshops).values({
      id: workshopId,
      clerkUserId,
      title: 'PawPal Pet Care App',
      originalIdea:
        'A mobile app that helps busy urban pet owners manage their pets\' health, nutrition, and daily care needs without it feeling like a second job.',
      status: seedUpToOrder >= 10 ? 'completed' : 'active',
    });
    console.log(`✓ Workshop created: ${workshopId}\n`);

    // ── Insert session ───────────────────────────────────────────────
    console.log('🔄 Inserting session...');
    await db.insert(sessions).values({
      id: sessionId,
      workshopId,
      startedAt: now,
    });
    console.log(`✓ Session created: ${sessionId}\n`);

    // ── Insert all 10 workshop steps ─────────────────────────────────
    console.log('📋 Inserting workshop steps (1-10)...');
    await db.insert(workshopSteps).values(
      STEPS.map((step) => {
        const status = getStepStatus(step.order, seedUpToOrder);
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
    console.log('✓ All workshop steps created\n');

    // ── Insert step artifacts (seeded steps only) ────────────────────
    console.log(`📦 Inserting step artifacts (steps 1-${seedUpToOrder})...`);
    const artifactRows = [];
    const seededSteps: string[] = [];

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
        // Legacy format: PostIt[] only
        artifactData = { ...fixture.artifact, _canvas: { postIts: fixture.canvas } };
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

      seededSteps.push(step.id);
    }

    if (artifactRows.length > 0) {
      await db.insert(stepArtifacts).values(artifactRows);
      console.log(`✓ ${artifactRows.length} artifacts created\n`);
    }

    // ── Insert step summaries (seeded steps only) ────────────────────
    console.log('📄 Inserting step summaries...');
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
      console.log(`✓ ${summaryRows.length} summaries created\n`);
    }

    // ── Print success summary ────────────────────────────────────────
    const nextStep = STEPS.find((s) => s.order === seedUpToOrder + 1);
    const navigateToStep = nextStep || upToStepDef;

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Seeded PawPal workshop:\n');
    console.log(`   Workshop ID:    ${workshopId}`);
    console.log(`   Session ID:     ${sessionId}`);
    console.log(`   Steps seeded:   ${seededSteps.join(', ')}`);
    console.log(`   Clerk User ID:  ${clerkUserId}`);
    console.log(`   URL:            /workshop/${workshopId}/${navigateToStep.slug}`);
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding workshop:', error);
    process.exit(1);
  }
}

// ── Run ────────────────────────────────────────────────────────────
seedWorkshop();

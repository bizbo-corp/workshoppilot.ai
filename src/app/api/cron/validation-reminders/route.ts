/**
 * GET /api/cron/validation-reminders — daily Vercel cron (see vercel.json).
 *
 * The come-back loop for the Validation Score: a few days after a workshop wraps with a
 * committed test signal but no recorded result, email the owner a "log your result, unlock
 * your score" nudge deep-linking to the Validate step (where the armed gauge waits).
 *
 * Guarantees:
 *  - fires at most once per plan (resultReminderSentAt is stamped on the plan),
 *  - suppressed once a result is logged,
 *  - only looks back a bounded window so old workshops are never spammed.
 */

import { and, eq, gte, isNull, asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, sessions, users } from '@/db/schema';
import { dbWithRetry } from '@/db/with-retry';
import { getValidateArtifact, updateValidateArtifact } from '@/lib/validation/save-validation';
import {
  sendValidationReminderEmail,
  validateStepUrl,
} from '@/lib/email/validation-reminder-email';
import type { Signal, ValidationPlan } from '@/lib/schemas';

export const maxDuration = 60;

/** Days after wrap-up before the nudge goes out. */
const REMINDER_DELAY_DAYS = 3;
/** Don't nudge for wrap-ups older than this — bounded look-back. */
const MAX_LOOKBACK_DAYS = 30;
/** Workshops examined per run (daily cron drains any backlog across runs). */
const BATCH_LIMIT = 100;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Plain-language committed bar for the email — mirrors armedCaption in ScoreRing.tsx. */
function signalCaption(signal: Signal): string | null {
  if (signal.metricType === 'qualitative') {
    return signal.successCriteriaText && signal.failCriteriaText
      ? `${signal.successCriteriaText} → validated · ${signal.failCriteriaText} → killed.`
      : null;
  }
  const isPercent = signal.metricType === 'percent';
  const unit = isPercent ? '%' : '';
  const targetDisplay = isPercent
    ? `${signal.target}%`
    : `${signal.target} of ${signal.sampleSize}`;
  const killPart =
    signal.killThreshold != null ? ` · ${signal.killThreshold}${unit} or fewer → killed` : '';
  return `Hit ${targetDisplay} → validated${killPart}.`;
}

/** A plan is nudge-eligible when the test is committed, un-resulted, un-reminded, and aged in. */
function eligiblePlans(plans: ValidationPlan[], now: Date): ValidationPlan[] {
  const delayMs = REMINDER_DELAY_DAYS * 24 * 60 * 60 * 1000;
  const lookbackMs = MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  return plans.filter((p) => {
    if (!p.signal || p.result || p.resultReminderSentAt) return false;
    const anchor = p.acknowledgedAt ?? p.updatedAt;
    const t = Date.parse(anchor);
    if (!Number.isFinite(t)) return false;
    const age = now.getTime() - t;
    return age >= delayMs && age <= lookbackMs;
  });
}

export async function GET(req: Request) {
  // Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`. Require it whenever set;
  // in production a missing secret fails closed.
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (secret) {
    if (authHeader !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);
  } else if (process.env.NODE_ENV === 'production') {
    return json({ error: 'CRON_SECRET not configured' }, 500);
  }

  const now = new Date();
  const coarseSince = new Date(now.getTime() - (MAX_LOOKBACK_DAYS + 15) * 24 * 60 * 60 * 1000);

  try {
    // Coarse candidate set: completed, not deleted, recently touched.
    const candidates = await dbWithRetry(() =>
      db
        .select({
          id: workshops.id,
          title: workshops.title,
          clerkUserId: workshops.clerkUserId,
        })
        .from(workshops)
        .where(
          and(
            eq(workshops.status, 'completed'),
            isNull(workshops.deletedAt),
            gte(workshops.updatedAt, coarseSince)
          )
        )
        .limit(BATCH_LIMIT)
    );

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const ws of candidates) {
      try {
        const artifact = await getValidateArtifact(ws.id);
        const plans = artifact?.validationPlans ?? [];
        const eligible = eligiblePlans(plans, now);
        if (eligible.length === 0) {
          skipped++;
          continue;
        }

        const [owner, session] = await Promise.all([
          dbWithRetry(() =>
            db.query.users.findFirst({
              where: eq(users.clerkUserId, ws.clerkUserId),
              columns: { email: true },
            })
          ),
          dbWithRetry(() =>
            db.query.sessions.findFirst({
              where: eq(sessions.workshopId, ws.id),
              orderBy: [asc(sessions.createdAt)],
              columns: { id: true },
            })
          ),
        ]);

        if (!owner?.email || !session?.id) {
          skipped++;
          continue;
        }

        const result = await sendValidationReminderEmail({
          to: owner.email,
          workshopTitle: ws.title,
          link: validateStepUrl(session.id),
          signalCaption: eligible[0].signal ? signalCaption(eligible[0].signal) : null,
        });

        if (!result.ok) {
          errors.push(`${ws.id}: ${result.error}`);
          continue;
        }

        // Stamp every eligible plan so the workshop is nudged exactly once.
        const sentAt = new Date().toISOString();
        const eligibleIds = new Set(eligible.map((p) => p.id));
        await updateValidateArtifact(ws.id, (current) => ({
          ...current,
          validationPlans: (current.validationPlans ?? []).map((p) =>
            eligibleIds.has(p.id) && !p.result && !p.resultReminderSentAt
              ? { ...p, resultReminderSentAt: sentAt }
              : p
          ),
        }));
        sent++;
      } catch (e) {
        errors.push(`${ws.id}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    console.log(
      `[cron/validation-reminders] candidates=${candidates.length} sent=${sent} skipped=${skipped} errors=${errors.length}`
    );
    return json({ candidates: candidates.length, sent, skipped, errors });
  } catch (error) {
    console.error(
      '[cron/validation-reminders] fatal:',
      error instanceof Error ? error.message : error
    );
    return json({ error: 'Internal server error' }, 500);
  }
}

# Phase 10: Navigation & Persistence - Research

**Researched:** 2026-02-08
**Domain:** Multi-step navigation, auto-save, optimistic locking, cascade invalidation
**Confidence:** HIGH

## Summary

Phase 10 builds back-navigation and auto-save on top of the structured outputs system completed in Phase 9. The standard approach combines URL-based navigation (Next.js App Router), debounced auto-save (use-debounce), optimistic locking (version column pattern), and dependency-based invalidation (status flags).

Research reveals that successful multi-step applications use a combination of strategies:
- **Navigation state** lives in the URL (step number as path param) with database as source of truth for step status
- **Auto-save** uses debounced callbacks (2s delay, 10s maxWait) to reduce database writes while preventing data loss
- **Optimistic locking** prevents concurrent update conflicts via version column with WHERE clause checks
- **Cascade invalidation** marks downstream steps as "needs regeneration" when users revise earlier steps

The architecture already has foundations in place: Phase 7 built optimistic locking via version column on step_artifacts, Phase 9 added structured outputs with Zod schemas. Phase 10 connects these pieces with navigation logic and periodic persistence.

**Primary recommendation:** Use Next.js App Router for URL-based navigation, add debounced auto-save for messages using use-debounce library, implement cascade invalidation via status flags on workshopSteps table, and leverage existing optimistic locking for artifact updates.

## Standard Stack

The established libraries/tools for multi-step navigation and auto-save in React/Next.js applications:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.1 | URL-based navigation | Built-in, Server Components compatible, revalidatePath for cache invalidation |
| use-debounce | ^10.0.6 | Debounced callbacks for auto-save | Lightweight, supports maxWait, cancel/flush controls |
| Drizzle ORM | ^0.45.1 | Database operations with transactions | Already in stack, supports optimistic locking patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | ^5.0.2 | Client-side state management | Optional: for complex UI state (not needed if URL + DB is source of truth) |
| Zustand persist middleware | Built-in | localStorage persistence | Optional: for offline drafts or anonymous users (not needed for Phase 10) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| use-debounce | lodash.debounce + useCallback | use-debounce is React-specific, handles component lifecycle automatically |
| URL params | Zustand global state | URL provides shareable links, browser history, SSR compatibility |
| Version column | Row-level locks (SELECT FOR UPDATE) | Optimistic locking has lower contention, better for auto-save scenarios |

**Installation:**
```bash
npm install use-debounce
# All other dependencies already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── actions/
│   ├── workshop-actions.ts      # Server Actions for navigation, status updates
│   └── auto-save-actions.ts     # NEW: Debounced auto-save for messages
├── components/workshop/
│   ├── step-navigation.tsx      # EXISTING: Next/Back buttons
│   └── step-status-badge.tsx    # NEW: Visual indicator for "needs regeneration"
├── lib/navigation/
│   ├── cascade-invalidation.ts  # NEW: Mark downstream steps invalid
│   └── step-dependencies.ts     # NEW: Define step dependency graph
└── hooks/
    └── use-auto-save.ts          # NEW: Debounced auto-save hook
```

### Pattern 1: URL-Based Navigation with Database Source of Truth
**What:** Step number in URL path (`/workshop/[sessionId]/step/[stepOrder]`), database tracks step status and completion
**When to use:** Multi-step flows where state must persist across sessions and be shareable
**Example:**
```typescript
// Navigation: Next.js App Router pattern
// URL: /workshop/ses_xxx/step/3
// Source: Next.js docs - Linking and Navigating

// Step page component (Server Component)
export default async function StepPage({
  params
}: {
  params: { sessionId: string; stepOrder: string }
}) {
  const stepOrder = parseInt(params.stepOrder);

  // Fetch step status from database (source of truth)
  const stepData = await db.query.workshopSteps.findFirst({
    where: and(
      eq(workshopSteps.workshopId, workshopId),
      eq(workshopSteps.stepId, STEPS[stepOrder - 1].id)
    ),
  });

  // Render based on database state
  return <StepView stepData={stepData} />;
}
```

### Pattern 2: Debounced Auto-Save with maxWait
**What:** Use useDebouncedCallback to batch auto-save requests (2s delay, 10s maxWait)
**When to use:** Preventing data loss while minimizing database writes during active typing/editing
**Example:**
```typescript
// Source: use-debounce npm package
import { useDebouncedCallback } from 'use-debounce';

function ChatInterface({ sessionId, stepId }: Props) {
  const debouncedSave = useDebouncedCallback(
    async (messages: UIMessage[]) => {
      await saveMessages(sessionId, stepId, messages);
    },
    2000, // 2 second delay
    { maxWait: 10000 } // Force save after 10 seconds max
  );

  // Call on every message update
  useEffect(() => {
    if (messages.length > 0) {
      debouncedSave(messages);
    }
  }, [messages, debouncedSave]);

  return <ChatUI />;
}
```

### Pattern 3: Optimistic Locking via Version Column
**What:** Include version number in WHERE clause when updating, increment on success
**When to use:** Concurrent updates to same record (e.g., auto-save race conditions)
**Example:**
```typescript
// Source: Medium - Optimistic Locking: Concurrency Control with a Version Column
// EXISTING pattern in src/lib/context/save-artifact.ts

// Update with optimistic locking
const result = await db
  .update(stepArtifacts)
  .set({
    artifact,
    version: currentVersion + 1,
    extractedAt: new Date(),
  })
  .where(
    and(
      eq(stepArtifacts.id, artifactId),
      eq(stepArtifacts.version, currentVersion) // Lock check
    )
  );

// If WHERE clause doesn't match (version changed), update returns 0 rows
// Drizzle doesn't expose rowCount directly, so verify with follow-up SELECT
```

### Pattern 4: Cascade Invalidation via Status Flags
**What:** When user revises step N, mark steps N+1 through 10 as "needs regeneration"
**When to use:** Multi-step flows with dependencies where earlier changes invalidate downstream outputs
**Example:**
```typescript
// NEW pattern for Phase 10
async function invalidateDownstreamSteps(
  workshopId: string,
  revisedStepOrder: number
) {
  // Get all steps after the revised step
  const downstreamSteps = STEPS.filter(s => s.order > revisedStepOrder);

  // Mark each as needs_regeneration
  for (const step of downstreamSteps) {
    await db
      .update(workshopSteps)
      .set({
        status: 'needs_regeneration', // NEW status value
        completedAt: null // Clear completion timestamp
      })
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, step.id)
        )
      );
  }
}
```

### Pattern 5: Server Action with revalidatePath
**What:** Call revalidatePath after database updates to refresh Next.js cache
**When to use:** After Server Actions that modify data shown in Server Components
**Example:**
```typescript
// Source: Next.js docs - revalidatePath
// EXISTING pattern in src/actions/workshop-actions.ts

'use server';
import { revalidatePath } from 'next/cache';

export async function updateStepStatus(
  workshopId: string,
  stepId: string,
  status: string,
  sessionId: string
) {
  // Update database
  await db.update(workshopSteps).set({ status }).where(...);

  // Invalidate Next.js cache for this workshop
  revalidatePath(`/workshop/${sessionId}`);
}
```

### Anti-Patterns to Avoid
- **Storing step state in client-side Zustand only:** Browser refresh loses all progress. Database must be source of truth.
- **Auto-saving on every keystroke without debouncing:** Creates excessive database load and potential race conditions.
- **Using SELECT FOR UPDATE for auto-save:** Pessimistic locking increases contention. Optimistic locking is better for low-conflict scenarios.
- **Cascade invalidation via deletion:** Deleting artifacts loses user work. Mark as "needs regeneration" instead.
- **Synchronous save blocking UI:** Use Server Actions with optimistic UI updates, don't block user input during save.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debouncing function calls in React | useCallback + setTimeout | use-debounce library | Handles component unmount cleanup, supports maxWait, cancel/flush |
| Managing dependency graphs | Custom adjacency list + traversal | Simple array + filter (for linear dependencies) | Workshop steps are sequential (1→2→3...), not complex DAG |
| Detecting concurrent updates | Timestamps or custom flags | Version column pattern | Race-proof, well-tested, works with any isolation level |
| Persisting Zustand state | Custom localStorage sync | Zustand persist middleware | Handles hydration, SSR compatibility, storage abstraction |
| Step wizard component library | Custom stepper UI | Build on shadcn/ui primitives | Workshop needs custom 6-phase arc UI, generic wizards don't fit |

**Key insight:** Auto-save with debouncing looks trivial (just setTimeout) but handling React component lifecycle, cancellation on unmount, maxWait enforcement, and re-render safety requires careful implementation. use-debounce solves these edge cases.

## Common Pitfalls

### Pitfall 1: Auto-Save Race Conditions
**What goes wrong:** User makes change A, auto-save starts. User makes change B before A finishes saving. Both saves race to database, change A might overwrite change B.
**Why it happens:** Debounced save batches multiple changes, but if two batches overlap (user types fast, then pauses, then types again), concurrent requests can conflict.
**How to avoid:** Use optimistic locking with version column. If version changed between read and write, retry with latest version.
**Warning signs:** Messages or artifacts occasionally missing recent changes after auto-save. Intermittent "stale data" errors.

### Pitfall 2: Debounce Losing Data on Component Unmount
**What goes wrong:** User types message, debounce delays save for 2 seconds. User navigates to next step before 2 seconds elapse. Component unmounts, debounced callback never fires, message lost.
**Why it happens:** Standard setTimeout is cancelled when component unmounts. Pending auto-save is lost.
**How to avoid:** Use maxWait option (10s) to force periodic saves. Call debounced function's flush() method in cleanup or before navigation. Or save synchronously before navigation (in button click handler).
**Warning signs:** Users report losing last message when navigating quickly. Auto-save only works if user pauses typing for full 2 seconds.

### Pitfall 3: revalidatePath Over-Invalidation
**What goes wrong:** Calling revalidatePath(`/workshop/${sessionId}`) invalidates ALL steps in the workshop, causing unnecessary data refetches on every navigation.
**Why it happens:** revalidatePath clears entire route segment cache. In Next.js 16, it invalidates more aggressively than expected.
**How to avoid:** Accept the over-invalidation for Phase 10 (workshop data is small, refetch is fast). Future optimization: use more specific paths like `/workshop/${sessionId}/step/${stepOrder}`.
**Warning signs:** Network tab shows redundant data fetches on every step navigation. Workshop sidebar re-renders unnecessarily.

### Pitfall 4: Cascade Invalidation Breaking Completed Workshops
**What goes wrong:** User completes entire 10-step workshop, goes back to revise Step 3, all steps 4-10 marked "needs regeneration". User expected only affected steps to be invalidated.
**Why it happens:** Linear dependency assumption (all later steps depend on all earlier steps) is too conservative.
**How to avoid:** For Phase 10, accept conservative invalidation (all downstream steps marked). Document as known limitation. Future: build dependency graph to invalidate only truly dependent steps.
**Warning signs:** Users complain about losing progress when making small edits. "Why do I have to redo Steps 8-10 when I only changed Step 2?"

### Pitfall 5: Optimistic Locking False Positives
**What goes wrong:** Auto-save fails with "version conflict" even though no concurrent update occurred. User sees error toast unnecessarily.
**Why it happens:** Phase 7's saveStepArtifact doesn't verify update success. If version WHERE clause doesn't match, Drizzle silently updates 0 rows but doesn't throw error.
**How to avoid:** Enhance saveStepArtifact to return updated row count or use .returning() clause to verify success. Retry on conflict with exponential backoff.
**Warning signs:** Silent save failures (UI shows saved but database unchanged). Intermittent data loss without error messages.

### Pitfall 6: Back Navigation Without View-Only Mode
**What goes wrong:** User navigates back to Step 3 to view output, accidentally edits conversation, downstream steps invalidated unintentionally.
**Why it happens:** Phase 10 allows back navigation but doesn't distinguish between "view previous step" and "revise previous step".
**How to avoid:** For Phase 10, accept that back navigation allows editing. Add "Revise" button explicitly to trigger invalidation cascade, don't auto-invalidate on any change. Document in UI.
**Warning signs:** Users report accidentally triggering regeneration when they just wanted to review earlier outputs.

## Code Examples

Verified patterns from official sources:

### Debounced Auto-Save Hook
```typescript
// Source: use-debounce GitHub README
import { useDebouncedCallback } from 'use-debounce';
import { useEffect } from 'react';
import type { UIMessage } from 'ai';

export function useAutoSave(
  sessionId: string,
  stepId: string,
  messages: UIMessage[]
) {
  const debouncedSave = useDebouncedCallback(
    async (msgs: UIMessage[]) => {
      await saveMessages(sessionId, stepId, msgs);
    },
    2000, // 2 second delay
    { maxWait: 10000 } // Force save after 10 seconds
  );

  useEffect(() => {
    if (messages.length > 0) {
      debouncedSave(messages);
    }
  }, [messages, debouncedSave]);

  // Cleanup: flush pending save on unmount
  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  return {
    isPending: debouncedSave.isPending,
    cancel: debouncedSave.cancel,
    flush: debouncedSave.flush,
  };
}
```

### Enhanced Optimistic Locking with Verification
```typescript
// Source: Drizzle ORM docs - Update
import { db } from '@/db/client';
import { stepArtifacts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export class OptimisticLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

export async function saveStepArtifactWithRetry(
  workshopStepId: string,
  stepId: string,
  artifact: Record<string, unknown>,
  schemaVersion: string = '1.0'
): Promise<void> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Fetch current version
      const existing = await db
        .select({ id: stepArtifacts.id, version: stepArtifacts.version })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, workshopStepId))
        .limit(1);

      if (existing.length > 0) {
        const currentVersion = existing[0].version;
        const newVersion = currentVersion + 1;

        // Update with version check, return updated row to verify
        const result = await db
          .update(stepArtifacts)
          .set({
            artifact,
            schemaVersion,
            version: newVersion,
            extractedAt: new Date(),
          })
          .where(
            and(
              eq(stepArtifacts.id, existing[0].id),
              eq(stepArtifacts.version, currentVersion)
            )
          )
          .returning({ updatedVersion: stepArtifacts.version });

        // Verify update succeeded
        if (result.length === 0 || result[0].updatedVersion !== newVersion) {
          throw new OptimisticLockError(
            'Version conflict: artifact was updated concurrently'
          );
        }
      } else {
        // Insert new artifact
        await db.insert(stepArtifacts).values({
          workshopStepId,
          stepId,
          artifact,
          schemaVersion,
          version: 1,
        });
      }

      return; // Success
    } catch (error) {
      if (error instanceof OptimisticLockError && attempt < maxRetries - 1) {
        attempt++;
        // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        continue;
      }
      throw error; // Rethrow if not retryable or max retries exceeded
    }
  }
}
```

### Cascade Invalidation Server Action
```typescript
// Source: Workshop-specific pattern based on Next.js Server Actions
'use server';
import { db } from '@/db/client';
import { workshopSteps } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { STEPS } from '@/lib/workshop/step-metadata';

export async function invalidateDownstreamSteps(
  workshopId: string,
  revisedStepId: string,
  sessionId: string
): Promise<{ invalidatedCount: number }> {
  // Find order of revised step
  const revisedStep = STEPS.find(s => s.id === revisedStepId);
  if (!revisedStep) {
    throw new Error(`Step ${revisedStepId} not found`);
  }

  // Get all downstream step IDs
  const downstreamSteps = STEPS.filter(s => s.order > revisedStep.order);
  const downstreamIds = downstreamSteps.map(s => s.id);

  if (downstreamIds.length === 0) {
    return { invalidatedCount: 0 }; // No downstream steps to invalidate
  }

  // Mark all downstream steps as needs_regeneration
  // Note: Drizzle doesn't support UPDATE with IN clause directly,
  // so we loop (acceptable for 10 steps max)
  let invalidatedCount = 0;
  for (const stepId of downstreamIds) {
    await db
      .update(workshopSteps)
      .set({
        status: 'needs_regeneration',
        completedAt: null,
      })
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      );
    invalidatedCount++;
  }

  // Invalidate cache
  revalidatePath(`/workshop/${sessionId}`);

  return { invalidatedCount };
}
```

### Step Status Schema Extension
```typescript
// Source: Drizzle ORM schema pattern
// MODIFY src/db/schema/steps.ts

export const workshopSteps = pgTable('workshop_steps', {
  // ... existing columns
  status: text('status', {
    enum: ['not_started', 'in_progress', 'complete', 'needs_regeneration'], // ADD needs_regeneration
  })
    .notNull()
    .default('not_started')
    .$type<'not_started' | 'in_progress' | 'complete' | 'needs_regeneration'>(),
  // ... rest of schema
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pessimistic locking (SELECT FOR UPDATE) | Optimistic locking (version column) | ~2015 | Lower contention, better for auto-save with low conflict rates |
| lodash.debounce with custom cleanup | React-specific debounce hooks (use-debounce) | ~2019 | Automatic cleanup, maxWait support, React lifecycle integration |
| Client-side state (Redux/Zustand) as source of truth | Server state (database) as source of truth | ~2021 (React Server Components) | Prevents data loss on refresh, enables SSR, shareable URLs |
| Custom wizard libraries (react-stepzilla) | URL-based navigation with framework router | ~2022 (Next.js App Router) | Better DX, native browser history, no extra deps |
| Zustand persist for all state | Selective persistence: URL + database for critical state | 2024-2026 | Zustand persist best for UI preferences, not workshop data |

**Deprecated/outdated:**
- **react-multistep / react-stepzilla:** Last updated 2017-2018, not compatible with React 19 or Server Components. Use Next.js App Router instead.
- **lodash.debounce in React components:** Works but requires manual useCallback + cleanup. use-debounce handles this automatically.
- **Storing workshop progress in localStorage only:** Doesn't sync across devices, no database backup. Use database with optional localStorage for offline drafts.

## Open Questions

Things that couldn't be fully resolved:

1. **Drizzle ORM's .returning() behavior with Neon serverless driver**
   - What we know: Drizzle supports .returning() clause to verify updates succeeded
   - What's unclear: Whether Neon's edge-compatible driver fully supports .returning() for UPDATE queries
   - Recommendation: Test in development. If .returning() fails, fall back to follow-up SELECT to verify version incremented.

2. **Optimal invalidation granularity for 10-step workshop**
   - What we know: Conservative approach (invalidate all downstream) is simple but frustrating for users
   - What's unclear: Which steps truly depend on which earlier steps (needs design thinking domain analysis)
   - Recommendation: Phase 10 uses conservative "invalidate all downstream" approach. Phase 11+ can refine based on user testing.

3. **Auto-save frequency vs. database load tradeoff**
   - What we know: 2s delay + 10s maxWait balances UX and performance. Neon serverless has cold start overhead (500ms-5s).
   - What's unclear: Whether 2s/10s is optimal for this specific use case
   - Recommendation: Start with 2s/10s, monitor database connection metrics, adjust if needed. Consider increasing delay to 3s if Neon cold starts cause issues.

4. **Handling step status in sidebar during back-navigation**
   - What we know: Sidebar shows step statuses (not_started, in_progress, complete, needs_regeneration)
   - What's unclear: Whether viewing a completed step should change its status to in_progress or remain complete
   - Recommendation: Keep status as complete when navigating back for viewing. Only change to in_progress if user explicitly clicks "Revise" button.

## Sources

### Primary (HIGH confidence)
- [use-debounce GitHub repository](https://github.com/xnimorz/use-debounce) - useDebouncedCallback API, maxWait option
- [Next.js revalidatePath documentation](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) - Cache invalidation patterns
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) - Transaction and locking patterns
- [Medium: Optimistic Locking with Version Column](https://medium.com/@sumit-s/optimistic-locking-concurrency-control-with-a-version-column-2e3db2a8120d) - Version column pattern explanation

### Secondary (MEDIUM confidence)
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/middlewares/persist) - State persistence patterns (WebSearch verified)
- [Next.js Server Actions Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions) - Server Actions patterns
- [React Multi-Step Forms (2026)](https://makerkit.dev/blog/tutorials/multi-step-forms-reactjs) - State preservation patterns
- [React Hook Form Multi-Step Tutorial](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps) - Modern form state management

### Tertiary (LOW confidence - WebSearch only, flagged for validation)
- [Dependency graph invalidation patterns](https://cedanet.com.au/ceda/libs/cxObject/dgs/) - Soft vs hard dirty states
- [Drizzle SELECT FOR UPDATE discussions](https://github.com/drizzle-team/drizzle-orm/discussions/1337) - Community patterns, not official
- [React navigation state management (2026)](https://www.c-sharpcorner.com/article/state-management-in-react-2026-best-practices-tools-real-world-patterns/) - General patterns, not Next.js-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs or npm, versions match package.json
- Architecture: HIGH - Patterns drawn from Next.js official docs, existing codebase (Phase 7/9), and verified libraries
- Pitfalls: MEDIUM - Based on common issues reported in WebSearch + general auto-save/locking knowledge, not Phase-10-specific testing

**Research date:** 2026-02-08
**Valid until:** 30 days (2026-03-10) - Next.js and React patterns are stable, use-debounce is mature library

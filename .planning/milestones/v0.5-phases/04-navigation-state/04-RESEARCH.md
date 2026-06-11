# Phase 4: Navigation & State - Research

**Researched:** 2026-02-08
**Domain:** Step navigation, state persistence, sequential enforcement, UI progress indicators
**Confidence:** HIGH

## Summary

Phase 4 implements navigation between the 10 workshop steps with visual progress tracking and sequential enforcement preventing users from skipping ahead. The research focused on three core areas: (1) UI patterns for step progress indicators and Next/Back button placement, (2) database state synchronization for step completion tracking, and (3) sequential enforcement patterns to prevent navigation to incomplete steps.

The standard approach uses Next.js programmatic navigation with server actions to update step completion state in the database, existing sidebar/mobile stepper components updated with completion logic, and UI-level link disabling combined with route validation. The current implementation already has the foundation: `workshop_steps` table with status field (not_started, in_progress, complete), sidebar and mobile stepper components rendering all 10 steps, and step metadata with all definitions hardcoded.

Key insight: Sequential enforcement should be implemented at BOTH the UI level (disabled links) AND the route level (redirect in page.tsx), because users can manually type URLs or use browser history. Database state is the source of truth, fetched server-side in the workshop layout, then passed to client components.

**Primary recommendation:** Update existing sidebar/mobile stepper to check step completion status from database, add Next/Back navigation buttons below the step content area, create server actions to mark steps complete/in-progress, and implement route validation in step page.tsx to redirect if user attempts to access incomplete steps.

---

## Standard Stack

Phase 4 builds on the existing Next.js + Drizzle + shadcn/ui foundation established in Phases 1-3. No new libraries required.

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | Latest | Step completion state persistence | Already used for all database operations, supports edge runtime |
| Next.js Router | 16.1.1 | Programmatic navigation between steps | Built-in, provides `useRouter` hook and `redirect()` utility |
| shadcn/ui Button | Latest | Next/Back navigation buttons | Consistent with existing UI components |
| Lucide Icons | Latest | Check mark, arrow icons for navigation | Already used in sidebar for step indicators |

### Supporting (No New Dependencies)

All functionality can be implemented with existing stack:
- Server Actions (`'use server'`) for step state updates
- Drizzle `update()` and `eq()` for database mutations
- `revalidatePath()` from next/cache to refresh UI after state changes
- `useRouter()` for client-side navigation
- `redirect()` for server-side redirects

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database state as source of truth | URL params or localStorage | URL/localStorage can be manipulated by user, database is authoritative and persists across devices |
| Server Actions for state updates | API routes | Server Actions are the Next.js 15+ standard, provide automatic revalidation and better DX |
| UI + Route validation | Middleware with DB check | Middleware can't easily access DB state on edge runtime, adds complexity for minimal benefit |
| Programmatic navigation | Link components only | Programmatic navigation needed for "Next" button to advance + update state in single action |

---

## Architecture Patterns

### Current State Analysis

**Existing Foundation (from Phase 3):**

```
src/
├── components/layout/
│   ├── workshop-sidebar.tsx        # Desktop: Shows all 10 steps with indicators
│   └── mobile-stepper.tsx          # Mobile: Shows current step + sheet with all steps
├── lib/workshop/
│   └── step-metadata.ts            # STEPS array with all step definitions
├── db/schema/
│   └── steps.ts                    # workshop_steps table with status field
├── actions/
│   └── workshop-actions.ts         # createWorkshopSession, renameWorkshop
└── app/workshop/[sessionId]/
    ├── layout.tsx                  # Fetches session, renders sidebar + header
    └── step/[stepId]/
        └── page.tsx                # Individual step pages
```

**Current Completion Logic (Simple):**

WorkshopSidebar (lines 87-91):
```typescript
const isComplete = currentStepNumber
  ? step.order < currentStepNumber
  : false;
```

This assumes any step BEFORE current step is complete. This is WRONG for MVP 0.5 because users haven't actually completed those steps yet. Phase 4 must replace this with database state.

### Pattern 1: Database-Driven Step Completion State

**What:** Fetch workshop_steps records from database, use status field as source of truth for sidebar/stepper visual state.

**When to use:** MVP 0.5 Phase 4 — replace the current "currentStepNumber - 1" logic with real database state.

**How it works:**
1. Workshop layout fetches session WITH workshop_steps relation
2. Pass step completion state down to sidebar/stepper via props
3. Components check actual database status, not URL-based inference

**Example:**

```typescript
// app/workshop/[sessionId]/layout.tsx (server component)
export default async function WorkshopLayout({ children, params }) {
  const { sessionId } = await params;

  // Fetch session WITH workshop steps
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: {
        with: {
          steps: true, // All workshop_steps records
        },
      },
    },
  });

  // Create status lookup map for easy access
  const stepStatusMap = new Map(
    session.workshop.steps.map(step => [step.stepId, step.status])
  );

  return (
    <SidebarProvider>
      <WorkshopSidebar
        sessionId={sessionId}
        stepStatusMap={stepStatusMap}
      />
      {/* ... */}
    </SidebarProvider>
  );
}
```

```typescript
// components/layout/workshop-sidebar.tsx (client component)
interface WorkshopSidebarProps {
  sessionId: string;
  stepStatusMap: Map<string, 'not_started' | 'in_progress' | 'complete'>;
}

export function WorkshopSidebar({ sessionId, stepStatusMap }: WorkshopSidebarProps) {
  const pathname = usePathname();
  const currentStepNumber = extractStepNumber(pathname);

  return (
    <Sidebar>
      {STEPS.map((step) => {
        const status = stepStatusMap.get(step.id) || 'not_started';
        const isComplete = status === 'complete';
        const isCurrent = step.order === currentStepNumber;
        const isDisabled = status === 'not_started';

        return (
          <SidebarMenuItem key={step.id}>
            <SidebarMenuButton
              asChild={!isDisabled}
              disabled={isDisabled}
              isActive={isCurrent}
            >
              {!isDisabled ? (
                <Link href={`/workshop/${sessionId}/step/${step.order}`}>
                  {/* Step indicator with checkmark if complete */}
                </Link>
              ) : (
                <div className="cursor-not-allowed opacity-50">
                  {/* Disabled step indicator */}
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </Sidebar>
  );
}
```

### Pattern 2: Server Action for Step State Updates

**What:** Server action to update workshop_steps status and revalidate the workshop layout.

**When to use:** Called when user clicks "Next" or when step is marked complete.

**Implementation:**

```typescript
// actions/workshop-actions.ts
'use server';

import { db } from '@/db/client';
import { workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateStepStatus(
  workshopId: string,
  stepId: string,
  status: 'not_started' | 'in_progress' | 'complete',
  sessionId: string
) {
  try {
    await db
      .update(workshopSteps)
      .set({
        status,
        completedAt: status === 'complete' ? new Date() : null,
      })
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      );

    // Revalidate workshop layout to refresh sidebar state
    revalidatePath(`/workshop/${sessionId}`);
  } catch (error) {
    console.error('Failed to update step status:', error);
    throw new Error('Failed to update step status');
  }
}

export async function advanceToNextStep(
  workshopId: string,
  currentStepId: string,
  nextStepId: string,
  sessionId: string
) {
  try {
    // Mark current step complete
    await updateStepStatus(workshopId, currentStepId, 'complete', sessionId);

    // Mark next step in_progress
    await updateStepStatus(workshopId, nextStepId, 'in_progress', sessionId);

    // Return next step number for navigation
    const nextStep = STEPS.find(s => s.id === nextStepId);
    return nextStep?.order || 1;
  } catch (error) {
    console.error('Failed to advance step:', error);
    throw error;
  }
}
```

### Pattern 3: Next/Back Navigation Buttons

**What:** Action buttons below step content area for sequential navigation.

**When to use:** All step pages (except Back on step 1, Next on step 10).

**Placement:** Bottom of step content area, separated from each other to prevent mis-clicks per UX research.

**Example:**

```typescript
// components/workshop/step-navigation.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { advanceToNextStep } from '@/actions/workshop-actions';
import { STEPS } from '@/lib/workshop/step-metadata';

interface StepNavigationProps {
  sessionId: string;
  workshopId: string;
  currentStepOrder: number;
}

export function StepNavigation({ sessionId, workshopId, currentStepOrder }: StepNavigationProps) {
  const router = useRouter();
  const currentStep = STEPS.find(s => s.order === currentStepOrder);
  const isFirstStep = currentStepOrder === 1;
  const isLastStep = currentStepOrder === STEPS.length;

  const handleNext = async () => {
    if (isLastStep) return;

    const nextStep = STEPS.find(s => s.order === currentStepOrder + 1);
    if (!nextStep || !currentStep) return;

    try {
      await advanceToNextStep(
        workshopId,
        currentStep.id,
        nextStep.id,
        sessionId
      );

      // Navigate to next step
      router.push(`/workshop/${sessionId}/step/${nextStep.order}`);
    } catch (error) {
      console.error('Failed to advance:', error);
    }
  };

  const handleBack = () => {
    if (isFirstStep) return;
    router.push(`/workshop/${sessionId}/step/${currentStepOrder - 1}`);
  };

  return (
    <div className="flex items-center justify-between border-t bg-background px-6 py-4">
      {/* Left: Back button */}
      {!isFirstStep ? (
        <Button
          variant="ghost"
          onClick={handleBack}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      ) : (
        <div /> {/* Empty div for spacing */}
      )}

      {/* Right: Next button */}
      {!isLastStep && (
        <Button onClick={handleNext}>
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### Pattern 4: Sequential Enforcement (UI + Route Level)

**What:** Prevent navigation to incomplete steps at both UI (disabled links) and route level (redirect).

**Why both levels:** Users can type URLs directly or use browser back/forward buttons, bypassing UI controls.

**Implementation:**

**UI Level (Sidebar):**
```typescript
// In sidebar, disable links to not_started steps
const isDisabled = status === 'not_started';

<SidebarMenuButton
  asChild={!isDisabled}
  disabled={isDisabled}
  // ...
>
  {!isDisabled ? (
    <Link href={...}>...</Link>
  ) : (
    <div className="cursor-not-allowed opacity-50">...</div>
  )}
</SidebarMenuButton>
```

**Route Level (Step Page):**
```typescript
// app/workshop/[sessionId]/step/[stepId]/page.tsx
export default async function StepPage({ params }) {
  const { sessionId, stepId } = await params;
  const stepNumber = parseInt(stepId, 10);

  // Fetch workshop with steps to check status
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: {
        with: {
          steps: true,
        },
      },
    },
  });

  if (!session) redirect('/dashboard');

  // Get the requested step's status
  const step = STEPS.find(s => s.order === stepNumber);
  if (!step) redirect(`/workshop/${sessionId}/step/1`);

  const stepRecord = session.workshop.steps.find(s => s.stepId === step.id);

  // Sequential enforcement: redirect if trying to access not_started step
  if (stepRecord?.status === 'not_started') {
    // Find the first incomplete or in_progress step and redirect there
    const currentStep = session.workshop.steps.find(
      s => s.status === 'in_progress'
    ) || session.workshop.steps.find(
      s => s.status === 'not_started'
    );

    if (currentStep) {
      const currentStepDef = STEPS.find(s => s.id === currentStep.stepId);
      redirect(`/workshop/${sessionId}/step/${currentStepDef?.order || 1}`);
    }
  }

  // Step is accessible, render page
  return (
    <div className="flex h-full flex-col">
      {/* ... */}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Middleware-based sequential enforcement:** Middleware can't easily access database state, adds complexity, and runs on every request (performance overhead). Better to validate in page.tsx.
- **URL params for completion state:** Users can manipulate URLs, doesn't persist across sessions/devices, conflicts with database as source of truth.
- **Client-only validation:** Users can bypass by typing URLs or using browser navigation. Always validate server-side.
- **Automatic step completion on "Next" click:** Step completion should be explicit and tied to actual task completion (future phase with AI validation). For MVP 0.5, "Next" button can advance AND mark current step complete since there's no content validation yet.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step progress visualization | Custom progress bar SVG | Existing sidebar/mobile stepper + status updates | Already implemented in Phase 3, just needs status prop integration |
| Navigation state management | Custom Zustand store for step state | Database workshop_steps table | Database is already there, provides persistence, no hydration issues |
| Sequential validation | Complex client-side routing guards | Server-side redirect in page.tsx | Simpler, more secure, works with direct URL access |
| Step status synchronization | WebSocket or polling | revalidatePath after server action | Next.js built-in cache revalidation is sufficient for MVP 0.5 |

**Key insight:** Phase 3 already built the UI components (sidebar, mobile stepper). Phase 4 is NOT about rebuilding those components — it's about connecting them to database state and adding navigation actions. Avoid the temptation to create parallel state management when database state already exists.

---

## Common Pitfalls

### Pitfall 1: Map Serialization in Server Components

**What goes wrong:** Passing Map object from server component to client component causes serialization error: "Only plain objects can be passed to Client Components from Server Components."

**Why it happens:** React Server Components can only serialize plain JSON-compatible objects. Map, Set, Date objects require special handling.

**How to avoid:** Convert Map to plain object or array before passing to client component.

**Example:**

```typescript
// ❌ WRONG: Pass Map directly
<WorkshopSidebar stepStatusMap={statusMap} />

// ✅ CORRECT: Convert to plain object
const stepStatuses = Object.fromEntries(statusMap);
<WorkshopSidebar stepStatuses={stepStatuses} />

// OR: Pass array of step records
<WorkshopSidebar steps={session.workshop.steps} />
```

**Warning signs:** "Error: Only plain objects can be passed to Client Components" in console.

### Pitfall 2: Stale Completion State After Navigation

**What goes wrong:** User clicks "Next", advances to next step, but sidebar still shows previous step as incomplete. Requires manual page refresh to see updated state.

**Why it happens:** Next.js caches server component output. After server action updates database, layout doesn't re-fetch unless explicitly revalidated.

**How to avoid:** Call `revalidatePath()` in server action after database update.

**Example:**

```typescript
// ❌ WRONG: Update database but don't revalidate
export async function updateStepStatus(workshopId, stepId, status) {
  await db.update(workshopSteps).set({ status }).where(...);
  // Layout still shows stale data!
}

// ✅ CORRECT: Revalidate after update
export async function updateStepStatus(workshopId, stepId, status, sessionId) {
  await db.update(workshopSteps).set({ status }).where(...);
  revalidatePath(`/workshop/${sessionId}`); // Re-fetch layout
}
```

**Warning signs:** State updates in database but UI doesn't reflect changes until refresh.

### Pitfall 3: Race Conditions on Rapid Next Clicks

**What goes wrong:** User rapidly clicks "Next" button multiple times before first navigation completes, causing multiple concurrent database updates and navigation attempts.

**Why it happens:** Server actions are async, navigation is async. Without disable state, button stays clickable during processing.

**How to avoid:** Disable "Next" button during async operation, use transition state.

**Example:**

```typescript
// ✅ CORRECT: Disable during processing
const [isNavigating, setIsNavigating] = useState(false);

const handleNext = async () => {
  if (isNavigating) return;
  setIsNavigating(true);

  try {
    await advanceToNextStep(...);
    router.push(...);
  } finally {
    setIsNavigating(false); // Re-enable even if error
  }
};

<Button onClick={handleNext} disabled={isNavigating}>
  {isNavigating ? 'Advancing...' : 'Next'}
</Button>
```

**Warning signs:** Multiple database updates for same step, console errors about concurrent updates.

### Pitfall 4: Forgetting to Initialize First Step Status

**What goes wrong:** User creates new workshop, navigates to step 1, but sidebar shows all steps as "not_started" with no visual indication of current position.

**Why it happens:** `createWorkshopSession` initializes all steps as "not_started", doesn't set step 1 to "in_progress".

**How to avoid:** Set first step to "in_progress" during workshop creation.

**Current code (workshop-actions.ts lines 49-55):**
```typescript
const stepRecords = STEPS.map((step, index) => ({
  id: createPrefixedId('wst'),
  workshopId: workshop.id,
  stepId: step.id,
  status: index === 0 ? ('in_progress' as const) : ('not_started' as const),
  startedAt: index === 0 ? new Date() : null,
}));
```

**Status:** Current code ALREADY handles this correctly! First step is set to "in_progress". No change needed, just verify this behavior is maintained.

**Warning signs:** All steps appear disabled/grayed in sidebar on new workshop.

---

## Code Examples

### Complete Implementation Flow

**1. Fetch Workshop State (Layout)**

```typescript
// app/workshop/[sessionId]/layout.tsx
export default async function WorkshopLayout({ children, params }) {
  const { sessionId } = await params;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: {
        with: {
          steps: true,
        },
      },
    },
  });

  if (!session) redirect('/dashboard');

  // Pass steps array (plain object, serializable)
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <div className="hidden md:block">
          <WorkshopSidebar
            sessionId={sessionId}
            workshopSteps={session.workshop.steps}
          />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="block md:hidden">
            <MobileStepper
              sessionId={sessionId}
              workshopSteps={session.workshop.steps}
            />
          </div>
          {/* ... */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
```

**2. Update Sidebar (Client Component)**

```typescript
// components/layout/workshop-sidebar.tsx
'use client';

interface WorkshopSidebarProps {
  sessionId: string;
  workshopSteps: Array<{
    stepId: string;
    status: 'not_started' | 'in_progress' | 'complete';
  }>;
}

export function WorkshopSidebar({ sessionId, workshopSteps }: WorkshopSidebarProps) {
  const pathname = usePathname();
  const currentStepNumber = extractStepNumber(pathname);

  // Create lookup map for O(1) access
  const statusMap = new Map(
    workshopSteps.map(s => [s.stepId, s.status])
  );

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarMenu>
          {STEPS.map((step) => {
            const status = statusMap.get(step.id) || 'not_started';
            const isComplete = status === 'complete';
            const isCurrent = step.order === currentStepNumber;
            const isAccessible = status !== 'not_started';

            return (
              <SidebarMenuItem key={step.id}>
                <SidebarMenuButton
                  asChild={isAccessible}
                  isActive={isCurrent}
                  disabled={!isAccessible}
                >
                  {isAccessible ? (
                    <Link href={`/workshop/${sessionId}/step/${step.order}`}>
                      <StepIndicator
                        order={step.order}
                        isComplete={isComplete}
                        isCurrent={isCurrent}
                      />
                      <span>{step.name}</span>
                    </Link>
                  ) : (
                    <div className="cursor-not-allowed opacity-50">
                      <StepIndicator
                        order={step.order}
                        isComplete={false}
                        isCurrent={false}
                      />
                      <span>{step.name}</span>
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

function extractStepNumber(pathname: string): number | null {
  const match = pathname.match(/\/workshop\/[^/]+\/step\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
```

**3. Add Navigation Buttons (Step Page)**

```typescript
// app/workshop/[sessionId]/step/[stepId]/page.tsx
export default async function StepPage({ params }) {
  const { sessionId, stepId } = await params;
  const stepNumber = parseInt(stepId, 10);

  // Validate and fetch session
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: {
        with: {
          steps: true,
        },
      },
    },
  });

  if (!session) redirect('/dashboard');

  const step = getStepByOrder(stepNumber);
  if (!step) redirect(`/workshop/${sessionId}/step/1`);

  // Sequential enforcement
  const stepRecord = session.workshop.steps.find(s => s.stepId === step.id);
  if (stepRecord?.status === 'not_started') {
    const currentStep = session.workshop.steps.find(
      s => s.status === 'in_progress'
    );
    if (currentStep) {
      const current = STEPS.find(s => s.id === currentStep.stepId);
      redirect(`/workshop/${sessionId}/step/${current?.order || 1}`);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Step header */}
      <div className="border-b bg-background px-6 py-4">
        <h1 className="text-xl font-semibold">
          Step {step.order}: {step.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step.description}
        </p>
      </div>

      {/* Step content with chat/output panels */}
      <div className="flex-1 overflow-hidden">
        <StepContainer stepOrder={stepNumber} />
      </div>

      {/* Navigation buttons */}
      <StepNavigation
        sessionId={sessionId}
        workshopId={session.workshop.id}
        currentStepOrder={stepNumber}
      />
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| URL params for step state | Database as source of truth | Next.js 13+ (Server Components) | More reliable, persists across sessions/devices, prevents URL manipulation |
| Client-side routing guards | Server-side validation in page.tsx | Next.js App Router | Simpler, more secure, works with direct URL access |
| API routes for mutations | Server Actions | Next.js 13.4+ | Better DX, automatic revalidation, form progressive enhancement |
| Polling for state updates | revalidatePath cache invalidation | Next.js 13+ | More efficient, instant updates, no unnecessary requests |

**Deprecated/outdated:**
- `getServerSideProps` for data fetching: Replaced by async Server Components in App Router
- `useBlocker` from React Router: Next.js doesn't have equivalent, use redirect() in page component instead
- Middleware for DB-based route protection: Edge runtime limitations make this impractical, validate in page component

---

## Open Questions

### 1. Step Completion Trigger for MVP 0.5

**What we know:** MVP 0.5 has no AI chat, no actual step content to validate. "Next" button needs to advance to next step.

**What's unclear:** Should "Next" button automatically mark current step as complete, or should there be a separate "Mark Complete" action?

**Recommendation:** For MVP 0.5, "Next" button should both (a) mark current step complete and (b) mark next step in_progress and (c) navigate to next step. This is a single atomic action. Rationale: Without actual content validation, explicit "complete" action adds friction for no benefit. Future phases with AI validation can add separate completion logic.

### 2. Allowing Navigation Back to Completed Steps

**What we know:** Requirements say users cannot skip AHEAD to uncompleted steps.

**What's unclear:** Can users navigate BACK to completed steps? (Likely yes, but confirm.)

**Recommendation:** YES, users should be able to navigate back to any completed step. This allows review/editing. Implementation: In sidebar, enable links for steps with status "complete" OR "in_progress". Only disable "not_started" steps.

### 3. Mobile Stepper Current Step Prop Fix

**What we know:** `MobileStepper` currently has hardcoded `currentStep={1}` in layout.tsx (line 60). This was noted in Phase 3 as needing fixing in Phase 4.

**What's unclear:** How to determine current step in server component (layout.tsx) without pathname.

**Recommendation:** Pass pathname parsing to client component. In layout.tsx, don't pass currentStep prop at all. Instead, MobileStepper should use `usePathname()` hook (already client component) to extract current step number, same pattern as WorkshopSidebar. Update: Remove currentStep prop from MobileStepper interface, extract internally.

---

## Sources

### Primary (HIGH confidence)

**Next.js Official Documentation:**
- [Routing: Middleware | Next.js](https://nextjs.org/docs/14/app/building-your-application/routing/middleware)
- [Getting Started: Linking and Navigating | Next.js](https://nextjs.org/docs/app/getting-started/linking-and-navigating)

**Drizzle ORM:**
- [How to Use Drizzle ORM with PostgreSQL in Next.js 15](https://strapi.io/blog/how-to-use-drizzle-orm-with-postgresql-in-a-nextjs-15-project)
- [Next.js 15 + Drizzle ORM: A Beginner's Guide to CRUD Operations | Medium](https://medium.com/@aslandjc7/next-js-15-drizzle-orm-a-beginners-guide-to-crud-operations-ae7f2701a8c3)

**Existing Codebase:**
- `/src/lib/workshop/step-metadata.ts` - Step definitions
- `/src/db/schema/steps.ts` - Database schema
- `/src/components/layout/workshop-sidebar.tsx` - Current sidebar implementation
- `/src/actions/workshop-actions.ts` - Existing server actions

### Secondary (MEDIUM confidence)

**React Router & Navigation Patterns:**
- [Navigation Blocking | React Router](https://reactrouter.com/how-to/navigation-blocking)
- [React Router: 3 Ways to Disable/Inactivate a Link - KindaCode](https://www.kindacode.com/article/react-router-ways-to-disable-inactivate-a-link)

**Multi-Step Form Best Practices:**
- [How to Design Multi-Step Forms that Enhance the User Experience | Designlab](https://designlab.com/blog/design-multi-step-forms-enhance-user-experience)
- [How to Easily Track Multi-Step Forms on Your Website](https://formstory.io/learn/tracking-multistep-forms/)

**UX Patterns:**
- [Designing A Better Back Button UX — Smashing Magazine](https://www.smashingmagazine.com/2022/08/back-button-ux-design/)
- [Back buttons: When and where to position them on your app? | Medium](https://medium.com/design-bootcamp/back-buttons-when-and-where-to-position-them-on-your-app-5ee5f58fa1cd)

**State Management:**
- [Storing React state in the URL with Next.js | François Best](https://francoisbest.com/posts/2023/storing-react-state-in-the-url-with-nextjs)
- [Beyond useState: State Management in Next.js using URL Parameters](https://blog.openreplay.com/state-management-in-react-using-url/)

**Component Libraries:**
- [GitHub - ebulku/next-stepper: Dynamic multi-step form](https://github.com/ebulku/next-stepper)
- [shadcn/ui stepper community implementations](https://github.com/shadcn-ui/ui/discussions/1422)

### Tertiary (LOW confidence - general research)

- [React Stepper component - Material UI](https://mui.com/material-ui/react-stepper/)
- [Add stepper components to your React app - LogRocket Blog](https://blog.logrocket.com/add-stepper-components-react-app/)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already in use, no new dependencies
- Architecture patterns: HIGH - Patterns verified against existing codebase and Next.js docs
- Pitfalls: HIGH - Based on common Next.js Server Component + Drizzle issues and existing code analysis
- UI/UX patterns: MEDIUM - Best practices from research, need validation with actual user flow

**Research date:** 2026-02-08
**Valid until:** 30 days (stable patterns, Next.js 16 is current)

**Key findings:**
1. NO new dependencies needed - use existing stack
2. Phase 3 already built UI components - Phase 4 connects them to database state
3. Sequential enforcement needs BOTH UI (disabled links) AND route validation (security)
4. Database is source of truth, fetched in layout, passed to client components as plain objects
5. Server actions + revalidatePath pattern handles state updates cleanly

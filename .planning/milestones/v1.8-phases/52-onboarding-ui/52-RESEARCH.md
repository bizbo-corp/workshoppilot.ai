# Phase 52: Onboarding UI - Research

**Researched:** 2026-02-26
**Domain:** React modal, Next.js Server Component props, shadcn Dialog, Drizzle user query
**Confidence:** HIGH

## Summary

Phase 52 is a thin UI phase with very little technical uncertainty. The infrastructure is already fully in place: `users.onboardingComplete` (boolean, default false) was added in Phase 47's migration, `markOnboardingComplete()` is already implemented as a `'use server'` action in `src/actions/billing-actions.ts`, and the shadcn `Dialog` component is already wired and used in the codebase (via `upgrade-dialog.tsx`).

The implementation has a single plan: create `src/components/dashboard/welcome-modal.tsx` as a `'use client'` shadcn Dialog, then wire it into the dashboard page via a server-side `showWelcomeModal` prop. The modal must be rendered client-side only to prevent hydration mismatches — this is achieved by initializing the Dialog `open` state from the `showWelcomeModal` prop (not from `useState(true)` unconditionally), which is the same pattern used for the credit badge (server queries creditBalance, passes as prop to DashboardHeader).

The Phase 51 pattern — async Server Component queries DB, passes scalar boolean prop to client component — is the exact model to replicate here. The only design question is _where_ in the Server Component tree to inject the modal: the dashboard `page.tsx` (already queries the full user row) is the natural mount point, since it already fetches `users.onboardingComplete` via `db.query.users.findFirst()`.

**Primary recommendation:** Mount the `WelcomeModal` in `src/app/dashboard/page.tsx` — it already fetches the full user row from `users` table; add `showWelcomeModal={!user.onboardingComplete}` prop; the modal renders `open={showWelcomeModal}` with `useState` initialized from the prop for client control.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ONBD-01 | User sees a welcome modal on first visit explaining the app and key areas (chat, canvas, steps) | shadcn Dialog exists; dashboard page.tsx already queries user row; mount WelcomeModal with !user.onboardingComplete as prop |
| ONBD-02 | Welcome modal is dismissible and does not reappear after dismissal | Dialog onOpenChange handler calls markOnboardingComplete() server action; state is set in DB immediately; dialog never re-opens on future page visits because server re-checks DB each time (force-dynamic page) |
| ONBD-03 | Onboarding state persists across devices (DB-backed, not just localStorage) | users.onboardingComplete boolean column already exists in Neon (Phase 47). markOnboardingComplete() already written and exported in billing-actions.ts. No localStorage involved. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Dialog | radix-ui ^1.4.3 | Modal UI primitive | Already installed and used in project (upgrade-dialog.tsx, prd-viewer-dialog.tsx) |
| Drizzle ORM | (project standard) | Read onboardingComplete from users table | Already used in dashboard page.tsx for full user row fetch |
| Next.js Server Components | ^16.1.6 | Query DB server-side, pass showWelcomeModal as prop | Established pattern in project (layout.tsx creditBalance, dashboard page.tsx user query) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.546.0 | Icons in modal (Sparkles, etc.) | Already installed |
| `markOnboardingComplete` (server action) | (existing) | Sets users.onboardingComplete = true | Already implemented in src/actions/billing-actions.ts; call on dismiss |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prop from Server Component | localStorage check | localStorage is per-browser, not cross-device; requirement ONBD-03 forbids it |
| Prop from Server Component | Separate API route to check onboarding state | Over-engineered; dashboard page already fetches the full user row |
| Dialog open state from useEffect | Initialize from prop | useEffect introduces a flash (renders nothing → renders dialog after mount); prop-init avoids the flash while still being client-side only |

**Installation:** No new packages required. All dependencies exist.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/dashboard/          # welcome-modal.tsx lives here (beside dashboard-header.tsx)
├── app/dashboard/page.tsx         # Server Component that passes showWelcomeModal prop
└── actions/billing-actions.ts     # markOnboardingComplete() already here
```

### Pattern 1: Server-Side Boolean Prop Injection (established in Phase 51)

**What:** Async Server Component queries DB, passes a scalar boolean/number as a prop to a 'use client' child component.

**When to use:** When modal visibility is gated on DB state and must be hydration-safe.

**Example from codebase (DashboardLayout):**
```typescript
// src/app/dashboard/layout.tsx — Phase 51 pattern
export default async function DashboardLayout({ children }) {
  const { userId } = await auth();
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { creditBalance: true },
    });
    creditBalance = user?.creditBalance ?? 0;
  }
  return (
    <div>
      <DashboardHeader creditBalance={creditBalance} />
      {children}
    </div>
  );
}
```

**For Phase 52:** The dashboard `page.tsx` already fetches the full user row (no `columns:` restriction). Adding `showWelcomeModal={!user.onboardingComplete}` costs zero extra queries. Pass the prop to a `WelcomeModal` component that mounts client-side.

### Pattern 2: Dialog open state initialized from server prop (prevents hydration mismatch)

**What:** Client component receives a server-computed boolean, initializes `useState(showWelcomeModal)` so the Dialog renders correctly on first paint.

**Why not `open={showWelcomeModal}` directly:** That makes the modal fully controlled from the server prop and prevents the client from closing it. The `useState` wrapper lets the client close it.

**Why not `useEffect`:** useEffect fires after hydration, creating a flash scenario (dialog opens 1 render after mount). Prop-initialized useState avoids the flash AND works without SSR.

**Implementation:**
```typescript
// src/components/dashboard/welcome-modal.tsx
'use client';

import { useState } from 'react';
import { markOnboardingComplete } from '@/actions/billing-actions';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WelcomeModalProps {
  showWelcomeModal: boolean;
}

export function WelcomeModal({ showWelcomeModal }: WelcomeModalProps) {
  const [open, setOpen] = useState(showWelcomeModal);

  async function handleDismiss() {
    setOpen(false);
    await markOnboardingComplete();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleDismiss();
    }}>
      <DialogContent>
        {/* ... */}
      </DialogContent>
    </Dialog>
  );
}
```

**Wiring in dashboard page.tsx:**
```typescript
// At the top of the return, BEFORE the page header div:
return (
  <>
    <WelcomeModal showWelcomeModal={!user.onboardingComplete} />
    <MigrationCheck />
    {/* ... existing page content ... */}
  </>
);
```

### Pattern 3: markOnboardingComplete() already implemented

`markOnboardingComplete()` is exported from `src/actions/billing-actions.ts` and:
- Uses `'use server'` directive
- Authenticates via `auth()` from Clerk
- Does a Drizzle `UPDATE users SET onboarding_complete = true WHERE clerk_user_id = $1`
- Is idempotent (safe to call multiple times)
- Returns `Promise<void>` — no result to handle

Call it on dismiss. No error handling required beyond best-effort (if the DB write fails, the modal shows again on next visit — acceptable degradation).

### Anti-Patterns to Avoid

- **localStorage-only gate:** ONBD-03 explicitly forbids it. `users.onboardingComplete` in Neon is the source of truth.
- **SSR rendering of the modal:** Dialog must be a `'use client'` component. Never render it in a Server Component. The `showWelcomeModal` boolean comes from the server, but the Dialog component itself must be client-side.
- **`open={showWelcomeModal}` without useState:** Makes the dialog unable to close (the prop never changes since Server Components don't re-render without navigation).
- **Separate `onboardingComplete` DB query in layout:** The dashboard `page.tsx` already fetches the full user row. A layout-level query would add a redundant DB round-trip.
- **Rendering WelcomeModal in DashboardLayout:** Layout renders for all dashboard routes. Mount the modal in `page.tsx` only (dashboard home) — not on sub-routes or future dashboard pages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal primitive | Custom CSS modal | shadcn Dialog (already installed) | Focus trap, keyboard, accessibility, animation all handled |
| DB mutation on dismiss | Custom fetch/API route | markOnboardingComplete() server action | Already implemented in billing-actions.ts |
| Hydration-safe dialog | useEffect mount trick | useState(prop) initialization | Cleaner, no flash, established React pattern |

**Key insight:** This phase is nearly infrastructure-free. All DB schema, server actions, and UI primitives are already in place. Phase 52 is purely wiring: one new component file + one prop injection into the existing dashboard page.

## Common Pitfalls

### Pitfall 1: Dialog appears on every page load (no DB write)
**What goes wrong:** User dismisses modal, refreshes — modal appears again.
**Why it happens:** `markOnboardingComplete()` not called, or called but response awaited incorrectly (fire-and-forget without await in async context).
**How to avoid:** Always `await markOnboardingComplete()` inside an async dismiss handler. The `'use server'` action is async — not awaiting it means the DB write may not complete.
**Warning signs:** Modal reappears after dismiss without page navigation.

### Pitfall 2: Dialog renders on server (hydration mismatch)
**What goes wrong:** React hydration error: "Expected server HTML to contain a matching Dialog."
**Why it happens:** WelcomeModal rendered in a Server Component, or Dialog open state set unconditionally before hydration.
**How to avoid:** `WelcomeModal` must have `'use client'` directive. Initialize `useState(showWelcomeModal)` — this initializes only at component mount (client-side), not at SSR time. Radix Dialog with `'use client'` is inherently client-only.
**Warning signs:** Hydration error in browser console on initial load.

### Pitfall 3: Modal shows on dashboard routes other than the home page
**What goes wrong:** Welcome modal appears in future dashboard sub-routes (e.g., /dashboard/settings).
**Why it happens:** WelcomeModal mounted in `DashboardLayout` instead of `DashboardPage`.
**How to avoid:** Mount `WelcomeModal` in `src/app/dashboard/page.tsx` only.

### Pitfall 4: onOpenChange not wired for X button dismissal
**What goes wrong:** Clicking the X close button doesn't call `markOnboardingComplete()` — modal reappears on next visit.
**Why it happens:** Only the CTA button calls dismiss, not the Dialog's native close handler.
**How to avoid:** Wire `onOpenChange={(isOpen) => { if (!isOpen) handleDismiss(); }}` on the Dialog root — this catches both X button clicks and Escape key dismissals. The `showCloseButton` prop on DialogContent defaults to `true` (see `src/components/ui/dialog.tsx` line 54).

### Pitfall 5: Attempting to call server action from onOpenChange directly
**What goes wrong:** TypeScript error or runtime error — `onOpenChange` receives `boolean`, can't be async by default.
**Why it happens:** Trying to make `onOpenChange` an async function directly.
**How to avoid:** Use a separate `handleDismiss` async function and call it from a sync `onOpenChange` wrapper:
```typescript
const handleDismiss = async () => { setOpen(false); await markOnboardingComplete(); };
onOpenChange={(isOpen) => { if (!isOpen) handleDismiss(); }}
```
The `setOpen(false)` closes the dialog immediately (synchronous); the server action runs async in background.

## Code Examples

Verified patterns from project codebase:

### Dialog component usage (from upgrade-dialog.tsx)
```typescript
// src/components/workshop/upgrade-dialog.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle,
         DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function UpgradeDialog({ open, onOpenChange, ... }: UpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>...</DialogTitle>
          <DialogDescription>...</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### markOnboardingComplete (from billing-actions.ts)
```typescript
// src/actions/billing-actions.ts — already implemented
export async function markOnboardingComplete(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  await db.update(users)
    .set({ onboardingComplete: true })
    .where(eq(users.clerkUserId, userId));
}
```

### Server-side prop pattern (from dashboard/layout.tsx)
```typescript
// Phase 51 pattern: server queries DB, passes scalar prop to client component
export default async function DashboardLayout({ children }) {
  const { userId } = await auth();
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { creditBalance: true },
    });
    creditBalance = user?.creditBalance ?? 0;
  }
  return <DashboardHeader creditBalance={creditBalance} />;
}
```

### Dashboard page user query (from dashboard/page.tsx — full row fetch)
```typescript
// src/app/dashboard/page.tsx — already fetches full user row with no columns: filter
const user = await db.query.users.findFirst({
  where: eq(users.clerkUserId, userId),
});
// user.onboardingComplete is available — no additional query needed
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for onboarding flag | DB-backed boolean (users.onboardingComplete) | Phase 47 decision | Cross-device persistence, no hydration mismatch |
| Guided tour (multi-step) | Single welcome modal | v1.8 Requirements.md | 60%+ skip rates for guided tours; modal is sufficient |

**Deprecated/outdated:**
- ONBD-03 originally deferred from v1.6; it is now COMPLETE (DB column + server action exist). Phase 52 only needs the UI layer.

## Open Questions

1. **Modal content (copy + visual design)**
   - What we know: Must explain "the app, the chat/canvas/steps layout, and the taste-test model (Steps 1-6 free)" per the success criteria
   - What's unclear: Exact copy, whether to show icons/diagrams for each area, button label for CTA
   - Recommendation: Claude's discretion — follow the project's tone (direct, outcome-focused). Example: Title "Welcome to WorkshopPilot" → 3 bullet points for Chat / Canvas / Steps → one paragraph on taste-test model → primary CTA "Start My Workshop" or "Let's Go". Keep it concise — users want to get started, not read.

2. **CTA action on modal dismiss**
   - What we know: "Dismissing the modal (via the CTA or close button) calls `markOnboardingComplete()`" — both paths call the same action
   - What's unclear: Whether the primary CTA should navigate somewhere (e.g., open new workshop dialog) in addition to marking complete
   - Recommendation: CTA = dismiss modal only (calls markOnboardingComplete + closes dialog). Do not trigger new workshop creation from the modal — the existing "Start Workshop" button is already prominent on the empty state. Keep scope minimal.

## Sources

### Primary (HIGH confidence)
- Codebase: `src/db/schema/users.ts` — `onboardingComplete: boolean('onboarding_complete').notNull().default(false)` confirmed present
- Codebase: `src/actions/billing-actions.ts` — `markOnboardingComplete()` fully implemented and exported
- Codebase: `src/components/ui/dialog.tsx` — shadcn Dialog exists, uses `radix-ui ^1.4.3`
- Codebase: `src/components/workshop/upgrade-dialog.tsx` — complete Dialog usage example to replicate
- Codebase: `src/app/dashboard/page.tsx` — full user row fetch via Drizzle, `user.onboardingComplete` available
- Codebase: `src/app/dashboard/layout.tsx` — Phase 51 server-prop pattern for creditBalance

### Secondary (MEDIUM confidence)
- Project conventions: `'use client'` + `useState(prop)` initialization seen in theme-toggle.tsx for hydration-safe client state
- Phase 51 plans: confirmed "server-side prop from layout/page to client component" is the established project pattern

### Tertiary (LOW confidence)
- None — all findings verified directly from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all tools already installed and used
- Architecture: HIGH — exact pattern replicated from Phase 51 (DashboardLayout → DashboardHeader creditBalance prop)
- Pitfalls: HIGH — identified from codebase patterns and React/Next.js hydration fundamentals

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable codebase, 30-day window)

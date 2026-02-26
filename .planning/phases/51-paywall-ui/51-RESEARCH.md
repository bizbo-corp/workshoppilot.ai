# Phase 51: Paywall UI - Research

**Researched:** 2026-02-26
**Domain:** Next.js 16 client components, Shadcn Dialog, Stripe Checkout return flow, server action response handling, dashboard Server Component data fetching
**Confidence:** HIGH

---

## Summary

Phase 51 is a UI-only phase. All server-side business logic (credit deduction, grandfathering, paywall enforcement) was established in Phase 50. This phase wires four user-facing surfaces that complete the paywall experience:

1. **Upgrade modal at Step 6**: When `advanceToNextStep()` returns `{ paywallRequired: true }`, `step-navigation.tsx` currently ignores the response entirely — it just falls through to the catch block or silently does nothing. Phase 51 must handle this return to show an inline upgrade dialog.
2. **Lock badges in the stepper (Steps 7-10)**: Both `WorkshopSidebar` and `MobileStepper` receive `workshopSteps` from the layout but have no concept of credit lock. They need a `creditLocked` prop (or equivalent) to render a lock icon on steps 7-10 when a workshop has no credit consumed.
3. **Return-to-workshop after Stripe Checkout**: The checkout route currently hardcodes `success_url` to `/purchase/success`. To land the user back in their workshop at Step 7, the checkout POST must accept an optional `workshop_return_url` and encode it in the Stripe success URL. The success page then redirects to the workshop URL.
4. **Credit badge on dashboard header**: `DashboardHeader` is a 'use client' component with no data fetching. The balance query must live in the dashboard layout or page (Server Component) and be passed down, or fetched client-side on mount using `getCredits()`.

**Primary recommendation:** Build in three plans — Plan 51-01: Upgrade dialog (the modal + step-navigation.tsx fix + stepper lock badges), Plan 51-02: Checkout return-to-workshop flow (checkout route + success page), Plan 51-03: Dashboard credit badge. This matches the natural dependency boundary where Plans 01 and 02 can be verified independently before the dashboard surface.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAYW-02 | User sees an inline upgrade modal when attempting to proceed past Step 6 without credits | `advanceToNextStep()` already returns `{ paywallRequired: true, hasCredits, creditBalance }` — `step-navigation.tsx` must handle this return value and open a Dialog |
| PAYW-03 | Upgrade modal uses outcome-framed copy ("Your Build Pack is 4 steps away") | Dialog copy must be authored; progress context "6 of 10 steps complete"; "Save and decide later" dismiss option required |
| PAYW-04 | After purchasing, user auto-returns to their workshop and continues into Step 7 | Checkout route must accept `workshop_return_url`; success page must redirect to `${workshop_return_url}/step/7` after fulfillment; PaywallOverlay "Buy Credits" must pass this param |
| CRED-01 | User can see remaining workshop credits on the dashboard | Dashboard layout or page must fetch `users.creditBalance`, pass to `DashboardHeader` as prop, render credit badge |

</phase_requirements>

---

## Standard Stack

### Core (already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-dialog` (via shadcn) | current | Upgrade modal | Already installed as `src/components/ui/dialog.tsx`; accessible, keyboard-dismiss, focus trap built in |
| `lucide-react` | current | Lock icons (stepper), badge icons | Already used throughout the codebase |
| `next/navigation` | Next.js 16.1.1 | `useRouter()` in client components | Already used in `step-navigation.tsx`, `paywall-overlay.tsx` |
| `sonner` | current | Toast notifications | Already imported in step-navigation.tsx |
| `@clerk/nextjs/server` | current | `auth()` in Server Components for balance query | Already used in billing-actions.ts, dashboard page |

### No new packages needed

All UI primitives required (Dialog, Button, Badge) are already installed and used in the codebase. No new npm dependencies for Phase 51.

---

## Architecture Patterns

### Pattern 1: Handle `paywallRequired` in `step-navigation.tsx`

**What:** `advanceToNextStep()` returns a discriminated union. The normal path calls `redirect()` internally (throws `NEXT_REDIRECT`) so it never resolves. The paywall path returns a plain object `{ paywallRequired: true, hasCredits, creditBalance }`. Currently the component's `handleNext()` throws on `NEXT_REDIRECT` and silently swallows the paywall return.

**Fix:** Check the return value explicitly after the `await`. If `'paywallRequired' in result`, set a local state flag to open the upgrade dialog.

```typescript
// Source: src/components/workshop/step-navigation.tsx (existing pattern)
const result = await advanceToNextStep(workshopId, currentStep.id, nextStep.id, sessionId);
// redirect() throws NEXT_REDIRECT — if we reach here, it's the paywall return
if ('paywallRequired' in result && result.paywallRequired) {
  setShowUpgradeDialog(true);
  setPaywallState({ hasCredits: result.hasCredits, creditBalance: result.creditBalance });
  return; // Don't navigate
}
```

**Critical:** The existing catch block must NOT catch the paywall return — it catches thrown errors only. The `paywallRequired` path returns normally, not throws. This is the key architectural insight from Phase 50's design.

### Pattern 2: Upgrade Dialog using shadcn `Dialog`

**What:** An inline Dialog (not a full-page redirect) opened by `StepNavigation` when paywall fires. The dialog must be controlled (`open={showUpgradeDialog}` + `onOpenChange`).

**Outcome-framed copy (PAYW-03):**
- Headline: "Your Build Pack is 4 steps away"
- Sub-copy: "6 of 10 steps complete — you've done the hard part"
- Two paths based on `hasCredits`:
  - Has credits: primary CTA = "Use 1 Credit to Unlock" → calls `consumeCredit()` → then calls `advanceToNextStep()` again (which now passes) → navigates to Step 7
  - No credits: primary CTA = "Get 1 Credit — $79" → form POST to `/api/billing/checkout` with `priceId` + `workshop_return_url` parameter
- Dismiss: "Save and decide later" (ghost button, closes dialog — Step 6 stays in_progress, user stays on Step 6)

**Key insight from Phase 50:** After `consumeCredit()` succeeds, the dialog must call `advanceToNextStep()` again. The first call returned `paywallRequired` because `creditConsumedAt` was null; the second call will find it set and proceed to redirect to Step 7. This is the intended two-call pattern documented in `50-02-SUMMARY.md`.

```typescript
// Source: src/actions/billing-actions.ts (existing action)
const credit = await consumeCredit(workshopId);
if (credit.status === 'consumed' || credit.status === 'already_unlocked') {
  // Now re-call advanceToNextStep — this time the gate passes
  await advanceToNextStep(workshopId, currentStep.id, nextStep.id, sessionId);
}
```

### Pattern 3: Lock badges in the stepper

**What:** Steps 7-10 show a `Lock` icon (from `lucide-react`) in both `WorkshopSidebar` and `MobileStepper` when the workshop has no credit consumed and is not grandfathered.

**Where data comes from:** The workshop layout (`src/app/workshop/[sessionId]/layout.tsx`) already fetches `session.workshop` with relations. It needs to also fetch `creditConsumedAt` and `createdAt` from `workshop` and compute `isPaywallLocked` (not unlocked and not grandfathered). This boolean gets passed to both sidebar components as a new prop.

**Implementation detail:** The `workshopSteps` array passed to sidebar/stepper needs no changes. Only a new `isPaywallLocked?: boolean` prop on `WorkshopSidebar` and `MobileStepper`. When `isPaywallLocked === true`, steps with `order >= 7` render a `<Lock>` badge instead of (or alongside) their step number.

```typescript
// Source: src/components/layout/workshop-sidebar.tsx (existing pattern)
// New prop: isPaywallLocked?: boolean
// In step render:
const isLocked = isPaywallLocked && step.order >= 7;
// Step indicator becomes:
{isLocked ? <Lock className="h-3 w-3 text-muted-foreground" /> : isComplete ? <Check ...> : step.order}
```

### Pattern 4: Return-to-workshop after Stripe Checkout (PAYW-04)

**What:** The upgrade dialog's "Buy Credits" CTA must encode the workshop return URL so that after Stripe Checkout → success page, the user lands back in their workshop at Step 7.

**Mechanism:**
1. Upgrade dialog POSTs to `/api/billing/checkout` with an additional hidden field: `workshop_return_url=/workshop/{sessionId}/step/7`
2. Checkout route reads this field, validates it (must start with `/workshop/`), and includes it in the Stripe success URL: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(workshopReturnUrl)}`
3. Purchase success page reads `return_to` from `searchParams`, and after successful fulfillment, redirects to that URL instead of `/dashboard`

**Security note:** The `workshop_return_url` must be validated server-side (same-origin relative path, must start with `/workshop/`) to prevent open redirect. The checkout route already validates `priceId` — add parallel validation for `workshop_return_url`.

**PaywallOverlay** ("Buy Credits" button) also needs this change — currently calls `router.push('/pricing')`. It should instead submit to `/api/billing/checkout` directly (Single Flight priceId) or navigate to `/pricing?return_to=...` (simpler — pricing page handles the Stripe POST, and success page uses the `return_to` from the session metadata).

The cleanest approach: encode `return_to` in the checkout form, not in the pricing page URL. The upgrade dialog submits directly to checkout — no pricing page needed for the paywall flow.

**Phase 50 PaywallOverlay** (for direct URL access to Steps 7-10) currently calls `router.push('/pricing')`. For consistency, update it to also pass `return_to` — but this is a lower-priority polish item since the primary paywall UX is the inline dialog from Phase 51.

### Pattern 5: Dashboard credit badge (CRED-01)

**What:** `DashboardHeader` shows `"X credits remaining"` or `"No credits — get one"`.

**Data source:** `dashboard/page.tsx` (Server Component) already queries `users` table. The `user.creditBalance` is already available in scope. Pass it to `DashboardHeader` as a new prop.

**DashboardHeader** changes: add `creditBalance?: number` prop; render badge.

```typescript
// Source: src/app/dashboard/page.tsx (existing query)
const user = await db.query.users.findFirst({
  where: eq(users.clerkUserId, userId),
}); // creditBalance already on user object

// Pass to layout/header:
<DashboardHeader creditBalance={user.creditBalance} />
```

**Badge design:** Compact pill badge in the header right section:
- `creditBalance > 0`: olive-toned badge: `{creditBalance} credit{s}`
- `creditBalance === 0`: muted/warning badge: `"No credits"` with link to `/pricing`

### Anti-Patterns to Avoid

- **Don't add a third `getCredits()` server action call in the upgrade dialog on mount.** The `advanceToNextStep()` paywall return already includes `hasCredits` and `creditBalance` — use that data directly. No extra round trip needed.
- **Don't redirect() inside the dialog's consumeCredit handler.** The pattern (from PaywallOverlay) is to call `router.refresh()` to trigger Server Component re-render. But in the StepNavigation dialog context, the better flow is to call `advanceToNextStep()` again after `consumeCredit()` succeeds — that will call `redirect()` internally and navigate to Step 7.
- **Don't use `router.push()` after a server action that calls `revalidatePath`.** Server action navigation must use the server-side `redirect()` from `next/navigation`, not client-side router push. The existing `StepNavigation.handleNext()` pattern is correct — rethrow `NEXT_REDIRECT` errors.
- **Don't fetch `creditBalance` in a useEffect for the dashboard badge.** Data is available in the Server Component — pass as prop. Avoids client-side waterfall and hydration flash.
- **Don't change the checkout API to a JSON endpoint.** The pricing page uses form POST. The upgrade dialog must also use form POST (or `fetch` with `redirect: 'follow'` — but this is complex). The cleanest approach is a `<form>` with hidden inputs that the browser submits natively, triggering the 303 redirect.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal with accessible focus trap | Custom modal overlay | shadcn `Dialog` (already installed) | Focus trap, keyboard dismiss, ARIA attributes built in |
| Lock icon | SVG icon from scratch | `lucide-react` `Lock` component | Consistent with existing icon library |
| Credit badge pill | Custom CSS badge | `cn()` + tailwind classes | No Badge primitive needed; simple inline div with ring styling |
| Open redirect validation | Complex URL parser | String `.startsWith('/workshop/')` check | Simple, correct, no library needed |

---

## Common Pitfalls

### Pitfall 1: NEXT_REDIRECT swallows the paywallRequired return

**What goes wrong:** Developer wraps `advanceToNextStep()` in try/catch and puts the paywallRequired check inside the catch block, assuming the server action always throws on redirect.

**Why it happens:** The `redirect()` path throws `NEXT_REDIRECT` (which must be rethrown). The `paywallRequired` path returns normally (no throw). If the developer puts `paywallRequired` handling in the catch block, it never runs.

**How to avoid:** Check the return value BEFORE the catch block. The return type is `{ nextStepOrder } | { paywallRequired: true, hasCredits, creditBalance }`. If `'paywallRequired' in result`, handle it. The `NEXT_REDIRECT` re-throw stays in the catch block.

**Warning signs:** The "Next" button clicks on Step 6 without navigating and without opening any dialog.

### Pitfall 2: Double credit consumption if user clicks "Use Credit" twice

**What goes wrong:** `consumeCredit()` is called while `isConsuming` is `true` (race condition from double-click).

**Why it happens:** Dialog CTA button not disabled during async operation.

**How to avoid:** Disable the primary CTA button while `isConsuming` is true. `consumeCredit()` itself is idempotent (returns `already_unlocked` on second call), so even if it happens, it's safe — but don't rely on idempotency for UX.

### Pitfall 3: Workshop layout doesn't pass creditConsumedAt to sidebar/stepper

**What goes wrong:** The layout fetches `session.workshop` but the Drizzle `with: { workshop: { with: { steps: true } } }` query doesn't include `creditConsumedAt` in the columns projection.

**Why it happens:** Drizzle by default returns all columns when using `with:` (no `columns:` restriction). But the developer might filter columns and forget `creditConsumedAt`.

**How to avoid:** Verify the layout query returns `session.workshop.creditConsumedAt` and `session.workshop.createdAt`. These columns exist in the `workshops` schema (from Phase 47). No schema changes needed.

**Current state:** The layout query uses `db.query.sessions.findFirst({ with: { workshop: { with: { steps: true } } } })` — no `columns:` restriction, so all workshop columns including `creditConsumedAt` and `createdAt` are returned. Just access `session.workshop.creditConsumedAt` and `session.workshop.createdAt`.

### Pitfall 4: Open redirect in checkout route `workshop_return_url`

**What goes wrong:** The checkout route blindly embeds the `workshop_return_url` param into the Stripe success URL without validation. An attacker crafts `workshop_return_url=https://evil.com` and the success page redirects there.

**Why it happens:** Developer trusts the hidden form field value.

**How to avoid:** In the checkout route, validate: `workshopReturnUrl.startsWith('/workshop/')`. Reject (ignore or return 400) any value that doesn't match. On the success page, similarly validate `return_to` before redirecting.

### Pitfall 5: Success page redirects before fulfillment completes

**What goes wrong:** The success page redirects to the workshop URL before `fulfillCreditPurchase()` completes, so the workshop hasn't been unlocked yet. User hits Step 7, gets the PaywallOverlay.

**Why it happens:** The current success page already handles this correctly for `/dashboard`. But when adding `return_to` redirect, the developer might redirect before checking the fulfillment result.

**How to avoid:** Only redirect to `return_to` when `result.status === 'fulfilled'` or `result.status === 'already_fulfilled'`. For `payment_not_paid`, always show the processing message (never redirect to workshop). The `return_to` redirect must happen after the fulfillment check block, not before.

---

## Code Examples

Verified patterns from existing codebase:

### Handling paywallRequired return in step-navigation.tsx

```typescript
// Source: src/components/workshop/step-navigation.tsx (adapted from existing handleNext)
const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
const [paywallState, setPaywallState] = useState<{ hasCredits: boolean; creditBalance: number } | null>(null);

const handleNext = async () => {
  if (isNavigating || isLastStep) return;
  try {
    setIsNavigating(true);
    const currentStep = STEPS.find((s) => s.order === currentStepOrder);
    const nextStep = STEPS.find((s) => s.order === currentStepOrder + 1);
    if (!currentStep || !nextStep) return;

    const result = await advanceToNextStep(workshopId, currentStep.id, nextStep.id, sessionId);

    // paywallRequired returns normally (not throws) — check before catch
    if ('paywallRequired' in result && result.paywallRequired) {
      setPaywallState({ hasCredits: result.hasCredits, creditBalance: result.creditBalance });
      setShowUpgradeDialog(true);
      setIsNavigating(false);
      return;
    }
    // Normal path: redirect() threw NEXT_REDIRECT — handled in catch below
  } catch (error) {
    const digest = (error as Record<string, unknown>)?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      throw error; // Must rethrow for Next.js navigation
    }
    console.error('Failed to advance to next step:', error);
    toast.error('Failed to advance — please try again.');
    setIsNavigating(false);
  }
};
```

### Upgrade dialog "Use Credit" → re-call advanceToNextStep

```typescript
// Source: pattern from PaywallOverlay + advanceToNextStep design
async function handleUseCredit() {
  setIsConsuming(true);
  try {
    const credit = await consumeCredit(workshopId);
    if (credit.status === 'consumed' || credit.status === 'already_unlocked' || credit.status === 'grandfathered' || credit.status === 'paywall_disabled') {
      // Credit consumed — re-call advanceToNextStep; gate now passes, redirect fires
      const currentStep = STEPS.find((s) => s.order === currentStepOrder);
      const nextStep = STEPS.find((s) => s.order === currentStepOrder + 1);
      if (currentStep && nextStep) {
        await advanceToNextStep(workshopId, currentStep.id, nextStep.id, sessionId);
      }
    } else if (credit.status === 'insufficient_credits') {
      toast.error('No credits available.');
    }
  } catch (error) {
    const digest = (error as Record<string, unknown>)?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    toast.error('Failed to unlock workshop. Please try again.');
  } finally {
    setIsConsuming(false);
  }
}
```

### Lock badge in WorkshopSidebar

```typescript
// Source: src/components/layout/workshop-sidebar.tsx (adapted)
// New prop: isPaywallLocked?: boolean
const isLocked = isPaywallLocked && step.order >= 7;

// Step indicator:
<div className={cn(
  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
  isLocked && 'border bg-background text-muted-foreground opacity-50',
  isComplete && !isLocked && 'bg-primary text-primary-foreground',
  // ... other states
)}>
  {isLocked ? (
    <Lock className="h-3 w-3" />
  ) : isComplete ? (
    <Check className="h-3 w-3" />
  ) : (
    step.order
  )}
</div>
```

### Workshop layout computing isPaywallLocked

```typescript
// Source: src/app/workshop/[sessionId]/layout.tsx (adapted)
import { PAYWALL_CUTOFF_DATE } from '@/lib/billing/paywall-config';

const workshop = session.workshop;
const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED !== 'false';
const isUnlocked = workshop.creditConsumedAt !== null;
const isGrandfathered = !isUnlocked && workshop.createdAt < PAYWALL_CUTOFF_DATE;
const isPaywallLocked = PAYWALL_ENABLED && !isUnlocked && !isGrandfathered;
```

### Checkout route workshop_return_url handling

```typescript
// Source: src/app/api/billing/checkout/route.ts (adapted)
// After reading priceId from formData:
const rawReturnUrl = formData.get('workshop_return_url') as string | null;
const workshopReturnUrl =
  rawReturnUrl && rawReturnUrl.startsWith('/workshop/') ? rawReturnUrl : null;

// In success_url:
const returnParam = workshopReturnUrl
  ? `&return_to=${encodeURIComponent(workshopReturnUrl)}`
  : '';
const successUrl = `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}${returnParam}`;
```

### Dashboard credit badge in DashboardHeader

```typescript
// Source: src/components/dashboard/dashboard-header.tsx (adapted)
// New prop:
interface DashboardHeaderProps {
  creditBalance?: number;
}

// In JSX (right section, before ThemeToggle):
{creditBalance !== undefined && (
  <Link
    href="/pricing"
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
      creditBalance > 0
        ? 'bg-olive-100 text-olive-700 hover:bg-olive-200 dark:bg-olive-900/40 dark:text-olive-300'
        : 'bg-muted text-muted-foreground hover:bg-muted/80'
    )}
  >
    <Coins className="h-3 w-3" />
    {creditBalance > 0
      ? `${creditBalance} credit${creditBalance !== 1 ? 's' : ''}`
      : 'No credits — get one'}
  </Link>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-page redirect to pricing on paywall | Inline Dialog at Step 6 | Phase 51 (this phase) | Keeps user in context; sunk-cost bias; no navigation disruption |
| Balance fetched fresh on dialog mount | Balance from `advanceToNextStep()` return | Phase 51 design decision | Zero extra round trip; data already available |
| PaywallOverlay for all paywall scenarios | PaywallOverlay for direct URL access; Dialog for Step 6 flow | Phase 51 | Two distinct UX patterns for two distinct entry points |

---

## Open Questions

1. **"Buy Credits" in the upgrade dialog: form POST vs. navigate to /pricing**
   - What we know: The checkout route accepts form POST. The pricing page also POSTs to checkout. The success page supports `return_to`.
   - What's unclear: Should the upgrade dialog bypass the pricing page entirely (direct checkout POST for Single Flight only) or navigate to `/pricing?return_to=...` (user can choose Single Flight or Serial Entrepreneur)?
   - Recommendation: Navigate to `/pricing?return_to=...`. The pricing page already has the product selection UI. This gives the user the option to choose Serial Entrepreneur if they want. The pricing page doesn't currently read `return_to` — it would need to add it to the form hidden input. Simpler than building a second purchase flow in the dialog.
   - Alternative: The dialog shows both tiers inline (like pricing page) with two forms. More self-contained but more code.

2. **Lock badge on accessible (not_started) steps vs. paywall-locked steps**
   - What we know: `not_started` steps already render as `opacity-50 cursor-not-allowed`. Paywall-locked steps (7-10) are accessible (they have `in_progress` or `not_started` status) but should show a lock badge.
   - What's unclear: Should paywall-locked steps be navigable links (they navigate to PaywallOverlay) or non-navigable? The Phase 50 PaywallOverlay already handles the direct URL case — so navigating there is fine.
   - Recommendation: Keep Steps 7-10 as navigable links (they go to PaywallOverlay). Just add the lock icon to the step indicator. Don't change the `isAccessible` logic.

3. **Dashboard layout vs. page: where to fetch creditBalance for the header**
   - What we know: `DashboardHeader` is rendered from `DashboardLayout`. `DashboardLayout` is a Server Component. `dashboard/page.tsx` already queries the user.
   - What's unclear: Should `DashboardLayout` query the balance independently, or should `dashboard/page.tsx` somehow pass it up to the layout?
   - Recommendation: Add the `creditBalance` query to `DashboardLayout` directly (separate from the page query). Layouts can query data. This keeps the header self-contained and avoids prop-drilling through page → layout (which is architecturally inverted in Next.js). The `DashboardLayout` query is a simple `db.query.users.findFirst({ where: ..., columns: { creditBalance: true } })`.

---

## Recommended Plan Structure

Based on the complexity and dependency analysis, Phase 51 should have **two plans** (not three):

**Plan 51-01: Upgrade Dialog + Stepper Lock Badges**
- Handle `paywallRequired` return in `step-navigation.tsx`
- Build `UpgradeDialog` client component (shadcn Dialog)
- Add `isPaywallLocked` prop + lock badges to `WorkshopSidebar` and `MobileStepper`
- Compute `isPaywallLocked` in workshop layout and pass to sidebar/stepper
- Covers: PAYW-02, PAYW-03 (partially — no Stripe redirect yet)

**Plan 51-02: Return-to-Workshop Flow + Dashboard Credit Badge**
- Extend checkout route to accept `workshop_return_url` hidden field
- Update success page to redirect to `return_to` after fulfillment
- Update upgrade dialog and PaywallOverlay "Buy Credits" to include `workshop_return_url`
- Add `creditBalance` to `DashboardLayout` query and pass to `DashboardHeader`
- Add credit badge to `DashboardHeader`
- Covers: PAYW-03 (Stripe CTA), PAYW-04, CRED-01

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/actions/workshop-actions.ts` — `advanceToNextStep()` return type, `paywallRequired` discriminated union
- Codebase: `src/components/workshop/step-navigation.tsx` — existing `handleNext()` pattern, NEXT_REDIRECT re-throw
- Codebase: `src/components/workshop/paywall-overlay.tsx` — `consumeCredit()` + `router.refresh()` pattern
- Codebase: `src/actions/billing-actions.ts` — `consumeCredit()` result types, `getCredits()`
- Codebase: `src/app/api/billing/checkout/route.ts` — form data parsing, 303 redirect, success_url format
- Codebase: `src/app/purchase/success/page.tsx` — dual-trigger fulfillment, `result.status` branching
- Codebase: `src/components/layout/workshop-sidebar.tsx` — step rendering, props interface, existing lock/disabled patterns
- Codebase: `src/components/layout/mobile-stepper.tsx` — step rendering, same patterns as sidebar
- Codebase: `src/app/workshop/[sessionId]/layout.tsx` — data fetching, props to sidebar/stepper
- Codebase: `src/components/dashboard/dashboard-header.tsx` — current structure, props interface
- Codebase: `src/app/dashboard/layout.tsx` + `page.tsx` — existing user query, component composition
- Codebase: `src/components/ui/dialog.tsx` — shadcn Dialog API (controlled/uncontrolled)
- Codebase: `.planning/phases/50-credit-actions-server-enforcement/50-02-SUMMARY.md` — Phase 51 design intent: "Phase 51 calls consumeCredit() then advanceToNextStep() again"
- Codebase: `.planning/REQUIREMENTS.md` — PAYW-02, PAYW-03, PAYW-04, CRED-01 requirements

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed; no new dependencies
- Architecture: HIGH — patterns verified directly from Phase 50 codebase and Phase 50 design docs
- Pitfalls: HIGH — three of five pitfalls are directly observable in the current code (NEXT_REDIRECT handling, paywallRequired return, layout query)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable — Next.js 16, shadcn Dialog, Stripe Checkout patterns are stable)

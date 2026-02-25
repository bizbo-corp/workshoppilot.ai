# Phase 50: Credit Actions and Server-Side Enforcement - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Steps 1-6 are unconditionally free for any authenticated user. Advancement past Step 6 atomically consumes one credit server-side. The server rejects step access for workshops without a consumed credit regardless of what the client sends. This phase delivers `billing-actions.ts` server actions, the Step 6→7 credit gate in `advanceToNextStep()`, and server-side credit checks for Step 7-10 Server Components.

</domain>

<decisions>
## Implementation Decisions

### Paywall Trigger UX
- Explicit confirmation dialog before consuming a credit — "This will use 1 credit to continue" with a Confirm button
- Zero-credit users see a modal overlay with pricing info and Buy Credits CTA
- Two separate components: lightweight confirm dialog (has credits) and richer paywall modal (no credits)
- After credit consumed: brief success state (~1 second checkmark/"Credit used!") in dialog, then auto-advance to Step 7

### Blocked Access Experience (Direct URL to Step 7+)
- Server renders the step layout but replaces content with an in-place paywall state — URL stays the same
- Steps 7-10 remain visible in the sidebar with lock icons
- Behind the paywall overlay: blurred placeholder/sample ideation content to entice purchase (not real AI output)
- Overlay: centered lock icon + message ("Use a credit to unlock Steps 7-10") + credit balance + primary Buy Credits / Use Credit button

### Credit Feedback
- Credit balance NOT shown persistently in workshop UI — only surfaces at paywall moments (confirmation dialog, paywall modal, blocked access overlay)
- Brief toast notification after successful consumption: "1 credit used — X remaining"
- On consumption failure: keep confirmation dialog open, show error message, offer Retry button
- Dashboard credit balance updates on page load only (no real-time sync)

### Grandfathering
- Cutoff based on migration timestamp (when `creditConsumedAt` column is added), not a hardcoded date
- No visual indicator on grandfathered workshops — they just work normally
- Env var toggle (`PAYWALL_ENABLED=false`) to disable all credit checks for dev/testing/demo

### Claude's Discretion
- Grandfathering for in-progress workshops (only one real user so far — pick simplest correct approach)
- Exact blur intensity and placeholder content design
- Toast notification styling and duration
- Error message copy for failed credit consumption
- Loading states during credit consumption server action

</decisions>

<specifics>
## Specific Ideas

- Blurred content behind paywall should show ideation/visual activities to make it enticing — the blur should hint at what Steps 7-10 deliver
- Two-component approach: a simple `CreditConfirmDialog` for users who have credits, and a full `PaywallModal` for users who need to buy
- The paywall experience should create purchase motivation by showing locked steps are visible but inaccessible

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 50-credit-actions-server-enforcement*
*Context gathered: 2026-02-26*

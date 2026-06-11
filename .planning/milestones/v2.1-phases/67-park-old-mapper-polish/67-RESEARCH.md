# Phase 67: Park Old Mapper + Polish - Research

**Researched:** 2026-06-11
**Domain:** Route de-linking, dismissible banner, E2E pipeline walkthrough
**Confidence:** HIGH — all findings are from direct codebase inspection

## Summary

Phase 67 is a focused surgical change: add a replacement banner to the old Journey Map page, strip primary navigation links that point to it, and walk the full digital-output pipeline end-to-end to catch any remaining UX blockers. No new routes, no schema changes, no functional changes to the old mapper itself.

The old mapper route (`/workshop/[sessionId]/outputs/journey-map/`) is referenced from exactly two primary navigation entry points: the dashboard sidebar (`BUILD_PACK_ITEMS` array in `dashboard-sidebar.tsx`) and the Build Pack card grid (`outputs-content.tsx` SECTIONS definition). Both must redirect to Journey Flow. The sidebar also renders the same href for the active-page highlight, so that must change too. Two secondary entry points exist and require judgment: the Build Pack hub's `handleCardClick`/`getGenerateHandler` functions drive generation and then push to the old route — these need to be repointed to Journey Flow. One entry point is intentionally left: the validation guidance card (`ValidationGuidanceCard.tsx`) already correctly links to Journey Flow only.

The banner itself is a straightforward client component on the old journey-map page — `journey-map-content.tsx` is the right insertion point (it's the client component that wraps the canvas). The session-dismiss pattern is already established in `mobile-gate.tsx` using `sessionStorage`, which is the exact mechanism the CONTEXT.md calls for.

**Primary recommendation:** Three targeted file edits (sidebar, outputs-content card definition, journey-map-content banner) cover PARK-01 and PARK-02. Then manual E2E walkthrough of the full pipeline to identify any remaining blockers.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Replacement banner**
- Full-width strip at the top of the old journey-map page, above the canvas — doesn't block canvas content
- Dismissible per session: X to close, reappears on next visit (no persisted dismissal state)
- Plain + helpful tone: communicates "The UX Journey Mapper has been replaced by Journey Flow. Your work here is preserved." (exact copy in app voice — soul.md tone)
- Banner button opens the Journey Flow editor for this workshop directly (one click to the replacement)

**Polish scope**
- E2E path fixes only: walk the full pipeline (validate card → Journey Flow AI baseline → user edits → mark complete → prototype prompt → copy) and fix only what blocks or jars in that path
- Verification via manual walkthrough human checkpoint — same pattern as Phases 65/66; no new Playwright infra for this phase
- Triage during walkthrough: small fixes (copy, spacing, broken links) land inline in this phase; anything structural is deferred to the backlog
- Old mapper is frozen: banner + de-linking are the ONLY changes to old mapper code — zero functional/behavioral changes

**Claude's Discretion**
- De-linking specifics (user chose not to discuss): which entry points to update and how, within PARK-01 — primary navigation and validation guidance must stop linking to the old mapper, all guidance entry points direct to Journey Flow; the old route itself stays reachable (e.g., direct URL, build pack listings as appropriate)
- Banner component styling details (olive token system, light + dark)
- Session-dismissal mechanism (e.g., sessionStorage)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PARK-01 | Old UX Journey Mapper remains functional at `/workshop/[sessionId]/outputs/journey-map/` but is de-linked from primary navigation/guidance (guidance points to Journey Flow) | Two primary navigation entry points confirmed: `dashboard-sidebar.tsx` BUILD_PACK_ITEMS and `outputs-content.tsx` SECTIONS. Secondary: `handleGenerateJourneyMap` in outputs-content pushes to the old route post-generation — should redirect to Journey Flow instead. ValidationGuidanceCard already correctly links Journey Flow only. |
| PARK-02 | Old mapper displays a notice/banner that it is being replaced by Journey Flow | Banner goes in `journey-map-content.tsx` (client component). Session-dismiss pattern confirmed via `mobile-gate.tsx` using `sessionStorage`. |

</phase_requirements>

---

## Standard Stack

### Core (no new installs needed)
| Library | Purpose | Already In Use |
|---------|---------|----------------|
| React `useState` + `useEffect` | Banner show/hide + sessionStorage hydration | Yes — `journey-map-content.tsx` already uses both |
| `sessionStorage` | Per-session dismiss | Yes — `mobile-gate.tsx` pattern |
| Next.js `Link` | Banner CTA to Journey Flow | Yes — all output pages |
| Tailwind olive token system | Banner styling | Yes — `var(--*)` CSS vars |
| shadcn `Icon` (`x`, `arrow-right`, `info`) | Banner close + CTA icons | Yes — already imported in journey-map-content |

**Installation:** None required. All needed primitives are already in the project.

---

## Architecture Patterns

### Confirmed Entry Points to Old Mapper — Complete List

#### PRIMARY (must be de-linked per PARK-01)

1. **`src/components/layout/dashboard-sidebar.tsx` — line 43**
   ```ts
   BUILD_PACK_ITEMS: [
     ...
     { label: 'UX Journey Map', icon: 'map', href: 'outputs/journey-map' },
     ...
   ]
   ```
   This is the sidebar nav shown on every build-pack page. Change `href` to `outputs/journey-flow`. The `isItemActive` check uses the href to compute the active state — updating the href automatically fixes that.

2. **`src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx` — lines 112-119 (SECTIONS)**
   ```ts
   {
     type: 'journey-map',
     title: 'UX Journey Map',
     description: '...',
     icon: ...,
     generatable: true,
     navigateTo: 'journey-map',
   }
   ```
   The `handleCardClick` function (line 339) uses `navigateTo === 'journey-map'` to push to the old route. Change `navigateTo` to `'journey-flow'`. Also update the button label copy that reads `'Journey Map'` in the ternaries at lines 582, 627, 629.

3. **`src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx` — `handleGenerateJourneyMap` (line 245)**
   After generating, pushes to `outputs/journey-map`. This is the Build Pack "Generate" button for the Journey Map card. Decision required (Claude's discretion): the old card type `journey-map` and its generation flow serve the old mapper. Options:
   - **Option A (recommended):** Change the card's `navigateTo` to `'journey-flow'`, remove the `handleGenerateJourneyMap` handler entirely from the card, and let the card click route directly to Journey Flow (which has its own generate baseline flow). This is cleaner — the Build Pack card just becomes an entry point to Journey Flow.
   - **Option B:** Keep old mapper generation but redirect to Journey Flow after. Messier — still calls old mapper API.
   Option A aligns with "guidance points exclusively to Journey Flow."

#### SECONDARY (judgment call — read below)

4. **`src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx` — `getGenerationStatus` (line 321), `getGenerateHandler` (line 330)**
   These are driven by the card type `'journey-map'`. If Option A above is taken (change card type or remove old generation), these handlers become dead code for the journey-map card and can be left in place or removed. They don't surface any UI independently.

5. **`src/app/(dashboard)/workshop/[sessionId]/outputs/page.tsx` — line 31**
   ```ts
   if (title.startsWith('Journey Map:')) return 'journey-map';
   ```
   This classifies existing `build_pack` rows with title `"Journey Map:*"` so the Build Pack hub shows them as generated. This is a **passive reader** — it identifies existing old-mapper rows in the DB. Leaving this in place means existing workshops that generated an old journey map will still show that card as "generated" in the hub. That is intentional: the old data is preserved. Do not change.

#### NOT APPLICABLE (already correct)

6. **`src/components/workshop/validate/ValidationGuidanceCard.tsx` — line 84**
   Already links to `/outputs/journey-flow?from=validate`. No change needed.

7. **AI prompts, chat-config, step-metadata** — all `journey-mapping` references are Step 6 canvas step identifiers (the workshop facilitation step), not the output route. Do not change.

8. **`src/components/journey-mapper/journey-mapper-toolbar.tsx`** — back link goes to `/workshop/${sessionId}/outputs` (Build Pack hub), not a hardcoded old-mapper link. No change needed.

### Pattern 1: Session-Dismissible Banner (from mobile-gate.tsx)
**What:** Client component with `useState(false)`, reads `sessionStorage` in `useEffect` to prevent hydration mismatch, writes on dismiss.
**When to use:** Any banner that should reappear on next visit/tab but not re-flash after user closes it.

```typescript
// Source: src/components/workshop/mobile-gate.tsx (established pattern)
const SESSION_KEY = 'wp_journey_map_deprecated_dismissed';

const [dismissed, setDismissed] = useState(false);

useEffect(() => {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setDismissed(true);
  } catch {
    // sessionStorage unavailable — show banner
  }
}, []);

function dismiss() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch { /* degraded: dismiss visually only */ }
  setDismissed(true);
}
```

**Placement in `journey-map-content.tsx`:** Banner renders at the TOP of the `JourneyMapContent` `div.h-full.w-full.relative`, before the `JourneyMapperStoreProvider`. It's a narrow full-width strip, not inside the canvas. When dismissed, it simply doesn't render (no animation needed unless desired).

### Pattern 2: Banner Copy (soul.md voice)
Banner copy must be plain + helpful, direct, no corporate speak:

> **The UX Journey Mapper has been replaced by Journey Flow.** Your work here is preserved.
> [Open Journey Flow →]

The CTA is a Next.js `Link` to `/workshop/${sessionId}/outputs/journey-flow`. The banner does NOT need to know `sessionId` from scratch — `journey-map-content.tsx` already receives `sessionId` as a prop.

### Pattern 3: Olive Banner Styling
Full-width strip at top of page, doesn't intrude on canvas. Suggested treatment (olive tokens, light + dark safe):

```tsx
<div className="flex items-center gap-3 border-b border-border bg-muted/60 px-4 py-2.5 text-sm">
  <Icon name="info" className="h-4 w-4 shrink-0 text-muted-foreground" />
  <span className="flex-1 text-foreground/80">
    <span className="font-semibold text-foreground">The UX Journey Mapper has been replaced by Journey Flow.</span>
    {' '}Your work here is preserved.
  </span>
  <Link href={`/workshop/${sessionId}/outputs/journey-flow`} className="...">
    Open Journey Flow <Icon name="arrow-right" ... />
  </Link>
  <button onClick={dismiss} aria-label="Dismiss">
    <Icon name="x" className="h-4 w-4 text-muted-foreground hover:text-foreground" />
  </button>
</div>
```

Exact Tailwind class choices are Claude's discretion (olive system). Reference: `bg-muted`, `border-border`, `text-foreground`, `text-muted-foreground` — all use CSS vars, light/dark safe.

### Pattern 4: E2E Pipeline Walkthrough Scope
The full digital-output pipeline to verify:
1. **Validate step** → `ValidationGuidanceCard` (digital type) → "Open Journey Flow" button → `/outputs/journey-flow?from=validate`
2. **Journey Flow** → AI baseline generated (scope chooser → generate) → user edits a node → "Mark complete" button → `isApproved = true`
3. **Journey Flow toolbar** → prototype link active (enabled after `journeyFlowApproved`) → `/outputs/prototype-prompt?from=validate`
4. **Prototype Prompt page** → generate prompt → copy to clipboard
5. **Back-link** → returns to Validation Plan (`/step/validate`)

Also verify: the Build Pack hub (`/outputs`) Journey Flow card navigates to Journey Flow (not the old mapper).

### Anti-Patterns to Avoid
- **Don't touch old mapper API routes** (`/api/build-pack/save-journey-map`, `generate-journey-map`, `delete-journey-map`). They remain functional for existing data.
- **Don't remove the journey-map page.tsx / journey-map-content.tsx files**. Route stays live.
- **Don't animate the banner** unless trivially simple — mobile-gate uses AnimatePresence but that's a full-screen overlay. A top-strip banner doesn't need it.
- **Don't use `localStorage` for banner dismiss** — the decision is sessionStorage (reappears on next visit). mobile-gate.tsx is the precedent.
- **Don't change the `type: 'journey-map'` classification in `outputs/page.tsx`** — it's needed to detect existing Journey Map: build_pack rows for display. Only the `navigateTo` in SECTIONS needs to change (or be eliminated).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session-scoped banner dismiss | Custom hook or context | `sessionStorage` directly in component | Same as mobile-gate.tsx — two-liner, proven, no dep |
| CTA link | Custom router.push | `<Link href=...>` | Next.js Link handles prefetch, active state |
| Banner icon | SVG inline | `<Icon name="info">` / `<Icon name="x">` | Already registered in icon.tsx |

---

## Common Pitfalls

### Pitfall 1: Hydration Mismatch on Banner
**What goes wrong:** Reading `sessionStorage` during render causes hydration mismatch (server renders banner visible, client reads dismissed state).
**Why it happens:** `sessionStorage` is browser-only; server doesn't have it.
**How to avoid:** Initialize state as `false` (banner not dismissed), read sessionStorage only inside `useEffect`. Established precedent: mobile-gate.tsx line 33-41.
**Warning signs:** React "text content did not match" error in console.

### Pitfall 2: Forgetting the isItemActive check in sidebar
**What goes wrong:** After changing `href` from `outputs/journey-map` to `outputs/journey-flow` in BUILD_PACK_ITEMS, the old `isItemActive` check still works correctly because it derives from the href itself — no extra change needed. But if you forget to update the href and only update the label, the active-state highlight will still point to the old route when user is on journey-map.
**How to avoid:** Change the href in BUILD_PACK_ITEMS — that's the only change needed in sidebar.tsx.

### Pitfall 3: outputs-content.tsx has multiple journey-map string references
**What goes wrong:** Changing only `navigateTo` but missing the ternary label strings at lines 582, 627, 629 leaves "Journey Map" label strings orphaned (they don't break but are stale).
**How to avoid:** Search for `journey-map` in outputs-content.tsx and update all user-visible label strings too.

### Pitfall 4: Old mapper generate still pushes to old route after card navigateTo update
**What goes wrong:** If the Build Pack card is updated to link to Journey Flow but `handleGenerateJourneyMap` still calls the old API and pushes to `outputs/journey-map`, clicking "Generate" on the Build Pack hub will generate an old-mapper map and redirect to the old mapper (no banner needed because the card is delinked, but still confusing).
**How to avoid:** Use Option A — change the `navigateTo` to `'journey-flow'` and remove the generate handler from this card. The Build Pack card click goes directly to Journey Flow.

### Pitfall 5: E2E walkthrough on a workshop with no concept data
**What goes wrong:** Journey Flow AI baseline generation requires concept data (Step 9 completion). Testing on a blank or incomplete workshop will show empty states, not the real flow.
**How to avoid:** Use a seeded workshop (`npm run db:seed:workshop`) or a real workshop that completed Step 9.

---

## Code Examples

### Banner Component Integration in journey-map-content.tsx
```typescript
// Source: src/components/workshop/mobile-gate.tsx pattern applied to banner

'use client'; // already present

// Add to JourneyMapContent (the exported wrapper, not JourneyMapInner)
// or as a self-contained sub-component:

const BANNER_SESSION_KEY = 'wp_journey_map_parked_dismissed';

function JourneyMapParkedBanner({ sessionId }: { sessionId: string }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(BANNER_SESSION_KEY) === '1') setDismissed(true);
    } catch { /* unavailable */ }
  }, []);

  function dismiss() {
    try { sessionStorage.setItem(BANNER_SESSION_KEY, '1'); } catch { /* degraded */ }
    setDismissed(false);
  }

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-border bg-muted/60 px-4 py-2.5 text-sm">
      <Icon name="info" className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-foreground/80">
        <span className="font-semibold text-foreground">
          The UX Journey Mapper has been replaced by Journey Flow.
        </span>{' '}
        Your work here is preserved.
      </span>
      <Link
        href={`/workshop/${sessionId}/outputs/journey-flow`}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:underline"
      >
        Open Journey Flow
        <Icon name="arrow-right" className="h-3 w-3" />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Icon name="x" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
```

Place `<JourneyMapParkedBanner sessionId={sessionId} />` at the top of the `JourneyMapContent` return, before the `JourneyMapperStoreProvider`.

### Sidebar BUILD_PACK_ITEMS Change
```typescript
// src/components/layout/dashboard-sidebar.tsx — line 43
// Before:
{ label: 'UX Journey Map', icon: 'map', href: 'outputs/journey-map' },
// After:
{ label: 'Journey Flow', icon: 'workflow', href: 'outputs/journey-flow' },
// Note: 'workflow' icon is registered in icon.tsx (Phase 63 confirmed it)
```

### Build Pack SECTIONS Card Change
```typescript
// src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx
// Before (lines 112-119):
{
  type: 'journey-map',
  title: 'UX Journey Map',
  description: 'Interactive roadmap mapping your concepts...',
  icon: <Icon name="map" className="h-5 w-5" />,
  generatable: true,
  navigateTo: 'journey-map',
},
// After:
{
  type: 'journey-flow',        // updated type
  title: 'Journey Flow',
  description: 'AI-generated user journey flow for your digital product — edit the screens, mark it complete, then build a prototype.',
  icon: <Icon name="workflow" className="h-5 w-5" />,
  generatable: false,          // Journey Flow generates its own baseline on entry
  navigateTo: 'journey-flow',
},
```

---

## Files to Change — Summary Table

| File | Change | Requirement |
|------|--------|-------------|
| `src/components/layout/dashboard-sidebar.tsx` | Change BUILD_PACK_ITEMS entry: `href: 'outputs/journey-flow'`, label: `'Journey Flow'` | PARK-01 |
| `src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx` | Update SECTIONS card: type/title/icon/navigateTo → journey-flow; remove `handleGenerateJourneyMap` from card dispatch; update label ternaries | PARK-01 |
| `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-map/journey-map-content.tsx` | Add `JourneyMapParkedBanner` component (sessionStorage-dismissed, links to journey-flow) rendered above the store provider | PARK-02 |

**Files NOT to touch:**
- `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-map/page.tsx` — no change
- `src/app/(dashboard)/workshop/[sessionId]/outputs/page.tsx` line 31 — `'Journey Map:'` classifier stays
- All `src/lib/journey-mapper/` — frozen
- All `src/app/api/build-pack/*journey-map*` routes — frozen
- `src/components/workshop/validate/ValidationGuidanceCard.tsx` — already correct

---

## Open Questions

1. **Should the Build Pack hub still show the Journey Map card for workshops that already generated one?**
   - What we know: `outputs/page.tsx` line 31 classifies existing `build_pack` rows with `Journey Map:` title as type `'journey-map'`. The SECTIONS definition controls whether the card renders and what it links to.
   - What's unclear: If we change the card type from `'journey-map'` to `'journey-flow'`, the existing generated row won't be classified as `'done'` anymore (no matching type in SECTIONS) — the hub would lose the "generated" visual state for those old workshops.
   - Recommendation: Keep the SECTIONS card type as `'journey-map'` for existing-data compatibility. Change only `navigateTo` to `'journey-flow'` (so the "View" button goes to Journey Flow, not the old mapper). This preserves the "generated" indicator for old workshops while de-linking the navigation. The `page.tsx` classifier continues to work. Note: This means clicking "View Journey Map" in the hub takes users to Journey Flow, which may be empty if they never ran the new flow — acceptable because Journey Flow has its own empty state with a generate option.

2. **Icon name for Journey Flow in sidebar?**
   - What we know: `'workflow'` is registered in `icon.tsx` and was used in Phase 63 (confirmed in STATE.md decision about spinner/loader-circle alias). `'map'` was the old mapper's icon.
   - Recommendation: Use `'workflow'` for Journey Flow in the sidebar to distinguish it from the old mapper.

---

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` — section skipped. Verification per CONTEXT.md: automated gates (tsc/lint/build) + manual E2E walkthrough human checkpoint. No new Playwright specs.

**Quick verification commands:**
```bash
npx tsc --noEmit
npm run lint
npm run build
```

**Manual walkthrough checklist (human checkpoint):**
- [ ] Old mapper (`/outputs/journey-map`) loads without errors, banner appears at top
- [ ] Banner "Open Journey Flow" navigates to `/outputs/journey-flow`
- [ ] Banner X button dismisses banner; new tab re-shows it
- [ ] Dashboard sidebar "Journey Flow" link navigates to `/outputs/journey-flow`
- [ ] Build Pack hub card "View" button navigates to Journey Flow (not old mapper)
- [ ] Validate step → guidance card → "Open Journey Flow" → journey flow loads
- [ ] Journey Flow: AI baseline generation works, node edits save, "Mark complete" works
- [ ] Prototype prompt page loads after Journey Flow marked complete, prompt generates, copy works
- [ ] Back-links at each step return to correct parent (Validation Plan / Build Pack)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all file paths and line numbers are exact
- `src/components/workshop/mobile-gate.tsx` — sessionStorage dismiss pattern
- `src/components/layout/dashboard-sidebar.tsx` — sidebar nav
- `src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx` — Build Pack card grid
- `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-map/journey-map-content.tsx` — old mapper client component
- `src/components/workshop/validate/ValidationGuidanceCard.tsx` — validation guidance (already correct)
- `.planning/phases/67-park-old-mapper-polish/67-CONTEXT.md` — locked user decisions

---

## Metadata

**Confidence breakdown:**
- Entry points audit: HIGH — grep-verified, every `outputs/journey-map` href found and classified
- Banner implementation: HIGH — exact pattern from mobile-gate.tsx
- E2E pipeline: HIGH — all route files inspected, flow confirmed
- Open question 1 (card type): MEDIUM — recommendation is defensible but user may prefer different trade-off

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (stable codebase, low churn area)

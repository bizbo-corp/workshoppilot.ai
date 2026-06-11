---
phase: 66-low-fi-prototype-prompt
plan: 02
subsystem: ui
tags: [react, nextjs, sonner, shadcn, clipboard, journey-flow, prototype-prompt, radix-dialog]

# Dependency graph
requires:
  - phase: 66-01
    provides: StoredPrototypePrompt interface, /api/build-pack/generate-prototype-prompt POST route, low-fi-prototype-prompt.ts module
  - phase: 65-validation-guidance-wiring
    provides: /outputs/prototype-prompt route scaffold, ?from=validate param convention
  - phase: 63-journey-flow-editor-core
    provides: JourneyFlowState type, Journey Flow build_pack row pattern
provides:
  - PrototypePromptContent client component (fidelity switch, generate, preview, copy, help dialog)
  - page.tsx server component with Journey Flow + Prototype Prompt row loading, staleness computation, redirect guard
affects:
  - phase-66-03: parking old mapper (references this page as the canonical prompt builder route)
  - any future hi-fi path: fidelity switch stub is in place

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component loads build_pack rows with like() title prefix queries; client component receives typed props
    - Staleness detection via ISO timestamp comparison (generatedFromFlowUpdatedAt vs flowRow.updatedAt)
    - resolveClerkParticipant isReadOnly pattern (matches journey-flow/page.tsx)

key-files:
  created:
    - src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/prototype-prompt-content.tsx
  modified:
    - src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx

key-decisions:
  - "High-fidelity option rendered as <span aria-disabled> not a button — zero interaction, not-allowed cursor, Coming later badge"
  - "isStale recomputed on client from generatedFromFlowUpdatedAt vs flowUpdatedAt to catch mid-session flow changes"
  - "Non-stale regenerate button shown in preview footer (owner only) so users can refresh deliberately"
  - "Expanded state resets on promptText change via useEffect keyed on promptText"

patterns-established:
  - "Prototype prompt page pattern: server loads rows + computes staleness, client handles generation/copy/expand/help"

requirements-completed: [PROMPT-01, PROMPT-03, PROMPT-05]

# Metrics
duration: 8min
completed: 2026-06-11
---

# Phase 66 Plan 02: Prototype Prompt Builder UI Summary

**Fidelity-switch prototype prompt builder with on-demand Gemini generation, collapsed preview, full-text copy + Sonner toast, staleness banner, and in-app help dialog for agent-agnostic handoff**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-11T06:23:03Z
- **Completed:** 2026-06-11T06:31:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Reworked page.tsx from placeholder to production server component: loads Journey Flow + Prototype Prompt build_pack rows via `like()` title prefix queries, guards redirect to journey-flow when no flow nodes, computes `isStale` via ISO timestamp comparison, passes typed props to client component
- Created PrototypePromptContent: segmented fidelity switch (low active, hi-fi "Coming later" badge + not-allowed cursor + zero interaction), on-demand generation with loading state, persisted prompt with collapsed 10-line preview + expand control, full-text copy with button morph + Sonner toast, stale notice + Regenerate button, feature-mode scope label, in-app help dialog (3-step how-to + v0/Claude/Codex/Replit links), read-only handling, no v0-specific dependencies

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: page.tsx server component + PrototypePromptContent client component** - `f81e4ef` (feat)

## Files Created/Modified
- `src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx` — Server component: auth, row loading, staleness computation, redirect guard, PrototypePromptContent render
- `src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/prototype-prompt-content.tsx` — Client component: fidelity switch, generate/regenerate, preview, copy UX, help dialog

## Decisions Made
- Hi-fi option uses `<span aria-disabled>` not a button — ensures truly zero interaction; matches plan locked decision
- `isStale` recomputed on client from `generatedFromFlowUpdatedAt !== flowUpdatedAt` to catch mid-session flow changes not visible at page load time
- Non-stale regenerate button in preview footer (owner only) enables deliberate refresh; separate from stale-banner Regenerate
- `useEffect` keyed on `promptText` ensures `expanded` resets even if the parent already set it in `handleGenerate`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Pre-existing lint errors in unrelated files (journey-mapper-store-provider.tsx etc.) — out of scope, not touched.

## Next Phase Readiness
- Prototype prompt builder is complete and navigable from the validate guidance card gated link
- Phase 66 Plan 03: park the old Journey Mapper (phase 67 scope also references this route as canonical)

---
*Phase: 66-low-fi-prototype-prompt*
*Completed: 2026-06-11*

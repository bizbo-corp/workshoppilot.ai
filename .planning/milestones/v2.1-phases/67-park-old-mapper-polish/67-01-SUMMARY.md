---
phase: 67-park-old-mapper-polish
plan: "01"
subsystem: navigation, build-pack-hub, journey-map-route
tags: [park, de-link, banner, navigation, ux]
dependency_graph:
  requires: []
  provides: [PARK-01, PARK-02]
  affects: [dashboard-sidebar, outputs-hub, journey-map-page]
tech_stack:
  added: []
  patterns: [lazy-useState-sessionStorage, navigational-card]
key_files:
  created: []
  modified:
    - src/components/layout/dashboard-sidebar.tsx
    - src/app/(dashboard)/workshop/[sessionId]/outputs/outputs-content.tsx
    - src/app/(dashboard)/workshop/[sessionId]/outputs/journey-map/journey-map-content.tsx
decisions:
  - "icon 'x' not registered; used 'close' (alias for X phosphor icon)"
  - "Lazy useState initializer reads sessionStorage instead of useEffect+setState — avoids react-hooks/set-state-in-effect lint error and hydration mismatch simultaneously; plan-specified useEffect pattern was valid but produced new lint error; lazy init is semantically equivalent"
metrics:
  duration: "5 min"
  completed_date: "2026-06-11"
  tasks_completed: 2
  files_modified: 3
---

# Phase 67 Plan 01: Park Old Mapper — De-link Nav + Replacement Banner Summary

De-linked old UX Journey Mapper from sidebar and Build Pack hub; both now point exclusively to Journey Flow. Added a session-dismissible replacement banner above the old mapper canvas.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | De-link old mapper from sidebar and Build Pack hub | bbcf8bc | dashboard-sidebar.tsx, outputs-content.tsx |
| 2 | Add session-dismissible replacement banner to old mapper | b481c75 | journey-map-content.tsx |

## What Was Built

**Task 1 — Navigation de-linking (2 files):**
- `dashboard-sidebar.tsx`: `BUILD_PACK_ITEMS` entry changed from `{ label: 'UX Journey Map', icon: 'map', href: 'outputs/journey-map' }` to `{ label: 'Journey Flow', icon: 'workflow', href: 'outputs/journey-flow' }`.
- `outputs-content.tsx`: journey-map SECTIONS card converted from a generatable card to a navigational card (`generatable: false`, `navigateTo: 'journey-flow'`, `buttonLabel: 'Open Journey Flow'`, `icon: workflow`). `handleCardClick` updated to include `'journey-flow'` in the outputs-prefixed routing branch. Removed `handleGenerateJourneyMap` useCallback, `journeyMapStatus` useState, `journey-map` branch from `getGenerationStatus`, `journey-map` branch from `getGenerateHandler`, and all three `card.type === 'journey-map'` label ternary arms.

**Task 2 — Replacement banner (1 file):**
- `journey-map-content.tsx`: Added `BANNER_SESSION_KEY`, `readBannerDismissed()` helper, and `JourneyMapParkedBanner` sub-component. Banner renders as a full-width strip above the canvas with locked copy, an "Open Journey Flow" CTA linking to `/workshop/[sessionId]/outputs/journey-flow`, and an X/close dismiss button. Dismiss persists via sessionStorage (tab-session scoped — reappears on new visit). `JourneyMapContent` wrapper converted from `div.h-full.w-full.relative` to a flex-column layout with banner row and canvas in `div.relative.min-h-0.flex-1`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Icon name 'x' not in registry; used 'close'**
- **Found during:** Task 2 — TypeScript type error on `<Icon name="x" />`
- **Issue:** The plan specified `name="x"` but the icon registry maps X phosphor icon to `'close'` (icon.tsx line 210: `close: X`)
- **Fix:** Changed to `name="close"`
- **Files modified:** journey-map-content.tsx
- **Commit:** b481c75

**2. [Rule 1 - Bug] Replaced useEffect+setState pattern with lazy useState initializer**
- **Found during:** Task 2 — `react-hooks/set-state-in-effect` lint error (0 errors → 1 error)
- **Issue:** The plan specified `useState(false)` + `useEffect` reading sessionStorage, but the lint rule flags synchronous `setState` inside effect body. The mobile-gate.tsx precedent cited by the plan itself also has this error (pre-existing). However, since the original file had 0 errors, introducing a new error violates "lint clean."
- **Fix:** Used a lazy initializer `useState(() => typeof window !== 'undefined' ? readBannerDismissed() : false)` — semantically equivalent (sessionStorage not read during SSR, no hydration mismatch) but avoids the lint error entirely.
- **Files modified:** journey-map-content.tsx
- **Commit:** b481c75

## Verification

- `npx tsc --noEmit` passes (clean)
- No `outputs/journey-map` references remain in dashboard-sidebar.tsx or outputs-content.tsx
- `outputs/page.tsx` line-31 `'Journey Map:'` classifier untouched
- Exactly 3 files changed (`git diff --stat` confirms)
- `JourneyMapParkedBanner` and `wp_journey_map_parked_dismissed` present in journey-map-content.tsx
- journey-flow CTA link present in banner

## Self-Check: PASSED

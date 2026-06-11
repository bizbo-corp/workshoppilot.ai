---
phase: 64-ai-baseline-generation
plan: "03"
subsystem: journey-flow-ui
tags: [journey-flow, ui-components, scope-chooser, generation, annotation-nodes]
dependency_graph:
  requires: ["64-01"]
  provides: ["ScopeChooser component", "Toolbar regenerate + archetype badge", "Annotation node render variant"]
  affects: ["64-04 (wires ScopeChooser and Regenerate into canvas)"]
tech_stack:
  added: []
  patterns: ["olive token system", "aria-checked radio semantics", "optional-prop backwards compat"]
key_files:
  created:
    - src/components/journey-flow/scope-chooser.tsx
  modified:
    - src/components/journey-flow/journey-flow-toolbar.tsx
    - src/components/journey-flow/journey-flow-node-card.tsx
decisions:
  - "Used 'workflow' icon for ScopeChooser header (already registered); 'map' for whole-journey option; 'target' for single-feature option; 'sparkles' for CTA — all existed in icon registry, no new registrations needed"
  - "Toolbar Regenerate button placed BEFORE Mark complete (per plan spec) using 'refresh' (ArrowsClockwise) icon"
  - "Archetype badge rendered after action buttons (not before divider) so it reads as metadata, not an action"
  - "Annotation node early-returns before screen-card branch — clean separation, no nested conditionals"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 64 Plan 03: UI Components — ScopeChooser, Toolbar Regenerate, Annotation Nodes Summary

**One-liner:** Scope-chooser entry state (two-option radio + concept picker + CTA), toolbar Regenerate button with archetype badge, and annotation-node dashed render variant — all pure presentational against 64-01 type contracts.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | ScopeChooser component | e44404c | src/components/journey-flow/scope-chooser.tsx (created) |
| 2 | Toolbar Regenerate + archetype badge; annotation node variant | 0c84234 | journey-flow-toolbar.tsx, journey-flow-node-card.tsx |

## What Was Built

### ScopeChooser (`src/components/journey-flow/scope-chooser.tsx`)

Full-height centered entry state (max-w-2xl) that replaces the Phase 63 empty state when the flow has no nodes. Key behaviors:

- Workflow icon in `bg-primary/10` circle header with `Heading level={2}` title
- Two `role="radio" aria-checked` option cards in a responsive grid — "Test the whole journey" (`map` icon) and "Test a single feature" (`target` icon)
- Single-feature card is `disabled` + `aria-disabled` + opacity-reduced when `concepts.length === 0`, with inline hint about Step 9
- Feature-mode concept picker revealed below cards: vertical list of `role="radio"` rows with concept name + clamped elevator pitch
- CTA "Generate baseline flow" (`sparkles` icon) disabled until valid scope + concept selection; loading state shows spinner + "Generating your flow…"
- "Or start from scratch with a blank canvas" text button escape hatch below CTA
- No store access, no fetches — pure props interface; wiring lands in 64-04

### Toolbar extensions (`src/components/journey-flow/journey-flow-toolbar.tsx`)

Three new optional props (fully backwards-compatible — Phase 63 `JourneyFlowCanvas` passes only the original 5):

- `onRegenerate?: () => void` — when set and `!isReadOnly`, renders an outline `Button` (h-7 text-xs) labeled "Regenerate" with `refresh` icon
- `isGenerating?: boolean` — disables Regenerate and swaps icon for `spinner` + `animate-spin`
- `archetype?: FlowArchetype` — renders a `bg-muted text-muted-foreground rounded-full` badge with `ARCHETYPE_LABELS[archetype]`

Regenerate button is placed before the Mark complete button, archetype badge after all action buttons.

### Annotation node variant (`src/components/journey-flow/journey-flow-node-card.tsx`)

Early-return branch on `data.isAnnotation`:

- `w-[300px] rounded-lg border border-dashed bg-muted/60` — visually unmistakable as a note, not a screen card
- No left accent border, no UI-type badge, no `Handle` elements, no directional (+) add buttons, no `onOpenDetail` click handler
- Header row: `info` icon + `data.name` in `text-xs font-semibold uppercase tracking-wide text-muted-foreground`
- `data.purpose` rendered in full (not line-clamped) — the AI's explanation text must be readable
- `ring-2 ring-selection` on `selected` — user can still select and delete these nodes

## Deviations from Plan

None — plan executed exactly as written.

## Verification

```
npx tsc --noEmit                          # clean
grep -n 'role="radio"' scope-chooser.tsx  # lines 52, 178 — explicit radio semantics
grep -nE "gray-|blue-|bg-white|amber-|yellow-" *.tsx  # returns nothing
```

## Self-Check: PASSED

All 3 files exist on disk. Both commits (e44404c, 0c84234) confirmed in git log.

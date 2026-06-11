---
phase: 32-workshop-management
plan: 02
subsystem: workshop-management
tags: [dashboard-ui, selection, deletion, confirmation-dialog]
dependency-graph:
  requires: [soft-delete-infrastructure, workshop-grid-layout]
  provides: [workshop-deletion-ui]
  affects: [dashboard-page, workshop-card]
tech-stack:
  added: [shadcn-checkbox, shadcn-alert-dialog]
  patterns: [client-component-state, selection-management, confirmation-dialogs]
key-files:
  created:
    - src/components/dashboard/workshop-grid.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/alert-dialog.tsx
  modified:
    - src/components/dashboard/workshop-card.tsx
    - src/app/dashboard/page.tsx
decisions:
  - "WorkshopGrid as client component managing selection state (server page passes data)"
  - "Select-all checkbox toggles entire selection state"
  - "Delete button only appears when workshops selected, shows count"
  - "Checkbox overlay positioned absolute in card top-right corner (z-10)"
  - "Ring highlight (ring-2 ring-primary) for selected cards"
  - "AlertDialog controlled state prevents double-submission during pending"
metrics:
  duration: 111
  tasks_completed: 2
  files_modified: 5
  commits: 2
  completed_at: "2026-02-12T20:30:17Z"
---

# Phase 32 Plan 02: Dashboard Selection and Deletion UI Summary

**One-liner:** Client-side workshop grid with checkbox selection, select-all toggle, delete button with confirmation dialog, and ring highlight for selected cards.

## Objective

Build the dashboard selection and deletion UI: install shadcn checkbox and alert-dialog components, create a client-side WorkshopGrid component that manages selection state, add checkboxes to workshop cards, and wire the delete flow with confirmation dialog.

## What Was Built

### Task 1: Install shadcn components and create WorkshopGrid with selection + delete

**Files created:** `src/components/ui/checkbox.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/dashboard/workshop-grid.tsx`

**Files modified:** `src/components/dashboard/workshop-card.tsx`

**Shadcn components:**
- Installed `checkbox` component via `npx shadcn@latest add checkbox --yes`
- Installed `alert-dialog` component via `npx shadcn@latest add alert-dialog --yes`

**WorkshopGrid component:**
Created a new client component (`src/components/dashboard/workshop-grid.tsx`) that:
- Manages selection state using `useState<Set<string>>`
- Tracks pending deletion state with `useTransition`
- Renders header with "All Workshops" title, select-all checkbox, and conditional delete button
- Shows delete button only when workshops are selected, displaying count
- Implements AlertDialog for delete confirmation with descriptive warning text
- Calls `deleteWorkshops` server action and clears selection on success
- Renders workshop cards in responsive grid (sm:grid-cols-2 lg:grid-cols-3)
- Passes selection state and toggle handler to each WorkshopCard

**Key implementation details:**
- `allSelected` logic: `selectedIds.size === workshops.length && workshops.length > 0`
- Toggle functions use Set operations (add/delete) for efficient updates
- AlertDialog uses controlled state (`open`/`onOpenChange`) to prevent double-submission
- Delete button shows "Deleting..." text during pending state
- Dialog description adapts for single vs multiple workshop deletion

**WorkshopCard updates:**
Added optional selection mode to WorkshopCard:
- Added `selected?: boolean` and `onSelect?: () => void` props
- Imported `Checkbox` from `@/components/ui/checkbox`
- Imported `cn` from `@/lib/utils`
- Added checkbox overlay positioned absolute in top-right corner (z-10)
- Checkbox click stops propagation to prevent card navigation
- Added conditional ring highlight: `ring-2 ring-primary border-primary` when selected
- Card remains clickable for navigation, title remains editable

**Commit:** `d885da2`

### Task 2: Wire WorkshopGrid into dashboard page

**Files modified:** `src/app/dashboard/page.tsx`

Updated dashboard page to use WorkshopGrid:
- Replaced direct import of `WorkshopCard` with `WorkshopGrid`
- Removed unused `deleteWorkshops` import (WorkshopGrid imports it directly)
- Replaced the "All Workshops" section (h2 + manual grid) with single `<WorkshopGrid>` component
- Mapped workshop data to WorkshopGrid's expected interface
- Passed `renameWorkshop` server action as `onRename` prop

**Before:** Dashboard page rendered workshop cards directly with h2 header and grid div

**After:** Dashboard page delegates to WorkshopGrid, which handles header, selection state, and grid rendering

**Commit:** `16f3c1e`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria met:

- [x] `npx tsc --noEmit` passes with no errors (verified after each task)
- [x] Shadcn checkbox and alert-dialog components installed
- [x] WorkshopGrid created with selection state management
- [x] WorkshopCard has optional checkbox overlay with ring highlight
- [x] Delete button appears only when workshops selected, showing count
- [x] Confirmation dialog warns about permanent action
- [x] Dashboard uses WorkshopGrid component
- [x] All imports cleaned up (unused WorkshopCard and deleteWorkshops removed)

## Technical Notes

**Client-server boundary:**
The WorkshopGrid is a client component that receives workshop data as props from the server component dashboard page. This pattern:
- Keeps data fetching in the server component (optimal for DB queries)
- Enables client-side interactivity for selection state
- Minimizes client-side JavaScript (only interactive components are client)

**Selection state management:**
Using `Set<string>` for selected IDs provides:
- O(1) lookups for `has()` checks
- Efficient add/delete operations
- Easy conversion to array for server action

**Ring highlight accessibility:**
The `ring-2 ring-primary` provides clear visual feedback for selection state, complementing the checkbox. This dual indicator (checkbox + ring) ensures users with various visual preferences can identify selected items.

**Controlled AlertDialog:**
Using controlled state (`open`/`onOpenChange`) instead of relying solely on trigger allows:
- Programmatic dialog dismissal after successful deletion
- Prevention of dialog reopening during pending state
- Better error handling (could show error state in dialog if needed)

**Checkbox positioning:**
The checkbox uses `absolute` positioning with `z-10` to:
- Overlay on top of the card content
- Prevent layout shifts when selection mode is toggled
- Allow click events without triggering card navigation (stopPropagation)

## Impact

**Immediate:**
- Users can select one or more workshops via checkbox on each card
- Select-all checkbox toggles entire selection
- Delete button shows count and opens confirmation dialog
- Dashboard updates immediately after deletion (revalidatePath)
- Card navigation and rename functionality preserved

**User Experience:**
- Safe deletion flow: confirmation dialog prevents accidental deletions
- Clear visual feedback: selected cards have ring highlight
- Efficient bulk operations: select multiple workshops, delete at once
- Responsive design: grid adapts to screen size (2 cols on tablet, 3 on desktop)

**Downstream:**
- Soft-delete infrastructure from Plan 01 now fully utilized
- Workshop management complete for v1.4 milestone
- Foundation for future bulk operations (archive, tag, export)

## Self-Check: PASSED

**Created files:**
- [x] FOUND: src/components/dashboard/workshop-grid.tsx (WorkshopGrid client component)
- [x] FOUND: src/components/ui/checkbox.tsx (shadcn checkbox component)
- [x] FOUND: src/components/ui/alert-dialog.tsx (shadcn alert-dialog component)

**Modified files:**
- [x] FOUND: src/components/dashboard/workshop-card.tsx (selection props and checkbox overlay)
- [x] FOUND: src/app/dashboard/page.tsx (uses WorkshopGrid instead of direct cards)

**Commits:**
- [x] FOUND: d885da2 (Task 1: shadcn components + WorkshopGrid + WorkshopCard updates)
- [x] FOUND: 16f3c1e (Task 2: dashboard page integration)

All artifacts verified present and correct.

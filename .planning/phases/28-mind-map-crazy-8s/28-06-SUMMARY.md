---
phase: 28-mind-map-crazy-8s
plan: 06
subsystem: ui
tags: [react, step-8, ideation, mind-map, crazy-8s, idea-selection, ai-prompts, schemas]

# Dependency graph
requires:
  - phase: 28-03
    provides: MindMapCanvas component and mind map state management
  - phase: 28-05
    provides: Crazy8sCanvas component and crazy 8s slot state
provides:
  - Updated Step 8 flow: Mind Mapping → Crazy 8s → Idea Selection (Brain Writing removed)
  - Idea selection from Crazy 8s visual sketches instead of text ideas
  - Updated AI prompts for visual-first ideation workflow
  - Updated schemas and metadata reflecting new 3-part structure
affects: [29-visual-concept-cards, step-9-concept-development]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Visual-first ideation: Mind Map and Crazy 8s canvases replace text-only workflow"
    - "Sketch-based selection: IdeaSelection component works with crazy8sSlots from canvas store"
    - "Mind map themes as context: Display level-1 nodes to inform idea selection"
    - "Slot ID tracking: selectedSketchSlotIds replaces selectedIdeaTitles in artifact"
    - "Canvas integration: Step 8 container renders canvases for first two tabs, chat+output for third"

key-files:
  created: []
  modified:
    - src/components/workshop/ideation-sub-step-container.tsx
    - src/components/workshop/idea-selection.tsx
    - src/components/workshop/chat-panel.tsx
    - src/lib/ai/prompts/step-prompts.ts
    - src/lib/ai/prompts/validation-criteria.ts
    - src/lib/schemas/step-schemas.ts
    - src/lib/workshop/step-metadata.ts
    - src/app/api/dev/seed-workshop/fixtures.ts
    - src/components/workshop/ideation-cluster-view.tsx

key-decisions:
  - "Remove Brain Writing: Requires real multi-user collaboration, not viable for solo workshops"
  - "Visual sketches as selection source: Crazy 8s sketches are more tangible than text ideas for evaluation"
  - "Mind map themes as context: Level-1 nodes provide thematic framing for idea selection"
  - "Slot ID tracking: Using slotId instead of idea titles allows re-edit and clearer traceability"
  - "Canvas layout for visual tabs: Mind Mapping and Crazy 8s get full-height canvases, Idea Selection gets chat+output"
  - "idea-selection sub-step type: New sub-step replaces brain-writing in type unions across components"

patterns-established:
  - "Canvas-first sub-steps: Sub-steps can render visual canvases instead of chat+output panels"
  - "Store-backed selection: IdeaSelection component reads from canvas store (crazy8sSlots, mindMapNodes)"
  - "Theme color display: Use themeColor from MindMapNodeState for visual consistency"
  - "Slot-based artifact fields: Store slot IDs in artifact, not derived content"

# Metrics
duration: 558s
completed: 2026-02-12
---

# Phase 28 Plan 06: Step 8 Visual Flow Integration Summary

**Complete transformation of Step 8 from text-only 3-tab flow to visual-first Mind Map + Crazy 8s + Idea Selection. Brain Writing removed, idea selection now sources from visual sketches.**

## Performance

- **Duration:** 9m 18s (558 seconds)
- **Started:** 2026-02-12T06:39:26Z
- **Completed:** 2026-02-12T06:48:44Z
- **Tasks:** 2
- **Files modified:** 9 (all existing files, no new files created)

## Accomplishments

### Task 1: Update ideation container and idea selection for new flow

- Updated `IdeationSubStep` type: replaced `brain-writing` with `idea-selection`
- Updated sub-step labels and icons (CheckCircle2 for Idea Selection)
- Removed `brainWritingEngaged` state, added `ideaSelectionEngaged`
- Changed selection state from `selectedIdeas` (string[]) to `selectedSlotIds` (string[])
- Updated `handleConfirm` to merge `selectedSketchSlotIds` instead of `selectedIdeaTitles`
- Removed `allIdeasFromArtifact` useMemo (extracted Brain Writing ideas)
- Added canvas store imports: `useCanvasStore` from provider
- Read `crazy8sSlots` and `mindMapNodes` from canvas store
- Extract mind map themes (level-1 nodes) for display
- Updated Mind Mapping tab: render `MindMapCanvas` with workshopId, stepId, hmwStatement
- Updated Crazy 8s tab: render `Crazy8sCanvas` with workshopId, stepId
- Updated Idea Selection tab: render `IdeaSelection` with crazy8sSlots, mindMapThemes, selectedSlotIds
- Removed `renderOutputPanel` for Mind Mapping and Crazy 8s tabs (canvas-only layout)
- Updated progress header: "8c: Idea Selection" instead of "8c: Brain Writing"
- Updated tab triggers: removed PenTool, added CheckCircle2
- Updated `ChatPanel` subStep type to match new union

### IdeaSelection Component Rewrite

- Changed props from text-based ideas to visual sketches:
  - `crazy8sSlots: Crazy8sSlot[]` (from canvas store)
  - `mindMapThemes?: MindMapNodeState[]` (level-1 nodes for context)
  - `selectedSlotIds: string[]` (slot IDs instead of idea titles)
  - `onSelectionChange: (slotIds: string[]) => void`
- Removed `userAddedIdeas`, `onAddUserIdea`, `onRemoveUserIdea` props
- Filter to filled slots only (have imageUrl)
- Render each slot as selectable card with:
  - Sketch thumbnail (imageUrl)
  - Slot title or default "Sketch N"
  - Checkbox overlay (blue ring when selected)
  - Disabled state when max selection reached
- Display mind map themes as color-coded tags (read-only context)
- Grid layout: 2 columns mobile, 4 columns desktop
- Selection summary: "Selected N sketch(es) for Step 9"
- Removed "Add Your Own Idea" section (not applicable to sketches)

### Task 2: Update AI prompts, schemas, metadata, and fixtures

**step-prompts.ts:**
- Changed `getIdeationSubStepInstructions` parameter type: `'brain-writing'` → `'idea-selection'`
- Removed entire `'brain-writing'` case (3 rounds of "Yes, and..." building)
- Added `'idea-selection'` case with new conversation flow:
  - Ask which sketches user feels strongest about
  - Help articulate WHY ideas are compelling
  - Encourage diversity (don't pick 4 similar ideas)
  - Confirm final selection
  - Include selection criteria: feasibility, desirability, novelty, alignment
- Updated main `'ideation'` step prompt:
  - Changed description: "3 ideation techniques" → "Mind Mapping and Crazy 8s visual ideation"
  - Updated sub-step list: "8a, 8b, 8c" now maps to "Mind Mapping, Crazy 8s, Idea Selection"
  - Removed "Brain Writing" references
  - Added "Visual thinking unlocks creativity beyond text"
  - Changed boundary statement: "GENERATING and SELECTING" instead of "GENERATING"

**validation-criteria.ts:**
- Removed `'Brain Writing Coherence'` criterion entirely
- Updated `'Sub-Step Order'` criterion:
  - Description: "Mind Mapping → Crazy 8s → Idea Selection"
  - Check prompt: references sketches from Crazy 8s, not Brain Writing ideas
- Removed `'Idea Volume'` criterion (15+ ideas across text-based sub-steps)
- Added `'Visual Ideation'` criterion:
  - Description: "Mind Map and Crazy 8s use visual canvases (not text-only)"
  - Check prompt: validates visual representation via sketches and diagrams

**step-schemas.ts:**
- Updated comment: "Visual ideation with Mind Map and Crazy 8s canvases"
- Removed `source: z.literal('mind-mapping')` from cluster ideas (no longer needed)
- Removed `userIdeas` field entirely (user can add ideas directly on canvas)
- Removed `brainWrittenIdeas` field entirely (array with originalTitle, evolutionDescription, finalVersion, source)
- Added `mindMapThemes` field:
  ```typescript
  z.array(z.object({
    theme: z.string(),
    color: z.string(),
  })).optional().describe('Theme branches from mind map (level-1 nodes)')
  ```
- Updated `crazyEightsIdeas`:
  - Removed `source: z.literal('crazy-eights')` (no longer needed)
  - Updated description: "now backed by sketches"
- Replaced `selectedIdeaTitles` with `selectedSketchSlotIds`:
  ```typescript
  z.array(z.string()).min(1).max(4)
    .describe('Slot IDs of Crazy 8s sketches selected for Step 9 (e.g., ["slot-1", "slot-3"])')
  ```

**step-metadata.ts:**
- Updated Step 8 `description`:
  - Before: "Generate ideas using Mind Mapping, Crazy 8s, Brain Writing, and Billboard Hero"
  - After: "Generate ideas using Mind Mapping and Crazy 8s sketching, then select top ideas"
- Updated Step 8 `greeting`:
  - Before: "Time to get creative! We'll use multiple ideation techniques..."
  - After: "Time to get creative! We'll use Mind Mapping to explore themes, then Crazy 8s to sketch 8 rapid ideas. Finally, you'll select your best concepts to develop further."

**fixtures.ts:**
- Removed `brainWrittenIdeas` array (2 evolved ideas with 3-round enhancements)
- Added `mindMapThemes` array:
  ```typescript
  [
    { theme: 'Smart Routine Engine', color: '#3b82f6' },
    { theme: 'Unified Pet Dashboard', color: '#10b981' },
    { theme: 'Care Delegation', color: '#f59e0b' },
  ]
  ```
- Updated `crazyEightsIdeas`: removed `source: 'crazy-eights'`, updated descriptions to reference sketches
- Replaced `selectedIdeaTitles` with `selectedSketchSlotIds: ['slot-1', 'slot-4', 'slot-7']`
- Updated summary text: removed Brain Writing reference, added "3 sketches selected"

**ideation-cluster-view.tsx:**
- Removed `BrainWrittenIdea` interface
- Added `MindMapTheme` interface
- Updated component comment: removed "brain writing", added "mind map themes"
- Changed artifact reads: removed `brainWrittenIdeas`, added `mindMapThemes`, renamed `selectedIdeaTitles` → `selectedSketchSlotIds`
- Updated empty state check: removed `brainWrittenIdeas.length` check
- Removed "User Ideas Section" entirely (89 lines)
- Removed "Brain Writing Section" entirely (57 lines with evolution display)
- Added "Mind Map Themes Section":
  - Displays themes with color-coded backgrounds and left borders
  - Uses theme.color for styling consistency
- Updated "Crazy 8s Section" label from "Crazy 8s" to match new visual context
- Updated "Selected Ideas Footer" to "Selected Sketches Footer"
- Changed display: "Sketch 1", "Sketch 4", "Sketch 7" instead of idea titles

## Deviations from Plan

None - plan executed exactly as written. All tasks completed without architectural changes or blocking issues.

## Issues Encountered

None. TypeScript compilation and production build passed on first attempt after all changes.

## User Setup Required

None - all changes are code-level updates. No external service configuration needed.

## Next Phase Readiness

- Step 8 fully transformed to visual-first workflow
- Brain Writing completely removed from codebase (verified via grep - zero matches)
- Idea selection works from Crazy 8s sketches stored in canvas-store
- Mind map themes provide thematic context for idea selection
- AI prompts guide users through visual ideation workflow
- Schemas and types consistent across all files
- Ready for Phase 29: Visual Concept Cards (will use selectedSketchSlotIds)

## Self-Check: PASSED

All files verified:
- ✓ src/components/workshop/ideation-sub-step-container.tsx modified
- ✓ src/components/workshop/idea-selection.tsx modified
- ✓ src/components/workshop/chat-panel.tsx modified
- ✓ src/lib/ai/prompts/step-prompts.ts modified
- ✓ src/lib/ai/prompts/validation-criteria.ts modified
- ✓ src/lib/schemas/step-schemas.ts modified
- ✓ src/lib/workshop/step-metadata.ts modified
- ✓ src/app/api/dev/seed-workshop/fixtures.ts modified
- ✓ src/components/workshop/ideation-cluster-view.tsx modified
- ✓ Commit c1f76f4 exists (Task 1)
- ✓ Commit 51c451e exists (Task 2)
- ✓ TypeScript passes: `npx tsc --noEmit` (zero errors)
- ✓ Build passes: `npm run build` (successful)
- ✓ Zero grep matches for "brainWriting", "brain-writing", "Brain Writing" in src/

---
*Phase: 28-mind-map-crazy-8s*
*Completed: 2026-02-12*

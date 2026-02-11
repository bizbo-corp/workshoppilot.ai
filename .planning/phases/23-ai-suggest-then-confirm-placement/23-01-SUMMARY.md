---
phase: 23-ai-suggest-then-confirm-placement
plan: 01
subsystem: canvas-ai-integration
tags: [ai-prompt, data-model, preview-nodes, grid-placement]
dependency_graph:
  requires: [phase-22-dynamic-grid-structure]
  provides: [preview-node-data-model, grid-item-markup, ai-suggest-protocol]
  affects: [canvas-store, chat-panel, ai-prompts, context-assembly]
tech_stack:
  added: []
  patterns: [preview-flag-pattern, dual-tag-parser, context-filtering]
key_files:
  created: []
  modified:
    - src/stores/canvas-store.ts
    - src/lib/workshop/context/canvas-context.ts
    - src/components/workshop/chat-panel.tsx
    - src/lib/ai/chat-config.ts
decisions:
  - title: "Preview nodes use isPreview boolean flag"
    rationale: "Simple boolean flag sufficient to distinguish preview from permanent nodes. No separate node type needed since functionality is identical except for confirmation state."
  - title: "GRID_ITEM tags only for journey-mapping step"
    rationale: "Stakeholder-mapping, sense-making, and persona steps already use CANVAS_ITEM for auto-add. Only journey-mapping needs suggest-then-confirm due to grid cell targeting complexity."
  - title: "Preview nodes filtered from AI context at assembly"
    rationale: "Prevents AI from referencing unconfirmed suggestions in its responses. Filtering at context assembly layer (not query layer) ensures consistent behavior across all AI interactions."
metrics:
  duration: "2m 27s"
  tasks_completed: 2
  files_modified: 4
  completed_date: 2026-02-11
---

# Phase 23 Plan 01: AI Suggest-Then-Confirm Data Layer

**One-liner:** Preview node data model with dual-tag parser (CANVAS_ITEM/GRID_ITEM) and AI context filtering for journey-mapping suggest-then-confirm flow

## What Was Built

Extended the canvas data model and AI integration layer to support preview nodes that distinguish AI suggestions from user-confirmed content:

**Data Model Extensions:**
- Added `isPreview?: boolean` and `previewReason?: string` fields to PostIt type
- Added `confirmPreview` and `rejectPreview` actions to CanvasActions (toggle preview to permanent, or delete)
- Both actions set `isDirty: true` to trigger auto-save

**Markup Parser Extensions:**
- Updated parseCanvasItems regex to recognize both `[CANVAS_ITEM]` and `[GRID_ITEM]` tag variants
- Added `isGridItem?: boolean` to CanvasItemParsed type to flag grid-based suggestions
- Auto-add logic sets `isPreview: item.isGridItem || false` when creating post-its from parsed items
- CANVAS_ITEM tags create permanent nodes (existing behavior), GRID_ITEM tags create preview nodes

**AI Prompt Updates:**
- Journey-mapping step switched from CANVAS_ITEM to GRID_ITEM format
- Added preview UI context: "Items appear as PREVIEWS on the canvas. The user will see 'Add to Canvas' and 'Skip' buttons..."
- Added placement reasoning instruction: "Briefly explain WHY you're placing an item in a specific cell"
- Noted dynamic column IDs (Phase 22 allows user-editable columns)
- Stakeholder-mapping, sense-making, and persona steps unchanged (still use CANVAS_ITEM auto-add)

**Context Assembly Filtering:**
- `assembleJourneyMapCanvasContext` now filters `&& !p.isPreview` to exclude preview nodes
- `assembleCanvasContextForStep` applies same filter at top-level to ensure all steps exclude previews
- AI never sees unconfirmed suggestions in its context, preventing it from referencing items the user hasn't accepted

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**With Phase 22 (Dynamic Grid):** Builds on GridConfig and cellAssignment model. AI prompt notes that column IDs are dynamic/user-editable.

**With Phase 24 (Canvas Retrofits):** Preview filtering pattern established here will apply to any step using suggest-then-confirm in future.

**With Auto-Save System:** confirmPreview and rejectPreview both set isDirty flag, triggering standard auto-save flow for preview state changes.

## Testing Notes

**TypeScript compilation:** PASS (npx tsc --noEmit)
**Production build:** PASS (npm run build)

**Key verification points:**
- ✅ PostIt type includes isPreview and previewReason fields
- ✅ CanvasActions includes confirmPreview and rejectPreview
- ✅ parseCanvasItems regex matches both CANVAS_ITEM and GRID_ITEM
- ✅ CanvasItemParsed type includes isGridItem flag
- ✅ Auto-add logic sets isPreview based on isGridItem
- ✅ Journey-mapping AI prompt uses GRID_ITEM format
- ✅ Context assembly filters out preview nodes (2 locations)
- ✅ Steps 2, 4, 5 still use CANVAS_ITEM format (no regression)

## Next Steps

**Phase 23 Plan 02:** Build preview node UI components (confirm/reject buttons, cell pulse animation, preview badge) and wire to canvas-store actions created in this plan.

**Future Enhancements:**
- Consider adding previewReason to AI prompt output (currently field exists but not populated)
- May need preview expiration logic if users ignore previews across multiple AI turns

## Self-Check

Verifying all claimed files and commits exist:

```bash
# Check files
[ -f "src/stores/canvas-store.ts" ] && echo "FOUND: src/stores/canvas-store.ts" || echo "MISSING"
[ -f "src/lib/workshop/context/canvas-context.ts" ] && echo "FOUND: src/lib/workshop/context/canvas-context.ts" || echo "MISSING"
[ -f "src/components/workshop/chat-panel.tsx" ] && echo "FOUND: src/components/workshop/chat-panel.tsx" || echo "MISSING"
[ -f "src/lib/ai/chat-config.ts" ] && echo "FOUND: src/lib/ai/chat-config.ts" || echo "MISSING"

# Check commits
git log --oneline --all | grep -q "6c24248" && echo "FOUND: 6c24248" || echo "MISSING"
git log --oneline --all | grep -q "008c3c2" && echo "FOUND: 008c3c2" || echo "MISSING"
```

**Result:**

```
=== File Checks ===
FOUND: src/stores/canvas-store.ts
FOUND: src/lib/workshop/context/canvas-context.ts
FOUND: src/components/workshop/chat-panel.tsx
FOUND: src/lib/ai/chat-config.ts

=== Commit Checks ===
FOUND: 6c24248
FOUND: 008c3c2
```

## Self-Check: PASSED

All claimed files and commits verified. Plan execution complete.

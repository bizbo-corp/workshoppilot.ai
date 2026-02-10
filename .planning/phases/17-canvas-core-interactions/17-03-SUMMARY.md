---
phase: 17-canvas-core-interactions
plan: 03
subsystem: canvas-store, group-node, canvas-interactions
tags: [grouping, hierarchy, parent-child, spatial-organization, ungroup]
dependency_graph:
  requires:
    - 17-01 (temporal store, PostIt type extensions)
    - 17-02 (multi-select, context menu pattern)
  provides:
    - GroupNode component for visual group containers
    - groupPostIts and ungroupPostIts store actions
    - Group button in toolbar (visible when 2+ non-group nodes selected)
    - Ungroup option in context menu for group nodes
    - Parent-child positioning with ReactFlow sub-flows
  affects:
    - Phase completion (final plan for Phase 17)
    - Future canvas features will inherit grouping capability
tech_stack:
  added: []
  patterns:
    - ReactFlow sub-flow system (parentId + extent for parent-child relationships)
    - Bounding box calculation for group container sizing
    - Relative-to-absolute position conversion for ungrouping
    - Parent-before-children array ordering for ReactFlow rendering
key_files:
  created:
    - src/components/canvas/group-node.tsx
  modified:
    - src/stores/canvas-store.ts
    - src/components/canvas/react-flow-canvas.tsx
    - src/components/canvas/canvas-toolbar.tsx
decisions:
  - "Group node renders with translucent gray-100 background and dashed gray-300 border (subtle, non-intrusive)"
  - "NodeResizer allows manual group size adjustment when selected"
  - "Group creation adds 20px padding around bounding box for visual spacing"
  - "Children positioned relatively inside group (not absolute) for ReactFlow parent-child movement"
  - "Ungrouping converts children back to absolute positions (preserves canvas location)"
  - "Deleting a group auto-ungroups children (prevents accidental child deletion)"
  - "Group button only visible when 2+ non-group nodes selected (avoids UI clutter)"
  - "Groups sorted first in nodes array to ensure parent-before-children rendering"
metrics:
  duration: 2m 24s
  completed: 2026-02-10
---

# Phase 17 Plan 03: Canvas Core Interactions - Grouping and Hierarchy Summary

**One-liner:** Implemented post-it grouping using ReactFlow sub-flows with GroupNode component (gray dashed container), groupPostIts/ungroupPostIts store actions (bounding box calculation, relative positioning), Group toolbar button (visible with 2+ selections), and ungroup context menu for spatial organization of related ideas.

## What Was Built

### 1. GroupNode Component
**Visual design:**
- Translucent gray background (`bg-gray-100/70`) - subtle, doesn't overpower post-its
- Dashed border (`border-dashed border-gray-300`) - clearly indicates grouping
- Blue border when selected (`border-blue-400`) - consistent with post-it selection
- Rounded corners (`rounded-lg`) - matches post-it styling
- NodeResizer for manual size adjustment - users can expand/shrink groups
- Minimum size 160x160px - prevents groups from becoming unusably small
- No label/text - keeps visual clean, avoids overlap with post-it content

**Technical implementation:**
```typescript
export const GroupNode = memo(({ selected }: NodeProps<GroupNode>) => {
  return (
    <div className={cn(
      'bg-gray-100/70 border-2 border-dashed border-gray-300 rounded-lg',
      'min-w-[160px] min-h-[160px] w-full h-full',
      selected && 'border-blue-400'
    )}>
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={160}
        handleClassName="!w-2 !h-2 !bg-blue-500 !border-blue-500"
      />
    </div>
  );
});
```

### 2. Store Grouping Actions

**groupPostIts(postItIds: string[]):**
1. **Validation:** Requires 2+ post-its (returns state unchanged if <2)
2. **Bounding box calculation:**
   - minX/minY: Minimum position values of selected post-its
   - maxX/maxY: Maximum position + width/height values
   - Group positioned at (minX - 20, minY - 20) for 20px padding
   - Group size: (maxX - minX + 40) x (maxY - minY + 40) for padding
3. **Children conversion:**
   - Set `parentId` to group ID
   - Convert position to relative: `child.x - minX + 20` (accounts for padding)
   - Preserves all other post-it properties (text, color, size)
4. **Array ordering:**
   - Group node inserted first
   - Non-selected post-its remain in original positions
   - Updated children appended last
   - **Critical:** Group MUST appear before children for ReactFlow rendering

**ungroupPostIts(groupId: string):**
1. **Find group and children:** Filter by groupId and parentId
2. **Convert to absolute positions:**
   - `child.x = group.x + child.x` (relative to absolute)
   - Clear `parentId` field
3. **Remove group:** Filter out group node from array
4. **Replace children:** Swap relative children with absolute versions
5. **Set isDirty:** Triggers auto-save

### 3. Group Button in Toolbar
**Visibility logic:**
- `onSelectionChange` handler tracks selected nodes
- Filters out group nodes (only count post-its for grouping)
- `canGroup={selectedNodeIds.length >= 2}` controls button visibility
- Button only appears when condition met (reduces UI clutter)

**Interaction:**
- Click Group → calls `groupPostIts(selectedNodeIds)`
- Clears selection after grouping (prevents immediate re-group)
- Toolbar position: absolute top-4 left-4, consistent with other buttons

### 4. Ungroup Context Menu
**Context menu enhancement:**
- Extended state to include `nodeType` field
- Right-click on group → shows "Ungroup" button (not color picker)
- Right-click on post-it → shows color picker (existing behavior)
- Click Ungroup → calls `ungroupPostIts(groupId)`, closes menu

**Menu rendering:**
```typescript
{contextMenu && contextMenu.nodeType === 'group' ? (
  <div className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
    <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
    <button onClick={() => ungroupPostIts(contextMenu.nodeId)}>
      Ungroup
    </button>
  </div>
) : contextMenu ? (
  <ColorPicker ... />
) : null}
```

### 5. ReactFlow Parent-Child Integration
**Nodes mapping updates:**
- **Sort groups first:** Ensures parent-before-children rendering (ReactFlow requirement)
- **parentId field:** Links children to group node
- **extent prop:** Set to `'parent'` for children (constrains movement to parent bounds)
- **Explicit dimensions:** Groups use `width` and `height` (not 'auto') for proper container sizing
- **ReactFlow auto-handling:** Dragging group automatically moves all children (no custom code needed)

**Delete group behavior:**
- `handleNodesDelete` detects group type
- Calls `ungroupPostIts(groupId)` before deletion
- Children released to absolute positions (not deleted)
- Non-group nodes deleted normally via `batchDeletePostIts`

## Deviations from Plan

None - plan executed exactly as written. All features implemented according to spec with no blocking issues or architectural changes required.

## Verification Results

### TypeScript Compilation
```bash
npx tsc --noEmit
# PASSED: No errors
```

### Feature Verification
- [x] GroupNode component exists at src/components/canvas/group-node.tsx
- [x] `group: GroupNode` registered in nodeTypes
- [x] `groupPostIts` action in canvas-store.ts
- [x] `ungroupPostIts` action in canvas-store.ts
- [x] Parent-child ordering logic (sort groups first)
- [x] Group button in toolbar with canGroup prop
- [x] Ungroup option in context menu
- [x] `onSelectionChange` handler for tracking selections
- [x] `parentId` and `extent` in nodes mapping
- [x] Delete group auto-ungroups children

## Self-Check

### Created Files
```bash
[ -f "src/components/canvas/group-node.tsx" ] && echo "FOUND: src/components/canvas/group-node.tsx" || echo "MISSING"
# FOUND: src/components/canvas/group-node.tsx
```

### Modified Files
```bash
[ -f "src/stores/canvas-store.ts" ] && echo "FOUND: src/stores/canvas-store.ts" || echo "MISSING"
# FOUND: src/stores/canvas-store.ts

[ -f "src/components/canvas/react-flow-canvas.tsx" ] && echo "FOUND: src/components/canvas/react-flow-canvas.tsx" || echo "MISSING"
# FOUND: src/components/canvas/react-flow-canvas.tsx

[ -f "src/components/canvas/canvas-toolbar.tsx" ] && echo "FOUND: src/components/canvas/canvas-toolbar.tsx" || echo "MISSING"
# FOUND: src/components/canvas/canvas-toolbar.tsx
```

### Commits Exist
```bash
git log --oneline --all | grep -q "03a7145" && echo "FOUND: 03a7145" || echo "MISSING"
# FOUND: 03a7145

git log --oneline --all | grep -q "647ae0d" && echo "FOUND: 647ae0d" || echo "MISSING"
# FOUND: 647ae0d
```

## Self-Check: PASSED

All files created/modified as expected, all commits present, all verification commands pass.

## What's Next

### Phase 17 Completion
This is the final plan for Phase 17 (Canvas Core Interactions). All core canvas interactions are now complete:
- Plan 01: Data model, undo/redo, color coding
- Plan 02: Multi-select, delete, toolbar controls, color picker
- Plan 03: Grouping and hierarchy (this plan)

### Immediate Next Steps
Phase 17 complete. Next phase in v1.1 roadmap will extend canvas capabilities with additional features (collaborative editing, AI-assisted organization, etc.).

### Known Limitations
- Group resize is manual (NodeResizer handles) - could add auto-resize when children added/removed in future
- No nested groups (groups cannot contain other groups) - acceptable for v1.1, defer to v1.2 if needed
- Context menu position may overflow viewport on right/bottom edges - same limitation as color picker (acceptable)

## Testing Notes

### Manual Testing Checklist
When testing this plan:
1. **Create group:**
   - Select 2+ post-its with Shift+click or drag-select
   - Verify Group button appears in toolbar
   - Click Group → verify gray dashed container wraps post-its
   - Verify 20px padding around post-its
2. **Group movement:**
   - Drag group → verify all children move together
   - Drag individual child inside group → verify constrained to group bounds (extent: 'parent')
3. **Ungroup:**
   - Right-click group → verify Ungroup option (not color picker)
   - Click Ungroup → verify children released at correct absolute positions
   - Verify group node removed from canvas
4. **Delete group:**
   - Select group, press Delete or Backspace
   - Verify children ungrouped (not deleted)
   - Verify group node removed
5. **Undo/redo grouping:**
   - Create group, press Cmd+Z → verify ungrouped
   - Press Cmd+Shift+Z → verify re-grouped
6. **Persistence:**
   - Create group, wait for auto-save
   - Refresh page → verify group persists with children
7. **Edge cases:**
   - Try to group 1 post-it → verify nothing happens
   - Try to group groups → verify only post-its counted (groups excluded)

### Edge Cases to Verify
- Loading groups from DB with parentId field → should render correctly in sub-flow
- Undo grouping → should restore pre-group state (children at original absolute positions)
- Group button visibility with mixed selection (groups + post-its) → only post-its counted
- Delete child inside group → child deleted, group remains
- Color change on grouped post-it → should work normally (color persists in group)

## Technical Notes

### Why Relative Positioning for Children
ReactFlow's parent-child system requires children to use positions relative to their parent. When a parent moves, ReactFlow automatically adds the parent's position to each child's position. This is why:
- Grouping converts `child.position.x` to `child.position.x - group.position.x`
- Ungrouping converts back: `child.position.x + group.position.x`

### Why Parent-Before-Children Array Ordering
ReactFlow renders nodes in array order. If a child appears before its parent in the array, ReactFlow can't establish the parent-child relationship (parent doesn't exist yet). The sort ensures groups always render first:
```typescript
const sorted = [...postIts].sort((a, b) => {
  if (a.type === 'group' && b.type !== 'group') return -1;
  if (a.type !== 'group' && b.type === 'group') return 1;
  return 0;
});
```

### Why Delete Group Auto-Ungroups
Deleting a group node would orphan children (ReactFlow error: parent doesn't exist). Instead, we:
1. Detect group deletion in `handleNodesDelete`
2. Call `ungroupPostIts(groupId)` to convert children to absolute positions
3. Remove group node from array
4. Children remain on canvas at same visual location

### Bounding Box Padding Rationale
20px padding around grouped post-its provides:
- Visual separation (group border not touching post-its)
- Space for dragging (easier to select/move entire group)
- Future extensibility (room for group labels, controls)

### Why extent: 'parent' for Children
ReactFlow's `extent` prop constrains node movement:
- `extent: 'parent'` → child cannot be dragged outside parent bounds
- `extent: undefined` (default) → node can be dragged anywhere
- This prevents children from being dragged out of groups visually (maintains group integrity)

---

**Plan execution:** 2m 24s (09:16:03 → 09:18:27 UTC)
**Commits:** 03a7145, 647ae0d
**Status:** COMPLETE - Phase 17 (Canvas Core Interactions) complete

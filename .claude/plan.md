# Plan: Fix Mind Map Container Drag + Console Error

## Bug Summary
1. **Mind map container drags but children don't follow** — The `handleNodeDrag` callback moves children via `setNodes`, but the `useEffect` that syncs `rfNodes` (from store) is likely overwriting those positions immediately. The guard `if (!containerDragRef.current)` was added but something is still resetting them. Need to debug.
2. **Owner zone (colored backgrounds) offset from mind map nodes** — Owner zones have absolute positions computed from `ownerOffsets`. When the phase container has a persisted position (from a previous drag), the mind map nodes account for it but owner zones don't, creating misalignment.
3. **Content can extend outside the outer container** — The phase container dimensions/position don't account for the actual content bounds after dragging.
4. **Console error: "Cannot update a component while rendering"** — `batchUpdateMindMapNodePositions` (a Zustand `set()`) is called inside `setNodes()` callback in `handleNodeDragStop`. The `setNodes` callback runs during React's render phase, and calling a store update (`set()`) there triggers the error.

## Fixes

### Fix 1: Console error — `batchUpdateMindMapNodePositions` called during render
**File:** `src/components/workshop/mind-map-canvas.tsx` (~line 1915-1955)

**Problem:** `handleNodeDragStop` calls `setNodes(currentNodes => { ... batchUpdateMindMapNodePositions(updates); ... return currentNodes; })`. The `setNodes` updater function runs during React reconciliation. Calling `batchUpdateMindMapNodePositions` (which calls Zustand `set()`) inside it triggers the "cannot update while rendering" error.

**Fix:** Don't use `setNodes` to read current nodes. Instead, use a `nodesRef` to access the current nodes array outside of render:

```typescript
// Add near other refs (line ~1798):
const nodesRef = useRef<Node[]>(nodes);
nodesRef.current = nodes;

// Rewrite handleNodeDragStop:
const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
  if (!containerDragRef.current || !isPhaseContainerNode(node.id)) return;
  const { step } = containerDragRef.current;
  containerDragRef.current = null;

  // Persist container position
  storeApi.getState().setVotingCardPosition(`__phase${step}__`, node.position);

  // Persist child positions (read from ref, not inside setNodes)
  const currentNodes = nodesRef.current;
  if (step === 1) {
    const updates: Array<{ id: string; position: { x: number; y: number } }> = [];
    for (const n of currentNodes) {
      if (n.type === 'mindMapNode') {
        const oid = getNodeOwnerId(n.id);
        const offset = oid ? ownerOffsetsRef.current[oid] : undefined;
        const adjusted = offset
          ? { x: n.position.x - offset.x, y: n.position.y - offset.y }
          : n.position;
        updates.push({
          id: n.id,
          position: { x: snapToGrid(adjusted.x), y: snapToGrid(adjusted.y) },
        });
      }
    }
    if (updates.length > 0) {
      batchUpdateMindMapNodePositions(updates);
    }
  } else if (step === 2) {
    for (const n of currentNodes) {
      if (isCrazy8sNode(n.id)) {
        storeApi.getState().setVotingCardPosition(`__c8s_${n.id}__`, n.position);
      }
    }
  }
}, [storeApi, getNodeOwnerId, batchUpdateMindMapNodePositions]);
```
Remove `setNodes` from the dependency array since it's no longer used.

### Fix 2: Mind map children not moving with container drag

**Problem:** The `handleNodeDrag` callback calls `setNodes` to move children by delta. But the rfNodes useMemo recomputes (triggered by some reactive dependency), and the `useEffect(() => { if (!containerDragRef.current) { setNodes(rfNodes); } }, [rfNodes])` guard should prevent overwriting.

**Debug steps:**
1. Check if `containerDragRef.current` is being set correctly. `handleNodeDragStart` only sets it for phase container nodes. Verify the node.id matches `isPhaseContainerNode`.
2. The issue may be that `handleNodeDrag` IS moving children but then `handleNodesChange` (which calls `setNodes(nds => applyNodeChanges(changes, nds))`) is ALSO called by ReactFlow for the container move, and `applyNodeChanges` resets children back because they aren't in the changes array.

**Most likely root cause:** `handleNodesChange` calls `setNodes(nds => applyNodeChanges(changes, nds))` at the END of the function. The `changes` only contain the container position change. `applyNodeChanges` updates the container but leaves children at their old positions. Then `handleNodeDrag` fires and moves children. But there's a race — both `setNodes` calls may conflict.

**Fix:** In `handleNodeDrag`, instead of a separate `setNodes` call, move the child delta logic INTO `handleNodesChange`. When a position change for a phase container is detected and it's dragging, also generate position changes for children:

```typescript
// Inside handleNodesChange, after detecting phase container position change:
if (isPhaseContainerNode(posChange.id) && posChange.dragging && posChange.position) {
  const step = parseInt(posChange.id.slice(PHASE_CONTAINER_PREFIX.length));
  const prevPos = containerDragRef.current?.prevPos;
  if (prevPos) {
    const delta = {
      x: posChange.position.x - prevPos.x,
      y: posChange.position.y - prevPos.y,
    };
    containerDragRef.current!.prevPos = { ...posChange.position };

    // Also move all children by the same delta
    // We'll inject extra position changes for children
    for (const existingNode of /* current nodes */) {
      const isChild = (step === 1 && (existingNode.type === 'mindMapNode' || existingNode.id.startsWith(ZONE_NODE_PREFIX)))
        || (step === 2 && isCrazy8sNode(existingNode.id));
      if (isChild) {
        // Add a synthetic position change for this child
        changes.push({
          type: 'position',
          id: existingNode.id,
          position: {
            x: existingNode.position.x + delta.x,
            y: existingNode.position.y + delta.y,
          },
          dragging: true,
        } as NodeChange);
      }
    }
  }
  continue;
}
```

**HOWEVER** — `handleNodesChange` receives `changes` as a parameter (readonly). A cleaner approach: modify the `setNodes` call at the end to also apply child deltas:

```typescript
// Replace the final setNodes call:
setNodes((nds) => {
  let updated = applyNodeChanges(changes, nds);
  // If dragging a phase container, also move children
  if (containerDragRef.current) {
    const { step, prevDelta } = containerDragRef.current;
    if (prevDelta && (prevDelta.x !== 0 || prevDelta.y !== 0)) {
      updated = updated.map(n => {
        const isChild =
          (step === 1 && (n.type === 'mindMapNode' || n.id.startsWith(ZONE_NODE_PREFIX))) ||
          (step === 2 && isCrazy8sNode(n.id));
        if (isChild) {
          return { ...n, position: { x: n.position.x + prevDelta.x, y: n.position.y + prevDelta.y } };
        }
        return n;
      });
      containerDragRef.current.prevDelta = { x: 0, y: 0 }; // Reset
    }
  }
  return updated;
});
```

**Best approach:** Move child movement logic from `handleNodeDrag` into `handleNodesChange`. Track the delta in `containerDragRef` from each position change, and apply it to children in the same `setNodes` call.

Updated `containerDragRef` type:
```typescript
const containerDragRef = useRef<{
  step: number;
  prevPos: { x: number; y: number };
} | null>(null);
```

Updated `handleNodesChange`:
- When a phase container position change is detected with `dragging: true`:
  1. Compute delta from `containerDragRef.current.prevPos`
  2. Update `containerDragRef.current.prevPos`
  3. Store the delta
- In the `setNodes` call at the end, apply the delta to all children

Then **remove** the separate `handleNodeDrag` callback (move its logic into `handleNodesChange`).

### Fix 3: Owner zones misaligned

**File:** `src/components/workshop/mind-map-canvas.tsx` (ownerZoneNodes useMemo, ~line 1248)

**Problem:** Owner zones have absolute positions `{ x: offset.x - 800, y: offset.y - 500 }`. When the mind map container is dragged, the `handleNodeDrag`/`handleNodesChange` correctly moves owner zones (identified by `n.id.startsWith('owner-zone-')`). But the ownerZoneNodes useMemo ALSO recomputes them from the original `ownerOffsets` values, resetting them.

**Fix:** The owner zone positions need to account for the persisted phase 1 container offset. Compute the delta between the persisted container position and the default container position, and add it to owner zone positions:

```typescript
// In ownerZoneNodes useMemo:
const phase1Persisted = votingCardPositions['__phase1__'];
const phase1Default = { x: leftEdgeX - PHASE_CONTENT_PADDING, y: phaseLayout.phases[0].y };
const phase1Delta = phase1Persisted
  ? { x: phase1Persisted.x - phase1Default.x, y: phase1Persisted.y - phase1Default.y }
  : { x: 0, y: 0 };

// Then for each zone position:
position: {
  x: (offset.x - 800) + phase1Delta.x,
  y: (offset.y - 500) + phase1Delta.y
}
```

Add `votingCardPositions`, `leftEdgeX`, and `phaseLayout` to the useMemo dependencies.

**Similarly for rfMindMapNodes:** The mind map node positions also need the phase1Delta applied so they stay aligned with the container:

```typescript
// In rfMindMapNodes useMemo:
const position = offset
  ? { x: basePos.x + offset.x + phase1Delta.x, y: basePos.y + offset.y + phase1Delta.y }
  : { x: basePos.x + phase1Delta.x, y: basePos.y + phase1Delta.y };
```

**And for crazy8sNodes:** Apply phase2Delta similarly.

**KEY INSIGHT:** With the delta approach applied in the useMemos, the `handleNodeDrag`/`handleNodesChange` child movement becomes UNNECESSARY for persisted drags. The delta is reactive — when the container's persisted position changes, all child useMemos recompute with the correct delta. The real-time drag still needs the manual child movement (since positions aren't persisted until drag stop).

### Fix 4: Content extending outside container

**Problem:** After dragging, the phase container persists its new position, but the container dimensions are fixed from `phaseLayout`. If children were dragged individually before the container was dragged, they might be outside bounds.

**Fix:** This is acceptable for now — the phase container is a visual background, not a constraining boundary. Mind map nodes can naturally extend beyond (same as how they currently work). The container just provides a visual frame.

If the user wants strict containment, we could add `extent: 'parent'` to children, but that would limit creativity in mind mapping. Skip this for now.

## Implementation Order
1. Fix 1 (console error) — nodesRef approach
2. Fix 2 (children not moving) — move child logic into handleNodesChange
3. Fix 3 (owner zones misaligned) — add phase delta to all child useMemos
4. Verify crazy 8s still works
5. Type-check with `npx tsc --noEmit`

## Files to modify
- `src/components/workshop/mind-map-canvas.tsx` (all fixes)

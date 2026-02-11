# Pitfalls Research: Grid/Swimlane Canvas with AI Placement

**Domain:** Adding grid/swimlane layouts, snap-to-cell, and AI-driven placement to existing ReactFlow canvas
**Researched:** 2026-02-11
**Confidence:** MEDIUM-HIGH

**Context:** This research focuses on pitfalls when ADDING structured grid/swimlane canvas features to the EXISTING WorkshopPilot.ai v1.1 Canvas Foundation (ReactFlow post-it canvas with free-form positioning, quadrant layouts, Zustand state, auto-save, bidirectional AI integration). Specifically addresses retrofitting Steps 2 & 4 with structured outputs on canvas and implementing Journey Map (Step 6) with fixed swimlane rows and user-addable stage columns.

---

## Critical Pitfalls

### Pitfall 1: Grid Coordinate System Confusion (Free-Form vs Cell-Based)

**What goes wrong:**
Existing canvas uses ReactFlow's free-form coordinate system where post-its have absolute pixel positions (x: 245, y: 387). Add Journey Map grid with swimlane cells, and coordinate systems clash. User drags post-it from free-form Step 2 canvas to Journey Map Step 6 - position data doesn't translate. Post-it at (400, 300) renders in wrong cell or off-grid entirely. Grid snapping breaks multi-select drag - selecting 3 cards in same cell and dragging together causes them to "snap out" of grid alignment (known ReactFlow issue #1579). At certain zoom levels, snap-to-grid precision degrades - cards snap to wrong cells because coordinate rounding errors accumulate. Retrofitting Steps 2 & 4 quadrant canvases with cell constraints breaks existing saved workshops - old post-it positions (pixel coordinates) don't map to new cell coordinates, stakeholder maps scrambled on load.

**Why it happens:**
ReactFlow uses continuous 2D coordinate space where any (x, y) position is valid. Grid/swimlane layouts impose discrete coordinate constraints where only specific positions (cell centers or corners) are valid. Two fundamentally different positioning models coexist in same application - continuous for free-form steps, discrete for grid steps. Coordinate transformation between systems is non-trivial: pixel (400, 300) could map to cell [2, 3] but reverse transformation depends on cell size, padding, grid offset. Multi-select drag compounds the problem - ReactFlow's snap-to-grid (built-in `snapGrid` prop) snaps each node's individual position, not the selection group's anchor point, causing misalignment. GitHub issue #1579 documents this: "Selecting multiple nodes (with shift + click + drag) and then moving them across the pane breaks out of the grid." Zoom affects snap precision because viewport transformation introduces floating-point errors - at 250% zoom, a 10px grid becomes effectively 25px in screen space, but coordinate calculations still reference 10px, causing off-by-one-cell snapping. ReactFlow's snap grid anchors to (0, 0) - if grid cells don't align with (0, 0), dragging from position 545 calculates snap relative to origin not current position, throwing off alignment.

**How to avoid:**
Implement coordinate translation layer that converts between pixel and cell coordinates:

```typescript
// Coordinate translation utilities
interface CellPosition {
  row: number;
  col: number;
}

interface PixelPosition {
  x: number;
  y: number;
}

const CELL_WIDTH = 200;
const CELL_HEIGHT = 120;
const GRID_OFFSET_X = 50; // Header column width
const GRID_OFFSET_Y = 80; // Header row height

const pixelToCell = (pixel: PixelPosition): CellPosition => ({
  row: Math.floor((pixel.y - GRID_OFFSET_Y) / CELL_HEIGHT),
  col: Math.floor((pixel.x - GRID_OFFSET_X) / CELL_WIDTH)
});

const cellToPixel = (cell: CellPosition): PixelPosition => ({
  x: cell.col * CELL_WIDTH + GRID_OFFSET_X + CELL_WIDTH / 2, // Center of cell
  y: cell.row * CELL_HEIGHT + GRID_OFFSET_Y + CELL_HEIGHT / 2
});
```

Use different positioning strategies per step type - store cell coordinates for grid steps, pixel coordinates for free-form steps:

```typescript
interface CanvasItem {
  id: string;
  stepId: number;
  // Grid-based steps
  cellPosition?: CellPosition;
  // Free-form steps
  pixelPosition?: PixelPosition;
}

const getItemPosition = (item: CanvasItem, stepType: 'grid' | 'freeform'): PixelPosition => {
  if (stepType === 'grid' && item.cellPosition) {
    return cellToPixel(item.cellPosition);
  }
  return item.pixelPosition!;
};
```

Implement custom snap behavior for grid steps that constrains to cell centers:

```typescript
const handleNodeDragStop = (event: NodeDragEvent, node: Node) => {
  const cellPos = pixelToCell({ x: node.position.x, y: node.position.y });
  const snappedPixelPos = cellToPixel(cellPos);

  updateNodePosition(node.id, {
    pixelPosition: snappedPixelPos,
    cellPosition: cellPos
  });
};
```

For multi-select drag, implement group-aware snapping that maintains relative positions:

```typescript
const handleMultiNodeDrag = (selectedNodes: Node[]) => {
  // Calculate selection bounding box anchor
  const anchor = selectedNodes[0];
  const anchorCell = pixelToCell(anchor.position);
  const snappedAnchor = cellToPixel(anchorCell);

  // Apply same delta to all selected nodes
  const deltaX = snappedAnchor.x - anchor.position.x;
  const deltaY = snappedAnchor.y - anchor.position.y;

  selectedNodes.forEach(node => {
    updateNodePosition(node.id, {
      x: node.position.x + deltaX,
      y: node.position.y + deltaY
    });
  });
};
```

Disable ReactFlow's built-in `snapGrid` for grid steps - implement custom snap logic instead to avoid the multi-select bug. Use zoom-independent coordinate calculations - always compute cell positions in logical coordinates, not screen pixels. Test at multiple zoom levels (50%, 100%, 150%, 250%) to verify snap precision.

**Warning signs:**
- Cards snapping to wrong cells after drag
- Multi-select drag causing cards to scatter outside grid
- Snap behavior inconsistent at different zoom levels
- Existing workshops loading with scrambled positions after grid retrofit
- Cards positioned between cells instead of centered
- Horizontal/vertical alignment breaking when dragging multiple cards

**Phase to address:**
Phase 1 (Journey Map Grid Foundation) - Coordinate system architecture must be established upfront. Phase 2 (Steps 2 & 4 Retrofit) - Migration strategy for existing pixel coordinates to cell-constrained coordinates with fallback for invalid positions.

---

### Pitfall 2: Dynamic Column Addition Breaking Layout and State

**What goes wrong:**
Journey Map has fixed rows (Thinking, Feeling, Doing, Pain Points, Opportunities) but user-addable stage columns. User adds "Research" stage column - canvas re-renders, all cards shift positions unexpectedly. Card that was in [row: 2, col: 3] is now visually in wrong swimlane because column insertion shifted indices. Delete middle column, cards in columns after it don't reflow - they reference deleted column index, rendering off-canvas. Undo/redo breaks after column operations - undoing "delete column" restores column but not the cards that were in it. Database stores card positions as `{ row: 2, col: 3 }` but when columns are dynamically added/removed, these indices become stale references. AI suggests adding card to "Purchase" stage - but that stage was just deleted by user, causing placement error.

**Why it happens:**
Array-indexed columns create fragile position references - `col: 3` means "fourth column" but that's positional not semantic. When columns reorder or delete, indices shift: deleting column 1 makes old column 2 become new column 1, invalidating all stored positions. ReactFlow nodes have absolute x,y positions - adding column inserts space, requiring recalculation of all subsequent column x-offsets. If recalculation is synchronous, all cards flicker during re-layout. If asynchronous, cards briefly appear in wrong positions (flash of misaligned content). Undo/redo systems that store index-based positions break on structural changes - undoing "delete column 3" restores column but cards that referenced col:4 are now at col:3 (off by one). Database persistence compounds the issue: cards saved with `col: 3` referring to "Purchase" column load after column deleted, `col: 3` now refers to different stage. AI context includes column structure at request time - by response time (2-5s later), user may have deleted/reordered columns, making AI's suggested positions invalid.

**How to avoid:**
Use semantic IDs for columns instead of array indices:

```typescript
interface GridColumn {
  id: string; // UUID, not index
  label: string;
  order: number; // For display ordering
  createdAt: number;
}

interface CardPosition {
  row: string; // Row ID, not index
  col: string; // Column ID, not index
}

const columns = [
  { id: 'col-awareness', label: 'Awareness', order: 0 },
  { id: 'col-research', label: 'Research', order: 1 },
  { id: 'col-purchase', label: 'Purchase', order: 2 }
];
```

Store positions using stable IDs that survive reordering:

```typescript
const card = {
  id: 'card-123',
  rowId: 'row-feeling',
  colId: 'col-purchase' // Semantic ID, not index
};

// Position remains valid even if columns reorder
```

Implement layout calculation that derives pixel positions from ordered columns:

```typescript
const getCardPixelPosition = (card: Card, columns: GridColumn[]) => {
  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
  const colIndex = sortedColumns.findIndex(c => c.id === card.colId);
  const rowIndex = ROWS.findIndex(r => r.id === card.rowId);

  return cellToPixel({ row: rowIndex, col: colIndex });
};
```

Handle column deletion with card migration strategy:

```typescript
const deleteColumn = (columnId: string) => {
  // Find cards in deleted column
  const affectedCards = cards.filter(c => c.colId === columnId);

  // Option 1: Move to adjacent column
  const adjacentColumn = getAdjacentColumn(columnId, 'left');
  affectedCards.forEach(card => {
    updateCard(card.id, { colId: adjacentColumn.id });
  });

  // Option 2: Move to "parking lot" off-canvas area
  affectedCards.forEach(card => {
    updateCard(card.id, { colId: null, archived: true });
  });

  // Then delete column
  removeColumn(columnId);
};
```

Implement undo/redo that captures structural changes:

```typescript
interface HistoryEntry {
  type: 'card-move' | 'column-add' | 'column-delete' | 'column-reorder';
  before: GridState;
  after: GridState;
  affectedCards: Card[]; // For column operations
}

const undo = (entry: HistoryEntry) => {
  if (entry.type === 'column-delete') {
    // Restore column AND affected cards
    addColumn(entry.before.deletedColumn);
    entry.affectedCards.forEach(card => {
      updateCard(card.id, { colId: entry.before.deletedColumn.id });
    });
  }
};
```

AI placement should use semantic identifiers with fallback:

```typescript
const aiPlaceCard = (suggestion: { rowLabel: string, colLabel: string, text: string }) => {
  const column = columns.find(c => c.label === suggestion.colLabel);

  if (!column) {
    // Column deleted/renamed since AI request started
    // Fallback: place in first column, show warning
    placeCard({
      colId: columns[0].id,
      _aiWarning: `"${suggestion.colLabel}" stage not found`
    });
  } else {
    placeCard({ colId: column.id });
  }
};
```

Use immutable column operations with reactive layout updates:

```typescript
const addColumn = (label: string, afterColumnId?: string) => {
  const newColumn = {
    id: `col-${nanoid()}`,
    label,
    order: calculateOrder(afterColumnId),
    createdAt: Date.now()
  };

  // Zustand update triggers re-render with new layout
  setColumns(prev => [...prev, newColumn]);

  // ReactFlow nodes re-calculate positions reactively
  recalculateAllNodePositions();
};
```

**Warning signs:**
- Cards shifting to wrong swimlanes after column add/delete
- Undo/redo not restoring card positions correctly
- Cards disappearing after column operations
- AI placing cards in non-existent columns
- Column reordering breaking existing card positions
- Database queries returning cards with invalid column references

**Phase to address:**
Phase 1 (Journey Map Grid Foundation) - Semantic ID architecture from start. Phase 3 (AI Suggest-Then-Confirm) - AI placement validation against current column structure. Column operations must be atomic - structural change + affected card migration in single transaction.

---

### Pitfall 3: Snap-to-Cell Constraint Conflicts with Free-Form Editing

**What goes wrong:**
User tries to fine-tune card position within Journey Map cell - they want card in top-left corner of cell, not center. But snap-to-cell always forces center alignment. User attempts to resize card to fit more text - resize handle snaps to grid, making cards only resizable in grid-increment chunks (can't be 150px wide, only 100px or 200px). Multi-line text overflows cell boundaries, overlapping adjacent cells. User drags card quickly across grid - drag lags, cursor gets ahead of card position because snap recalculation is expensive. On touch devices, snap-to-cell makes dragging feel "sticky" - finger moves but card jumps discretely, not smoothly. User expects undo after snap-to-cell correction but undo stack doesn't register snap as separate action - undoing card move goes back to original position before drag started, not to pre-snap position.

**Why it happens:**
Snap-to-cell enforces discrete positioning but users expect continuous control. Grid constraints limit expressiveness - cards become uniform positioned blocks instead of spatially nuanced arrangements. ReactFlow's onNodeDrag fires on every pixel movement during drag - if snap calculation runs on each event (checking cell boundaries, calculating snap position), it becomes performance bottleneck. At 60fps, that's snap calculation every 16ms. Heavy calculations (distance to cell center, collision detection, multi-select group adjustments) cause frame drops. Touch drag events fire at higher frequency than mouse events (120+ events per second on iPad Pro) - snap calculation can't keep up, causing lag. Snap-to-cell is binary decision (snap or don't snap) but users want hybrid - constrained to cells but with sub-cell positioning freedom. Undo/redo systems designed for free-form canvas record final position after drag - snap adjustment happens during drag, not as separate action, so undo has no snap-specific state to restore.

**How to avoid:**
Implement "loose" snap with sub-cell positioning allowed:

```typescript
interface CardPosition {
  cellId: string; // Which cell card belongs to
  offsetX: number; // Offset within cell (-50 to +50 pixels)
  offsetY: number; // Allows fine-tuning position
}

const getCardPixelPosition = (card: CardPosition) => {
  const cellCenter = cellToPixel(getCellCoords(card.cellId));
  return {
    x: cellCenter.x + card.offsetX,
    y: cellCenter.y + card.offsetY
  };
};
```

Use snap threshold with dead zone - only snap if close to cell boundary:

```typescript
const SNAP_THRESHOLD = 20; // pixels

const handleNodeDrag = (node: Node) => {
  const currentCell = pixelToCell(node.position);
  const cellCenter = cellToPixel(currentCell);

  const distanceToCenter = Math.hypot(
    node.position.x - cellCenter.x,
    node.position.y - cellCenter.y
  );

  if (distanceToCenter < SNAP_THRESHOLD) {
    // Snap to center
    return cellCenter;
  } else {
    // Allow free positioning within cell
    return node.position;
  }
};
```

Debounce snap calculations during drag to improve performance:

```typescript
const useDebouncedSnap = () => {
  const [position, setPosition] = useState<Position>();
  const debouncedSnap = useMemo(
    () => debounce((pos: Position) => {
      const snapped = snapToCell(pos);
      setPosition(snapped);
    }, 50), // Only snap every 50ms, not every frame
    []
  );

  return debouncedSnap;
};
```

Implement visual snap indicators instead of forced snapping:

```typescript
// Show ghost outline of where card will snap
const [snapPreview, setSnapPreview] = useState<CellPosition | null>(null);

const handleNodeDrag = (node: Node) => {
  const targetCell = pixelToCell(node.position);
  setSnapPreview(targetCell); // Show visual indicator
  // Don't force position - let user decide to release in cell or not
};

const handleNodeDragEnd = (node: Node) => {
  if (snapPreview) {
    // Snap on drag end, not during drag
    const snappedPosition = cellToPixel(snapPreview);
    updateNode(node.id, snappedPosition);
  }
  setSnapPreview(null);
};
```

Use cell-based constraints for placement, pixel-based for adjustments:

```typescript
// Initial AI placement: snap to cell
const placeCard = (rowId: string, colId: string) => {
  const cellCenter = getCellCenter(rowId, colId);
  addCard({ position: cellCenter, cellId: `${rowId}-${colId}` });
};

// User adjustment: allow pixel-level tweaking
const adjustCard = (cardId: string, deltaX: number, deltaY: number) => {
  updateCard(cardId, (card) => ({
    ...card,
    position: {
      x: card.position.x + deltaX,
      y: card.position.y + deltaY
    }
  }));
  // No snap enforcement - user has control
};
```

Implement smart resize that respects content, not just grid:

```typescript
const handleCardResize = (cardId: string, newWidth: number) => {
  // Allow any width, but warn if exceeding cell boundaries
  const card = getCard(cardId);
  const cellWidth = CELL_WIDTH;

  if (newWidth > cellWidth * 0.9) {
    showWarning("Card content may overlap adjacent cells");
  }

  updateCard(cardId, { width: newWidth }); // No forced snap
};
```

**Warning signs:**
- Users complaining about inability to fine-tune positions
- Dragging feels laggy or "sticky" especially on touch devices
- Cards snapping when user doesn't want them to
- Frame rate drops during multi-card drag operations
- Text overflow breaking grid visual alignment
- Undo/redo not respecting user's intended positions

**Phase to address:**
Phase 1 (Journey Map Grid Foundation) - Snap behavior architecture with performance considerations. Phase 4 (User Refinement) - Gather user feedback on snap behavior, tune threshold and debouncing based on real usage patterns. Balance between structured grid and user control is subjective - requires iteration.

---

### Pitfall 4: Output Panel → Canvas Migration State Inconsistency

**What goes wrong:**
Steps 2 & 4 currently show structured output in right panel (stakeholder list, empathy themes). Retrofit adds canvas rendering of same data. Now two representations of same data exist - output panel AND canvas. User edits stakeholder name in output panel form - canvas doesn't update. User drags stakeholder post-it on canvas - output panel still shows old position. Delete stakeholder from canvas - it reappears on canvas reload because database still has structured output record. AI generates new stakeholder in output format (JSON) - doesn't appear on canvas because canvas expects different data structure. Canvas uses cellPosition, output uses flat array index - no mapping layer. Undo/redo becomes ambiguous - does it undo canvas action OR output panel edit? They're the same data but different operations.

**Why it happens:**
Two UI representations of single data entity without clear ownership creates split-brain problem. Output panel designed for v1.0 schema: `stakeholders: [{ id, name, power, interest }]`. Canvas designed for v1.1 schema: `canvasItems: [{ id, x, y, content }]`. Retrofit attempts to bridge them but requires bidirectional sync. Changes in output panel must propagate to canvas (name edit updates post-it text). Changes in canvas must propagate to output panel (drag updates stakeholder in list). Sync is non-trivial when schemas differ - canvas has position data output doesn't need, output has form fields canvas doesn't render. React state updates are asynchronous - updating output panel triggers re-render that updates canvas, but during render, canvas state is stale for one frame, causing flicker. Database persistence exacerbates issue - if output panel saves to `stepArtifacts.stakeholders` and canvas saves to `stepArtifacts.canvasState`, they can diverge (one save succeeds, other fails).

**How to avoid:**
Establish single source of truth in database, treat both UIs as projections:

```typescript
// Database schema: Unified model
interface StakeholderEntity {
  id: string;
  name: string;
  power: number;
  interest: number;
  // Canvas-specific fields (nullable for backward compat)
  canvasPosition?: {
    x: number;
    y: number;
    cellId?: string; // For grid steps
  };
  createdAt: number;
  updatedAt: number;
}
```

Use Zustand store as runtime single source of truth:

```typescript
interface WorkshopStore {
  stakeholders: StakeholderEntity[]; // Single array

  // UI projections derive from this
  getOutputPanelData: () => StakeholderOutputFormat;
  getCanvasNodes: () => ReactFlowNode[];

  // Mutations update single source
  updateStakeholder: (id: string, updates: Partial<StakeholderEntity>) => void;
  deleteStakeholder: (id: string) => void;
}
```

Derive UI representations from single source:

```typescript
// Output panel projection
const OutputPanel = () => {
  const stakeholders = useWorkshopStore(state => state.stakeholders);

  return (
    <div>
      {stakeholders.map(s => (
        <StakeholderForm
          key={s.id}
          stakeholder={s}
          onChange={(updates) => updateStakeholder(s.id, updates)}
        />
      ))}
    </div>
  );
};

// Canvas projection
const StakeholderCanvas = () => {
  const nodes = useWorkshopStore(state => state.getCanvasNodes());

  return (
    <ReactFlow
      nodes={nodes}
      onNodeDrag={(_, node) => {
        updateStakeholder(node.id, {
          canvasPosition: { x: node.position.x, y: node.position.y }
        });
      }}
    />
  );
};
```

Implement migration strategy for existing workshops:

```typescript
const migrateStep2ToCanvasSchema = async (workshopId: string) => {
  const workshop = await db.query.workshops.findFirst({
    where: eq(workshops.id, workshopId)
  });

  const artifacts = workshop.stepArtifacts as any;

  if (artifacts.stakeholders && !artifacts.stakeholders[0]?.canvasPosition) {
    // Old format: Add default canvas positions
    const migrated = artifacts.stakeholders.map((s, idx) => ({
      ...s,
      canvasPosition: {
        x: 100 + (idx % 3) * 200, // Spread in grid
        y: 100 + Math.floor(idx / 3) * 150
      }
    }));

    await db.update(workshops)
      .set({
        stepArtifacts: { ...artifacts, stakeholders: migrated }
      })
      .where(eq(workshops.id, workshopId));
  }
};
```

Handle partial state during migration with feature flags:

```typescript
const useCanvasEnabled = (stepId: number) => {
  const workshop = useWorkshopStore(state => state.workshop);

  // Only enable canvas if data has been migrated
  const stakeholders = workshop.stepArtifacts?.stakeholders || [];
  const hasCanvasData = stakeholders.every(s => s.canvasPosition);

  return stepId === 2 && hasCanvasData;
};

// UI renders appropriate view
const Step2 = () => {
  const canvasEnabled = useCanvasEnabled(2);

  if (canvasEnabled) {
    return <SplitView output={<OutputPanel />} canvas={<StakeholderCanvas />} />;
  } else {
    return <OutputPanelOnly />; // Fallback for unmigrated workshops
  }
};
```

Unified undo/redo that works across both UIs:

```typescript
interface HistoryEntry {
  type: 'stakeholder-update' | 'stakeholder-add' | 'stakeholder-delete';
  entityId: string;
  before: StakeholderEntity;
  after: StakeholderEntity;
  // Source doesn't matter - operation is same
  source: 'output-panel' | 'canvas';
}

const undo = (entry: HistoryEntry) => {
  // Restore entity in store - both UIs react
  updateStakeholder(entry.entityId, entry.before);
};
```

**Warning signs:**
- Output panel and canvas showing different data
- Edits in one view not reflected in other
- Database saving conflicting versions of same data
- Undo/redo working in one view but not the other
- Migration errors when loading old workshops
- Users confused about which view is "real"

**Phase to address:**
Phase 2 (Steps 2 & 4 Retrofit) - Schema unification and migration strategy MUST be designed before implementing canvas rendering. Single source of truth architecture is foundational, cannot be retrofitted after building dual representations. Phase includes migration script for production workshops + feature flag rollout.

---

### Pitfall 5: AI Placement Suggestions Becoming Stale During User Editing

**What goes wrong:**
User asks AI "Map the customer journey for buying a car". AI analyzes (2-3 seconds), streams response suggesting 5 stages: Awareness, Research, Test Drive, Purchase, Ownership. While AI is streaming, user preemptively adds "Financing" column to Journey Map grid. AI placement completes, suggests cards like "Compare insurance" in "Research" stage (col: 1). But user's grid now has "Financing" inserted at col: 1, shifting "Research" to col: 2. Card appears in wrong column. Or worse: AI suggests 8 cards across 4 stages, starts streaming. User sees first 2 suggestions, immediately starts dragging them to different cells. AI's subsequent suggestions reference grid state from request time (before user's drags), creating visual chaos with cards overlapping or in illogical positions. User deletes "Test Drive" stage during AI response - AI still suggests cards for that stage, placement fails with errors.

**Why it happens:**
AI placement is suggest-then-confirm but suggestion phase takes 2-5 seconds (LLM generation + streaming). During that window, user can modify canvas structure (add/remove/reorder columns, drag existing cards). AI's suggested placements become stale - they reference grid snapshot from request time, not current state. React's concurrent rendering (React 19) allows user interactions during async AI streaming without blocking UI. Grid mutations (add column) complete instantly while AI stream is in-flight. By the time AI placement arrives, grid structure has changed. AI context includes current grid structure in system prompt: "Grid has columns: Awareness, Research, Purchase". But user adds column after request starts, AI doesn't know. Column insertion shifts indices - `col: 1` meant "Research" at request time, means "Financing" at response time. Optimistic updates compound problem - user drags card optimistically during AI stream, AI's response overwrites with original position.

**How to avoid:**
Implement grid structure versioning with validation:

```typescript
interface GridSnapshot {
  version: number;
  columns: GridColumn[];
  rows: GridRow[];
  timestamp: number;
}

const requestAIPlacement = async (prompt: string) => {
  // Capture grid structure at request time
  const gridSnapshot: GridSnapshot = {
    version: currentGridVersion,
    columns: [...columns],
    rows: [...rows],
    timestamp: Date.now()
  };

  const suggestions = await aiClient.suggestPlacements(prompt, gridSnapshot);

  // Validate suggestions against CURRENT grid
  const validatedSuggestions = validatePlacements(suggestions, getCurrentGrid());

  return validatedSuggestions;
};
```

Validate AI placement suggestions against current grid state:

```typescript
const validatePlacements = (
  suggestions: AISuggestion[],
  currentGrid: GridSnapshot
): ValidatedSuggestion[] => {
  return suggestions.map(suggestion => {
    // Check if referenced column still exists
    const columnExists = currentGrid.columns.some(
      c => c.id === suggestion.colId
    );

    if (!columnExists) {
      // Fallback: Find column by label match
      const matchByLabel = currentGrid.columns.find(
        c => c.label.toLowerCase() === suggestion.colLabel.toLowerCase()
      );

      if (matchByLabel) {
        return { ...suggestion, colId: matchByLabel.id, _fallback: true };
      } else {
        // Column deleted - place in first column with warning
        return {
          ...suggestion,
          colId: currentGrid.columns[0].id,
          _warning: `"${suggestion.colLabel}" stage not found, placed in first stage`
        };
      }
    }

    return suggestion;
  });
};
```

Lock grid structure during AI streaming to prevent mutations:

```typescript
const [isAIPlacing, setIsAIPlacing] = useState(false);

const requestAIPlacement = async (prompt: string) => {
  setIsAIPlacing(true);
  try {
    const suggestions = await aiClient.suggestPlacements(prompt);
    return suggestions;
  } finally {
    setIsAIPlacing(false);
  }
};

// Disable column add/remove during AI stream
<Button
  onClick={addColumn}
  disabled={isAIPlacing}
  title={isAIPlacing ? "Wait for AI to finish placing cards" : "Add stage"}
>
  Add Stage
</Button>
```

Use semantic column references in AI suggestions, not indices:

```typescript
// Bad: AI suggests with column index
{
  card: "Compare insurance",
  row: 0,
  col: 1 // Fragile - breaks if columns reorder
}

// Good: AI suggests with column label
{
  card: "Compare insurance",
  rowLabel: "Thinking",
  colLabel: "Research" // Resilient to reordering
}
```

Implement progressive validation during streaming:

```typescript
const handleAIStream = async (stream: ReadableStream) => {
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const suggestion = parseStreamChunk(value);

    // Validate each suggestion as it arrives
    const validated = validatePlacements([suggestion], getCurrentGrid());

    if (validated[0]._warning) {
      // Show warning to user in real-time
      showToast(`AI suggestion adjusted: ${validated[0]._warning}`);
    }

    // Apply validated suggestion
    addCard(validated[0]);
  }
};
```

Snapshot-based conflict resolution for concurrent edits:

```typescript
interface PlacementConflict {
  cardId: string;
  aiSuggestion: CardPosition;
  userEdit: CardPosition;
  timestamp: number;
}

const resolveConflict = (conflict: PlacementConflict): CardPosition => {
  // Last write wins - user edit during AI stream takes precedence
  if (conflict.userEdit.timestamp > conflict.aiSuggestion.timestamp) {
    return conflict.userEdit;
  }
  // Or show merge UI: "AI suggested different position. Keep yours or use AI's?"
  return conflict.aiSuggestion;
};
```

Defer AI placement until user explicitly confirms:

```typescript
// AI generates suggestions but doesn't auto-place
const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);

const handleAIResponse = (suggestions: AISuggestion[]) => {
  setAiSuggestions(suggestions);
  // Show preview UI: "AI suggests 8 cards. Review and place?"
};

const confirmAIPlacement = () => {
  const validated = validatePlacements(aiSuggestions, getCurrentGrid());
  validated.forEach(s => addCard(s));
  setAiSuggestions([]);
};

// User has opportunity to adjust grid BEFORE placement
```

**Warning signs:**
- AI placing cards in wrong columns/stages
- Card placement errors when user modified grid during AI response
- Visual chaos with overlapping cards after AI suggestions
- Users reporting "AI doesn't understand my grid structure"
- Grid modifications during AI stream causing placement failures
- Warnings about non-existent columns/stages in AI suggestions

**Phase to address:**
Phase 3 (AI Suggest-Then-Confirm) - Grid versioning and validation logic must be built into AI placement system from start. Phase 4 (Conflict Resolution) - Handle edge cases with user-facing merge UI. Grid locking during AI stream is optional (reduces flexibility) vs validation (maintains flexibility but requires conflict handling).

---

### Pitfall 6: Swimlane Row Height Rigidity Breaking Content Adaptability

**What goes wrong:**
Journey Map has fixed row heights (120px per swimlane: Thinking, Feeling, Doing, Pain Points, Opportunities). User adds card with long text in "Pain Points" row - text overflows, truncated with ellipsis or overlaps row below. User tries to resize row to fit content - rows are fixed height, can't adjust. Add 5 cards to "Thinking" row - they crowd horizontally, become illegible. Cards in same cell overlap because cell can only hold 1-2 cards before running out of space. Mobile viewport makes 120px rows too tall - 5 rows consume entire screen, no vertical scrolling shows stages (columns). User wants to collapse empty rows to save space - row structure is fixed, can't hide. Different content types (short phrases vs paragraphs) don't fit uniform row heights well.

**Why it happens:**
Swimlane diagrams traditionally use fixed row heights for visual consistency and alignment. In static diagrams (PowerPoint, Miro templates), fixed rows work because content is pre-sized. In dynamic canvas with user-generated content, fixed rows become constraint. Text length varies - "Happy" vs "Frustrated by lack of transparency and unclear communication from sales team" need different vertical space. ReactFlow nodes have intrinsic sizing based on content, but swimlane rows impose extrinsic constraint. CSS overflow: hidden truncates, overflow: visible causes overlap, neither ideal. Multiple cards in same cell require stacking (vertical layout within cell) but fixed cell height limits stack capacity. Mobile portrait orientation has limited vertical space - 5 rows × 120px = 600px, plus headers = 700px, exceeds typical 667px iPhone viewport. Horizontal scrolling (for stages) combined with vertical constraint (fixed rows) creates awkward UX - user can scroll horizontally to see more stages but can't adjust vertical space per row.

**How to avoid:**
Implement flexible row heights with min/max constraints:

```typescript
interface GridRow {
  id: string;
  label: string;
  minHeight: number; // 80px minimum
  maxHeight: number; // 300px maximum
  currentHeight: number; // Calculated from content or user-set
}

const calculateRowHeight = (rowId: string, cards: Card[]): number => {
  const cardsInRow = cards.filter(c => c.rowId === rowId);

  if (cardsInRow.length === 0) {
    return ROW_MIN_HEIGHT; // Collapse empty rows
  }

  // Calculate required height based on cards in row
  const contentHeight = Math.max(
    ...cardsInRow.map(card => card.contentHeight + CARD_PADDING)
  );

  return clamp(contentHeight, ROW_MIN_HEIGHT, ROW_MAX_HEIGHT);
};
```

Use responsive row sizing for mobile:

```typescript
const useResponsiveRowHeight = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return {
    rowMinHeight: isMobile ? 60 : 80,
    rowMaxHeight: isMobile ? 200 : 300,
    rowDefaultHeight: isMobile ? 80 : 120
  };
};
```

Implement cell stacking when multiple cards in same cell:

```typescript
const getCellCardLayout = (cellId: string, cards: Card[]): CardLayout[] => {
  const cardsInCell = cards.filter(c =>
    c.cellId === cellId
  );

  if (cardsInCell.length <= 1) {
    // Single card: center in cell
    return [{ cardId: cardsInCell[0]?.id, x: 0, y: 0 }];
  } else {
    // Multiple cards: stack vertically
    return cardsInCell.map((card, idx) => ({
      cardId: card.id,
      x: 0,
      y: idx * (CARD_HEIGHT + CARD_GAP), // Stack with gap
      zIndex: idx
    }));
  }
};
```

Allow manual row height adjustment:

```typescript
const RowResizeHandle = ({ rowId }: { rowId: string }) => {
  const handleResize = (deltaY: number) => {
    updateRowHeight(rowId, (current) =>
      clamp(current + deltaY, ROW_MIN_HEIGHT, ROW_MAX_HEIGHT)
    );
  };

  return (
    <div
      className="row-resize-handle"
      onMouseDown={(e) => {
        const startY = e.clientY;
        const handleMouseMove = (e: MouseEvent) => {
          handleResize(e.clientY - startY);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
          document.removeEventListener('mousemove', handleMouseMove);
        }, { once: true });
      }}
    />
  );
};
```

Implement row collapse for empty rows:

```typescript
const getVisibleRows = (rows: GridRow[], cards: Card[]): GridRow[] => {
  return rows.filter(row => {
    const hasCards = cards.some(c => c.rowId === row.id);
    const isExpanded = row.collapsed === false;

    return hasCards || isExpanded;
  });
};
```

Use content-aware card sizing:

```typescript
const CardNode = ({ data }: { data: CardData }) => {
  const [contentHeight, setContentHeight] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const height = textRef.current.scrollHeight;
      setContentHeight(height);
      updateCard(data.id, { contentHeight: height });
    }
  }, [data.text]);

  return (
    <div style={{ minHeight: contentHeight }}>
      <div ref={textRef}>{data.text}</div>
    </div>
  );
};
```

**Warning signs:**
- Text truncated with ellipsis in cards
- Cards overlapping vertically within same cell
- Multiple cards in cell becoming illegible
- Mobile users complaining about inability to see full grid
- Empty rows taking up unnecessary space
- Users asking for row resize functionality

**Phase to address:**
Phase 1 (Journey Map Grid Foundation) - Decide between fixed vs flexible row architecture upfront. Phase 5 (Content Refinement) - Add manual resize handles and auto-calculation based on user feedback. Starting with fixed rows is simpler but creates UX debt that compounds as content variety increases.

---

### Pitfall 7: Cross-Step Canvas State Contamination

**What goes wrong:**
User completes Step 2 Stakeholder Mapping with quadrant canvas. Moves to Step 6 Journey Map with grid canvas. Returns to Step 2 - stakeholder post-its now have cellPosition properties they shouldn't have. Grid snapping behavior from Step 6 bleeds into Step 2 free-form canvas. Zustand store accumulates canvas state from all steps - loading Step 2 canvas also loads Step 6 grid columns, causing memory bloat. Undo/redo across step navigation breaks - undoing Step 6 action while on Step 2 canvas causes errors. Canvas performance degrades as user progresses through steps because store never clears old step data. AI context includes canvas state from wrong step - Step 6 AI receives Step 2 stakeholder positions, confusing placement logic.

**Why it happens:**
Single Zustand store holding all workshop state creates namespace collisions between steps. Canvas state for different steps has different schemas: Step 2 uses quadrants (free-form x,y), Step 4 uses quadrants (free-form x,y), Step 6 uses grid (cellId, rowId, colId). Storing all in flat structure causes schema conflicts. React components may not properly scope selectors - a canvas component designed for Step 2 accidentally reads Step 6 grid data from store. Navigation between steps doesn't clear previous step's canvas state from memory - user visits 5 steps, store accumulates 5 sets of canvas nodes. Undo/redo history is global - actions from Step 2 remain in history when user navigates to Step 6, causing confusion ("undo what?"). AI system reads canvas state from store without step filtering - if multiple steps have canvas data, AI might receive merged state from all steps.

**How to avoid:**
Use step-scoped state structure in Zustand:

```typescript
interface WorkshopStore {
  stepData: {
    [stepId: number]: {
      canvasItems: CanvasItem[];
      gridStructure?: GridStructure; // Only for grid steps
      quadrants?: QuadrantConfig; // Only for quadrant steps
      undoHistory: HistoryEntry[];
      redoHistory: HistoryEntry[];
    }
  };
  currentStepId: number;
}

const useCurrentStepCanvas = () => {
  return useWorkshopStore(
    state => state.stepData[state.currentStepId]?.canvasItems || []
  );
};
```

Implement step navigation cleanup:

```typescript
const navigateToStep = (targetStepId: number) => {
  // Save current step state to database
  await saveStepCanvas(currentStepId);

  // Clear current step from store (keep in DB, remove from memory)
  clearStepFromStore(currentStepId);

  // Load target step canvas
  const targetStepData = await loadStepCanvas(targetStepId);
  setStepData(targetStepId, targetStepData);

  setCurrentStepId(targetStepId);
};
```

Use step-specific undo/redo stacks:

```typescript
const useStepUndo = (stepId: number) => {
  const undo = useWorkshopStore(state => {
    const stepHistory = state.stepData[stepId]?.undoHistory || [];
    if (stepHistory.length === 0) return;

    const entry = stepHistory[stepHistory.length - 1];
    applyHistoryEntry(entry, 'undo');

    // Move from undo to redo stack
    moveHistoryEntry(stepId, 'undo-to-redo');
  });

  return undo;
};
```

Filter AI context to current step only:

```typescript
const getAICanvasContext = (stepId: number): string => {
  const stepData = store.getState().stepData[stepId];

  if (!stepData) return '';

  // Only include current step's canvas state
  return JSON.stringify({
    canvasItems: stepData.canvasItems,
    gridStructure: stepData.gridStructure, // May be undefined for non-grid steps
    // Exclude other steps' data
  });
};
```

Implement lazy loading for step canvas:

```typescript
const StepCanvas = ({ stepId }: { stepId: number }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasItems = useCurrentStepCanvas();

  useEffect(() => {
    // Only load canvas data when component mounts
    loadStepCanvas(stepId).then(() => setIsLoaded(true));

    return () => {
      // Cleanup: save and unload when unmounting
      saveStepCanvas(stepId);
      unloadStepCanvas(stepId);
    };
  }, [stepId]);

  if (!isLoaded) return <CanvasSkeleton />;

  return <ReactFlow nodes={canvasItems} />;
};
```

Use TypeScript discriminated unions for step-specific schemas:

```typescript
type StepCanvasData =
  | { stepType: 'quadrant'; items: QuadrantCanvasItem[] }
  | { stepType: 'grid'; items: GridCanvasItem[]; structure: GridStructure }
  | { stepType: 'freeform'; items: FreeformCanvasItem[] };

const getCanvasData = (stepId: number): StepCanvasData => {
  switch (stepId) {
    case 2:
    case 4:
      return { stepType: 'quadrant', items: [...] };
    case 6:
      return { stepType: 'grid', items: [...], structure: {...} };
    default:
      return { stepType: 'freeform', items: [...] };
  }
};
```

**Warning signs:**
- Canvas behavior changing unexpectedly when returning to previous steps
- Memory usage increasing as user progresses through steps
- Undo/redo referencing actions from different steps
- Canvas nodes from one step appearing in another step
- AI making placement suggestions for wrong step's canvas structure
- Database queries returning mixed canvas data from multiple steps

**Phase to address:**
Phase 1 (Journey Map Grid Foundation) - Step-scoped state architecture must be established before adding multiple canvas step types. Phase 2 (Steps 2 & 4 Retrofit) - Ensure existing quadrant canvas and new grid canvas don't contaminate each other. Cannot retrofit step scoping after building monolithic canvas state - requires store restructure and component refactoring.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using array indices for column/row IDs | Simpler code, no ID generation | Column reordering breaks all card positions, undo/redo fails | Never - always use stable semantic IDs |
| Fixed pixel-based grid cell sizing | Works on your laptop viewport | Breaks on mobile, different screen sizes, zoom levels | Only for desktop-only prototype with fixed viewport |
| Storing cell positions as array indices `[row, col]` | Easy to serialize | Fragile to structural changes, can't validate existence | Never - use semantic IDs with validation |
| Implementing snap-to-cell on every drag event | Feels "reactive" | Performance bottleneck, laggy drag, frame drops | Never - debounce or snap on drag end only |
| Reusing free-form canvas component for grid canvas | Less code duplication | Coordinate system confusion, behavior conflicts | Only if grid is purely visual overlay with no constraints |
| Migrating output→canvas by adding canvas alongside output | Backward compatible, no breaking changes | Dual source of truth, sync bugs, divergent state | Only for gradual rollout with feature flag, migrate fully ASAP |
| Locking grid structure during AI placement | Prevents stale reference bugs | Poor UX, user can't adjust while waiting for AI | Acceptable for MVP, remove lock + add validation later |
| Global undo/redo across all steps | Simpler implementation | Cross-step confusion, memory bloat | Never - scope undo/redo per step |
| Fixed swimlane row heights | Consistent visual alignment | Content overflow, mobile viewport issues | Only for static demo content, not user-generated |
| Treating canvas as separate module from output panel | Cleaner separation of concerns | Data duplication, sync complexity | Never - unified data model with dual projections |

---

## Integration Gotchas

Common mistakes when integrating grid/swimlane to existing WorkshopPilot.ai canvas system.

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|------------------|
| ReactFlow Snap Grid | Using built-in `snapGrid={[20, 20]}` for cells | Implement custom snap logic - built-in has multi-select bug #1579 |
| Zustand State | Adding separate grid state store | Extend existing workshop store with step-scoped canvas data |
| Coordinate System | Mixing pixel and cell coordinates without translation | Implement bidirectional coordinate conversion layer |
| Column Management | Using array indices as column identifiers | Use UUIDs or nanoid for stable, semantic column IDs |
| Output Panel Sync | Maintaining separate state for output and canvas | Single source of truth with derived UI projections |
| AI Placement | Assuming grid structure unchanged during AI stream | Validate placements against current grid, not request-time snapshot |
| Step Navigation | Keeping all steps' canvas data in memory | Lazy load on mount, persist on unmount, step-scoped state |
| Undo/Redo | Global history across all canvas operations | Per-step history stacks with step-scoped actions |
| Mobile Viewport | Fixed cell sizes in pixels | Responsive cell sizing with min/max constraints, viewport-relative units |
| Database Schema | Storing grid structure separately from canvas items | Unified schema with grid metadata + positioned items in single document |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Snap calculation on every drag event | Smooth with 3 cards, laggy with 20 | Debounce snap calculation (50ms) or snap on drag end only | >15 cards being dragged simultaneously |
| Recalculating all node positions on column add | Fast with 5 cards, freezes with 50 | Only recalculate affected column's cards, use requestAnimationFrame | >30 cards total, adding/removing columns frequently |
| Storing full grid structure in every undo history entry | Works during session, bloats DB on save | Store deltas (what changed) not full snapshots | >100 undo operations or >20 column operations |
| Loading all steps' canvas data on workshop load | Fine with 1-2 canvas steps, slow with 5+ | Lazy load per step, only current step in memory | Workshop with >3 canvas-enabled steps |
| Re-rendering entire grid on single card drag | Smooth with 10 cards, janky with 40 | Use React.memo on grid cells, Zustand selectors for specific cards | >25 cards in grid |
| Validating AI placements synchronously in main thread | Fast for 3 suggestions, blocks for 20 | Use Web Worker for validation or async batching | AI suggesting >10 cards at once |
| Fixed row heights with content overflow | Looks fine with short text, breaks with paragraphs | Implement flexible row heights based on content | First card with >100 chars of text |
| Global canvas store without step scoping | Works for 1 step, memory leak with 10 | Step-scoped state with lazy load/unload | User visits >5 canvas steps in session |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-sent grid structure without validation | User can inject invalid column IDs, breaking placement logic | Validate grid structure server-side, verify column/row IDs exist in DB |
| No rate limiting on column add/delete endpoints | Attacker spams column operations, exhausts DB writes | Rate limit per userId: 20 column operations/minute |
| Allowing unlimited grid complexity | User creates 1000-column grid, DOS other users loading same workshop | Limit max columns (50) and max cards per cell (20) server-side |
| No validation of card cellId references | User can reference non-existent cells, corrupt canvas state | Validate cellId matches existing grid structure before DB save |
| Exposing semantic column IDs in predictable format | Attacker can guess column IDs (col-1, col-2), manipulate other workshops | Use UUIDs or nanoid for unpredictable column identifiers |
| No CSRF protection on grid mutation endpoints | Cross-site request can add/delete columns | Verify Clerk session token in all grid mutation API routes |
| Allowing arbitrary card positioning in grid | User can position cards outside grid boundaries, corrupt layout | Clamp card positions to valid cell boundaries server-side |
| No ownership verification for grid operations | User A can modify User B's workshop grid structure | Verify workshop ownership via Clerk userId before allowing mutations |

---

## UX Pitfalls

Common user experience mistakes in grid/swimlane canvas integration.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback during grid snap | User unsure if card will snap or where it will land | Show ghost outline of target cell during drag |
| AI placing cards without animation | Cards appear instantly, jarring, user misses them | Animate card appearance with fade-in + position transition |
| Unclear which stage column is which | Labels truncated or not visible during scroll | Sticky header row with stage labels, always visible |
| No indication when grid is locked during AI | User tries to add column, button doesn't respond, confusion | Show "AI is placing cards..." banner, disable with tooltip explanation |
| Cards overlapping in same cell with no indication | User doesn't know there are 3 cards stacked in one cell | Show badge count on cell: "3 cards" + expand/collapse affordance |
| Column delete with no confirmation | User accidentally deletes stage with 10 cards, lost work | Confirmation dialog: "Delete 'Research' stage? 10 cards will move to 'Awareness'" |
| No undo for AI placement | AI places 8 cards, user wants to undo all at once | "Undo AI placement" button that removes all AI-placed cards in batch |
| Grid scrolls but user doesn't realize | Journey Map has 8 stages, only 4 visible, user thinks there are only 4 | Show horizontal scroll indicator: "← Swipe to see more stages →" |
| Row resize handle too small on touch | Desktop users can grab resize handle, mobile users can't | Larger touch target (44px min) with haptic feedback on mobile |
| No empty state when Journey Map initialized | Blank grid with no guidance, user unsure what to do | Show empty state: "Add stages to map your customer journey" + hint cards |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Grid Coordinate Translation:** Often missing bidirectional pixel↔cell conversion — verify cards snap to correct cells at all zoom levels (50%, 100%, 250%)
- [ ] **Semantic Column IDs:** Often missing stable identifiers — verify column add/delete/reorder doesn't break card positions
- [ ] **Multi-Select Snap:** Often missing group-aware snap logic — verify dragging 3 cards maintains alignment, no scatter
- [ ] **Output↔Canvas Sync:** Often missing single source of truth — verify editing in output panel updates canvas and vice versa
- [ ] **AI Placement Validation:** Often missing grid structure validation — verify AI placement works if user modifies grid during AI stream
- [ ] **Step-Scoped State:** Often missing lazy load/unload — verify navigating between steps doesn't leak memory or cause cross-contamination
- [ ] **Dynamic Row Heights:** Often missing content-based sizing — verify long text cards don't overflow row boundaries
- [ ] **Column Operation Undo:** Often missing structural undo — verify undoing column delete restores column AND cards that were in it
- [ ] **Grid Structure Locking:** Often missing concurrent modification prevention — verify simultaneous user + AI grid changes don't corrupt state
- [ ] **Mobile Grid Sizing:** Often missing responsive cell dimensions — verify grid usable on 375px mobile viewport, not just desktop
- [ ] **Cross-Step Schema:** Often missing type safety — verify quadrant canvas (Step 2) and grid canvas (Step 6) don't share incompatible state
- [ ] **Snap Performance:** Often missing debouncing — verify dragging 20+ cards doesn't drop frames or lag

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Grid Coordinate Confusion | MEDIUM | Implement coordinate translation layer, migrate existing workshops to add cellPosition, test at multiple zoom levels (1-2 days) |
| Dynamic Column Breaks | MEDIUM | Refactor to semantic IDs, write migration script for existing workshops, update all column references (1-2 days) |
| Snap-to-Cell Conflicts | LOW | Add snap debouncing, implement snap threshold with dead zone, tune based on user feedback (4-6 hours) |
| Output→Canvas Inconsistency | HIGH | Unify schemas, establish single source of truth, migrate existing workshops, refactor both UIs (3-4 days) |
| Stale AI Placements | MEDIUM | Add grid versioning, implement validation layer, add fallback logic for missing columns (1 day) |
| Row Height Rigidity | MEDIUM | Implement flexible row heights, add manual resize handles, migrate existing fixed-height data (1-2 days) |
| Cross-Step Contamination | HIGH | Restructure Zustand store to step-scoped, implement lazy load/unload, refactor all canvas components (2-3 days) |
| Multi-Select Snap Bug | MEDIUM | Disable built-in snapGrid, implement custom group-aware snap logic, test extensively (1 day) |
| Column Delete Data Loss | LOW | Add confirmation dialogs, implement card migration strategy, improve undo for structural changes (4-6 hours) |
| Mobile Grid Unusable | MEDIUM | Implement responsive cell sizing, adjust row heights for viewport, test on real devices (1-2 days) |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Grid Coordinate Confusion | Phase 1: Journey Map Grid Foundation | Pixel↔cell conversion works correctly, multi-select snap maintains alignment |
| Dynamic Column Breaks | Phase 1: Journey Map Grid Foundation | Column add/delete/reorder preserves card positions, undo works correctly |
| Snap-to-Cell Conflicts | Phase 1: Journey Map Grid Foundation | Drag performance >30fps with 20+ cards, snap feels responsive not laggy |
| Output→Canvas Inconsistency | Phase 2: Steps 2 & 4 Retrofit | Editing in either view updates both, no sync bugs, migration script tested |
| Stale AI Placements | Phase 3: AI Suggest-Then-Confirm | AI placement validation passes, grid changes during stream handled gracefully |
| Row Height Rigidity | Phase 4: Content Refinement | Long text cards fit within rows, mobile viewport doesn't overflow |
| Cross-Step Contamination | Phase 1: Journey Map Grid Foundation | Step navigation doesn't leak state, memory usage stable across steps |
| Multi-Select Snap Bug | Phase 1: Journey Map Grid Foundation | Multi-select drag works without scatter, custom snap logic tested |
| Column Delete Data Loss | Phase 1: Journey Map Grid Foundation | Confirmation dialogs prevent accidents, undo restores deleted columns + cards |
| Mobile Grid Unusable | Phase 5: Mobile Optimization | Grid usable on 375px viewport, responsive row/cell sizing works |

---

## Sources

**ReactFlow Grid/Snap:**
- [ReactFlow SnapGrid Documentation](https://reactflow.dev/api-reference/types/snap-grid)
- [GitHub Issue #1579: MultiSelection-Drag breaks Snap-To-Grid](https://github.com/wbkd/react-flow/issues/1579)
- [GitHub Issue #2440: Toggle between old snapGrid and new one](https://github.com/wbkd/react-flow/issues/2440)
- [ReactFlow Helper Lines Example](https://reactflow.dev/examples/interaction/helper-lines)

**ReactFlow Layout & Structure:**
- [ReactFlow Auto Layout](https://reactflow.dev/examples/layout/auto-layout)
- [ReactFlow Dynamic Layouting](https://reactflow.dev/examples/layout/dynamic-layouting)
- [ReactFlow Sub Flows](https://reactflow.dev/learn/layouting/sub-flows)
- [ReactFlow Node Extent Parent Boundaries](https://reactflow.dev/api-reference/types/node)

**ReactFlow State Management:**
- [ReactFlow Using State Management Library](https://reactflow.dev/learn/advanced-use/state-management)
- [ReactFlow Common Errors](https://reactflow.dev/learn/troubleshooting/common-errors)
- [GitHub Discussion #3861: useReactFlow within zustand actions](https://github.com/xyflow/xyflow/discussions/3861)

**ReactFlow Performance:**
- [ReactFlow Performance Guide](https://reactflow.dev/learn/advanced-use/performance)
- [GitHub Discussion #4975: Improve performance with large number of nodes](https://github.com/xyflow/xyflow/discussions/4975)
- [GitHub Issue #4711: Performance issues with custom nodes](https://github.com/xyflow/xyflow/issues/4711)

**Swimlane Diagrams:**
- [GitHub Discussion #2359: Implementing swim lanes in free version](https://github.com/xyflow/xyflow/discussions/2359)
- [reactflow-swimlane Package](https://www.npmjs.com/package/@liangfaan/reactflow-swimlane)
- [Medium: Swimlane Diagram UX Designer's Secret Weapon](https://sepantapouya.medium.com/swimlane-diagram-a-ux-designers-secret-weapon-for-order-in-chaos-fb9aa00927d5)

**Canvas Coordinates & Snapping:**
- [HTML Canvas Coordinates - W3Schools](https://www.w3schools.com/graphics/canvas_coordinates.asp)
- [Konva Objects Snapping](https://konvajs.org/docs/sandbox/Objects_Snapping.html)
- [Medium: Snap to grid with KonvaJS](https://medium.com/@pierrebleroux/snap-to-grid-with-konvajs-c41eae97c13f)
- [ReactFlow Coordinate System Discussion #4311](https://github.com/xyflow/xyflow/discussions/4311)

**Data Migration:**
- [Miro: Data Migration Process Flow Diagrams](https://miro.com/diagramming/data-migration-process-flow-diagram/)
- [dbt Canvas: Analyst-driven data transformation](https://www.getdbt.com/blog/dbt-canvas-is-ga)
- [What is Data Transformation - Estuary](https://estuary.dev/blog/what-is-data-transformation/)

**Journey Mapping:**
- [What is a Swimlane Diagram - Miro](https://miro.com/diagramming/what-is-a-swimlane-diagram/)
- [Interaction Design Foundation: Journey Mapping](https://www.interaction-design.org/literature/article/top-things-to-learn-from-ixdf-journey-mapping-course)

**Existing WorkshopPilot Research:**
- .planning/research/PITFALLS.md (Canvas/Post-It Integration v1.1)
- .planning/codebase/ARCHITECTURE.md (Current system architecture)

---

*Pitfalls research for: Grid/Swimlane Canvas with AI Placement (WorkshopPilot.ai v1.2)*
*Researched: 2026-02-11*
*Confidence: MEDIUM-HIGH — Based on ReactFlow official documentation, GitHub issues, community discussions, and existing v1.1 Canvas Foundation learnings. Grid-specific patterns extrapolated from general ReactFlow best practices.*

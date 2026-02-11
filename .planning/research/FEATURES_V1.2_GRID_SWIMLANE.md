# Feature Research: Grid/Swimlane Canvas Layouts

**Domain:** Structured canvas with grid/swimlane layouts for journey mapping
**Milestone:** v1.2 Canvas Whiteboard (Step 6 Journey Map + Steps 2 & 4 retrofit)
**Researched:** 2026-02-11
**Confidence:** MEDIUM

## Context

This research focuses ONLY on **grid/swimlane canvas features** for WorkshopPilot v1.2 milestone. The app already has:
- Full 10-step AI-powered design thinking facilitation (v1.0 shipped)
- ReactFlow canvas with post-it nodes (v1.1 shipped): create, edit, drag, color-code, group/ungroup, undo/redo
- Split-screen layout with chat left, canvas+output right
- Quadrant canvases for Steps 2 (Power × Interest) and 4 (Empathy Map)
- Bidirectional AI-canvas: AI reads canvas state, suggests items via [CANVAS_ITEM] markup with action buttons
- Canvas persistence with auto-save to stepArtifacts JSONB

**New for v1.2:**
- Step 6 Journey Map: grid with **fixed swimlane rows** (Actions, Thoughts, Feelings, Pain Points, Opportunities) + **user-addable stage columns** (Awareness, Consideration, etc.). Items snap into cells.
- **AI suggest-then-confirm**: AI proposes content in specific cells, highlights target cell, user confirms or drags elsewhere
- **Steps 2 & 4 retrofit**: structured output fields (stakeholder list, themes, pains/gains) render as organized canvas nodes, replacing output panel content

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Snap to cell boundaries** | Standard in all whiteboard grids (Miro, FigJam, Lucidspark) | MEDIUM | ReactFlow `snapGrid` snaps to coordinates, not cells. Need custom snap logic to map positions → cell boundaries. Industry issue: Miro snaps to cell CENTER not edges (user frustration). **Build cell-boundary snap.** |
| **Visual cell highlighting on drag** | Users need to see WHERE item will land before dropping | MEDIUM | Highlight target cell background on drag-over. Standard: background color change (light blue/yellow), outline (2px border). Not built into ReactFlow - requires custom drag handlers + cell overlay component. |
| **Fixed row labels** | Journey maps have standard row structure (Actions, Thoughts, Feelings, Pain Points, Opportunities) | LOW | Swimlane row labels on left side, always visible, don't scroll. Simple overlay component positioned absolutely. FigJam/Miro use sticky row headers. |
| **Add/remove columns** | Journey stages vary by project (3-7 stages typical) | MEDIUM | UI: "+Add Stage" button in header, "×" delete on hover. Complexity: recalculate snap grid, reposition nodes if column removed, handle min 2 columns. Miro/FigJam use table structure with add/remove column actions. |
| **Column header labels** | Each stage column has name (Awareness, Consideration, Purchase, etc.) | LOW | Editable text in column header. Click to edit inline. Persist with canvas state. Standard in all journey map tools. |
| **Resize columns** | Different stages may need different widths (early stages often wider) | MEDIUM | Drag handles on column borders. Miro pattern: hover between columns shows resize cursor, drag to adjust width. Requires recalculating snap grid regions dynamically. ReactFlow doesn't support this natively. |
| **Cell-aware item placement** | Items know they're in specific row × column, not just positioned | MEDIUM | Store `{row: string, column: string}` metadata with each node. Critical for AI placement logic ("add to Pain Points column in Consideration stage"). Map node position ↔ cell coordinates bidirectionally. |
| **Visual grid structure** | Clear cell boundaries, swimlane separation | LOW | ReactFlow Background component (lines variant) + custom swimlane overlay. Layer multiple backgrounds for effect: subtle grid + bold row separators. Miro/FigJam use similar layering approach. |
| **Prevent item overlap in cell** | Multiple items in same cell should stack/organize, not overlap | MEDIUM | Auto-stack items vertically within cell or use flow layout. Miro doesn't enforce this (users manually arrange). **Opportunity to improve UX**: auto-organize items within cell boundary. |
| **Scroll overflow for tall grids** | Journey maps with 5+ rows need vertical scroll | LOW | ReactFlow viewport handles this. Ensure row labels stay fixed (sticky positioning) while content scrolls. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI suggest-then-confirm placement** | AI proposes WHERE (specific cell) + WHAT (content), user confirms | HIGH | **Unique to WorkshopPilot.** Flow: (1) AI suggests "Pain Point: Frustration with checkout" for cell [Pain Points × Consideration], (2) highlight target cell with pulsing border, (3) show action button "Add to Canvas", (4) user confirms → appears in cell, OR user drags to different cell. Microsoft Copilot adds sticky notes but doesn't suggest specific placement. Confluence Smart Create suggests content but not cell. **Novel interaction pattern.** |
| **Cell highlighting on AI suggestion** | Visual feedback shows EXACTLY where AI wants to place item | MEDIUM | When AI references cell in chat, highlight cell on canvas (yellow glow, pulsing border). Helps user understand AI reasoning. Jeda.ai has "in-place discussion" per object but not pre-placement highlighting. **Bridges chat ↔ canvas.** |
| **Structured output → canvas migration** | Output panel fields auto-populate canvas in organized layout | HIGH | Example: Step 2 stakeholder list in output → renders as canvas nodes in quadrants. Step 4 pains/gains lists → canvas nodes in empathy map regions. **Replaces manual copy-paste workflow.** Requires mapping output schema to canvas layout. Confluence has similar concept (generate content → whiteboard) but not methodology-specific. |
| **Swimlane template presets** | Pre-configured row sets for different journey types (B2C, B2B, service design) | MEDIUM | Miro/FigJam rely on static templates. **Dynamic templates based on workshop context** would speed setup. Example: B2C preset (Actions, Thoughts, Emotions, Pain Points, Opportunities), B2B preset (Business Actions, Stakeholder Concerns, Blockers, Opportunities, Next Steps). Leverages existing step configuration system. |
| **Cell conversation threads** | Each cell can have its own AI discussion/reasoning | MEDIUM | Click cell → open chat focused on that cell. Example: Discuss "Why is checkout a pain point in Consideration stage?" in cell context. Jeda.ai has "in-place discussion" per object. For journey map: **discuss specific touchpoint pain points in cell.** Enhances AI facilitation. Could reuse existing chat infrastructure with cell context injection. |
| **Cell completion indicators** | Visual cues showing which cells are filled vs empty | LOW | Cell background shading: empty (white), 1 item (light gray), 2+ items (medium gray). Or dot indicators in cell corner. Helps users see coverage at a glance. **Unique to structured canvases.** Gamification element. |
| **AI gap detection** | AI notices empty critical cells and prompts user | MEDIUM | Example: "I notice you have pain points in Awareness and Purchase stages, but not Consideration. Should we explore that?" **Proactive facilitation.** Requires AI to analyze canvas state by cell and prompt strategically. Builds on existing AI-canvas awareness. |
| **Stage column suggestions** | AI suggests typical stages based on problem statement | LOW | User adds first column manually, AI suggests common next stages. B2C: Awareness → Consideration → Purchase → Onboarding → Usage. B2B: Discovery → Evaluation → Decision → Implementation → Adoption. **Speeds setup.** Uses LLM with journey mapping domain knowledge. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **User-defined custom rows** | "Let users customize everything for their journey" | Breaks AI placement assumptions, creates analysis paralysis, undermines methodology structure. Journey maps have **established patterns** (Actions, Thoughts, Feelings, Pain Points, Opportunities per Nielsen Norman Group). | **Offer 2-3 preset swimlane configurations** per step. B2C, B2B, Service Design presets. Fixed rows = AI can reason about structure. |
| **Auto-arrange/auto-layout** | "AI should organize the canvas automatically" | Removes user agency, creates "magic" that feels wrong when it fails, difficult to undo gracefully. Users lose spatial memory/mental model. | **AI suggests placement, user confirms.** Let AI highlight cells and propose organization, but require explicit confirmation. Preserve user control. |
| **Real-time collaborative cursors for AI** | "Show AI 'thinking' on canvas like multiplayer cursors" | Gimmicky, distracting, doesn't add functional value, increases complexity. AI isn't a simultaneous user. | **Use chat-based AI responses with [CANVAS_ITEM] markup** (already implemented). Show cell highlights when AI references cells. Clear, non-distracting. |
| **Infinite nested grids** | "Grids within grids within grids for sub-journeys" | Complexity explosion, mobile/small screen nightmare, violates design thinking methodology structure. Journey maps are **intentionally flat**. | **Keep one grid level.** Use grouping (already implemented) for sub-organization within cells. Or use connection lines between cells for dependencies. |
| **Merge/split cells like spreadsheets** | Users expect Excel-like cell operations from table-like appearance | Journey maps **don't use merged cells** - breaks the stage × lane structure. Adds complexity for minimal value. Cell merging creates ambiguous row/column identity. | **Use spanning items** that occupy multiple cells visually but stay logically in one cell. Or use connection lines between cells to show cross-stage relationships. |
| **Freeform items outside grid** | "Some items don't fit in cells" | Violates grid structure, creates visual clutter, breaks AI cell reasoning. If items don't fit in cells, **grid is wrong structure** for that step. | **Grid structure is step-specific.** Step 6 uses grid. Steps with freeform needs use freeform canvas (Step 4). Don't mix paradigms in same step. |
| **Variable row heights** | "Different rows need different space" | Complicates cell snapping, creates alignment issues, visual inconsistency. Journey maps work with **uniform row heights**. | **Fixed row heights.** If content doesn't fit, item can expand vertically within cell, or use scrollable cell content. Keep grid structure predictable. |

## Feature Dependencies

```
[Visual grid structure]
    └──requires──> ReactFlow Background component (lines variant)
    └──requires──> Custom swimlane overlay (row labels, column headers)

[Cell-aware item placement]
    └──requires──> [Visual grid structure]
    └──requires──> [Snap to cell boundaries]
    └──requires──> Position ↔ cell coordinate mapping logic

[Snap to cell boundaries]
    └──requires──> [Visual grid structure]
    └──requires──> Dynamic grid calculation based on column widths

[Visual cell highlighting on drag]
    └──requires──> [Cell-aware item placement]
    └──requires──> Custom drag handlers (ReactFlow onNodeDrag)

[AI suggest-then-confirm placement]
    └──requires──> [Cell-aware item placement]
    └──requires──> [Visual cell highlighting on drag]
    └──requires──> [Cell highlighting on AI suggestion]
    └──requires──> Existing [CANVAS_ITEM] markup + action buttons

[Add/remove columns dynamically]
    └──requires──> [Visual grid structure]
    └──affects──> [Snap to cell boundaries] (grid recalculation)
    └──affects──> [Resize columns] (interdependent)

[Resize columns]
    └──requires──> [Visual grid structure]
    └──affects──> [Snap to cell boundaries] (grid recalculation)
    └──affects──> [Add/remove columns] (interdependent)

[Structured output → canvas migration]
    └──requires──> [Cell-aware item placement]
    └──enhances──> [AI suggest-then-confirm placement]
    └──requires──> Output schema → canvas layout mapping

[Cell conversation threads]
    └──requires──> [Cell-aware item placement]
    └──enhances──> [AI suggest-then-confirm placement]
    └──requires──> Chat context injection with cell metadata

[AI gap detection]
    └──requires──> [Cell-aware item placement]
    └──requires──> AI analyzes canvas state by cell
```

### Dependency Notes

- **Cell-aware placement is foundation:** Without row/column metadata, grid is just visual. All advanced features require cell awareness.
- **Dynamic columns affect snap grid:** When user adds/removes/resizes columns, snap grid regions must recalculate. ReactFlow's `snapGrid` is static tuple `[x, y]`, so need **custom snap logic** with dynamic regions.
- **AI placement requires cell highlighting:** AI can't just say "add to cell" in text - must visually highlight target cell so user understands.
- **Structured output migration enhances AI placement:** They work together - output provides content, AI placement suggests organization in cells, user confirms.
- **Resize + Add/Remove columns are interdependent:** Both affect column widths and grid layout. Handle together in same state management.

## MVP Definition

### Launch With (v1.2 - Step 6 Journey Map)

Minimum viable product - what's needed to validate grid canvas concept.

- [x] **Visual grid structure** - Fixed swimlane rows (Actions, Thoughts, Feelings, Pain Points, Opportunities) + stage columns, ReactFlow Background + custom overlay
- [x] **Fixed row labels** - Swimlane row names on left, always visible (sticky positioning)
- [x] **Column header labels** - Editable stage names (Awareness, Consideration, etc.), inline edit
- [x] **Add/remove columns** - "+Add Stage" button, "×" delete on hover, min 2 columns, max 10 columns
- [x] **Snap to cell boundaries** - Custom snap logic maps positions → cell boundaries (NOT cell centers like Miro)
- [x] **Cell-aware item placement** - Store `{row, column}` metadata with nodes, map positions ↔ cells bidirectionally
- [x] **Visual cell highlighting on drag** - Highlight target cell background (light blue) on drag-over, clear on drop/exit
- [x] **AI suggest-then-confirm placement** - AI suggests cell + content, highlight target cell (pulsing yellow border), action button "Add to Canvas", user confirms or drags elsewhere
- [x] **Cell highlighting on AI suggestion** - When AI references cell in chat ("add to Pain Points in Consideration"), highlight cell on canvas

### Add After Validation (v1.3+)

Features to add once core grid canvas is working.

- [ ] **Resize columns** - Trigger: User feedback on column width constraints. Drag handles on column borders, recalculate snap grid.
- [ ] **Structured output → canvas migration** - Trigger: After Step 6 works, retrofit Steps 2 & 4. Output fields → canvas nodes in organized layout.
- [ ] **Cell conversation threads** - Trigger: Users want to discuss specific pain points/opportunities in cell context. Click cell → focused chat.
- [ ] **Swimlane template presets** - Trigger: Multiple journey map types emerge from usage patterns. B2C, B2B, Service Design presets.
- [ ] **Cell completion indicators** - Trigger: Users ask "Did I fill everything out?" Visual coverage indicators (empty/filled cells).
- [ ] **AI gap detection** - Trigger: Users miss important cells. AI notices empty critical cells and prompts.
- [ ] **Stage column suggestions** - Trigger: Users unsure what stages to add. AI suggests typical stages based on problem statement.
- [ ] **Prevent item overlap in cell** - Trigger: Users manually stacking items gets tedious. Auto-stack items vertically within cell.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Context-aware grid layouts for other steps** - Why defer: Need to validate grid concept first, then expand to other step types (e.g., timeline grids for Step 5, impact/effort matrix for Step 8)
- [ ] **Multi-select within cells** - Why defer: Edge case, can use existing multi-select + drag across cells
- [ ] **Cell-level permissions/locking** - Why defer: Multiplayer feature, not needed until FFP milestone (real-time collaboration)
- [ ] **Export grid as structured data** - Why defer: CSV/JSON export of grid structure + content. Useful for reporting but not critical for v1.2 validation.
- [ ] **Variable row heights** - Why defer: Adds complexity, uniform heights work for 90% of cases. Re-evaluate if users struggle with content fit.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Visual grid structure | HIGH | LOW | P1 |
| Fixed row labels | HIGH | LOW | P1 |
| Column header labels | HIGH | LOW | P1 |
| Add/remove columns | HIGH | MEDIUM | P1 |
| Snap to cell boundaries | HIGH | MEDIUM | P1 |
| Cell-aware item placement | HIGH | MEDIUM | P1 |
| Visual cell highlighting on drag | HIGH | MEDIUM | P1 |
| AI suggest-then-confirm placement | HIGH | HIGH | P1 |
| Cell highlighting on AI suggestion | MEDIUM | LOW | P1 |
| Resize columns | MEDIUM | MEDIUM | P2 |
| Structured output → canvas migration | HIGH | HIGH | P2 |
| Cell conversation threads | MEDIUM | MEDIUM | P2 |
| Swimlane template presets | MEDIUM | MEDIUM | P2 |
| Cell completion indicators | LOW | LOW | P2 |
| AI gap detection | MEDIUM | MEDIUM | P2 |
| Stage column suggestions | MEDIUM | LOW | P2 |
| Prevent item overlap in cell | MEDIUM | MEDIUM | P2 |
| Context-aware grids (expand) | MEDIUM | HIGH | P3 |
| Multi-select within cells | LOW | LOW | P3 |
| Export grid as structured data | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for Step 6 launch (v1.2) - validate grid canvas concept
- P2: Should have for v1.3+ - enhance validated features
- P3: Nice to have for v2+ - major scope additions or edge cases

## Competitor Feature Analysis

| Feature | Miro | FigJam | Lucidspark | WorkshopPilot v1.2 |
|---------|------|--------|------------|-------------------|
| **Grid/Swimlane Structure** | Tables with rows/columns, manual swimlane shapes, templates | Tables, pre-built journey map templates with phases | Journey map templates with stages | **ReactFlow Background + custom swimlane overlay. Fixed rows (methodology-driven), dynamic columns (user context).** |
| **Snap Behavior** | Snap to grid (toggle), **snaps to cell CENTER not edges** (user frustration documented) | Snap to grid, smart guides, auto-alignment | Snap to grid, alignment guides | **Custom cell-boundary snap logic. Snap to edges, not centers. Addresses Miro pain point.** |
| **AI Placement** | Copilot adds sticky notes to canvas, **no specific cell placement** | Smart Create suggests content, **user places manually** | No AI placement | **AI suggests cell + content, highlights target cell, user confirms or drags elsewhere. Novel suggest-then-confirm pattern.** |
| **Dynamic Structure** | Add/remove rows & columns, resize via drag handles | Add/remove rows & columns, duplicate rows/columns | Add/remove columns, fixed templates | **Fixed rows (journey map structure), dynamic columns (stages), resize columns via handles. Constrained flexibility.** |
| **Visual Feedback** | Background color changes, object snapping guides | Hover effects, drop zone highlighting, insertion markers | Alignment guides, smart spacing | **Cell highlight on drag-over (light blue), pulsing border on AI suggestion (yellow), action buttons on suggested items. Multi-modal feedback.** |
| **Output Integration** | Manual export to other tools, **no output panel concept** | Copy to Figma designs, **no structured output** | Export to Lucidchart, **no structured output** | **Output panel fields → canvas nodes. Bidirectional: canvas state reflects in output, output populates canvas. Novel integration.** |
| **Row/Column Management** | Drag to resize, add/remove via context menu | Add/remove via header buttons, resize via drag | Template-based, limited customization | **"+Add Stage" button, "×" delete on hover, inline edit column headers. Min 2, max 10 columns.** |
| **Cell Awareness** | Objects positioned freely, **no cell metadata** | Objects can be in tables but **no logical cell binding** | Template-based positioning, **no cell metadata** | **Nodes store `{row, column}` metadata. Position ↔ cell mapping. Critical for AI reasoning about structure.** |

**Key differentiators for WorkshopPilot v1.2:**

1. **AI-driven cell placement:** AI suggests specific cell + content, user confirms. Competitors don't suggest WHERE, only WHAT.
2. **Methodology-enforced structure:** Fixed rows based on design thinking best practices (NN/G journey map structure). Prevents "blank canvas paralysis."
3. **Cell-aware AI reasoning:** AI understands grid structure, references cells logically in conversation. Enables proactive facilitation.
4. **Bidirectional output ↔ canvas:** Output panel fields populate canvas, canvas state updates output. Unique to WorkshopPilot.
5. **Cell-boundary snap (not center):** Addresses documented Miro user frustration. Better UX.

## Existing Canvas Dependencies (Builds On v1.1)

WorkshopPilot v1.1 already has ReactFlow canvas with:

- **Post-it nodes:** Create, edit, drag, color-code, group/ungroup, undo/redo
- **Quadrant canvases:** Step 2 (Power × Interest), Step 4 (Empathy Map) with Background component
- **Bidirectional AI-canvas:** AI reads canvas state, suggests items via [CANVAS_ITEM] markup, users click action buttons to add
- **Canvas persistence:** Auto-save to stepArtifacts JSONB column in Postgres
- **ReactFlow components:** Background (lines/dots), custom nodes, viewport controls (pan/zoom)

**Grid/swimlane features build on:**
- ReactFlow Background (lines variant) for grid visual
- Existing node creation/editing UX (post-its)
- Existing [CANVAS_ITEM] markup pattern for AI suggestions
- Existing action button pattern (confirm/reject)
- Existing auto-save infrastructure

**New capabilities needed for v1.2:**
- Custom drag handlers for cell-aware drop zones (ReactFlow `onNodeDrag`, `onNodeDragStop`)
- Cell metadata (`{row: string, column: string}`) in node data
- Position → cell coordinate mapping logic (bidirectional)
- Column add/remove UI (header controls)
- Column resize interaction (drag handles on borders)
- Swimlane row labels (custom overlay component, sticky positioning)
- Column header labels (editable text, inline edit)
- Cell highlighting component (overlay, show/hide on drag/AI suggestion)
- AI cell selection algorithm (suggest specific row × column based on content)
- Dynamic snap grid calculation (column widths change → recalculate snap regions)

## Journey Mapping Best Practices (Design Thinking)

### Standard Journey Map Structure (Nielsen Norman Group)

- **5 key components:**
  1. Actor (persona)
  2. Scenario + Expectations (goal, context)
  3. Journey Phases (high-level stages)
  4. Actions, Mindsets, Emotions (per phase)
  5. Opportunities (insights, recommendations)

- **Typical layout:**
  - Top: Persona, scenario, expectations
  - Middle: High-level phases (Awareness, Consideration, Purchase, etc.)
  - Rows: User actions, thoughts, emotions (swimlanes)
  - Bottom: Opportunities, insights, ownership

- **Emotions component:** Plotted as line across phases, showing emotional "ups" and "downs"

### Swimlane Row Patterns

**B2C Journey Map:**
- Actions (what user does)
- Thoughts (what user thinks)
- Feelings (emotions: frustrated, excited, confused)
- Pain Points (friction, blockers)
- Opportunities (improvements, innovations)

**B2B Journey Map:**
- Business Actions (org-level activities)
- Stakeholder Concerns (decision-maker thoughts)
- Blockers (organizational friction)
- Opportunities (value creation points)
- Next Steps (required actions)

**Service Design Blueprint:** (more complex, defer to v2+)
- Customer Actions
- Frontstage Actions (visible service interactions)
- Backstage Actions (invisible support processes)
- Support Processes (systems, tools)

### Stage Column Patterns

**E-commerce:** Discover → Try → Buy → Use → Seek Support

**Luxury Purchase:** Engagement → Education → Research → Evaluation → Justification

**B2B SaaS:** Purchase → Adoption → Retention → Expansion → Advocacy

**Healthcare:** Awareness → Scheduling → Pre-Visit → Visit → Post-Care → Follow-Up

### Key Principles

1. **Phases are high-level:** Not every micro-interaction, just major stages
2. **Emotions as single line:** Continuous plot, not discrete cells (defer to v2+ for emotion line feature)
3. **Opportunities at bottom:** After mapping current state, identify improvements
4. **Cross-functional ownership:** Assign teams to opportunities (defer to multiplayer features)

## Technical Considerations

### ReactFlow Grid Implementation

**ReactFlow Background component:**
- Supports `variant="lines"` for grid lines
- Props: `gap={[x, y]}`, `color="#ddd"`, `size={1}` (line width)
- Can layer multiple Background components for effect

**Custom swimlane overlay needed:**
- Absolute-positioned div over ReactFlow canvas
- CSS Grid or Flexbox for row/column structure
- Z-index below nodes, above background
- Pointer-events: none (don't block node interactions)

**Cell coordinate system:**
```typescript
interface Cell {
  row: string; // "Actions" | "Thoughts" | "Feelings" | "Pain Points" | "Opportunities"
  column: string; // User-defined stage name
}

interface CellBounds {
  x: number;      // Left edge
  y: number;      // Top edge
  width: number;  // Column width
  height: number; // Row height (fixed)
}

// Mapping functions
function getCellBounds(row: string, column: string): CellBounds;
function positionToCell(x: number, y: number): Cell;
function cellToPosition(row: string, column: string): { x: number; y: number };
```

**Dynamic snap grid calculation:**
- ReactFlow `snapGrid` is static `[x, y]` tuple
- Need custom `onNodeDrag` handler:
  1. Calculate which cell node is over
  2. Snap to cell boundary coordinates
  3. Update node position
- Alternative: Use `snapGrid` with smallest common denominator, then snap to cell multiples

### Performance Considerations

- **Grid complexity:** 5 rows × 7 columns = 35 cells max. Low complexity.
- **Cell highlighting:** Toggle CSS class on cell div, no re-render needed. Very fast.
- **Dynamic column widths:** Recalculate snap regions on column add/remove/resize. Debounce resize for performance.
- **Node count:** Journey maps typically 20-40 items. Well within ReactFlow performance range (<1000 nodes).

### Mobile Considerations (Deferred to v2+)

- Grid canvas is **desktop-first** for v1.2
- Mobile: horizontal scroll for columns, vertical scroll for rows
- Touch interactions: tap to select, long-press to drag, pinch-to-zoom
- Column resize challenging on mobile (small drag targets)
- Defer mobile optimization until desktop validated

## Open Questions for Development

1. **Row height:** Fixed pixel height (e.g., 150px) or percentage-based (20% of viewport)?
2. **Column width defaults:** All equal widths initially, or first column wider (common pattern)?
3. **Min/max column widths:** Prevent resize below 100px, above 500px?
4. **Cell highlight timing:** Instant on drag-over, or 100ms delay to reduce flicker?
5. **AI cell suggestion format:** Chat markup like `[CELL:Pain Points:Consideration]` or implicit from content analysis?
6. **Overflow handling:** If item content exceeds cell height, expand cell or scroll within cell?
7. **Column delete behavior:** What happens to items in deleted column? Move to adjacent column or delete items?
8. **Preset row names:** Editable or fixed? Allow user to rename "Actions" to "User Actions"?
9. **Empty grid state:** Show placeholder text in empty cells ("Add pain points here") or leave blank?
10. **Cell conversation threads UX:** Modal overlay, sidebar panel, or inline chat bubble?

## Sources

**Whiteboard Tool Grid/Swimlane Research:**
- [Miro Snap to Grid](https://community.miro.com/ideas/snap-to-grid-205) - Documents user frustration with cell center snapping
- [Miro Swimlane Diagrams](https://miro.com/diagramming/what-is-a-swimlane-diagram/) - Swimlane structure and use cases
- [Miro Tables](https://help.miro.com/hc/en-us/articles/22760922335506-Tables) - Table row/column management
- [FigJam Tables](https://help.figma.com/hc/en-us/articles/12583849250199-Tables-in-FigJam) - FigJam table features
- [FigJam Journey Map Templates](https://www.figma.com/resource-library/user-journey-map/) - Pre-built journey map structures
- [Microsoft Whiteboard Snap Features](https://support.microsoft.com/en-us/office/tips-and-tricks-for-microsoft-whiteboard-eba14325-51f2-41d1-8cec-ff8cb56d31b1) - Snap-to-grid best practices
- [Lucidspark Virtual Whiteboard](https://lucid.co/lucidspark) - Journey mapping capabilities

**AI-Assisted Canvas Patterns:**
- [Microsoft Copilot in Whiteboard](https://support.microsoft.com/en-us/office/welcome-to-copilot-in-whiteboard-17e8cddb-9bae-4813-bd2b-a9f108b0b43e) - AI suggests sticky notes, user adds
- [Atlassian Confluence Smart Create](https://support.atlassian.com/confluence-cloud/docs/smart-create-is-your-ai-powered-teammate-for-whiteboards/) - AI generates content, context-aware suggestions
- [ClickUp AI Whiteboards](https://clickup.com/blog/ai-whiteboard-tools/) - AI analyzes relationships, suggests structures
- [Jeda.ai AI Whiteboard](https://www.jeda.ai/ai-whiteboard) - In-place discussions per object
- [Boardmix AI Canvas](https://boardmix.com/ai-whiteboard/) - AI summarizes sticky notes, generates mind maps

**Journey Mapping Best Practices:**
- [Nielsen Norman Group: Journey Mapping 101](https://www.nngroup.com/articles/journey-mapping-101/) - **AUTHORITATIVE SOURCE** for journey map structure
- [UX Mapping Methods Compared (NN/G)](https://www.nngroup.com/articles/ux-mapping-cheat-sheet/) - Empathy map vs journey map vs service blueprint
- [Swimlane Diagrams for UX (Medium)](https://sepantapouya.medium.com/swimlane-diagram-a-ux-designers-secret-weapon-for-order-in-chaos-fb9aa00927d5) - Swimlane UX applications
- [Miro Customer Journey Mapping](https://miro.com/customer-journey-map/what-is-a-customer-journey-map/) - Journey map components and stages
- [Customer Journey Mapping Tools (Miro)](https://miro.com/customer-journey-map/) - Workshop canvas structure
- [Empathy Map vs Journey Map (IxDF)](https://www.interaction-design.org/literature/article/empathy-map-why-and-how-to-use-it) - Differences and when to use each

**ReactFlow Implementation:**
- [ReactFlow SnapGrid API](https://reactflow.dev/api-reference/types/snap-grid) - **OFFICIAL DOCS** for snap behavior
- [ReactFlow Background Component](https://reactflow.dev/api-reference/components/background) - Grid line rendering
- [ReactFlow Helper Lines Example](https://reactflow.dev/examples/interaction/helper-lines) - Alignment guides pattern
- [ReactFlow Custom Nodes](https://reactflow.dev/examples/nodes/custom-node) - Node customization

**Drag & Drop UX Patterns:**
- [LogRocket: Drag and Drop UI Best Practices](https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/) - Visual feedback for drop zones
- [MDN: Drag Operations](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations) - Drag/drop API patterns

**Canvas Tables & Grids:**
- [Miro Tables](https://help.miro.com/hc/en-us/articles/22760922335506-Tables) - Add/remove columns, resize
- [FigJam Tables](https://help.figma.com/hc/en-us/articles/12583849250199-Tables-in-FigJam) - Duplicate rows/columns, copy from spreadsheets

---
*Feature research for: WorkshopPilot.ai v1.2 — Grid/Swimlane Canvas Layouts (Step 6 Journey Map + Steps 2 & 4 Retrofit)*
*Researched: 2026-02-11*
*Confidence: MEDIUM (WebSearch verified with multiple whiteboard tool sources; ReactFlow official docs for implementation; NN/G for journey mapping methodology)*

# Feature Research: Canvas Post-It Interactions

**Domain:** Post-it/sticky note canvas for design thinking collaboration tools (Steps 2 & 4)
**Researched:** 2026-02-10
**Confidence:** MEDIUM (WebSearch verified with multiple sources, limited official docs for Miro/FigJam API specifics)

## Context

This research focuses ONLY on **canvas post-it interaction features** for WorkshopPilot v1.1 milestone. The app already has:
- Full 10-step AI-powered design thinking facilitation (v1.0 shipped)
- Chat-based interaction with structured outputs
- Auto-save, cascade invalidation, context compression

**New for v1.1:** Split-screen layout (chat left, canvas right) for Steps 2 (Stakeholder Mapping) and 4 (Research Sense Making). AI suggests post-its in chat → user clicks "Add to canvas" → appears on canvas. AI reads canvas state silently to reference in conversation.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Create post-it** | Core canvas interaction — click/keyboard to add note | LOW | Single click or keyboard shortcut ("s" in many tools); requires text input field or inline editing |
| **Move post-it** | Fundamental canvas manipulation — drag to reposition | MEDIUM | Requires drag-and-drop handling, coordinate tracking, visual feedback during drag |
| **Edit post-it text** | Users need to refine text after creation | LOW | Double-click to edit, inline text area, auto-save on blur |
| **Delete post-it** | Mistake correction, decluttering | LOW | Backspace/Delete key or right-click menu; requires confirmation for bulk delete |
| **Color-code post-it** | Organize by category, person, sentiment, or priority | LOW | 5-8 color palette; click to change color; optional color legend/key |
| **Multi-select** | Bulk operations (move, color, delete) efficiency | MEDIUM | Shift+click, drag-select box, Cmd/Ctrl+click for non-contiguous selection |
| **Group/cluster post-its** | Affinity mapping core pattern — group related items | MEDIUM | Visual grouping (proximity-based), optional named containers/frames; snap-together behavior |
| **Pan canvas** | Navigate large workspace | MEDIUM | Click-drag background, two-finger trackpad, Space+drag; infinite or bounded canvas |
| **Zoom in/out** | View details vs overview | MEDIUM | Pinch-to-zoom, Ctrl+scroll, zoom controls UI; maintain post-it readability across zoom levels |
| **Undo/redo** | Mistake recovery expectation | HIGH | User-specific undo stack (not global); handle create/move/edit/delete/color actions |
| **Auto-save canvas state** | Prevent data loss — users expect persistence | MEDIUM | Debounced saves (2s idle); save position, text, color, grouping metadata |
| **Canvas → AI awareness** | AI references canvas state in conversation | MEDIUM | AI reads canvas JSON (post-its, positions, clusters) silently; cites specific items when relevant |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI → Canvas: "Add to canvas" confirmation** | User control over AI suggestions — avoids overwhelming canvas | LOW | AI suggests stakeholder/insight in chat, inline button adds to canvas with confirmation toast |
| **Auto-clustering by proximity** | Simplifies affinity mapping — AI detects spatial grouping | MEDIUM | When user moves post-its close together (<50px?), AI infers cluster; names cluster based on content |
| **AI-named clusters** | AI suggests cluster theme based on post-it content | MEDIUM | After user groups 3+ post-its, AI proposes cluster name; user accepts/edits/rejects |
| **Canvas-specific templates** | Pre-populated grids for stakeholder mapping (2x2 influence/interest) | LOW | Step 2: Quadrant grid with labels (High/Low Power × High/Low Interest); post-its snap to quadrants |
| **Snap-to-grid** | Alignment without manual pixel-perfect positioning | LOW | Optional toggle; 20-50px grid spacing; magnetic snap when dragging within threshold |
| **Alignment guides** | Visual guides when dragging show alignment with nearby post-its | MEDIUM | Smart guides appear at vertical/horizontal alignment; helps manual organization |
| **Bulk mode creation** | Create multiple post-its rapidly (paste list, AI batch-add) | MEDIUM | Paste text → each line becomes post-it; AI suggests 5 stakeholders → add all at once |
| **Color semantics legend** | User defines color meaning (e.g., yellow=pain, blue=gain) | LOW | Optional legend UI in corner; persist per workshop; helps team alignment |
| **Export canvas as image** | Share canvas snapshot externally (Slack, email) | LOW | Canvas → PNG download; preserves zoom level, includes legend |
| **AI detects incomplete clusters** | AI prompts "You have 3 post-its in 'Pains' — need 2 more for the 5 pains target" | MEDIUM | Context-aware prompting based on step requirements + canvas state |
| **Minimap** | Overview of full canvas when zoomed in | MEDIUM | Small viewport indicator in corner showing current view; click to jump |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time collaboration on canvas** | "Design thinking is collaborative" | CRDT conflict resolution, cursor presence, websocket complexity — scope explosion for v1.1 | Single-user canvas for v1.1; defer multiplayer to MMP (v2.0+) |
| **Freeform drawing/sketching on canvas** | "Whiteboard tools have drawing" | Requires pen tool, stroke rendering, eraser, layer management — adds complexity without design thinking value | Stick to post-its + text; defer drawing to FFP if validated |
| **Infinite canvas** | "Never run out of space" | Performance degradation with >200 post-its, viewport management complexity | Bounded canvas (e.g., 4000×3000px) with zoom; forces focused clustering |
| **Post-it rich text formatting** | "Need bold, bullets, links" | Text editing UI complexity, rendering inconsistency, focus drift from content to formatting | Plain text only; bold via AI interpretation (e.g., "**Important**" in chat, not on canvas) |
| **Custom post-it shapes/sizes** | "Different shapes for different types" | UI complexity, spatial layout challenges, cognitive overhead | Fixed size post-its, differentiate via color only |
| **Canvas animations (smooth transitions)** | "Polished feel" | Performance cost, distraction from content, animation library overhead | Instant position updates; use subtle fade-in for AI-added post-its only |
| **Nested groups (groups within groups)** | "Complex hierarchies" | UI for expanding/collapsing, depth management, undo complexity | Flat clustering only; use color/position for subcategories |
| **Post-it voting/dot voting** | "Prioritization feature" | Not needed for Steps 2 & 4 (stakeholder mapping, sense making); adds UI for marginal value | Defer to Step 8 Ideation if validated; AI prioritization replaces voting for now |
| **Auto-arrange by AI** | "AI organizes canvas automatically" | Removes user agency, unpredictable layouts, users lose spatial memory | AI suggests clusters by name, user positions manually; preserves mental model |

## Feature Dependencies

```
Canvas Component (foundation)
    ├──requires──> Pan & Zoom
    ├──requires──> Post-It CRUD (Create/Read/Update/Delete)
    └──requires──> Auto-Save Canvas State

Post-It Interactions
    ├──requires──> Drag-and-Drop
    ├──requires──> Multi-Select
    ├──requires──> Color Picker
    └──requires──> Inline Text Edit

AI ↔ Canvas Bidirectional Sync
    ├──requires──> Canvas → JSON serialization
    ├──requires──> AI reads canvas state in system prompt
    └──requires──> "Add to canvas" action from chat

Clustering/Grouping
    ├──requires──> Post-It Positioning
    ├──optional──> Auto-Cluster by Proximity
    └──optional──> AI-Named Clusters

Step-Specific Canvas Modes
    ├──Step 2 Stakeholder Mapping──> 2×2 Quadrant Grid Template
    ├──Step 4 Research Sense Making──> Freeform Canvas with Cluster Detection
    └──Non-Canvas Steps (1,3,5,6,7,8,9,10)──> Placeholder Right Panel (future-ready)

Undo/Redo
    ├──requires──> Action History Stack (per user)
    └──conflicts──> Real-Time Collaboration (deferred to v2.0+)
```

### Dependency Notes

- **Canvas Component must be step-agnostic:** Same component renders for Step 2 (quadrant grid) and Step 4 (freeform); config-driven templates
- **AI awareness is read-only for v1.1:** AI reads canvas state but doesn't auto-add post-its without user confirmation
- **Multi-select enables bulk operations:** Color-code, move, delete all depend on multi-select foundation
- **Undo/redo is user-specific:** In single-user v1.1, simple stack; real-time collab (v2.0+) requires CRDT-based undo
- **Snap-to-grid conflicts with freeform:** Step 2 uses grid, Step 4 doesn't; toggle per step config

## MVP Definition (v1.1 Canvas Foundation)

### Launch With (v1.1)

Canvas features needed to validate post-it interactions for Steps 2 & 4.

- [ ] **Split-screen layout** — Chat left (60%), canvas right (40%); resizable divider; mobile: stack vertically
- [ ] **Post-it CRUD** — Create (click or keyboard "s"), edit (double-click inline), delete (Backspace key), persist to DB
- [ ] **Drag-and-drop positioning** — Click-drag to move, snap to grid (Step 2 only), update coordinates on drop
- [ ] **Color picker (5 colors)** — Click post-it → color menu (yellow, blue, green, pink, orange); persist color choice
- [ ] **Multi-select** — Shift+click or drag-select box; bulk move, bulk color, bulk delete
- [ ] **Pan & zoom** — Pan via Space+drag or two-finger trackpad; zoom via Ctrl+scroll; zoom levels: 50%, 75%, 100%, 125%, 150%
- [ ] **Auto-save canvas state** — Debounced 2s; save post-its (id, text, x, y, color, stepId, workshopId) to DB
- [ ] **AI → Canvas: "Add to canvas" button** — AI suggests stakeholder/insight in chat; inline button adds to canvas with toast confirmation
- [ ] **Canvas → AI: silent read** — AI system prompt includes canvas JSON (all post-its for current step); AI references by text when relevant
- [ ] **Step 2: Quadrant grid template** — 2×2 grid (High/Low Power × High/Low Interest) with quadrant labels; post-its snap to quadrant regions
- [ ] **Step 4: Freeform canvas** — No grid; proximity-based clustering (visual only, no auto-cluster AI for v1.1)
- [ ] **Undo/redo (basic)** — Ctrl+Z/Ctrl+Shift+Z for create/delete/move/color; user-specific stack, max 20 actions

### Add After Validation (v1.2+)

Features to add once core canvas interactions are validated.

- [ ] **AI-named clusters** — Trigger: Users manually group 3+ post-its; AI suggests cluster name
- [ ] **Bulk mode creation** — Trigger: Users paste stakeholder list or AI suggests 5+ items at once
- [ ] **Alignment guides** — Trigger: Users struggle with manual alignment; smart guides show vertical/horizontal alignment
- [ ] **Minimap** — Trigger: Canvas usage >50 post-its; viewport overview helps navigation
- [ ] **Color semantics legend** — Trigger: Users ask "What do colors mean?" in chat
- [ ] **Export canvas as PNG** — Trigger: Users request sharing canvas externally
- [ ] **AI detects incomplete clusters** — Trigger: Step 4 requires 5 pains/5 gains; AI prompts if canvas has <5 in cluster
- [ ] **Snap-to-grid toggle** — Trigger: Some users prefer freeform in Step 2; make grid optional

### Future Consideration (MMP v2.0+)

Features to defer until canvas foundation is validated.

- [ ] **Real-time collaboration** — Why defer: CRDT conflict resolution, cursor presence, websocket infrastructure — major scope increase
- [ ] **Nested groups** — Why defer: UI complexity, marginal value for Steps 2 & 4
- [ ] **Post-it voting** — Why defer: Not needed for stakeholder mapping or sense making; relevant for Step 8 Ideation
- [ ] **Freeform drawing** — Why defer: Pen tool, stroke rendering, eraser — adds complexity without validation
- [ ] **Custom shapes/sizes** — Why defer: Spatial layout challenges, cognitive overhead
- [ ] **Auto-arrange by AI** — Why defer: Removes user agency, unpredictable; validate manual clustering first

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Post-it CRUD | HIGH | LOW | P1 |
| Drag-and-drop | HIGH | MEDIUM | P1 |
| Color picker | MEDIUM | LOW | P1 |
| Pan & zoom | HIGH | MEDIUM | P1 |
| Auto-save canvas | HIGH | MEDIUM | P1 |
| AI → Canvas "Add" button | HIGH | LOW | P1 |
| Canvas → AI silent read | HIGH | MEDIUM | P1 |
| Multi-select | MEDIUM | MEDIUM | P1 |
| Step 2 quadrant grid | MEDIUM | LOW | P1 |
| Undo/redo | MEDIUM | HIGH | P1 |
| AI-named clusters | MEDIUM | MEDIUM | P2 |
| Bulk mode creation | MEDIUM | MEDIUM | P2 |
| Alignment guides | LOW | MEDIUM | P2 |
| Snap-to-grid toggle | LOW | LOW | P2 |
| Minimap | LOW | MEDIUM | P2 |
| Export PNG | LOW | LOW | P2 |
| Real-time collaboration | HIGH | HIGH | P3 |
| Freeform drawing | LOW | HIGH | P3 |
| Nested groups | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch (validate canvas foundation)
- P2: Should have for v1.2+ (enhance validated features)
- P3: Nice to have for MMP v2.0+ (major scope additions)

## Architecture Integration Notes

### Existing Architecture (v1.0)

- **State management:** Zustand stores for workshops, steps, chat messages
- **Database:** Neon Postgres with Drizzle ORM
- **Auto-save:** Debounced 2s, maxWait 10s, optimistic locking
- **AI streaming:** Vercel AI SDK with Gemini 2.0 Flash
- **Chat UI:** shadcn-chat components

### Canvas-Specific Additions (v1.1)

**New Zustand store:**
```typescript
useCanvasStore({
  postIts: PostIt[], // { id, stepId, workshopId, text, x, y, color, createdAt, updatedAt }
  selectedIds: string[],
  viewport: { x, y, zoom },
  actionHistory: Action[], // for undo/redo
  // actions: addPostIt, updatePostIt, deletePostIt, setSelection, undo, redo
})
```

**New DB table:**
```sql
CREATE TABLE post_its (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  step_id INTEGER NOT NULL, -- 2 or 4 for v1.1
  text TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  color VARCHAR(20) NOT NULL, -- 'yellow' | 'blue' | 'green' | 'pink' | 'orange'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1 -- optimistic locking
);
CREATE INDEX idx_post_its_workshop_step ON post_its(workshop_id, step_id);
```

**AI system prompt injection (Step 2 example):**
```markdown
# Canvas State
User has created the following stakeholders on the canvas:

Post-its:
- "CEO" (x: 100, y: 50, color: yellow, quadrant: High Power/High Interest)
- "End User" (x: 250, y: 200, color: blue, quadrant: Low Power/High Interest)
- "Regulator" (x: 80, y: 180, color: green, quadrant: High Power/Low Interest)

When suggesting new stakeholders, reference existing ones. Use "Add to canvas" button in responses.
```

**Canvas component architecture:**
```
<SplitScreenLayout>
  <ChatPanel /> {/* existing v1.0 */}
  <CanvasPanel>
    {stepId === 2 && <QuadrantGrid />}
    {stepId === 4 && <FreeformCanvas />}
    <PostItLayer>
      {postIts.map(postIt => <PostIt key={postIt.id} {...postIt} />)}
    </PostItLayer>
    <SelectionBox />
    <ZoomControls />
  </CanvasPanel>
</SplitScreenLayout>
```

## Interaction Patterns from Research

### Miro Patterns
- **Bulk mode:** Create multiple sticky notes at once, paste from spreadsheet
- **Auto-cluster:** AI groups stickies by theme, keyword, sentiment
- **Voting & commenting:** Real-time collaboration features (defer to v2.0+)
- **Show/hide author labels:** Useful for multiplayer (defer to v2.0+)

### FigJam Patterns
- **AI sort by topic/color/author/stamp count:** Contextual organization
- **AI summarize stickies:** Generate written summary of sticky note content
- **AI-powered clustering plugin (Cluster):** Uses OpenAI embeddings to group by affinity
- **Collapsible stacks:** Grouped stickies can expand/collapse (defer to v2.0+)

### MURAL Patterns
- **AI classify by sentiment:** Organize by positive/negative/neutral (useful for Step 4)
- **Templates for design thinking exercises:** Pre-populated grids (we'll use for Step 2 quadrant)
- **Synchronous + asynchronous collaboration:** Real-time + offline (defer real-time to v2.0+)

### Affinity Diagramming Best Practices
- **One idea per post-it:** Enforce brevity (character limit 200?)
- **Cluster by similarity:** Proximity-based grouping (3+ post-its within 50px = cluster)
- **Label clusters after grouping:** AI suggests theme name after user groups manually
- **Color coding for sources/types:** Yellow=pain, blue=gain, green=observation (legend)
- **Iterate clustering:** Allow regrouping, splitting, merging clusters

### Stakeholder Mapping Best Practices (Step 2)
- **2×2 quadrant grid:** Power (vertical) × Interest (horizontal)
- **Quadrant strategies:**
  - High Power/High Interest: Manage Closely
  - High Power/Low Interest: Keep Satisfied
  - Low Power/High Interest: Keep Informed
  - Low Power/Low Interest: Monitor
- **Post-it placement in quadrant:** Snap to quadrant region; visual boundary indicators
- **Color by stakeholder type:** Users=yellow, Buyers=blue, Regulators=green, Internal=pink

### Research Sense Making Best Practices (Step 4)
- **Freeform canvas:** No grid; spatial freedom for organic clustering
- **5 pains + 5 gains target:** AI prompts if canvas incomplete ("Need 2 more pains")
- **Evidence traceability:** Post-it text includes quote source (Step 3 interview reference)
- **Theme emergence:** User groups quotes, AI suggests theme name based on cluster content
- **Iterative refinement:** Move post-its between clusters, split/merge themes

## Technical Considerations

### Canvas Libraries Evaluated
- **Fabric.js:** Mature, heavy (~200KB), rich features (shapes, text, groups)
- **Konva.js:** React-friendly, lighter (~100KB), good for simple post-its
- **React Flow:** Node-based, overkill for post-its, better for journey maps (Step 6)
- **Tldraw:** Full whiteboard, includes drawing (too much for v1.1)
- **Custom HTML/CSS + React DnD:** Lightest, full control, manual pan/zoom

**Recommendation:** **Konva.js** for v1.1 — React integration (react-konva), handles drag-and-drop, pan/zoom, layering, good performance <200 post-its.

### Performance Targets
- **Post-it count:** 50-100 per canvas (Step 2: 20-30 stakeholders, Step 4: 50-80 insights)
- **Render performance:** <16ms per frame (60fps) during drag; debounce position updates
- **Auto-save frequency:** Debounced 2s idle, batch updates to DB
- **Zoom levels:** 50%, 75%, 100%, 125%, 150% — maintain text readability at all levels

### Mobile Considerations (Deferred to v2.0+)
- v1.1 is desktop-first; canvas interactions (drag, multi-select, zoom) challenging on mobile
- Mobile viewport: Stack chat above canvas vertically; simplified touch interactions
- Defer to MMP (v2.0+) after desktop validation

## Competitor Feature Analysis

| Feature | Miro | FigJam | MURAL | WorkshopPilot v1.1 |
|---------|------|--------|-------|-------------------|
| **Post-it creation** | Click, keyboard "s", bulk paste | Click, keyboard "s" | Click, templates | **Click, keyboard "s", AI "Add to canvas"** |
| **Drag-and-drop** | Yes, smooth animations | Yes, snap-to-grid option | Yes, magnetic snap | **Yes, snap-to-grid (Step 2), freeform (Step 4)** |
| **Color coding** | 10+ colors, custom RGB | 8 colors, author color | 8 colors, sentiment colors | **5 colors, optional legend** |
| **Multi-select** | Shift+click, drag-box, lasso | Shift+click, drag-box | Shift+click, drag-box | **Shift+click, drag-box** |
| **Grouping** | Frames, sections | Groups, sections | Containers, areas | **Proximity-based clustering (visual)** |
| **AI clustering** | Auto-cluster by theme/sentiment | AI sort by topic, plugin clustering | AI classify by sentiment | **AI-named clusters (v1.2)** |
| **AI suggestions** | Suggest content, generate images | Summarize, sort, generate ideas | Generate ideas, classify | **AI suggests in chat → "Add to canvas"** |
| **Canvas ↔ AI sync** | Canvas → AI (AI reads board) | Canvas → AI (AI reads stickies) | Canvas → AI (AI reads board) | **Bidirectional: AI reads canvas, user adds from chat** |
| **Undo/redo** | Yes, global | Yes, global | Yes, global | **Yes, user-specific (v1.1 single-user)** |
| **Collaboration** | Real-time multiplayer | Real-time multiplayer | Real-time multiplayer | **Single-user (v1.1), defer to v2.0+** |
| **Export** | PNG, PDF, CSV | PNG, FigJam file | PNG, PDF, MURAL file | **PNG (v1.2)** |
| **Templates** | 2000+ templates | 300+ templates | 500+ templates | **Step-specific: Quadrant grid (Step 2)** |

**Key differentiators for WorkshopPilot:**
1. **AI-driven workflow:** AI suggests post-its in chat, user confirms; other tools add manually then AI organizes
2. **Step-specific canvas modes:** Quadrant grid for Step 2, freeform for Step 4; context-aware templates
3. **Canvas as secondary output:** Chat is primary, canvas is visualization; other tools are canvas-first
4. **Single-user focus (v1.1):** Simpler state management, faster validation; defer real-time collab complexity

## Open Questions for Development

1. **Canvas library:** Konva.js vs custom HTML/CSS? (Recommend Konva for v1.1 speed)
2. **Quadrant grid enforcement:** Hard snap or soft suggestion for Step 2 stakeholder positioning?
3. **Auto-cluster threshold:** How many post-its within what distance triggers cluster detection?
4. **Color legend:** User-defined or pre-set semantics (yellow=pain, blue=gain)?
5. **Undo/redo scope:** Which actions to track? (Create, move, edit, delete, color — yes; pan/zoom — no)
6. **AI cluster naming timing:** Suggest name immediately after grouping or on user request?
7. **Canvas bounds:** Infinite canvas or fixed size (e.g., 4000×3000px)?
8. **Post-it character limit:** 200 chars to enforce brevity, or unlimited with text wrap?

## Sources

**Canvas Collaboration Tools:**
- [Online Sticky Notes with AI | Miro](https://miro.com/online-sticky-notes/)
- [Sticky notes – Miro Help Center](https://help.miro.com/hc/en-us/articles/360017572054-Sticky-notes)
- [Sort and summarize stickies with FigJam AI](https://help.figma.com/hc/en-us/articles/18711926790423-Sort-and-summarize-stickies-with-FigJam-AI)
- [AI-powered visual workspace for team collaboration | Mural](https://www.mural.co/)
- [Design thinking canvas template | Mural](https://www.mural.co/templates/design-thinking-canvas)

**AI-Canvas Integration:**
- [Miro vs. FigJam: how their AI assistants stack up](https://uxdesign.cc/miro-vs-figjam-how-their-ai-assistants-stack-up-a6ac0b9d5385)
- [Redesigning the workshop: AI-powered facilitation in Miro, FigJam, and Mural](https://medium.com/@uxraspberry/redesigning-the-workshop-ai-powered-facilitation-in-miro-figjam-and-mural-84d8b3deab62)
- [Introducing canvas, a new way to write and code with ChatGPT | OpenAI](https://openai.com/index/introducing-canvas/)

**Affinity Diagramming:**
- [Affinity Diagrams: How to Cluster Your Ideas and Reveal Insights | IxDF](https://www.interaction-design.org/literature/article/affinity-diagrams-learn-how-to-cluster-and-bundle-ideas-and-facts)
- [Affinity Diagramming: Collaboratively Sort UX Findings | NN/G](https://www.nngroup.com/articles/affinity-diagram/)
- [Affinity clustering template | Mural](https://www.mural.co/templates/affinity-clustering)

**Stakeholder Mapping:**
- [Stakeholder Mapping: The Complete Guide | IxDF](https://www.interaction-design.org/literature/article/map-the-stakeholders)
- [Stakeholder Analysis for UX Projects | NN/G](https://www.nngroup.com/articles/stakeholder-analysis/)
- [Power Interest Grid for Stakeholder Analysis | Creately](https://creately.com/diagram/example/jripkdb22/power-interest-grid-for-stakeholder-analysis)

**Research Synthesis:**
- [Research Synthesis Template | Mural](https://www.mural.co/templates/research-synthesis)
- [FREE Research Synthesis Online | Miro](https://miro.com/research-and-design/research-synthesis/)
- [UX Research Synthesis Methods for Actionable Insights | Looppanel](https://www.looppanel.com/blog/ux-research-synthesis)

**Canvas Interaction Patterns:**
- [Drag and drop UI examples and UX tips](https://www.eleken.co/blog-posts/drag-and-drop-ui)
- [Drag–and–Drop: How to Design for Ease of Use | NN/G](https://www.nngroup.com/articles/drag-drop/)
- [Edit objects on the canvas in bulk | Figma](https://help.figma.com/hc/en-us/articles/21635177948567-Edit-objects-on-the-canvas-in-bulk)

**Collaborative Canvas Technical Patterns:**
- [Infinite Canvas: Building a Seamless, Pan-Anywhere Image Space | Codrops](https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/)
- [How to build undo/redo in a multiplayer environment | Liveblocks](https://liveblocks.io/blog/how-to-build-undo-redo-in-a-multiplayer-environment)
- [Conflict Resolution in Real-Time Collaborative Editing | Hoverify](https://tryhoverify.com/blog/conflict-resolution-in-real-time-collaborative-editing/)
- [Understanding real-time collaboration with CRDTs](https://shambhavishandilya.medium.com/understanding-real-time-collaboration-with-crdts-e764eb65024e)

**Canvas Performance & Optimization:**
- [Optimizing canvas | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Lesson 8 - Optimize performance | An infinite canvas tutorial](https://antv.vision/infinite-canvas-tutorial/guide/lesson-008)

**Color Coding & Semantics:**
- [Boost your productivity with color coding! | Post-it® Brand](https://www.post-it.com/3M/en_US/post-it/ideas/articles/boost-your-productivity-with-color-coding/)
- [How to Use Color-Coded Sticky Notes to Boost Productivity](https://mrpen.com/blogs/all-things-mr-pen-blog/how-to-use-color-coded-sticky-notes-to-boost-productivity)

---
*Feature research for: WorkshopPilot.ai v1.1 — Canvas Post-It Interactions (Steps 2 & 4)*
*Researched: 2026-02-10*
*Confidence: MEDIUM (WebSearch verified with multiple collaboration tool sources; limited access to Miro/FigJam API docs)*

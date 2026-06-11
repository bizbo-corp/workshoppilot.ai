# Phase 64: AI Baseline Generation - Research

**Researched:** 2026-06-11
**Domain:** AI-driven flow generation into a ReactFlow/Zustand canvas; scope-chooser UI; archetype taxonomy reconciliation
**Confidence:** HIGH — all source of truth is the codebase itself; no third-party libraries to verify

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test scope choice (locked by brief)**
- Asked up front, explicitly, when the user enters Journey Flow: test the **end-to-end journey** or test a **single feature/concept** from the workshop. No AI inference of this choice.
- Journey mode → AI generates the full baseline flow.
- Single-feature mode → concept picker (concepts from the workshop), then AI generates a **mini-flow** of just that feature's screens (entry → action → result); same editor, smaller graph.

**Flow archetypes (locked by brief)**
AI picks the baseline shape from workshop outputs:
- **Linear sequence** — long step-by-step processes (experience design, onboarding-like apps)
- **Hub-and-spoke** — dashboard + detail screens
- **Single-page sections / simple site structure** — brochure-style outputs
- **Funnel / landing-page test** — deliberately short conversion flow (landing → sign-up → confirmation)
- **Branching flow** — mostly linear with decision forks (eligibility, triage, approve/reject, choose-your-path)
- **Single-screen tool** — input → result utility; natural fit for single-feature mode
- **Loop / engagement cycle** — log → feedback → return flows

The user can rearrange afterwards; the archetype only shapes the generated baseline.

**MUST reconcile archetypes with the existing `strategicIntent` enum** (marketing-site / admin-portal / dashboard / tool / web-app) into a single concept — do not maintain two parallel taxonomies.

**Generation pipeline (locked by brief)**
- Adapt/simplify the existing AI baseline pipeline: `src/lib/journey-mapper/heuristic-mapper.ts` + `intent-detection.ts` — target the leaner Phase 63 `JourneyFlowNode` model. Reuse, don't rebuild.
- Regenerate option replaces current nodes/edges with a fresh baseline.
- Two-sided idea detected → generate ONLY the riskier side's journey and say so in the generated baseline (a note visible on canvas). Never half-build both sides.

### Claude's Discretion
- Whether generation is heuristic-only, LLM-backed, or hybrid — pick what best satisfies "AI determines archetype" within the existing stack
- Scope-chooser UI shape (modal vs full-screen entry state replacing Phase 63's empty state)
- Where the archetype/scope metadata is stored in the Journey Flow state shape (extend the store/persisted shape as needed; keep autosave intact)
- Regenerate confirmation UX (warn before clobbering user edits)
- How the two-sided note appears on canvas (annotation node vs toolbar notice)

### Deferred Ideas (OUT OF SCOPE)
- Validation guidance card linking into Journey Flow — Phase 65
- Prototype prompt consuming archetype/flow data — Phase 66 (but keep archetype data accessible for it)
- Full dual-journey support for two-sided products — future milestone
- Hi-fi pathway — future milestone
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GEN-01 | On entry, user explicitly chooses test scope: "Test the whole journey" vs "Test a single feature" (with concept picker for feature mode) — no AI inference of scope | Scope chooser replaces the `!hasNodes` branch in `journey-flow-content.tsx` (`JourneyFlowInner`). Concept picker reads from the `concept` step artifact (Step 9 `concepts[]` array via `loadAllWorkshopArtifacts`). |
| GEN-02 | AI generates a baseline flow from workshop outputs for the chosen scope — full journey in journey mode, mini-flow (entry → action → result) in single-feature mode | New `POST /api/build-pack/generate-journey-flow` route, modeled on `generate-journey-map/route.ts`. Uses `loadAllWorkshopArtifacts` + adapted prompt. Emits `JourneyFlowNode[]` + `JourneyFlowEdge[]` directly — no layout pipeline needed (simple deterministic x/y placement). |
| GEN-03 | AI determines the flow archetype (7 archetypes from brief) to shape the generated baseline, reconciling with the existing `strategicIntent` enum into a single concept | Reconciled taxonomy proposed below. The archetype is the primary output of the intent-detection layer; `strategicIntent` becomes a derived alias from the archetype for Phase 66 prompt templates. |
| GEN-04 | User can regenerate the baseline flow | Regenerate button in `JourneyFlowToolbar` (or canvas toolbar) with a confirmation AlertDialog (pattern from `journey-map-content.tsx`). Calls the same generate route with `force: true`. Clears autosave timer before reset, then populates store. |
| GEN-05 | When the AI detects a two-sided idea, it maps only the riskier side's journey and says so in the generated baseline | AI prompt instructs: detect two-sided signals (marketplace, platform, provider + consumer) → generate riskier-side only + emit a special `annotation` node type explaining the decision. The annotation node is read-only and renders differently from a `screenCard` node. |
</phase_requirements>

---

## Summary

Phase 64 grafts AI baseline generation onto the Phase 63 Journey Flow editor. The entry point — the `!hasNodes` empty-state branch in `journey-flow-content.tsx` — is replaced with a scope-chooser component. After the user picks scope (journey-mode or single-feature mode), a new API route generates `JourneyFlowNode[]` + `JourneyFlowEdge[]` from workshop artifacts (Steps 1–10) and writes them into the store; the existing canvas renders them immediately via the display-mirror pattern.

The critical design decision is the archetype taxonomy reconciliation. The existing codebase has two overlapping taxonomies: the `StrategicIntent` enum (5 values, used for prompt template dispatch in Phase 66 and for the old mapper's heuristics) and the 7 flow archetypes from the milestone brief (which map to structural patterns). Research shows these are complementary, not competing — the **archetype is the structural pattern of the flow**, the **strategicIntent is the product category**. The reconciliation is to extend `JourneyFlowState` with a single `flowArchetype` field that stores the 7-value archetype, and to derive the `strategicIntent` alias from it. This keeps Phase 66 prompt templates working without modification.

The generation pipeline should be **hybrid** (LLM-backed with a heuristic fallback), matching the proven pattern in `generate-journey-map/route.ts`. The LLM uses `generateTextWithRetry` with a JSON-output prompt (not `generateObject` — consistent with existing build-pack generation routes). The heuristic fallback adapts `heuristicMap()` from `heuristic-mapper.ts` to emit `JourneyFlowNode[]` instead of `JourneyMappingResult`. The mini-flow for single-feature mode is always 3 nodes (entry → action → result) regardless of archetype.

**Primary recommendation:** Hybrid LLM + heuristic. Build a new `src/lib/journey-flow/generator.ts` that adapts `heuristic-mapper.ts` logic to emit `JourneyFlowNode[]` directly. Add a new `POST /api/build-pack/generate-journey-flow` route in the same pattern as `generate-journey-map`. Replace the empty state in `journey-flow-content.tsx` with a scope-chooser component that fetches concepts and triggers generation.

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@ai-sdk/google` (Gemini) | current | LLM baseline generation | All build-pack generation routes use this; `generateTextWithRetry` wrapper already handles retries |
| `zustand` (vanilla) | current | Store mutation after generation | `storeApi.setState()` directly — same as `journey-map-content.tsx` generation flow |
| `@xyflow/react` | v12 | Canvas rendering of generated nodes | Phase 63 canvas renders whatever is in the store; no ReactFlow changes needed |
| Next.js App Router | 16 | New API route | Same route pattern as all other `/api/build-pack/*` routes |
| Drizzle + Neon | current | DB upsert of saved state after generation | Same save route already exists — `POST /api/build-pack/save-journey-flow` |
| `shadcn/ui` (AlertDialog, Dialog) | current | Scope chooser + regenerate confirmation | AlertDialog already used in `journey-map-content.tsx` for reset; Dialog used throughout |
| `sonner` | current | Toast on generation success/failure | Same as `handleGenerate` in `journey-map-content.tsx` |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
src/
├── lib/journey-flow/
│   ├── types.ts                          # EXISTING — extend with flowArchetype + testScope fields
│   └── generator.ts                      # NEW — heuristic generator adapted for JourneyFlowNode[]
├── lib/ai/prompts/
│   └── journey-flow-prompt.ts            # NEW — LLM prompt for baseline generation
├── components/journey-flow/
│   └── scope-chooser.tsx                 # NEW — entry-state UI (scope + concept picker + generate)
└── app/api/build-pack/
    └── generate-journey-flow/
        └── route.ts                      # NEW — POST handler (auth → load artifacts → LLM/heuristic → save)
```

```
MODIFIED files:
├── src/lib/journey-flow/types.ts                              # + flowArchetype, testScope, selectedConceptId
├── src/stores/journey-flow-store.ts                           # + setGenerationMeta action
├── src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/
│   ├── page.tsx                                               # + load concepts from step artifact
│   └── journey-flow-content.tsx                              # replace empty-state with ScopeChooser
```

### Pattern 1: Scope-chooser as the new empty state

**What:** Replace the `!hasNodes` branch in `JourneyFlowInner` with a `ScopeChooser` component that renders until a baseline has been generated. After generation, `hasNodes` flips to `true` and the canvas mounts normally. A "Regenerate" button in the toolbar re-opens the scope chooser or triggers a direct regenerate.

**Key decision:** The scope chooser is NOT a dialog on top of the canvas — it IS the pre-canvas entry state (full content area), consistent with how the old mapper shows "no map yet → Generate Journey Map" before any nodes exist.

**State machine:**
```
Entry (0 nodes) → ScopeChooser (choose scope + concept) → Generating... → Canvas (hasNodes=true)
                                        ↑ Regenerate button on toolbar (if hasNodes)
```

**Example (journey-flow-content.tsx change):**
```typescript
// In JourneyFlowInner, replace the current !hasNodes block:
if (!hasNodes && !isGenerating) {
  return (
    <ScopeChooser
      workshopId={workshopId}
      sessionId={sessionId}
      concepts={concepts}         // loaded in page.tsx, passed down as prop
      isReadOnly={isReadOnly}
      onGenerate={handleGenerate}
      isGenerating={isGenerating}
    />
  );
}
if (isGenerating) {
  return <GeneratingSpinner />;
}
return <JourneyFlowCanvas ... />;
```

### Pattern 2: Generate API route (adapted from generate-journey-map)

```typescript
// POST /api/build-pack/generate-journey-flow
// Body: { workshopId, scope: 'journey' | 'feature', selectedConceptId?: string, force?: boolean }
// Returns: { nodes: JourneyFlowNode[], edges: JourneyFlowEdge[], archetype: FlowArchetype, buildPackId: string }

// Pipeline:
// 1. Auth + ownership check (same as all other generate routes)
// 2. Cache check (unless force=true) — look for existing 'Journey Flow:%' row
// 3. loadAllWorkshopArtifacts(workshopId) — existing util
// 4. extractConceptsForFlow(artifacts) — adapted from generate-journey-map extractConcepts()
// 5. Try LLM → generateTextWithRetry with journey-flow-prompt.ts
// 6. Parse JSON → validateFlowResult() → emit JourneyFlowNode[] + JourneyFlowEdge[]
// 7. Fallback to heuristicGenerateFlow() from generator.ts if LLM fails
// 8. For scope=feature: filter to mini-flow of 3 nodes (entry → action → result)
// 9. Two-sided detection → add annotation node if detected
// 10. Apply deterministic positions (row layout for linear/funnel, hub layout for hub-and-spoke)
// 11. Upsert via existing save-journey-flow route (or inline upsert — same pattern)
// Return state + archetype
```

### Pattern 3: Store extension for generation metadata

Extend `JourneyFlowState` in `types.ts`:
```typescript
export type FlowArchetype =
  | 'linear-sequence'
  | 'hub-and-spoke'
  | 'single-page-sections'
  | 'funnel'
  | 'branching'
  | 'single-screen-tool'
  | 'loop';

export type TestScope = 'journey' | 'feature';

export interface JourneyFlowState {
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
  isApproved: boolean;
  isDirty: boolean;
  lastSavedAt?: string;
  _schemaVersion: number;
  // Phase 64 additions:
  flowArchetype?: FlowArchetype;   // AI-determined; drives Phase 66 prompt dispatch
  testScope?: TestScope;           // 'journey' | 'feature' — set once on generation
  selectedConceptId?: string;      // only for testScope='feature'
  lastGeneratedAt?: string;        // ISO timestamp; used by Regenerate button to detect edits
  isTwoSided?: boolean;            // whether the AI detected a two-sided product
}
```

Add `setGenerationMeta` action to store:
```typescript
setGenerationMeta: (meta: Pick<JourneyFlowState, 'flowArchetype' | 'testScope' | 'selectedConceptId' | 'lastGeneratedAt' | 'isTwoSided'>) =>
  set({ ...meta, isDirty: true }),
```

**Why extend state (not local component state):** The archetype and scope must survive route navigation and reload (they persist via autosave to `build_packs.content`). Phase 66 reads `flowArchetype` from the saved state to pick the right prototype prompt template.

### Pattern 4: Archetype taxonomy reconciliation (KEY PLANNING DECISION)

The existing `StrategicIntent` enum (5 values) and the 7 brief archetypes are NOT the same thing. They answer different questions:

| Question | Answered by |
|----------|-------------|
| "What structural flow shape should the baseline use?" | `FlowArchetype` (7 values, new) |
| "What kind of product is this?" (Phase 66 prompt template dispatch) | `StrategicIntent` (5 values, existing) |

**Reconciliation mapping** (derived archetype → `StrategicIntent` for Phase 66):

| `FlowArchetype` (new, 7 values) | Maps to `StrategicIntent` | Structural pattern |
|---------------------------------|--------------------------|-------------------|
| `linear-sequence` | `web-app` | A → B → C → D sequential screens |
| `hub-and-spoke` | `dashboard` | Hub screen + N detail screens off it |
| `single-page-sections` | `marketing-site` | Landing page sections top to bottom |
| `funnel` | `marketing-site` | Landing → Sign-up → Confirmation (3-4 nodes) |
| `branching` | `web-app` | Linear backbone with conditional forks |
| `single-screen-tool` | `tool` | One input node + one result node |
| `loop` | `web-app` | Cyclic graph: start → A → B → back to start |

**No `admin-portal` archetype in the 7:** `admin-portal` is mapped from within `hub-and-spoke` when the product reads as admin/CRUD. The detection prompt already handles this via `strategicIntent` scoring.

**Implementation:** The LLM prompt emits BOTH `flowArchetype` (from the 7 values) AND `strategicIntent` (from the 5 values) in its JSON. The heuristic fallback derives `flowArchetype` from the `detectStrategicIntent()` score using the mapping table above.

### Pattern 5: Concept data for single-feature picker

Concepts come from the Step 9 `concept` artifact. The schema is `conceptArtifactSchema` in `src/lib/schemas/step-schemas.ts`:
```typescript
// concepts[] lives in artifacts.concept.concepts[] (not _canvas.conceptCards for this path)
// Each concept: { ideaSource, name, elevatorPitch, usp, swot, feasibility }
```

The page.tsx server component already loads `stepArtifacts` for the build-pack lookup. It needs one additional query to get the Step 9 concept artifact and pass `concepts[]` as a prop to `JourneyFlowContent`.

**Precedent:** `journey-map/page.tsx` does exactly this for `hasStep9`:
```typescript
const step9Artifact = await db
  .select({ artifact: stepArtifacts.artifact })
  .from(stepArtifacts)
  .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
  .where(and(eq(workshopSteps.workshopId, workshop.id), eq(workshopSteps.stepId, 'concept')))
  .limit(1);
```

For Phase 64, parse the full artifact and pass `concepts[]`:
```typescript
const conceptArtifact = step9Artifact[0]?.artifact as { concepts?: Array<{name: string; ideaSource: string; elevatorPitch?: string}> } | null;
const concepts = conceptArtifact?.concepts ?? [];
```

### Pattern 6: LLM generation with text + JSON parse (NOT generateObject)

All build-pack generation routes use `generateTextWithRetry` + manual JSON clean + `JSON.parse`, NOT `generateObject`. Reason: the prompt output is large (multiple nodes + edges), and `generateTextWithRetry` with the fenced-JSON pattern is the established convention.

```typescript
// From generate-journey-map/route.ts — exact pattern to copy:
const result = await generateTextWithRetry({
  model: google('gemini-2.5-flash-lite'),
  temperature: 0.3,
  prompt,
});
const cleaned = result.text.trim()
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/```\s*$/i, '')
  .trim();
const parsed = JSON.parse(cleaned) as JourneyFlowGenerationResult;
```

The AI-only routes (`classify-output-type.ts`, `propose-assumption.ts`, etc.) use `generateObject` with Zod schemas, but they return small single-object responses. The generate-journey-flow route follows the build-pack convention.

### Pattern 7: Node position layout for generated baseline

Phase 63's `journey-flow-canvas.tsx` uses the store positions as-is (no auto-layout). The generator must emit reasonable `position: { x, y }` values for each node. Simple deterministic layouts per archetype:

```
linear-sequence: left-to-right row, x = i * 340, y = 160
funnel:          left-to-right row (same as linear, 3-4 nodes)
hub-and-spoke:   hub at (400, 160); spokes at 0°, 60°, 120°, 180°, 240°, 300° around it
single-page-sections: top-to-bottom column, x = 400, y = i * 220
branching:       left-to-right backbone, forks offset y ± 200
single-screen-tool: 2-node, x = 200 (input) and x = 600 (result), y = 160
loop:            circular arrangement (N nodes on a circle, r = N * 80, centered at 400, 300)
```

These are intentionally simple — the user can rearrange. Matches how `generate-journey-map` uses `computeJourneyMapLayout` but we skip the complex stage-column layout since Journey Flow has no stage swimlanes.

### Pattern 8: Annotation node for two-sided products (GEN-05)

Two-sided detection: scan `challengeContext` + concept names for keywords (marketplace, platform, provider, host, guest, buyer, seller, consumer, B2B2C). Confidence threshold: ≥ 2 distinct signals.

When detected: add one `annotationCard` node to the generated nodes array at a fixed position (top of canvas, e.g., `{ x: 400, y: -80 }`):
```typescript
{
  id: 'jf-node-annotation-two-sided',
  name: 'Two-Sided Product Detected',
  uiType: 'modal',         // closest semantic type; annotation styling overrides display
  purpose: 'This appears to be a two-sided product. Journey Flow is mapping the [provider/consumer] side — the riskier side to test first. The other side is out of scope for this baseline.',
  keyElements: [],
  priority: 'must-have',
  position: { x: 400, y: -80 },
  isAnnotation: true,      // NEW optional flag — canvas can render differently
}
```

Add `isAnnotation?: boolean` to `JourneyFlowNode`. The node card component checks this flag and renders a distinct visual (e.g., amber background, info icon, non-draggable). This is simpler than a new node type because it reuses all existing store/save logic.

### Pattern 9: Regenerate flow (GEN-04)

The regenerate button lives in the canvas toolbar (visible once nodes exist). It mirrors the old mapper's reset+regenerate flow from `journey-map-content.tsx`:

```typescript
// In JourneyFlowInner:
const handleRegenerate = useCallback(async () => {
  // 1. Warn if user has edited since generation (lastGeneratedAt + nodes differ from generated)
  if (hasUserEdits) { setShowRegenerateDialog(true); return; }
  await executeRegenerate();
}, [...]);

const executeRegenerate = useCallback(async () => {
  if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
  setIsGenerating(true);
  // 2. Call generate route with force=true, same scope + selectedConceptId from store
  const state = storeApi.getState();
  const res = await fetch('/api/build-pack/generate-journey-flow', {
    method: 'POST',
    body: JSON.stringify({ workshopId, scope: state.testScope, selectedConceptId: state.selectedConceptId, force: true }),
  });
  const data = await res.json();
  // 3. storeApi.setState({ ...data.state, isDirty: false })
  storeApi.setState({ nodes: data.nodes, edges: data.edges, ...data.meta, isDirty: false });
  setIsGenerating(false);
  toast.success('Baseline regenerated');
}, [workshopId, storeApi]);
```

Confirmation dialog reuses `AlertDialog` from shadcn — same import already in `journey-map-content.tsx`.

Detect "has user edits" by comparing `storeApi.getState().lastGeneratedAt` against `isDirty` (any dirty save after generation = user edited). Simpler than diffing node arrays.

### Anti-Patterns to Avoid

- **Don't use `generateObject` for the generate-journey-flow route.** The established build-pack convention is `generateTextWithRetry` + manual JSON parse. `generateObject` is for small, targeted LLM calls (classify, propose, suggest).
- **Don't write a new `loadConceptsForFlow` utility.** Use the existing `loadAllWorkshopArtifacts()` — it already loads the concept artifact. Extract concepts from `artifacts.concept.concepts[]` with the same `extractConcepts()` logic from `generate-journey-map`.
- **Don't maintain two parallel taxonomies.** The `FlowArchetype` is the new canonical concept. `StrategicIntent` is derived from it for backward compat with Phase 66.
- **Don't clobber the `save-journey-flow` route.** The generation route saves state via the same API that autosave uses (`POST /api/build-pack/save-journey-flow`). Do not inline a duplicate save — call the existing route or the shared upsert logic.
- **Don't autosave empty state during generation.** The `saveTimerRef` must be cleared BEFORE the store reset when regenerating — same guard established in Phase 63.
- **Don't block the scope chooser for read-only users.** If `isReadOnly`, show the canvas (or a "no baseline yet" message) without offering the generate UI.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retrying LLM calls on rate-limit | Custom retry | `generateTextWithRetry` from `src/lib/ai/gemini-retry.ts` | Already handles 429/RESOURCE_EXHAUSTED with exponential backoff |
| Loading all workshop artifacts | Custom DB queries | `loadAllWorkshopArtifacts(workshopId)` | Already joins stepArtifacts + workshopSteps for all 10 steps |
| Intent detection from workshop text | New classifier | Adapt `detectStrategicIntent()` from `intent-detection.ts` | Multi-signal scoring (keywords + verb patterns + persona role + stage names) is already tested |
| Extracting concepts from concept artifact | New extractor | Adapt `extractConcepts()` from `generate-journey-map/route.ts` | Handles all schema variants: `_canvas.conceptCards`, `concepts[]`, `selectedConcepts`, singular `concept` |
| Confirmation dialog before destructive action | Custom modal | `AlertDialog` from `src/components/ui/alert-dialog` | Same import used in `journey-map-content.tsx` regenerate flow |
| Toast notifications | Custom | `toast.success/toast.error` from `sonner` | Established pattern; olive-themed |
| Build-pack upsert | Custom DB write | `POST /api/build-pack/save-journey-flow` | Existing route with auth, ownership, empty-guard, upsert all handled |

---

## Common Pitfalls

### Pitfall 1: Archetype confusion — treating FlowArchetype and StrategicIntent as the same
**What goes wrong:** Planner creates a single taxonomy, either dropping archetypes or dropping strategicIntent, breaking Phase 66 prompt dispatch.
**Why it happens:** Both describe "what kind of product/flow" but at different levels of abstraction.
**How to avoid:** Keep both. `FlowArchetype` = flow structure (7 values). `StrategicIntent` = product category (5 values, required by Phase 66's `buildJourneyAwareV0Prompt()` dispatch). Store both in `JourneyFlowState`.

### Pitfall 2: Autosave race on regenerate
**What goes wrong:** User clicks Regenerate → store is cleared → autosave timer fires → empty state written to DB → baseline lost.
**Why it happens:** `isDirty` was set true when nodes were cleared; the 2s debounce fires after clearing.
**How to avoid:** Cancel `saveTimerRef.current` BEFORE clearing the store (same pattern as `executeReset` in `journey-map-content.tsx`, line 117).

### Pitfall 3: Scope chooser blocking participant view
**What goes wrong:** Participant (read-only) lands on Journey Flow → gets stuck on scope chooser with no way to view existing state.
**Why it happens:** The scope chooser replaces the entire content area before checking `isReadOnly`.
**How to avoid:** In `ScopeChooser`, if `isReadOnly && concepts.length === 0`: show "No journey flow has been generated yet." If `isReadOnly && hasNodes`: never show the scope chooser (the canvas renders directly).

### Pitfall 4: LLM emitting invalid `uiType` values
**What goes wrong:** LLM generates a node with `uiType: 'screen'` or similar — TypeScript compiles fine (the route accepts `unknown`) but the canvas node card renders badly.
**Why it happens:** LLM doesn't always respect enum constraints in text-mode output.
**How to avoid:** Add a `normalizeUiType()` validator in the generate route that clamps unknown values to `'detail-view'` (same pattern as `f.uiType || ('detail-view' as const)` in `generate-journey-map`). Do this in the post-parse normalization step.

### Pitfall 5: Mini-flow for single-feature not respecting scope
**What goes wrong:** Single-feature mode generates a full 8-node flow identical to journey mode.
**Why it happens:** The prompt or heuristic doesn't receive the `scope` flag, or the concept selection is ignored.
**How to avoid:** Single-feature mode: (1) restrict the prompt to only the selected concept's data, (2) explicitly instruct: "Generate exactly 3 nodes: Entry screen → Core action screen → Result/confirmation screen. No more.", (3) heuristic fallback always emits exactly 3 nodes in feature mode regardless of concept count.

### Pitfall 6: Two-sided annotation node breaks autosave
**What goes wrong:** The annotation node with `isAnnotation: true` saves to DB, then on reload is parsed as a normal node by the existing save/load code, losing the annotation flag.
**Why it happens:** `JourneyFlowState` types don't include `isAnnotation` in `JourneyFlowNode`; the saved JSON has it but TypeScript casts strip it.
**How to avoid:** Add `isAnnotation?: boolean` to the `JourneyFlowNode` interface in `types.ts` — it becomes part of the schema and survives JSON round-trips. The node card component checks it to apply annotation styling. The store's `addNode` action doesn't need changes (it already spreads the full node object).

### Pitfall 7: `_schemaVersion` not bumped after state shape extension
**What goes wrong:** Old saved states (schema v1) load with `flowArchetype: undefined`, Phase 66 blows up trying to dispatch on an undefined archetype.
**Why it happens:** Schema version not incremented; no migration guard.
**How to avoid:** Keep `_schemaVersion: 1` — the new fields (`flowArchetype`, `testScope`, etc.) are all `optional` in the type definition. Phase 66 should guard: `const archetype = state.flowArchetype ?? 'linear-sequence'`. No migration needed if all new fields are optional.

---

## Code Examples

### Scope Chooser component outline
```typescript
// src/components/journey-flow/scope-chooser.tsx
type Scope = 'journey' | 'feature';
interface ScopeChooserProps {
  workshopId: string;
  sessionId: string;
  concepts: Array<{ name: string; ideaSource: string; elevatorPitch?: string }>;
  isReadOnly?: boolean;
  onGenerate: (scope: Scope, selectedConceptId?: string) => Promise<void>;
  isGenerating: boolean;
}

// Two-card layout:
// [Test the whole journey] [Test a single feature]
// When 'feature' selected: shows concept picker (DropdownMenu or RadioGroup)
// CTA button: "Generate baseline" → calls onGenerate(scope, selectedConceptId)
// "Start from scratch" escape: small link below that calls a no-arg handler to
// add a single blank node (reuses existing handleAddFirstScreen logic)
```

### Generator heuristic (adapted from heuristic-mapper.ts)
```typescript
// src/lib/journey-flow/generator.ts
export interface FlowGenerationInput {
  concepts: ConceptData[];
  challengeContext: string;
  persona?: { name?: string; pains?: string[] } | null;
  scope: 'journey' | 'feature';
  selectedConceptIndex?: number;
}

export interface FlowGenerationOutput {
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
  flowArchetype: FlowArchetype;
  strategicIntent: StrategicIntent;  // derived from archetype mapping table
  isTwoSided: boolean;
}

export function heuristicGenerateFlow(input: FlowGenerationInput): FlowGenerationOutput {
  if (input.scope === 'feature') {
    return generateMiniFlow(input);
  }
  const archetype = detectArchetype(input.challengeContext, input.concepts);
  return generateFullFlow(input, archetype);
}
```

### Route body shape
```typescript
// POST /api/build-pack/generate-journey-flow
// Request body:
{
  workshopId: string;
  scope: 'journey' | 'feature';
  selectedConceptId?: string;   // concept name (used as stable ID)
  force?: boolean;
}
// Response:
{
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
  archetype: FlowArchetype;
  strategicIntent: StrategicIntent;
  isTwoSided: boolean;
  buildPackId: string;
  usedLlm: boolean;
}
```

### Page.tsx addition for concept loading
```typescript
// In journey-flow/page.tsx, after the existing buildPacks query:
const conceptRow = await db
  .select({ artifact: stepArtifacts.artifact })
  .from(stepArtifacts)
  .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
  .where(and(
    eq(workshopSteps.workshopId, workshop.id),
    eq(workshopSteps.stepId, 'concept')
  ))
  .limit(1);

const concepts = (() => {
  try {
    const artifact = conceptRow[0]?.artifact as { concepts?: Array<{name: string; ideaSource: string; elevatorPitch?: string}> } | null;
    return artifact?.concepts ?? [];
  } catch { return []; }
})();

return <JourneyFlowContent ... concepts={concepts} />;
```

---

## Archetype Detection from Workshop Signals

The heuristic `detectArchetype()` builds on the existing `detectStrategicIntent()` weighted scoring, adding archetype-specific signals:

| Archetype | Primary signals |
|-----------|----------------|
| `linear-sequence` | journey stages > 4, `experience_design` output type, onboarding/wizard keywords |
| `hub-and-spoke` | 2+ concepts, `dashboard`/`admin-portal` intent score wins |
| `single-page-sections` | `marketing-site` intent wins, brochure/landing/funnel keywords |
| `funnel` | `marketing-site` + "desirability" / "fake door" / "sign-up" keywords |
| `branching` | eligibility/triage/approve/reject/choose in concept names or challenge |
| `single-screen-tool` | `tool` intent wins, or single-feature mode with utility concept |
| `loop` | retention/engagement/habit/log/feedback in challenge context |

Two-sided detection: keywords `marketplace`, `platform`, `host`, `guest`, `provider`, `consumer`, `buyer`, `seller`, `B2B2C` → `isTwoSided = true`.

---

## Codebase Locations (exact paths)

| Purpose | Path |
|---------|------|
| Existing heuristic mapper (adapt) | `src/lib/journey-mapper/heuristic-mapper.ts` |
| Intent detection (adapt) | `src/lib/journey-mapper/intent-detection.ts` |
| Journey Flow types (extend) | `src/lib/journey-flow/types.ts` |
| Journey Flow store (extend) | `src/stores/journey-flow-store.ts` |
| Journey Flow provider | `src/providers/journey-flow-store-provider.tsx` |
| Canvas (no changes needed) | `src/components/journey-flow/journey-flow-canvas.tsx` |
| Node card (add isAnnotation guard) | `src/components/journey-flow/journey-flow-node-card.tsx` |
| Toolbar (add Regenerate button) | `src/components/journey-flow/journey-flow-toolbar.tsx` |
| Content component (replace empty state) | `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/journey-flow-content.tsx` |
| Route page (add concept loading) | `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/page.tsx` |
| Save route (unchanged) | `src/app/api/build-pack/save-journey-flow/route.ts` |
| Load all artifacts util | `src/lib/build-pack/load-workshop-artifacts.ts` |
| LLM retry wrapper | `src/lib/ai/gemini-retry.ts` |
| Generation pattern reference | `src/app/api/build-pack/generate-journey-map/route.ts` |
| AlertDialog (for regenerate confirm) | `src/components/ui/alert-dialog.tsx` |

---

## Generation Recommendation: Hybrid (LLM + Heuristic)

**Decision:** Hybrid, matching the `generate-journey-map` precedent.

**Rationale:**
- GEN-03 requires "AI determines archetype" — heuristic-only satisfies this (the existing intent-detection IS AI-like keyword scoring), but LLM produces significantly better node names and `purpose` fields (critical for Phase 66 prototype prompt quality).
- The existing LLM path (`generate-journey-map`) already proves the hybrid works: LLM first, heuristic fallback on any error.
- Model: `gemini-2.5-flash-lite` at temperature 0.3 — same as all other build-pack generation routes.
- The heuristic fallback is a simplified `heuristicMap()` adapter that emits `JourneyFlowNode[]` instead of `JourneyMappingResult`. This removes all the stage/group complexity that doesn't apply to Journey Flow.

**The heuristic fallback is not a "worse" product** — for many ideas it produces perfectly adequate baselines. The LLM path adds: better node names (from concept elevator pitches), better `keyElements` arrays, and more nuanced archetype detection for edge cases.

---

## Open Questions

1. **Where does Regenerate button appear on the canvas?**
   - What we know: The toolbar (`JourneyFlowToolbar`) currently has back-link + Mark Complete. `JourneyFlowCanvasToolbar` has pointer/hand + Add Screen.
   - What's unclear: Whether Regenerate belongs in `JourneyFlowToolbar` (top-left panel) or a new position.
   - Recommendation: Claude's discretion. Top-left panel next to the back-link (before Mark Complete) is cleanest — stays consistent with the old mapper's "Regenerate" placement.

2. **Scope chooser: does it re-appear for regenerate, or does regenerate use stored scope?**
   - What we know: `testScope` and `selectedConceptId` are stored in `JourneyFlowState`.
   - What's unclear: UX preference — show scope chooser again (allows scope change) vs re-run with stored scope (faster).
   - Recommendation: Claude's discretion. Re-run with stored scope (read from store) is simpler and avoids disrupting flow. If scope change is desired, user can use the AlertDialog to switch.

3. **Start-from-scratch escape hatch in scope chooser**
   - What we know: CONTEXT.md says manual-add should remain possible ("start from scratch" escape hatch).
   - What's unclear: Exact UI treatment — a small link below the CTA, or a separate button?
   - Recommendation: Claude's discretion. A small "Add manually instead" text link below the generate button is sufficient — it calls `storeApi.getState().addNode(...)` directly (same as Phase 63's `handleAddFirstScreen`) to get one blank node on canvas.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/journey-mapper/heuristic-mapper.ts` — full heuristic map logic; adaptation target
- `src/lib/journey-mapper/intent-detection.ts` — intent detection; archetype detection adapts this
- `src/lib/journey-flow/types.ts` — Phase 63 node/edge/state shapes; extension target
- `src/stores/journey-flow-store.ts` — Phase 63 store factory; action extension target
- `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/journey-flow-content.tsx` — empty-state entry point for scope chooser
- `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/page.tsx` — server component; concept loading addition point
- `src/app/api/build-pack/generate-journey-map/route.ts` — authoritative generation route pattern; direct model for new route
- `src/lib/build-pack/load-workshop-artifacts.ts` — `loadAllWorkshopArtifacts` utility
- `src/lib/ai/gemini-retry.ts` — `generateTextWithRetry` wrapper
- `src/lib/schemas/step-schemas.ts` — `conceptArtifactSchema`; defines concepts[] shape
- `src/components/journey-flow/journey-flow-toolbar.tsx` — current toolbar; Regenerate button addition point
- `.planning/phases/63-journey-flow-editor-core/63-*.SUMMARY.md` — what Phase 63 actually shipped

### Secondary (MEDIUM confidence)
- `.planning/milestones/v2.1-BRIEF.md` — locked decisions on archetypes and scope chooser
- `.planning/phases/64-ai-baseline-generation/64-CONTEXT.md` — user constraints

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all patterns proven in production
- Architecture: HIGH — generate route pattern is a direct adaptation of existing route; store extension is additive-only; scope-chooser slots into an existing branch point
- Archetype reconciliation: HIGH — both taxonomies fully read from source; mapping table is explicit
- Pitfalls: HIGH — most are documented analogues of bugs already fixed in Phase 63 / old mapper
- Two-sided detection: MEDIUM — detection heuristic is new (no existing codebase signal); LLM prompt handles it more reliably than keywords alone

**Research date:** 2026-06-11
**Valid until:** 90 days (stable codebase; only future phases invalidate)

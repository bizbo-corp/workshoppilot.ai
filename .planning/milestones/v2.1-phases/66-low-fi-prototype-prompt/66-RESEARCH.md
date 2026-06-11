# Phase 66: Low-Fi Prototype Prompt - Research

**Researched:** 2026-06-11
**Domain:** AI-enriched prompt generation from Journey Flow node data; build-pack persistence; full-page output route with fidelity switch
**Confidence:** HIGH — all key findings are from direct codebase inspection; no external library uncertainty

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Fidelity switch UI:**
- Lives in a prototype-prompt card on the step-10 validate page, alongside the Journey Flow deliverable (consistent with Phase 65 guidance cards)
- Segmented control (two-option pill): "Low fidelity" active, "High fidelity" present but non-interactive
- Hi-fi option shows a "Coming later" badge with muted/dimmed styling and not-allowed cursor — always visible, zero interaction
- Prompt is generated on demand via an explicit "Generate prompt" button (no auto-generation on card open)

**Prompt content & preamble:**
- AI-enriched generation: Gemini turns Journey Flow node data into fleshed-out screen descriptions (matches how other deliverables like PRD are generated); needs a loading state
- Prompt includes: screens + navigation derived from Journey Flow, a short persona/problem paragraph, and the validation goal (what the prototype is meant to test)
- No sample/placeholder-data instruction section
- Wireframe preamble uses hard, non-negotiable rules: grayscale only, system font, boxes/outlines, no branding, no polish, placeholder imagery as labeled boxes, only elements needed to test the idea
- Tech target is neutral and self-contained: "build a clickable prototype in your default stack; single self-contained app, no backend" — stays agent-agnostic

**Copy & next-step experience:**
- Prompt displayed as collapsed preview (~10 lines) with "Show full prompt" expand; copy button always copies full text
- Copy feedback: button morphs to "Copied ✓" briefly AND a Sonner toast confirms (olive-themed, consistent with app)
- Next-step instructions read "Paste into your preferred AI coding agent — v0, Claude, Codex, Replit"
- Help link opens an in-app dialog with the 3-step how-to (copy → open your agent → paste) and links to v0/Claude/Codex/Replit — no separate docs page
- No post-copy tracking; copying is the end of the app's job

**Regeneration & staleness:**
- Generated prompt persisted to DB so it survives reloads — user can return and copy again without another AI call
- When Journey Flow changes after generation: card shows a stale notice ("Journey Flow has changed since this prompt was generated") with a Regenerate button — no auto-regeneration
- Regenerate overwrites the previous prompt; no version history
- Single-feature mode: small scope label on the card ("Prompt covers your feature mini-flow")

### Claude's Discretion
- Exact stale-detection mechanism (hash, timestamp, version counter)
- Loading state design during generation
- Preview truncation specifics and expand interaction
- Shared journey-understanding function boundaries (flow parsing, screen descriptions, navigation derivation) — structured so hi-fi can be added without rework per PROMPT-04

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROMPT-01 | User sees a fidelity switch: low fidelity (functional) / high fidelity (visible but clearly stubbed "coming later") | Segmented-control pattern, muted styling; page.tsx is a placeholder ready for replacement |
| PROMPT-02 | Low-fi prompt generated from Journey Flow node data with mandatory wireframe preamble (grayscale, boxy, unbranded) | JourneyFlowNode[] schema known; Gemini enrichment pattern matches PRD/feature-prioritization routes; AI prompt file goes in `src/lib/ai/prompts/` |
| PROMPT-03 | Agent-agnostic plain text, prominent copy button, next-step instructions, help link; no v0-specific action | `copyToClipboard()` util exists at `src/lib/clipboard.ts`; Sonner toast pattern confirmed; Dialog primitive from shadcn/ui; no `create-v0-chat` dependency needed |
| PROMPT-04 | Journey-understanding logic (flow parsing, screen descriptions, navigation derivation) in shared functions reusable by hi-fi path | New `src/lib/journey-flow/prompt-builder.ts` (pure functions); API route imports from it; hi-fi future path imports same module |
| PROMPT-05 | Single-feature mode scopes prompt to mini-flow only (3-node entry→action→result) | `testScope` + `selectedConceptId` already stored in JourneyFlowState; filter out annotation nodes; include scope label |
</phase_requirements>

---

## Summary

Phase 66 replaces the placeholder `prototype-prompt/page.tsx` with a real prototype-prompt builder page. The core work is three things: (1) a new Gemini route (`/api/build-pack/generate-prototype-prompt`) that reads the saved Journey Flow from `build_packs` and enriches it into a full plain-text prompt; (2) a shared journey-understanding module (`src/lib/journey-flow/prompt-builder.ts`) with pure functions for flow parsing, navigation derivation, and screen description that both the low-fi path (this phase) and future hi-fi path can consume; (3) a client page component with the fidelity switch, generate/regenerate button, collapsible preview, copy UX, and stale detection.

Persistence re-uses the `build_packs` table under a new title prefix `Prototype Prompt:`, exactly as `Journey Flow:` works. Staleness detection compares the Journey Flow row's `updatedAt` timestamp against the stored prompt's `generatedFromFlowUpdatedAt` timestamp (this is Claude's discretion — timestamp is the simplest approach, zero schema changes needed).

The page route already exists (`src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx`) and already handles auth, ownership, and back-navigation. Phase 66 replaces only the placeholder body.

**Primary recommendation:** Build the AI enrichment route first (PROMPT-02), then the shared parser module (PROMPT-04), then the page UI (PROMPT-01, PROMPT-03, PROMPT-05). This order means UI can be developed against real data from the start.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@ai-sdk/google` + `generateTextWithRetry` | already installed | Gemini call for screen description enrichment | Same as all other AI build-pack routes |
| `src/lib/clipboard.ts` | project util | Copy-to-clipboard with fallback | Already used in `presence-bar.tsx`, `participant-overview.tsx` |
| `sonner` | already installed | Toast feedback on copy | Project standard; olive-themed toasts throughout |
| Drizzle `build_packs` table | already exists | Persist generated prompt text | Same persistence as Journey Flow, PRD, Tech Specs |
| shadcn/ui `Dialog` | already installed | Help how-to dialog | Used throughout workshop steps |
| shadcn/ui `Button` | already installed | Generate, Copy, Regenerate, expand/collapse | Standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/ai/usage-tracking.ts` | project util | Record Gemini token usage | Call `recordUsageEvent` after every Gemini call |
| `src/lib/build-pack/load-workshop-artifacts.ts` | project module | Load workshop persona + challenge artifacts for prompt enrichment | Used in every AI build-pack route |
| `src/lib/validation/llm-context.ts` | project module | `loadValidationBrief()` for workshop brief | Provides persona, problem, concepts in one call — reuse rather than re-loading artifacts |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Timestamp staleness detection | Node-level hash of `nodes[]` | Hash is more precise but requires serializing the array; timestamp is already stored in `JourneyFlowState.lastSavedAt` and the `build_packs.updatedAt` DB column — simpler, sufficient |
| New DB table for prototype prompt | `build_packs` with prefix `Prototype Prompt:` | New table would be overkill; `build_packs` is the established store for all text/JSON deliverables |
| Streaming the prompt to the client | `generateText` + return full text | This is a prompt-to-clipboard flow; no benefit to streaming; keeps the API route simpler |

**Installation:** No new packages required — all dependencies are already in the project.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/api/build-pack/
│   └── generate-prototype-prompt/route.ts   # NEW — Gemini enrichment + DB persist
├── app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/
│   ├── page.tsx                              # REPLACE placeholder body
│   └── prototype-prompt-content.tsx         # NEW — client component (fidelity switch, copy UX)
└── lib/
    ├── ai/prompts/
    │   └── low-fi-prototype-prompt.ts        # NEW — prompt-only file (string building, types)
    └── journey-flow/
        └── prompt-builder.ts                 # NEW — shared pure functions (PROMPT-04)
```

### Pattern 1: API Route — AI Enrichment + DB Persist

Established by `generate-journey-flow/route.ts` and `generate-prd/route.ts`. The route:

1. Auth + ownership check (Clerk `auth()`, workshop `clerkUserId` compare)
2. Cache check: query `build_packs WHERE title LIKE 'Prototype Prompt:%' AND workshopId = $1`
3. Load Journey Flow state from `build_packs WHERE title LIKE 'Journey Flow:%'`
4. Load workshop brief via `loadValidationBrief(workshopId)` (persona + problem + concepts)
5. Call `buildLowFiPrototypePrompt(flowState, brief)` to produce the Gemini input
6. Call `generateTextWithRetry({ model: google('gemini-2.5-flash-lite'), ... })`
7. Record usage via `recordUsageEvent`
8. Upsert result into `build_packs` with title `Prototype Prompt:{workshopTitle}`
9. Return `{ promptText, buildPackId, generatedFromFlowUpdatedAt }`

```typescript
// Source: src/app/api/build-pack/generate-journey-flow/route.ts (verified pattern)
const result = await generateTextWithRetry({
  model: google('gemini-2.5-flash-lite'),
  temperature: 0.3,
  prompt,
});
recordUsageEvent({
  workshopId,
  stepId: 'validate',
  operation: 'generate-prototype-prompt',
  model: 'gemini-2.5-flash-lite',
  inputTokens: result.usage?.inputTokens,
  outputTokens: result.usage?.outputTokens,
});
```

### Pattern 2: Shared Pure Functions Module (PROMPT-04)

`src/lib/journey-flow/prompt-builder.ts` — pure functions, no DB/React imports.

```typescript
// Functions the hi-fi path can also consume without rework
export function parseScreensFromFlow(nodes: JourneyFlowNode[]): ScreenSpec[]
export function deriveNavigation(nodes: JourneyFlowNode[], edges: JourneyFlowEdge[]): NavLink[]
export function buildScreenDescriptions(screens: ScreenSpec[]): string
export function buildNavigationSection(nav: NavLink[]): string
// Low-fi specific (hi-fi will add its own):
export function buildLowFiPreamble(): string
```

Internal types:
```typescript
export interface ScreenSpec {
  name: string;
  uiType: JourneyFlowUiType;
  purpose: string;
  keyElements: string[];
  addressesPain?: string;
  priority: JourneyFlowPriority;
  isAnnotation?: boolean; // excluded from prompt
}

export interface NavLink {
  from: string; // node name
  to: string;   // node name
}
```

### Pattern 3: Persistence with Build Packs Prefix

```typescript
// Source: src/app/api/build-pack/save-journey-flow/route.ts (verified pattern)
const existingRows = await db
  .select()
  .from(buildPacks)
  .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Prototype Prompt:%')));

const existing = existingRows.find((r) => r.formatType === 'json');
// Upsert JSON: { promptText, generatedFromFlowUpdatedAt, testScope, selectedConceptId }
```

The stored JSON shape:
```typescript
interface StoredPrototypePrompt {
  promptText: string;
  generatedFromFlowUpdatedAt: string;  // ISO — from build_packs.updatedAt for the Journey Flow row
  testScope: TestScope;
  selectedConceptId?: string;
}
```

### Pattern 4: Staleness Detection — Timestamp Comparison

Compare `generatedFromFlowUpdatedAt` (stored with the prompt) vs. the Journey Flow build_pack row's `updatedAt` column. When they differ, show the stale banner.

```typescript
// In the page server component:
const journeyFlowRow = rows.find((r) => r.formatType === 'json' && r.title.startsWith('Journey Flow:'));
const promptRow = promptRows.find((r) => r.formatType === 'json' && r.title.startsWith('Prototype Prompt:'));

let isStale = false;
if (promptRow && journeyFlowRow) {
  const stored = JSON.parse(promptRow.content!) as StoredPrototypePrompt;
  isStale = stored.generatedFromFlowUpdatedAt !== journeyFlowRow.updatedAt.toISOString();
}
```

### Pattern 5: Page Server Component — Auth, Load, Pass Down

`prototype-prompt/page.tsx` already has auth and ownership checking boilerplate. Extend it to:

1. Load Journey Flow build_pack row (for `isApproved`, `testScope`, `selectedConceptId`, and `updatedAt`)
2. Load Prototype Prompt build_pack row (for existing `promptText` and staleness check)
3. Pass both as props to `PrototypePromptContent` (client component)

```typescript
// Already in place: auth, session lookup, resolveClerkParticipant, redirect on !session
// To add:
const journeyFlowRows = await db.select().from(buildPacks)
  .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Journey Flow:%')));
const promptRows = await db.select().from(buildPacks)
  .where(and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Prototype Prompt:%')));
```

### Pattern 6: Client Component — Copy UX

```typescript
// Source: src/lib/clipboard.ts + src/components/workshop/presence-bar.tsx (verified pattern)
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from 'sonner';

const [copied, setCopied] = useState(false);

async function handleCopy() {
  const ok = await copyToClipboard(promptText);
  if (ok) {
    setCopied(true);
    toast.success('Prompt copied', { description: 'Paste into your preferred AI coding agent.' });
    setTimeout(() => setCopied(false), 2000);
  }
}
```

### Anti-Patterns to Avoid

- **Importing from `journey-v0-prompt.ts`:** That file uses old `JourneyMapperState` / `JourneyMapperNode` types. Phase 66 reads `JourneyFlowNode[]` from `JourneyFlowState`. Do not mix these.
- **Auto-generating on page load:** CONTEXT.md locks "Generate prompt" as explicit user action. Do not trigger Gemini call on mount.
- **Hardcoding a v0 link:** The copy flow is agent-agnostic. `create-v0-chat` and `deploy-v0` API routes must not be imported or linked.
- **Including annotation nodes:** `JourneyFlowNode.isAnnotation === true` nodes (two-sided product notices) are canvas meta-nodes, not screens. Filter them with `nodes.filter(n => !n.isAnnotation)` before building the prompt.
- **Using `db` directly without retry on query-heavy operations:** Follow the existing pattern — plain `db` for upserts (fast-path writes), `dbWithRetry` for queries at page render time when cold starts are possible.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Copy to clipboard | Custom navigator.clipboard wrapper | `src/lib/clipboard.ts` `copyToClipboard()` | Already handles HTTPS-only context failures with execCommand fallback |
| Toast feedback | Custom toast | Sonner `toast.success()` | App-standard, olive-themed |
| Workshop artifact loading | Direct DB queries for each step | `loadValidationBrief(workshopId)` + `loadAllWorkshopArtifacts(workshopId)` | Single function gives persona, problem, HMW winners, concepts — battle-tested |
| Dialog | Custom modal | shadcn/ui `Dialog` | Already in ui/ — help how-to dialog is the help link destination |
| Segmented control | Custom pill toggle | Two `Button` elements styled as a pill group | Simpler than a new component; the "coming later" state is truly no-op |

**Key insight:** The utility infrastructure (clipboard, toast, workshop context loading, DB upsert patterns) is already built. Phase 66 should compose existing pieces, not re-implement them.

---

## Common Pitfalls

### Pitfall 1: Including Annotation Nodes in the Prompt

**What goes wrong:** The two-sided product annotation node (`isAnnotation: true`) explains why only one side is mapped. If included in the screen list, the coding agent receives a meta-instruction as a screen spec and generates a broken prototype.

**Why it happens:** `JourneyFlowState.nodes` includes annotation nodes (prepended by `buildAnnotationNode()`).

**How to avoid:** Always filter: `const screens = nodes.filter(n => !n.isAnnotation)`.

**Warning signs:** A prompt that contains "Two-Sided Product Detected" as a screen name.

### Pitfall 2: Stale Prompt Served on Reload

**What goes wrong:** User generates a prompt, edits Journey Flow, reloads — sees the old prompt without the stale banner because the staleness check was not persisted.

**Why it happens:** If staleness is computed purely in the client (comparing store timestamps), it's lost on reload.

**How to avoid:** Store `generatedFromFlowUpdatedAt` in the build_packs JSON at generation time. The page server component reads both rows and passes `isStale` down to the client component.

### Pitfall 3: Journey Flow Row Not Found

**What goes wrong:** User navigates to the prototype prompt page before ever visiting the Journey Flow page (e.g., arrives via direct URL). Journey Flow build_pack row doesn't exist yet. Page crashes or shows broken state.

**Why it happens:** `like(buildPacks.title, 'Journey Flow:%')` returns zero rows.

**How to avoid:** In `page.tsx`, if no Journey Flow row is found, redirect to `journey-flow?from=prototype-prompt` with a toast message.

### Pitfall 4: `maxDuration` Not Set on Generation Route

**What goes wrong:** Vercel serverless function times out at the default 10s during Gemini enrichment.

**Why it happens:** All generate-* routes set `export const maxDuration = 60`. Forgetting it causes intermittent 504s.

**How to avoid:** Add `export const maxDuration = 60;` at the top of `generate-prototype-prompt/route.ts`.

### Pitfall 5: Hi-Fi Boundary Leaks into Low-Fi Module

**What goes wrong:** `prompt-builder.ts` grows low-fi-specific logic that later blocks hi-fi re-use.

**Why it happens:** Screen descriptions and navigation derivation are general; preamble is fidelity-specific.

**How to avoid:** `prompt-builder.ts` exports `buildLowFiPreamble()` as a separate function, not baked into `parseScreensFromFlow()`. The assembly of the final prompt string lives in `low-fi-prototype-prompt.ts` (the prompt-file), which composes the shared helpers with the low-fi preamble. Future hi-fi path imports the same shared helpers and adds its own assembler.

### Pitfall 6: Collapsed Preview Doesn't Cover Edge Cases

**What goes wrong:** A very short prompt (e.g., single-screen tool with 2 nodes) renders fewer than 10 lines — the "Show full prompt" button appears but expansion is empty. Or the expand state persists across regenerate, showing stale text.

**How to avoid:** Only show the expand control when `promptLines.length > 10`. Reset expand state to `false` on `promptText` change (use `useEffect` keyed on `promptText`).

---

## Code Examples

Verified patterns from codebase inspection:

### DB Upsert Pattern (Prototype Prompt: prefix)

```typescript
// Pattern from src/app/api/build-pack/save-journey-flow/route.ts
const existingRows = await db
  .select()
  .from(buildPacks)
  .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Prototype Prompt:%')));

const existing = existingRows.find((r) => r.formatType === 'json');
const content = JSON.stringify({
  promptText,
  generatedFromFlowUpdatedAt: journeyFlowRow.updatedAt.toISOString(),
  testScope,
  selectedConceptId: testScope === 'feature' ? selectedConceptId : undefined,
});

if (existing) {
  await db.update(buildPacks).set({ content }).where(eq(buildPacks.id, existing.id));
} else {
  await db.insert(buildPacks).values({
    workshopId,
    title: `Prototype Prompt:${workshopTitle}`,
    formatType: 'json',
    content,
  });
}
```

### Journey Flow → Screens Parser

```typescript
// In src/lib/journey-flow/prompt-builder.ts
export function parseScreensFromFlow(
  nodes: JourneyFlowNode[],
  edges: JourneyFlowEdge[]
): { screens: ScreenSpec[]; nav: NavLink[] } {
  // Exclude annotation nodes
  const screens = nodes
    .filter((n) => !n.isAnnotation)
    .map((n) => ({
      name: n.name,
      uiType: n.uiType,
      purpose: n.purpose,
      keyElements: n.keyElements,
      addressesPain: n.addressesPain,
      priority: n.priority,
    }));

  // Build a name index for navigation derivation
  const nameById = new Map(nodes.map((n) => [n.id, n.name]));
  const nav: NavLink[] = edges
    .map((e) => ({
      from: nameById.get(e.sourceNodeId) ?? '',
      to: nameById.get(e.targetNodeId) ?? '',
    }))
    .filter((l) => l.from && l.to);

  return { screens, nav };
}
```

### Low-Fi Preamble (Hard Rules)

```typescript
// In src/lib/ai/prompts/low-fi-prototype-prompt.ts
export function buildLowFiPreamble(): string {
  return `WIREFRAME PROTOTYPE INSTRUCTIONS (non-negotiable — do not deviate):
- Render in grayscale only. No color except black, white, and grays.
- Use the system default font. No custom fonts, icons, or branded assets.
- All UI elements are boxes and outlines only. No drop shadows, gradients, or polish.
- Placeholder images are labeled gray boxes (e.g. "[Image]", "[Logo]"). No real images.
- Include ONLY the elements needed to test the core idea. Strip everything decorative.
- Build a single self-contained app. No backend, no external APIs.
- The goal is a clickable wireframe — sketch quality is correct and expected.`;
}
```

### Gemini Prompt Assembly

```typescript
// In src/lib/ai/prompts/low-fi-prototype-prompt.ts
export function buildLowFiPrototypePrompt(
  flowState: JourneyFlowState,
  brief: ValidationBrief
): string {
  const { screens, nav } = parseScreensFromFlow(flowState.nodes, flowState.edges);
  const isSingleFeature = flowState.testScope === 'feature';

  const lines: string[] = [];

  lines.push(buildLowFiPreamble());
  lines.push('');
  lines.push('WHAT THIS PROTOTYPE IS TESTING:');
  lines.push(brief.brief.split('\n').slice(0, 6).join('\n')); // persona + problem
  lines.push('');

  if (isSingleFeature) {
    lines.push('SCOPE: Single feature prototype (mini-flow only)');
    lines.push('');
  }

  lines.push('SCREENS TO BUILD:');
  lines.push('');
  for (const screen of screens) {
    lines.push(`### ${screen.name}`);
    lines.push(`Purpose: ${screen.purpose}`);
    if (screen.keyElements.length > 0) {
      lines.push(`Include: ${screen.keyElements.join(', ')}`);
    }
    if (screen.addressesPain) {
      lines.push(`Addresses: ${screen.addressesPain}`);
    }
    lines.push('');
  }

  if (nav.length > 0) {
    lines.push('NAVIGATION:');
    for (const link of nav) {
      lines.push(`- ${link.from} → ${link.to}`);
    }
  }

  return lines.join('\n');
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Old mapper `buildJourneyAwareV0Prompt(state: JourneyMapperState)` in `journey-v0-prompt.ts` | New `buildLowFiPrototypePrompt(flowState: JourneyFlowState, brief)` in `low-fi-prototype-prompt.ts` | Old file reads `JourneyMapperNode` — incompatible with Phase 63+ types; do NOT reuse |
| v0-specific "Create on v0" button (`create-v0-chat` route) | Agent-agnostic copy/paste | Phase 66 creates no v0 dependency; `create-v0-chat` and `deploy-v0` routes remain untouched |
| PRD generation uses `generateText` only | Phase 66 uses `generateTextWithRetry` | Same retry wrapper as `generate-journey-flow` |

**Deprecated/outdated:**
- `src/lib/ai/prompts/journey-v0-prompt.ts`: v0-optimized, old mapper types. Not touched in Phase 66 (still used by the parked journey-map page via `v0-prompt-panel.tsx`).
- `src/components/journey-mapper/v0-prompt-panel.tsx`: old mapper component. Not touched.

---

## Open Questions

1. **Gemini prompt granularity for screen enrichment**
   - What we know: `loadValidationBrief()` already returns a rich summary (original idea, problem, reframed HMW, concepts). The Journey Flow nodes have `purpose` and `keyElements` from the Phase 64 generation.
   - What's unclear: Whether Gemini needs to do much "enrichment" at all, or whether the existing node data is already rich enough to produce a good low-fi prompt directly (no LLM call needed).
   - Recommendation: Build the Gemini-enriched path as locked in CONTEXT.md, but design `buildLowFiPrototypePrompt()` to produce a usable (if generic) prompt without enrichment. Use Gemini to write the persona/problem paragraph and validate goal from the brief — not to reinvent the screen list.

2. **Segmented-control styling for fidelity switch**
   - What we know: shadcn/ui has no Tabs-as-segmented-control variant explicitly, but two `Button` components in a bordered container achieves the visual.
   - What's unclear: Whether to wrap in a `role="radiogroup"` for accessibility.
   - Recommendation: Two Buttons in a pill wrapper, `aria-pressed` on the active one, `aria-disabled` + `cursor-not-allowed` on the hi-fi button. No Tab primitive needed.

3. **"Prompt covers your feature mini-flow" label placement**
   - What we know: Locked decision says show a scope label in single-feature mode.
   - What's unclear: Whether the label lives above the fidelity switch (context before action) or below the copy button (supplemental info).
   - Recommendation: Place immediately below the fidelity switch, before the Generate button — gives the user context before they trigger the AI call.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` (field absent = false). Skip formal test mapping.

The existing Playwright E2E suite (`npm run test:e2e`) is the project's only automated test layer. No E2E spec file should be created in Phase 66 (not in scope). Manual verification at checkpoint is the gate.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all patterns cited are from files read in this session
  - `src/app/api/build-pack/generate-journey-flow/route.ts` — API route + Gemini + upsert pattern
  - `src/app/api/build-pack/save-journey-flow/route.ts` — `build_packs` upsert, prefix convention
  - `src/lib/journey-flow/types.ts` — `JourneyFlowNode`, `JourneyFlowState`, `isAnnotation` flag
  - `src/lib/journey-flow/generator.ts` — `parseScreensFromFlow` pattern basis
  - `src/lib/ai/prompts/journey-v0-prompt.ts` — old prompt structure (do not reuse)
  - `src/lib/ai/prompts/journey-flow-prompt.ts` — node enrichment prompt pattern
  - `src/lib/validation/llm-context.ts` — `loadValidationBrief()`, `ValidationBrief` type
  - `src/lib/clipboard.ts` — `copyToClipboard()` utility
  - `src/app/(dashboard)/workshop/[sessionId]/outputs/prototype-prompt/page.tsx` — existing placeholder
  - `src/components/workshop/validate/ValidationGuidanceCard.tsx` — Phase 65 card patterns
  - `src/lib/ai/gemini-retry.ts` — `generateTextWithRetry`
  - `src/lib/ai/usage-tracking.ts` — `recordUsageEvent`
  - `src/db/schema/build-packs.ts` — table schema

### Secondary (MEDIUM confidence)
- None required — all critical patterns verified directly from codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — every pattern is an established project pattern verified from source
- Pitfalls: HIGH — annotation-node exclusion, timestamp staleness, maxDuration are confirmed real gaps in similar prior work
- Prompt design: MEDIUM — specific Gemini instructions are Claude's discretion; adequacy depends on quality of existing `purpose`/`keyElements` node data

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (stable project patterns; no external library uncertainty)

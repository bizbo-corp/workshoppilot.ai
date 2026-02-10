# Phase 19: AI-Canvas Integration - Research

**Researched:** 2026-02-11
**Domain:** AI chat and canvas bidirectional integration, Vercel AI SDK message parts, React state synchronization
**Confidence:** HIGH

## Summary

Phase 19 wires the canvas context assembly functions created in Phase 18 into the AI pipeline and implements "Add to canvas" action buttons on AI suggestions. The integration follows the existing unidirectional data flow: AI reads canvas state silently via system prompt context, and provides suggestions users can click to create post-its. Canvas state already persists automatically via Phase 15's auto-save hook.

The technical approach leverages:
1. **Canvas context assembly** (already built in Phase 18) - `assembleCanvasContextForStep()` produces quadrant-grouped context strings
2. **System prompt injection** - Modify `buildStepSystemPrompt()` to include canvas context from `assembleStepContext()`
3. **Custom message rendering** - Parse AI message content for special markup (similar to existing `[SUGGESTIONS]` pattern) to detect "Add to canvas" actions
4. **Canvas store access** - Chat panel calls `useCanvasStore()` to add post-its when action buttons clicked

**Primary recommendation:** Use a text-based markup pattern (like existing `[SUGGESTIONS]` block) rather than Vercel AI SDK's complex tool calling system. The canvas action is a simple client-side UI interaction (add post-it to store), not a server-side tool requiring execution/approval flows.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @ai-sdk/react | ^3.0.79 | Chat hook and message types | Official Vercel AI SDK React integration, already used in ChatPanel |
| ai | ^6.0.77 | Core AI SDK with streamText | Vercel AI SDK v6 for streaming chat responses |
| Zustand | via canvas-store | Canvas state management | Single source of truth for canvas, already implemented |

### No Additional Dependencies Required
Phase 19 uses existing infrastructure:
- Canvas context assembly: `src/lib/workshop/context/canvas-context.ts` (created Phase 18)
- Context assembly pipeline: `src/lib/context/assemble-context.ts` (created Phase 7)
- Chat UI: `src/components/workshop/chat-panel.tsx` (created Phase 5, enhanced Phase 8)
- Canvas store: `src/stores/canvas-store.ts` (created Phase 15)

## Architecture Patterns

### Pattern 1: Canvas Context Injection via System Prompt

**What:** Extend `assembleStepContext()` to load canvas state and call `assembleCanvasContextForStep()`, then inject result into system prompt.

**When to use:** AI needs to reference canvas state in conversation (requirement AICV-03).

**Flow:**
```typescript
// In src/lib/context/assemble-context.ts
export async function assembleStepContext(
  workshopId: string,
  currentStepId: string,
  sessionId: string
): Promise<StepContext> {
  // ... existing tier 1-3 assembly ...

  // NEW: Load canvas state and assemble context
  const canvasState = await loadCanvasState(workshopId, currentStepId);
  const canvasContext = canvasState?.postIts
    ? assembleCanvasContextForStep(currentStepId, canvasState.postIts)
    : '';

  return {
    persistentContext,
    summaries,
    messages,
    canvasContext, // NEW field
  };
}
```

Then in `src/lib/ai/chat-config.ts`, modify `buildStepSystemPrompt()` to inject canvas context:
```typescript
export function buildStepSystemPrompt(
  // ... existing params ...
  canvasContext: string // NEW param
): string {
  // ... existing prompt assembly ...

  // Add canvas context section (after LONG-TERM MEMORY, before CONTEXT USAGE RULES)
  if (canvasContext) {
    prompt += `\n\nCANVAS STATE (Current visual workspace):
${canvasContext}`;
  }

  // Update CONTEXT USAGE RULES to mention canvas
  if (persistentContext || summaries || canvasContext) {
    prompt += `\n\nCONTEXT USAGE RULES:
- Reference prior step outputs by name when relevant
- Reference canvas items when discussing stakeholders, insights, or ideas
- Build on prior knowledge — do not re-ask questions already captured on canvas
- If the user's input contradicts canvas or prior outputs, note discrepancy gently`;
  }

  return prompt;
}
```

**Source:** Existing hierarchical context pattern from Phase 7, extended to include canvas tier.

### Pattern 2: Text-Based Action Markup (Similar to SUGGESTIONS)

**What:** AI generates special markup blocks in message content that client parses and renders as action buttons.

**When to use:** Adding simple client-side actions (add to canvas) without server-side tool execution complexity.

**Existing pattern (from chat-panel.tsx):**
```typescript
// AI generates:
// [SUGGESTIONS]
// - Suggestion one
// - Suggestion two
// [/SUGGESTIONS]

function parseSuggestions(content: string): { cleanContent: string; suggestions: string[] } {
  const match = content.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/);
  if (!match) return { cleanContent: content, suggestions: [] };

  const cleanContent = content.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '').trim();
  const suggestions = match[1].split('\n')...
}
```

**New pattern for canvas actions:**
```typescript
// AI generates:
// Here are some key stakeholders to consider:
//
// [CANVAS_ITEM]Product Manager - High power, high interest[/CANVAS_ITEM]
// [CANVAS_ITEM]End Users - Low power, high interest[/CANVAS_ITEM]

function parseCanvasItems(content: string): { cleanContent: string; canvasItems: string[] } {
  const regex = /\[CANVAS_ITEM\](.*?)\[\/CANVAS_ITEM\]/g;
  const items: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    items.push(match[1].trim());
  }

  // Keep markup visible in content (don't strip), render as buttons
  return { cleanContent: content, canvasItems: items };
}
```

**Rendering in ChatPanel:**
```tsx
// After parsing assistant message content:
const { canvasItems } = parseCanvasItems(content);

// In message rendering:
<div className="prose">
  <ReactMarkdown>{cleanContent}</ReactMarkdown>
</div>

{canvasItems.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-2">
    {canvasItems.map((item, i) => (
      <button
        key={i}
        onClick={() => handleAddToCanvas(item)}
        className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
      >
        <Plus className="h-3 w-3" />
        Add to canvas
      </button>
    ))}
  </div>
)}
```

**Why this pattern vs. AI SDK tool calling:**
- ✅ Simpler: No server-side tool definition/execution
- ✅ Client-only: Canvas store lives in browser, no server round-trip needed
- ✅ Proven: `[SUGGESTIONS]` pattern already works in codebase
- ✅ Flexible: Easy to extend with metadata (color, quadrant hint, etc.)
- ❌ Tool calling would require: server route, execute function, `addToolOutput`, tool invocation rendering

**Alternative considered:** AI SDK tool calling with `addToolOutput`. Rejected because canvas actions are purely client-side UI operations, not server-executed tools.

### Pattern 3: Cross-Panel State Access via Zustand

**What:** ChatPanel accesses canvas store to add post-its when action buttons clicked.

**When to use:** UI components in different panels need to share state (chat → canvas).

**Implementation:**
```tsx
// In chat-panel.tsx
import { useCanvasStore } from '@/providers/canvas-store-provider';

export function ChatPanel({ stepOrder, sessionId, workshopId, ... }) {
  const { addPostIt } = useCanvasStore((state) => ({
    addPostIt: state.addPostIt,
  }));

  const handleAddToCanvas = (text: string) => {
    // Create post-it at default position (center of viewport or smart placement)
    addPostIt({
      text,
      position: { x: 0, y: 0 }, // Canvas will auto-place near center
      width: 120,
      height: 120,
      color: 'yellow',
    });

    // Optional: show toast confirmation
    // toast.success('Added to canvas');
  };

  // ... parse canvasItems and render buttons ...
}
```

**Positioning strategy:** Since chat panel doesn't have access to canvas viewport, use a default position (0,0 or small offset). The user can drag the post-it immediately after creation. Alternative: add a "smart placement" utility that finds an empty spot near the center.

**Source:** Existing Zustand provider pattern from Phase 15, cross-panel state access pattern from Phase 16 (resize state shared between panels).

### Pattern 4: AI Prompt Instructions for Canvas Actions

**What:** System prompt instructs AI when and how to generate `[CANVAS_ITEM]` markup.

**When to use:** During Gather and Synthesize arc phases on Steps 2 and 4, when AI suggests stakeholders or insights.

**Prompt addition (in buildStepSystemPrompt):**
```typescript
// Add after GENERAL GUIDANCE, conditional on step and arc phase
if ((stepId === 'stakeholder-mapping' || stepId === 'sense-making') &&
    (arcPhase === 'gather' || arcPhase === 'synthesize')) {
  prompt += `\n\nCANVAS ACTIONS:
When suggesting ${stepId === 'stakeholder-mapping' ? 'stakeholders' : 'insights/observations'}, wrap each item in [CANVAS_ITEM]...[/CANVAS_ITEM] tags so the user can add them to the canvas with one click.
Format: [CANVAS_ITEM]Brief text (under 80 chars)[/CANVAS_ITEM]
Example: "Here are key stakeholders: [CANVAS_ITEM]Product Manager - high influence[/CANVAS_ITEM]"
Only use for concrete items the user should visualize on canvas, not for questions or explanations.`;
}
```

**Conditional logic:** Only enable on steps with canvas (2, 4 currently), and during phases where AI is actively gathering/synthesizing content (not Orient or Validate).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool calling system for canvas | Custom server-side action framework with approval flows | Text markup pattern + client-side store access | Canvas actions are UI-only, no server execution needed. Tool calling adds complexity (server route, execute callbacks, tool invocation rendering) without benefit. |
| Canvas state loading in chat route | Separate API endpoint or database query in chat panel | Extend existing `assembleStepContext()` | Context assembly already queries DB efficiently, loading canvas state in same query prevents N+1 problem. |
| Post-it positioning algorithm | Complex viewport-aware placement logic | Default position (0,0) + user drag | Users expect to position post-its manually, auto-placement removes agency. Simple default prevents edge cases. |
| Message part type system | Custom message format with action types | Text parsing (regex) like existing `[SUGGESTIONS]` | Proven pattern in codebase, simpler than extending message type definitions. |

**Key insight:** The Vercel AI SDK's tool calling system is powerful for agentic workflows (calling APIs, querying databases, requiring approval), but canvas actions are simple client-side UI operations. Text markup + parsing is the right level of abstraction.

## Common Pitfalls

### Pitfall 1: Canvas State Not Fresh in AI Context

**What goes wrong:** AI references outdated canvas state because auto-save hasn't persisted recent changes yet.

**Why it happens:** Canvas auto-save has 2s debounce (Phase 15). If user adds post-its and immediately asks AI a question, AI sees stale state.

**How to avoid:**
1. Accept eventual consistency - 2s staleness is acceptable for conversation flow
2. Document in AI prompt: "Canvas state may be 1-2 seconds behind user's latest changes"
3. Alternative (if needed): Force-save canvas before AI requests, but adds latency

**Warning signs:** User reports "AI doesn't see what I just added to canvas."

**Resolution:** Phase 15 already has force-save via `saveNow()` hook. If needed, call before `sendMessage()`.

### Pitfall 2: Action Buttons Rendered for Old Messages on Step Re-Entry

**What goes wrong:** User returns to step, sees old assistant messages with "Add to canvas" buttons, clicks them, creates duplicate post-its.

**Why it happens:** Messages persist in DB and reload on step entry. AI suggested items that user may have already added manually.

**How to avoid:**
1. **Option A (Recommended):** Don't prevent duplicates - let user manage canvas manually (delete if duplicate)
2. **Option B:** Track which canvas items came from AI actions vs. manual creation (add `source` field to PostIt), disable buttons for items already on canvas
3. **Option C:** Only render action buttons on messages from current session (check message timestamp)

**Warning signs:** User complains about duplicate post-its appearing on canvas.

**Recommendation:** Start with Option A (allow duplicates). Canvas is a freeform workspace, users may intentionally want duplicate post-its. Add `Ctrl+Z` undo if they accidentally duplicate.

### Pitfall 3: Markup Leaking into Markdown Rendering

**What goes wrong:** `[CANVAS_ITEM]...[/CANVAS_ITEM]` appears as literal text in message display if not properly parsed/removed.

**Why it happens:** ReactMarkdown renders raw content, markup needs to be extracted or hidden before markdown parsing.

**How to avoid:**
1. **Option A:** Parse and remove markup before passing to ReactMarkdown:
   ```tsx
   const contentWithoutMarkup = content.replace(/\[CANVAS_ITEM\].*?\[\/CANVAS_ITEM\]/g, '');
   <ReactMarkdown>{contentWithoutMarkup}</ReactMarkdown>
   ```
2. **Option B:** Parse and replace with inline placeholder:
   ```tsx
   const contentWithPlaceholder = content.replace(
     /\[CANVAS_ITEM\](.*?)\[\/CANVAS_ITEM\]/g,
     '**$1** 📋'
   );
   ```
3. **Option C:** Keep markup visible but styled (show tags as badges)

**Warning signs:** User sees `[CANVAS_ITEM]` text literally in AI messages.

**Recommendation:** Option A (remove completely) + render buttons below message separately. Clean separation between message text and actions.

### Pitfall 4: Canvas Store Not Available in Chat Panel SSR

**What goes wrong:** `useCanvasStore()` throws error on server-side render or during hydration.

**Why it happens:** Canvas store created client-side via dynamic import in Phase 15, but ChatPanel may try to access during SSR.

**How to avoid:** ChatPanel already client-only (`'use client'` directive from Phase 5). Verify no SSR issues exist:
1. ✅ ChatPanel has `'use client'` directive
2. ✅ CanvasStoreProvider wraps step page client-side
3. ⚠️ Ensure `useCanvasStore()` called inside component body (not module scope)

**Warning signs:** `Error: Cannot access store before initialization` or hydration mismatch.

**Verification:** Already safe - ChatPanel is client component, CanvasStoreProvider exists.

## Code Examples

Verified patterns based on existing codebase:

### Example 1: Extend assembleStepContext with Canvas Context

```typescript
// File: src/lib/context/assemble-context.ts
import { loadCanvasState } from '@/actions/canvas-actions';
import { assembleCanvasContextForStep } from '@/lib/workshop/context/canvas-context';

export async function assembleStepContext(
  workshopId: string,
  currentStepId: string,
  sessionId: string
): Promise<StepContext> {
  // ... existing tier 1-3 queries (artifacts, summaries, messages) ...

  // Tier 4: Canvas state (if canvas enabled for this step)
  const canvasState = await loadCanvasState(workshopId, currentStepId);
  const canvasContext = canvasState?.postIts
    ? assembleCanvasContextForStep(currentStepId, canvasState.postIts)
    : '';

  return {
    persistentContext,
    summaries,
    messages,
    canvasContext, // NEW: Canvas context string
  };
}
```

**Source:** Existing `assembleStepContext()` pattern from Phase 7, `loadCanvasState()` from Phase 15, `assembleCanvasContextForStep()` from Phase 18.

### Example 2: Inject Canvas Context into System Prompt

```typescript
// File: src/lib/ai/chat-config.ts
export function buildStepSystemPrompt(
  stepId: string,
  stepName: string,
  arcPhase: ArcPhase,
  stepDescription: string,
  persistentContext: string,
  summaries: string,
  canvasContext: string, // NEW param
  instructionsOverride?: string
): string {
  // ... existing prompt assembly ...

  // After LONG-TERM MEMORY section
  if (summaries) {
    prompt += `\n\nLONG-TERM MEMORY (Summaries of previous step conversations):
${summaries}`;
  }

  // NEW: Canvas state section
  if (canvasContext) {
    prompt += `\n\nCANVAS STATE (Visual workspace for this step):
${canvasContext}

The canvas shows items the user has visually organized. Reference these when relevant.`;
  }

  // Update CONTEXT USAGE RULES to mention canvas
  if (persistentContext || summaries || canvasContext) {
    prompt += `\n\nCONTEXT USAGE RULES:
- Reference prior step outputs by name when relevant
- Reference canvas items naturally in your responses (e.g., "I see you have 3 stakeholders in the Manage Closely quadrant...")
- Build on canvas content — do not re-suggest items already on canvas
- If the user's input contradicts canvas state, note the discrepancy gently`;
  }

  // ... rest of prompt ...
}
```

**Source:** Extended from existing `buildStepSystemPrompt()` in Phase 8.

### Example 3: Update Chat Route to Pass Canvas Context

```typescript
// File: src/app/api/chat/route.ts
export async function POST(req: Request) {
  // ... existing code ...

  const stepContext = await assembleStepContext(workshopId, stepId, sessionId);

  // Build system prompt with canvas context
  const systemPrompt = buildStepSystemPrompt(
    stepId,
    stepName,
    arcPhase,
    stepDescription,
    stepContext.persistentContext,
    stepContext.summaries,
    stepContext.canvasContext, // NEW: Pass canvas context
    instructionsOverride
  );

  // ... rest of handler ...
}
```

**Source:** Existing chat route from Phase 5, extended in Phase 8.

### Example 4: Parse Canvas Item Markup in ChatPanel

```typescript
// File: src/components/workshop/chat-panel.tsx

/**
 * Parse [CANVAS_ITEM]...[/CANVAS_ITEM] markup from AI content
 * Returns clean content (markup removed) and extracted canvas items
 */
function parseCanvasItems(content: string): {
  cleanContent: string;
  canvasItems: Array<{ text: string; index: number }>
} {
  const items: Array<{ text: string; index: number }> = [];
  const regex = /\[CANVAS_ITEM\](.*?)\[\/CANVAS_ITEM\]/g;
  let match;
  let index = 0;

  while ((match = regex.exec(content)) !== null) {
    items.push({ text: match[1].trim(), index: index++ });
  }

  // Remove markup from content for clean markdown rendering
  const cleanContent = content.replace(/\[CANVAS_ITEM\].*?\[\/CANVAS_ITEM\]/g, '');

  return { cleanContent, canvasItems: items };
}

export function ChatPanel({ ... }) {
  const { addPostIt } = useCanvasStore((state) => ({
    addPostIt: state.addPostIt,
  }));

  const handleAddToCanvas = (text: string) => {
    // Add post-it at default position (canvas center)
    // User can drag to desired location immediately
    addPostIt({
      text,
      position: { x: 0, y: 0 },
      width: 120,
      height: 120,
      color: 'yellow',
    });
  };

  // In message rendering (assistant messages):
  const { cleanContent, canvasItems } = parseCanvasItems(content);

  return (
    // ... existing structure ...
    <div className="flex-1">
      <div className="rounded-lg bg-muted p-3 text-sm prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{cleanContent}</ReactMarkdown>
      </div>

      {canvasItems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {canvasItems.map((item) => (
            <button
              key={item.index}
              onClick={() => handleAddToCanvas(item.text)}
              className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add to canvas
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Source:** Pattern based on existing `parseSuggestions()` function in ChatPanel, `useCanvasStore` from Phase 15.

### Example 5: Add Canvas Action Instructions to System Prompt

```typescript
// File: src/lib/ai/chat-config.ts (in buildStepSystemPrompt)

// After GENERAL GUIDANCE, add step-specific canvas instructions
if ((stepId === 'stakeholder-mapping' || stepId === 'sense-making') &&
    (arcPhase === 'gather' || arcPhase === 'synthesize')) {
  const itemType = stepId === 'stakeholder-mapping' ? 'stakeholders' : 'insights';

  prompt += `\n\nCANVAS ACTIONS:
When suggesting ${itemType} the user should add to their canvas, wrap each item in [CANVAS_ITEM]...[/CANVAS_ITEM] tags.
This creates an "Add to canvas" button so they can add it with one click.

Format: [CANVAS_ITEM]Brief item text (max 80 characters)[/CANVAS_ITEM]

Example: "Here are key stakeholders to consider: [CANVAS_ITEM]Product Manager - high influence[/CANVAS_ITEM] and [CANVAS_ITEM]End Users - primary beneficiaries[/CANVAS_ITEM]"

Guidelines:
- Only use for concrete ${itemType} that belong on the canvas
- Keep text brief (fits on a post-it note)
- Don't wrap questions, explanations, or general text
- Limit to 3-5 items per message (avoid overwhelming the user)`;
}
```

**Source:** Pattern follows existing arc phase conditional instructions in `buildStepSystemPrompt()`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool calling for all AI actions | Text markup for UI-only actions, tools for server-side execution | AI SDK v5-6 (2024) | Simpler client-side actions, tools reserved for agentic workflows |
| Generic tool-invocation parts | Type-specific tool parts (`tool-TOOLNAME`) | AI SDK v5 (2024) | Better type safety but more complex |
| Manual message part rendering | AI Elements components (`<Message>`, `<MessageActions>`) | AI SDK v6 (2025) | Optional - we use custom rendering |
| Annotations for metadata | Data parts for streaming structured data | AI SDK v5 (2024) | We don't need streaming metadata for canvas actions |

**Current best practice (2026):**
- ✅ Use tools for server-side actions (API calls, database queries, external services)
- ✅ Use text markup or data parts for client-side UI actions
- ✅ Use AI Elements components for standard chat UI (optional, we have custom)
- ❌ Don't use tools for simple client-side state updates

**Deprecated/outdated:**
- ~~`useChat` annotations for custom data~~ → Use data parts or text markup
- ~~Generic `tool-invocation` part type~~ → Use `tool-TOOLNAME` for type safety
- ~~`onFinish` for streaming custom metadata~~ → Use `dataStream.writeMessageAnnotation()`

Our approach (text markup) is simpler and appropriate for the use case.

## Open Questions

1. **Should canvas items from AI include quadrant hints?**
   - What we know: AI context includes quadrant-grouped post-its, AI knows which quadrant items belong in
   - What's unclear: Should `[CANVAS_ITEM]` include quadrant metadata? E.g., `[CANVAS_ITEM quadrant="high-power-high-interest"]CEO[/CANVAS_ITEM]`
   - Recommendation: Start simple (no quadrant metadata). Let quadrant detection assign based on position (0,0 default). Phase 2: add optional quadrant hint if AI suggestions frequently land in wrong quadrant.

2. **Should "Add to canvas" create post-it immediately or show preview dialog?**
   - What we know: Current pattern is immediate creation (like toolbar "+" button)
   - What's unclear: Would users benefit from position/color preview before creation?
   - Recommendation: Immediate creation (AICV-02 says "creates post-it"). Users can undo (Ctrl+Z from Phase 17) or delete (Backspace) if unwanted.

3. **How to handle canvas items in non-canvas steps?**
   - What we know: Canvas visible on all steps (Phase 16), but not all steps use canvas semantically
   - What's unclear: Should AI suggest canvas items on steps like "Challenge" or "User Research"?
   - Recommendation: Limit `[CANVAS_ITEM]` markup to steps 2 and 4 only (stakeholder-mapping, sense-making) via system prompt conditional. Other steps can use canvas manually but AI doesn't prompt for it.

4. **Should added-from-AI post-its have special visual indicator?**
   - What we know: PostIt has `color` field, could add `source: 'ai' | 'user'` field
   - What's unclear: Value of distinguishing AI-suggested vs user-created post-its
   - Recommendation: No distinction. Once user clicks "Add to canvas", it becomes their post-it (they own the decision). Avoid "AI vs human" visual hierarchy that reduces user agency.

## Sources

### Primary (HIGH confidence)
- Codebase files:
  - `src/lib/workshop/context/canvas-context.ts` - Canvas context assembly (Phase 18)
  - `src/lib/context/assemble-context.ts` - Context pipeline (Phase 7)
  - `src/lib/ai/chat-config.ts` - System prompt builder (Phase 8)
  - `src/components/workshop/chat-panel.tsx` - Chat UI with suggestions pattern (Phase 5, 8)
  - `src/stores/canvas-store.ts` - Canvas state management (Phase 15)
  - `src/actions/canvas-actions.ts` - Canvas persistence (Phase 15)
  - `.planning/phases/18-step-specific-canvases/18-02-SUMMARY.md` - Phase 18 completion notes
- [Vercel AI SDK Chatbot with Tool Calling](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling) - Official tool calling documentation
- [AI Elements Message Component](https://elements.ai-sdk.dev/components/message) - Official message rendering patterns

### Secondary (MEDIUM confidence)
- [AI SDK Core: streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Streaming API reference
- [AI SDK UI: Streaming Custom Data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data) - Data parts and annotations
- [shadcn AI Actions Component](https://www.shadcn.io/ai/actions) - Action button patterns (optional UI library)

### Tertiary (LOW confidence, informational only)
- [GitHub Discussion: Custom Message Attributes](https://github.com/vercel/ai/discussions/3284) - Community patterns for extending messages
- [GitHub Issue: onFinish parts availability](https://github.com/vercel/ai/issues/7288) - Known SDK limitations

## Metadata

**Confidence breakdown:**
- Canvas context injection: HIGH - Straightforward extension of existing context pipeline
- Text markup pattern: HIGH - Proven in codebase with `[SUGGESTIONS]`, simpler than tool calling
- Canvas store access: HIGH - Zustand pattern already used, client-side only, no SSR issues
- AI prompt instructions: MEDIUM - Clear approach but needs testing to tune markup frequency/quality

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable Vercel AI SDK v6, no breaking changes expected)

**Key assumptions:**
1. Canvas auto-save (2s debounce) is acceptable latency for AI context freshness
2. Text markup pattern is sufficient (no need for AI SDK tool calling complexity)
3. Default position (0,0) for AI-added post-its is acceptable UX (user drags to place)
4. Canvas actions limited to Steps 2 and 4 only (stakeholder-mapping, sense-making)

**Breaking changes that would invalidate research:**
- Vercel AI SDK v7 deprecates text-based streaming (unlikely - core feature)
- Requirements change to need server-side canvas actions (e.g., AI auto-arranges post-its)
- Canvas becomes persistent across steps (shared workspace) instead of step-isolated

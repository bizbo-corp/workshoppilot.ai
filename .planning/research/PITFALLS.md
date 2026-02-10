# Pitfalls Research: Canvas/Post-It Integration

**Domain:** Adding canvas/whiteboard post-it functionality to existing Next.js AI facilitation app
**Researched:** 2026-02-10
**Confidence:** HIGH

**Context:** This research focuses on common mistakes when ADDING split-screen canvas/post-it functionality to the EXISTING WorkshopPilot.ai v1.0 system (Next.js 16.1.1 App Router, React 19, Neon Postgres, Drizzle ORM, Vercel AI SDK, Gemini 2.0 Flash, Zustand state). Specifically addresses pitfalls for Steps 2 (Stakeholder Mapping) and 4 (Research Sense Making) where users interact with both AI chat and visual canvas.

## Critical Pitfalls

### Pitfall 1: SSR/Hydration Mismatch with Canvas Libraries

**What goes wrong:**
App builds successfully, deploys to Vercel, but crashes on initial page load with "Text content does not match server-rendered HTML" hydration errors. Canvas element renders as empty `<div>` on server, but attempts to render full interactive canvas on client. React throws hydration mismatch errors. In worst cases, Next.js renders canvas components on server side, causing "window is not defined" or "document is not defined" errors because canvas libraries (Tldraw, ReactFlow, Konva) assume browser-only environment with DOM and Canvas API access.

**Why it happens:**
Canvas libraries are fundamentally client-side only - they require browser Canvas API, touch/mouse events, and DOM manipulation that don't exist in Node.js server environment. Next.js App Router defaults to Server Components with SSR. When you import a canvas library in a Server Component, Next.js attempts to execute canvas code during server rendering, hitting browser-only APIs. Even when properly marked as Client Components with `'use client'`, hydration mismatches occur if the canvas library renders differently on initial client hydration vs. server HTML output. React-konva documentation explicitly states: "On the server side it will render just empty div. So it doesn't make much sense to use react-konva for server-side rendering." Tldraw had SSR working in v3.7.2 but broke in later versions due to core-js import issues (GitHub issue #5543, #6567).

**How to avoid:**
Use Next.js dynamic imports with `ssr: false` to force client-side only rendering:

```typescript
'use client';
import dynamic from 'next/dynamic';

const StakeholderCanvas = dynamic(
  () => import('@/components/canvas/stakeholder-canvas'),
  {
    ssr: false,
    loading: () => <div className="animate-pulse">Loading canvas...</div>
  }
);
```

Place the `'use client'` directive at the TOP of the file that imports the canvas library, not in the canvas component itself. Ensure ALL canvas-related code (including helper utilities that reference canvas context, touch events, etc.) is inside the dynamically imported boundary. Test in production Vercel environment, not just local dev - Vercel's Edge Runtime has stricter SSR enforcement than local Next.js dev server. For Konva specifically, configure `connect_timeout=10` to fail fast rather than hang. Use loading states that match server-rendered layout to prevent layout shift when canvas hydrates.

**Warning signs:**
- "window is not defined" errors in server logs
- "document is not defined" errors during build
- Hydration mismatch warnings in browser console
- Canvas appears blank on initial page load, then flashes in after hydration
- Different layout between server HTML (view source) and client render
- Vercel build succeeds but runtime errors on first page visit

**Phase to address:**
Phase 1 (Canvas Foundation) - Must be architectural from day one. You cannot retrofit SSR-safe imports after building canvas features with wrong import strategy. All canvas components must use dynamic import with `ssr: false` from the start.

---

### Pitfall 2: Bidirectional State Sync Race Conditions

**What goes wrong:**
AI suggests 5 stakeholders in chat. User clicks "Add to canvas" button. Canvas updates with 5 post-its. User drags one post-it to different position on canvas. AI doesn't "see" the move - next suggestion references old positions. User edits post-it text directly on canvas ("CEO" → "Chief Executive Officer"). AI continues using old text "CEO" in subsequent messages. Or worse: User edits canvas, triggers AI response, AI's response triggers canvas update, which triggers state change, which triggers another AI call - infinite loop. Race condition: canvas update writes to Zustand store at same moment AI response writes to same store, one update clobbers the other.

**Why it happens:**
Multiple sources of truth without clear ownership - both AI and canvas can initiate state changes. State synchronization becomes bidirectional instead of unidirectional data flow. React's concurrent rendering (React 19) can batch state updates in unpredictable order, causing canvas render with stale data while AI has fresh data. Zustand's `useSyncExternalStore` (under the hood) prevents some race conditions but doesn't prevent logical races where canvas update and AI update both modify same post-it simultaneously. Developers fall into "prop syncing" anti-pattern where canvas component mirrors props in local state, creating two sources of truth. As Kent C. Dodds states: "Don't Sync State. Derive It!" - when same data duplicated between state variables, it's difficult to keep in sync. React documentation warns: "Syncing state with props is an anti-pattern" because it creates confusion about which state is canonical.

**How to avoid:**
Establish single source of truth: Zustand store is canonical, both AI and canvas are projections. Implement unidirectional data flow:
- AI updates → Zustand store → Canvas reads from store
- Canvas updates → Zustand store → AI reads from store on next request (NOT reactively)

Use event-driven architecture with debouncing:

```typescript
// Canvas component
const handlePostItDrag = useMemo(
  () => debounce((id, position) => {
    updatePostItPosition(id, position); // Updates Zustand
    // AI does NOT react to this change
  }, 300),
  []
);
```

AI only reads canvas state when user explicitly sends message, not on every canvas change. Use optimistic updates for AI suggestions:

```typescript
// AI suggests stakeholders
const tempId = `temp-${Date.now()}`;
addPostIt({ id: tempId, ...aiSuggestion }); // Optimistic
await saveToDatabase();
updatePostItId(tempId, dbId); // Reconcile with real ID
```

Implement version tracking to detect conflicts:

```typescript
interface PostIt {
  id: string;
  version: number; // Increment on every update
  lastModifiedBy: 'user' | 'ai';
}
```

Never put canvas state in React component state - always derive from Zustand store. Use Zustand's transient updates feature for high-frequency canvas events (drag, resize) that don't need to trigger re-renders.

**Warning signs:**
- Canvas flickers during AI responses (conflicting updates)
- Post-it positions "jump back" after drag (stale state overwrite)
- Infinite render loops in React DevTools
- AI suggestions referencing outdated canvas state
- Database showing rapid succession of updates to same post-it
- Users reporting "my changes got erased" when AI responds

**Phase to address:**
Phase 2 (State Sync Architecture) - Must be designed upfront before implementing canvas OR AI integration. Retrofitting unidirectional flow after building bidirectional sync requires rewriting both AI and canvas components.

---

### Pitfall 3: Canvas Bundle Size Explosion

**What goes wrong:**
MVP v1.0 had 180KB initial JavaScript bundle with fast First Contentful Paint (FCP) under 1 second. After adding Tldraw or Fabric.js canvas library, bundle balloons to 850KB+. FCP increases to 3.8 seconds. Lighthouse score drops from 95 to 68. Mobile users on 3G connections see 8-10 second load times. Vercel function deployment hits 250MB unzipped size limit. Even with code splitting, the canvas route downloads 600KB+ of JavaScript before showing any UI. Users bounce before canvas even loads.

**Why it happens:**
Canvas libraries are feature-rich and heavy. Tldraw core is ~200KB minified, but with peer dependencies (signia, zustand internals, vector math libraries) grows to 400-600KB. Fabric.js is ~500KB minified. Konva is ~300KB. ReactFlow is ~250KB. These are MINIFIED sizes - unminified development bundles are 2-4x larger. Canvas libraries often bundle their own state management, undo/redo systems, and utility libraries that duplicate what you already have (Zustand, etc.). Next.js Bundle Analyzer shows canvas libraries pulling in transitive dependencies (lodash, moment.js, etc.) that bloat bundle. Vercel's research shows bundle size directly impacts FCP - every 100KB adds ~300ms to load time on 3G. Next.js default behavior bundles all imports into single chunk unless explicitly code-split. Dynamic imports help but only if done correctly - dynamic import of component that imports 10 other modules still bundles all 10.

**How to avoid:**
Use aggressive code splitting and lazy loading:

```typescript
// Split canvas library from main bundle
const StakeholderCanvas = dynamic(
  () => import('@/components/canvas/stakeholder-canvas'),
  {
    ssr: false,
    loading: () => <CanvasSkeleton /> // Match layout to prevent shift
  }
);

// Further split heavy features
const ExportToPDF = dynamic(
  () => import('@/lib/canvas-export'),
  { ssr: false }
);
```

Choose lightweight canvas libraries - Konva (300KB) over Fabric.js (500KB) or Tldraw (600KB with deps) if you only need basic shapes. For post-it notes, consider building custom canvas implementation using HTML5 Canvas API directly (0KB library overhead) or using absolutely positioned div elements instead of canvas (no Canvas API needed). Use Next.js Bundle Analyzer to identify bloat:

```bash
npm install @next/bundle-analyzer
# Analyze which canvas imports are largest
```

Implement route-based splitting - canvas library only loads on Steps 2 and 4:

```typescript
// app/workshop/[id]/step-2/page.tsx
// Canvas library ONLY bundled in this route
```

Use tree-shaking compatible imports:

```typescript
// Bad: Imports entire library
import Konva from 'konva';

// Good: Only imports what you need
import { Stage, Layer, Rect } from 'konva/lib/shapes';
```

Monitor bundle size in CI/CD - fail builds if canvas route exceeds budget (300KB initial load). Use Vercel's speed insights to track real-world FCP impact. Consider canvas library CDN loading for truly massive libraries (trade bundle size for runtime dependency).

**Warning signs:**
- Next.js build output showing large page sizes (>500KB)
- Lighthouse FCP score regressing after canvas integration
- Vercel deployment warnings about function size
- Users on mobile reporting slow loads
- Network tab showing 1MB+ of JavaScript downloads
- Bundle analyzer showing duplicate dependencies

**Phase to address:**
Phase 1 (Canvas Foundation) - Choose lightweight library from the start. Phase 5 (Performance Optimization) for bundle analysis, code splitting refinement, and monitoring. Do NOT defer - bundle size impacts adoption.

---

### Pitfall 4: Mobile/Responsive Canvas Layout Collapse

**What goes wrong:**
Canvas works perfectly on desktop (1920px viewport). Deploy to production, test on mobile, and canvas becomes unusable. Post-its render at 2px x 2px (sized for desktop, shrunk to mobile). Touch events don't work - tapping post-it doesn't select it. Pinch-to-zoom triggers browser zoom instead of canvas zoom, breaking layout. Split-screen layout (chat + canvas) collapses on mobile - chat takes full height, canvas gets 100px sliver at bottom. Stakeholder map designed for 1200px width is completely illegible at 375px. Canvas scrolls horizontally requiring two-finger pan, but browser interprets as back-navigation gesture.

**Why it happens:**
Canvas elements use absolute pixel coordinates that don't translate to responsive breakpoints. Drawing at (500, 300) on desktop renders off-screen on 375px mobile viewport. Developers test at "standard" breakpoints (768px, 1024px) but miss awkward in-between states like 820px tablet split-screen or 912px where layouts often break. Touch events require special handling - mouse events (onClick, onMouseMove) don't work on mobile, need touch equivalents (onTouchStart, onTouchMove). Touch-action CSS property defaults to `auto` allowing browser gestures (pinch zoom, swipe back) which conflicts with canvas gestures. Safari mobile has LIMITED touch-action support - only `auto` and `manipulation` work, others ignored. Traditional CSS breakpoints don't work for canvas coordinate systems - a post-it at x:600 doesn't "break" to new line at mobile width, it just moves off-screen. Container queries would help but have limited browser support and don't solve coordinate translation problem.

**How to avoid:**
Implement responsive canvas scaling system that translates between viewport coordinates and canvas coordinates:

```typescript
const useResponsiveCanvas = () => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const baseWidth = 1200; // Desktop design width
      const currentWidth = window.innerWidth;
      setScale(currentWidth / baseWidth);
    };

    window.addEventListener('resize', updateScale);
    updateScale();
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return scale;
};
```

Use viewport-relative units for canvas sizing, not fixed pixels:

```typescript
// Bad: Fixed size
<Stage width={1200} height={800} />

// Good: Responsive
<Stage width={containerWidth} height={containerHeight} />
```

Implement mobile-first layout strategy - stack chat above/below canvas on mobile (<768px), side-by-side on desktop (>768px). Use CSS touch-action to prevent browser gestures:

```css
.canvas-container {
  touch-action: none; /* Disable all browser touch gestures */
}
```

For production, combine viewport meta with CSS touch-action and JavaScript event prevention:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

Handle touch events explicitly:

```typescript
// Support both mouse and touch
const handlePointerDown = (e: PointerEvent) => {
  // Works for mouse, touch, and pen
};
```

Test at REAL breakpoints including awkward ones: 375px (iPhone), 414px (iPhone Plus), 768px (iPad portrait), 820px (iPad split-screen), 912px (Surface), 1024px (iPad landscape), 1366px (laptop). Use browser DevTools device emulation but also test on real devices - touch behavior differs.

**Warning signs:**
- Canvas content rendering off-screen on mobile
- Touch interactions not working (tap, drag, pinch)
- Layout breaking at unexpected widths (820px, 912px)
- Users reporting "can't use on phone"
- Horizontal scroll appearing on mobile
- Pinch gesture zooming entire page instead of canvas

**Phase to address:**
Phase 1 (Canvas Foundation) - Responsive architecture must be baked in from start. Phase 3 (Mobile Optimization) for touch gesture handling and specific breakpoint tuning. Retrofitting responsive canvas after building for desktop-only is nearly a full rewrite.

---

### Pitfall 5: Canvas State Serialization and Persistence Failures

**What goes wrong:**
User spends 20 minutes arranging 12 stakeholder post-its on canvas into perfect spatial layout showing power dynamics and relationships. Clicks "Save and Continue to Step 3". Returns to Step 2 later to review stakeholders. Canvas loads with all 12 post-its but they're stacked in top-left corner - all position data lost. Or: Canvas state saved to Postgres JSONB column, but undo/redo history (300 operations) balloons JSON to 2.5MB. Postgres TOAST compression kicks in, adding 200ms retrieval latency. Database queries slow to a crawl. Or: User's canvas has Date objects and custom class instances that JSON.stringify() converts to strings, breaking reconstruction. Undo breaks with "Cannot read property 'x' of undefined" because deserialized objects lost methods.

**Why it happens:**
Canvas state is complex: positions, sizes, colors, z-index, custom properties, relationships. Naive JSON serialization loses information. Date objects become ISO strings, class instances lose prototypes, functions disappear entirely. Snapshot-based undo/redo stores entire state for each operation - after 300 operations (typical 20 minute session), you have 300 full copies of canvas state. At 8KB per snapshot, that's 2.4MB. Postgres applies TOAST (The Oversized-Attribute Storage Technique) to JSONB exceeding 2KB, storing externally with decompression overhead. Loading 2.5MB JSONB from TOAST table adds 200-500ms latency. JSON Patch approach (storing deltas not snapshots) can reduce size 100x but requires specialized library (Travels, Mutative). Developers assume JSON.stringify() → database → JSON.parse() is lossless, but it's not for complex objects.

**How to avoid:**
Store minimal serializable state, reconstruct complex objects on load:

```typescript
// Bad: Store everything
const saveCanvas = () => {
  const state = canvas.toJSON(); // Includes EVERYTHING
  saveToDatabase(state); // 500KB+
};

// Good: Store only essentials
const saveCanvas = () => {
  const state = {
    postIts: postIts.map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      text: p.text,
      color: p.color
      // Omit methods, derived properties
    }))
  };
  saveToDatabase(state); // 5KB
};
```

Use JSON Patch for undo/redo to store deltas not snapshots:

```typescript
import { Travels } from '@mutativejs/travels';

// Stores ~100x smaller history
const travels = new Travels(initialState);
travels.go((draft) => {
  draft.postIts[0].x += 10; // Records delta, not full state
});
```

For Postgres JSONB storage, avoid deeply nested structures and large arrays in single document:

```typescript
// Anti-pattern: One massive JSONB document
{
  canvas_state: {
    postIts: [...300 items...],
    history: [...300 snapshots...]
  }
}

// Better: Separate tables
// workshops table: { id, current_canvas_state JSONB }
// canvas_history table: { workshop_id, operation_index, delta JSONB }
```

Use Postgres GIN indexes for JSONB queries:

```sql
CREATE INDEX idx_canvas_state ON workshops USING GIN (canvas_state);
```

Implement incremental saves - save position changes debounced, not on every pixel:

```typescript
const debouncedSave = debounce((state) => {
  saveToDatabase(state);
}, 2000); // Save every 2 seconds max
```

Convert complex types before serialization:

```typescript
const serializePostIt = (postIt) => ({
  ...postIt,
  createdAt: postIt.createdAt.getTime(), // Date → timestamp
  // Store IDs not instances
});
```

Test serialization round-trip: `loadCanvas(saveCanvas(state))` should equal original state.

**Warning signs:**
- Canvas loads with lost position/formatting data
- Database JSONB columns exceeding 100KB
- Slow canvas load times (>500ms) on revisit
- Undo/redo consuming excessive memory
- JSON.parse() errors on canvas load
- "Cannot read property" errors after deserialization
- Postgres query performance degrading as canvas complexity grows

**Phase to address:**
Phase 2 (State Sync Architecture) for serialization strategy. Phase 4 (Persistence & Auto-Save) for database schema, JSONB optimization, and undo/redo implementation. Must design serialization format BEFORE implementing canvas features - changing format requires data migration.

---

### Pitfall 6: AI-Canvas Coordination Race Conditions

**What goes wrong:**
User asks AI "Add the Engineering VP stakeholder". AI streams response confirming "I've added Engineering VP to your stakeholder map". UI shows optimistic update - new post-it appears on canvas. But database save fails (network timeout). User doesn't notice. Continues working, rearranges stakeholders including the Engineering VP post-it. Navigates to Step 3. Canvas state without Engineering VP saves successfully. Returns to Step 2 later - Engineering VP is missing. Or worse: AI suggests stakeholder, starts streaming response, user immediately starts dragging post-it while AI is mid-stream. AI response completes, overwrites post-it position with original suggested position, user's drag is lost.

**Why it happens:**
Optimistic UI updates (show change before confirming success) improve perceived performance but create consistency risks. AI streaming responses take 2-5 seconds. User can interact with optimistically-updated canvas during stream. If stream completes after user interaction, AI's final state overwrites user changes. Network failures between AI response and database save leave partial state. Vercel serverless functions have 10-60 second timeout - long AI responses can timeout mid-stream. Race condition: (1) AI generates post-it with id "temp-123", (2) Canvas renders temp-123, (3) User drags temp-123, (4) AI completes, assigns real DB id "pk-456", (5) Canvas update replaces temp-123 with pk-456, (6) User's drag event still references temp-123, update fails. No rollback strategy for failed optimistic updates means UI shows state that doesn't exist in database.

**How to avoid:**
Implement proper optimistic update lifecycle with rollback:

```typescript
const addStakeholder = async (aiSuggestion) => {
  // 1. Optimistic update
  const tempId = `temp-${Date.now()}`;
  const optimisticPostIt = {
    id: tempId,
    ...aiSuggestion,
    _optimistic: true // Flag for UI
  };

  addPostIt(optimisticPostIt);

  try {
    // 2. Database save
    const saved = await savePostIt(aiSuggestion);

    // 3. Reconcile with real ID
    replacePostIt(tempId, saved);

  } catch (error) {
    // 4. Rollback on failure
    removePostIt(tempId);
    showError("Failed to save stakeholder");
  }
};
```

Use React 19's `useOptimistic` hook for automatic rollback:

```typescript
const [postIts, addOptimisticPostIt] = useOptimistic(
  postItsFromServer,
  (state, newPostIt) => [...state, newPostIt]
);
```

Lock canvas during AI streaming to prevent user edits:

```typescript
const [isAIResponding, setIsAIResponding] = useState(false);

// Disable drag/edit during AI stream
<PostIt
  draggable={!isAIResponding && !postIt._optimistic}
/>
```

Implement version-based conflict detection:

```typescript
interface PostIt {
  id: string;
  version: number;
  lastModifiedBy: 'user' | 'ai';
  modifiedAt: number;
}

const handleConflict = (userVersion, aiVersion) => {
  if (userVersion.modifiedAt > aiVersion.modifiedAt) {
    // User's change wins (Last Write Wins strategy)
    return userVersion;
  }
  // Or: Show merge UI for user to resolve
};
```

Use idempotency keys for AI requests to prevent duplicate processing:

```typescript
const idempotencyKey = `${workshopId}-${stepId}-${Date.now()}`;
await fetch('/api/ai/suggest', {
  headers: { 'Idempotency-Key': idempotencyKey }
});
```

Save incrementally with conflict detection:

```typescript
const saveWithOptimisticLock = async (postIt) => {
  const result = await db.update(postIts)
    .set({
      ...postIt,
      version: postIt.version + 1
    })
    .where(
      and(
        eq(postIts.id, postIt.id),
        eq(postIts.version, postIt.version) // Fail if version changed
      )
    );

  if (result.rowCount === 0) {
    throw new ConflictError('Post-it was modified by another process');
  }
};
```

**Warning signs:**
- Canvas changes reverting after AI responses
- "Failed to update" errors with no clear cause
- Post-its appearing then disappearing
- Duplicate post-its on canvas after refresh
- Database state inconsistent with canvas display
- Users reporting "AI erased my changes"

**Phase to address:**
Phase 2 (State Sync Architecture) for optimistic update patterns and conflict detection. Phase 3 (AI Integration) for streaming coordination. Must implement BEFORE building AI suggestion features - retrofitting proper state management into existing optimistic UI is complex.

---

### Pitfall 7: Touch Event and Gesture Conflicts on Mobile Canvas

**What goes wrong:**
Canvas works perfectly with mouse on desktop. Test on iPad and interactions break. Single tap should select post-it but nothing happens. Two-finger pinch should zoom canvas but triggers browser page zoom. Dragging post-it triggers iOS back-navigation swipe gesture. Scroll canvas vertically but browser interprets as pull-to-refresh. Canvas pan interferes with split-screen chat scroll. User can't distinguish between "tap to select" vs "long press to show context menu" because both trigger at same time.

**Why it happens:**
Touch events are fundamentally different from mouse events. Mouse has hover state, single pointer, separate events for different actions. Touch has no hover, multi-touch (multiple simultaneous pointers), and same gesture (finger down + move) could mean drag, scroll, or pan depending on context. Browser default touch behaviors conflict with canvas interactions: double-tap = zoom, pinch = zoom/scale, swipe = navigate, long-press = context menu, pull-down = refresh. CSS `touch-action` property disables browser defaults but Safari mobile only supports `auto` and `manipulation` values, ignoring `none`, `pan-x`, etc. Pointer events (PointerEvent API) unify mouse/touch/pen but require explicit handling. Passive event listeners (default in modern browsers) can't preventDefault(), breaking gesture prevention.

Touch events fire in sequence: touchstart → touchmove → touchend. Missing ANY step breaks gesture detection. User puts two fingers on canvas (pinch start), browser captures event for page zoom, canvas never receives touchmove, gesture tracking breaks. Canvas libraries (Konva, Fabric) assume non-passive listeners to preventDefault() but modern browsers force passive for performance, causing conflicts.

**How to avoid:**
Use Pointer Events API instead of separate mouse/touch handlers:

```typescript
// Bad: Separate handlers
<PostIt
  onMouseDown={handleMouseDown}
  onTouchStart={handleTouchStart}
/>

// Good: Unified handler
<PostIt
  onPointerDown={handlePointerDown} // Works for mouse, touch, pen
/>
```

Disable browser touch gestures on canvas with CSS:

```css
.canvas-container {
  touch-action: none; /* Disable all browser gestures */
  /* Or specific disabling */
  touch-action: pan-x pan-y; /* Allow scroll, disable pinch/zoom */
}
```

For production, combine multiple prevention layers:

```html
<!-- Viewport: disable user zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

```css
/* CSS: prevent gestures */
.canvas-container {
  touch-action: manipulation; /* Safari mobile compatible */
  -webkit-user-select: none; /* Prevent text selection */
  -webkit-touch-callout: none; /* Prevent iOS callout */
}
```

```typescript
// JS: preventDefault on specific gestures
const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length > 1) {
    e.preventDefault(); // Prevent pinch
  }
};

canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
```

Implement custom gesture detection for canvas interactions:

```typescript
const detectGesture = (touches: TouchList) => {
  if (touches.length === 1) {
    return 'drag'; // Single finger = move post-it
  } else if (touches.length === 2) {
    return 'pinch'; // Two fingers = zoom canvas
  }
};
```

Use timeout-based long-press detection:

```typescript
let longPressTimer: NodeJS.Timeout;

const handlePointerDown = (e: PointerEvent) => {
  longPressTimer = setTimeout(() => {
    showContextMenu(); // Long press detected
  }, 500);
};

const handlePointerUp = () => {
  clearTimeout(longPressTimer); // Cancel if released early
};
```

Test on real devices - iOS Safari, Android Chrome, iPad - not just desktop emulation. Emulation doesn't accurately simulate touch timing, multi-touch coordination, or browser gesture conflicts.

**Warning signs:**
- Canvas interactions not working on mobile/tablet
- Browser zoom/navigation triggered by canvas gestures
- Inability to distinguish tap vs long-press
- Drag starting when user trying to scroll
- Multi-touch gestures breaking single-touch interactions
- Different behavior in iOS Safari vs Chrome

**Phase to address:**
Phase 1 (Canvas Foundation) for Pointer Events API and basic touch-action. Phase 3 (Mobile Optimization) for comprehensive gesture detection and cross-device testing. Touch support must be architectural - cannot bolt-on after building mouse-only canvas.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using regular imports instead of dynamic imports for canvas library | Simpler code, no loading state needed | Breaks SSR, causes hydration errors, shipped to production | Never - always use dynamic imports with ssr: false |
| Storing full canvas snapshots for undo/redo | Easy to implement (just save state) | 100x memory usage, slow DB queries, TOAST overhead | Only for prototype with <10 operations, migrate before launch |
| Bidirectional AI ↔ Canvas state sync | Feels "reactive" and "magic" | Race conditions, infinite loops, lost updates | Never - unidirectional flow is mandatory |
| Fixed pixel canvas sizing (1200x800px) | Works on your laptop | Breaks mobile, tablet, split-screen | Never - responsive scaling is foundational |
| Mouse event handlers only (onClick, onMouseMove) | Works on desktop | Completely broken on touch devices | Only if explicitly desktop-only MVP, document clearly |
| Saving canvas state on every interaction | Real-time persistence | DB hammering, rate limit exhaustion, race conditions | Never - use debounced saves (2-5s) |
| Using large canvas library (Tldraw 600KB) for simple post-its | Feature-rich, professional UI | 3x bundle size, 2s slower FCP, mobile unusable | Only if you NEED 90% of features, otherwise overkill |
| Prop-syncing canvas state to React component state | Seems like "React best practice" | Two sources of truth, sync bugs, stale data | Never - derive from single source (Zustand) |
| Hardcoding canvas to desktop breakpoint | Faster development | Total rewrite for mobile support | Only if 100% certain desktop-only forever |
| JSON.stringify() for canvas persistence | One line of code | Lost data for Dates/classes, no undo optimization | Only for throwaway prototype, never production |

## Integration Gotchas

Common mistakes when integrating canvas with existing WorkshopPilot.ai system.

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|------------------|
| Next.js App Router | Importing canvas library in Server Component | Mark component file with `'use client'`, use dynamic import with `ssr: false` |
| React 19 Concurrent Rendering | Assuming synchronous state updates | Use `useOptimistic` for canvas updates during AI streaming |
| Zustand State | Creating separate canvas state store | Integrate canvas state into existing workshop store, single source of truth |
| Vercel Deployment | Shipping canvas library in main bundle | Code-split canvas routes, lazy load only for Steps 2 & 4 |
| Neon Postgres JSONB | Storing massive canvas history in single JSONB column | Use separate canvas_history table with deltas, GIN indexes |
| AI Streaming | Letting AI responses overwrite in-flight canvas changes | Lock canvas during AI stream or implement conflict resolution |
| Mobile Responsive | Using CSS breakpoints only | Implement canvas coordinate translation + touch-action CSS |
| Auto-Save | Saving on every canvas interaction | Debounce saves (2-5s), optimistic locking with version column |
| Gemini Context | Sending full canvas pixel data to AI | Send structured JSON (post-it IDs, positions, text) not raw canvas |
| Clerk Auth | Allowing unauthenticated canvas access | Verify auth in canvas API routes, not just client components |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Storing entire canvas as single JSONB document | Works fine initially, then queries slow to 500ms+ | Separate canvas_state (current) from canvas_history (deltas), use GIN indexes | >50KB canvas state (~100 post-its with history) |
| Re-rendering entire canvas on every Zustand update | Smooth with 5 post-its, janky with 50 | Use Zustand selectors to subscribe to specific post-its, memo canvas layers | >30 interactive elements |
| Keeping full undo history in memory | Works during session, crashes on reload | Store undo deltas in database, paginate history (last 50 in memory) | >200 undo operations |
| Sending all canvas data to AI on every message | Fast with 3 stakeholders, slow with 15 | Send only IDs + summary, fetch details server-side if needed | >10 canvas entities |
| Naive JSON serialization for persistence | Works until Dates/classes appear | Convert complex types pre-serialization, reconstruct on load | First use of Date or class instance |
| Loading canvas library on all pages | Doesn't notice with fast connection | Route-based code splitting, load only on canvas steps | Noticed on mobile 3G (3-8s delay) |
| Auto-save on every pixel of drag | Fine with 1 concurrent user, DB meltdown with 10 | Debounce saves 2-5s, batch updates | >5 concurrent users with active dragging |
| Synchronous AI → Canvas updates | Feels instant, until AI response has 8 suggestions | Use streaming with progressive updates, show loading states | AI response >2 seconds |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing canvas images/exports in public Vercel blob storage | Anyone with URL can view stakeholder maps (potential PII/confidential) | Use authenticated Vercel blob URLs with 1-hour expiry, or Neon Postgres bytea column |
| Trusting client-sent canvas state without validation | User can inject arbitrary post-its (XSS via SVG, data exfiltration) | Validate ALL canvas data server-side with Zod schema before DB save |
| Sharing canvas state between workshops via query params | Workshop A user can access Workshop B canvas by changing URL param | Verify workshop ownership in API routes, use Clerk userId check |
| No rate limiting on canvas save endpoint | Attacker can spam saves, exhaust DB connections, DOS other users | Rate limit per userId (10 saves/minute), use Vercel KV for tracking |
| Embedding user-generated text in canvas without sanitization | XSS via post-it text containing `<script>` tags | Sanitize text with DOMPurify before rendering on canvas |
| Allowing unlimited canvas state size | User can upload 10MB canvas, exhaust JSONB storage quota | Limit canvas state to 500KB server-side, reject oversized payloads |
| Exposing database IDs in canvas export JSON | Attacker can infer user count, workshop creation rate | Use UUIDs not sequential IDs, or omit IDs from exports |
| No CORS restrictions on canvas API routes | Cross-site requests can trigger canvas saves | Set CORS headers to only allow same-origin or specific domains |

## UX Pitfalls

Common user experience mistakes in canvas integration.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state when canvas initializing | Blank white screen 2-5s, user thinks it's broken | Show skeleton with post-it placeholders, "Loading canvas..." message |
| AI adds post-it without visual feedback | User unsure if AI heard them, confusion | Animate post-it appearance, highlight for 2s, show "Added by AI" badge |
| Canvas zoom resets on every re-render | User zooms to see detail, Zustand update resets zoom to default | Persist zoom/pan state in Zustand, restore on re-render |
| No undo button when AI makes unwanted changes | User stuck with AI suggestions they don't want | Provide "Undo AI suggestion" button, clearly separated from manual undo |
| Canvas interaction blocks chat input | User can't type message while dragging post-it | Ensure drag events don't preventDefault() on chat input focus |
| Post-it text too small on mobile | Readable on desktop, 8px font on mobile is illegible | Use viewport-relative font sizes (clamp(12px, 2vw, 16px)) |
| No indication canvas is locked during AI streaming | User tries to drag, nothing happens, frustration | Show "AI is thinking..." overlay on canvas, disable cursor changes to not-allowed |
| Lost work when accidentally navigating away | User spent 20min arranging canvas, back button = lost work | Auto-save every 5s, show "Unsaved changes" warning on navigation |
| Unclear which post-its are AI vs user-created | User can't distinguish sources, lacks trust | Color-code or badge post-its ("AI suggestion" vs "You added") |
| No mobile tutorial for touch gestures | User doesn't know two-finger pinch zooms, one-finger pans | Show tooltip on first mobile visit: "Drag to move, pinch to zoom" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Canvas SSR Compatibility:** Often missing dynamic import with `ssr: false` — verify no "window is not defined" errors in Vercel server logs
- [ ] **Touch Event Support:** Often missing onPointerDown handlers — verify interactions work on real iPad/mobile device, not just desktop
- [ ] **Responsive Scaling:** Often missing coordinate translation — verify canvas usable at 375px mobile width, not just 1920px desktop
- [ ] **State Persistence:** Often missing proper serialization — verify canvas reloads identically after save/refresh, including positions
- [ ] **Optimistic Updates:** Often missing rollback logic — verify failed save reverts canvas to previous state with user feedback
- [ ] **Bundle Size:** Often missing code splitting — verify canvas route <300KB initial JavaScript bundle via Next.js Bundle Analyzer
- [ ] **Auto-Save:** Often missing debouncing — verify saves happen every 2-5s max, not every drag pixel
- [ ] **Conflict Resolution:** Often missing version tracking — verify simultaneous AI + user updates don't clobber each other
- [ ] **Mobile Gestures:** Often missing touch-action CSS — verify browser pinch-zoom doesn't interfere with canvas zoom
- [ ] **Undo/Redo:** Often missing delta storage — verify undo history doesn't exceed 100KB in database
- [ ] **AI Coordination:** Often missing streaming locks — verify user canvas edits during AI response don't get overwritten
- [ ] **Error Recovery:** Often missing graceful degradation — verify canvas shows cached state if API fails, doesn't blank out

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSR Hydration Errors | LOW | Wrap component in dynamic import with `ssr: false`, redeploy (30 min fix) |
| Bidirectional State Races | HIGH | Refactor to unidirectional flow, add version tracking, test thoroughly (2-3 days) |
| Bundle Size Explosion | MEDIUM | Add route-based code splitting, choose lighter library, remove unused features (1 day) |
| Responsive Layout Collapse | HIGH | Implement coordinate translation, mobile-first CSS, retest all breakpoints (2-3 days) |
| Serialization Data Loss | MEDIUM | Add pre-serialization converter, migrate existing DB data, validate round-trips (1-2 days) |
| AI-Canvas Race Conditions | MEDIUM | Add optimistic locking, implement useOptimistic, add conflict UI (1-2 days) |
| Touch Event Conflicts | MEDIUM | Switch to Pointer Events, add touch-action CSS, test on real devices (1 day) |
| JSONB Performance Degradation | MEDIUM | Separate canvas_history table, add GIN indexes, migrate data (1-2 days) |
| Lost Canvas Work | LOW | Implement auto-save, add navigation warnings, restore from DB (4-6 hours) |
| Canvas Zoom Reset Bug | LOW | Persist zoom/pan in Zustand, restore on render, test edge cases (2-3 hours) |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SSR/Hydration Mismatch | Phase 1: Canvas Foundation | No "window is not defined" errors in Vercel logs, clean hydration in React DevTools |
| Bidirectional State Races | Phase 2: State Sync Architecture | Zustand state mutations only from actions, no prop-syncing, stress test with rapid interactions |
| Bundle Size Explosion | Phase 1: Canvas Foundation + Phase 5: Performance | Next.js build shows canvas route <300KB, Lighthouse FCP <2s |
| Mobile Layout Collapse | Phase 1: Canvas Foundation + Phase 3: Mobile Optimization | Canvas usable at 375px width, all interactions work on real iPad |
| Serialization Failures | Phase 2: State Sync + Phase 4: Persistence | Round-trip test: `load(save(state)) === state`, no data loss after refresh |
| AI-Canvas Race Conditions | Phase 2: State Sync + Phase 3: AI Integration | Concurrent AI response + user edit doesn't clobber either change |
| Touch Event Conflicts | Phase 3: Mobile Optimization | Pinch-zoom controls canvas not browser, drag doesn't trigger back-navigation |
| JSONB Performance | Phase 4: Persistence & Auto-Save | Canvas load time <200ms for 50 post-its, database queries use GIN indexes |
| Lost Work | Phase 4: Persistence & Auto-Save | Auto-save every 5s, navigation shows "Unsaved changes" warning |
| Context Size | Phase 3: AI Integration | Canvas state sent to AI <10KB, uses structured summary not raw pixels |

## Sources

**SSR/Hydration:**
- [Tldraw Next.js SSR Issues - GitHub Issue #6567](https://github.com/tldraw/tldraw/issues/6567)
- [React-Konva SSR Documentation](https://www.npmjs.com/package/react-konva)
- [Next.js Hydration Errors in 2026 - Medium](https://medium.com/@blogs-world/next-js-hydration-errors-in-2026-the-real-causes-fixes-and-prevention-checklist-4a8304d53702)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

**State Synchronization:**
- [Don't Sync State. Derive It! - Kent C. Dodds](https://kentcdodds.com/blog/dont-sync-state-derive-it)
- [React State Management 2025 - Medium](https://medium.com/@QuarkAndCode/state-management-2025-react-server-state-url-state-dapr-agent-sync-d8a1f6c59288)
- [Synchronizing with Effects - React Docs](https://react.dev/learn/synchronizing-with-effects)
- [Zustand GitHub](https://github.com/pmndrs/zustand)

**Bundle Size:**
- [Next.js Package Bundling Guide](https://nextjs.org/docs/app/guides/package-bundling)
- [Next.js Bundle Size Discussions](https://github.com/vercel/next.js/discussions/73956)
- [Vercel Agent Skills Announcement](https://www.marktechpost.com/2026/01/18/vercel-releases-agent-skills-a-package-manager-for-ai-coding-agents-with-10-years-of-react-and-next-js-optimisation-rules/)

**Responsive Design:**
- [Responsive Design Breakpoints 2025 - BrowserStack](https://www.browserstack.com/guide/responsive-design-breakpoints)
- [Responsive Web Design in 2026 - Keel Info](https://www.keelis.com/blog/responsive-web-design-in-2026:-trends-and-best-practices)

**Canvas Persistence:**
- [Konva Save and Load Best Practices](https://konvajs.org/docs/data_and_serialization/Best_Practices.html)
- [Konva React Undo/Redo](https://konvajs.org/docs/react/Undo-Redo.html)
- [Travels: JSON Patch Undo/Redo](https://github.com/mutativejs/travels)
- [PostgreSQL JSONB Performance](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage)
- [Postgres JSONB TOAST Performance - pganalyze](https://pganalyze.com/blog/5mins-postgres-jsonb-toast)

**Optimistic UI:**
- [Understanding React useOptimistic - LogRocket](https://blog.logrocket.com/understanding-optimistic-ui-react-useoptimistic-hook/)
- [Optimistic UI Updates and Conflict Resolution - Borstch](https://borstch.com/snippet/optimistic-ui-updates-and-conflict-resolution)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/v4/docs/react/guides/optimistic-updates)
- [React 19 useOptimistic - Codefinity](https://codefinity.com/blog/React-19-useOptimistic)

**Touch Events:**
- [Touch Events - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [Pinch Zoom Gestures - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures)
- [touch-action CSS - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- [Konva Multi-touch Scale](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html)

**Vercel Deployment:**
- [Vercel Function Timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)

---
*Pitfalls research for: Canvas/Post-It Integration for WorkshopPilot.ai*
*Researched: 2026-02-10*
*Confidence: HIGH - Based on Next.js 16.1.1, React 19, official documentation, and 2026 community best practices*

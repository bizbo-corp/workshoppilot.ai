# Phase 15: Canvas Infrastructure & SSR Safety - Research

**Researched:** 2026-02-10
**Domain:** ReactFlow canvas with Next.js 16 App Router SSR, Zustand state management, auto-save persistence
**Confidence:** HIGH

## Summary

Phase 15 establishes the ReactFlow canvas foundation with SSR-safe dynamic imports, Zustand canvas store as single source of truth, and auto-save/load persistence to the existing `stepArtifacts` JSONB column. The research confirms that ReactFlow 12+ fully supports SSR/SSG with proper configuration, but requires dynamic imports with `ssr: false` to prevent hydration errors in Next.js App Router. Zustand requires a provider pattern with per-request store instantiation to avoid hydration mismatches. The existing `stepArtifacts.artifact` JSONB column can store canvas state without schema migration.

**Primary recommendation:** Use `next/dynamic` with `ssr: false` for ReactFlow components, implement Zustand provider pattern for canvas store, leverage existing JSONB column for persistence, and debounce auto-save at 2 seconds to match v1.0 chat pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Post-it appearance:**
- Classic sticky note style — yellow square, drop shadow, skeuomorphic feel
- No rotation — perfectly aligned, not randomly tilted
- Default color: classic yellow (color-coding comes in Phase 17)
- Small post-its (~120x120px) designed for short phrases (5-10 words)
- Post-it grows taller to fit if text overflows — no truncation
- No corner fold — shadow alone conveys the sticky note depth
- App font (system/sans-serif) — not handwritten style
- Hover effect: Claude's discretion

**Canvas creation flow:**
- Two creation methods: toolbar "+" button AND double-click on empty canvas space
- Toolbar "+" for discoverability, double-click as power-user shortcut
- New post-it immediately enters text editing mode (cursor blinking, ready to type)
- Toolbar "+" places post-it slightly offset from the last created one (dealing-cards pattern)
- Double-click places post-it at click position
- Minimal toolbar for Phase 15: just the "+" button (no zoom controls yet)

**Save/load behavior:**
- Subtle "Saving..." / "Saved" status indicator in corner of canvas
- Auto-save debounced at 2s (per roadmap success criteria)
- On save failure: retry silently, show warning only after 3 consecutive failures
- Force-save when user navigates away from step — no "unsaved changes" dialog
- Loading: brief skeleton (canvas grid/background), then post-its fade in

**Canvas initial state:**
- Subtle dot grid background — helps with spatial orientation
- Empty state: centered hint text "Double-click to add a post-it" — disappears after first post-it created
- On load with existing data: auto-fit zoom to show all post-its (not last zoom/pan position)
- No visible canvas boundaries — extends in all directions, dot grid continues
- Drag behavior: other post-its stay put, overlapping allowed, full manual control
- Snap-to-grid for tidy placement (invisible grid points)
- Create animation: Claude's discretion

### Claude's Discretion

- Hover effect style on post-its (lift vs border vs other)
- Post-it creation animation (pop-in, fade, or none)
- Exact shadow depth and style
- Grid snap size
- Skeleton loading animation details
- Exact positioning offset for toolbar-created post-its

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@xyflow/react** | Latest (12+) | Canvas infrastructure for post-its | Official ReactFlow v12 package with SSR/SSG support, MIT license, ~200KB minified. Graph-first data model enables AI to query node relationships. Chosen in v1.1 research over Tldraw/Konva for size and flexibility. |
| **zustand** | 5.0.3 (existing) | Canvas state management | Already in stack from v1.0. Per-request provider pattern prevents SSR hydration mismatches. Single source of truth for post-it positions, text, and metadata. |
| **use-debounce** | 10.1.0 (existing) | Auto-save debouncing | Already in stack from v1.0 chat auto-save. Debounces canvas updates to 2s to prevent database spam. |
| **next/dynamic** | Next.js 16.1.1 (built-in) | SSR-safe dynamic imports | Built-in Next.js utility for client-only components. Essential for preventing ReactFlow hydration errors. |

### Supporting Tools

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **React Suspense** | React 19.2.0 (built-in) | Loading fallback for dynamic imports | Wrap `next/dynamic` components to show skeleton while canvas loads. Prevents layout shift. |
| **Drizzle ORM** | 0.45.1 (existing) | Database persistence | Update existing `stepArtifacts.artifact` JSONB column to store canvas state. No new tables needed. |

### Installation

**No new packages required.** All dependencies already installed in v1.0:
- `@xyflow/react` — Will be installed in this phase
- `zustand` — Already installed (5.0.3)
- `use-debounce` — Already installed (10.1.0)

```bash
# Install ReactFlow (only new package for Phase 15)
npm install @xyflow/react@latest

# Verify existing dependencies
npm list zustand use-debounce
# Expected output:
# zustand@5.0.3
# use-debounce@10.1.0
```

**Bundle Impact:**
- ReactFlow: ~200KB minified, ~60KB gzipped (estimate based on bundlephobia patterns for graph libraries)
- No other new dependencies
- Total phase addition: ~60KB gzipped (acceptable for canvas functionality)

## Architecture Patterns

### Pattern 1: SSR-Safe ReactFlow with Dynamic Imports

**Problem:** ReactFlow uses browser APIs (window, document) that don't exist during Next.js server-side rendering. Direct imports cause hydration errors.

**Solution:** Use `next/dynamic` with `ssr: false` to load ReactFlow only on client.

**Implementation:**

```typescript
// src/components/canvas/canvas-wrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { CanvasLoadingSkeleton } from './canvas-loading-skeleton';

// Dynamic import with SSR disabled
const ReactFlowCanvas = dynamic(
  () => import('./react-flow-canvas').then((mod) => mod.ReactFlowCanvas),
  {
    ssr: false,
    loading: () => <CanvasLoadingSkeleton />
  }
);

export function CanvasWrapper() {
  return (
    <Suspense fallback={<CanvasLoadingSkeleton />}>
      <ReactFlowCanvas />
    </Suspense>
  );
}
```

**Key points:**
- `ssr: false` prevents server rendering (required for ReactFlow)
- `loading` prop provides immediate feedback during import
- Separate `Suspense` wrapper ensures consistent fallback behavior
- Component file must use `'use client'` directive

**Source:** [Next.js Dynamic Imports Documentation](https://nextjs.org/docs/pages/guides/lazy-loading), [ReactFlow SSR Configuration](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration)

---

### Pattern 2: Zustand Provider Pattern for SSR

**Problem:** Module-level Zustand stores are shared across server requests in Next.js App Router, causing state leakage and hydration errors.

**Solution:** Create stores per-request using factory pattern with React context provider.

**Implementation:**

```typescript
// src/stores/canvas-store.ts
import { createStore } from 'zustand/vanilla';

export type PostIt = {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
};

export type CanvasStore = {
  postIts: PostIt[];
  addPostIt: (postIt: Omit<PostIt, 'id'>) => void;
  updatePostIt: (id: string, updates: Partial<PostIt>) => void;
  deletePostIt: (id: string) => void;
};

export const createCanvasStore = (initState: { postIts: PostIt[] } = { postIts: [] }) => {
  return createStore<CanvasStore>()((set) => ({
    postIts: initState.postIts,
    addPostIt: (postIt) => set((state) => ({
      postIts: [...state.postIts, { ...postIt, id: crypto.randomUUID() }]
    })),
    updatePostIt: (id, updates) => set((state) => ({
      postIts: state.postIts.map(p => p.id === id ? { ...p, ...updates } : p)
    })),
    deletePostIt: (id) => set((state) => ({
      postIts: state.postIts.filter(p => p.id !== id)
    })),
  }));
};
```

```typescript
// src/providers/canvas-store-provider.tsx
'use client';

import { createContext, useState, useContext, ReactNode } from 'react';
import { useStore } from 'zustand';
import { type CanvasStore, createCanvasStore } from '@/stores/canvas-store';

export const CanvasStoreContext = createContext<ReturnType<typeof createCanvasStore> | undefined>(undefined);

export function CanvasStoreProvider({
  children,
  initialPostIts = []
}: {
  children: ReactNode;
  initialPostIts?: any[];
}) {
  // Create store once per component mount (per-request isolation)
  const [store] = useState(() => createCanvasStore({ postIts: initialPostIts }));

  return (
    <CanvasStoreContext.Provider value={store}>
      {children}
    </CanvasStoreContext.Provider>
  );
}

export function useCanvasStore<T>(selector: (store: CanvasStore) => T): T {
  const context = useContext(CanvasStoreContext);
  if (!context) {
    throw new Error('useCanvasStore must be used within CanvasStoreProvider');
  }
  return useStore(context, selector);
}
```

**Usage in page:**

```typescript
// src/app/workshop/[sessionId]/step/[stepId]/page.tsx
import { CanvasStoreProvider } from '@/providers/canvas-store-provider';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';

export default async function StepPage({ params }: { params: { sessionId: string, stepId: string } }) {
  // Fetch canvas state from database (server component)
  const canvasState = await loadCanvasState(params.sessionId, params.stepId);

  return (
    <CanvasStoreProvider initialPostIts={canvasState?.postIts || []}>
      <CanvasWrapper />
    </CanvasStoreProvider>
  );
}
```

**Key points:**
- Store created inside `useState` ensures single instance per render cycle
- Provider wrapped at page level, not root layout (per-route isolation)
- Server component fetches initial state and passes to provider
- Client components use `useCanvasStore` hook to access state

**Source:** [Zustand Next.js Setup Guide](https://zustand.docs.pmnd.rs/guides/nextjs), [Fix Next.js Hydration Error with Zustand](https://medium.com/@koalamango/fix-next-js-hydration-error-with-zustand-state-management-0ce51a0176ad)

---

### Pattern 3: ReactFlow Custom Post-It Nodes

**Problem:** Post-its are custom UI elements (yellow squares with text), not default ReactFlow nodes.

**Solution:** Create custom node type with ReactFlow's node API.

**Implementation:**

```typescript
// src/components/canvas/post-it-node.tsx
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

export type PostItNodeData = {
  text: string;
  isEditing?: boolean;
};

export const PostItNode = memo(({ data, selected }: NodeProps<PostItNodeData>) => {
  return (
    <div
      className={cn(
        'relative w-30 min-h-30 p-3 rounded-sm',
        'bg-yellow-200 border-2 border-yellow-400',
        'shadow-md transition-shadow',
        'font-sans text-sm text-gray-800',
        selected && 'ring-2 ring-blue-500 ring-offset-2',
        // Hover effect (Claude's discretion: subtle lift)
        'hover:shadow-lg hover:-translate-y-0.5 hover:transition-transform'
      )}
      style={{
        // Fixed width, height grows with content
        width: '120px',
        minHeight: '120px',
      }}
    >
      {data.isEditing ? (
        <textarea
          autoFocus
          defaultValue={data.text}
          className="w-full h-full bg-transparent border-none outline-none resize-none nodrag"
          placeholder="Type here..."
        />
      ) : (
        <p className="break-words whitespace-pre-wrap">{data.text}</p>
      )}

      {/* Handles for future edge connections (Phase 18+) */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
});

PostItNode.displayName = 'PostItNode';
```

**Key points:**
- Fixed width (120px), height grows with content (meets "grows taller to fit" requirement)
- `nodrag` class prevents drag during text editing
- Handles hidden (`opacity: 0`) but present for future phases
- Hover effect uses subtle lift (Claude's discretion choice)
- `memo` prevents unnecessary re-renders

**Source:** [ReactFlow Custom Nodes Documentation](https://reactflow.dev/learn/customization/custom-nodes)

---

### Pattern 4: Auto-Save with Debounce and Retry

**Problem:** Canvas updates are frequent (every drag, text change). Saving on every update causes database spam and poor UX.

**Solution:** Debounce at 2 seconds, batch updates, retry on failure.

**Implementation:**

```typescript
// src/hooks/use-canvas-autosave.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { saveCanvasState } from '@/actions/canvas-actions';

export function useCanvasAutosave(sessionId: string, stepId: string) {
  const postIts = useCanvasStore(state => state.postIts);
  const [debouncedPostIts] = useDebounce(postIts, 2000); // 2s debounce
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const failureCountRef = useRef(0);

  useEffect(() => {
    if (debouncedPostIts.length === 0 && saveStatus === 'idle') return;

    const save = async () => {
      setSaveStatus('saving');
      try {
        await saveCanvasState(sessionId, stepId, { postIts: debouncedPostIts });
        setSaveStatus('saved');
        failureCountRef.current = 0; // Reset failure count on success

        // Clear "saved" status after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        failureCountRef.current += 1;

        // Silent retry (no UI feedback until 3 failures)
        if (failureCountRef.current >= 3) {
          setSaveStatus('error');
          console.error('Canvas auto-save failed after 3 attempts:', error);
        } else {
          // Retry after 1 second
          setTimeout(() => save(), 1000);
        }
      }
    };

    save();
  }, [debouncedPostIts, sessionId, stepId, saveStatus]);

  return { saveStatus };
}
```

**Usage in canvas component:**

```typescript
// src/components/canvas/react-flow-canvas.tsx
export function ReactFlowCanvas({ sessionId, stepId }: { sessionId: string, stepId: string }) {
  const { saveStatus } = useCanvasAutosave(sessionId, stepId);

  return (
    <div className="relative w-full h-full">
      <ReactFlow {...props} />

      {/* Status indicator in corner */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        {saveStatus === 'saving' && 'Saving...'}
        {saveStatus === 'saved' && '✓ Saved'}
        {saveStatus === 'error' && '⚠ Save failed'}
      </div>
    </div>
  );
}
```

**Key points:**
- 2s debounce matches v1.0 chat auto-save pattern
- Silent retry up to 3 attempts (meets "retry silently" requirement)
- Status indicator subtle and non-intrusive
- Failure count persists across renders via `useRef`

**Source:** [Autosave with React Hooks](https://www.synthace.com/blog/autosave-with-react-hooks), [Debouncing in React](https://www.developerway.com/posts/debouncing-in-react)

---

### Pattern 5: Force-Save on Navigation

**Problem:** User navigates away before auto-save debounce completes, losing unsaved changes.

**Solution:** Intercept navigation and force immediate save.

**Implementation:**

```typescript
// src/hooks/use-canvas-autosave.ts (extended)
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function useCanvasAutosave(sessionId: string, stepId: string) {
  const postIts = useCanvasStore(state => state.postIts);
  const router = useRouter();
  const pathname = usePathname();

  // ... existing auto-save logic ...

  // Force-save on navigation
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      // Force immediate save (bypass debounce)
      await saveCanvasState(sessionId, stepId, { postIts }, { immediate: true });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [postIts, sessionId, stepId]);

  return { saveStatus };
}
```

**Key points:**
- `beforeunload` event catches browser close, refresh, navigation
- Immediate save bypasses debounce
- No "unsaved changes" dialog (meets requirement)
- Async save may not complete if page unloads quickly (acceptable tradeoff)

**Source:** [Next.js Navigation Events](https://nextjs.org/docs/app/api-reference/functions/use-router), [beforeunload Event MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)

---

### Pattern 6: Dot Grid Background with Tailwind

**Problem:** Empty canvas needs subtle dot grid for spatial orientation.

**Solution:** Use CSS radial gradient with Tailwind utilities.

**Implementation:**

```typescript
// src/components/canvas/canvas-background.tsx
export function CanvasBackground() {
  return (
    <div
      className="absolute inset-0 -z-10"
      style={{
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '20px 20px', // Grid snap size (Claude's discretion)
      }}
    />
  );
}
```

**Alternative using Tailwind plugin (if preferred):**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '20px 20px',
      },
    },
  },
};
```

**Key points:**
- Radial gradient creates dot pattern
- 20px grid spacing (Claude's discretion for snap size)
- `-z-10` places behind post-its
- Extends infinitely (no visible boundaries)

**Source:** [Crafting Grid and Dot Backgrounds with Tailwind CSS](https://ibelick.com/blog/create-grid-and-dot-backgrounds-with-css-tailwind-css), [Grid and Dot Backgrounds](https://ui.aceternity.com/components/grid-and-dot-backgrounds)

---

### Pattern 7: Auto-Fit Zoom on Load

**Problem:** When loading existing canvas with post-its, default zoom may not show all content.

**Solution:** Use ReactFlow's `fitView` on initial load.

**Implementation:**

```typescript
// src/components/canvas/react-flow-canvas.tsx
'use client';

import { useCallback, useEffect } from 'react';
import { ReactFlow, useReactFlow, Node } from '@xyflow/react';
import { useCanvasStore } from '@/providers/canvas-store-provider';

export function ReactFlowCanvas({ sessionId, stepId }: { sessionId: string, stepId: string }) {
  const postIts = useCanvasStore(state => state.postIts);
  const { fitView } = useReactFlow();

  // Convert post-its to ReactFlow nodes
  const nodes: Node[] = postIts.map(postIt => ({
    id: postIt.id,
    type: 'postIt',
    position: postIt.position,
    data: { text: postIt.text },
    width: postIt.width,
    height: postIt.height,
  }));

  // Fit view on initial load if nodes exist
  useEffect(() => {
    if (nodes.length > 0) {
      // Small delay to ensure nodes are rendered
      setTimeout(() => {
        fitView({
          padding: 0.2, // 20% padding around nodes
          duration: 300, // Smooth animation
        });
      }, 100);
    }
  }, []); // Empty deps: only run on mount

  return <ReactFlow nodes={nodes} {...otherProps} />;
}
```

**Key points:**
- `fitView` called once on mount if nodes exist
- 20% padding prevents nodes touching edges
- 300ms animation for smooth transition
- Empty deps array ensures only runs on initial load (not on every node change)

**Source:** [ReactFlow fitView Options](https://reactflow.dev/api-reference/types/fit-view-options), [Calling Fit View outside Component](https://github.com/xyflow/xyflow/discussions/2532)

---

### Pattern 8: Double-Click to Create Post-It

**Problem:** Need to handle double-click on empty canvas space to create post-it at click position.

**Solution:** Use ReactFlow's `onPaneDoubleClick` event.

**Implementation:**

```typescript
// src/components/canvas/react-flow-canvas.tsx
import { useCallback } from 'react';
import { ReactFlow, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/providers/canvas-store-provider';

export function ReactFlowCanvas() {
  const addPostIt = useCanvasStore(state => state.addPostIt);
  const { screenToFlowPosition } = useReactFlow();

  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    // Convert screen coordinates to flow coordinates
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Create new post-it at click position
    addPostIt({
      text: '', // Empty text (will enter edit mode immediately)
      position,
      width: 120,
      height: 120,
    });

    // TODO: Trigger edit mode on newly created post-it
  }, [addPostIt, screenToFlowPosition]);

  return (
    <ReactFlow
      onPaneDoubleClick={handlePaneDoubleClick}
      {...otherProps}
    />
  );
}
```

**Key points:**
- `onPaneDoubleClick` fires only on empty canvas (not on nodes)
- `screenToFlowPosition` converts mouse coordinates to canvas coordinates
- Empty text triggers immediate edit mode (requirement)
- Snap-to-grid logic can be added here (Claude's discretion)

**Source:** [ReactFlow API Reference](https://reactflow.dev/api-reference/react-flow), [Panning and Zooming](https://reactflow.dev/learn/concepts/the-viewport)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas drag-and-drop | Custom mouse event handlers with collision detection, viewport transforms, multi-touch | ReactFlow's built-in drag system | ReactFlow handles viewport transforms, zoom-invariant positioning, touch events, keyboard navigation, accessibility (ARIA), undo/redo state. Custom solution requires 500+ lines and months of edge-case fixes. |
| SSR hydration detection | Manual server/client checks with `useEffect` flags and conditional rendering | `next/dynamic` with `ssr: false` | Next.js dynamic imports handle code splitting, loading states, error boundaries, and SSR exclusion automatically. Manual checks cause flicker and double-rendering. |
| Zustand store initialization | Module-level stores with client-side checks and useEffect resets | Factory pattern with React context provider | Module-level stores cause state leakage across requests in App Router. Provider pattern ensures per-request isolation and prevents hydration errors. |
| Auto-save debouncing | Custom setTimeout management with cleanup and queue logic | `use-debounce` library with `useDebounce` hook | Library handles edge cases: rapid updates, component unmount, React 18 concurrent rendering, cleanup timing. Custom implementation breaks in Suspense boundaries. |
| Infinite canvas background | Canvas 2D API with tile rendering and viewport culling | CSS radial gradient with `background-size` | CSS gradients are GPU-accelerated, zoom-invariant, resolution-independent, and 0 KB bundle. Canvas 2D requires requestAnimationFrame loop, memory management, and device pixel ratio handling. |

**Key insight:** ReactFlow is a mature library (12+ versions) specifically designed for canvas interactions with React. The "don't hand-roll" principle applies strongly here — building custom drag-drop, viewport transforms, and SSR handling would take weeks and introduce bugs that ReactFlow has already solved. The library's 200KB size is justified by its feature completeness and battle-tested reliability.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch from Module-Level Zustand Store

**What goes wrong:** Importing Zustand store at module level causes state to be shared across server requests. First request populates store with User A's data, second request sees User A's data even though it's User B's session. In Next.js App Router, this also causes hydration errors because server render has different state than client render.

**Why it happens:** Next.js App Router caches modules across requests for performance. Module-level variables (including Zustand stores) persist between requests. Zustand store created at module level is initialized once and reused.

**How to avoid:**
1. Create store using factory function (`createCanvasStore()`)
2. Instantiate inside React component with `useState(() => createCanvasStore())`
3. Wrap in context provider for per-request isolation
4. Never export store instance directly — only export factory and context hook

**Warning signs:**
- Console error: "Hydration failed because the initial UI does not match what was rendered on the server"
- Post-its from different users appearing in wrong sessions
- Canvas state persisting when navigating between workshops
- Empty canvas showing stale post-its after refresh

**Source:** [Zustand Next.js Setup Guide](https://zustand.docs.pmnd.rs/guides/nextjs), [Using Persistent Zustand Store with Next.js](https://github.com/pmndrs/zustand/discussions/2788)

---

### Pitfall 2: ReactFlow Hydration Error Without Dynamic Import

**What goes wrong:** ReactFlow component imported normally renders on server, tries to access `window` or `document` during SSR, throws error: "window is not defined". Even if error is caught, ReactFlow HTML on server doesn't match client, causing hydration mismatch.

**Why it happens:** ReactFlow relies on browser APIs for viewport calculations, drag events, and element measurements. These APIs don't exist in Node.js server environment. Next.js 16 defaults to server-rendering all components unless explicitly client-only.

**How to avoid:**
1. Wrap ReactFlow component in `next/dynamic` with `ssr: false`
2. Provide loading fallback (skeleton) during client-side import
3. Wrap in additional `Suspense` boundary for consistent behavior
4. Mark wrapper component with `'use client'` directive

**Warning signs:**
- Error: "window is not defined" or "document is not defined"
- Error: "ReferenceError: ResizeObserver is not defined"
- Console warning: "Hydration failed" with ReactFlow component in stack trace
- Canvas renders blank on first load, works on refresh

**Source:** [ReactFlow SSR Configuration](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration), [Next.js Hydration Errors](https://nextjs.org/docs/messages/react-hydration-error), [Avoiding SSR Pitfalls with next/dynamic](https://dev.to/snaka/avoiding-ssr-pitfalls-using-nextdynamic-in-your-nextjs-app-a4o)

---

### Pitfall 3: JSONB Update Performance with Large Canvas State

**What goes wrong:** Canvas with 50+ post-its results in 10-20KB JSONB payload. Postgres applies TOAST compression to objects >2KB, storing them externally. Every update requires full JSONB copy, even for single post-it changes. Auto-save on drag causes 10-20 database writes per minute, each copying entire canvas state.

**Why it happens:** Postgres has no delta updates for JSONB. When updating a JSONB column, entire value is serialized, compressed (if >2KB), and written to TOAST table. Retrieving TOASTed data requires additional I/O and decompression. Neon Postgres charges per query, not per byte, but repeated large writes increase latency.

**How to avoid:**
1. Debounce auto-save to 2 seconds minimum (reduces write frequency 60x)
2. Keep canvas state under 50KB total (reasonable for 100 post-its @ 500 bytes each)
3. Index on `workshopStepId` for fast retrieval (already exists in schema)
4. Monitor JSONB column size in database — if consistently >50KB, consider normalizing to separate table

**Warning signs:**
- Auto-save latency >500ms (check with React DevTools Profiler)
- Database slow query log shows `UPDATE step_artifacts` taking >200ms
- Postgres `pg_toast` tables growing rapidly in size
- Neon dashboard shows high read/write IOPS for `step_artifacts` table

**Source:** [5mins of Postgres: JSONB TOAST Performance](https://pganalyze.com/blog/5mins-postgres-jsonb-toast), [Avoiding JSONB Performance Bottlenecks](https://dev.to/metis/how-to-avoid-performance-bottlenecks-when-using-jsonb-in-postgresql-4ffl), [Neon JSONB Documentation](https://neon.com/docs/data-types/json)

---

### Pitfall 4: ReactFlow Node Dimensions Missing on SSR

**What goes wrong:** When rendering ReactFlow on server (even with SSR enabled), edges don't connect properly because node dimensions aren't calculated. Nodes overlap, edges point to wrong positions, layout looks broken.

**Why it happens:** ReactFlow calculates node dimensions by measuring DOM elements after render. This doesn't work on server because there's no DOM to measure. Even with `width` and `height` props, complex layouts need actual measurements.

**How to avoid:**
1. Use `ssr: false` dynamic import (recommended for Phase 15 — no SSR needed)
2. If SSR needed in future: explicitly set `width` and `height` on all nodes
3. Set `initialWidth` and `initialHeight` on ReactFlowProvider for SSR
4. Pre-calculate node dimensions based on text length

**Warning signs:**
- Nodes overlapping in unexpected ways
- Empty space where nodes should be
- Edges connecting to wrong points on nodes
- Layout looks perfect after client-side hydration, broken on initial render

**Source:** [ReactFlow SSR Configuration](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration), [SSR Does Not Appear to be Supported (GitHub Issue)](https://github.com/xyflow/xyflow/issues/3168)

---

### Pitfall 5: Auto-Save Race Condition with Optimistic Locking

**What goes wrong:** User has two browser tabs open for same workshop step. Both tabs auto-save canvas state with 2s debounce. Tab A saves at T+2s (version 1 → 2), Tab B saves at T+2.1s with stale version 1, causing optimistic lock error. User loses changes from Tab A.

**Why it happens:** Existing `stepArtifacts` schema has optimistic locking (`version` column). Auto-save from Tab B tries to update with `WHERE version = 1`, but version is already 2 from Tab A's save. Update fails silently or throws `OptimisticLockError`.

**How to avoid:**
1. Detect optimistic lock failure in save action
2. Refetch latest canvas state from database
3. Merge changes intelligently (append new post-its, keep latest positions)
4. Retry save with new version number
5. Show conflict resolution UI only if merge fails

**Warning signs:**
- Save status shows "error" intermittently
- Post-its disappear when switching tabs
- Changes lost without warning
- Database logs show `OptimisticLockError` exceptions

**Source:** Existing `src/lib/context/save-artifact.ts` implementation, [Optimistic Locking Patterns](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)

## Code Examples

### Example 1: Complete Canvas Page Setup

```typescript
// src/app/workshop/[sessionId]/step/[stepId]/page.tsx
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { stepArtifacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CanvasStoreProvider } from '@/providers/canvas-store-provider';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';

export default async function StepPage({
  params,
}: {
  params: { sessionId: string; stepId: string };
}) {
  // Server component: fetch user and canvas state
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // Load canvas state from database
  const artifact = await db
    .select()
    .from(stepArtifacts)
    .where(eq(stepArtifacts.stepId, params.stepId))
    .limit(1);

  const canvasState = artifact[0]?.artifact as { postIts?: any[] } | undefined;

  return (
    <div className="h-screen flex flex-col">
      <h1 className="p-4 text-2xl font-bold">Step: {params.stepId}</h1>

      {/* Canvas with initial state from database */}
      <div className="flex-1 relative">
        <CanvasStoreProvider initialPostIts={canvasState?.postIts || []}>
          <CanvasWrapper sessionId={params.sessionId} stepId={params.stepId} />
        </CanvasStoreProvider>
      </div>
    </div>
  );
}
```

**Source:** Adapted from existing v1.0 patterns in `src/app/workshop/[sessionId]/step/[stepId]/page.tsx`

---

### Example 2: Complete ReactFlow Canvas Component

```typescript
// src/components/canvas/react-flow-canvas.tsx
'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave';
import { PostItNode } from './post-it-node';

const nodeTypes = {
  postIt: PostItNode,
};

function ReactFlowCanvasInner({
  sessionId,
  stepId,
}: {
  sessionId: string;
  stepId: string;
}) {
  const postIts = useCanvasStore((state) => state.postIts);
  const addPostIt = useCanvasStore((state) => state.addPostIt);
  const updatePostIt = useCanvasStore((state) => state.updatePostIt);
  const { fitView, screenToFlowPosition } = useReactFlow();
  const { saveStatus } = useCanvasAutosave(sessionId, stepId);

  // Convert post-its to ReactFlow nodes
  const nodes: Node[] = useMemo(
    () =>
      postIts.map((postIt) => ({
        id: postIt.id,
        type: 'postIt',
        position: postIt.position,
        data: { text: postIt.text },
        width: postIt.width,
        height: postIt.height,
      })),
    [postIts]
  );

  // Auto-fit view on initial load
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle double-click to create post-it
  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Snap to grid (20px grid from background)
      const snappedPosition = {
        x: Math.round(position.x / 20) * 20,
        y: Math.round(position.y / 20) * 20,
      };

      addPostIt({
        text: '',
        position: snappedPosition,
        width: 120,
        height: 120,
      });
    },
    [addPostIt, screenToFlowPosition]
  );

  // Handle node drag end
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updatePostIt(node.id, { position: node.position });
    },
    [updatePostIt]
  );

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={[]} // No edges in Phase 15
        nodeTypes={nodeTypes}
        onNodeDragStop={handleNodeDragStop}
        onPaneDoubleClick={handlePaneDoubleClick}
        fitView
        minZoom={0.5}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />

        {/* Minimal toolbar: just "+" button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => {
              // Create post-it with dealing-cards offset
              const lastPostIt = postIts[postIts.length - 1];
              const basePosition = lastPostIt
                ? { x: lastPostIt.position.x + 30, y: lastPostIt.position.y + 30 }
                : { x: 100, y: 100 };

              addPostIt({
                text: '',
                position: basePosition,
                width: 120,
                height: 120,
              });
            }}
            className="px-4 py-2 bg-white rounded shadow hover:shadow-md"
          >
            + Add Post-it
          </button>
        </div>

        {/* Save status indicator */}
        <div className="absolute bottom-4 right-4 text-xs text-gray-500 z-10">
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && '✓ Saved'}
          {saveStatus === 'error' && '⚠ Save failed'}
        </div>
      </ReactFlow>

      {/* Empty state hint (disappears after first post-it) */}
      {postIts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <p className="text-gray-400 text-lg">Double-click to add a post-it</p>
        </div>
      )}
    </div>
  );
}

export function ReactFlowCanvas(props: { sessionId: string; stepId: string }) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
```

**Source:** [ReactFlow Quick Start](https://reactflow.dev/learn), [Background Component](https://reactflow.dev/api-reference/components/background)

---

### Example 3: Canvas Save Action with Retry

```typescript
// src/actions/canvas-actions.ts
'use server';

import { auth } from '@clerk/nextjs';
import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { OptimisticLockError } from '@/lib/context/save-artifact';

export async function saveCanvasState(
  sessionId: string,
  stepId: string,
  canvasState: { postIts: any[] },
  options?: { immediate?: boolean }
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Find workshop step ID
  const step = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(
        eq(workshopSteps.sessionId, sessionId),
        eq(workshopSteps.stepId, stepId)
      )
    )
    .limit(1);

  if (!step[0]) throw new Error('Workshop step not found');

  // Try to save with optimistic locking
  try {
    const existing = await db
      .select({ id: stepArtifacts.id, version: stepArtifacts.version })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, step[0].id))
      .limit(1);

    if (existing.length > 0) {
      // Update existing artifact
      const currentVersion = existing[0].version;
      const result = await db
        .update(stepArtifacts)
        .set({
          artifact: canvasState,
          version: currentVersion + 1,
          extractedAt: new Date(),
        })
        .where(
          and(
            eq(stepArtifacts.id, existing[0].id),
            eq(stepArtifacts.version, currentVersion)
          )
        );

      // Check if update succeeded (no rows affected = version conflict)
      // Note: Drizzle doesn't expose rowCount, so we rely on re-query
      const updated = await db
        .select({ version: stepArtifacts.version })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.id, existing[0].id))
        .limit(1);

      if (updated[0].version !== currentVersion + 1) {
        throw new OptimisticLockError('Canvas state was updated by another request');
      }
    } else {
      // Insert new artifact
      await db.insert(stepArtifacts).values({
        workshopStepId: step[0].id,
        stepId,
        artifact: canvasState,
        version: 1,
      });
    }
  } catch (error) {
    if (error instanceof OptimisticLockError) {
      // TODO: Implement merge logic for concurrent updates
      console.error('Optimistic lock conflict:', error);
      throw error;
    }
    throw error;
  }
}

export async function loadCanvasState(
  sessionId: string,
  stepId: string
): Promise<{ postIts: any[] } | null> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const step = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(
        eq(workshopSteps.sessionId, sessionId),
        eq(workshopSteps.stepId, stepId)
      )
    )
    .limit(1);

  if (!step[0]) return null;

  const artifact = await db
    .select({ artifact: stepArtifacts.artifact })
    .from(stepArtifacts)
    .where(eq(stepArtifacts.workshopStepId, step[0].id))
    .limit(1);

  return artifact[0]?.artifact as { postIts: any[] } | null;
}
```

**Source:** Adapted from existing `src/lib/context/save-artifact.ts`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ReactFlow v11 with global store | ReactFlow v12 (@xyflow/react) with per-request store | October 2023 (v12 release) | SSR/SSG support added, new package name, requires provider pattern for Next.js 13+ |
| react-dnd for drag-and-drop | ReactFlow built-in drag system | N/A (never used react-dnd) | ReactFlow's drag is purpose-built for canvas, handles viewport transforms and zoom-invariant positioning |
| Manual `useEffect` for SSR detection | `next/dynamic` with `ssr: false` | Next.js 13 (App Router) | Simpler API, better code splitting, automatic loading states, no manual client checks |
| Module-level Zustand stores | Factory pattern with React context | Next.js 13 App Router | Prevents state leakage across requests, fixes hydration errors, required for App Router |
| `react-beautiful-dnd` for drag-drop | Modern alternatives (dnd-kit, ReactFlow built-in) | 2023 (Atlassian archived project) | react-beautiful-dnd no longer maintained, new projects should use dnd-kit or library-specific drag systems |

**Deprecated/outdated:**
- **ReactFlow package name:** Old `reactflow` package deprecated, use `@xyflow/react` (since v12, October 2023)
- **Module-level Zustand stores:** Causes hydration errors in Next.js 13+ App Router, use factory pattern
- **Combining `suspense: true` with `ssr: false`:** Invalid in Next.js, React 18+ always resolves Suspense on server
- **react-beautiful-dnd:** Archived by Atlassian, use dnd-kit or built-in library drag systems

**Source:** [ReactFlow What's New](https://reactflow.dev/whats-new), [ReactFlow v12 Announcement](https://github.com/xyflow/xyflow/discussions/3764), [Zustand Next.js Guide](https://zustand.docs.pmnd.rs/guides/nextjs), [Invalid Dynamic Suspense Usage](https://nextjs.org/docs/messages/invalid-dynamic-suspense)

## Open Questions

### 1. ReactFlow Exact Bundle Size
**What we know:** ReactFlow (@xyflow/react) is a graph library with full drag-drop, viewport, and node management. Typical React graph libraries range 150-250KB minified, 50-80KB gzipped. Bundlephobia page exists but exact metrics not extracted.

**What's unclear:** Exact minified and gzipped size for latest @xyflow/react version. Impact of tree-shaking (can we reduce size by importing only needed components?).

**Recommendation:**
- Install package and measure with `webpack-bundle-analyzer` in Phase 15 implementation
- Check Bundlephobia directly: https://bundlephobia.com/package/@xyflow/react
- Target: Keep total phase addition under 100KB gzipped (acceptable for canvas functionality)
- If exceeds 100KB gzipped: investigate dynamic imports for ReactFlow subcomponents

**Low confidence — requires measurement in actual project.**

---

### 2. Optimistic Lock Merge Strategy
**What we know:** Existing `stepArtifacts` schema has optimistic locking (`version` column). Concurrent saves from multiple tabs will cause `OptimisticLockError`. Need merge strategy to resolve conflicts.

**What's unclear:** Best merge algorithm for canvas state. Options:
- Last-write-wins (simple but loses data)
- Append-only for new post-its (what about position updates?)
- Timestamp-based merge (requires adding timestamps to each post-it)
- Conflict resolution UI (complex UX, may be overkill for Phase 15)

**Recommendation:**
- Phase 15: Log error and show "Save failed" UI, require manual refresh
- Phase 16 or later: Implement intelligent merge (append new post-its, keep latest timestamps for updates)
- For v1.1: Multi-tab editing is edge case, acceptable to require single tab per workshop

**Medium confidence — merge logic can be deferred to later phase.**

---

### 3. ReactFlow Performance with 100+ Post-Its
**What we know:** ReactFlow is designed for hundreds of nodes. DOM-based rendering (not canvas) is fast for <500 elements. Post-its are simple nodes (no complex graphics).

**What's unclear:** Actual performance with 100 post-its in WorkshopPilot's specific setup. Will drag lag? Will auto-save cause UI stuttering?

**Recommendation:**
- Start with 100 post-it limit per canvas (reasonable for design thinking exercises)
- Monitor drag performance in UAT with React DevTools Profiler
- If lag detected: investigate ReactFlow's virtualization options or node memoization
- Document limit in UI: "Maximum 100 post-its per canvas" (likely never hit in practice)

**Medium confidence — expect good performance, but verify in UAT.**

## Sources

### Primary (HIGH confidence)

**ReactFlow Official Documentation:**
- [Server Side Rendering Configuration](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration) - SSR setup, node dimensions, handle positions
- [Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) - Creating post-it node components
- [fitView Options API](https://reactflow.dev/api-reference/types/fit-view-options) - Auto-fit zoom configuration
- [Panning and Zooming](https://reactflow.dev/learn/concepts/the-viewport) - Viewport concepts, screenToFlowPosition
- [ReactFlow Quick Start](https://reactflow.dev/learn) - Basic setup and usage patterns

**Zustand Official Documentation:**
- [Setup with Next.js](https://zustand.docs.pmnd.rs/guides/nextjs) - Provider pattern, per-request stores, hydration safety
- [SSR and Hydration](https://zustand.docs.pmnd.rs/guides/ssr-and-hydration) - Core SSR concepts, useSyncExternalStore

**Next.js Official Documentation:**
- [Dynamic Imports (Lazy Loading)](https://nextjs.org/docs/pages/guides/lazy-loading) - next/dynamic with ssr: false
- [React Hydration Error](https://nextjs.org/docs/messages/react-hydration-error) - Causes and solutions for hydration mismatches
- [Invalid Dynamic Suspense](https://nextjs.org/docs/messages/invalid-dynamic-suspense) - Why suspense + ssr: false doesn't work

**Neon Postgres Documentation:**
- [Postgres JSON Data Types](https://neon.com/docs/data-types/json) - JSONB vs JSON, when to use each
- [Document Store using JSONB](https://neon.com/guides/document-store) - Best practices for storing documents

### Secondary (MEDIUM confidence)

**ReactFlow Community:**
- [ReactFlow GitHub Discussions](https://github.com/xyflow/xyflow/discussions) - Community patterns and solutions
- [React Flow Example Apps (Next.js)](https://github.com/xyflow/react-flow-example-apps) - Official Next.js integration examples
- [@xyflow/react npm Page](https://www.npmjs.com/package/@xyflow/react) - Package metadata, versions

**Next.js Hydration:**
- [Handling Hydration Errors in Next.js (Medium)](https://medium.com/@aviralj02/handling-hydration-errors-in-next-js-79714bab3a3a) - Common causes and fixes
- [Next.js Hydration Errors in 2026 (Medium)](https://medium.com/@blogs-world/next-js-hydration-errors-in-2026-the-real-causes-fixes-and-prevention-checklist-4a8304d53702) - 2026-specific context with App Router
- [Avoiding SSR Pitfalls with next/dynamic (DEV)](https://dev.to/snaka/avoiding-ssr-pitfalls-using-nextdynamic-in-your-nextjs-app-a4o) - Practical SSR exclusion patterns

**Zustand with Next.js:**
- [Fix Next.js Hydration Error with Zustand (Medium)](https://medium.com/@koalamango/fix-next-js-hydration-error-with-zustand-state-management-0ce51a0176ad) - Hydration fix patterns
- [Fixing React Hydration Errors with Zustand Persist (Medium)](https://medium.com/@judemiracle/fixing-react-hydration-errors-when-using-zustand-persist-with-usesyncexternalstore-b6d7a40f2623) - useSyncExternalStore approach

**Auto-Save and Debounce:**
- [Autosave with React Hooks (Synthace)](https://www.synthace.com/blog/autosave-with-react-hooks) - Best practices for auto-save UX
- [Debouncing in React (Developer Way)](https://www.developerway.com/posts/debouncing-in-react) - Common pitfalls and solutions
- [Smarter Forms in React with useAutoSave Hook (Medium)](https://darius-marlowe.medium.com/smarter-forms-in-react-building-a-useautosave-hook-with-debounce-and-react-query-d4d7f9bb052e) - Hook patterns

**JSONB Performance:**
- [5mins of Postgres: JSONB TOAST Performance (pganalyze)](https://pganalyze.com/blog/5mins-postgres-jsonb-toast) - TOAST compression, update costs
- [Avoiding JSONB Performance Bottlenecks (DEV)](https://dev.to/metis/how-to-avoid-performance-bottlenecks-when-using-jsonb-in-postgresql-4ffl) - Optimization strategies
- [PostgreSQL JSONB - Powerful Storage (Architecture Weekly)](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage) - Use cases and patterns

**CSS Backgrounds:**
- [Crafting Grid and Dot Backgrounds with Tailwind CSS (ibelick)](https://ibelick.com/blog/create-grid-and-dot-backgrounds-with-css-tailwind-css) - CSS radial gradient patterns
- [Grid and Dot Backgrounds (Aceternity UI)](https://ui.aceternity.com/components/grid-and-dot-backgrounds) - Component examples

### Tertiary (LOW confidence)

**Bundle Size Tooling:**
- [@xyflow/react on Bundlephobia](https://bundlephobia.com/package/@xyflow/react) - Bundle size metrics (not extracted in search, requires direct visit)
- [webpack-bundle-analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer) - Bundle analysis tool

**React Patterns (2026):**
- [React Stack Patterns](https://www.patterns.dev/react/react-2026/) - Modern React architecture patterns
- [React & Next.js Best Practices 2026 (FAB Web Studio)](https://fabwebstudio.com/blog/react-nextjs-best-practices-2026-performance-scale) - Performance optimization

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All packages verified in official docs, versions checked, compatibility confirmed
- Architecture patterns: **HIGH** - Patterns from official ReactFlow, Zustand, and Next.js documentation with code examples
- Pitfalls: **HIGH** - Documented in official docs and verified by community discussions
- Open questions: **MEDIUM-LOW** - Require project-specific measurement or future design decisions

**Research date:** 2026-02-10
**Valid until:** 2026-04-10 (60 days — stable stack, slow-moving ecosystem)

**Note on prior research:** This research focuses on Phase 15-specific concerns (SSR safety, Zustand provider pattern, ReactFlow setup). The broader v1.1 canvas research (`.planning/research/STACK.md`) recommended custom div-based post-its with @dnd-kit. This phase uses ReactFlow instead per user decision in CONTEXT.md. ReactFlow provides post-it nodes via custom node API, eliminating need for separate drag-drop library.

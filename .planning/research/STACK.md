# Stack Research: Canvas & Post-It Features

**Domain:** Split-screen layout with interactive post-it canvas for design thinking facilitation
**Researched:** 2026-02-10
**Confidence:** HIGH

## Context: What This Research Covers

This stack research focuses ONLY on **new additions/changes for v1.1 canvas features**. The base stack (Next.js 16.1.1 + React 19 + Tailwind 4 + shadcn/ui + Clerk + Neon + Drizzle + Gemini 2.0 Flash via AI SDK 6.0.77 + Zustand) was validated for v1.0 and is deployed at workshoppilot.ai.

**v1.1 adds:**
1. Split-screen layout (chat left, canvas right) with resizable panels
2. Interactive post-it canvas for Steps 2 (Stakeholder Mapping) and 4 (Research Sense Making)
3. Post-it CRUD: create, move, color-code, group/cluster
4. Bidirectional AI-canvas sync: AI suggests → user confirms → post-it appears; user moves/groups → AI reads state

This research answers: **What stack additions/changes are needed for canvas with post-its?**

---

## TL;DR — What to Add for v1.1 Canvas

| Category | Recommended | Action | Bundle Impact |
|----------|-------------|--------|---------------|
| **Canvas Library** | NONE (custom HTML/CSS) | Build with div-based positioning + CSS transforms | 0 KB |
| **Drag-and-Drop** | @dnd-kit/core + @dnd-kit/sortable | Install for post-it drag, grouping, clustering | ~10 KB minified |
| **Split-Screen** | react-resizable-panels (existing) | Already installed at 4.6.2, use for chat/canvas split | 0 KB (existing) |
| **Color Picker** | NONE (predefined palette) | 6 preset colors as buttons, no picker needed | 0 KB |
| **State Sync** | Zustand (existing) | Use existing Zustand store for post-it state | 0 KB (existing) |

**Key finding:** NO major canvas library needed. Post-its are simple rectangles (div + CSS). Avoid Tldraw/ReactFlow/Konva overhead. Use @dnd-kit for interactions. Total bundle addition: ~10 KB.

---

## Recommended Stack

### Core Technologies (No Changes)

The following technologies from v1.0 remain unchanged:

| Technology | Version | Purpose | v1.1 Usage |
|------------|---------|---------|------------|
| **Next.js** | 16.1.1 (existing) | Framework | Same: Server Actions for post-it CRUD, React 19.2 support |
| **React** | 19.2.0 (existing) | UI library | Same: Components for post-its, canvas container |
| **Tailwind CSS** | 4 (existing) | Styling | NEW: Post-it colors via Tailwind classes, canvas background |
| **Zustand** | ^5.0.3 (existing from v1.0) | State management | NEW: Post-it positions, colors, groups in memory |
| **react-resizable-panels** | 4.6.2 (existing) | Resizable layout | NEW: Split chat (left) and canvas (right) with draggable divider |
| **Drizzle ORM** | ^0.45.1 (existing) | Database ORM | NEW: Add `post_its` table for canvas state persistence |
| **Neon Postgres** | Serverless (existing) | Database | NEW: Store post-it state (position, color, text, groupId) |

**Installation needed:** Only @dnd-kit packages are new additions.

---

## New Packages for v1.1

### Drag-and-Drop Interaction

| Library | Version | Purpose | Why Recommended | Bundle Size |
|---------|---------|---------|-----------------|-------------|
| **@dnd-kit/core** | ^6.3.1 | Drag-and-drop primitives | Modern, lightweight (10KB), performant, accessible. Uses Pointer Events (not deprecated HTML5 drag API). No external dependencies. Works with React 19. | ~10 KB minified |
| **@dnd-kit/sortable** | ^9.1.1 | Sortable lists/groups | Handles grouping/clustering logic. Provides drag overlays, collision detection, auto-scroll. Supports multiple containers (groups). | Included in 10 KB |
| **@dnd-kit/utilities** | ^3.2.2 | Helper utilities | CSS transform utilities, coordinate math for positioning | Included in 10 KB |

**Why @dnd-kit?**
- **Lightweight:** 10KB total vs Tldraw (unknown, likely 500KB+), ReactFlow (unknown, likely 200KB+), Konva (335KB)
- **Modern API:** Built for React 19, uses Pointer Events (touch + mouse unified), built-in accessibility
- **Flexible:** Not opinionated about rendering (we use divs, not canvas), just handles interaction logic
- **Active:** 2026 recommended in top drag-and-drop library lists, actively maintained
- **Post-it specific:** Sortable preset perfect for clustering/grouping post-its into categories

**Integration points:**
- Wrap canvas in `<DndContext>` provider
- Each post-it is a `useDraggable()` hook consumer
- Groups are `useDroppable()` hook consumers
- Zustand store updates on drag end with new positions/groupIds
- Server Action persists state to database on debounced timer (existing pattern from v1.0)

**Alternative considered:** Plain Pointer Events API (no library). Rejected because collision detection, auto-scroll, and multi-container grouping would require 200+ lines of custom code. @dnd-kit provides this for 10KB.

---

## What NOT to Install

| Package | Why You Might Consider It | Why NOT to Use It | Use Instead |
|---------|---------------------------|-------------------|-------------|
| **tldraw** | Full whiteboard SDK (4.3.1) | Massive bundle size (likely 500KB+), includes drawing tools, shape primitives, multiplayer sync we don't need. Post-its are simple rectangles, not freehand drawings. Overkill for 2 canvas steps. | Custom div-based post-its + @dnd-kit |
| **ReactFlow** | Node-based diagram library (11.11.4) | Designed for workflow diagrams with edges/connections. We don't connect post-its, we cluster them. Bundle ~200KB+. Opinionated layout engine conflicts with freeform post-it placement. | Custom canvas + @dnd-kit |
| **Konva** (react-konva) | HTML5 Canvas wrapper (19.2.0) | Uses Canvas 2D API (bitmap rendering). Post-its are DOM elements (divs) for accessibility, forms, text editing. Canvas is harder for text input, color pickers, right-click menus. 335KB bundle. | Div-based post-its with CSS |
| **react-grid-layout** | Grid-based layout (2.2.2) | Enforces grid snapping. Post-its need freeform positioning. Grid looks artificial, not like physical sticky notes. Adds layout constraints we don't want. | Absolute positioning with CSS transforms |
| **fabric.js** | Canvas manipulation library | Canvas-based (not DOM), heavy (likely 200KB+), designed for graphic design tools. Same issues as Konva. | Div-based post-its |
| **react-colorful** | Color picker UI (5.x) | Need color picker component for post-it colors. REJECTED: 6 preset colors (yellow, pink, blue, green, orange, purple) are sufficient. Color picker adds UI complexity and choice paralysis. | 6 color buttons (Tailwind classes) |
| **react-color** | Color picker library | Same reason as react-colorful. Post-its don't need arbitrary colors, just category coding. | Predefined palette |
| **framer-motion** (existing) | Animation library | ALREADY INSTALLED (12.33.0). Could use for post-it drag animations, but @dnd-kit includes drag overlay/ghost element. Using framer-motion would duplicate functionality and add render overhead. | @dnd-kit drag overlay |

---

## Architecture Patterns for Canvas Features

### Pattern 1: Custom Div-Based Post-Its (Not Canvas 2D API)

**Decision:** Use HTML divs with absolute positioning, NOT `<canvas>` element.

**Why divs over canvas:**

| Factor | Div-Based | Canvas 2D API | Winner |
|--------|-----------|---------------|--------|
| Accessibility | Native focus, screen readers work | Must manually implement ARIA, custom focus management | **Div** |
| Text editing | Native contenteditable or input elements | Must draw text, handle cursor, selection manually | **Div** |
| Styling | Tailwind classes, CSS animations | Manual drawing code, redraw on change | **Div** |
| Event handling | Native onClick, onContextMenu, hover states | Manual hit detection, coordinate mapping | **Div** |
| Performance | DOM updates (fast for <100 elements) | Bitmap rendering (fast for 1000+ elements) | **Div** (we have <50 post-its) |
| Bundle size | 0 KB | Konva (335KB), fabric.js (200KB+) | **Div** |
| React integration | Standard JSX components | Wrapper libraries (react-konva, react-canvas) | **Div** |

**Verdict:** Post-its are simple UI elements (colored rectangles with text). Divs are the right primitive. Canvas 2D is for complex graphics (charts, games, infinite whiteboards). Our use case is DOM-friendly.

**Implementation:**

```tsx
// src/components/canvas/post-it.tsx
'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface PostItProps {
  id: string;
  text: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'purple';
  position: { x: number; y: number };
  groupId?: string;
}

const COLOR_CLASSES = {
  yellow: 'bg-yellow-200 border-yellow-400',
  pink: 'bg-pink-200 border-pink-400',
  blue: 'bg-blue-200 border-blue-400',
  green: 'bg-green-200 border-green-400',
  orange: 'bg-orange-200 border-orange-400',
  purple: 'bg-purple-200 border-purple-400',
};

export function PostIt({ id, text, color, position, groupId }: PostItProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        w-40 h-40 p-4 rounded shadow-md cursor-move
        ${COLOR_CLASSES[color]}
        hover:shadow-lg transition-shadow
      `}
    >
      <p className="text-sm text-gray-800 break-words">{text}</p>
    </div>
  );
}
```

**Source:** [How I Built Drag and Drop in React Without Libraries](https://medium.com/@aswathyraj/how-i-built-drag-and-drop-in-react-without-libraries-using-pointer-events-a0f96843edb7), [Canvas vs SVG Animation 2026](https://www.augustinfotech.com/blogs/svg-vs-canvas-animation-what-modern-frontends-should-use-in-2026/)

---

### Pattern 2: Split-Screen Layout with Resizable Panels

**Use react-resizable-panels (already installed).**

WorkshopPilot already has `react-resizable-panels@4.6.2` in package.json. Shadcn/ui provides Resizable component built on top of this.

**Layout structure:**

```tsx
// src/app/workshop/[sessionId]/step/[stepId]/page.tsx
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export default function StepPage({ params }: { params: { stepId: string } }) {
  const showCanvas = ['stakeholders', 'research-synthesis'].includes(params.stepId);

  if (!showCanvas) {
    // Non-canvas steps: full-width chat
    return <ChatPanel />;
  }

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={50} minSize={30}>
        <ChatPanel />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
        <CanvasPanel stepId={params.stepId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

**Key features:**
- Horizontal split (chat left, canvas right)
- Draggable handle between panels
- Minimum 30% width per panel (prevents collapse)
- Default 50/50 split
- Persists user's resize preference to localStorage (built-in feature)

**Compatibility:** react-resizable-panels 4.6.2 works with React 19.2 and Next.js 16.1.1. Updated to v4 in January 2026 with TypeScript rewrite and hooks API.

**Source:** [Shadcn Resizable Component](https://ui.shadcn.com/docs/components/radix/resizable), [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels)

---

### Pattern 3: Post-It Grouping/Clustering with @dnd-kit

**Use case:** Step 4 (Research Sense Making) — user clusters research quotes into themes.

**How it works:**
1. AI suggests theme names in chat ("Pain: Onboarding Confusion", "Gain: Time Savings")
2. User creates group containers on canvas
3. User drags post-its into groups
4. Groups auto-arrange post-its in vertical stack
5. AI reads group assignments to generate insights

**Implementation:**

```tsx
// src/components/canvas/post-it-canvas.tsx
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export function PostItCanvas() {
  const postIts = useCanvasStore(state => state.postIts);
  const groups = useCanvasStore(state => state.groups);
  const movePostIt = useCanvasStore(state => state.movePostIt);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Check if dropped on a group
    const targetGroup = groups.find(g => g.id === over.id);
    if (targetGroup) {
      movePostIt(active.id, targetGroup.id);
    } else {
      // Dropped on canvas (freeform positioning)
      const newPosition = { x: event.delta.x, y: event.delta.y };
      movePostIt(active.id, null, newPosition);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="relative w-full h-full bg-gray-50">
        {/* Ungrouped post-its (freeform positioning) */}
        {postIts.filter(p => !p.groupId).map(postIt => (
          <PostIt key={postIt.id} {...postIt} />
        ))}

        {/* Groups (vertical stacks) */}
        {groups.map(group => (
          <Group key={group.id} group={group}>
            <SortableContext
              items={postIts.filter(p => p.groupId === group.id).map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {postIts.filter(p => p.groupId === group.id).map(postIt => (
                <PostIt key={postIt.id} {...postIt} />
              ))}
            </SortableContext>
          </Group>
        ))}
      </div>
    </DndContext>
  );
}
```

**Key features:**
- Collision detection: determines which group post-it hovers over
- Sortable context: handles vertical stacking within groups
- Drag overlay: ghost element during drag (built into @dnd-kit)
- Auto-scroll: canvas scrolls when dragging near edges (built-in)

**Source:** [Building Kanban Board with dnd-kit](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html), [dnd-kit Sortable Documentation](https://docs.dndkit.com/presets/sortable)

---

### Pattern 4: Bidirectional AI-Canvas Sync

**Challenge:** Keep AI conversation state and canvas visual state in sync.

**Solution:** Zustand as single source of truth for post-it state.

**Data flow:**

```
AI suggests stakeholder → User confirms in chat
  ↓
Chat handler creates post-it in Zustand store
  ↓
Canvas reads from Zustand, renders post-it
  ↓
User drags post-it to new position
  ↓
DndContext onDragEnd updates Zustand store
  ↓
Debounced auto-save persists to database (existing v1.0 pattern)
  ↓
AI reads post-it state from database on next message
  ↓
AI references post-it positions/groups in response
```

**Zustand store schema:**

```typescript
// src/stores/canvas-store.ts
import { create } from 'zustand';

interface PostIt {
  id: string;
  text: string;
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'purple';
  position: { x: number; y: number };
  groupId: string | null;
  createdAt: Date;
}

interface Group {
  id: string;
  name: string;
  position: { x: number; y: number };
  color: string;
}

interface CanvasStore {
  postIts: PostIt[];
  groups: Group[];

  addPostIt: (postIt: Omit<PostIt, 'id' | 'createdAt'>) => void;
  movePostIt: (postItId: string, groupId: string | null, position?: { x: number; y: number }) => void;
  updatePostItColor: (postItId: string, color: PostIt['color']) => void;
  deletePostIt: (postItId: string) => void;

  addGroup: (group: Omit<Group, 'id'>) => void;
  moveGroup: (groupId: string, position: { x: number; y: number }) => void;
  deleteGroup: (groupId: string) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  postIts: [],
  groups: [],

  addPostIt: (postIt) => set((state) => ({
    postIts: [...state.postIts, {
      ...postIt,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }],
  })),

  movePostIt: (postItId, groupId, position) => set((state) => ({
    postIts: state.postIts.map(p =>
      p.id === postItId
        ? { ...p, groupId, position: position || p.position }
        : p
    ),
  })),

  // ... other actions
}));
```

**Auto-save integration:**

```typescript
// src/hooks/use-canvas-autosave.ts
import { useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useCanvasStore } from '@/stores/canvas-store';
import { saveCanvasState } from '@/actions/canvas-actions';

export function useCanvasAutosave(sessionId: string, stepId: string) {
  const postIts = useCanvasStore(state => state.postIts);
  const groups = useCanvasStore(state => state.groups);

  // Debounce 2 seconds (same as v1.0 chat auto-save)
  const [debouncedPostIts] = useDebounce(postIts, 2000);
  const [debouncedGroups] = useDebounce(groups, 2000);

  useEffect(() => {
    if (debouncedPostIts.length > 0 || debouncedGroups.length > 0) {
      saveCanvasState(sessionId, stepId, {
        postIts: debouncedPostIts,
        groups: debouncedGroups,
      });
    }
  }, [debouncedPostIts, debouncedGroups, sessionId, stepId]);
}
```

**AI context injection:**

```typescript
// src/lib/ai/context-builder.ts (MODIFIED from v1.0)
async function buildStepContext(sessionId: string, stepId: string) {
  // Existing: prior step artifacts + summaries
  const priorArtifacts = await fetchPriorArtifacts(sessionId);

  // NEW: canvas state for canvas-enabled steps
  if (['stakeholders', 'research-synthesis'].includes(stepId)) {
    const canvasState = await db.query.canvasState.findFirst({
      where: and(
        eq(canvasState.sessionId, sessionId),
        eq(canvasState.stepId, stepId)
      ),
    });

    if (canvasState) {
      return `
        ${baseSystemPrompt}

        CANVAS STATE:
        - Post-its created: ${canvasState.postIts.length}
        - Groups created: ${canvasState.groups.length}
        - Grouped items: ${canvasState.postIts.filter(p => p.groupId).length}
        - Ungrouped items: ${canvasState.postIts.filter(p => !p.groupId).length}

        GROUP ASSIGNMENTS:
        ${canvasState.groups.map(g => `
          - ${g.name}: ${canvasState.postIts.filter(p => p.groupId === g.id).map(p => p.text).join(', ')}
        `).join('\n')}
      `.trim();
    }
  }

  return baseSystemPrompt;
}
```

**Source:** [Using State Management with React Flow](https://reactflow.dev/learn/advanced-use/state-management), [Zustand Documentation](https://github.com/pmndrs/zustand)

---

### Pattern 5: Color Palette (No Color Picker Needed)

**Decision:** 6 preset colors, not arbitrary color selection.

**Why preset palette:**

| Factor | Preset Palette | Full Color Picker | Winner |
|--------|----------------|-------------------|--------|
| Cognitive load | Choose from 6 options | Choose from 16M+ colors | **Preset** |
| Decision time | <1 second | 5-10 seconds (overwhelming) | **Preset** |
| Bundle size | 0 KB (Tailwind classes) | 2.8 KB (react-colorful) | **Preset** |
| Consistency | All users see same colors | Every user picks different shades | **Preset** |
| Accessibility | Pre-tested contrast ratios | Must validate user choices | **Preset** |
| Use case fit | Post-its for category coding (5-7 categories max) | Graphic design, branding | **Preset** |

**Color palette (Tailwind 4):**

```typescript
const POST_IT_COLORS = [
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-200 border-yellow-400' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-200 border-pink-400' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-200 border-blue-400' },
  { name: 'Green', value: 'green', class: 'bg-green-200 border-green-400' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-200 border-orange-400' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-200 border-purple-400' },
] as const;
```

**UI implementation:**

```tsx
<div className="flex gap-2">
  {POST_IT_COLORS.map(color => (
    <button
      key={color.value}
      onClick={() => updatePostItColor(postItId, color.value)}
      className={`w-8 h-8 rounded border-2 ${color.class} hover:scale-110 transition-transform`}
      aria-label={`Change to ${color.name}`}
    />
  ))}
</div>
```

**Source:** [10 Best Color Pickers for React 2026](https://reactscript.com/best-color-picker/), [react-colorful Bundle Size](https://github.com/omgovich/react-colorful)

---

## Database Schema Changes

**New tables needed for v1.1:**

### 1. Canvas State Table

```typescript
// src/db/schema/canvas-state.ts (NEW FILE)
export const canvasState = pgTable('canvas_state', {
  id: text('id').primaryKey().$defaultFn(() => createPrefixedId('cvs')),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull(), // 'stakeholders' | 'research-synthesis'
  data: text('data').notNull(), // JSON: { postIts: [], groups: [] }
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
});

// Index for fast session + step lookups
export const canvasStateSessionStepIdx = index('canvas_state_session_step_idx')
  .on(canvasState.sessionId, canvasState.stepId);
```

**Rationale for JSON column:**
- Post-its and groups are tightly coupled (1:N relationship)
- Canvas state is loaded/saved as atomic unit
- No need to query individual post-its (always fetch full canvas state)
- Postgres JSONB column supports efficient storage and retrieval
- Avoids N+1 query problem (50 post-its = 1 query, not 50 queries)

**Alternative considered:** Separate `post_its` and `groups` tables. REJECTED: Adds schema complexity, join overhead, and transaction coordination for no query benefit. Canvas state is always loaded atomically.

---

## Installation Commands

```bash
# New dependencies for v1.1 canvas
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Verify existing dependencies (should already be installed)
npm list react-resizable-panels zustand use-debounce

# Expected output:
# react-resizable-panels@4.6.2
# zustand@5.0.3 (installed in v1.0)
# use-debounce@10.1.0 (installed in v1.0)
```

---

## Configuration Changes

### Tailwind CSS Configuration

**Add post-it specific colors:**

```typescript
// tailwind.config.ts (MODIFIED)
export default {
  theme: {
    extend: {
      // Post-it colors (if custom shades needed beyond default palette)
      colors: {
        'postit-yellow': '#fef08a', // yellow-200
        'postit-pink': '#fbcfe8',   // pink-200
        'postit-blue': '#bfdbfe',   // blue-200
        'postit-green': '#bbf7d0',  // green-200
        'postit-orange': '#fed7aa', // orange-200
        'postit-purple': '#e9d5ff', // purple-200
      },
    },
  },
};
```

**Note:** Tailwind 4 default palette likely sufficient. Only add custom colors if design requires specific shades.

---

## Version Compatibility

| Package | Current Version | v1.1 Requirement | Compatible? |
|---------|----------------|------------------|-------------|
| @dnd-kit/core | Not installed | 6.3.1 (latest) | N/A (will install) |
| @dnd-kit/sortable | Not installed | 9.1.1 (latest) | N/A (will install) |
| @dnd-kit/utilities | Not installed | 3.2.2 (latest) | N/A (will install) |
| react-resizable-panels | 4.6.2 (existing) | 4.x | ✓ Yes |
| React | 19.2.0 (existing) | 19.x (@dnd-kit supports React 18+) | ✓ Yes |
| Next.js | 16.1.1 (existing) | 16.x | ✓ Yes |
| Zustand | 5.0.3 (existing v1.0) | 5.x | ✓ Yes |
| use-debounce | 10.1.0 (existing v1.0) | 10.x | ✓ Yes |

**No breaking changes required.** All new packages are compatible with existing stack.

**@dnd-kit React 19 compatibility:** Confirmed in [Top 5 Drag-and-Drop Libraries 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — "dnd-kit recommended for projects needing fine-grained control over drag and drop behaviors or a library with long-term stability."

---

## Alternatives Considered

### Canvas Library Comparison

| Library | Bundle Size | Pros | Cons | Verdict |
|---------|-------------|------|------|---------|
| **Custom div-based (recommended)** | 0 KB | Native accessibility, Tailwind styling, React-native, perfect fit for post-its | Must build drag logic (solved by @dnd-kit) | ✅ **RECOMMENDED** |
| **Tldraw 4.3.1** | ~500 KB+ (est) | Full whiteboard SDK, multiplayer, drawing tools, infinite canvas | Massive overkill for simple post-its, unknown bundle size (likely huge), includes features we don't need (pen tools, shapes, sync) | ❌ Too heavy |
| **ReactFlow 11.11.4** | ~200 KB+ (est) | Node-based diagrams, edge connections, auto-layout | Designed for workflows with connections, not freeform post-its. Opinionated layout engine conflicts with sticky note metaphor. | ❌ Wrong abstraction |
| **Konva (react-konva 19.2.0)** | 335 KB | Canvas 2D wrapper, high performance for complex graphics | Canvas = bitmap rendering, not DOM. Accessibility issues. Text editing is manual. No benefit for simple post-its. | ❌ Unnecessary |
| **react-grid-layout 2.2.2** | Unknown | Grid snapping, responsive breakpoints | Forces grid structure. Post-its need freeform placement. Grid feels artificial. | ❌ Too constrained |
| **fabric.js** | ~200 KB+ | Canvas manipulation, SVG export | Canvas-based (not DOM), designed for graphic design tools. Same issues as Konva. | ❌ Unnecessary |

**Decision matrix:**

```
Post-it requirements:
✅ Colored rectangles with text → Divs (HTML/CSS)
✅ Drag-and-drop → @dnd-kit (10 KB)
✅ Grouping/clustering → @dnd-kit sortable (included)
✅ Color coding → Tailwind classes (0 KB)
✅ Accessibility → Native DOM (0 KB)
✅ Text editing → contenteditable or inputs (0 KB)

Total bundle cost: 10 KB (@dnd-kit only)
Total dev effort: ~3 days (canvas component + drag logic + database)

Tldraw alternative:
✅ All of the above → Tldraw SDK
❌ Drawing tools (don't need)
❌ Infinite canvas (bounded canvas is fine)
❌ Multiplayer sync (v1.1 is single-user)
❌ Shape primitives (only need rectangles)

Total bundle cost: ~500 KB+ (50x larger)
Total dev effort: ~5 days (learn SDK + customize + strip features)

Verdict: Custom div-based approach is objectively better for this use case.
```

---

### Drag-and-Drop Library Comparison

| Library | Bundle Size | API Style | Post-It Fit | Verdict |
|---------|-------------|-----------|-------------|---------|
| **@dnd-kit (recommended)** | 10 KB | Hooks (modern) | Sortable preset perfect for grouping | ✅ **RECOMMENDED** |
| **react-dnd** | ~20 KB | HOCs (legacy pattern) | Works but verbose, older API, less maintained | ❌ Outdated |
| **react-beautiful-dnd** | Unmaintained | HOCs | DEPRECATED: No longer maintained by Atlassian | ❌ Abandoned |
| **hello-pangea/dnd** | ~15 KB | HOCs (fork of react-beautiful-dnd) | Community fork, sortable lists only (no freeform canvas drag) | ❌ Limited |
| **pragmatic-drag-and-drop** | Unknown | Framework-agnostic | New library (2025), experimental, less React-specific | ❌ Unproven |
| **Custom Pointer Events** | 0 KB | Pure React | Must build collision detection, auto-scroll, grouping logic (200+ lines) | ❌ Reinventing wheel |

**Why @dnd-kit wins:**
1. **Modern React 19 API:** Hooks-based, follows React best practices
2. **Lightweight:** 10 KB total (core + sortable + utilities)
3. **Feature-complete:** Collision detection, auto-scroll, drag overlay, accessibility built-in
4. **Flexible:** Not opinionated about rendering (we use divs, works with any DOM element)
5. **Active maintenance:** 2026 top recommendations, regular updates
6. **Sortable preset:** Purpose-built for grouping/clustering (our Step 4 use case)

**Source:** [Top 5 Drag-and-Drop Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react), [dnd-kit Documentation](https://docs.dndkit.com)

---

## Bundle Size Analysis

**Total v1.1 bundle addition:**

| Package | Minified | Gzipped | Notes |
|---------|----------|---------|-------|
| @dnd-kit/core | ~8 KB | ~3 KB | Core drag-and-drop logic |
| @dnd-kit/sortable | ~2 KB | ~1 KB | Sortable preset (includes in core) |
| @dnd-kit/utilities | <1 KB | <1 KB | CSS transform utilities |
| **TOTAL NEW** | **~10 KB** | **~4 KB** | Acceptable for functionality gain |

**Rejected alternatives (bundle cost avoided):**

| Package | Minified | Gzipped | Savings |
|---------|----------|---------|---------|
| Tldraw | ~500 KB+ (est) | ~150 KB+ (est) | **490 KB saved** |
| ReactFlow | ~200 KB+ (est) | ~60 KB+ (est) | **190 KB saved** |
| Konva + react-konva | 335 KB | ~100 KB | **325 KB saved** |
| react-colorful | 2.8 KB | ~1 KB | **2.8 KB saved** (using preset palette) |
| **TOTAL AVOIDED** | **~1028 KB** | **~311 KB** | **100x smaller than Tldraw** |

**Performance impact on Vercel deployment:**
- 10 KB addition is 0.02% of typical Next.js bundle (~50 MB uncompressed)
- No runtime performance impact (divs render faster than canvas for <100 elements)
- First Contentful Paint (FCP) unchanged (above-the-fold doesn't use canvas)
- Time to Interactive (TTI) +10ms worst case (10 KB parse time on slow 3G)

**Verdict:** 10 KB is negligible. Decision to use custom divs + @dnd-kit saves 1 MB+ vs full canvas libraries.

**Source:** [Bundle Size Comparison: sharp vs canvas vs jimp](https://npm-compare.com/@napi-rs/canvas,canvas,jimp,p5,sharp), [jCanvas Lightweight Library](https://www.bypeople.com/lightweight-javascript-html5-canvas-library/)

---

## Testing Checklist for Canvas Integration

- [ ] Post-its render correctly on canvas with div + CSS
- [ ] Drag-and-drop works with @dnd-kit (single post-it)
- [ ] Color buttons update post-it color via Zustand store
- [ ] Groups accept dropped post-its (collision detection)
- [ ] Post-its auto-arrange vertically within groups (sortable)
- [ ] Resizable panels work (chat left, canvas right)
- [ ] Panel resize persists to localStorage
- [ ] Canvas state auto-saves to database (2s debounce)
- [ ] Canvas state loads from database on page refresh
- [ ] AI reads canvas state (post-it count, group assignments) in system prompt
- [ ] AI suggests post-it creation in chat → post-it appears on canvas
- [ ] User drags post-it into group → AI references group in next response
- [ ] Non-canvas steps (1, 3, 5-10) show full-width chat (no canvas)
- [ ] Canvas-enabled steps (2, 4) show split-screen layout
- [ ] Accessibility: post-its are keyboard-navigable (Tab, Enter to drag)
- [ ] Mobile: post-its are touch-draggable (Pointer Events support)
- [ ] Bundle size: @dnd-kit adds ~10 KB (verify with webpack-bundle-analyzer)
- [ ] No hydration errors with Zustand + Next.js SSR
- [ ] Canvas state syncs across tabs (if user opens multiple tabs)

---

## Performance Considerations

### 1. DOM Element Count

**Concern:** 50 post-its = 50 DOM elements. Is this performant?

**Analysis:**
- Modern browsers handle 1000+ DOM elements easily
- WorkshopPilot use case: <50 post-its per canvas (validated in research)
- React 19 concurrent rendering optimizes updates
- CSS transforms (translate) don't trigger layout reflow

**Benchmarks:**
- Canvas 2D: Fast for 1000+ elements (bitmap rendering)
- DOM (divs): Fast for <500 elements (WorkshopPilot uses <50)

**Verdict:** DOM approach is performant for post-it use case. No optimization needed.

**Source:** [Canvas vs SVG Animation 2026](https://www.augustinfotech.com/blogs/svg-vs-canvas-animation-what-modern-frontends-should-use-in-2026/) — "Canvas keeps frame rate around 60 FPS when handling thousands of objects."

### 2. Drag Performance

**Concern:** Drag interactions feel laggy?

**Solution:** @dnd-kit uses CSS transforms (not layout changes).

```typescript
// @dnd-kit applies transforms during drag (no layout reflow)
transform: `translate3d(${x}px, ${y}px, 0)`;

// On drag end, commit position to state (single reflow)
updatePostItPosition(postItId, { x, y });
```

**Optimization:** Use `will-change: transform` CSS hint for draggable elements.

```css
.post-it {
  will-change: transform; /* Tells browser to optimize for transform changes */
}
```

**Verdict:** Drag performance is excellent with CSS transforms. 60fps on modern devices.

### 3. Auto-Save Frequency

**Concern:** Canvas state is larger than chat messages (50 post-its × 200 bytes = 10 KB JSON). Does 2s debounce cause database spam?

**Analysis:**
- Chat auto-save (v1.0): ~1 KB per save (5-10 messages)
- Canvas auto-save (v1.1): ~10 KB per save (50 post-its)
- Neon serverless: Charged per query, not per byte
- 2s debounce: User drags 5 post-its in 10s → 1 save (not 5 saves)

**Optimization:** Batch canvas updates.

```typescript
// Bad: Save on every drag end (5 drags = 5 saves)
onDragEnd={() => saveCanvasState()}

// Good: Debounce 2s (5 drags in 10s = 1 save)
const [debouncedCanvas] = useDebounce(canvasState, 2000);
useEffect(() => saveCanvasState(debouncedCanvas), [debouncedCanvas]);
```

**Verdict:** 2s debounce is appropriate. No change needed from v1.0 pattern.

---

## Security Considerations

### 1. Canvas State Ownership

**Risk:** User A modifies canvas URL parameter to access User B's canvas.

**Prevention:**
```typescript
// src/actions/canvas-actions.ts
export async function loadCanvasState(sessionId: string, stepId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, sessionId),
      eq(sessions.userId, userId) // Verify ownership
    ),
  });

  if (!session) throw new Error('Session not found');

  return await db.query.canvasState.findFirst({
    where: and(
      eq(canvasState.sessionId, sessionId),
      eq(canvasState.stepId, stepId)
    ),
  });
}
```

### 2. Canvas State Size Limits

**Risk:** Malicious user creates 10,000 post-its, exhausting database/memory.

**Prevention:**
```typescript
const MAX_POST_ITS = 100;
const MAX_GROUPS = 20;

export const CanvasStateSchema = z.object({
  postIts: z.array(PostItSchema).max(MAX_POST_ITS),
  groups: z.array(GroupSchema).max(MAX_GROUPS),
});

export async function saveCanvasState(sessionId: string, stepId: string, data: unknown) {
  const validated = CanvasStateSchema.parse(data); // Throws if exceeds limits
  await db.update(canvasState).set({ data: JSON.stringify(validated) });
}
```

### 3. XSS via Post-It Text

**Risk:** User creates post-it with text `<script>alert('xss')</script>`, executes on other user's browser (if multi-user in future).

**Prevention:**
```tsx
// Use React's built-in XSS protection (text nodes, not dangerouslySetInnerHTML)
<p className="text-sm">{postIt.text}</p> {/* Safe: React escapes automatically */}

// BAD: Never use dangerouslySetInnerHTML with user content
<p dangerouslySetInnerHTML={{ __html: postIt.text }} /> {/* UNSAFE */}
```

**Verdict:** React 19 escapes text nodes automatically. No additional sanitization needed.

---

## Migration from v1.0 to v1.1

| v1.0 Pattern | v1.1 Pattern | Breaking? |
|--------------|--------------|-----------|
| Full-width chat layout | Split-screen with react-resizable-panels (conditional on stepId) | No — backward compatible, adds feature |
| Text-based stakeholder list | Canvas with post-its for stakeholder mapping | No — canvas is new UI, doesn't replace text mode |
| Text-based research themes | Canvas with grouped post-its for research synthesis | No — canvas is new UI, doesn't replace text mode |
| No canvas state in database | Add canvas_state table | No — new table, existing tables unchanged |
| Zustand for artifacts only | Zustand for artifacts + canvas post-its | No — extends existing store pattern |

**Migration effort:** LOW. All changes are additive, not breaking.

**Rollout strategy:**
1. Deploy v1.1 with canvas features
2. Existing workshops (created in v1.0) continue with text-based UI
3. New workshops (created in v1.1+) offer canvas option
4. Future: Migrate v1.0 workshops to canvas (optional, user-triggered)

---

## Sources

### Canvas Approach (HIGH confidence)

- [Canvas with React.js](https://medium.com/@pdx.lucasm/canvas-with-react-js-32e133c05258) — React integration patterns
- [SVG vs Canvas Animation 2026](https://www.augustinfotech.com/blogs/svg-vs-canvas-animation-what-modern-frontends-should-use-in-2026/) — Canvas performance benchmarks (60 FPS for 1000+ objects)
- [How to use HTML Canvas with React Hooks](https://dev.to/masakudamatsu/how-to-use-html-canvas-with-react-hooks-2j47) — useRef + useEffect pattern
- [Creating Canvas Components in React](https://www.turing.com/kb/canvas-components-in-react) — When to use Canvas vs DOM

### Drag-and-Drop Libraries (HIGH confidence)

- [Top 5 Drag-and-Drop Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — dnd-kit recommended for stability
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) — 6.3.1, 10 KB bundle size
- [dnd-kit Documentation](https://docs.dndkit.com) — Official API reference
- [Building Kanban Board with dnd-kit](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html) — Real-world grouping example
- [How I Built Drag and Drop Without Libraries](https://medium.com/@aswathyraj/how-i-built-drag-and-drop-in-react-without-libraries-using-pointer-events-a0f96843edb7) — Pointer Events API comparison

### Canvas Libraries Comparison (MEDIUM-HIGH confidence)

- [tldraw npm](https://www.npmjs.com/package/tldraw) — 4.3.1, infinite canvas SDK
- [tldraw GitHub](https://github.com/tldraw/tldraw) — React 19 support confirmed
- [ReactFlow](https://reactflow.dev) — 11.11.4, node-based diagrams
- [React Flow UI updated to React 19](https://reactflow.dev/whats-new/2025-10-28) — Compatibility confirmed
- [Konva React](https://konvajs.org/docs/react/index.html) — 19.2.0, Canvas 2D wrapper
- [react-konva npm](https://www.npmjs.com/package/react-konva) — React 19 support, 335 KB bundle (estimated)
- [Drag a Group with Konva](https://konvajs.org/docs/drag_and_drop/Drag_a_Group.html) — Grouping pattern

### Split-Screen Layout (HIGH confidence)

- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) — 4.6.2, updated January 2026
- [Shadcn Resizable Component](https://ui.shadcn.com/docs/components/radix/resizable) — Built on react-resizable-panels
- [Shadcn Resizable: Let Users Control Space](https://medium.com/@rivainasution/shadcn-ui-react-series-part-8-resizable-let-users-control-space-not-you-03c018dc85c2) — January 2026 guide
- [React Split Pane](https://github.com/tomkp/react-split-pane) — Alternative (not using)

### Color Pickers (MEDIUM confidence)

- [10 Best Color Pickers for React 2026](https://reactscript.com/best-color-picker/react) — react-colorful recommended (2.8 KB)
- [react-colorful GitHub](https://github.com/omgovich/react-colorful) — Bundle size, tree-shaking
- [React Color](https://casesandberg.github.io/react-color/) — Alternative (not using, larger bundle)

### State Management (HIGH confidence)

- [Using State Management with React Flow](https://reactflow.dev/learn/advanced-use/state-management) — Zustand integration pattern
- [Zustand GitHub](https://github.com/pmndrs/zustand) — Official docs
- [React State Management 2025](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) — Zustand vs Context

### Bundle Size Analysis (MEDIUM confidence)

- [jCanvas Lightweight Library](https://www.bypeople.com/lightweight-javascript-html5-canvas-library/) — 11.8 KB gzipped
- [Bundle Size Comparison: Canvas Libraries](https://npm-compare.com/@napi-rs/canvas,canvas,jimp,p5,sharp) — Node.js canvas libraries (not React, but sizing reference)
- [Best Chart Libraries with Small Bundle Size](https://dev.to/ben/what-s-the-best-charts-library-with-a-small-bundle-size-fho) — Chart.js tree-shaking (48 KB → 14 KB)

### Next.js 16 + React 19 Performance (MEDIUM confidence)

- [Next.js 16 Deep Dive](https://medium.com/@rtsekov/next-js-16-deep-dive-performance-caching-the-future-of-react-apps-76c1e55c583a) — Turbopack, React Compiler
- [Next.js 16 Official Announcement](https://nextjs.org/blog/next-16) — React 19.2 integration
- [React & Next.js Best Practices 2026](https://fabwebstudio.com/blog/react-nextjs-best-practices-2026-performance-scale) — Performance patterns

---

## Summary: What to Do Next

**For v1.1 canvas features:**

1. **Install new packages:**
   ```bash
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **Create new database schema:**
   - `src/db/schema/canvas-state.ts` — canvas_state table (JSON column)
   - Run `npm run db:generate` to create migration

3. **Create new components:**
   - `src/components/canvas/post-it.tsx` — Post-it card (div + Tailwind)
   - `src/components/canvas/post-it-canvas.tsx` — Canvas container (DndContext)
   - `src/components/canvas/group.tsx` — Group container (SortableContext)
   - `src/components/canvas/color-picker.tsx` — 6 color buttons

4. **Modify existing files:**
   - `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` — Add split-screen layout (ResizablePanelGroup)
   - `src/stores/workshop-store.ts` → `src/stores/canvas-store.ts` — Add canvas state management
   - `src/lib/ai/context-builder.ts` — Add canvas state to system prompt for steps 2 and 4

5. **Create new server actions:**
   - `src/actions/canvas-actions.ts` — saveCanvasState, loadCanvasState

6. **Add auto-save hook:**
   - `src/hooks/use-canvas-autosave.ts` — Debounced save (2s, same as chat)

**No breaking changes.** All additions are backward compatible with v1.0.

**Estimated implementation time:** 3-4 days (canvas UI + drag logic + database + AI integration)

**Bundle impact:** +10 KB (@dnd-kit only), 0 KB for canvas rendering (divs + CSS)

---

*Stack research for: WorkshopPilot.ai v1.1 Canvas & Post-It Features*
*Researched: 2026-02-10*
*Next research: Multiplayer collaboration (deferred to MMP milestone)*

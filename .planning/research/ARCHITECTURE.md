# Architecture Research: Canvas Integration for WorkshopPilot.ai

**Domain:** Canvas component integration into existing Next.js AI-powered workshop application
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

Adding a canvas component to an existing Next.js chat-based application requires careful integration at four levels: (1) Layout modification for split-screen, (2) State management for bidirectional AI-canvas sync, (3) Data persistence for canvas items, and (4) Component architecture for reusability across steps.

**Critical insight:** The canvas is NOT a separate feature—it's a projection of structured outputs controlled by the AI conversation. AI suggests → user confirms → canvas updates. Canvas changes → AI reads silently via context. The conversation remains the source of truth.

**Recommended approach:** Use react-resizable-panels (already in dependencies) for split-screen, Zustand for canvas state (consistent with existing stores), extend stepArtifacts table for persistence, and build step-specific canvas components that share common infrastructure.

## System Overview

### Current Architecture (v1.0)

```
┌──────────────────────────────────────────────────────────────────┐
│                     WORKSHOP LAYOUT (RSC)                        │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────────┐   │
│  │  Sidebar    │  │        Main Area (Full Width)           │   │
│  │  (Steps)    │  │                                         │   │
│  │             │  │  ┌────────────────────────────────────┐ │   │
│  │  Step 1 ○   │  │  │      StepContainer (Client)        │ │   │
│  │  Step 2 ○   │  │  │                                    │ │   │
│  │  Step 3 ○   │  │  │  ┌──────────┐  ┌──────────────┐   │ │   │
│  │    ...      │  │  │  │  Chat    │  │  Output      │   │ │   │
│  │  Step 10 ○  │  │  │  │  Panel   │  │  Panel       │   │ │   │
│  │             │  │  │  └──────────┘  └──────────────┘   │ │   │
│  │             │  │  │  (Resizable Panels - Horizontal)  │ │   │
│  └─────────────┘  │  └────────────────────────────────────┘ │   │
│                   └─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Target Architecture (v1.1 Canvas Foundation)

```
┌──────────────────────────────────────────────────────────────────┐
│                     WORKSHOP LAYOUT (RSC)                        │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────────┐   │
│  │  Sidebar    │  │      Main Area (Split Screen)           │   │
│  │  (Steps)    │  │                                         │   │
│  │             │  │  ┌────────────────────────────────────┐ │   │
│  │  Step 1 ○   │  │  │      StepContainer (Client)        │ │   │
│  │  Step 2 ●   │  │  │                                    │ │   │
│  │  Step 3 ○   │  │  │  ┌──────────┐  ┌──────────────┐   │ │   │
│  │  Step 4 ●   │  │  │  │  Chat    │  │  Canvas or   │   │ │   │
│  │    ...      │  │  │  │  Panel   │  │  Output      │   │ │   │
│  │  Step 10 ○  │  │  │  │          │  │  Panel       │   │ │   │
│  │             │  │  │  └──────────┘  └──────────────┘   │ │   │
│  │             │  │  │  (Resizable Panels - Horizontal)  │ │   │
│  └─────────────┘  │  └────────────────────────────────────┘ │   │
│                   └─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

● = Canvas-enabled step (Steps 2, 4)
○ = Standard output panel (Steps 1, 3, 5-10)
```

### Canvas Component Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     CANVAS INFRASTRUCTURE                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  canvasStore (Zustand)                   │   │
│  │  - items: CanvasItem[]                                   │   │
│  │  - addItem(), updateItem(), removeItem()                 │   │
│  │  - sync with stepArtifacts                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↑ ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              BaseCanvas (Shared Component)               │   │
│  │  - Drag/drop infrastructure                              │   │
│  │  - Zoom/pan controls (future)                            │   │
│  │  - Item selection/editing                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↑ ↓                                    │
│  ┌─────────────────────┐     ┌─────────────────────────────┐   │
│  │  StakeholderCanvas  │     │  ResearchThemeCanvas        │   │
│  │  (Step 2)           │     │  (Step 4)                   │   │
│  │  - Bullseye rings   │     │  - Empathy map quadrants    │   │
│  │  - Post-it items    │     │  - Theme clustering         │   │
│  └─────────────────────┘     └─────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Integration Point |
|-----------|----------------|-------------------|
| **StepContainer** | Conditionally render CanvasPanel vs OutputPanel based on step | Modified (add canvas detection logic) |
| **CanvasPanel** | Wrapper for step-specific canvas components | NEW |
| **BaseCanvas** | Shared drag/drop, item management, state sync | NEW |
| **StakeholderCanvas** | Step 2: Bullseye radar chart with stakeholder post-its | NEW |
| **ResearchThemeCanvas** | Step 4: Empathy map quadrants with theme clusters | NEW |
| **canvasStore** | Zustand store for canvas state (items, positions) | NEW |
| **OutputPanel** | Existing component for text-based artifact display | UNCHANGED |
| **ChatPanel** | Existing component for AI conversation | UNCHANGED (new patterns in prompts) |

## Canvas Integration Architecture

### 1. Layout Modification

**Current:** StepContainer uses react-resizable-panels to split Chat (left) and Output (right).

**Target:** StepContainer conditionally renders Canvas Panel for Steps 2 and 4, OutputPanel for all others.

**Implementation:**
```typescript
// src/components/workshop/step-container.tsx (MODIFIED)

// Existing resizable panel structure stays, but right panel changes
const renderRightPanel = () => {
  // Step-specific canvas detection
  const canvasSteps = [2, 4];

  if (canvasSteps.includes(stepOrder)) {
    return (
      <CanvasPanel
        stepOrder={stepOrder}
        sessionId={sessionId}
        workshopId={workshopId}
        artifact={artifact}
        onArtifactChange={handleArtifactChange}
      />
    );
  }

  // Default: existing OutputPanel
  return (
    <OutputPanel
      stepOrder={stepOrder}
      artifact={artifact}
      isExtracting={isExtracting}
      extractionError={extractionError}
      onRetry={extractArtifact}
    />
  );
};

// Desktop: resizable panels (EXISTING PATTERN)
return (
  <div className="flex h-full flex-col">
    <div className="min-h-0 flex-1 overflow-hidden">
      <Group orientation="horizontal" className="h-full">
        <Panel defaultSize={50} minSize={30}>
          {renderContent()} {/* ChatPanel - unchanged */}
        </Panel>
        <Separator />
        <Panel defaultSize={50} minSize={25}>
          {renderRightPanel()} {/* NEW: conditional rendering */}
        </Panel>
      </Group>
    </div>
    <StepNavigation {...navProps} />
  </div>
);
```

**Trade-offs:**
- PRO: Minimal disruption to existing layout logic
- PRO: Reuses react-resizable-panels (already in dependencies)
- CON: Canvas components need to handle panel resize events for responsive rendering

---

### 2. State Management Strategy

**Principle:** Canvas state lives in a Zustand store (canvasStore), separate from chatStore but parallel to existing workshop state architecture.

**Why Zustand:**
- Already used in project (consistency)
- Lightweight and performant for canvas interactions (re-renders only affected items)
- Domain-scoped stores (canvasStore for canvas, chatStore for chat) prevent coupling
- Works seamlessly with React 19 and Next.js App Router

**Store Structure:**
```typescript
// src/stores/canvas.store.ts (NEW)

import { create } from 'zustand';

export interface CanvasItem {
  id: string;                    // Unique item ID
  type: 'stakeholder' | 'theme'; // Item type (step-specific)
  content: string;               // Display text
  position: { x: number; y: number }; // Canvas coordinates
  metadata: Record<string, unknown>;  // Step-specific data (e.g., priority, ring)
  createdAt: Date;
  updatedAt: Date;
}

interface CanvasState {
  // State
  items: CanvasItem[];
  selectedItemId: string | null;

  // Actions
  addItem: (item: Omit<CanvasItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateItem: (id: string, updates: Partial<CanvasItem>) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  clearItems: () => void;

  // Persistence
  loadItems: (items: CanvasItem[]) => void;
  syncToServer: (workshopId: string, stepId: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  items: [],
  selectedItemId: null,

  addItem: (itemData) => set((state) => ({
    items: [...state.items, {
      ...itemData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }],
  })),

  updateItem: (id, updates) => set((state) => ({
    items: state.items.map((item) =>
      item.id === id
        ? { ...item, ...updates, updatedAt: new Date() }
        : item
    ),
  })),

  removeItem: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),

  selectItem: (id) => set({ selectedItemId: id }),

  clearItems: () => set({ items: [], selectedItemId: null }),

  loadItems: (items) => set({ items, selectedItemId: null }),

  syncToServer: async (workshopId, stepId) => {
    const { items } = get();
    await fetch('/api/canvas/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workshopId, stepId, items }),
    });
  },
}));
```

**Alternative Considered: Component-level useState**
- REJECTED: Canvas state needs to survive component unmounts (user navigates away and returns)
- REJECTED: No cross-component sharing (e.g., ChatPanel can't read canvas state for context)
- REJECTED: Difficult to implement auto-save and server sync

**Alternative Considered: Extend workshopStore**
- REJECTED: Canvas state is domain-specific, not workshop-wide
- REJECTED: Canvas items don't need to be in global workshop context
- REJECTED: Separation of concerns (chat state, workshop state, canvas state are independent)

---

### 3. Bidirectional AI-Canvas Sync

**Pattern:** AI conversation drives canvas updates; canvas state flows back to AI as read-only context.

**Flow 1: AI → Canvas (Suggestions)**
```
1. User chats with AI in ChatPanel
2. AI generates suggestions with structured output:
   [SUGGESTIONS]
   - Stakeholder: Department Head (Priority: High)
   - Stakeholder: Logistics Manager (Priority: Medium)
   [/SUGGESTIONS]
3. User clicks suggestion pill
4. Suggestion auto-populates input → User sends
5. AI confirms: "Added 'Department Head' to stakeholders"
6. AI triggers structured output extraction
7. Extracted artifact updates stepArtifacts table
8. Canvas loads from artifact and renders items
```

**Flow 2: Canvas → AI (Silent Context)**
```
1. User drags stakeholder post-it from outer ring → inner ring
2. canvasStore.updateItem() updates item.metadata.ring
3. useAutoSave hook debounces and syncs to stepArtifacts
4. Next AI message request includes updated artifact in context:
   "Current stakeholders on canvas:
    - Inner ring: Department Head, CEO
    - Middle ring: Logistics Manager
    - Outer ring: Regulatory Bodies"
5. AI uses canvas state to make context-aware suggestions
```

**Implementation: Auto-save hook**
```typescript
// src/hooks/use-canvas-autosave.ts (NEW)

import { useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import { useDebouncedCallback } from 'use-debounce';

export function useCanvasAutoSave(
  workshopId: string,
  stepId: string,
  enabled: boolean = true
) {
  const { items, syncToServer } = useCanvasStore();

  // Debounce sync to avoid excessive writes (2s debounce, 10s max wait)
  const debouncedSync = useDebouncedCallback(
    () => {
      if (enabled) {
        syncToServer(workshopId, stepId).catch((error) => {
          console.error('Canvas auto-save failed:', error);
        });
      }
    },
    2000,
    { maxWait: 10000 }
  );

  useEffect(() => {
    if (items.length > 0) {
      debouncedSync();
    }
  }, [items, debouncedSync]);

  return { isSyncing: debouncedSync.isPending() };
}
```

**Implementation: Canvas context injection**
```typescript
// src/lib/ai/context-assembly.ts (MODIFIED)

export async function assembleStepContext(
  workshopId: string,
  stepId: string,
  stepOrder: number
) {
  // Existing context assembly...
  const priorStepOutputs = await loadPriorStepOutputs(workshopId, stepOrder);

  // NEW: Include canvas state for canvas-enabled steps
  let canvasContext = null;
  if ([2, 4].includes(stepOrder)) {
    const artifact = await loadStepArtifact(workshopId, stepId);
    if (artifact?.canvasItems) {
      canvasContext = formatCanvasForAI(artifact.canvasItems, stepOrder);
    }
  }

  return {
    priorStepOutputs,
    canvasContext, // NEW field in context object
    conversationSummary,
    recentMessages,
  };
}

function formatCanvasForAI(items: CanvasItem[], stepOrder: number) {
  if (stepOrder === 2) {
    // Stakeholder canvas: group by ring
    const byRing = groupBy(items, (item) => item.metadata.ring);
    return {
      innerRing: byRing['inner']?.map(i => i.content) || [],
      middleRing: byRing['middle']?.map(i => i.content) || [],
      outerRing: byRing['outer']?.map(i => i.content) || [],
    };
  }

  if (stepOrder === 4) {
    // Research canvas: group by quadrant
    const byQuadrant = groupBy(items, (item) => item.metadata.quadrant);
    return {
      said: byQuadrant['said']?.map(i => i.content) || [],
      thought: byQuadrant['thought']?.map(i => i.content) || [],
      felt: byQuadrant['felt']?.map(i => i.content) || [],
      experienced: byQuadrant['experienced']?.map(i => i.content) || [],
    };
  }

  return null;
}
```

**Trade-offs:**
- PRO: Maintains "conversation is source of truth" principle
- PRO: Canvas changes are non-blocking (auto-save in background)
- PRO: AI has full visibility into canvas state for context-aware responses
- CON: Canvas state lags slightly (2-10s debounce) before visible to AI
- CON: User might expect instant AI reaction to canvas changes (needs UX clarity)

---

### 4. Data Persistence

**Strategy:** Extend existing stepArtifacts table to store canvas items alongside structured outputs.

**Schema (No Migration Required):**
```typescript
// src/db/schema/step-artifacts.ts (EXISTING)

export const stepArtifacts = pgTable('step_artifacts', {
  id: text('id').primaryKey(),
  workshopStepId: text('workshop_step_id').references(() => workshopSteps.id),
  stepId: text('step_id').notNull(),
  artifact: jsonb('artifact').$type<Record<string, unknown>>(), // EXISTING
  // ↑ Canvas items go in artifact.canvasItems array
  schemaVersion: text('schema_version').default('1.0'),
  extractedAt: timestamp('extracted_at').defaultNow(),
  version: integer('version').default(1), // Optimistic locking
});
```

**Artifact Structure for Canvas Steps:**
```typescript
// Step 2 (Stakeholder Mapping) artifact schema
interface Step2Artifact {
  stakeholders: Array<{
    id: string;
    name: string;
    role: string;
    priority: 'high' | 'medium' | 'low';
    ring: 'inner' | 'middle' | 'outer';
  }>;
  canvasItems: Array<CanvasItem>; // NEW: Canvas representation
  completedAt: string;
}

// Step 4 (Research Sense Making) artifact schema
interface Step4Artifact {
  themes: Array<{
    id: string;
    name: string;
    observations: string[];
    insight: string;
    type: 'pain' | 'gain';
  }>;
  topPains: string[];   // Top 5 pains
  topGains: string[];   // Top 5 gains
  canvasItems: Array<CanvasItem>; // NEW: Canvas representation
  completedAt: string;
}
```

**Persistence API Routes:**
```typescript
// src/app/api/canvas/sync/route.ts (NEW)

import { db } from '@/db/client';
import { stepArtifacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { workshopId, stepId, items } = await request.json();

  // Verify ownership
  const workshop = await db.query.workshops.findFirst({
    where: (workshops, { eq }) => eq(workshops.id, workshopId),
  });

  if (!workshop || workshop.userId !== userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get workshop step record
  const workshopStep = await db.query.workshopSteps.findFirst({
    where: (steps, { and, eq }) =>
      and(eq(steps.workshopId, workshopId), eq(steps.stepId, stepId)),
  });

  if (!workshopStep) {
    return Response.json({ error: 'Step not found' }, { status: 404 });
  }

  // Update or insert artifact with canvas items
  const existingArtifact = await db.query.stepArtifacts.findFirst({
    where: eq(stepArtifacts.workshopStepId, workshopStep.id),
  });

  if (existingArtifact) {
    // Update existing artifact
    await db.update(stepArtifacts)
      .set({
        artifact: {
          ...existingArtifact.artifact,
          canvasItems: items, // Merge canvas items into artifact
        },
        version: existingArtifact.version + 1, // Optimistic locking
      })
      .where(eq(stepArtifacts.id, existingArtifact.id));
  } else {
    // Create new artifact
    await db.insert(stepArtifacts).values({
      workshopStepId: workshopStep.id,
      stepId: stepId,
      artifact: { canvasItems: items },
    });
  }

  return Response.json({ success: true });
}
```

**Alternative Considered: Separate canvasItems table**
- REJECTED: Canvas items are tightly coupled to step outputs (not independent entities)
- REJECTED: Adds query complexity (join canvasItems with stepArtifacts for context)
- REJECTED: jsonb already handles arrays efficiently in Postgres

**Alternative Considered: Real-time sync (WebSockets)**
- DEFERRED to FFP: Not needed for single-user MVP/MMP
- Multiplayer canvas requires conflict resolution (CRDT or Operational Transform)
- Auto-save with debounce is sufficient for v1.1

---

### 5. Canvas Component Library

**Recommendation:** Build custom canvas components using HTML/CSS positioning (NOT react-konva or tldraw for v1.1).

**Rationale:**
- Step 2 and 4 canvases are SIMPLE: fixed layout (rings/quadrants), drag-and-drop post-its
- react-konva adds 200KB+ bundle size for features we don't need (freehand drawing, complex shapes)
- tldraw is overkill (infinite canvas, collaboration, undo/redo) for constrained layouts
- HTML drag-and-drop API + CSS Grid/Flexbox is sufficient and performant

**Canvas Library Decision Matrix:**

| Library | Bundle Size | Complexity | Fit for v1.1 |
|---------|-------------|------------|--------------|
| **HTML/CSS (native)** | 0 KB | Low | RECOMMENDED |
| **dnd-kit** | ~20 KB | Medium | Considered for R2 |
| **react-konva** | 200 KB+ | High | Overkill |
| **tldraw** | 500 KB+ | Very High | FFP only |

**Implementation: BaseCanvas (Shared Infrastructure)**
```typescript
// src/components/canvas/base-canvas.tsx (NEW)

'use client';

import * as React from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import { cn } from '@/lib/utils';

interface BaseCanvasProps {
  children: React.ReactNode;
  className?: string;
  onItemDrop?: (itemId: string, position: { x: number; y: number }) => void;
}

export function BaseCanvas({ children, className, onItemDrop }: BaseCanvasProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItemId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onItemDrop?.(draggedItemId, { x, y });
    setDraggedItemId(null);
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        'relative h-full w-full overflow-hidden bg-background',
        className
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            // Inject drag handlers to children
            onDragStart: (id: string) => setDraggedItemId(id),
          } as any);
        }
        return child;
      })}
    </div>
  );
}

// Shared CanvasItem component (post-it note)
interface CanvasItemProps {
  id: string;
  content: string;
  position: { x: number; y: number };
  color?: string;
  onDragStart?: (id: string) => void;
  onClick?: () => void;
}

export function CanvasItemPostIt({
  id,
  content,
  position,
  color = 'yellow',
  onDragStart,
  onClick,
}: CanvasItemProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(id)}
      onClick={onClick}
      className={cn(
        'absolute cursor-move rounded-sm p-3 shadow-md',
        'hover:shadow-lg transition-shadow',
        'text-sm font-medium',
        color === 'yellow' && 'bg-yellow-100 dark:bg-yellow-900',
        color === 'blue' && 'bg-blue-100 dark:bg-blue-900',
        color === 'green' && 'bg-green-100 dark:bg-green-900',
        color === 'red' && 'bg-red-100 dark:bg-red-900',
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: '120px',
        maxWidth: '200px',
      }}
    >
      {content}
    </div>
  );
}
```

**Implementation: StakeholderCanvas (Step 2)**
```typescript
// src/components/canvas/stakeholder-canvas.tsx (NEW)

'use client';

import * as React from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import { BaseCanvas, CanvasItemPostIt } from './base-canvas';

export function StakeholderCanvas() {
  const { items, updateItem } = useCanvasStore();

  const handleItemDrop = (itemId: string, position: { x: number; y: number }) => {
    // Determine which ring based on distance from center
    const centerX = 400; // Assuming 800px canvas
    const centerY = 400;
    const distance = Math.sqrt(
      Math.pow(position.x - centerX, 2) + Math.pow(position.y - centerY, 2)
    );

    let ring: 'inner' | 'middle' | 'outer';
    if (distance < 150) ring = 'inner';
    else if (distance < 250) ring = 'middle';
    else ring = 'outer';

    updateItem(itemId, {
      position,
      metadata: { ...items.find(i => i.id === itemId)?.metadata, ring },
    });
  };

  return (
    <BaseCanvas onItemDrop={handleItemDrop}>
      {/* Bullseye background */}
      <svg className="absolute inset-0 pointer-events-none">
        <circle cx="400" cy="400" r="150" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="400" cy="400" r="250" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="400" cy="400" r="350" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="400" y="50" textAnchor="middle" className="text-sm font-medium">
          Stakeholder Map
        </text>
        <text x="400" y="420" textAnchor="middle" className="text-xs text-muted-foreground">
          Inner: Core
        </text>
        <text x="400" y="320" textAnchor="middle" className="text-xs text-muted-foreground">
          Middle: Direct
        </text>
        <text x="400" y="220" textAnchor="middle" className="text-xs text-muted-foreground">
          Outer: Indirect
        </text>
      </svg>

      {/* Render stakeholder post-its */}
      {items.map((item) => (
        <CanvasItemPostIt
          key={item.id}
          id={item.id}
          content={item.content}
          position={item.position}
          color={
            item.metadata.ring === 'inner' ? 'red' :
            item.metadata.ring === 'middle' ? 'yellow' :
            'blue'
          }
        />
      ))}
    </BaseCanvas>
  );
}
```

**Implementation: ResearchThemeCanvas (Step 4)**
```typescript
// src/components/canvas/research-theme-canvas.tsx (NEW)

'use client';

import * as React from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import { BaseCanvas, CanvasItemPostIt } from './base-canvas';

const QUADRANTS = {
  said: { x: 0, y: 0, width: 400, height: 400, label: 'What They Said' },
  thought: { x: 400, y: 0, width: 400, height: 400, label: 'What They Thought' },
  felt: { x: 0, y: 400, width: 400, height: 400, label: 'What They Felt' },
  experienced: { x: 400, y: 400, width: 400, height: 400, label: 'What They Experienced' },
};

export function ResearchThemeCanvas() {
  const { items, updateItem } = useCanvasStore();

  const handleItemDrop = (itemId: string, position: { x: number; y: number }) => {
    // Determine quadrant based on position
    let quadrant: keyof typeof QUADRANTS;
    if (position.x < 400 && position.y < 400) quadrant = 'said';
    else if (position.x >= 400 && position.y < 400) quadrant = 'thought';
    else if (position.x < 400 && position.y >= 400) quadrant = 'felt';
    else quadrant = 'experienced';

    updateItem(itemId, {
      position,
      metadata: { ...items.find(i => i.id === itemId)?.metadata, quadrant },
    });
  };

  return (
    <BaseCanvas onItemDrop={handleItemDrop}>
      {/* Empathy map quadrants */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-border">
        {Object.entries(QUADRANTS).map(([key, { label }]) => (
          <div
            key={key}
            className="bg-background p-4 flex items-start justify-center"
          >
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Render theme post-its */}
      {items.map((item) => (
        <CanvasItemPostIt
          key={item.id}
          id={item.id}
          content={item.content}
          position={item.position}
          color={item.metadata.type === 'pain' ? 'red' : 'green'}
        />
      ))}
    </BaseCanvas>
  );
}
```

**Trade-offs:**
- PRO: Zero bundle bloat, full control over rendering
- PRO: Performant (native browser drag-and-drop)
- PRO: Easier to style with Tailwind (consistent with app)
- CON: Manual implementation of drag constraints and snap-to-grid
- CON: No built-in undo/redo (defer to future)
- CON: Touch interactions need custom implementation

---

## Recommended Project Structure

```
src/
├── components/
│   ├── canvas/                    # NEW: Canvas infrastructure
│   │   ├── base-canvas.tsx        # Shared drag/drop, item rendering
│   │   ├── canvas-panel.tsx       # Wrapper for step-specific canvases
│   │   ├── stakeholder-canvas.tsx # Step 2: Bullseye chart
│   │   └── research-theme-canvas.tsx # Step 4: Empathy map
│   └── workshop/
│       ├── step-container.tsx     # MODIFIED: Conditional canvas rendering
│       ├── chat-panel.tsx         # UNCHANGED
│       └── output-panel.tsx       # UNCHANGED
├── stores/
│   ├── canvas.store.ts            # NEW: Canvas state management
│   ├── workshop.store.ts          # EXISTING (workshop-level state)
│   └── chat.store.ts              # EXISTING (if using client-side chat state)
├── hooks/
│   ├── use-canvas-autosave.ts     # NEW: Debounced canvas persistence
│   ├── use-auto-save.ts           # EXISTING (message auto-save)
│   └── use-local-storage.ts       # EXISTING
├── lib/
│   └── ai/
│       └── context-assembly.ts    # MODIFIED: Include canvas context
├── app/
│   └── api/
│       └── canvas/
│           └── sync/
│               └── route.ts       # NEW: Canvas persistence API
└── db/
    └── schema/
        └── step-artifacts.ts      # EXISTING (no schema change needed)
```

### Structure Rationale

- **components/canvas/:** Isolated canvas components, no coupling to workshop logic
- **stores/canvas.store.ts:** Separate domain (canvas) from workshop/chat stores (separation of concerns)
- **hooks/use-canvas-autosave.ts:** Reusable hook pattern (consistent with use-auto-save.ts)
- **api/canvas/sync/:** Dedicated API route for canvas persistence (RESTful pattern)

---

## Architectural Patterns

### Pattern 1: Conditional Rendering Based on Step Metadata

**What:** StepContainer dynamically renders CanvasPanel or OutputPanel based on step configuration.

**When to use:** Features that apply only to specific steps (e.g., canvas for Steps 2 and 4, not 1, 3, 5-10).

**Trade-offs:**
- PRO: Single StepContainer handles all steps (no code duplication)
- PRO: Easy to add canvas to new steps (add step number to canvasSteps array)
- CON: StepContainer grows more complex (consider extracting to hook: useStepFeatures)

**Example:**
```typescript
// src/hooks/use-step-features.ts (FUTURE REFACTOR)

export function useStepFeatures(stepOrder: number) {
  const CANVAS_STEPS = [2, 4];
  const SUBSTEP_STEPS = [8]; // Ideation has sub-steps

  return {
    hasCanvas: CANVAS_STEPS.includes(stepOrder),
    hasSubSteps: SUBSTEP_STEPS.includes(stepOrder),
    hasCustomNavigation: stepOrder === 10, // Summary has custom nav
  };
}
```

---

### Pattern 2: Zustand Store Per Domain

**What:** Separate Zustand stores for independent domains (canvas, chat, workshop).

**When to use:** State that doesn't need to be globally accessible and has distinct lifecycles.

**Trade-offs:**
- PRO: Prevents coupling (canvas changes don't trigger chat re-renders)
- PRO: Easier to test (mock individual stores)
- PRO: Performance (selective subscriptions with selectors)
- CON: More boilerplate (multiple store files)

**Example:**
```typescript
// Component subscribes only to needed state
const items = useCanvasStore((state) => state.items); // Re-renders on items change only
const addItem = useCanvasStore((state) => state.addItem); // Stable reference
```

---

### Pattern 3: Debounced Auto-Save with Max Wait

**What:** Auto-save canvas changes after 2s of inactivity, but force save after 10s even if user is actively editing.

**When to use:** High-frequency state changes (drag interactions) that need persistence but shouldn't overwhelm server.

**Trade-offs:**
- PRO: Reduces server load (batches writes)
- PRO: Better UX (no blocking saves)
- PRO: Data safety (maxWait ensures writes even during long sessions)
- CON: Slight lag before AI sees canvas changes (2-10s)

**Example:**
```typescript
// use-debounce library (already in dependencies)
const debouncedSync = useDebouncedCallback(syncToServer, 2000, { maxWait: 10000 });
```

---

### Pattern 4: Canvas State as Projection of Artifacts

**What:** Canvas items are derived from stepArtifacts.artifact.canvasItems, not independent state.

**When to use:** UI components that visualize structured data (canvas, charts, diagrams).

**Trade-offs:**
- PRO: Single source of truth (stepArtifacts table)
- PRO: Canvas state survives component unmounts
- PRO: AI and canvas stay in sync (both read from artifacts)
- CON: Requires server round-trip to load canvas on step entry

**Example:**
```typescript
// On step load
useEffect(() => {
  if (artifact?.canvasItems) {
    canvasStore.loadItems(artifact.canvasItems);
  }
}, [artifact]);
```

---

## Data Flow

### Request Flow: User Adds Canvas Item

```
1. User clicks AI suggestion "Add stakeholder: Department Head"
2. ChatPanel sends message to AI API
3. AI responds: "Added Department Head to stakeholders"
4. AI triggers structured output extraction (POST /api/extract)
5. Extractor adds to artifact.canvasItems with default position
6. Database updates stepArtifacts table
7. React Query refetches artifact (or optimistic update)
8. canvasStore.loadItems(artifact.canvasItems)
9. StakeholderCanvas re-renders with new item
```

### State Flow: User Drags Canvas Item

```
1. User drags "Department Head" from outer ring to inner ring
2. BaseCanvas.onDrop calculates new position and ring
3. canvasStore.updateItem(itemId, { position, metadata: { ring: 'inner' } })
4. useCanvasAutoSave hook detects change, starts 2s debounce
5. After 2s (or 10s maxWait), POST /api/canvas/sync
6. Server updates stepArtifacts.artifact.canvasItems
7. Next AI request includes updated canvas in context:
   "Current canvas state: Department Head moved to inner ring (Core)"
8. AI uses context for next suggestion
```

### Bidirectional Sync Flow

```
AI Conversation State                Canvas State                 Database State
─────────────────────               ─────────────────            ─────────────────

User: "Add CEO"
     ↓
AI: "Added CEO"
     ↓
Extraction triggered
     ↓                              ↓                            ↓
artifact.canvasItems += CEO  →  loadItems([..., CEO])  →  stepArtifacts.artifact
     ↓                              ↓
                                Canvas renders CEO
                                     ↓
                          User drags CEO to inner ring
                                     ↓
                          canvasStore.updateItem(CEO)
                                     ↓                            ↓
                          Auto-save (debounced)         →  stepArtifacts.artifact
                                                                  ↓
User: "What's on the canvas?"
     ↓                                                            ↓
AI context includes canvas  ←  Context assembly reads artifact
     ↓
AI: "CEO is in inner ring"
```

---

## Build Order (Dependency Graph)

### Phase 1: Foundation (Canvas Infrastructure)

**Goal:** Build shared canvas components and state management before step-specific implementations.

```
1. canvasStore (Zustand)
   └─> Canvas state management (items, add/update/remove)
   └─> Persistence actions (syncToServer)

2. BaseCanvas component
   └─> Drag-and-drop infrastructure
   └─> CanvasItemPostIt (shared post-it component)

3. CanvasPanel wrapper
   └─> Conditionally renders step-specific canvas
   └─> Connects to canvasStore

4. API route: /api/canvas/sync
   └─> Persist canvas items to stepArtifacts
   └─> Authentication and ownership checks

5. useCanvasAutoSave hook
   └─> Debounced persistence
   └─> Depends on canvasStore and API route
```

**Dependencies:** canvasStore → BaseCanvas → CanvasPanel → API route → useCanvasAutoSave

**Estimated effort:** 2-3 plans

---

### Phase 2: Step Container Integration

**Goal:** Modify existing StepContainer to conditionally render canvas.

```
6. StepContainer modification
   └─> Add renderRightPanel() logic
   └─> Detect canvas-enabled steps
   └─> Conditional rendering: CanvasPanel vs OutputPanel
   └─> Load initial canvas items from artifact

7. Context assembly modification
   └─> Include canvas state in AI context
   └─> Format canvas items for AI readability
   └─> Add to assembleStepContext function
```

**Dependencies:** CanvasPanel must exist before StepContainer integration.

**Estimated effort:** 1 plan

---

### Phase 3: Step-Specific Canvas Implementations

**Goal:** Build Step 2 (Stakeholder) and Step 4 (Research) canvas components.

```
8. StakeholderCanvas (Step 2)
   └─> Bullseye ring layout (SVG circles)
   └─> Ring detection on drop
   └─> Metadata: { ring: 'inner' | 'middle' | 'outer' }

9. ResearchThemeCanvas (Step 4)
   └─> Empathy map quadrants (CSS Grid)
   └─> Quadrant detection on drop
   └─> Metadata: { quadrant: 'said' | 'thought' | 'felt' | 'experienced' }

10. Step-specific artifact schemas
    └─> Update Zod schemas for Step 2 and 4
    └─> Add canvasItems to extraction logic
    └─> Validate canvas data structure
```

**Dependencies:** Phase 1 and 2 must be complete. Steps 8 and 9 can be built in parallel.

**Estimated effort:** 2-3 plans (1 per step + schema updates)

---

### Phase 4: AI Integration & Testing

**Goal:** Ensure AI suggestions populate canvas and canvas state flows to AI context.

```
11. Step 2 AI prompts
    └─> Generate stakeholder suggestions with ring assignment
    └─> Reference canvas state in responses
    └─> Test extraction with canvasItems

12. Step 4 AI prompts
    └─> Generate theme suggestions with quadrant assignment
    └─> Reference canvas state in responses
    └─> Test extraction with canvasItems

13. End-to-end testing
    └─> Add stakeholder via chat → appears on canvas
    └─> Drag stakeholder → AI reads new position
    └─> Navigate away and return → canvas persists
```

**Dependencies:** All prior phases complete.

**Estimated effort:** 2-3 plans (testing and refinement)

---

### Total Estimated Effort: 8-12 plans across 4 phases

**Critical path:** Foundation → Integration → Implementation → Testing (sequential)

**Parallel work opportunities:**
- StakeholderCanvas and ResearchThemeCanvas can be built simultaneously (Phase 3)
- AI prompt updates can start during Phase 3 (while canvas components are being built)

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-100 users (v1.1 MVP)** | Current architecture is sufficient. HTML drag-and-drop, debounced auto-save, jsonb storage. |
| **100-1k users (MMP)** | Consider dnd-kit for better touch support and accessibility. Add canvas state caching (React Query) to reduce DB reads. |
| **1k-10k users (FFP)** | Real-time collaboration (WebSockets + Yjs CRDT). Separate canvasItems table for query performance. Canvas state compression (store deltas, not full snapshots). |

### Scaling Priorities

1. **First bottleneck: Canvas auto-save frequency**
   - **Symptom:** Too many DB writes on active drag sessions
   - **Fix:** Increase debounce to 5s, implement client-side dirty flag, only sync on actual changes

2. **Second bottleneck: Canvas rendering performance**
   - **Symptom:** Lag when dragging items with 50+ post-its
   - **Fix:** Virtualize off-screen items (render-as-you-scroll), use CSS transforms for drag (GPU acceleration)

3. **Third bottleneck: Real-time sync latency**
   - **Symptom:** Multiplayer users see stale canvas state
   - **Fix:** Migrate to WebSocket-based sync (Pusher/Ably), implement Yjs CRDT for conflict-free merging

---

## Anti-Patterns

### Anti-Pattern 1: Canvas as Independent Data Source

**What people do:** Store canvas state only in Zustand, sync to separate canvasItems table, treat as distinct from conversation artifacts.

**Why it's wrong:**
- Canvas state becomes orphaned from AI context (loses "conversation is source of truth" principle)
- Difficult to regenerate canvas from conversation history
- Creates two sources of truth (canvasItems vs stepArtifacts)

**Do this instead:** Store canvas items IN stepArtifacts.artifact.canvasItems as part of structured output. Canvas is a projection of artifacts, not independent state.

---

### Anti-Pattern 2: Real-Time Canvas Sync in MVP

**What people do:** Implement WebSockets or polling for instant canvas updates before multiplayer is needed.

**Why it's wrong:**
- Premature complexity (v1.1 is single-user)
- Debounced auto-save is sufficient for single-user experience
- WebSockets require infrastructure (connection management, reconnection, heartbeats)

**Do this instead:** Use debounced auto-save (2-10s). User navigates away → canvas syncs. Returns → loads from DB. No real-time sync until FFP (multiplayer).

---

### Anti-Pattern 3: Complex Canvas Library for Simple Layouts

**What people do:** Import react-konva or tldraw for fixed-layout canvases (bullseye, quadrants).

**Why it's wrong:**
- Bullseye and empathy map are FIXED layouts (not infinite canvas)
- 200-500KB bundle bloat for features we don't use
- Harder to style (canvas-based rendering vs HTML/CSS)

**Do this instead:** HTML/CSS with native drag-and-drop API. Sufficient for v1.1. Consider dnd-kit for R2 (accessibility + touch).

---

### Anti-Pattern 4: Immediate AI Reaction to Canvas Changes

**What people do:** Trigger AI message on every canvas drag event.

**Why it's wrong:**
- Excessive AI API calls (every drag = 1 request)
- Conversation polluted with "CEO moved to inner ring" messages
- Degrades UX (AI responds to every micro-action)

**Do this instead:** Canvas changes are SILENT (auto-save to DB). AI reads canvas state from context in NEXT user message. Canvas is read-only context for AI, not trigger.

---

## Integration Points

### External Services

| Service | Integration Pattern | Canvas-Specific Notes |
|---------|---------------------|----------------------|
| **Neon Postgres** | stepArtifacts.artifact JSONB | Canvas items stored as artifact.canvasItems array. No schema migration needed. |
| **Gemini API** | Context assembly includes canvas state | Formatted canvas items injected into AI context (see formatCanvasForAI function). |
| **Clerk Auth** | Ownership verification on canvas sync | /api/canvas/sync checks userId matches workshop.userId before persisting. |

### Internal Boundaries

| Boundary | Communication | Canvas-Specific Notes |
|----------|---------------|----------------------|
| **ChatPanel ↔ CanvasPanel** | Indirect via stepArtifacts | Chat extracts artifact → DB → Canvas loads from artifact. No direct component communication. |
| **StepContainer ↔ CanvasPanel** | Props (artifact, workshopId, stepId) | StepContainer passes initial data, CanvasPanel manages own state via canvasStore. |
| **canvasStore ↔ Database** | API route /api/canvas/sync | Auto-save hook calls syncToServer, which POSTs to API route. |
| **AI Context Assembly ↔ canvasStore** | Read-only via stepArtifacts | Context assembly reads artifact.canvasItems from DB, not from Zustand store (server-side). |

---

## Responsive Considerations

### Mobile Layout (< 768px)

**Current:** StepContainer stacks Chat and Output vertically (no resizable panels).

**Target:** Stack Chat and Canvas vertically, with Canvas panel scrollable.

**Implementation:**
```typescript
// Mobile: stacked layout (EXISTING PATTERN in step-container.tsx)
if (isMobile) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 border-b">{renderContent()}</div>
      <div className="min-h-0 flex-1">{renderRightPanel()}</div>
      <StepNavigation {...navProps} />
    </div>
  );
}
```

**Canvas-specific mobile adjustments:**
- Disable drag-and-drop on touch (use tap-to-move or picker UI)
- Larger post-it touch targets (48px minimum)
- Simplify bullseye rings (2 rings instead of 3 on small screens)

---

## Sources

### Canvas Libraries & Patterns (HIGH confidence)
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- [tldraw: Infinite Canvas SDK for React](https://tldraw.dev/)
- [GitHub: tldraw/nextjs-template](https://github.com/tldraw/nextjs-template)
- [React-Konva Free Drawing Documentation](https://konvajs.org/docs/react/Free_Drawing.html)
- [react-resizable-panels Documentation](https://react-resizable-panels.vercel.app/)

### State Management & Sync (HIGH confidence)
- [Top 5 React State Management Tools Developers Actually Use in 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
- [Sync State Across Tabs: Using Broadcast Channel in a React App](https://bits2bytes.hashnode.dev/sync-state-across-multiple-tabs-easily-build-a-fun-canvas-drawing-app-in-react)
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)

### Next.js Architecture (HIGH confidence)
- [React & Next.js in 2025 - Modern Best Practices](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
- [Next.js Best Practices in 2025: Performance & Architecture](https://www.raftlabs.com/blog/building-with-next-js-best-practices-and-benefits-for-performance-first-teams/)

### Database Persistence (MEDIUM confidence)
- [PostgreSQL JSON Tutorial](https://neon.com/postgresql/postgresql-tutorial/postgresql-json)
- [Everything You Need to Know About the Postgres JSONB Data Type](https://www.dbvis.com/thetable/everything-you-need-to-know-about-the-postgres-jsonb-data-type/)

---

## Implementation Readiness

**Ready to implement:**
- Canvas state management (Zustand store pattern is proven)
- Layout modification (react-resizable-panels already in use)
- Data persistence (stepArtifacts table supports JSONB)
- BaseCanvas component (HTML drag-and-drop API is well-documented)

**Needs experimentation:**
- Mobile drag-and-drop UX (may need fallback to tap-to-select)
- Canvas item density thresholds (how many post-its before performance degrades)
- Optimal auto-save timing (2s debounce may feel laggy for some interactions)

**Defer to post-v1.1:**
- Real-time multiplayer sync (requires WebSockets + CRDT)
- Advanced canvas features (zoom, pan, undo/redo)
- Canvas export (PNG download, PDF generation)

---

**Last updated:** 2026-02-10
**Confidence:** HIGH overall, MEDIUM on mobile touch interactions

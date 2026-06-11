---
phase: 25-ezydraw-foundation
plan: 02
subsystem: ezydraw-ui-shell
tags: [ui-components, konva-integration, lazy-loading, keyboard-shortcuts]
dependency_graph:
  requires:
    - Drawing data layer (25-01): DrawingStore, DrawingStoreProvider, types
  provides:
    - EzyDrawLoader (SSR-safe entry point for consumers)
    - EzyDrawModal (fullscreen dialog container)
    - EzyDrawToolbar (tool buttons, color/width controls, undo/redo/clear/save/cancel)
    - EzyDrawStage (Konva Stage + Layer setup with refs)
  affects:
    - Plans 03-05 will implement drawing tool logic inside this UI shell
tech_stack:
  added: []
  patterns:
    - next/dynamic lazy loading with ssr:false for client-only libraries
    - react-hotkeys-hook for keyboard shortcuts (mod+z, tool hotkeys)
    - forwardRef + useImperativeHandle for Stage ref exposure
    - shadcn/ui Dialog with fullscreen override
key_files:
  created:
    - src/components/ezydraw/toolbar.tsx (Tool buttons + keyboard shortcuts)
    - src/components/ezydraw/ezydraw-stage.tsx (Konva Stage wrapper)
    - src/components/ezydraw/ezydraw-modal.tsx (Fullscreen dialog container)
    - src/components/ezydraw/ezydraw-loader.tsx (SSR-safe lazy loader)
  modified: []
decisions:
  - Use shadcn Dialog with showCloseButton=false (toolbar has Cancel button)
  - Toolbar height: 48px (fixed), Stage fills remaining viewport height
  - Touch prevention: touchAction:none + onTouchMove preventDefault
  - Stage ref forwarded via forwardRef for PNG export (plan 06 requirement)
  - Stroke width presets: 1px (thin), 2px (medium), 4px (thick)
  - Keyboard shortcuts: mod+z/shift+z for undo/redo, single letters for tools
metrics:
  duration: 112s
  tasks_completed: 2
  files_created: 4
  files_modified: 0
  commits: 2
  completed_at: 2026-02-12
---

# Phase 25 Plan 02: EzyDraw UI Shell Summary

**One-liner:** Fullscreen modal with Konva Stage, toolbar with 9 tool buttons + keyboard shortcuts + undo/redo/clear/save/cancel, and SSR-safe lazy loading via next/dynamic.

## What Was Built

Created the complete visual shell for EzyDraw. Users can now open a fullscreen drawing canvas, see all tool buttons, use keyboard shortcuts, and interact with undo/redo/clear/save/cancel controls. The actual drawing tool logic (pencil strokes, shape creation, etc.) will be added in plans 03-05.

### Task 1: Create EzyDraw Toolbar and Stage Components

**Commit:** 6c60235

**src/components/ezydraw/toolbar.tsx:**

1. **Tool buttons (9 total):**
   - Drawing tools: pencil, rectangle, circle, diamond, arrow, line, text, eraser
   - Interaction tool: select
   - Each button 32x32px, active tool highlighted with bg-blue-100 + ring-1 ring-blue-300
   - Uses `setActiveTool` from DrawingStore on click

2. **Keyboard shortcuts (via react-hotkeys-hook):**
   - `mod+z` → undo
   - `mod+shift+z` → redo
   - `v` → select tool
   - `p` → pencil
   - `r` → rectangle
   - `c` → circle
   - `d` → diamond
   - `a` → arrow
   - `l` → line
   - `t` → text
   - `e` → eraser

3. **Style options (center section):**
   - Stroke color: color swatch button with hidden `<input type="color">` behind it
   - Stroke width: 3 preset buttons (thin=1px, medium=2px, thick=4px)
   - Fill color: same pattern as stroke, with checkered background for transparent

4. **Action buttons (right section):**
   - Undo (disabled when !canUndo)
   - Redo (disabled when !canRedo)
   - Clear All (with confirmation dialog: "Clear entire drawing? This cannot be undone.")
   - Cancel (calls onCancel prop)
   - Save (calls onSave prop)

5. **Layout:**
   - Fixed to top of modal, z-10, bg-white/95 backdrop-blur, h-12
   - Three sections: tools (left), options (center), actions (right)
   - Dividers between sections for visual separation

**src/components/ezydraw/ezydraw-stage.tsx:**

1. **Konva Stage setup:**
   - Dimensions: `window.innerWidth` x `(window.innerHeight - 48)` (48px for toolbar)
   - Window resize listener updates dimensions on resize
   - Background: white (#ffffff)

2. **Two Konva Layers:**
   - **Drawing Layer** (ref=drawingLayerRef): Where all elements render. Currently has placeholder text "Draw here" centered. Elements will be rendered by tool components in plans 03-05.
   - **UI Layer** (ref=uiLayerRef): For selection transformer (plan 05).

3. **Memory cleanup:**
   - useEffect cleanup calls `stageRef.current?.destroy()` on unmount
   - CRITICAL for Safari iOS — HTML5 canvas contexts don't auto-release

4. **Touch prevention:**
   - Wrapper div has `style={{ touchAction: 'none' }}`
   - `onTouchMove={(e) => e.preventDefault()}` blocks scroll interference

5. **Stage ref forwarding:**
   - Uses `forwardRef` + `useImperativeHandle`
   - Exposes `getStage()` and `toDataURL(config)` methods
   - Enables PNG export in parent modal (plan 06 requirement)

**Verification:**
- ✅ TypeScript compilation passed (zero errors)
- ✅ Toolbar has 9 tool buttons with setActiveTool calls
- ✅ Keyboard shortcuts implemented via react-hotkeys-hook
- ✅ Stage creates 2 layers with refs
- ✅ Stage cleanup calls destroy() on unmount
- ✅ touch-action:none prevents scroll interference

### Task 2: Create EzyDraw Modal and Lazy-Load Wrapper

**Commit:** 961959c

**src/components/ezydraw/ezydraw-modal.tsx:**

1. **Fullscreen dialog:**
   - Uses shadcn Dialog component with custom className overrides
   - `max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 rounded-none border-0 gap-0`
   - Goes truly fullscreen, covering entire viewport

2. **Dialog configuration:**
   - `showCloseButton={false}` — toolbar already has Cancel button
   - Hidden DialogTitle: `<DialogTitle className="sr-only">` for accessibility
   - `onOpenChange` handler calls onClose when user tries to close

3. **DrawingStoreProvider integration:**
   - Wraps modal content to provide isolated store instance
   - Accepts `initialElements` prop for loading saved drawings
   - Passes initialElements to DrawingStoreProvider as `{ elements: initialElements }`

4. **Layout:**
   - `flex flex-col h-full`
   - EzyDrawToolbar at top (h-12)
   - EzyDrawStage fills remaining space (flex-1)

5. **Save/Cancel handlers:**
   - **onSave:** Calls `stageRef.current?.toDataURL({ pixelRatio: 2 })`, passes dataURL to onSave prop, then closes
   - **onCancel:** Calls onClose directly (no save)

6. **Props:**
   - `isOpen: boolean` — controls Dialog open state
   - `onClose: () => void` — called when user cancels or after save
   - `onSave: (dataURL: string) => void` — receives PNG dataURL
   - `initialElements?: DrawingElement[]` — for loading saved drawings

**src/components/ezydraw/ezydraw-loader.tsx:**

1. **SSR-safe lazy loading:**
   - Uses `next/dynamic` with `ssr: false`
   - Ensures konva + react-konva + perfect-freehand only load when user opens EzyDraw
   - Keeps ~470KB of drawing libraries out of initial page bundle

2. **Loading fallback:**
   - Fullscreen overlay with bg-black/50
   - Centered white card with spinner + "Loading drawing tools..." text
   - Shows while dynamic import loads

3. **Export pattern:**
   - Consumers import `EzyDrawLoader`, NOT `EzyDrawModal` directly
   - EzyDrawLoader forwards all props to dynamically loaded EzyDrawModal

**Verification:**
- ✅ TypeScript compilation passed (zero errors)
- ✅ EzyDrawLoader uses `ssr: false` for lazy loading
- ✅ EzyDrawModal uses Dialog from shadcn/ui
- ✅ DrawingStoreProvider wraps modal content
- ✅ Stage ref captured for PNG export

## Deviations from Plan

None - plan executed exactly as written.

## Key Design Decisions

1. **Fullscreen modal override:** Plan specified `max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 rounded-none border-0 gap-0` to override shadcn Dialog's default centered layout. This makes EzyDraw truly fullscreen.

2. **showCloseButton=false:** Discovered DialogContent has a `showCloseButton` prop (from reading dialog.tsx). Used this instead of CSS hiding. Toolbar already has Cancel button, so dialog's close button is redundant.

3. **Stroke width presets:** Chose 1px (thin), 2px (medium), 4px (thick) as sensible defaults. Can be adjusted later if needed.

4. **Clear confirmation:** Plan specified `window.confirm()` for clear confirmation. Simple and effective — no custom modal needed.

5. **Touch prevention strategy:** Combined `touchAction: 'none'` CSS with `onTouchMove preventDefault()` JS handler for maximum compatibility across devices.

6. **Stage ref pattern:** Used forwardRef + useImperativeHandle instead of direct ref exposure. This provides a clean API: `getStage()` and `toDataURL()` methods instead of raw Konva.Stage ref.

## Dependencies & Integration Points

**Requires from 25-01:**
- DrawingStore types and actions (useDrawingStore hook)
- DrawingStoreProvider (wraps modal)
- DrawingElement types (for initialElements prop)

**Provides to downstream plans:**
- EzyDrawLoader: SSR-safe entry point for consumers (e.g., Step 8 Crazy 8s grid)
- EzyDrawModal: Container with save/cancel flow
- EzyDrawToolbar: Tool selection UI (tools themselves implemented in plans 03-05)
- EzyDrawStage: Konva Stage with refs for element rendering

**Plans 03-05 will:**
- Add pointer event handlers to Stage (mousedown, mousemove, mouseup, touchstart, touchmove, touchend)
- Implement tool-specific drawing logic (pencil strokes, shape creation)
- Render DrawingElement arrays in the Drawing Layer
- Connect store actions to canvas interactions

**No blockers:** All verification passed, no auth gates, no architectural issues discovered.

## Verification Results

All plan verification criteria passed:

1. ✅ `npx tsc --noEmit` - Zero TypeScript errors
2. ✅ EzyDrawLoader uses `next/dynamic` with `ssr: false`
3. ✅ EzyDrawModal wraps content in DrawingStoreProvider
4. ✅ Toolbar has 9 tool buttons + undo/redo/clear/save/cancel
5. ✅ Stage creates 2 Konva layers with refs
6. ✅ Stage cleanup calls `destroy()` on unmount
7. ✅ `touch-action:none` prevents scroll interference

**Additional checks:**
- ✅ Keyboard shortcuts implemented (4 useHotkeys calls in toolbar)
- ✅ Dialog configured with showCloseButton=false
- ✅ Stage ref forwarded for PNG export

## Self-Check: PASSED

**Files created:**
- ✅ /Users/michaelchristie/devProjects/workshoppilot.ai/src/components/ezydraw/toolbar.tsx
- ✅ /Users/michaelchristie/devProjects/workshoppilot.ai/src/components/ezydraw/ezydraw-stage.tsx
- ✅ /Users/michaelchristie/devProjects/workshoppilot.ai/src/components/ezydraw/ezydraw-modal.tsx
- ✅ /Users/michaelchristie/devProjects/workshoppilot.ai/src/components/ezydraw/ezydraw-loader.tsx

**Commits:**
- ✅ 6c60235: feat(25-02) create toolbar and stage
- ✅ 961959c: feat(25-02) create modal and lazy-loader

All files exist, all commits present, TypeScript compiles cleanly.

## Next Steps

Phase 25 Plan 03 will implement the core drawing tools:
- Pencil tool with perfect-freehand stroke smoothing
- Rectangle, circle, diamond shape tools
- Arrow and line tools with multi-point support
- Text tool with inline editing
- Eraser tool

These tools will plug into the UI shell created in this plan, using the pointer event handlers and element rendering systems also added in plan 03.

The visual shell is now complete and ready for tool implementation.

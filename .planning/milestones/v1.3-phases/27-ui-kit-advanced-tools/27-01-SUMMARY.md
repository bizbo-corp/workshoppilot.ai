---
phase: 27-ui-kit-advanced-tools
plan: 01
subsystem: drawing
tags:
  - ui-kit
  - types
  - palette
  - dependencies
dependency-graph:
  requires:
    - Phase 26 drawing system
    - Phase 25 EzyDraw foundation
  provides:
    - UI kit component factories (10 wireframe components)
    - Extended drawing type system (groupId, SpeechBubbleElement, EmojiElement)
    - Palette sidebar UI (categorized, searchable)
    - dnd-kit and emoji-mart dependencies
  affects:
    - Phase 27-02 (drag-and-drop integration needs these factories)
    - Phase 27-03 (speech bubble and emoji tools need new element types)
tech-stack:
  added:
    - "@dnd-kit/core@6.3.1"
    - "@dnd-kit/utilities@3.2.2"
    - "@emoji-mart/data@1.2.1"
    - "@emoji-mart/react@1.1.1"
  patterns:
    - Factory pattern for compound UI components
    - Discriminated union types for drawing elements
    - Draggable components with @dnd-kit/core
key-files:
  created:
    - src/lib/drawing/ui-kit-components.ts
    - src/components/ezydraw/palette/ui-kit-palette.tsx
    - src/components/ezydraw/palette/palette-item.tsx
  modified:
    - src/lib/drawing/types.ts
    - package.json
    - package-lock.json
decisions:
  - "Used groupId linking pattern instead of nested element hierarchy for simpler selection/move/delete logic"
  - "Wireframe colors (grays, whites, light blues) for all UI kit components to visually distinguish from production designs"
  - "Category organization: Inputs (button, input, dropdown), Layout (card, navbar, modal, tab), Content (icon, image, list item)"
  - "Search filters across all categories, not just active category, for better UX"
  - "SVG preview icons in palette instead of Konva mini-renders to avoid performance overhead"
metrics:
  duration: 210s
  tasks: 2
  files_created: 3
  files_modified: 3
  completed: 2026-02-12
---

# Phase 27 Plan 01: UI Kit Foundation & Dependencies Summary

**One-liner:** Installed Phase 27 dependencies (dnd-kit, emoji-mart), extended drawing types with groupId/SpeechBubble/Emoji, created 10 UI kit wireframe factories, and built categorized palette sidebar.

## Objective

Establish the foundation for drag-and-drop UI kit features by installing all required dependencies, extending the drawing type system to support compound components (groupId) and new element types (speech bubbles, emojis), creating factory functions for 10 wireframe UI components, and building the categorized palette sidebar UI.

## Tasks Completed

### Task 1: Install dependencies and extend drawing type system
**Commit:** 1f73cd1
**Files:** package.json, package-lock.json, src/lib/drawing/types.ts

- Installed all four Phase 27 dependencies:
  - @dnd-kit/core@6.3.1 (drag and drop core)
  - @dnd-kit/utilities@3.2.2 (drag and drop utilities)
  - @emoji-mart/data@1.2.1 (emoji data)
  - @emoji-mart/react@1.1.1 (emoji picker component)
- Extended BaseElement with optional `groupId?: string` field to link multiple elements forming a single UI kit component
- Added SpeechBubbleElement type with customizable tail positioning (tailX, tailY offsets)
- Added EmojiElement type for stamp-style emoji rendering (emoji character + fontSize)
- Extended DrawingTool union with 'speechBubble' and 'emoji' tools
- Added UIKitGroupElement helper type for readability

**Verification:**
- All dependencies installed and verified with `npm ls`
- TypeScript compiles without errors (`npx tsc --noEmit`)
- All new types exported from types.ts

### Task 2: Create UI kit component factories and palette sidebar
**Commit:** 33394de
**Files:** src/lib/drawing/ui-kit-components.ts, src/components/ezydraw/palette/ui-kit-palette.tsx, src/components/ezydraw/palette/palette-item.tsx

**Created ui-kit-components.ts with 10 factory functions:**

1. **button**: rect (120x40, blue fill) + white text "Button"
2. **input**: rect (200x36, white fill, gray border) + gray placeholder text
3. **card**: rect (240x160, white) + horizontal divider line + title text + content text
4. **navbar**: rect (400x48, light gray) + "Logo" text + navigation items text
5. **modal**: rect (300x200, white, gray border) + divider + title + content + blue OK button with text
6. **dropdown**: rect (180x36, white) + "Select..." text + "v" indicator
7. **tab**: 3 rect tabs (first active with blue border, others gray) + text labels
8. **iconPlaceholder**: rect (48x48, light gray fill, dashed border) + "icon" text
9. **imagePlaceholder**: rect (200x120, light gray) + diagonal X lines + "Image" text
10. **listItem**: rect (280x48, white) + avatar placeholder rect + list text

Each factory:
- Returns `DrawingElement[]` array
- Generates shared `groupId` using `group-${createElementId()}`
- Uses wireframe colors (grays #F3F4F6/#E5E7EB, whites, blues #3B82F6)
- All elements have proper BaseElement properties (rotation: 0, scaleX: 1, scaleY: 1, opacity: 1)

**Exported:**
- UI_KIT_COMPONENTS registry object
- UIKitComponentType = keyof typeof UI_KIT_COMPONENTS
- UI_KIT_LABELS record with human-readable display names

**Created PaletteItem component:**
- Uses `useDraggable` hook from @dnd-kit/core
- Draggable id: `palette-${componentType}`
- Data payload: `{ componentType }`
- Custom SVG preview icons for each component type (simple, inline SVG hints)
- Visual states: hover (bg-gray-50, border-blue-300), dragging (opacity-50)
- Cursor: grab / grabbing
- Display name + "Drag to canvas" subtitle

**Created UIKitPalette component:**
- Width: w-56 (224px compact sidebar)
- Background: bg-gray-50, border-right separator
- Search input filters across all categories
- 3 category tabs:
  - **Inputs**: button, input, dropdown
  - **Layout**: card, navbar, modal, tab
  - **Content**: iconPlaceholder, imagePlaceholder, listItem
- Active tab has blue border-bottom
- Scrollable component list area
- Empty state: "No components found" message

**Verification:**
- TypeScript compiles without errors
- `npm run build` succeeds (all imports resolve correctly)
- UI_KIT_COMPONENTS has exactly 10 entries
- Each factory verified to return DrawingElement[] with groupId

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **groupId linking pattern**: Used optional groupId field on BaseElement rather than nested element hierarchy. This simplifies selection/move/delete logic - just filter by groupId. Cleaner than parent-child relationships for compound shapes.

2. **Wireframe color palette**: Consistently used grays (#F3F4F6, #E5E7EB, #D1D5DB, #9CA3AF), white (#FFFFFF), and blue (#3B82F6, #2563EB) for all UI kit components. This visually distinguishes wireframe components from actual user designs.

3. **Category organization**: Grouped 10 components into logical categories (Inputs, Layout, Content). Users can quickly find components by purpose. Alternative would be alphabetical, but semantic categories are more intuitive.

4. **Cross-category search**: Search filters across all categories, not just the active one. Better UX - users don't need to switch tabs to find a component by name.

5. **SVG preview icons**: Used inline SVG preview icons in PaletteItem instead of mini Konva renders. Avoids performance overhead of multiple canvas contexts. Simpler implementation, faster render.

## Key Files

### Created

- **src/lib/drawing/ui-kit-components.ts** (945 lines)
  - 10 factory functions for wireframe UI components
  - UI_KIT_COMPONENTS registry
  - UI_KIT_LABELS display name mapping
  - Each factory returns DrawingElement[] with shared groupId

- **src/components/ezydraw/palette/ui-kit-palette.tsx**
  - Categorized palette sidebar (Inputs, Layout, Content)
  - Search filtering across categories
  - Category tabs with active state styling
  - Scrollable component list

- **src/components/ezydraw/palette/palette-item.tsx**
  - Draggable palette item using @dnd-kit/core
  - Custom SVG preview icons (ComponentPreviewIcon)
  - Hover and drag states
  - Display name and helper text

### Modified

- **src/lib/drawing/types.ts**
  - Added `groupId?: string` to BaseElement
  - Added SpeechBubbleElement type (width, height, tailX, tailY, text, fontSize, fill, stroke, strokeWidth, cornerRadius)
  - Added EmojiElement type (emoji, fontSize)
  - Extended DrawingElement union: `| SpeechBubbleElement | EmojiElement`
  - Extended DrawingTool: `| 'speechBubble' | 'emoji'`
  - Added UIKitGroupElement helper type

- **package.json**
  - Added @dnd-kit/core@6.3.1
  - Added @dnd-kit/utilities@3.2.2
  - Added @emoji-mart/data@1.2.1
  - Added @emoji-mart/react@1.1.1

## Next Steps

This plan provides the foundation for:

**Phase 27-02 (dnd-kit integration):**
- DndContext wrapper in EzyDraw modal
- useDroppable canvas drop zone
- Drop handler calls UI_KIT_COMPONENTS factories
- Adds elements with groupId to drawing store

**Phase 27-03 (speech bubble & emoji tools):**
- Speech bubble drawing tool using SpeechBubbleElement type
- Emoji picker using @emoji-mart/react
- Emoji stamp tool using EmojiElement type

The UI kit palette is ready to be integrated into the EzyDraw modal sidebar. The factory functions are ready to be called by the drop handler. The new element types are ready for rendering in the Konva stage.

## Self-Check: PASSED

**Created files verified:**
```
FOUND: src/lib/drawing/ui-kit-components.ts
FOUND: src/components/ezydraw/palette/ui-kit-palette.tsx
FOUND: src/components/ezydraw/palette/palette-item.tsx
```

**Commits verified:**
```
FOUND: 1f73cd1 (Task 1: dependencies + types)
FOUND: 33394de (Task 2: factories + palette)
```

**Dependencies verified:**
```
@dnd-kit/core@6.3.1 ✓
@dnd-kit/utilities@3.2.2 ✓
@emoji-mart/data@1.2.1 ✓
@emoji-mart/react@1.1.1 ✓
```

**Type system verified:**
```
groupId on BaseElement ✓
SpeechBubbleElement type ✓
EmojiElement type ✓
UIKitGroupElement helper ✓
DrawingElement union updated ✓
DrawingTool union updated ✓
```

**Factory count verified:**
```
10 factory functions ✓
UI_KIT_COMPONENTS registry ✓
UI_KIT_LABELS mapping ✓
```

**Build verification:**
```
npx tsc --noEmit: PASSED ✓
npm run build: PASSED ✓
```

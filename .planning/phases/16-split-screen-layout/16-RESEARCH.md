# Phase 16: Split-Screen Layout & Step Container Integration - Research

**Researched:** 2026-02-11
**Domain:** React resizable panels, responsive layout patterns, mobile-first design with Next.js 16 + React 19
**Confidence:** HIGH

## Summary

Phase 16 retrofits a split-screen layout around existing chat and canvas components that were built in isolation. The codebase already uses `react-resizable-panels@4.6.2` with a working implementation in `step-container.tsx` (lines 305-343) that provides desktop resizable panels and mobile stacked layout. However, the current implementation places canvas ABOVE the output panel in the right section (line 245-261), while requirements call for canvas to be the primary right panel content. This phase needs to restructure the layout so chat is left, canvas is right, and output panel moves elsewhere or integrates with canvas.

**Primary recommendation:** Refactor `step-container.tsx` to make canvas the dedicated right panel content, move output panel to a bottom drawer or overlay, maintain existing responsive pattern (resizable panels on desktop >=768px, stacked vertical on mobile), and add placeholder component for non-canvas steps. The library's SSR support via `defaultSize` prop prevents layout shift, and the existing mobile detection pattern (window.innerWidth with resize listener) works well.

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **react-resizable-panels** | 4.6.2 (existing) | Resizable panel layout | Already in project. Official library by Brian Vaughn (React core team). Flexible size constraints (px, %, rem, em), SSR-safe with `defaultSize` prop, keyboard accessible with ARIA, touch-friendly hit targets. Used by shadcn/ui and Vercel. |
| **Next.js dynamic** | 16.1.1 (built-in) | SSR-safe component loading | Built-in Next.js utility. Already used for canvas SSR safety (canvas-wrapper.tsx). |
| **Tailwind CSS** | 4.x (existing) | Responsive utilities and mobile-first breakpoints | Project standard. Mobile-first breakpoints: `md:` at 768px matches mobile threshold. |

### Supporting Patterns

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| **Conditional rendering based on screen size** | Switch between desktop/mobile layouts | Existing pattern in step-container.tsx (line 66-74, 280-303). Use window.innerWidth with 768px threshold. |
| **useEffect resize listener with cleanup** | Detect viewport changes | Standard React pattern for responsive behavior. Must return cleanup function to prevent memory leaks. |
| **Panel Group with horizontal orientation** | Desktop split-screen layout | Main layout pattern for >=768px. Left panel for chat, right panel for canvas. |
| **Flexbox vertical stack** | Mobile layout | Simple `flex-col` stack for <768px. Chat above, canvas below. |

### Installation

**No new packages required.** All dependencies already installed:

```bash
# Verify existing installation
npm list react-resizable-panels
# Expected: react-resizable-panels@4.6.2
```

## Architecture Patterns

### Recommended Layout Structure

```
StepContainer (manages layout)
├── [Mobile] Vertical Stack (<768px)
│   ├── ChatPanel (flex-1, border-b)
│   ├── Canvas or Placeholder (flex-1)
│   └── StepNavigation (fixed at bottom)
│
└── [Desktop] Resizable Panels (>=768px)
    ├── Group (orientation: horizontal)
    │   ├── Panel (defaultSize: 50, minSize: 30)
    │   │   └── ChatPanel
    │   ├── Separator (resizable divider)
    │   └── Panel (defaultSize: 50, minSize: 25)
    │       └── Canvas or Placeholder
    └── StepNavigation (fixed at bottom)
```

### Pattern 1: Conditional Layout Rendering

**What:** Render different layout structures based on viewport width, not just CSS visibility.

**When to use:** When desktop and mobile need fundamentally different DOM structures (resizable panels vs flexbox stack).

**Example:**

```typescript
// Source: step-container.tsx lines 66-74, 280-303
const [isMobile, setIsMobile] = React.useState(false);

React.useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);

// In render:
if (isMobile) {
  return <VerticalStack />; // Flexbox layout
}
return <ResizablePanels />; // react-resizable-panels Group
```

### Pattern 2: SSR-Safe Panel Sizing

**What:** Always provide `defaultSize` prop to prevent layout shift during hydration.

**When to use:** Every `Panel` component when using SSR/SSG.

**Example:**

```typescript
// Source: Official react-resizable-panels docs + step-container.tsx line 310
<Panel defaultSize={50} minSize={30}>
  {content}
</Panel>
```

**Why it matters:** Without `defaultSize`, panels calculate size after hydration, causing visible layout shift (CLS issue). The prop sets initial flex-grow style on server render.

### Pattern 3: Touch-Friendly Resize Handle

**What:** Increase hit target size for separator/resize handle on touch devices.

**When to use:** All resizable separators in production apps.

**Example:**

```typescript
// Source: step-container.tsx lines 314-319
<Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
  {/* Invisible touch-friendly hit area */}
  <div className="absolute inset-y-0 -left-3 -right-3" />
  {/* Visual indicator on hover */}
  <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
</Separator>
```

**Why:** Apple guidelines suggest 37px touch targets. The invisible div extends hit area from 1px to 24px (-left-3 to -right-3 = 12px + 12px).

### Pattern 4: Placeholder Component for Steps Without Canvas

**What:** Show meaningful empty state in right panel when step doesn't have canvas.

**When to use:** Steps 1-7 and 9-10 (only step 8 currently has canvas).

**Example:**

```typescript
function PlaceholderRightPanel() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl text-muted-foreground">📋</div>
        <h3 className="mb-2 text-lg font-semibold">Output Panel</h3>
        <p className="text-sm text-muted-foreground">
          AI-generated outputs and artifacts will appear here as you progress through the conversation.
        </p>
      </div>
    </div>
  );
}
```

**Rationale:** Future-ready placeholder indicates the space is reserved for tools/visualizations. Clear messaging prevents user confusion about "empty" panel.

### Anti-Patterns to Avoid

- **CSS-only responsive (hiding PanelGroup):** Rendering both desktop and mobile Group components but hiding one with CSS causes hydration mismatches and doubles rendering cost. Use conditional rendering instead.

- **No defaultSize prop:** Causes layout shift during hydration and violates Core Web Vitals (CLS).

- **Thin resize handles on touch devices:** 1px separator is impossible to grab on mobile. Always expand hit area.

- **Missing cleanup in resize listeners:** Event listeners persist after unmount, causing memory leaks and attempting to update unmounted components.

- **Resizing panels on every render:** Panel state is internal to react-resizable-panels. Don't try to control via external state unless using imperative API.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable panels with drag handles | Custom resize logic with mouse/touch event handlers | react-resizable-panels Group/Panel/Separator | Library handles: touch/mouse/keyboard events, ARIA accessibility, layout calculations, edge cases (min/max size, collapse, nested groups), SSR, persistence. Custom implementation requires 500+ lines and months of edge case testing. |
| Responsive layout switching | Custom media query hooks | Window.innerWidth with resize listener | Simple, proven pattern. No need for complex media query parsing or SSR-safe hook libraries for this use case. |
| Panel persistence | LocalStorage wrapper | react-resizable-panels `autoSaveId` prop | Built-in feature persists panel layouts across page reloads. Handles serialization, storage, and restore automatically. |

**Key insight:** Resizable panels have deceptively complex requirements: touch target sizing for accessibility, keyboard navigation (arrow keys, Home/End), nested panel groups, collapse/expand animations, SSR safety, and floating-point precision issues during hydration. The 2 years of production testing in react-resizable-panels is worth using over custom solutions.

## Common Pitfalls

### Pitfall 1: Layout Shift During SSR Hydration

**What goes wrong:** Panels render at incorrect sizes on server, then jump to correct sizes after client hydration. Causes poor Core Web Vitals (CLS score).

**Why it happens:** Panel sizes aren't computed until hydration when `defaultSize` is missing. Library warns: "Panel is server-rendered without a defaultSize prop."

**How to avoid:** Always provide `defaultSize` prop on every Panel component. The library uses this to set initial flex-grow style during SSR.

**Warning signs:** Visible panel size changes 100-300ms after page load, console warnings about missing defaultSize.

**Source:** [GitHub Issue #144](https://github.com/bvaughn/react-resizable-panels/issues/144), [Issue #85](https://github.com/bvaughn/react-resizable-panels/issues/85)

### Pitfall 2: Hydration Mismatch with Conditional Layouts

**What goes wrong:** Server renders desktop layout, client detects mobile and tries to render mobile layout, React throws hydration error.

**Why it happens:** Window dimensions aren't available during SSR. Initial useState(false) renders desktop on server, then switches to mobile on client.

**How to avoid:** Accept the hydration of desktop layout on mobile, then switch after mount. Or use CSS-only approach for less drastic differences. For fundamentally different DOM structures (like Group vs Flexbox), the brief flash is acceptable.

**Warning signs:** React hydration errors mentioning Panel or Group components, FOUC (flash of unstyled content) on mobile.

**Alternative approach:** Use `suppressHydrationWarning` on container div if the brief desktop flash is acceptable.

**Source:** [GitHub Discussion #2345](https://github.com/shadcn-ui/ui/discussions/2345)

### Pitfall 3: Memory Leaks from Resize Listeners

**What goes wrong:** Component unmounts but resize listener keeps firing, attempting to call setState on unmounted component. Browser console shows "Can't perform a React state update on an unmounted component" warnings.

**Why it happens:** Forgot to return cleanup function from useEffect that removes event listener.

**How to avoid:** Always pair addEventListener with removeEventListener in the cleanup function.

**Warning signs:** Memory usage grows over time, console warnings about updating unmounted components, listeners accumulate on route changes.

**Example fix:**

```typescript
// BAD: No cleanup
React.useEffect(() => {
  window.addEventListener('resize', checkMobile);
}, []);

// GOOD: Cleanup function removes listener
React.useEffect(() => {
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

**Source:** [React.wiki useWindowSize Guide](https://react.wiki/hooks/window-size/), [Medium article on cleanup](https://medium.com/@christian_maehler/handle-window-resizing-with-a-react-context-4392b47285e4)

### Pitfall 4: Wrong Mobile Breakpoint

**What goes wrong:** Mobile layout appears too early (on tablets) or too late (squeezed desktop layout on phones).

**Why it happens:** Using arbitrary breakpoint (like 640px or 1024px) instead of Tailwind's md: breakpoint (768px).

**How to avoid:** Use 768px to match Tailwind's `md:` prefix. Ensures consistency with other responsive utilities in the app.

**Warning signs:** Layout breaks on iPad (768-1024px range), or mobile stack appears on small desktop windows.

**Source:** [Tailwind Responsive Design Docs](https://tailwindcss.com/docs/responsive-design)

## Code Examples

Verified patterns from official sources and existing codebase:

### Basic Split-Screen Layout (Desktop)

```typescript
// Source: step-container.tsx lines 306-343
import { Group, Panel, Separator } from 'react-resizable-panels';

function DesktopLayout() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={50} minSize={30}>
            <ChatPanel />
          </Panel>

          <Separator className="group relative w-px bg-border hover:bg-ring data-[resize-handle-state=drag]:bg-ring">
            {/* Touch-friendly hit area */}
            <div className="absolute inset-y-0 -left-3 -right-3" />
            {/* Visual indicator */}
            <div className="absolute inset-y-0 left-0 w-px bg-ring opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100" />
          </Separator>

          <Panel defaultSize={50} minSize={25}>
            <CanvasWrapper />
          </Panel>
        </Group>
      </div>
      <StepNavigation />
    </div>
  );
}
```

### Mobile Stacked Layout

```typescript
// Source: step-container.tsx lines 280-303
function MobileLayout() {
  return (
    <div className="flex h-full flex-col">
      {/* Chat panel (upper half) */}
      <div className="min-h-0 flex-1 border-b">
        <ChatPanel />
      </div>

      {/* Canvas/Right panel (lower half) */}
      <div className="min-h-0 flex-1">
        <CanvasWrapper />
      </div>

      <StepNavigation />
    </div>
  );
}
```

### Responsive Layout with Viewport Detection

```typescript
// Source: step-container.tsx lines 36-74, 280-343
export function StepContainer() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <MobileLayout />;
  }

  return <DesktopLayout />;
}
```

### Conditional Right Panel (Canvas or Placeholder)

```typescript
// Pattern for steps with/without canvas
function RightPanel({ stepOrder }: { stepOrder: number }) {
  const stepHasCanvas = stepOrder === 8; // Only step 8 for now

  if (stepHasCanvas) {
    return (
      <CanvasWrapper
        sessionId={sessionId}
        stepId={stepId}
        workshopId={workshopId}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl text-muted-foreground">📋</div>
        <h3 className="mb-2 text-lg font-semibold">Workspace</h3>
        <p className="text-sm text-muted-foreground">
          Future tools and visualizations will appear here. For now, focus on the AI conversation on the left.
        </p>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS Grid with fixed columns | react-resizable-panels | 2023-2024 | User-controlled panel sizes, better UX for varied content lengths. Industry standard in VS Code, Vercel dashboard, Linear. |
| Media queries only | Conditional component rendering + media queries | 2024+ | Fundamentally different layouts for mobile/desktop without rendering both. Better performance, cleaner code. |
| Absolute/relative positioning for resize | Flexbox with dynamic flex-grow | 2023+ | Simpler calculations, no z-index issues, works with nested layouts. |
| localStorage wrapper | Built-in autoSaveId prop | react-resizable-panels 1.0+ | No custom code needed for persistence. |

**Deprecated/outdated:**

- **react-split-pane:** Unmaintained since 2020. Use react-resizable-panels instead.
- **CSS resize property:** Limited browser support, no programmatic control, poor accessibility. Don't use for production apps.
- **Hiding panels with display: none:** Causes SSR hydration mismatches. Use conditional rendering instead.

## Open Questions

1. **Where should the output panel (extracted artifacts) go in the new layout?**
   - What we know: Currently output panel shares right side with canvas (canvas above, output below). With canvas as dedicated right panel, output needs new location.
   - What's unclear: User preference for output panel location (drawer? overlay? third panel?).
   - Recommendation: For Phase 16, simplify by removing output panel from split-screen layout. Steps 1-7 show placeholder right panel. Step 8 shows canvas in right panel, output moves to future phase. Keeps scope narrow and allows user testing before committing to output panel location.

2. **Should panel sizes persist across steps or reset per step?**
   - What we know: react-resizable-panels supports persistence via `autoSaveId` prop stored in localStorage.
   - What's unclear: Whether users want same split on every step (consistent workspace) or different split per step (step 8 canvas gets more space, step 1 chat gets more space).
   - Recommendation: Start without persistence (fresh 50/50 split each step). Simpler for Phase 16. Add `autoSaveId` in future phase if users request it.

3. **Which steps will get canvas/tools in the future?**
   - What we know: Currently only step 8 (Ideation) has canvas. Step metadata doesn't have a `hasCanvas` flag yet.
   - What's unclear: Product roadmap for which other steps get canvas or right-panel tools.
   - Recommendation: For Phase 16, hardcode `stepOrder === 8` check for canvas vs placeholder. Add `hasCanvas: boolean` to step metadata in future phase when more steps get tools. Placeholder messaging should indicate "future tools" to set expectation.

## Sources

### Primary (HIGH confidence)

- react-resizable-panels official docs: https://react-resizable-panels.vercel.app/
- react-resizable-panels GitHub: https://github.com/bvaughn/react-resizable-panels
- Next.js Server Components docs: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Tailwind Responsive Design: https://tailwindcss.com/docs/responsive-design
- Existing implementation: /src/components/workshop/step-container.tsx (verified working pattern)

### Secondary (MEDIUM confidence)

- [Resizable Panels in mobile? · shadcn-ui/ui · Discussion #2345](https://github.com/shadcn-ui/ui/discussions/2345) - Community discussion on mobile patterns
- [LogRocket: React panel layouts](https://blog.logrocket.com/essential-tools-implementing-react-panel-layouts/) - Comparison of panel libraries
- [React.wiki: useWindowSize Hook](https://react.wiki/hooks/window-size/) - Resize listener best practices
- [Medium: Handle window resizing with React context](https://medium.com/@christian_maehler/handle-window-resizing-with-a-react-context-4392b47285e4) - Memory leak prevention

### Tertiary (LOW confidence)

- [SSR Layout shift Issue #144](https://github.com/bvaughn/react-resizable-panels/issues/144) - Hydration challenges (2023, may be outdated)
- [Next.js 15 Streaming Handbook](https://www.freecodecamp.org/news/the-nextjs-15-streaming-handbook/) - Suspense patterns (Next.js 15, project uses 16)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already installed and in use. Existing implementation proven in production.
- Architecture: HIGH - Pattern already implemented in step-container.tsx and ideation-sub-step-container.tsx. Just needs refactoring for canvas placement.
- Pitfalls: MEDIUM - Most pitfalls are known/documented, but SSR hydration edge cases can be subtle.

**Research date:** 2026-02-11

**Valid until:** ~90 days (2026-05-11). Stack is mature and stable. react-resizable-panels v4.x is current, Next.js 16 patterns won't change significantly. Revisit if upgrading to Next.js 17+ or react-resizable-panels v5+.

# Phase 25: EzyDraw Foundation - Research

**Researched:** 2026-02-12
**Domain:** HTML5 Canvas drawing with Konva.js + React
**Confidence:** HIGH

## Summary

Phase 25 requires implementing a fullscreen drawing modal using Konva.js + react-konva + perfect-freehand. The research reveals a well-established, production-ready stack with clear patterns and comprehensive documentation. The key architectural decision—standalone modal vs ReactFlow extension—has been pre-decided in favor of standalone modal for event isolation and bundle size control.

**Critical findings:**
- Konva.js has proven patterns for touch/pointer events, but Apple Pencil requires specific Pointer Events API handling (not automatic)
- Memory management is non-trivial: canvas contexts don't auto-release, especially on Safari iOS (384 MB limit is real)
- Bundle size is manageable: konva (~450KB min) + react-konva (~15KB) + perfect-freehand (~5KB) ≈ 470KB total, well under 600KB target with lazy loading
- Undo/redo MUST be state-based (not Konva serialization) for React integration
- Next.js requires `next/dynamic` with `ssr: false` for react-konva components

**Primary recommendation:** Use Konva.js Layer architecture (max 3-5 layers), Pointer Events API for cross-device input, refs for history management, and strict cleanup with `destroy()` on unmount.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| konva | ~9.3.x | HTML5 Canvas framework | Industry standard for canvas manipulation, used by tldraw, excalidraw alternatives. Provides scene graph, events, transforms |
| react-konva | ~18.2.x | React bindings for Konva | Official React integration, declarative canvas, handles lifecycle |
| perfect-freehand | ~1.2.x | Velocity-based stroke rendering | Best-in-class freehand drawing library, used in tldraw. Simulates pressure without hardware |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | (existing) | Modal foundation | Already in codebase, use for EzyDraw overlay |
| simplify-js | ~1.2.x | Path simplification | Optional: Douglas-Peucker for reducing vector data before persistence |
| @vercel/blob | (existing) | Image storage | Required for PNG storage to avoid database bloat |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Konva.js | tldraw SDK | tldraw SDK is ~500KB (rejected per STATE.md decision), includes features we don't need |
| Konva.js | Fabric.js | Fabric.js better for design tools, Konva.js better for interactive canvas games/drawing |
| perfect-freehand | Custom path smoothing | perfect-freehand handles edge cases (velocity spikes, pressure simulation) that take weeks to perfect |

**Installation:**
```bash
npm install konva react-konva perfect-freehand
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ezydraw/
│   │   ├── ezydraw-modal.tsx           # Fullscreen modal wrapper (lazy-loaded)
│   │   ├── ezydraw-stage.tsx           # Konva Stage + Layer setup
│   │   ├── tools/
│   │   │   ├── pencil-tool.tsx         # Freehand drawing with perfect-freehand
│   │   │   ├── shapes-tool.tsx         # Rectangle, circle, arrow, line, diamond
│   │   │   ├── text-tool.tsx           # Text labels
│   │   │   ├── select-tool.tsx         # Select/move/resize with Transformer
│   │   │   └── eraser-tool.tsx         # Element deletion
│   │   └── toolbar.tsx                 # Tool selection, undo/redo, clear, export
│   └── canvas/
│       └── drawing-image-node.tsx      # ReactFlow custom node (Phase 26)
├── stores/
│   └── drawing-store.ts                # Zustand store for drawing state
└── lib/
    └── drawing/
        ├── export.ts                   # PNG export with toDataURL
        ├── history.ts                  # Undo/redo stack management
        └── simplify.ts                 # Optional: Douglas-Peucker path reduction
```

### Pattern 1: Lazy Loading with next/dynamic

**What:** Load Konva components only on client-side, avoid SSR bundle bloat

**When to use:** Always for react-konva components in Next.js

**Example:**
```typescript
// Source: https://konvajs.org/docs/react/index.html + https://nextjs.org/docs/pages/guides/lazy-loading
'use client';

import dynamic from 'next/dynamic';

// Lazy load the entire EzyDraw modal to keep initial bundle small
const EzyDrawModal = dynamic(() => import('./ezydraw-modal'), {
  ssr: false, // CRITICAL: Konva requires window/canvas APIs
  loading: () => <div>Loading drawing tools...</div>,
});

export function DrawingTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Drawing</button>
      {isOpen && <EzyDrawModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

### Pattern 2: Konva Stage/Layer/Group Architecture

**What:** Hierarchical structure: Stage → Layer → Group → Shape

**When to use:** Core pattern for all Konva apps

**Example:**
```typescript
// Source: https://konvajs.org/docs/overview.html
import { Stage, Layer, Line, Rect, Circle, Text, Transformer } from 'react-konva';

function EzyDrawStage() {
  const stageRef = useRef<Konva.Stage>(null);
  const drawingLayerRef = useRef<Konva.Layer>(null);
  const uiLayerRef = useRef<Konva.Layer>(null);

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      ref={stageRef}
    >
      {/* Layer 1: Drawing content (freehand, shapes, text) */}
      <Layer ref={drawingLayerRef}>
        {/* Freehand strokes */}
        {strokes.map(stroke => (
          <Line
            key={stroke.id}
            points={stroke.points}
            stroke={stroke.color}
            strokeWidth={2}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            listening={false} // Performance: no hit detection needed
          />
        ))}

        {/* Shapes */}
        {shapes.map(shape => (
          <Rect key={shape.id} {...shape} />
        ))}

        {/* Text */}
        {texts.map(text => (
          <Text key={text.id} {...text} />
        ))}
      </Layer>

      {/* Layer 2: UI controls (transformer, selection) - separate for performance */}
      <Layer ref={uiLayerRef}>
        <Transformer ref={transformerRef} />
      </Layer>
    </Stage>
  );
}
```

### Pattern 3: perfect-freehand Integration

**What:** Convert pointer events to smooth, pressure-simulated strokes

**When to use:** Pencil tool for freehand drawing

**Example:**
```typescript
// Source: https://github.com/steveruizok/perfect-freehand
import { getStroke } from 'perfect-freehand';
import { Line } from 'react-konva';

function PencilTool() {
  const [currentStroke, setCurrentStroke] = useState<number[][]>([]);

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    setCurrentStroke([[pos.x, pos.y, e.evt.pressure || 0.5]]);
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!isDrawing) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    setCurrentStroke(prev => [...prev, [pos.x, pos.y, e.evt.pressure || 0.5]]);
  };

  const handlePointerUp = () => {
    // Convert perfect-freehand points to Konva Line points
    const outlinePoints = getStroke(currentStroke, {
      size: 8,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true, // Simulate pressure from velocity when no stylus
    });

    // Flatten [[x,y], [x,y]] to [x,y,x,y] for Konva
    const flatPoints = outlinePoints.flat();

    saveStroke({ id: crypto.randomUUID(), points: flatPoints, color: '#000' });
    setCurrentStroke([]);
  };

  return (
    <Layer
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Render saved strokes */}
    </Layer>
  );
}
```

### Pattern 4: Undo/Redo with React Refs

**What:** State-based history without Konva serialization

**When to use:** Required for all drawing tools

**Example:**
```typescript
// Source: https://konvajs.org/docs/react/Undo-Redo.html
function useDrawingHistory() {
  const history = useRef<DrawingState[]>([]);
  const historyStep = useRef(0);

  const pushHistory = (state: DrawingState) => {
    // Remove future states when new action occurs
    history.current = history.current.slice(0, historyStep.current + 1);

    // Add new state
    history.current.push(state);
    historyStep.current++;

    // Limit history to 50 steps to prevent memory bloat
    if (history.current.length > 50) {
      history.current.shift();
      historyStep.current--;
    }
  };

  const undo = () => {
    if (historyStep.current === 0) return null;
    historyStep.current--;
    return history.current[historyStep.current];
  };

  const redo = () => {
    if (historyStep.current >= history.current.length - 1) return null;
    historyStep.current++;
    return history.current[historyStep.current];
  };

  return { pushHistory, undo, redo };
}
```

### Pattern 5: Select/Transform with Konva.Transformer

**What:** Built-in resize/rotate/move UI for selected shapes

**When to use:** Select tool for moving and resizing elements

**Example:**
```typescript
// Source: https://konvajs.org/docs/react/Transformer.html
import { Transformer } from 'react-konva';

function SelectTool() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRef = useRef<Konva.Shape>(null);

  useEffect(() => {
    if (selectedId && transformerRef.current && shapeRef.current) {
      // Attach transformer to selected shape
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  return (
    <>
      <Rect
        ref={shapeRef}
        onClick={() => setSelectedId('rect-1')}
        onTap={() => setSelectedId('rect-1')} // Touch support
        draggable
      />
      <Transformer
        ref={transformerRef}
        boundBoxFunc={(oldBox, newBox) => {
          // Limit resize (optional)
          if (newBox.width < 5 || newBox.height < 5) return oldBox;
          return newBox;
        }}
      />
    </>
  );
}
```

### Pattern 6: PNG Export with High Quality

**What:** Export Konva stage to PNG with pixel ratio control

**When to use:** Save button to persist drawing as image

**Example:**
```typescript
// Source: https://konvajs.org/docs/data_and_serialization/High-Quality-Export.html
function exportToPNG(stage: Konva.Stage): string {
  const dataURL = stage.toDataURL({
    mimeType: 'image/png',
    quality: 1, // Not used for PNG (lossless), but good practice
    pixelRatio: 2, // 2x resolution for retina displays
  });

  return dataURL; // base64 string: "data:image/png;base64,..."
}

async function uploadToVercelBlob(dataURL: string, filename: string): Promise<string> {
  // Convert base64 to Blob
  const res = await fetch(dataURL);
  const blob = await res.blob();

  // Upload to Vercel Blob
  const formData = new FormData();
  formData.append('file', blob, filename);

  const response = await fetch('/api/drawings/upload', {
    method: 'POST',
    body: formData,
  });

  const { url } = await response.json();
  return url; // https://[blob-url]/drawings/[id].png
}
```

### Anti-Patterns to Avoid

- **Treating Konva nodes like DOM elements:** Konva nodes don't have the same lifecycle guarantees as React DOM elements. Store state in React, render from state.
- **Too many layers:** More than 3-5 layers kills performance. Use grouping instead.
- **Serializing with toJSON():** Konva's built-in serialization doesn't handle images, events, or complex state. Use React state management instead.
- **Forgetting `listening={false}`:** Shapes that don't need interaction should disable hit detection for performance.
- **Not calling `destroy()`:** Canvas contexts accumulate memory. Always destroy removed nodes and tweens.
- **Using `remove()` when you mean `destroy()`:** `remove()` keeps references, use `destroy()` for permanent deletion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Freehand stroke smoothing | Custom Bezier curve fitting | perfect-freehand | Handles velocity spikes, pressure simulation, edge cases that take weeks to perfect |
| Canvas event handling | Manual touch/mouse/stylus detection | Konva Pointer Events | Cross-browser compatibility, touch vs mouse vs stylus, multi-touch support |
| Select/resize UI | Custom anchor points, drag handles | Konva.Transformer | Built-in aspect ratio, rotation, boundaries, undo support |
| Memory management | Manual canvas cleanup | Konva's destroy() | Tracks references internally, handles Safari iOS canvas limits |
| Undo/redo for canvas | Custom command pattern | React refs + state snapshots | Avoids serialization overhead, integrates with React rendering |
| Path simplification | Manual Douglas-Peucker | simplify-js or Konva built-in | Optimized algorithm, handles edge cases (collinear points, self-intersections) |

**Key insight:** Canvas is a minefield of browser inconsistencies (Safari canvas memory limits, iOS touch event handling, pointer event support). Konva abstracts these away. Building custom solutions means rediscovering these issues the hard way.

## Common Pitfalls

### Pitfall 1: Safari iOS Canvas Memory Limit (384 MB)

**What goes wrong:** Safari throws "Total canvas memory use exceeds the maximum limit (384 MB)" error, app crashes on iPad

**Why it happens:** Each canvas context allocates memory that isn't released until explicitly destroyed. Konva creates hidden canvases for hit detection. Doesn't auto-garbage collect.

**How to avoid:**
- Call `node.destroy()` when removing shapes permanently (not just `remove()`)
- Limit layers to 3-5 max (each layer = 2 canvas contexts: scene + hit)
- Use `listening={false}` on decorative shapes to skip hit graph canvas
- Call `stage.destroy()` on component unmount

**Warning signs:** App works on desktop Chrome but crashes on iPad after ~30 seconds of drawing

### Pitfall 2: Apple Pencil Not Working

**What goes wrong:** Touch works, mouse works, but Apple Pencil doesn't trigger drawing

**Why it happens:** Apple Pencil uses Pointer Events API, not touch events. Konva supports both, but you must use `onPointerDown/Move/Up` instead of `onMouseDown/onTouchStart`

**How to avoid:**
- Use Konva's Pointer Events: `onPointerDown`, `onPointerMove`, `onPointerUp`
- Read pressure from `e.evt.pressure` (0.0-1.0), falls back to 0.5 for mouse
- Set `simulatePressure: false` in perfect-freehand when using real pressure

**Warning signs:** Works on desktop and iPad touch, fails with Apple Pencil

### Pitfall 3: Re-rendering Entire Stage on Every Stroke

**What goes wrong:** Drawing lags, frame drops, CPU spikes to 100%

**Why it happens:** Storing all shapes in React state causes entire Stage to re-render on every pointer move (60fps = 60 re-renders/sec)

**How to avoid:**
- Use refs for transient state (current stroke being drawn)
- Only push to React state on `pointerUp` (stroke complete)
- Use separate layers for static content vs active drawing
- Set `perfectDrawEnabled={false}` to skip buffer canvas for simple shapes

**Warning signs:** Smooth on first 5 strokes, progressively worse performance

### Pitfall 4: Next.js SSR Trying to Render Canvas

**What goes wrong:** "window is not defined", "document is not defined", or "canvas is not defined" errors during build

**Why it happens:** Konva requires browser APIs (window, canvas) that don't exist during server-side rendering

**How to avoid:**
- Always use `next/dynamic` with `ssr: false` for react-konva components
- Add `'use client'` directive to all Konva-using components
- Optional: Add `canvas: 'canvas'` to `next.config.js` webpack externals

**Warning signs:** Works in dev, fails on `npm run build`

### Pitfall 5: Undo/Redo Corrupting State

**What goes wrong:** Undo works once, then breaks. Redo brings back deleted elements.

**Why it happens:** Using `Konva.Node.toJSON()` serialization includes references to destroyed nodes, or mutating history array directly

**How to avoid:**
- Store plain JavaScript objects in history, not Konva nodes
- Deep clone state before pushing to history (spread operator insufficient for nested objects)
- Truncate future history when new action occurs (see Pattern 4)
- Limit history to 50 steps to prevent memory bloat

**Warning signs:** First undo works, subsequent undos fail silently or restore wrong state

### Pitfall 6: Touch Scrolling Prevents Drawing

**What goes wrong:** On iPad, canvas scroll gestures block drawing. Can't draw without page scrolling.

**Why it happens:** Browser default touch behavior conflicts with canvas drawing events

**How to avoid:**
- Set `touch-action: none` CSS on canvas container
- Call `e.evt.preventDefault()` in pointer event handlers
- Use `overflow: hidden` on fullscreen modal wrapper

**Warning signs:** Desktop works, iPad scrolls instead of drawing

### Pitfall 7: PNG Export is Blurry on Retina Displays

**What goes wrong:** Drawing looks crisp on screen, but exported PNG is blurry/pixelated

**Why it happens:** Default `pixelRatio: 1` exports at 1x resolution, losing retina detail

**How to avoid:**
- Set `pixelRatio: 2` (or `window.devicePixelRatio`) in `toDataURL()` options
- Note: 2x pixel ratio = 4x file size (doubles width AND height)
- Balance quality vs file size (2x sufficient for most cases, 3x for print)

**Warning signs:** Stage looks good, exported image looks fuzzy

## Code Examples

Verified patterns from official sources:

### Fullscreen Modal with Dialog

```typescript
// Source: Existing codebase pattern from src/components/ui/dialog.tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function EzyDrawModal({ isOpen, onClose }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 rounded-none"
        showCloseButton={false}
      >
        <div className="relative w-full h-full" style={{ touchAction: 'none' }}>
          <EzyDrawToolbar onSave={handleSave} onCancel={onClose} />
          <EzyDrawStage />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Pointer Events for Cross-Device Input

```typescript
// Source: https://konvajs.org/docs/events/Pointer_Events.html
function DrawingLayer() {
  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    const pressure = e.evt.pressure || 0.5; // Fallback for mouse
    const pointerType = e.evt.pointerType; // 'mouse' | 'pen' | 'touch'

    // Start drawing stroke
    startStroke(pos, pressure, pointerType);
  };

  return (
    <Layer
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel} // Handle interruptions
    />
  );
}
```

### Vercel Blob Upload API Route

```typescript
// Source: https://vercel.com/docs/vercel-blob/server-upload
// File: app/api/drawings/upload/route.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const blob = await put(`drawings/${crypto.randomUUID()}.png`, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return NextResponse.json({ url: blob.url });
}
```

### Memory Cleanup on Unmount

```typescript
// Source: https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html
function EzyDrawStage() {
  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    return () => {
      // CRITICAL: Destroy stage on unmount to release canvas memory
      if (stageRef.current) {
        stageRef.current.destroy();
      }
    };
  }, []);

  return <Stage ref={stageRef}>...</Stage>;
}
```

### Keyboard Shortcuts for Undo/Redo

```typescript
// Source: Existing codebase pattern from react-hotkeys-hook usage
import { useHotkeys } from 'react-hotkeys-hook';

function EzyDrawToolbar() {
  const { undo, redo } = useDrawingHistory();

  useHotkeys('mod+z', (e) => {
    e.preventDefault();
    undo();
  });

  useHotkeys('mod+shift+z', (e) => {
    e.preventDefault();
    redo();
  });

  return (
    <div>
      <button onClick={undo}>Undo (⌘Z)</button>
      <button onClick={redo}>Redo (⌘⇧Z)</button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mouse/touch events only | Pointer Events API | 2017 (W3C standard) | Unified handling for mouse, touch, stylus. Single event listener instead of 6+ |
| Manual stroke smoothing | perfect-freehand | 2021 (v1.0) | Production-ready pressure simulation, used in tldraw |
| Class components | Functional + hooks | react-konva 18.x (2023) | Cleaner code, better TypeScript support |
| `toJSON()` serialization | State-based persistence | react-konva best practices | Avoids non-serializable data (events, images) |
| Multiple canvas elements | Konva Stage/Layer | Always (Konva core pattern) | Single container, multiple layers for performance |

**Deprecated/outdated:**
- **`Konva.Node.toJSON()` for complex apps:** Only works for trivial demos. Modern apps use state management (Redux, Zustand, React state).
- **`onMouseDown` + `onTouchStart`:** Replaced by `onPointerDown` for unified input handling
- **Custom pressure simulation:** Use perfect-freehand's built-in `simulatePressure` option

## Open Questions

1. **Path simplification threshold for database storage**
   - What we know: Douglas-Peucker algorithm can reduce points by 60-80% at tolerance 1.0-2.0
   - What's unclear: Optimal tolerance for concept sketches (visual quality vs storage size tradeoff)
   - Recommendation: Start without simplification in Phase 25, measure actual storage impact in Phase 26, add simplify-js if needed

2. **Touch rejection for palm while drawing**
   - What we know: Konva Pointer Events distinguish between pen and touch
   - What's unclear: Whether iPad Safari reliably sends `pointerType: 'pen'` for Apple Pencil
   - Recommendation: Test on real iPad early, may need to ignore large touch areas when pen is active

3. **Maximum canvas size before performance degrades**
   - What we know: Fullscreen modal on 4K display = 3840x2160 canvas
   - What's unclear: Whether this hits Safari iOS limits or causes lag on mid-range tablets
   - Recommendation: Start with window dimensions, add max-width/height limits if performance issues arise

## Sources

### Primary (HIGH confidence)
- [Konva.js Official Documentation](https://konvajs.org/docs/) - Core API, patterns, performance tips
- [react-konva GitHub](https://github.com/konvajs/react-konva) - React integration patterns
- [perfect-freehand GitHub](https://github.com/steveruizok/perfect-freehand) - Stroke algorithm, options
- [Next.js Lazy Loading Guide](https://nextjs.org/docs/pages/guides/lazy-loading) - Code splitting with next/dynamic
- [Vercel Blob Server Upload](https://vercel.com/docs/vercel-blob/server-upload) - Image storage API

### Secondary (MEDIUM confidence)
- [How to Improve React Konva Performance](https://j5.medium.com/react-konva-performance-tuning-52e70ab15819) - Performance optimization techniques
- [Simplify.js](https://mourner.github.io/simplify-js/) - Douglas-Peucker implementation by Leaflet author
- [Konva Memory Leaks GitHub Issue #1442](https://github.com/konvajs/konva/pull/1442) - Safari iOS canvas resource release fix

### Tertiary (LOW confidence)
- Bundle size estimates (konva ~450KB) - Approximated from Bundlephobia, verify with actual build
- Apple Pencil pointer events - Community reports suggest it works but needs testing on real devices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Well-documented, actively maintained, production-proven
- Architecture: HIGH - Official patterns from Konva docs, verified in multiple demos
- Pitfalls: HIGH - Documented in official performance guides, confirmed in GitHub issues

**Research date:** 2026-02-12
**Valid until:** ~60 days (stable libraries, slow-moving ecosystem)

**Bundle size verification needed:** Actual minified + gzipped sizes after installation

**Testing requirements:**
- Real iPad with Apple Pencil (pointer events, pressure, palm rejection)
- Safari iOS (canvas memory limits)
- Android tablet with stylus (Samsung S-Pen)
- Low-end device (performance under load)

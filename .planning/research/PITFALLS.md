# Pitfalls Research: Adding Drawing Capabilities to ReactFlow Canvas

**Domain:** Adding in-app drawing tool (EzyDraw modal), visual mind maps, sketch grids, and composite cards to existing ReactFlow canvas
**Researched:** 2026-02-12
**Confidence:** MEDIUM-HIGH

**Context:** This research focuses on pitfalls when ADDING drawing capabilities to WorkshopPilot.ai's existing ReactFlow canvas system (v1.2 Canvas Whiteboard with post-its, grids, rings, empathy zones). Specifically addresses adding EzyDraw-style modal drawing tool, mind map layouts with force-directed nodes, Crazy 8s sketch grid, and visual concept cards for Steps 8 (Ideation) and 9 (Concept Development). Current system: ReactFlow + Zustand, 110KB gzipped bundle, mobile-responsive, auto-save to Postgres JSONB, undo/redo via Zustand temporal.

---

## Critical Pitfalls

### Pitfall 1: Two-Canvas Architecture Event Handling Conflicts

**What goes wrong:**
Adding EzyDraw modal with HTML5 Canvas for drawing alongside existing ReactFlow canvas creates event handling conflicts. User opens drawing modal, draws with mouse/stylus, but panning gestures intended for drawing tool trigger ReactFlow pan underneath. Touch events on iPad fire on both canvases - drawing stroke on EzyDraw modal simultaneously pans ReactFlow viewport. User tries to select drawn sketch on canvas, but ReactFlow's selection mode activates instead of sketch selection. Escape key to close drawing modal also triggers ReactFlow deselection. Two undo/redo systems conflict - Cmd+Z while drawing modal is open undoes ReactFlow canvas action instead of drawing stroke. Z-index layering breaks - ReactFlow controls render on top of drawing modal, blocking interaction.

**Why it happens:**
ReactFlow uses global event listeners for pan (mousedown/mousemove on document), zoom (wheel events), and keyboard shortcuts. Drawing modal also needs global listeners for drawing (pointer events) and tool shortcuts. Both layers compete for same events. Event bubbling means events on modal canvas propagate to ReactFlow unless explicitly stopped. Touch events fire both touch and mouse events - preventDefault() on wrong event type fails to prevent ReactFlow from reacting. iOS Safari has complex touch handling - preventDefault() on touchmove can disable page scroll but also breaks nested scrollable areas. Two canvas systems = two coordinate spaces - ReactFlow uses flow coordinates (zoom/pan transformed), drawing canvas uses pixel coordinates (0,0 = top-left of modal). Converting between them for "place drawing on canvas" feature becomes error-prone. React's event system (synthetic events) vs native browser events causes timing issues - synthetic events batch in React 19, native events fire immediately, creating race conditions. Modal z-index must be higher than ReactFlow but lower than toasts/notifications - managing global z-index scale becomes fragile. Keyboard shortcuts overlap - ReactFlow uses Space for pan tool, drawing tools might use Space for eraser or stamp tool. Global listeners don't automatically cleanup when modal unmounts in React StrictMode (double mounting) - leads to duplicate event handlers.

**How to avoid:**
Disable ReactFlow interactions while drawing modal is open:

```typescript
const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);

// ReactFlow component
<ReactFlow
  panOnDrag={!isDrawingModalOpen} // Disable pan during drawing
  zoomOnScroll={!isDrawingModalOpen}
  zoomOnPinch={!isDrawingModalOpen}
  selectionKeyCode={isDrawingModalOpen ? null : "Shift"}
  deleteKeyCode={isDrawingModalOpen ? null : ["Backspace", "Delete"]}
  // Disable all interactions when modal open
>
```

Use proper event capture and stopPropagation in drawing modal:

```typescript
const DrawingModal = ({ onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (e: PointerEvent) => {
      e.stopPropagation(); // Prevent ReactFlow from seeing event
      e.preventDefault(); // Prevent default browser behavior
      startDrawing(e);
    };

    // Use capture phase to intercept before React synthetic events
    canvas.addEventListener('pointerdown', handlePointerDown, { capture: true });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100]" // Higher than ReactFlow's z-50
      onClick={(e) => e.stopPropagation()} // Block click events from reaching ReactFlow
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
```

Implement separate undo/redo stacks with context awareness:

```typescript
const useContextAwareUndo = () => {
  const isDrawingModalOpen = useDrawingStore(s => s.isOpen);
  const undoDrawing = useDrawingStore(s => s.undo);
  const undoCanvas = useCanvasStore(s => s.temporal.getState().undo);

  const handleUndo = useCallback(() => {
    if (isDrawingModalOpen) {
      undoDrawing(); // Drawing tool undo
    } else {
      undoCanvas(); // ReactFlow canvas undo
    }
  }, [isDrawingModalOpen, undoDrawing, undoCanvas]);

  useHotkeys('mod+z', handleUndo, { enableOnFormTags: false });
};
```

Use portal rendering for modal to avoid z-index conflicts:

```typescript
import { createPortal } from 'react-dom';

const DrawingModal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {children}
    </div>,
    document.body // Render at body level, outside ReactFlow container
  );
};
```

Clean up global event listeners properly:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  // Only add listener when modal is open
  if (isOpen) {
    document.addEventListener('keydown', handleKeyDown);
  }

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [isOpen]); // Re-run when isOpen changes
```

**Warning signs:**
- Drawing gestures triggering ReactFlow pan/zoom simultaneously
- Keyboard shortcuts working on both canvases at once
- Modal controls blocked by ReactFlow overlay elements
- Undo/redo applying to wrong canvas
- Touch events causing unexpected behaviors on mobile
- Event handlers not cleaning up, leading to duplicate actions

**Phase to address:**
Phase 1 (EzyDraw Modal Foundation) - Event isolation architecture must be established upfront. Test event handling conflicts before implementing drawing features. Document z-index scale and keyboard shortcut registry to prevent conflicts.

---

### Pitfall 2: Canvas Context Memory Leaks on Modal Unmount

**What goes wrong:**
User opens EzyDraw modal, draws sketch, closes modal. Repeat 10 times - browser memory usage climbs from 150MB to 400MB. Chrome DevTools heap snapshot shows 10 detached CanvasRenderingContext2D objects still in memory. On iOS Safari, after 15 modal opens/closes, app crashes with "Too many active WebGL contexts" error (if using WebGL-accelerated canvas). Drawing modal uses requestAnimationFrame for smooth strokes - after unmount, animation loop continues running, consuming CPU. Canvas blob URLs created for export (`canvas.toDataURL()`) never revoked, leaking memory. Event listeners attached to canvas for drawing remain active after modal unmounts. Offscreen canvas workers (if used for performance) never terminate.

**Why it happens:**
HTML5 Canvas 2D context holds significant memory (ImageData buffer for pixel data). Creating context with `canvas.getContext('2d')` allocates memory, but there's no explicit dispose() method. React component unmount doesn't automatically release canvas context - browser garbage collection only reclaims memory if no references remain. Common memory leak: storing canvas ref or context in Zustand store beyond component lifecycle - store keeps reference alive even after unmount. requestAnimationFrame callbacks capture closure over canvas context - animation loop holds reference, preventing GC. Blob URLs created with `canvas.toBlob()` or `canvas.toDataURL()` allocate memory outside JS heap - must manually call `URL.revokeObjectURL()` to free. Event listeners on canvas element or document (for drawing) hold closure over canvas/context, preventing GC. WebGL contexts (if using WebGL-accelerated canvas libraries) have hard browser limits (typically 16 contexts per tab) - exceeding limit loses oldest context, corrupting rendering. Offscreen canvas workers (Web Workers) run in separate threads - postMessage holds references, and workers must be explicitly terminated. React StrictMode in development causes double mounting - canvas initialized twice but only cleaned up once, leaking on every mount. Third-party drawing libraries (Fabric.js, Konva) maintain internal state - calling library init without calling dispose() on unmount leaks their internal structures.

**How to avoid:**
Properly cleanup canvas context on unmount:

```typescript
const DrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize context
    contextRef.current = canvas.getContext('2d');

    return () => {
      // Cancel animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Clear canvas pixels (helps GC)
      if (contextRef.current) {
        contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        contextRef.current = null;
      }

      // Nullify canvas size to release ImageData buffer
      canvas.width = 0;
      canvas.height = 0;
    };
  }, []);
};
```

Revoke blob URLs after use:

```typescript
const exportDrawing = async () => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });

  const url = URL.createObjectURL(blob);

  // Use URL for download or storage
  await uploadDrawing(url);

  // CRITICAL: Revoke URL to free memory
  URL.revokeObjectURL(url);
};
```

Clean up event listeners with AbortController:

```typescript
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const abortController = new AbortController();
  const { signal } = abortController;

  canvas.addEventListener('pointerdown', handlePointerDown, { signal });
  canvas.addEventListener('pointermove', handlePointerMove, { signal });
  canvas.addEventListener('pointerup', handlePointerUp, { signal });

  return () => {
    // Single cleanup - removes all listeners
    abortController.abort();
  };
}, []);
```

Terminate offscreen canvas workers:

```typescript
const useOffscreenCanvas = () => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker('/drawing-worker.js');

    return () => {
      // Terminate worker on unmount
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);
};
```

Avoid storing canvas refs in global state:

```typescript
// BAD: Storing canvas ref in Zustand leaks memory
interface DrawingStore {
  canvasRef: HTMLCanvasElement | null; // DON'T DO THIS
}

// GOOD: Only store serializable data
interface DrawingStore {
  strokes: Stroke[]; // Serializable drawing data
  // Canvas refs stay in component scope
}
```

Dispose third-party library instances:

```typescript
const useFabricCanvas = () => {
  const fabricRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    const canvas = new fabric.Canvas('canvas');
    fabricRef.current = canvas;

    return () => {
      // CRITICAL: Dispose fabric instance
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);
};
```

**Warning signs:**
- Memory usage climbing on repeated modal open/close cycles
- Browser console warning "Too many active WebGL contexts"
- DevTools heap snapshot showing detached canvas elements
- Animation loops consuming CPU after modal closed
- iOS Safari crashes after multiple drawing sessions
- React DevTools showing component unmounted but memory not released

**Phase to address:**
Phase 1 (EzyDraw Modal Foundation) - Implement proper cleanup architecture from start. Test memory leaks with Chrome DevTools Memory Profiler after 20+ modal open/close cycles. Monitor iOS Safari WebGL context limits.

---

### Pitfall 3: Drawing Data Storage Bloat in JSONB

**What goes wrong:**
User draws simple sketch in modal, closes it. Database stepArtifacts JSONB column grows from 15KB to 500KB for one sketch. After adding 3 sketches across 3 ideation cards, single workshop row exceeds 1MB. Postgres query performance degrades - loading workshop takes 3 seconds instead of 300ms. Auto-save with 2-second debounce triggers TOAST compression on every save, causing 200ms save latency spikes. User on mobile 4G network experiences 5-second delays loading canvas because 1.2MB JSONB downloads slowly. Neon Postgres serverless database bills spike - 1MB writes consume 10x more write units than 100KB. Vercel function timeout errors (10-second limit) when saving workshop with 8 high-resolution drawings. Database backup size explodes - 100 workshops with drawings = 500MB backup instead of 5MB.

**Why it happens:**
Base64 encoding image data adds 33% overhead - 500KB PNG becomes 666KB base64 string. Storing base64 in JSONB adds JSON escaping overhead (quotes, backslashes) - another 10-15% bloat. Canvas.toDataURL() defaults to PNG at full resolution - 800x600 canvas with simple line drawing still produces 200KB+ PNG because every transparent pixel is encoded. Drawing strokes stored as raw coordinate arrays - smooth freehand stroke captures 500+ points at 60fps, each point has {x, y, pressure, timestamp} = 32 bytes, 500 points = 16KB for one stroke. Multiple layers in drawing (background, strokes, annotations) each stored separately - redundant pixel data. Postgres JSONB has 2KB TOAST threshold - data over 2KB gets compressed with PGLZ algorithm (25-35% CPU overhead) and moved to out-of-line storage. PGLZ compression degrades significantly under parallel queries - with 8 concurrent users, compressed JSONB read performance worse than uncompressed. Neon serverless Postgres charges for data transfer - large JSONB writes/reads consume more billable units. Vercel Edge Functions have 1MB request/response limit - workshops exceeding this fail to save/load. Auto-save triggering on every stroke means saving 500KB every 2 seconds = 250KB/sec write rate, overwhelming database connection pool.

**How to avoid:**
Store vector stroke data instead of rasterized images:

```typescript
interface Stroke {
  id: string;
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'marker' | 'eraser';
}

interface DrawingData {
  version: 1;
  strokes: Stroke[];
  canvasSize: { width: number; height: number };
  // Much smaller than base64 image
}

// Serialize to JSONB - typically 5-20KB instead of 500KB
const serializeDrawing = (strokes: Stroke[]): DrawingData => ({
  version: 1,
  strokes: strokes.map(s => ({
    id: s.id,
    points: s.points,
    color: s.color,
    width: s.width,
    tool: s.tool
  })),
  canvasSize: { width: 800, height: 600 }
});
```

Simplify stroke paths with Douglas-Peucker algorithm:

```typescript
// Reduce 500 points to 50-100 points with negligible visual difference
const simplifyStroke = (points: Point[], tolerance: number = 2): Point[] => {
  // Douglas-Peucker line simplification
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > tolerance) {
    const left = simplifyStroke(points.slice(0, index + 1), tolerance);
    const right = simplifyStroke(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [points[0], points[end]];
  }
};

// Usage: 500 points → 80 points, 16KB → 2.5KB
const optimizedStrokes = strokes.map(s => ({
  ...s,
  points: simplifyStroke(s.points, 2)
}));
```

Store rasterized images in object storage, not JSONB:

```typescript
// For final rendered drawings, use S3/R2/Vercel Blob
const saveDrawing = async (canvas: HTMLCanvasElement, workshopId: string) => {
  // Compress to WebP (50% smaller than PNG)
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      'image/webp',
      0.85 // 85% quality - good balance
    );
  });

  // Upload to Vercel Blob Storage
  const { url } = await upload(`drawings/${workshopId}/${nanoid()}.webp`, blob, {
    access: 'public',
    addRandomSuffix: false,
  });

  // Store only URL in JSONB (50 bytes instead of 500KB)
  return { drawingUrl: url };
};
```

Compress vector data before storing in JSONB:

```typescript
import pako from 'pako';

const compressDrawingData = (data: DrawingData): string => {
  const json = JSON.stringify(data);
  const compressed = pako.deflate(json);
  // Base64 encode compressed binary
  return btoa(String.fromCharCode(...compressed));
};

const decompressDrawingData = (compressed: string): DrawingData => {
  const binary = atob(compressed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decompressed = pako.inflate(bytes, { to: 'string' });
  return JSON.parse(decompressed);
};

// Typical compression: 20KB JSON → 5KB compressed
```

Implement drawing data pagination for large canvases:

```typescript
// Split drawing into chunks to stay under JSONB limits
interface DrawingChunk {
  chunkId: string;
  strokes: Stroke[];
  bounds: { x: number; y: number; width: number; height: number };
}

const chunkDrawing = (strokes: Stroke[], chunkSize: number = 50): DrawingChunk[] => {
  const chunks: DrawingChunk[] = [];

  for (let i = 0; i < strokes.length; i += chunkSize) {
    const chunkStrokes = strokes.slice(i, i + chunkSize);
    chunks.push({
      chunkId: nanoid(),
      strokes: chunkStrokes,
      bounds: calculateBounds(chunkStrokes)
    });
  }

  return chunks;
};

// Store metadata in stepArtifacts, chunks in separate table
```

Use LZ4 compression instead of PGLZ for JSONB columns:

```typescript
// Set column storage to use LZ4 (better parallel query performance)
// In migration:
ALTER TABLE workshops
ALTER COLUMN step_artifacts
SET STORAGE EXTERNAL; -- Disable PGLZ compression

-- Let application handle compression with LZ4
```

**Warning signs:**
- Database queries slowing down as users add drawings
- Postgres TOAST compression causing save latency spikes
- Mobile users reporting slow canvas loading
- Database backup sizes growing rapidly
- Neon Postgres billing increasing unexpectedly
- Vercel function timeouts on workshops with multiple drawings
- Auto-save debounce triggering but save still taking >500ms

**Phase to address:**
Phase 1 (EzyDraw Modal Foundation) - Design storage architecture upfront: vector vs raster, JSONB vs object storage. Implement stroke simplification and compression before beta testing. Phase 2 (Mind Maps & Sketches) - Monitor database performance with real user data, optimize if queries exceed 500ms.

---

### Pitfall 4: Touch/Stylus Input Divergence from Mouse Input

**What goes wrong:**
Drawing tool works perfectly with mouse on desktop - smooth strokes, accurate positioning. User switches to iPad with Apple Pencil - strokes lag 500ms behind stylus, pressure sensitivity doesn't register. On Android tablet with S Pen, drawing triggers page scroll instead of creating strokes. Palm rejection fails - user's palm resting on iPad screen creates unwanted marks while drawing. Two-finger pinch to zoom ReactFlow canvas conflicts with drawing tool's two-finger undo gesture. Drawing with finger on iPhone works but strokes appear 40px offset from touch point. Eraser tool (inverted Apple Pencil) detected as regular pen, doesn't erase. Rotation on Surface Pro with dial creates strokes instead of rotating canvas.

**Why it happens:**
Touch, mouse, and stylus events have different APIs: `touchstart`/`touchmove`/`touchend` vs `mousedown`/`mousemove`/`mouseup` vs `pointerdown`/`pointermove`/`pointerup`. Pointer Events API unifies them but requires handling pointerType ('mouse' | 'pen' | 'touch') differently. Touch events provide touches array (multi-touch) while mouse provides single cursor - drawing code written for mouse breaks with multi-touch. Pressure sensitivity only available with Pointer Events API (`pointerEvent.pressure` 0-1 range) - touch events have no pressure, mouse events always pressure=0.5. Apple Pencil tilt/azimuth available via `pointerEvent.tiltX`, `tiltY`, `azimuthAngle` - requires checking for undefined. Palm rejection requires checking touch contact area (`pointerEvent.width`, `height`) - large contact = palm, small = finger/stylus. iOS Safari has complex preventDefault() rules: calling preventDefault() on touchstart prevents scrolling but also disables form inputs; calling on touchmove too late causes scroll to have started. Android Chrome requires `touch-action: none` CSS to prevent scroll, but this disables browser zoom which breaks accessibility. Coordinate offsets differ: mouse uses `clientX/clientY`, touch uses `touches[0].clientX`, pointer uses both - getBoundingClientRect() calculations must account for page scroll offsets. Stylus eraser (inverted Apple Pencil) triggers `pointerType: 'pen'` with `button: 5` (eraser button) - must check button codes. Surface Pro dial emits wheel events, not pointer events - separate handling required.

**How to avoid:**
Use Pointer Events API exclusively with type branching:

```typescript
const DrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Ignore palm touches (large contact area)
    if (e.width > 30 || e.height > 30) {
      return; // Likely palm
    }

    // Check for stylus eraser
    if (e.pointerType === 'pen' && e.button === 5) {
      startErasing(e);
      return;
    }

    // Normal drawing
    isDrawingRef.current = true;
    startDrawing(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    // Get pressure (0-1 range, defaults to 0.5 for mouse)
    const pressure = e.pressure || 0.5;

    // Get tilt for pen (undefined for mouse/touch)
    const tiltX = e.tiltX || 0;
    const tiltY = e.tiltY || 0;

    addStrokePoint({
      x: e.clientX - canvas.offsetLeft,
      y: e.clientY - canvas.offsetTop,
      pressure,
      tiltX,
      tiltY,
      timestamp: e.timeStamp
    });
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => isDrawingRef.current = false}
      // Prevent touch scrolling
      style={{ touchAction: 'none' }}
    />
  );
};
```

Implement proper palm rejection:

```typescript
const isPalmTouch = (e: PointerEvent): boolean => {
  // Large contact area = palm
  const area = (e.width || 0) * (e.height || 0);
  if (area > 900) return true; // 30x30 threshold

  // Multiple simultaneous touches = hand resting
  const activeTouches = getActivePointers().length;
  if (activeTouches > 2) return true;

  return false;
};

const handlePointerDown = (e: PointerEvent) => {
  if (isPalmTouch(e)) {
    e.preventDefault(); // Don't draw
    return;
  }

  startDrawing(e);
};
```

Handle iOS Safari preventDefault correctly:

```typescript
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const handleTouchStart = (e: TouchEvent) => {
    // Must preventDefault on touchstart to prevent scroll
    // But only for canvas, not for form inputs
    if (e.target === canvas) {
      e.preventDefault();
    }
  };

  // Use passive: false to allow preventDefault
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  return () => {
    canvas.removeEventListener('touchstart', handleTouchStart);
  };
}, []);
```

Accurate coordinate calculation with scroll offsets:

```typescript
const getCanvasCoordinates = (
  e: PointerEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();

  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
};

// Account for CSS transforms (zoom, rotate)
const getTransformedCoordinates = (
  e: PointerEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
};
```

Separate gesture handling for ReactFlow vs drawing:

```typescript
const DrawingModal = () => {
  const [gestureMode, setGestureMode] = useState<'draw' | 'pan'>('draw');

  const handlePointerDown = (e: PointerEvent) => {
    // Two-finger = pan gesture (for ReactFlow below modal)
    if (e.pointerType === 'touch' && getActiveTouches().length === 2) {
      setGestureMode('pan');
      return;
    }

    // Single pointer = draw
    setGestureMode('draw');
    startDrawing(e);
  };

  // Block ReactFlow pan when in draw mode
  useEffect(() => {
    if (gestureMode === 'draw') {
      disableReactFlowPan();
    } else {
      enableReactFlowPan();
    }
  }, [gestureMode]);
};
```

**Warning signs:**
- Drawing works on desktop but not on tablets
- Pressure sensitivity not registering with Apple Pencil
- Palm touches creating unwanted marks
- Touch scrolling interfering with drawing
- Coordinate offsets on mobile devices
- Eraser mode not working with inverted stylus
- Two-finger gestures triggering unintended actions

**Phase to address:**
Phase 1 (EzyDraw Modal Foundation) - Implement Pointer Events API from start, not mouse events. Test on real devices: iPad Pro with Apple Pencil, Android tablet with S Pen, Surface Pro. Phase 2 (Polish & Accessibility) - Tune palm rejection thresholds based on user feedback.

---

### Pitfall 5: Drawing Library Bundle Size Explosion

**What goes wrong:**
Add Fabric.js for drawing features - bundle size jumps from 110KB gzipped to 280KB (+155%). Initial page load on 3G mobile increases from 1.2s to 3.5s. Add Excalidraw components - another 200KB gzipped, now 480KB total. Lighthouse performance score drops from 95 to 68. Time to Interactive (TTI) increases from 2.1s to 5.8s on mobile. Users on slow connections see white screen for 6+ seconds. Vercel Edge Function cold starts increase from 200ms to 800ms due to larger bundle. Code splitting doesn't help - drawing modal is critical path (users access it within first 10 seconds), so lazy loading saves nothing. Tree shaking fails - importing one Fabric.js method pulls entire library. Dependencies cascade - Fabric.js depends on `jsdom-global` (50KB), `canvas` (native module, 15MB in node_modules). Three different canvas libraries overlap: react-konva for mind maps (80KB), Excalidraw for drawing (200KB), Fabric.js for advanced features (120KB) - 400KB total with shared dependencies.

**Why it happens:**
Drawing libraries are feature-rich, not modular. Fabric.js provides 100+ shape types, filters, serialization - but you only need free-draw brush and eraser, rest is dead code. Excalidraw is full whiteboard app (200KB minified) - importing `@excalidraw/excalidraw` component pulls entire app even if you only want drawing canvas. React-Konva wraps Konva.js (150KB) which provides comprehensive 2D canvas framework - overkill for simple mind map nodes. Libraries bundle multiple rendering backends: Canvas 2D + WebGL + SVG renderers, even if you only use one. Dependencies aren't tree-shakeable - CommonJS modules, not ES modules, prevent webpack from removing unused code. Polyfills bloat - drawing libraries polyfill browser APIs for Node.js compatibility (jsdom), adding 50-100KB. Perfect-Freehand (pressure-sensitive strokes) is small (15KB) but requires additional physics simulation library for realistic curves. Multiple color manipulation libraries - Fabric.js uses `color`, Excalidraw uses `tinycolor2`, react-konva uses `chroma-js` - all do same thing (hex to RGB), 60KB overlap. Font rendering engines for text tools - each library bundles font metrics, glyph rendering, ligatures - 40-80KB each.

**How to avoid:**
Build custom lightweight drawing canvas instead of using Excalidraw:

```typescript
// Instead of: import { Excalidraw } from '@excalidraw/excalidraw'; // +200KB

// Custom canvas with perfect-freehand (15KB)
import { getStroke } from 'perfect-freehand';

const DrawingCanvas = () => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  const renderStroke = (points: Point[], color: string) => {
    const stroke = getStroke(points, {
      size: 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5
    });

    return (
      <path
        d={getSvgPathFromStroke(stroke)}
        fill={color}
      />
    );
  };

  return (
    <svg>
      {strokes.map(s => renderStroke(s.points, s.color))}
    </svg>
  );
};

// Bundle impact: 15KB instead of 200KB
```

Use SVG for vector graphics instead of Konva for mind maps:

```typescript
// Instead of: import { Stage, Layer, Circle, Line } from 'react-konva'; // +80KB

// Native SVG with D3 force layout
const MindMapCanvas = () => {
  return (
    <svg width={800} height={600}>
      {nodes.map(node => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r={20} fill={node.color} />
          <text x={node.x} y={node.y}>{node.label}</text>
        </g>
      ))}
      {links.map(link => (
        <line
          key={link.id}
          x1={link.source.x}
          y1={link.source.y}
          x2={link.target.x}
          y2={link.target.y}
          stroke="#999"
        />
      ))}
    </svg>
  );
};

// Bundle impact: 0KB (native SVG) + 25KB (d3-force) = 25KB instead of 80KB
```

Import only needed D3 modules, not entire library:

```typescript
// BAD: import * as d3 from 'd3'; // +280KB

// GOOD: Import specific modules
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';
import { zoom } from 'd3-zoom';
import { drag } from 'd3-drag';

// Bundle impact: 35KB instead of 280KB
```

Lazy load drawing modal to defer bundle:

```typescript
// Only load drawing library when modal opens
const DrawingModal = lazy(() => import('./drawing-modal'));

const IdeationCanvas = () => {
  const [isDrawing, setIsDrawing] = useState(false);

  return (
    <>
      <button onClick={() => setIsDrawing(true)}>Draw</button>

      {isDrawing && (
        <Suspense fallback={<div>Loading drawing tools...</div>}>
          <DrawingModal onClose={() => setIsDrawing(false)} />
        </Suspense>
      )}
    </>
  );
};

// Drawing library only downloaded when user clicks "Draw"
```

Use lightweight alternatives for specific features:

```typescript
// Color manipulation: use 1KB tinycolor2 instead of 15KB color
import tinycolor from 'tinycolor2';

// Stroke simplification: use 3KB simplify-js instead of Fabric.js
import simplify from 'simplify-js';

// Path generation: use 15KB perfect-freehand instead of Fabric.js brush
import { getStroke } from 'perfect-freehand';

// Total: 19KB instead of 120KB Fabric.js
```

Measure bundle impact with webpack-bundle-analyzer:

```bash
npm install --save-dev webpack-bundle-analyzer

# In next.config.ts
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

export default {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './bundle-report.html',
          openAnalyzer: false
        })
      );
    }
    return config;
  }
};

# Run: npm run build
# Open: .next/bundle-report.html
```

**Warning signs:**
- Bundle size exceeding 150KB gzipped (current 110KB baseline)
- Lighthouse performance score dropping below 85
- Time to Interactive >3 seconds on 3G mobile
- Multiple canvas/drawing libraries in bundle
- Overlap in dependencies (color libraries, math utilities)
- Lazy loading not working due to critical path

**Phase to address:**
Phase 1 (EzyDraw Modal Foundation) - Choose lightweight libraries upfront, measure bundle impact before committing. Target: <30KB addition for drawing features. Phase 2 (Mind Maps) - Use native SVG + minimal D3, avoid react-konva. Continuous monitoring with bundle-analyzer on every PR.

---

### Pitfall 6: Mind Map Layout Algorithm Performance Degradation

**What goes wrong:**
Mind map with 5 nodes renders smoothly - layout calculates in 16ms, 60fps. Add 20 nodes - layout calculation takes 180ms, causing visible lag when dragging nodes. Add 50 nodes - force simulation takes 2+ seconds to stabilize, UI frozen. User drags central node - all connected nodes re-calculate positions, triggering 50 React re-renders, UI stutters. Zoom/pan while simulation running causes jarring position jumps - nodes "snap" to new positions mid-animation. On mobile, 30-node mind map causes browser to throttle requestAnimationFrame, reducing to 30fps. D3 force simulation runs indefinitely - alpha never reaches stopping threshold, consuming CPU even when layout stable. Multiple mind maps on canvas (nested sub-maps) each run separate simulations, compounding performance issues.

**Why it happens:**
Force-directed layout algorithms are O(n²) complexity - every node checks distance to every other node. D3's forceManyBody (repulsion) calculates n×n forces every tick. At 60fps, that's 3600 calculations/sec for 10 nodes, 90,000 calculations/sec for 50 nodes. Force simulation runs iteratively - d3.forceSimulation() uses requestAnimationFrame loop, recalculating positions every frame until alpha (energy) decays below threshold (default 0.001). Default alpha decay is 0.0228 per tick - with complex graphs, can take 300+ ticks (5 seconds at 60fps) to stabilize. React's reconciliation overhead - each simulation tick updates node positions, triggering React re-render. With 50 nodes, that's 50 component updates per frame. D3 force simulation mutates node objects directly - `node.x = newX` - but React expects immutable updates. Bridging mutable D3 with immutable React causes unnecessary re-renders. Collision detection (to prevent node overlap) adds O(n²) calculations on top of force calculations. Link force (edges between nodes) adds O(edges) calculations - dense graphs (many connections) compound performance issues. Running simulation while user interacts (drag, zoom) causes coordinate space conflicts - simulation uses one coordinate system, user interaction uses another, positions desync. Mobile devices have slower CPUs (2-4x slower than desktop) and aggressive battery optimizations - requestAnimationFrame throttled to 30fps, doubling simulation time.

**How to avoid:**
Pre-calculate layout server-side for static mind maps:

```typescript
// Server-side (Node.js API route)
import * as d3 from 'd3-force';

export async function POST(req: Request) {
  const { nodes, links } = await req.json();

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(400, 300));

  // Run simulation to completion (not in browser)
  for (let i = 0; i < 300; ++i) simulation.tick();

  return Response.json({ nodes, links });
}

// Client-side: Use pre-calculated positions
const MindMap = ({ initialNodes, initialLinks }) => {
  const [nodes] = useState(initialNodes); // Positions already calculated
  return <svg>{/* Render static layout */}</svg>;
};
```

Use progressive enhancement with animation budget:

```typescript
const useMindMapLayout = (nodes: Node[], links: Link[]) => {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  useEffect(() => {
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links))
      .force('charge', d3.forceManyBody())
      .alphaDecay(0.05) // Faster convergence
      .stop();

    // Run simulation in chunks to avoid blocking
    const ticksPerFrame = 5; // Tune based on performance
    let ticksRemaining = 100; // Budget: max 100 ticks

    const animate = () => {
      for (let i = 0; i < ticksPerFrame; i++) {
        simulation.tick();
        ticksRemaining--;
      }

      // Update React state (batched)
      setPositions(new Map(nodes.map(n => [n.id, { x: n.x!, y: n.y! }])));

      if (simulation.alpha() > 0.01 && ticksRemaining > 0) {
        requestAnimationFrame(animate);
      } else {
        simulation.stop(); // Force stop after budget
      }
    };

    animate();

    return () => simulation.stop();
  }, [nodes, links]);

  return positions;
};
```

Optimize React rendering with memoization:

```typescript
const MindMapNode = memo(({ node }: { node: Node }) => {
  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <circle r={20} fill={node.color} />
      <text>{node.label}</text>
    </g>
  );
}, (prev, next) => {
  // Only re-render if position changed significantly
  return (
    Math.abs(prev.node.x - next.node.x) < 1 &&
    Math.abs(prev.node.y - next.node.y) < 1 &&
    prev.node.label === next.node.label
  );
});

const MindMap = ({ nodes }) => (
  <svg>
    {nodes.map(node => (
      <MindMapNode key={node.id} node={node} />
    ))}
  </svg>
);
```

Use WebGL for large mind maps instead of SVG:

```typescript
// For 50+ nodes, switch to WebGL-accelerated rendering
import { Canvas, useFrame } from '@react-three/fiber';

const MindMapWebGL = ({ nodes, links }) => {
  return (
    <Canvas>
      {nodes.map(node => (
        <mesh key={node.id} position={[node.x, node.y, 0]}>
          <circleGeometry args={[20, 32]} />
          <meshBasicMaterial color={node.color} />
        </mesh>
      ))}
    </Canvas>
  );
};

// WebGL handles 1000+ nodes smoothly vs SVG's ~50 node limit
```

Pause simulation during user interaction:

```typescript
const [isDragging, setIsDragging] = useState(false);

useEffect(() => {
  if (isDragging) {
    simulation.stop(); // Pause layout while dragging
  } else {
    simulation.restart(); // Resume after drag
  }
}, [isDragging, simulation]);
```

**Warning signs:**
- Visible lag when dragging mind map nodes
- UI freezing when adding nodes to mind map
- Force simulation taking >1 second to stabilize
- Frame rate dropping below 30fps
- CPU usage spiking during mind map interactions
- Mobile devices becoming unresponsive with 20+ nodes

**Phase to address:**
Phase 2 (Mind Map Layout) - Implement performance budget (max 100ms for layout) and progressive enhancement from start. Test with 50-node mind map before shipping. Phase 3 (Performance Optimization) - Switch to WebGL if SVG proves insufficient.

---

### Pitfall 7: Undo/Redo State Conflicts Between Drawing Tool and Canvas

**What goes wrong:**
User adds 3 post-its to ReactFlow canvas, then opens drawing modal and creates sketch. Presses Cmd+Z expecting to undo last drawing stroke - instead, last post-it deletion is undone. User draws 5 strokes in modal, closes modal, adds stroke to canvas. Presses Cmd+Shift+Z to redo - drawing modal stroke redone instead of canvas action. Undo history becomes corrupted - alternating between canvas actions and drawing actions makes undo sequence nonsensical. User makes 10 drawing strokes, then 10 canvas actions. Tries to undo all canvas actions - but drawing actions interleaved, so undo jumps between canvases unpredictably. Temporal store's undo stack has 50 entries from both canvas and drawing - hitting undo limit (50 actions) causes old drawing actions to be forgotten while canvas actions remain. Drawing modal implements its own undo stack (separate from Zustand temporal), creating two undo systems with same keyboard shortcut. User expects "undo everything since opening modal" but undo operates per-action across both systems.

**Why it happens:**
Single global undo/redo stack shared between ReactFlow canvas (Zustand temporal) and drawing modal (custom undo system). Both systems register Cmd+Z keyboard handlers - last registered handler wins, but both execute, causing double undo. Zustand temporal middleware tracks ALL state changes - when drawing modal updates its state (add stroke), temporal middleware adds entry to global undo stack. Drawing strokes and canvas actions semantically different (stroke has {points, color} vs canvas action has {nodeId, position}), but temporal store treats them identically. Undo history is flat array - no concept of "context" (modal open vs canvas focused). When modal opens, canvas actions shouldn't be undoable, but temporal store still exposes them. Modal closes, drawing undo stack cleared (component unmounts), but those actions remain in temporal store - desync. Keyboard shortcuts don't check focus context - Cmd+Z fires regardless of whether modal is open or canvas is focused. React's event bubbling causes keyboard event to reach both modal and canvas components - both execute undo handlers. Multiple useHotkeys() registrations don't coordinate - each component independently registers Cmd+Z, creating race condition for which fires first.

**How to avoid:**
Implement context-aware undo system with separate stacks:

```typescript
interface UndoContext {
  type: 'canvas' | 'drawing';
  stackId: string;
}

interface UndoEntry {
  context: UndoContext;
  action: any;
  timestamp: number;
}

const useContextualUndo = () => {
  const [activeContext, setActiveContext] = useState<UndoContext | null>(null);
  const [undoStacks, setUndoStacks] = useState<Map<string, UndoEntry[]>>(new Map());

  const undo = useCallback(() => {
    if (!activeContext) return;

    const stack = undoStacks.get(activeContext.stackId);
    if (!stack || stack.length === 0) return;

    const entry = stack[stack.length - 1];
    // Execute undo for active context only
    executeUndo(entry);

    // Update stack
    setUndoStacks(prev => {
      const newStack = stack.slice(0, -1);
      return new Map(prev).set(activeContext.stackId, newStack);
    });
  }, [activeContext, undoStacks]);

  return { undo, setActiveContext };
};
```

Disable canvas undo when modal is open:

```typescript
const App = () => {
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const canvasUndo = useCanvasStore(s => s.temporal.getState().undo);

  // Only register canvas undo when modal closed
  useHotkeys('mod+z', () => {
    if (!isDrawingModalOpen) {
      canvasUndo();
    }
  }, [isDrawingModalOpen], { enableOnFormTags: false });

  return (
    <>
      <ReactFlowCanvas />
      {isDrawingModalOpen && (
        <DrawingModal
          onClose={() => setIsDrawingModalOpen(false)}
        />
      )}
    </>
  );
};
```

Drawing modal manages its own isolated undo stack:

```typescript
const DrawingModal = ({ onClose }) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  const undo = () => {
    if (undoStack.length === 0) return;

    const prevState = undoStack[undoStack.length - 1];
    setRedoStack([...redoStack, strokes]);
    setStrokes(prevState);
    setUndoStack(undoStack.slice(0, -1));
  };

  // Modal's undo only active while modal open
  useHotkeys('mod+z', undo, [], {
    enableOnFormTags: false,
    preventDefault: true // Don't let event bubble to canvas
  });

  return <div>{/* Drawing UI */}</div>;
};
```

Batch modal actions into single canvas undo entry:

```typescript
const saveDrawing = async (strokes: Stroke[]) => {
  // Convert drawing to canvas node
  const drawingNode = await renderStrokesToImage(strokes);

  // Add to canvas as single undo-able action
  addPostIt({
    text: '',
    type: 'drawing',
    drawingData: strokes,
    imageUrl: drawingNode.imageUrl,
    position: { x: 100, y: 100 }
  });

  // Now undo in canvas removes entire drawing, not individual strokes
};
```

Use hierarchical undo with sub-actions:

```typescript
interface HierarchicalUndoEntry {
  id: string;
  type: 'canvas' | 'modal';
  action: any;
  subActions?: HierarchicalUndoEntry[]; // Drawing modal's actions nested
}

const undo = () => {
  const entry = undoStack[undoStack.length - 1];

  if (entry.type === 'modal' && entry.subActions) {
    // Undo entire modal session (all strokes) as one action
    entry.subActions.forEach(subAction => executeUndo(subAction));
  } else {
    executeUndo(entry);
  }
};
```

**Warning signs:**
- Undo applying to wrong context (modal vs canvas)
- Keyboard shortcuts triggering multiple undo actions
- Undo history becoming nonsensical with mixed actions
- Users confused about what undo will undo
- Undo stack filling up with drawing actions, pushing out canvas actions
- Modal undo not working when canvas undo is active

**Phase to address:**
Phase 1 (EzyDraw Modal Foundation) - Design isolated undo architecture from start. Document undo scoping in implementation guide. Phase 2 (Integration Testing) - Test undo/redo across all contexts: canvas-only, modal-only, switching between them.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing drawing as base64 in JSONB | Simple, no external storage setup | Database bloat, slow queries, high costs | Only for MVP demo with <5 drawings total |
| Using Excalidraw full library | Feature-complete whiteboard instantly | 200KB bundle size, performance issues | Never - build custom lightweight canvas |
| Mouse-only event handlers (no touch/stylus) | Simpler code, works on desktop | Unusable on tablets, no pressure sensitivity | Only for desktop-only internal tool |
| Single global undo stack | Easier to implement | Undo conflicts between canvas and modal | Never - always scope undo per context |
| Synchronous D3 force simulation | Smooth animation on small graphs | UI freezes with >30 nodes | Only if mind maps guaranteed <20 nodes |
| Storing full-resolution drawings | Preserves quality | 500KB+ per drawing, slow loading | Never - compress to WebP 85% quality |
| No canvas cleanup on unmount | Works in development | Memory leaks in production | Never - always cleanup contexts |
| Disabling ReactFlow during drawing | Prevents event conflicts | Poor UX, can't pan canvas while drawing | Acceptable for MVP, add gesture isolation later |
| Using preventDefault() globally on touch | Prevents scroll conflicts | Breaks form inputs, accessibility issues | Never - scope preventDefault to canvas only |
| Importing entire D3 library | All features available | 280KB bundle increase | Never - import specific modules only |

---

## Integration Gotchas

Common mistakes when integrating drawing to existing WorkshopPilot.ai ReactFlow canvas.

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|------------------|
| Event Handling | Both canvases listen to same events | Disable ReactFlow interactions when modal open |
| Undo/Redo | Single global undo stack | Context-aware undo with separate stacks per canvas |
| Data Storage | Storing base64 images in JSONB | Store vector data in JSONB, raster images in object storage |
| Bundle Size | Importing full Excalidraw/Fabric.js | Build custom canvas with perfect-freehand (15KB) |
| Touch Input | Using mouse events only | Use Pointer Events API with pointerType branching |
| Mind Map Layout | Running D3 simulation synchronously | Progressive enhancement with animation budget |
| Memory Management | No canvas cleanup on unmount | Cleanup contexts, revoke blob URLs, cancel animations |
| Coordinate Systems | Mixing ReactFlow and drawing coordinates | Separate coordinate spaces, transform on integration |
| Mobile Performance | Desktop-optimized only | Test on real devices, optimize for 3G network |
| Drawing Data | Storing raw stroke arrays | Simplify strokes with Douglas-Peucker, compress with LZ4 |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Base64 images in JSONB | Fast saves initially, slow queries later | Use object storage, store only URLs in JSONB | >5 drawings per workshop |
| D3 force simulation for all mind maps | Smooth with 10 nodes, frozen with 50 | Pre-calculate layout server-side, use animation budget | >30 nodes in mind map |
| No stroke simplification | Small drawing data initially, bloated later | Apply Douglas-Peucker simplification (tolerance=2) | Strokes with >200 points |
| Synchronous rendering on pointer move | Smooth drawing initially, laggy with complex scenes | Debounce or use requestAnimationFrame | >100 strokes on canvas |
| SVG for large mind maps | Works for 20 nodes, slow for 100 | Switch to WebGL-accelerated rendering at 50+ nodes | >50 nodes |
| Global event listeners without cleanup | No issues in dev, memory leaks in prod | Use AbortController, cleanup in useEffect return | After 10+ modal open/close cycles |
| Full-resolution canvas export | Fine for 1-2 exports, slow for batch | Reduce resolution for previews, full-res on demand | Exporting >5 drawings at once |
| No compression for vector data | Small JSONB initially, exceeds TOAST limit later | Compress with pako before storing | Drawings with >100 strokes |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No size limits on drawing data | User uploads 10MB drawing, DOS database | Limit strokes to 500, points per stroke to 1000, max canvas size 2000x2000 |
| Storing user-generated SVG without sanitization | XSS via malicious SVG paths | Sanitize SVG with DOMPurify before rendering or storage |
| No rate limiting on drawing saves | Attacker spams save endpoint, exhausts DB writes | Rate limit per userId: 20 drawing saves/minute |
| Allowing external image URLs in drawings | SSRF attacks, loading malicious content | Only allow data URLs or signed object storage URLs |
| No validation of canvas dimensions | User creates 10000x10000 canvas, consumes memory | Limit max canvas size server-side: 2000x2000px |
| Exposing blob URLs publicly | Anyone with URL can access private drawings | Use signed URLs with expiration (1 hour) |
| No CORS validation on image exports | Cross-origin images taint canvas, export fails | Validate image origins, use crossorigin="anonymous" |
| Storing drawing data without compression | Leaks information about stroke count, complexity | Always compress before storage to obfuscate structure |

---

## UX Pitfalls

Common user experience mistakes when adding drawing capabilities.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Too many drawing tools overwhelming non-technical users | Cognitive overload, users give up | Progressive disclosure: Start with pen + eraser, hide advanced tools |
| No visual feedback during drawing save | User unsure if drawing saved, clicks multiple times | Show "Saving drawing..." toast with progress indicator |
| Drawing modal blocks entire canvas | User can't reference canvas while drawing | Semi-transparent modal or side-panel drawer |
| No way to edit drawing after saving | User must redraw from scratch for small changes | Store vector data, enable "edit drawing" to reopen modal |
| Pen tool selected by default on touch devices | Users accidentally draw when trying to pan | Default to pan tool on touch, require explicit tool selection |
| No indication of pressure sensitivity support | Users expect pressure but device doesn't support it | Show "Pressure sensitivity detected" or "Use stylus for pressure" |
| Drawing lost if user closes modal accidentally | Frustration, lost work | Auto-save draft in localStorage, restore on reopen |
| No undo affordance in drawing modal | Users don't know Cmd+Z works | Show undo/redo buttons with keyboard shortcuts in UI |
| Mind map nodes overlap, illegible text | Users can't read labels | Implement collision detection, auto-adjust positions |
| Crazy 8s grid doesn't explain time limit | Users confused about purpose | Show timer: "8 ideas in 8 minutes - go!" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Canvas Context Cleanup:** Often missing disposal on unmount — verify memory doesn't leak after 20+ modal open/close cycles (Chrome DevTools heap snapshot)
- [ ] **Touch Event Handling:** Often missing Pointer Events API — verify drawing works on iPad Pro, Android tablet, Surface Pro with stylus
- [ ] **Undo/Redo Context:** Often missing scope isolation — verify undo in modal doesn't affect canvas, and vice versa
- [ ] **Drawing Data Compression:** Often missing stroke simplification — verify 500-point stroke simplifies to <100 points with negligible visual difference
- [ ] **Bundle Size Monitoring:** Often missing webpack-bundle-analyzer — verify drawing features add <30KB gzipped to bundle
- [ ] **Object Storage Integration:** Often missing for images — verify drawings stored in Vercel Blob, not base64 in JSONB
- [ ] **Mind Map Performance:** Often missing animation budget — verify 50-node mind map calculates layout in <100ms
- [ ] **Event Isolation:** Often missing ReactFlow disabling — verify drawing gestures don't trigger ReactFlow pan/zoom
- [ ] **Blob URL Cleanup:** Often missing revokeObjectURL — verify blob URLs revoked after drawing export
- [ ] **Mobile Performance:** Often missing real device testing — verify drawing responsive on iPhone, iPad, Android on 3G network
- [ ] **Pressure Sensitivity:** Often missing Pointer Events pressure — verify Apple Pencil pressure affects stroke width
- [ ] **Palm Rejection:** Often missing contact area detection — verify palm resting on iPad doesn't create unwanted marks

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Event Handling Conflicts | LOW | Add isDrawingModalOpen flag to disable ReactFlow interactions (2-4 hours) |
| Canvas Memory Leaks | LOW | Implement cleanup in useEffect return, use AbortController for listeners (4-6 hours) |
| JSONB Storage Bloat | MEDIUM | Migrate to object storage, implement stroke simplification, backfill existing drawings (1-2 days) |
| Touch Input Issues | MEDIUM | Refactor to Pointer Events API, add palm rejection, test on real devices (1-2 days) |
| Bundle Size Explosion | HIGH | Replace Excalidraw with custom canvas, use perfect-freehand, tree-shake D3 (2-3 days) |
| Mind Map Performance | MEDIUM | Pre-calculate layout server-side, add animation budget, switch to WebGL if needed (1-2 days) |
| Undo/Redo Conflicts | MEDIUM | Implement context-aware undo with separate stacks, add hierarchical actions (1 day) |
| Drawing Tool Complexity | LOW | Progressive disclosure, hide advanced tools by default, add onboarding (4-6 hours) |
| No Edit After Save | MEDIUM | Store vector data alongside rendered image, implement "edit drawing" flow (1 day) |
| Mobile Drawing Lag | MEDIUM | Optimize pointer event handling, reduce stroke point density, test on real devices (1-2 days) |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Event Handling Conflicts | Phase 1: EzyDraw Modal | Drawing and ReactFlow interactions isolated, no event conflicts |
| Canvas Memory Leaks | Phase 1: EzyDraw Modal | Memory stable after 20 modal cycles, no detached contexts |
| JSONB Storage Bloat | Phase 1: EzyDraw Modal | Drawings <20KB in JSONB, images in object storage |
| Touch Input Issues | Phase 1: EzyDraw Modal | Drawing works on iPad Pro, Android, Surface Pro |
| Bundle Size Explosion | Phase 1: EzyDraw Modal | Bundle increase <30KB gzipped, Lighthouse score >85 |
| Mind Map Performance | Phase 2: Mind Maps | 50-node layout calculates in <100ms, 60fps rendering |
| Undo/Redo Conflicts | Phase 1: EzyDraw Modal | Undo scoped per context, no cross-context conflicts |
| Drawing Tool Complexity | Phase 3: UX Polish | Non-technical users complete drawing in <2 minutes |
| No Edit After Save | Phase 2: Integration | Users can edit saved drawings, vector data preserved |
| Mobile Drawing Lag | Phase 3: Mobile Optimization | Drawing responsive on 3G network, smooth on iPhone |

---

## Sources

**Drawing Libraries & Bundle Size:**
- [GitHub: konvajs/react-konva](https://github.com/konvajs/react-konva)
- [Konva Docs: Getting started with React and Canvas via Konva](https://konvajs.org/docs/react/index.html)
- [LogRocket: Best React chart libraries (2025 update)](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [Medium: React Component Libraries in 2026](https://yakhil25.medium.com/react-component-libraries-in-2026-the-definitive-guide-to-choosing-your-stack-fa7ae0368077)
- [GitHub: excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
- [GitHub: vinothpandian/react-sketch-canvas](https://github.com/vinothpandian/react-sketch-canvas)
- [Top 5 JavaScript Whiteboard & Canvas Libraries](https://byby.dev/js-whiteboard-libs)

**ReactFlow Integration:**
- [GitHub Discussion #1492: How do I implement drawing on the react-flow canvas?](https://github.com/xyflow/xyflow/discussions/1492)
- [GitHub Issue #4003: Excalidraw's canvas not usable with ReactFlow component](https://github.com/xyflow/xyflow/issues/4003)
- [GitHub Discussion #4997: Drawing using mouse in reactflow canvas](https://github.com/xyflow/xyflow/discussions/4997)
- [ReactFlow: Undo and Redo Example](https://reactflow.dev/examples/interaction/undo-redo)

**Touch & Stylus Input:**
- [Blog: Using React Native Skia to Build a 60 FPS Free-hand Drawing App](https://blog.notesnook.com/drawing-app-with-react-native-skia/)
- [GitHub Discussion #2735: Determine touch input type, finger vs stylus](https://github.com/software-mansion/react-native-gesture-handler/discussions/2735)
- [GitHub Issue #91: Issues with drawing on iOS devices](https://github.com/embiem/react-canvas-draw/issues/91)
- [Apple Developer: Handling Events - Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html)
- [GitHub Issue #3756: Free drawing on IOS disables page scrolling](https://github.com/fabricjs/fabric.js/issues/3756)
- [Medium: Fixing the Double-Tap and Hover State Issue in iOS Safari](https://medium.com/@kristiantolleshaugmrch/fixing-the-double-tap-issue-in-ios-safari-with-javascript-4e72a18a1feb)

**Memory & Performance:**
- [GitHub Issue #514: Leaking WebGLRenderer when unmounting](https://github.com/pmndrs/react-three-fiber/issues/514)
- [Medium: Understanding Memory Leaks in React](https://medium.com/@90mandalchandan/understanding-and-managing-memory-leaks-in-react-applications-bcfcc353e7a5)
- [Blog: How to fix the React memory leak warning](https://jexperton.dev/en/blog/how-to-fix-react-memory-leak-warning/)
- [Medium: The React Native Memory Leak You Don't See Until Production](https://medium.com/@silverskytechnology/the-react-native-memory-leak-you-dont-see-until-production-8d62a18d840a)
- [GitHub Issue #1475: Mount/unmount Canvas causes memory leak](https://github.com/Shopify/react-native-skia/issues/1475)

**Database Storage:**
- [pganalyze: Postgres performance cliffs with large JSONB values and TOAST](https://pganalyze.com/blog/5mins-postgres-jsonb-toast)
- [Credativ: TOASTed JSONB data in PostgreSQL - compression algorithms](https://www.credativ.de/en/blog/postgresql-en/toasted-jsonb-data-in-postgresql-performance-tests-of-different-compression-algorithms/)
- [PostgreSQL: Store base64 in database - bytea or text?](https://www.postgresql.org/message-id/AANLkTim=wp+o_PkBpa1EAP+1W_DJgV-v+C7mNZA94rwT@mail.gmail.com)
- [Heap: When To Avoid JSONB In A PostgreSQL Schema](https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema)

**Mind Map Layouts:**
- [ReactFlow: Force Layout Example](https://reactflow.dev/examples/layout/force-layout)
- [Medium: Data Visualization in Mind-map using D3.js](https://medium.com/globant/data-visualisation-in-mind-map-using-d3-js-59023aac004f)
- [Blog: Force Directed Layout for Mind Map Interfaces](https://peoplesfeelings.com/force-directed-layout-for-mind-map-interfaces/)
- [GitHub: d3/d3-force](https://github.com/d3/d3-force)
- [Observable: ES module that uses D3 Force to make a mind map](https://talk.observablehq.com/t/es-module-that-uses-d3-force-to-make-a-mind-map/5185)

**Image Optimization:**
- [Request Metrics: How to Optimize Website Images (2026 Guide)](https://requestmetrics.com/web-performance/high-performance-images/)
- [VectoSolve: SVG Optimization Techniques Every Developer Should Know in 2026](https://vectosolve.com/blog/svg-optimization-techniques-developers-2026)
- [The CSS Agency: JPG Vs. PNG Vs. WEBP Vs. AVIF - Best Web Image Format for 2026](https://www.thecssagency.com/blog/best-web-image-format)

**Two-Canvas Architecture:**
- [Litten: Using Multiple HTML5 Canvases as Layers](https://html5.litten.com/using-multiple-html5-canvases-as-layers/)
- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Dustin Pfister: Canvas layers the basics and more](https://dustinpfister.github.io/2019/07/01/canvas-layer/)
- [DeepWiki: Excalidraw Rendering System](https://deepwiki.com/excalidraw/excalidraw/5-rendering-and-export)

**UX Design Patterns:**
- [Eleken: 12 Bad UX Examples](https://www.eleken.co/blog-posts/bad-ux-examples)
- [NN/g: Design Patterns For Complex Apps and Workflows](https://www.nngroup.com/videos/complex-apps-workflows/)
- [NN/g: UX Strategies for Complex-Application Design](https://www.nngroup.com/articles/strategies-complex-application-design/)
- [Full Clarity: Reducing cognitive overload in UX design](https://fullclarity.co.uk/insights/cognitive-overload-in-ux-design/)
- [Design Sprint Kit: Crazy 8's](https://designsprintkit.withgoogle.com/methodology/phase3-sketch/crazy-8s)
- [Miro: FREE Crazy Eights Template](https://miro.com/templates/crazy-eights/)
- [Codecademy: UI and UX Design - Crazy Eights](https://www.codecademy.com/resources/docs/uiux/crazy-eights)

**Undo/Redo State Management:**
- [Medium: Undo/Redo Functionality in React](https://medium.com/@conboys111/undo-redo-functionality-in-react-a-step-by-step-guide-ae8e78d712ed)
- [Konva: How to implement undo/redo on canvas with React?](https://konvajs.org/docs/react/Undo-Redo.html)
- [CSS Script: Framework-Agnostic Undo/Redo History Management - Reddo.js](https://www.cssscript.com/undo-redo-history-management/)
- [Redux: Implementing Undo History](https://redux.js.org/usage/implementing-undo-history)
- [Kapwing: How to Implement Undo in a React + Redux Application](https://www.kapwing.com/blog/how-to-implement-undo-in-a-react-redux-application/)

**Existing WorkshopPilot Research:**
- .planning/research/PITFALLS.md (Grid/Swimlane Canvas - previous pitfalls research)
- .planning/codebase/ARCHITECTURE.md (Current system architecture)
- .planning/codebase/STACK.md (Current technology stack)

---

*Pitfalls research for: Adding Drawing Capabilities to ReactFlow Canvas (WorkshopPilot.ai Steps 8 & 9)*
*Researched: 2026-02-12*
*Confidence: MEDIUM-HIGH — Based on official documentation, GitHub issues, community experiences, and existing v1.2 Canvas Whiteboard learnings. Drawing-specific patterns verified through Excalidraw, react-sketch-canvas, and canvas memory management research.*

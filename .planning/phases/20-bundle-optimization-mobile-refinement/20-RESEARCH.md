# Phase 20: Bundle Optimization & Mobile Refinement - Research

**Researched:** 2026-02-11
**Domain:** Next.js bundle optimization, Web Vitals performance measurement, ReactFlow mobile touch, mobile viewport handling
**Confidence:** HIGH

## Summary

Phase 20 validates production performance and refines mobile experience for the ReactFlow canvas. The research confirms Next.js 16.1+ provides built-in bundle optimization through automatic code splitting, tree-shaking, and the new Turbopack Bundle Analyzer. The 300KB target for the canvas route is achievable with proper code splitting and lazy loading. First Contentful Paint under 2s on 3G is measurable using Lighthouse's simulated throttling (1.6 Mbps bandwidth, 150ms RTT). ReactFlow supports touch devices through the Pointer Events API, but iOS Safari requires passive event listeners (`{ passive: false }`) for preventDefault to work. Mobile viewport scaling needs careful coordinate transformation using `screenToFlowPosition` and viewport meta tags to prevent iOS Safari's dynamic toolbar from breaking layout.

The primary challenges are bundle analysis (moved from per-route to whole-app in Next.js 16), mobile touch event conflicts (iOS Safari changed preventDefault behavior in iOS 11.3+), and viewport coordinate scaling (100vh doesn't account for iOS Safari's collapsing toolbar). ReactFlow's built-in touch support handles most cases, but canvas interaction during scrolling requires explicit passive listener configuration.

**Primary recommendation:** Use Next.js experimental-analyze (Turbopack Bundle Analyzer) for bundle size validation, implement Lighthouse CI with 3G throttling for FCP measurement, configure ReactFlow with explicit touch handling, and test mobile viewport scaling with real iOS Safari and Android Chrome devices.

## Standard Stack

### Core Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| **Next.js Bundle Analyzer** | Next.js 16.1+ (experimental) | Bundle size analysis and visualization | Official Next.js tool integrated with Turbopack module graph. Replaces per-route stats (removed in v16). Provides precise import tracing to identify large dependencies. |
| **@next/bundle-analyzer** | Latest | Webpack bundle analysis (fallback) | npm package for Webpack-based analysis if Turbopack analyzer insufficient. Generates visual treemap reports for client/server bundles. |
| **Lighthouse** | Chrome DevTools built-in | Performance measurement and FCP testing | Industry standard for Web Vitals measurement. Supports simulated 3G throttling (1.6 Mbps, 150ms RTT) for mobile network conditions. |
| **Chrome DevTools Device Mode** | Chrome built-in | Mobile viewport testing and touch simulation | Official Chrome mobile emulation with device presets (iPhone, Android), orientation control, and network throttling. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **web-vitals** | Latest (npm package) | Client-side performance monitoring | Track real-user FCP in production. Handles edge cases like background tabs and back/forward cache. Use instead of raw Paint Timing API. |
| **@vercel/analytics** | 1.6.1 (existing) | Production performance tracking | Already installed. Captures Web Vitals from real users. Integrates with Vercel dashboard for performance monitoring. |
| **react-hotkeys-hook** | 5.2.4 (existing) | Keyboard shortcuts that work with forms | Already used for canvas undo/redo. Supports `enableOnFormTags: false` to avoid conflicts with text inputs. |

### Installation

**No new dependencies required.** All tools are built-in or already installed:

```bash
# Bundle analysis (no install needed - built into Next.js 16.1+)
npx next experimental-analyze

# Alternative Webpack analyzer (if needed)
npm install --save-dev @next/bundle-analyzer

# Performance monitoring (already installed)
npm list @vercel/analytics web-vitals
# Expected: @vercel/analytics@1.6.1, web-vitals dependency included
```

**Bundle Size Targets:**
- Canvas route total: <300KB (gzipped)
- @xyflow/react: ~200KB minified, ~60KB gzipped (from Phase 15 research)
- Remaining budget: ~240KB for other dependencies (React 19, Zustand, Framer Motion, etc.)

## Architecture Patterns

### Pattern 1: Bundle Size Analysis with Turbopack Analyzer

**What:** Next.js 16.1+ includes experimental Bundle Analyzer integrated with Turbopack's module graph. Replaces removed per-route bundle statistics.

**When to use:** Validating canvas route bundle size against 300KB target. Identifying large dependencies for optimization.

**Implementation:**

```bash
# Run interactive bundle analyzer
npx next experimental-analyze

# Filter by route and environment
# UI allows filtering: route = "/workshop/[id]/step/[stepId]"
#                     environment = "client"
#                     type = "JavaScript"

# Export analysis for CI/CD comparison
npx next experimental-analyze --output
# Writes to .next/diagnostics/analyze

# Save baseline for regression detection
cp -r .next/diagnostics/analyze ./analyze-baseline

# Compare after optimization
diff -r ./analyze-baseline .next/diagnostics/analyze
```

**Alternative: Webpack Bundle Analyzer (if Turbopack insufficient)**

```javascript
// next.config.ts
import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* existing config */
};

export default withBundleAnalyzer(nextConfig);
```

```bash
# Generate report
ANALYZE=true npm run build

# Opens three tabs: client.html, edge.html, nodejs.html
# Check client.html for canvas route bundle size
```

**Key points:**
- Turbopack analyzer provides import chain tracing (find what pulled in large dependency)
- Webpack analyzer shows treemap visualization (easier to spot size outliers)
- Target canvas route client bundle: <300KB total
- ReactFlow alone is ~200KB minified, ~60KB gzipped
- Other dependencies (React, Zustand, Framer Motion) must fit in remaining budget

**Source:** [Next.js Package Bundling Guide](https://nextjs.org/docs/app/guides/package-bundling), [@next/bundle-analyzer npm](https://www.npmjs.com/package/@next/bundle-analyzer)

---

### Pattern 2: Code Splitting with next/dynamic

**What:** Lazy load heavy components to reduce initial bundle size. Canvas already uses this for ReactFlow (Phase 15).

**When to use:** When bundle analysis reveals large libraries that aren't needed immediately.

**Current Implementation (already in place):**

```typescript
// src/components/canvas/canvas-wrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { CanvasLoadingSkeleton } from './canvas-loading-skeleton';

const ReactFlowCanvas = dynamic(
  () => import('./react-flow-canvas').then((mod) => mod.ReactFlowCanvas),
  { ssr: false, loading: () => <CanvasLoadingSkeleton /> }
);
```

**Additional Optimization Opportunities:**

```typescript
// Lazy load color picker (not needed until right-click)
const ColorPicker = dynamic(
  () => import('./color-picker').then(mod => mod.ColorPicker),
  { ssr: false }
);

// Lazy load heavy libraries in event handlers
const handleImportJSON = async () => {
  const { parse } = await import('some-heavy-library');
  // Use parse...
};
```

**Key points:**
- Canvas already uses `ssr: false` for ReactFlow (correct pattern from Phase 15)
- Additional dynamic imports should target rarely-used features
- Avoid over-splitting: too many chunks increase HTTP requests
- Target: libraries >20KB minified that aren't used immediately

**Source:** [Next.js Lazy Loading Guide](https://nextjs.org/docs/pages/guides/lazy-loading), [Next.js 14.2 Tree-Shaking Optimization](https://nextjs.org/blog/next-14-2)

---

### Pattern 3: Optimizing Package Imports

**What:** Next.js `optimizePackageImports` option loads only the modules you use from large libraries with hundreds of exports (icon libraries, utility libraries).

**When to use:** When importing from libraries like `lucide-react` (546 icons), `lodash` (hundreds of utilities), or similar.

**Implementation:**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
```

**Current Usage Analysis:**

```typescript
// src/components/canvas/canvas-toolbar.tsx likely imports icons
import { Plus, Undo, Redo, Users } from 'lucide-react';
```

lucide-react v0.546.0 has 546 icons. Without optimization, entire library (~500KB) could be bundled.

**Key points:**
- Next.js auto-optimizes some libraries (check [full list](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports))
- lucide-react may already be optimized (verify in bundle analyzer)
- Explicit configuration ensures optimization even if not in auto-list
- No code changes needed - configuration only

**Source:** [Next.js optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports), [How We Optimized Package Imports](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)

---

### Pattern 4: First Contentful Paint Measurement

**What:** Measure FCP using Lighthouse with simulated 3G throttling to validate <2s target.

**When to use:** Performance validation during deployment and in CI/CD pipeline.

**Implementation:**

**Local Testing (Chrome DevTools):**

```bash
# 1. Open Chrome DevTools (F12)
# 2. Navigate to Lighthouse tab
# 3. Configure:
#    - Device: Mobile
#    - Throttling: Simulated throttling (default)
#    - Clear storage: Checked (for accurate cold start)
# 4. Click "Analyze page load"
# 5. Check "First Contentful Paint" metric
#    - Target: <2.0s (Good)
#    - Acceptable: 2.0-4.0s (Needs Improvement)
#    - Poor: >4.0s (Fail)
```

**Lighthouse Configuration (3G Throttling):**

Lighthouse uses "Slow 4G" profile by default (formerly "Fast 3G"):
- Bandwidth: 1.6 Mbps down, 750 Kbps up
- Latency: 150ms RTT
- CPU: 4x slowdown

This represents bottom 25% of 4G and top 25% of 3G connections.

**CI/CD Integration (Lighthouse CI):**

```bash
# Install Lighthouse CI
npm install --save-dev @lhci/cli

# Create lighthouserc.json
cat > lighthouserc.json <<EOF
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/workshop/test-session/step/step-03"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttlingMethod": "simulate",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638,
          "cpuSlowdownMultiplier": 4
        }
      }
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["warn", {"maxNumericValue": 5000}]
      }
    }
  }
}
EOF

# Run in CI
npm run build
npm run start &
npx lhci autorun
```

**Key points:**
- Simulated throttling is faster and more consistent than applied throttling
- 3 runs recommended (take median to reduce variance)
- FCP target: <2.0s at 75th percentile
- Test canvas route specifically, not just homepage
- Real device testing on iOS Safari and Android Chrome still required (DevTools can't replicate all mobile behaviors)

**Source:** [First Contentful Paint (web.dev)](https://web.dev/articles/fcp), [Lighthouse Throttling Documentation](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md), [Simulated Throttling Explained](https://www.debugbear.com/blog/simulated-throttling)

---

### Pattern 5: ReactFlow Mobile Touch Configuration

**What:** ReactFlow uses Pointer Events API for touch support. Works on iOS Safari and Android Chrome, but requires specific configuration for optimal mobile experience.

**When to use:** Ensuring canvas drag, pan, and zoom work correctly on mobile devices.

**Current Implementation (already in place):**

```typescript
// src/components/canvas/react-flow-canvas.tsx
<ReactFlow
  // ... other props
  panOnDrag={true}
  zoomOnScroll={true}
  zoomOnPinch={true}
  selectionOnDrag={true}
/>
```

**Mobile-Specific Optimizations:**

```typescript
// Increase handle size for touch (Phase 15 already implements this)
// src/components/canvas/post-it-node.tsx
<Handle
  type="target"
  position={Position.Top}
  style={{
    width: '20px',
    height: '20px',
    opacity: 0, // Hidden for Phase 20, visible in Phase 18 (edges)
  }}
/>
```

**CSS for Touch Target Size:**

```css
/* Already implemented in post-it-node.tsx styles */
.react-flow__handle {
  width: 20px;
  height: 20px;
}

/* Ensure nodes are large enough for touch */
.post-it-node {
  min-width: 120px;
  min-height: 120px;
  touch-action: none; /* Prevents iOS Safari scroll conflicts */
}
```

**Passive Event Listener Configuration (iOS Safari fix):**

```typescript
// If touch conflicts occur (e.g., canvas drag triggers page scroll)
useEffect(() => {
  const handleTouchMove = (e: TouchEvent) => {
    // Prevent page scroll when touching canvas
    e.preventDefault();
  };

  const canvas = document.querySelector('.react-flow');
  if (canvas) {
    // CRITICAL: { passive: false } required for preventDefault on iOS Safari 11.3+
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => canvas.removeEventListener('touchmove', handleTouchMove);
  }
}, []);
```

**Key points:**
- ReactFlow uses Pointer Events API (works on all modern browsers)
- Handle size: 20px minimum for touch (already implemented)
- `touch-action: none` prevents iOS Safari scroll conflicts
- Passive listeners: iOS Safari requires `{ passive: false }` for preventDefault
- Test on real devices: iOS Safari 16+, Android Chrome latest

**Warning:** React's synthetic `onTouchMove` with preventDefault doesn't work on iOS Safari. Must use addEventListener with `{ passive: false }` directly on DOM element.

**Source:** [ReactFlow Touch Device Example](https://reactflow.dev/examples/interaction/touch-device), [iOS Safari preventDefault Fix](https://pqina.nl/blog/how-to-prevent-scrolling-the-page-on-ios-safari), [React preventDefault Issue on iOS](https://github.com/facebook/react/issues/20999)

---

### Pattern 6: Mobile Viewport Scaling & Coordinates

**What:** Convert screen coordinates to canvas coordinates accounting for viewport transformations, zoom, and mobile viewport quirks.

**When to use:** Double-click to create post-its, drag handling, ensuring touch coordinates map correctly to canvas positions.

**Current Implementation (already correct):**

```typescript
// src/components/canvas/react-flow-canvas.tsx
const { screenToFlowPosition } = useReactFlow();

const createPostItAtPosition = useCallback(
  (clientX: number, clientY: number) => {
    // ReactFlow handles viewport transform, zoom, and pan
    const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });
    const snappedPosition = snapToGrid(flowPosition);
    // ...
  },
  [screenToFlowPosition, snapToGrid]
);
```

**Mobile Viewport Meta Tag (required):**

```html
<!-- src/app/layout.tsx -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

**iOS Safari Viewport Height Fix:**

```css
/* Use dvh (dynamic viewport height) instead of vh for iOS Safari */
.canvas-container {
  height: 100dvh; /* Falls back to 100vh on older browsers */
}

/* Fallback for browsers without dvh support */
@supports not (height: 100dvh) {
  .canvas-container {
    height: 100vh;
    height: calc(var(--vh, 1vh) * 100); /* JavaScript fallback */
  }
}
```

```typescript
// JavaScript fallback for --vh custom property (if needed)
useEffect(() => {
  const updateVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  updateVh();
  window.addEventListener('resize', updateVh);
  return () => window.removeEventListener('resize', updateVh);
}, []);
```

**Key points:**
- ReactFlow's `screenToFlowPosition` handles most coordinate transforms
- Viewport meta tag prevents iOS Safari zoom on double-tap
- `dvh` (dynamic viewport height) accounts for iOS Safari collapsing toolbar
- Test on real devices: iOS Safari's viewport behavior differs from desktop
- Android Chrome uses standard viewport units (less problematic than iOS)

**Source:** [Mobile Viewport Configuration (Apple)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html), [iOS Mobile Viewport Units Guide](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a), [ReactFlow Viewport Concepts](https://reactflow.dev/learn/concepts/the-viewport)

---

### Pattern 7: ReactFlow Performance Optimization

**What:** Prevent unnecessary re-renders during mobile interactions (drag, pinch-zoom).

**When to use:** Ensuring smooth 60fps performance on mobile devices.

**Current Implementation (already optimized):**

```typescript
// src/components/canvas/react-flow-canvas.tsx

// 1. nodeTypes defined outside component (stable reference)
const nodeTypes = {
  postIt: PostItNode,
  group: GroupNode,
};

// 2. PostItNode memoized with React.memo
export const PostItNode = memo(({ data, selected }: NodeProps<PostItNodeData>) => {
  // ...
});

// 3. Event handlers memoized with useCallback
const handleNodeDragStop = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    updatePostIt(node.id, { position: node.position });
  },
  [updatePostIt]
);

// 4. nodes array memoized with useMemo
const nodes = useMemo<Node[]>(() => {
  return postIts.map((postIt) => ({
    id: postIt.id,
    type: postIt.type || 'postIt',
    // ...
  }));
}, [postIts, editingNodeId, handleTextChange, handleEditComplete]);
```

**Additional Mobile-Specific Optimizations:**

```typescript
// Reduce style complexity for nodes on mobile
const isDesktop = window.matchMedia('(min-width: 768px)').matches;

<div
  className={cn(
    'post-it-node',
    // Simpler shadows on mobile (less GPU work)
    isDesktop ? 'shadow-lg hover:shadow-xl' : 'shadow-md'
  )}
>
```

**Key points:**
- Current implementation follows all ReactFlow performance best practices
- nodeTypes stable reference: prevents full ReactFlow re-render
- React.memo on custom nodes: prevents re-render when siblings update
- useCallback/useMemo: prevents new function references triggering re-renders
- Mobile: reduce CSS complexity (shadows, gradients, animations)

**Source:** [ReactFlow Performance Guide](https://reactflow.dev/learn/advanced-use/performance), [Optimize ReactFlow Project Performance](https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b)

---

### Pattern 8: Chrome DevTools Mobile Testing

**What:** Use Chrome DevTools Device Mode to simulate mobile devices before testing on real hardware.

**When to use:** Initial mobile testing, viewport debugging, touch event verification.

**Implementation:**

```bash
# 1. Open Chrome DevTools (F12)
# 2. Click device toggle toolbar icon (Cmd+Shift+M on Mac)
# 3. Select device from dropdown:
#    - iPhone 14 Pro (iOS Safari simulation)
#    - Pixel 7 (Android Chrome simulation)
# 4. Test features:
#    - Touch interactions (click = tap)
#    - Pinch zoom (shift + drag)
#    - Orientation (rotate icon)
#    - Network throttling (Mid-tier mobile = Fast 3G + 4x CPU)
# 5. Verify:
#    - Canvas drag works with touch
#    - Double-tap creates post-it (not zoom)
#    - Pinch-zoom zooms canvas
#    - Coordinates map correctly (post-its appear where tapped)
```

**Limitations:**
- DevTools can't replicate iOS Safari touch event quirks perfectly
- Real device testing still required for final validation
- GPU rendering differs from real mobile devices
- Network throttling is approximate

**Key points:**
- Use DevTools for rapid iteration
- Test real iOS Safari and Android Chrome for final validation
- Mid-tier mobile throttling: Fast 3G (1.6 Mbps) + 4x CPU slowdown
- Verify viewport scaling, touch coordinates, and scroll conflicts

**Source:** [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode), [Simulate Mobile Devices with Chrome DevTools](https://www.debugbear.com/docs/chrome-devtools-device-mode)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle size analysis | Custom webpack stats parsing, manual file size scripts | Next.js experimental-analyze or @next/bundle-analyzer | Next.js analyzers provide module graph, import chains, treemap visualization, and CI-friendly output. Custom scripts miss transitive dependencies and shared chunks. |
| Performance measurement | Custom timing APIs, manual FCP calculation | Lighthouse + web-vitals library | Lighthouse handles edge cases: back/forward cache, background tabs, prerender, unload time. Raw Performance API misses these nuances. web-vitals library is 75th percentile compliant with Google standards. |
| Mobile touch coordinate transformation | Manual viewport calculations with getBoundingClientRect | ReactFlow's screenToFlowPosition | ReactFlow accounts for viewport zoom, pan, transform matrix, and nested coordinate spaces. Manual calculation breaks with zoom or transform changes. |
| 3G network throttling | Custom proxy servers, network shaping tools | Lighthouse simulated throttling | Simulated throttling is faster (no actual network delay), more consistent (no variance), and CI-friendly. Applied throttling requires infrastructure and produces flaky tests. |
| iOS viewport height fixes | Custom JavaScript resize listeners, complex CSS hacks | CSS dvh (dynamic viewport height) unit | dvh is native CSS solution for iOS Safari collapsing toolbar. Fallback to JavaScript only for older browsers. Custom solutions cause layout thrashing and jank. |

**Key insight:** Bundle optimization and performance measurement are mature problem domains with official tools from Next.js, Chrome, and React. Custom solutions miss edge cases that took years to discover and fix in production. The "don't hand-roll" principle applies strongly here — use the official tools, even if they're experimental (like Turbopack analyzer).

## Common Pitfalls

### Pitfall 1: Bundle Size Regression Without Monitoring

**What goes wrong:** New dependency added (e.g., date formatting library), bundle size jumps from 250KB to 450KB, but no one notices until production is slow.

**Why it happens:** Next.js 16 removed per-route bundle statistics from build output. Teams rely on manual analysis which is forgotten during rapid development.

**How to avoid:**
1. Run bundle analyzer on every PR (CI/CD check)
2. Set bundle size budget in Lighthouse CI config
3. Use GitHub Actions to comment bundle diff on PRs
4. Document bundle budget in README: "Canvas route <300KB"

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check
on: [pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx next experimental-analyze --output
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

**Warning signs:**
- Build output doesn't show bundle sizes
- No automated bundle size checks in CI
- Developers unaware of bundle size budget
- Production FCP suddenly increases after deployment

**Source:** [Next.js Bundle Size Monitoring Lost](https://www.catchmetrics.io/blog/nextjs-developers-lost-bundle-size-visibility), [Bundle Size CI/CD](https://circleci.com/blog/ci-cd-with-vercel/)

---

### Pitfall 2: iOS Safari Touch Event preventDefault Doesn't Work

**What goes wrong:** Canvas drag triggers page scroll on iOS Safari. Code uses `event.preventDefault()` in `onTouchMove` handler, but scroll still happens.

**Why it happens:** iOS Safari 11.3+ requires `{ passive: false }` when adding touch listeners. React's synthetic events default to passive, so preventDefault is ignored.

**How to avoid:**
1. Use native addEventListener (not React synthetic events) for touchmove
2. Add `{ passive: false }` option explicitly
3. Add listener to canvas element, not document (better specificity)
4. Add `touch-action: none` CSS as additional safeguard

```typescript
// WRONG: React synthetic event (doesn't work on iOS Safari)
<div onTouchMove={(e) => e.preventDefault()}>

// CORRECT: Native addEventListener with passive: false
useEffect(() => {
  const canvas = document.querySelector('.react-flow');
  const handler = (e: TouchEvent) => e.preventDefault();
  canvas?.addEventListener('touchmove', handler, { passive: false });
  return () => canvas?.removeEventListener('touchmove', handler);
}, []);
```

**Warning signs:**
- Touch drag works on desktop Chrome but not iOS Safari
- Console warning: "preventDefault inside passive event listener"
- Page scrolls when dragging post-its on mobile
- DevTools emulation works, but real iPhone doesn't

**Source:** [React preventDefault Bug on iOS](https://github.com/facebook/react/issues/20999), [iOS Safari preventDefault Not Working](https://bugs.webkit.org/show_bug.cgi?id=182521), [How to Prevent Scrolling on iOS Safari](https://pqina.nl/blog/how-to-prevent-scrolling-the-page-on-ios-safari)

---

### Pitfall 3: Mobile Viewport Coordinates Off by iOS Toolbar Height

**What goes wrong:** User double-taps bottom of screen on iOS Safari, post-it appears 44px higher than expected. Coordinates off by exactly the Safari toolbar height.

**Why it happens:** iOS Safari's dynamic toolbar collapses/expands during scroll. 100vh is calculated based on maximum viewport height (toolbar hidden), but clientY coordinates are relative to visible viewport (toolbar shown). Mismatch causes coordinate offset.

**How to avoid:**
1. Use CSS dvh (dynamic viewport height) instead of vh
2. ReactFlow's screenToFlowPosition accounts for viewport, but CSS container needs dvh
3. Test with iOS Safari toolbar visible AND hidden
4. Add viewport meta tag to prevent iOS double-tap zoom

```css
/* Use dvh for canvas container */
.canvas-container {
  height: 100dvh; /* Dynamic viewport height (accounts for iOS toolbar) */
}

/* Fallback for browsers without dvh support */
@supports not (height: 100dvh) {
  .canvas-container {
    height: 100vh;
  }
}
```

```html
<!-- Prevent iOS double-tap zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

**Warning signs:**
- Post-its appear offset on iOS Safari but not Android Chrome
- Offset changes when scrolling (iOS toolbar hides/shows)
- Offset is approximately 44-88px (iOS toolbar heights)
- Works in Chrome DevTools but not real iPhone

**Source:** [iOS Safari Mobile Resizing Bug Fix](https://medium.com/@krutilin.sergey.ks/fixing-the-safari-mobile-resizing-bug-a-developers-guide-6568f933cde0), [Mobile Viewport Units Guide (svh, lvh, dvh)](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a), [iOS Viewport Configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html)

---

### Pitfall 4: Lighthouse Scores Vary Wildly Between Runs

**What goes wrong:** FCP measures 1.8s on first run, 3.2s on second run, 2.1s on third run. Can't determine if target is met.

**Why it happens:** Lighthouse simulated throttling estimates performance based on unthrottled load. Variance in network conditions, background processes, or CPU load affects estimation accuracy. Single runs are unreliable.

**How to avoid:**
1. Run Lighthouse 3-5 times, take median (not average)
2. Use consistent test environment (same network, no background processes)
3. Clear storage before each run (accurate cold start)
4. Use Lighthouse CI for automated testing (handles multiple runs)
5. Test on Vercel preview deployments (consistent server performance)

```javascript
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 5, // Run 5 times, take median
      "settings": {
        "preset": "desktop",
        "throttlingMethod": "simulate"
      }
    }
  }
}
```

**Warning signs:**
- FCP varies by >500ms between runs
- Scores differ between local and CI
- Performance "regresses" after no code changes
- Metrics jump around during same session

**Source:** [Lighthouse Throttling Explained](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md), [Why Lighthouse Score Differs from PageSpeed Insights](https://www.debugbear.com/blog/why-is-my-lighthouse-score-different-from-pagespeed-insights)

---

### Pitfall 5: Tree-Shaking Doesn't Work on Side-Effect Imports

**What goes wrong:** Added `import 'some-library/styles.css'` to component. Bundle analyzer shows entire library bundled, not just CSS.

**Why it happens:** Side-effect imports (CSS, polyfills, global scripts) tell bundler "this file has side effects, don't tree-shake it." Entire module and its dependencies get included.

**How to avoid:**
1. Import CSS in component files, not at module level
2. Use CSS Modules or Tailwind instead of global styles
3. Check package.json's `sideEffects` field before importing
4. Prefer libraries with ESM exports (better tree-shaking than CommonJS)

```typescript
// WRONG: Side-effect import bundles entire library
import 'react-flow/dist/style.css'; // Entire library bundled

// CORRECT: Named imports tree-shake properly
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css'; // Only CSS, library tree-shakes

// BEST: CSS Modules or Tailwind (no external CSS)
import styles from './canvas.module.css';
```

**Warning signs:**
- Bundle includes libraries you only imported CSS from
- Tree-shaking seems not to work despite ESM imports
- Bundle analyzer shows unexpected dependencies
- Size jumps significantly after adding "just CSS"

**Source:** [Next.js Tree-Shaking](https://nextjs.org/blog/next-14-2), [Webpack Tree Shaking Guide](https://webpack.js.org/guides/tree-shaking/)

## Code Examples

### Example 1: Bundle Analysis Script for CI/CD

```bash
#!/bin/bash
# scripts/analyze-bundle.sh
# Run in CI/CD to check bundle size against target

set -e

echo "Building production bundle..."
npm run build

echo "Analyzing bundle size..."
npx next experimental-analyze --output

ANALYZE_DIR=".next/diagnostics/analyze"

if [ ! -d "$ANALYZE_DIR" ]; then
  echo "Error: Bundle analysis failed"
  exit 1
fi

# Extract canvas route size (simplified - real implementation needs JSON parsing)
# This is a placeholder - actual implementation would parse the analysis JSON
CANVAS_BUNDLE_SIZE_KB=280

TARGET_SIZE_KB=300

if [ "$CANVAS_BUNDLE_SIZE_KB" -gt "$TARGET_SIZE_KB" ]; then
  echo "❌ Canvas route bundle size ($CANVAS_BUNDLE_SIZE_KB KB) exceeds target ($TARGET_SIZE_KB KB)"
  exit 1
else
  echo "✅ Canvas route bundle size ($CANVAS_BUNDLE_SIZE_KB KB) within target ($TARGET_SIZE_KB KB)"
fi

# Optional: Upload to artifact storage for regression comparison
if [ -n "$CI" ]; then
  cp -r "$ANALYZE_DIR" "./bundle-analysis-$(git rev-parse --short HEAD)"
fi
```

**Source:** Adapted from [Next.js Bundle Analyzer CLI](https://nextjs.org/docs/app/guides/package-bundling)

---

### Example 2: Lighthouse CI Configuration

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/workshop/test-session-id/step/step-03"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "mobile",
        "throttlingMethod": "simulate",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638,
          "requestLatencyMs": 150,
          "downloadThroughputKbps": 1638,
          "uploadThroughputKbps": 750,
          "cpuSlowdownMultiplier": 4
        },
        "emulatedFormFactor": "mobile",
        "screenEmulation": {
          "mobile": true,
          "width": 375,
          "height": 667,
          "deviceScaleFactor": 2
        }
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "first-contentful-paint": [
          "error",
          {
            "maxNumericValue": 2000,
            "aggregationMethod": "median-run"
          }
        ],
        "interactive": [
          "warn",
          {
            "maxNumericValue": 5000,
            "aggregationMethod": "median-run"
          }
        ],
        "total-byte-weight": [
          "warn",
          {
            "maxNumericValue": 300000
          }
        ]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**Usage:**

```bash
# Install Lighthouse CI
npm install --save-dev @lhci/cli

# Run locally
npm run build
npm run start &
npx lhci autorun

# Run in CI (GitHub Actions)
# .github/workflows/lighthouse.yml
```

**Source:** [Lighthouse CI Configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)

---

### Example 3: iOS Safari Touch Event Fix

```typescript
// src/hooks/use-prevent-scroll-on-canvas.ts
'use client';

import { useEffect } from 'react';

/**
 * Prevents page scroll when touching canvas on iOS Safari.
 * CRITICAL: Uses native addEventListener with { passive: false }
 * because React synthetic events don't support preventDefault on iOS.
 */
export function usePreventScrollOnCanvas(canvasSelector: string = '.react-flow') {
  useEffect(() => {
    const canvas = document.querySelector(canvasSelector);

    if (!canvas) return;

    const handleTouchMove = (e: TouchEvent) => {
      // Only prevent if touch is on canvas (not on child elements like buttons)
      const target = e.target as HTMLElement;
      if (target.closest('.react-flow__node') || target.closest('.canvas-toolbar')) {
        return; // Allow node/toolbar touch events
      }

      // Prevent page scroll when panning canvas
      e.preventDefault();
    };

    // CRITICAL: { passive: false } required for preventDefault on iOS Safari 11.3+
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [canvasSelector]);
}
```

**Usage:**

```typescript
// src/components/canvas/react-flow-canvas.tsx
function ReactFlowCanvasInner({ sessionId, stepId, workshopId }: ReactFlowCanvasProps) {
  // Prevent iOS Safari page scroll when panning canvas
  usePreventScrollOnCanvas('.react-flow');

  // ... rest of component
}
```

**Source:** [iOS Safari preventDefault Fix](https://pqina.nl/blog/how-to-prevent-scrolling-the-page-on-ios-safari), [React preventDefault Bug](https://github.com/facebook/react/issues/20999)

---

### Example 4: Mobile Viewport Height Fix

```typescript
// src/app/layout.tsx (add to <head>)
export const metadata: Metadata = {
  // ... existing metadata
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1, // Prevent iOS double-tap zoom
  },
};
```

```css
/* src/app/globals.css */

/* Use dynamic viewport height (dvh) for iOS Safari */
.canvas-container {
  /* Modern browsers: dvh accounts for iOS Safari collapsing toolbar */
  height: 100dvh;
}

/* Fallback for browsers without dvh support (2024 and earlier) */
@supports not (height: 100dvh) {
  .canvas-container {
    height: 100vh;
  }

  /* JavaScript fallback for very old browsers */
  .canvas-container {
    height: calc(var(--vh, 1vh) * 100);
  }
}

/* Prevent iOS Safari bounce scroll */
html, body {
  overscroll-behavior: none;
}
```

```typescript
// src/hooks/use-viewport-height.ts (JavaScript fallback for old browsers)
'use client';

import { useEffect } from 'react';

/**
 * Sets --vh CSS variable for browsers without dvh support.
 * Only needed for iOS Safari <15.4 or Android <92.
 */
export function useViewportHeight() {
  useEffect(() => {
    // Check if browser supports dvh
    const supportsDvh = CSS.supports('height', '100dvh');
    if (supportsDvh) return; // Modern browser, no fallback needed

    const updateVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    updateVh();
    window.addEventListener('resize', updateVh);
    window.addEventListener('orientationchange', updateVh);

    return () => {
      window.removeEventListener('resize', updateVh);
      window.removeEventListener('orientationchange', updateVh);
    };
  }, []);
}
```

**Source:** [Mobile Viewport Units Guide](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a), [Fixing Safari Mobile Resizing Bug](https://medium.com/@krutilin.sergey.ks/fixing-the-safari-mobile-resizing-bug-a-developers-guide-6568f933cde0)

---

### Example 5: Next.js Config for Bundle Optimization

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize large icon libraries (lucide-react has 546+ icons)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Optional: Bundle analyzer for development
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze/client.html',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),
};

export default nextConfig;
```

**Usage:**

```bash
# Use Turbopack analyzer (recommended for Next.js 16.1+)
npx next experimental-analyze

# Or use Webpack analyzer
ANALYZE=true npm run build
open .next/analyze/client.html
```

**Source:** [Next.js optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports), [Webpack Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-route bundle statistics in build output | Next.js experimental-analyze (Turbopack Bundle Analyzer) | Next.js 16.0 (October 2024) | Per-route stats removed as "unreliable and unfixable." New analyzer provides module graph and import tracing instead. Teams must explicitly run analyzer. |
| Applied network throttling (real delay) | Simulated throttling (estimation) | Lighthouse v5+ (2019) | Simulated throttling is faster, more consistent, and CI-friendly. Applied throttling deprecated in Lighthouse v10+ (2023). |
| 100vh for viewport height | 100dvh (dynamic viewport height) | CSS spec update (2022), iOS Safari 15.4+ (2022) | dvh accounts for iOS Safari collapsing toolbar. Old approach causes 44-88px coordinate offset on iOS. Requires JavaScript fallback for older browsers. |
| React synthetic touch events | Native addEventListener with passive: false | iOS Safari 11.3 (2018) | iOS Safari made touch listeners passive by default. React synthetic events don't support passive option, so preventDefault doesn't work. Must use native API. |
| Lighthouse scores on Good/Needs Improvement/Poor scale | Core Web Vitals 75th percentile | Google Core Web Vitals (2020) | Performance measured at 75th percentile of real users, not single test run. Lighthouse CI requires multiple runs (median) to approximate. |

**Deprecated/outdated:**
- **Per-route bundle statistics:** Removed in Next.js 16, use experimental-analyze instead
- **Applied throttling in Lighthouse:** Deprecated in v10+ (2023), use simulated throttling
- **100vh for mobile height:** Doesn't account for iOS toolbar, use 100dvh (requires iOS Safari 15.4+)
- **React onTouchMove preventDefault:** Doesn't work on iOS Safari 11.3+, use native addEventListener
- **Single Lighthouse run:** Unreliable variance, use 3-5 runs with median aggregation

**Source:** [Next.js Bundle Size Monitoring Lost](https://www.catchmetrics.io/blog/nextjs-developers-lost-bundle-size-visibility), [Lighthouse Throttling Changelog](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md), [iOS Safari Touch Events Bug](https://bugs.webkit.org/show_bug.cgi?id=182521), [CSS dvh Specification](https://www.w3.org/TR/css-values-4/#viewport-relative-lengths)

## Open Questions

### 1. ReactFlow Bundle Size with Current Dependencies

**What we know:** ReactFlow (@xyflow/react) is ~200KB minified, ~60KB gzipped (from Phase 15 research estimate). Current implementation also uses:
- React 19 + React DOM (~135KB minified)
- Zustand + Zundo (~10KB minified)
- Framer Motion (~100KB minified)
- lucide-react (546 icons, potentially 500KB if not tree-shaken)

**What's unclear:** Exact gzipped size of canvas route client bundle with all dependencies. Does it exceed 300KB target?

**Recommendation:**
- Run `npx next experimental-analyze` on current codebase
- Check canvas route (workshop/[id]/step/[stepId]) client bundle
- If exceeds 300KB: investigate Framer Motion usage (can animations be CSS-only?)
- Verify lucide-react tree-shaking (should only bundle imported icons)

**Medium confidence — requires actual measurement.**

---

### 2. iOS Safari Touch Conflicts with ReactFlow

**What we know:** ReactFlow uses Pointer Events API (works on iOS). iOS Safari requires `{ passive: false }` for preventDefault. Canvas already has `touch-action: none` CSS.

**What's unclear:** Does current implementation have touch conflicts on iOS Safari? Does page scroll when panning canvas? Does double-tap zoom interfere with post-it creation?

**Recommendation:**
- Test on real iPhone (iOS Safari 16+) during implementation
- Verify: canvas pan doesn't trigger page scroll
- Verify: double-tap creates post-it (not iOS zoom)
- Add native touch listener with `{ passive: false }` only if conflicts occur

**Low confidence — requires real device testing.**

---

### 3. Lighthouse FCP Score on Vercel vs Local

**What we know:** Lighthouse measures FCP with simulated 3G throttling. Neon Postgres has cold start latency (500ms-5s). Canvas route loads data from database on server.

**What's unclear:** Does Neon cold start delay affect FCP measurement? Is 2s target achievable with cold start, or only warm start?

**Recommendation:**
- Run Lighthouse on Vercel preview deployment (real Neon connection)
- Test both: cold start (first load) and warm start (subsequent loads)
- If cold start exceeds 2s: consider edge caching or skeleton loading
- Target: warm start <2s (most users), cold start <4s (acceptable)

**Medium confidence — requires production-like environment testing.**

---

### 4. Mobile Device Coverage for Testing

**What we know:** Success criteria requires testing on iOS Safari and Android Chrome. Browser market share: Safari ~20% (iOS), Chrome ~65% (Android + desktop).

**What's unclear:** Which specific iOS and Android versions to test? Should we test tablets (iPad, Galaxy Tab)?

**Recommendation:**
- Minimum coverage: iPhone 13+ (iOS Safari 16+), Pixel 6+ (Android Chrome 120+)
- Optional: iPad (larger viewport, different interaction patterns)
- Use BrowserStack or Sauce Labs for automated mobile testing in CI
- Real device testing recommended for final validation

**Low confidence — business decision on device coverage.**

## Sources

### Primary (HIGH confidence)

**Next.js Official Documentation:**
- [Package Bundling Guide](https://nextjs.org/docs/app/guides/package-bundling) - Bundle optimization, tree-shaking, analyzer
- [Lazy Loading Guide](https://nextjs.org/docs/pages/guides/lazy-loading) - next/dynamic with ssr: false
- [Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) - Performance optimization strategies
- [optimizePackageImports Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) - Icon library optimization

**Web Vitals & Performance:**
- [First Contentful Paint (web.dev)](https://web.dev/articles/fcp) - FCP definition, targets, optimization
- [Largest Contentful Paint (web.dev)](https://web.dev/articles/lcp) - LCP relationship to FCP
- [Core Web Vitals (Google)](https://developers.google.com/search/docs/appearance/core-web-vitals) - Official metrics definition

**Lighthouse Documentation:**
- [Lighthouse Throttling Guide](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md) - Simulated vs applied throttling, 3G settings
- [First Contentful Paint (Lighthouse)](https://developer.chrome.com/docs/lighthouse/performance/first-contentful-paint) - FCP measurement methodology

**ReactFlow Official Documentation:**
- [Touch Device Example](https://reactflow.dev/examples/interaction/touch-device) - Touch support configuration
- [Performance Guide](https://reactflow.dev/learn/advanced-use/performance) - Memoization, optimization best practices
- [Viewport Concepts](https://reactflow.dev/learn/concepts/the-viewport) - screenToFlowPosition API

**Chrome DevTools:**
- [Device Mode Guide](https://developer.chrome.com/docs/devtools/device-mode) - Mobile emulation, throttling, touch simulation

**iOS Safari Documentation:**
- [Viewport Configuration (Apple)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html) - Viewport meta tags, iOS behavior
- [Handling Touch Events (Apple)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html) - Touch event APIs

### Secondary (MEDIUM confidence)

**Bundle Optimization:**
- [Next.js 14.2 Tree-Shaking Optimization](https://nextjs.org/blog/next-14-2) - Boundary tree-shaking, 51% reduction example
- [How We Optimized Package Imports (Vercel)](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) - Icon library optimization case study
- [Next.js Bundle Size Monitoring Lost](https://www.catchmetrics.io/blog/nextjs-developers-lost-bundle-size-visibility) - Next.js 16 changes, mitigation strategies

**Performance Measurement:**
- [Simulated Throttling Explained (DebugBear)](https://www.debugbear.com/blog/simulated-throttling) - How Lighthouse estimation works
- [PageSpeed Insights vs Lighthouse (DebugBear)](https://www.debugbear.com/blog/why-is-my-lighthouse-score-different-from-pagespeed-insights) - Score variance causes
- [First Contentful Paint Guide (Catchpoint)](https://www.catchpoint.com/core-web-vitals/first-contentful-paint) - Optimization best practices

**Mobile Touch & Viewport:**
- [iOS Safari preventDefault Fix (PQINA)](https://pqina.nl/blog/how-to-prevent-scrolling-the-page-on-ios-safari) - Passive listener solution
- [React preventDefault Bug on iOS](https://github.com/facebook/react/issues/20999) - Known React issue, workarounds
- [Mobile Viewport Units Guide](https://medium.com/@tharunbalaji110/understanding-mobile-viewport-units-a-complete-guide-to-svh-lvh-and-dvh-0c905d96e21a) - svh, lvh, dvh explained
- [Fixing Safari Mobile Resizing Bug](https://medium.com/@krutilin.sergey.ks/fixing-the-safari-mobile-resizing-bug-a-developers-guide-6568f933cde0) - Viewport height fix patterns

**ReactFlow Performance:**
- [Optimize ReactFlow Project Performance](https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b) - Memoization patterns, style optimization
- [ReactFlow Mobile Support Discussion](https://github.com/xyflow/xyflow/discussions/2403) - Community mobile patterns

### Tertiary (LOW confidence)

**CI/CD Integration:**
- [CI/CD with Vercel (CircleCI)](https://circleci.com/blog/ci-cd-with-vercel/) - Bundle size monitoring in pipelines
- [Lighthouse CI Configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) - Automated performance testing

**Mobile Testing:**
- [Chrome DevTools Device Mode (DebugBear)](https://www.debugbear.com/docs/chrome-devtools-device-mode) - Device simulation limitations
- [Simulate Mobile Devices with Chrome](https://www.browserstack.com/guide/view-mobile-version-of-website-on-chrome) - Testing best practices

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Official Next.js, Chrome DevTools, Lighthouse tools
- Bundle optimization: **HIGH** - Next.js official docs, experimental-analyze verified
- Performance measurement: **HIGH** - Web.dev official guidance, Lighthouse verified
- Mobile touch: **MEDIUM-HIGH** - ReactFlow official docs, iOS Safari workarounds community-verified
- Viewport scaling: **MEDIUM-HIGH** - CSS spec verified, iOS Safari quirks well-documented

**Research date:** 2026-02-11
**Valid until:** 2026-04-11 (60 days — stable performance domain, slow-moving)

**Note:** This research builds on Phase 15 (canvas infrastructure) and assumes ReactFlow is already implemented with SSR safety, dynamic imports, and Zustand state management. Focus is on production performance validation, not initial implementation.

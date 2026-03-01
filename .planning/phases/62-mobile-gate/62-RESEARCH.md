# Phase 62: Mobile Gate - Research

**Researched:** 2026-03-01
**Domain:** Client-side device detection, sessionStorage persistence, full-screen overlay UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-screen edge-to-edge overlay (not a centered card/modal)
- Solid background using brand color palette — feels intentional, not like an error
- Desktop/laptop illustration to visually communicate "use a bigger screen"
- Friendly nudge tone — warm, approachable, not apologetic or blocking
- Headline: direct recommendation style — "WorkshopPilot works best on desktop"
- Body: one brief sentence explaining WHY (canvas and AI tools need a larger screen)
- CTA hierarchy: "Email this link to myself" as primary button, "Continue anyway" as secondary text link below
- No apology framing — confident and helpful
- Primary action: "Email this link to myself" button (mailto link)
- Subject line includes workshop name + "continue on desktop" (e.g. "Continue your workshop on desktop — WorkshopPilot")
- Body includes URL + brief context ("Open this link on your desktop to continue your workshop")
- Secondary action: "Copy link" small text/icon option for users who prefer Slack, notes, etc.
- Gate fully disappears after "Continue anyway" — no persistent banner or reminder
- Dismissal stored in sessionStorage — once per browser session, covers all workshop steps
- New tab or new browser session shows the gate again
- No special mobile layout after dismissal — workshop renders as-is (best-effort)
- Trigger on coarse pointer + viewport < 1024px (includes small tablets in portrait mode)
- Only on workshop step pages — not landing, dashboard, or pricing

### Claude's Discretion
- Exact illustration style/asset for the desktop visual
- Specific brand colors and typography for the overlay
- Animation/transition when overlay appears and dismisses
- Exact copy wording (following the decided tone and style)
- How to handle edge cases like landscape phones or browser resize

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOBI-01 | Phone users (<768px + coarse pointer) see a dismissible "best on desktop" overlay | NOTE: CONTEXT.md locked detection at coarse pointer + viewport <1024px; `window.matchMedia` with `(pointer: coarse) and (max-width: 1023px)` covers this. The REQUIREMENTS.md states <768px but CONTEXT.md expands this to <1024px — use CONTEXT.md as the locked decision. |
| MOBI-02 | Overlay dismissal persists for the browser session (sessionStorage) | `sessionStorage.setItem('wp_mobile_gate_dismissed', '1')` — project already uses sessionStorage in guest-join-flow.tsx with identical pattern. |
| MOBI-03 | Gate applies only to workshop pages (not landing, dashboard, pricing) | Gate component inserted into `workshop/[sessionId]/layout.tsx` — this layout wraps all workshop/step, workshop/results, and workshop/outputs routes. Scope is correct by route hierarchy. |
| MOBI-04 | Email-to-self CTA with mailto: link containing current URL | `mailto:?subject=...&body=...` with `window.location.href` on client side. Dynamic URL requires client component. |
</phase_requirements>

## Summary

Phase 62 is a pure client-side UX gate. There is no backend work, no new API routes, no database schema changes. The entire implementation is a single new React client component (`MobileGate`) inserted into the existing `workshop/[sessionId]/layout.tsx`, which already serves as the shared wrapper for all workshop step pages.

The detection strategy uses two CSS media query signals: `(pointer: coarse)` to identify touch-primary devices, and `max-width: 1023px` to catch phones and portrait-mode small tablets (the locked decision from CONTEXT.md expands the original 768px threshold to 1024px). Both conditions must be true simultaneously using a single `window.matchMedia` call. The gate is only shown once per browser session, using `sessionStorage` — a pattern already established in this codebase at `src/app/join/[token]/guest-join-flow.tsx`.

The overlay component must be a `'use client'` component because it reads `window.matchMedia`, `sessionStorage`, and `window.location.href` — all browser-only APIs. The parent `workshop/[sessionId]/layout.tsx` is a server component, so the gate inserts as a client component child. This avoids SSR mismatch via a `useEffect` + `useState` pattern (initially hidden, then shown after client hydration if conditions are met). The existing `PaywallOverlay` and `SessionEndedOverlay` components demonstrate the established full-screen overlay pattern in this project.

**Primary recommendation:** Create `src/components/workshop/mobile-gate.tsx` as a `'use client'` component using `useEffect`/`useState` for SSR-safe detection, embed it as the first child in `workshop/[sessionId]/layout.tsx`, and use `fixed inset-0 z-[200]` positioning with `olive-900` / `neutral-olive-950` background to match brand palette.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (built-in) | 19.2.0 | `useState`, `useEffect` for client-side detection | Already in project; no new deps |
| Tailwind CSS | 4.x | Styling the overlay | Already in project; all other overlays use Tailwind |
| lucide-react | 0.546.0 | Icons (Monitor/laptop illustration fallback if no SVG asset) | Already in project; used throughout |
| framer-motion | 12.33.0 | Entry/exit animation (Claude's discretion — subtle fade-in) | Already in project; design ethos calls for "subtle and purposeful" animations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `window.matchMedia` | Browser API | Composite coarse+width detection | Only browser-native option; no wrapper library needed |
| `sessionStorage` | Browser API | Persist dismissal for current browser session | Already used in codebase for guest-join flow |
| `navigator.clipboard` | Browser API | "Copy link" secondary action | Available in modern browsers; fallback to document.execCommand if needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.matchMedia` | `useIsMobile` hook (exists at `src/hooks/use-mobile.ts`) | The existing hook only checks width at 768px — does NOT check pointer type. For this gate we need BOTH conditions and a 1024px threshold. Do NOT use the existing hook. |
| Inline SVG illustration | Lucide `Monitor` icon | Icon is simpler but less visually compelling; design calls for a desktop/laptop illustration — use inline SVG or a static asset in `/public` |
| framer-motion | CSS transitions | Either works; framer-motion is already present and the design ethos explicitly recommends it for animations |

**Installation:**
```bash
# No new packages needed — all dependencies already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/workshop/
│   ├── mobile-gate.tsx          # NEW: client component, full-screen overlay
│   ├── paywall-overlay.tsx      # REFERENCE: existing full-screen overlay pattern
│   └── session-ended-overlay.tsx # REFERENCE: fixed inset-0 z-[100] pattern
└── app/workshop/[sessionId]/
    └── layout.tsx               # MODIFIED: add <MobileGate> as first child in return
```

### Pattern 1: SSR-Safe Client Detection with `useEffect`
**What:** Delay gate evaluation to after hydration to avoid SSR mismatch. The server renders nothing (hidden state); the client checks conditions on mount.
**When to use:** Any component that reads browser-only APIs (`window`, `navigator`, `sessionStorage`)
**Example:**
```typescript
// src/components/workshop/mobile-gate.tsx
'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'wp_mobile_gate_dismissed';

export function MobileGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check sessionStorage first — already dismissed this session
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // sessionStorage blocked (private mode edge case) — don't show gate
      return;
    }

    // Detect: coarse pointer AND viewport < 1024px
    const mq = window.matchMedia('(pointer: coarse) and (max-width: 1023px)');
    if (mq.matches) {
      setShow(true);
    }
    // Note: no event listener needed — gate is session-scoped, resize after load is out of scope
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Ignore — gate will reappear but this is acceptable
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-neutral-olive-950 dark:bg-neutral-olive-950">
      {/* content */}
    </div>
  );
}
```

### Pattern 2: Insertion Point in Workshop Layout (Server Component)
**What:** The `workshop/[sessionId]/layout.tsx` is a server component. Insert `<MobileGate>` as the FIRST element inside the outermost `<div>`, before `SidebarProvider`. This ensures the overlay sits above all workshop content regardless of nested z-index stacking contexts.
**When to use:** When a client component needs to overlay a server-rendered layout.
**Example:**
```typescript
// In workshop/[sessionId]/layout.tsx
import { MobileGate } from '@/components/workshop/mobile-gate';

return (
  <>
    <MobileGate />   {/* Client component — renders null on server, evaluates on mount */}
    <SidebarProvider defaultOpen={false}>
      {/* existing layout content */}
    </SidebarProvider>
  </>
);
```

**Alternative insertion:** Could also be injected from within the `<SidebarProvider>` JSX as a sibling before the flex div. Either works — the `fixed` positioning means DOM position doesn't affect visual layering.

### Pattern 3: mailto Link Construction
**What:** Build a pre-filled mailto URL using `encodeURIComponent` on subject and body strings, with `window.location.href` for the current URL.
**When to use:** Email-to-self CTA that pre-fills subject and body.
**Example:**
```typescript
function buildMailtoUrl(workshopName?: string): string {
  const url = window.location.href;
  const subject = encodeURIComponent(
    `Continue your workshop on desktop — WorkshopPilot`
  );
  const body = encodeURIComponent(
    `Open this link on your desktop to continue your workshop:\n\n${url}`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}
```
**Note:** The workshop name/title is NOT passed as a prop to `MobileGate` in the layout — the layout has session title available. The mailto subject should include it. Options:
- Pass `workshopName` as a prop to `MobileGate` (simplest — the layout already has `session.workshop.title`)
- Read from URL only (simpler, less informative subject line)

**Recommendation:** Accept an optional `workshopName?: string` prop. The layout already reads `session.workshop.title` for `WorkshopHeader`.

### Pattern 4: sessionStorage with Try/Catch
**What:** Wrap sessionStorage in try/catch because some browsers block storage in private browsing or with strict security policies. This matches the existing pattern in `guest-join-flow.tsx`.
**When to use:** Always, when using sessionStorage/localStorage in this codebase.
**Example (from existing `guest-join-flow.tsx` lines 65-78):**
```typescript
try {
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  // ... use stored value
} catch {
  // sessionStorage unavailable — fall through to default behavior
}
```

### Pattern 5: Copy Link Fallback
**What:** "Copy link" secondary action using `navigator.clipboard.writeText()`. Gracefully degrade if clipboard API is unavailable.
**Example:**
```typescript
async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    // Show brief "Copied!" feedback (inline state, not toast — overlay is already shown)
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // Clipboard API blocked — silently fail or show fallback text
  }
}
```

### Anti-Patterns to Avoid
- **Checking mobile in RSC/layout server side:** `headers()` can give user-agent, but user-agent sniffing is notoriously unreliable for distinguishing mobile/tablet and doesn't detect coarse pointer. Always detect client-side.
- **Using the existing `useIsMobile` hook:** It uses a 768px breakpoint only, no pointer check. This gate needs `<1024px AND coarse pointer`. Create a dedicated detection inside the component.
- **Using `localStorage` instead of `sessionStorage`:** Locked decision — sessionStorage scopes to tab/session. localStorage would suppress the gate indefinitely across all sessions.
- **`z-index` below existing overlays:** `SessionEndedOverlay` uses `z-[100]`. MobileGate should use `z-[200]` to sit above everything including session-ended states.
- **Reacting to window resize after mount:** The detection is intentionally not reactive. The gate shows based on the state at load time. No resize listener is needed — this is consistent with the locked "no special mobile layout" decision.
- **Hydration mismatch:** Never render the overlay during SSR. The `useState(false)` + `useEffect` pattern ensures the server renders `null` and the client evaluates after mount.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pointer type detection | Custom touch detection heuristics | `window.matchMedia('(pointer: coarse)')` | Browser native, reliable, matches CSS media query behavior |
| sessionStorage persistence | Custom cookie or in-memory state | `sessionStorage.setItem/getItem` | Already established pattern in codebase; scopes correctly to tab session |
| Clipboard write | Manual `document.execCommand('copy')` | `navigator.clipboard.writeText()` | Modern standard; execCommand deprecated |
| Animation | Custom CSS keyframes | `framer-motion` `AnimatePresence` + `motion.div` | Already in project; design ethos explicitly calls for framer-motion |

**Key insight:** This phase is almost entirely composition — the hard problems (overlay z-index patterns, sessionStorage patterns, client detection patterns) are all already solved in this codebase. The work is applying existing patterns to a new component.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch
**What goes wrong:** Server renders the overlay visible, client renders it hidden (or vice versa), causing React hydration error.
**Why it happens:** `window.matchMedia` and `sessionStorage` are browser-only. If called during SSR/render phase, they throw or return wrong values.
**How to avoid:** Initialize `useState(false)` and move ALL detection logic into `useEffect`. The server always renders `null`, the client evaluates on mount. This is identical to the existing `useIsMobile` hook pattern.
**Warning signs:** React hydration warnings in console; component flashing on load.

### Pitfall 2: sessionStorage in Private Browsing
**What goes wrong:** `sessionStorage.getItem()` throws `SecurityError` in some browsers under strict privacy settings.
**Why it happens:** Some browsers disable storage APIs in private/incognito mode.
**How to avoid:** Wrap ALL sessionStorage calls in try/catch. On error, fail open (don't show gate) rather than crashing. Match existing pattern from `guest-join-flow.tsx`.
**Warning signs:** Uncaught `SecurityError` in production logs from iOS Safari private browsing.

### Pitfall 3: Wrong Scope — Gate Appearing on Non-Workshop Pages
**What goes wrong:** Gate appears on dashboard, landing page, or pricing.
**Why it happens:** If MobileGate is inserted into the root layout (`app/layout.tsx`) instead of the workshop layout.
**How to avoid:** Insert ONLY in `src/app/workshop/[sessionId]/layout.tsx`. This layout wraps all `/workshop/[sessionId]/*` routes (step, results, outputs) — and nothing outside that tree.
**Warning signs:** Gate visible when testing dashboard on mobile devtools.

### Pitfall 4: mailto Subject/Body Encoding
**What goes wrong:** Special characters in workshop name break the mailto link (e.g., `&`, `#`, `?` in workshop name corrupt the URL).
**Why it happens:** mailto body/subject must be percent-encoded.
**How to avoid:** Always use `encodeURIComponent()` on both subject and body strings, not just the URL.
**Warning signs:** Email opens with truncated subject or missing body in mail client.

### Pitfall 5: Landscape Phone Edge Case
**What goes wrong:** User rotates phone to landscape, viewport width exceeds 1024px, gate doesn't trigger — then they rotate back and it still doesn't show (sessionStorage might have been set, or detection is not reactive).
**Why it happens:** Detection is intentionally non-reactive (no resize listener), and landscape phones at 812px+ width would exceed the 1024px threshold anyway.
**How to avoid:** This is explicitly in "Claude's Discretion" — accept the behavior. No resize listener is the correct choice per locked decisions ("no special mobile layout after dismissal"). Document the known behavior.
**Warning signs:** Not a bug — this is accepted scope.

### Pitfall 6: Z-Index Stacking Context Conflicts
**What goes wrong:** Gate appears behind `SidebarProvider`, `Sheet`, or `Dialog` components.
**Why it happens:** Elements with `transform`, `will-change`, or their own stacking contexts can trap fixed children inside them.
**How to avoid:** Insert `<MobileGate />` as a sibling OUTSIDE `<SidebarProvider>`, not nested inside it. The gate's `fixed` positioning escapes normal flow but can still be trapped by ancestor stacking contexts. Placing it as a React Fragment sibling to `<SidebarProvider>` at the layout root avoids this.
**Warning signs:** Gate renders in DOM but is hidden behind other elements.

## Code Examples

Verified patterns from existing codebase:

### sessionStorage pattern (from `src/app/join/[token]/guest-join-flow.tsx`)
```typescript
const SESSION_STORAGE_KEY = 'wp_guest_name';

// Read
try {
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as StoredGuestName;
    // use parsed
  }
} catch {
  // sessionStorage unavailable — continue without persistence
}

// Write
try {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ name, workshopId }));
} catch {
  // sessionStorage unavailable — continue without persistence
}
```

### Full-screen fixed overlay pattern (from `src/components/workshop/session-ended-overlay.tsx`)
```typescript
<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
  {/* content */}
</div>
```

**For MobileGate:** Use `z-[200]` (above session-ended at z-[100]) and solid background (`bg-neutral-olive-950` or similar brand-dark color) — not `bg-background/95` since this is an intentional full-screen gate, not a semi-transparent overlay.

### matchMedia for combined conditions
```typescript
// Single matchMedia call for compound conditions — more efficient than two separate queries
const mq = window.matchMedia('(pointer: coarse) and (max-width: 1023px)');
if (mq.matches) {
  // mobile device
}
```

### MobileGate insertion in WorkshopLayout
```typescript
// src/app/workshop/[sessionId]/layout.tsx
import { MobileGate } from '@/components/workshop/mobile-gate';

return (
  <>
    <MobileGate workshopName={session.workshop.title || 'your workshop'} />
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full">
        {/* existing layout unchanged */}
      </div>
    </SidebarProvider>
  </>
);
```

### framer-motion fade entry (matches existing project usage)
```typescript
import { AnimatePresence, motion } from 'framer-motion';

// In component JSX:
<AnimatePresence>
  {show && (
    <motion.div
      className="fixed inset-0 z-[200] ..."
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* content */}
    </motion.div>
  )}
</AnimatePresence>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| User-agent sniffing for mobile detection | `(pointer: coarse)` CSS media query | ~2018 (CSS Media Queries Level 4) | More reliable; detects touch capability, not device string |
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | ~2018 (Clipboard API) | async, permission-aware, modern standard |
| `localStorage` for cross-session dismissal | `sessionStorage` for tab-scoped dismissal | Project decision (locked) | Gate reappears in new sessions/tabs |

**Deprecated/outdated:**
- User-agent sniffing: Do not use `navigator.userAgent` to detect mobile — it's unreliable and easily spoofed.
- `document.execCommand('copy')`: Deprecated in modern browsers. Use `navigator.clipboard.writeText()` with async/await.

## Open Questions

1. **Desktop illustration asset source**
   - What we know: Design calls for a desktop/laptop illustration to visually communicate "use a bigger screen."
   - What's unclear: Whether to use an inline SVG, an image file in `/public`, or a Lucide icon composite. No design assets have been created yet.
   - Recommendation: Use an inline SVG of a laptop/monitor outline in brand colors (olive palette) to avoid an external image request and keep it theme-aware. Alternatively, a large Lucide `Monitor` icon at `h-24 w-24` with `text-olive-300` is simpler and consistent with existing icon usage.

2. **Results and Outputs pages — should gate apply?**
   - What we know: CONTEXT.md says "only on workshop step pages." STATE.md says "scoped to workshop/[sessionId]/layout.tsx." The layout.tsx wraps step, results, AND outputs routes.
   - What's unclear: Whether results (`/workshop/[sessionId]/results`) and outputs (`/workshop/[sessionId]/outputs`) should be gated. They use the same parent layout but are not "step pages."
   - Recommendation: Since the gate lives in the layout, it will also gate results and outputs. The STATE.md decision says "layout.tsx only" — this is correct scope. The requirement says "workshop pages" not just "step pages." Accept this: results and outputs are also canvas-heavy and benefit from the gate. No special casing needed.

3. **Copy Link — async clipboard API permission**
   - What we know: `navigator.clipboard.writeText()` requires user gesture and permissions-policy `clipboard-write` on some browsers.
   - What's unclear: Whether Vercel's deployment has restrictions on clipboard-write permission policy.
   - Recommendation: Wrap in try/catch (already recommended). If clipboard fails, show a fallback text input with the URL pre-selected. This is safe-to-ship without verifying first; the try/catch handles it gracefully.

## Sources

### Primary (HIGH confidence)
- Codebase: `src/app/join/[token]/guest-join-flow.tsx` — sessionStorage pattern with try/catch
- Codebase: `src/components/workshop/session-ended-overlay.tsx` — `fixed inset-0 z-[100]` full-screen overlay pattern
- Codebase: `src/components/workshop/paywall-overlay.tsx` — `'use client'` + `useEffect` overlay pattern
- Codebase: `src/hooks/use-mobile.ts` — `window.matchMedia` + `useState/useEffect` SSR-safe pattern
- Codebase: `src/app/workshop/[sessionId]/layout.tsx` — insertion point, available props (`session.workshop.title`)
- Codebase: `src/app/globals.css` — olive and neutral-olive color palette values
- Codebase: `package.json` — confirms framer-motion 12.33.0, lucide-react 0.546.0 already installed

### Secondary (MEDIUM confidence)
- CSS Media Queries Level 4 spec: `(pointer: coarse)` — widely supported in all modern browsers (Chrome 41+, Firefox 64+, Safari 9+)
- MDN: `window.matchMedia` + compound queries with `and` operator — standard since CSS3 media queries

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in package.json; no new dependencies required
- Architecture: HIGH — insertion point verified in layout.tsx source; overlay pattern verified from two existing examples (paywall-overlay, session-ended-overlay)
- Pitfalls: HIGH — sessionStorage pitfalls verified from existing codebase pattern; hydration mismatch pitfall verified from use-mobile.ts pattern; z-index values verified from session-ended-overlay.tsx

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain — browser APIs and project patterns don't change frequently)

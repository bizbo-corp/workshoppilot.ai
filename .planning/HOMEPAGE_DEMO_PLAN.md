# Plan: Animated PROCESS Section on a /landing-v4 Test Page

> **Paste this into Claude in a fresh worktree.** It's a self-contained brief — assume you (Claude) are starting cold in the WorkshopPilot.ai repo. Read `CLAUDE.md` and the relevant `.planning/codebase/*.md` first, then follow this.

## Goal

Build a **new `/landing-v4` test route that is a clone of the live homepage** (`src/app/page.tsx`) — same hero, same sections, same copy — but with **only the PROCESS section replaced** by lightweight, animated lookalike product UI: animated sticky notes filling a faux canvas, a simulated AI chat dialogue, and a build-pack preview. The visitor should feel "this is what I'll be using and what I'll get" from a scripted ~8–12s performance, shown in the real page context.

`/landing-v4` is the **isolation sandbox** — the live homepage at `src/app/page.tsx` is NOT touched until this is approved. Figma mockups will be provided for the new section's visuals — match them.

## What "the PROCESS section" is (the ONLY thing that changes)

In `src/app/page.tsx` it's the **"How It Works"** block, currently lines ~231–293:

- Section comment: `{/* ── How It Works ─────── */}`
- Eyebrow label: **"Process"** (`text-olive-600` uppercase tracking-widest)
- Heading: *"Three steps. One session. A complete blueprint."*
- Body: a static 3-step ruled layout (`01 Describe Your Idea`, `02 AI Runs the Workshop`, `03 Walk Away Build-Ready`).

**Replace this entire `<section>` with `<ProductDemo />`.** Keep the eyebrow/heading treatment consistent with the rest of the page (reuse the same "Process" eyebrow + a serif `<h2>`), so the animated demo reads as an upgraded version of the same section — same vertical rhythm (`py-24 sm:py-32`, `border-t border-border`, `max-w-6xl` container). Every other section (hero, deliverables, testimonials, pricing, footer, etc.) stays byte-for-byte identical to the live homepage.

## Step 1 — clone the homepage to /landing-v4

The repo already has a versioned-landing convention (`src/app/landing-v0`, `landing-v2`, `landing-v3`). Add `src/app/landing-v4/page.tsx`.

- **Copy `src/app/page.tsx` verbatim** into `src/app/landing-v4/page.tsx` (keep `export const dynamic = "force-dynamic"` and all imports).
- Swap **only** the How It Works `<section>` (the PROCESS block) for `<ProductDemo />`, wrapped so it keeps the section chrome (eyebrow "Process" + heading + container/padding). Import `ProductDemo` from the new component folder below.
- Leave everything else untouched.

> This duplicates the page body intentionally — it's a throwaway staging surface. Do not refactor the live homepage into shared chunks for this; the goal is an isolated, low-risk preview. Once approved, the swap gets cherry-picked into `src/app/page.tsx`.

## Step 2 — build the animated section (mock, don't reuse)

The real product components are heavy and **must not** be imported into the marketing surface:

- `src/components/canvas/react-flow-canvas.tsx` and the `*-node.tsx` family pull in `@xyflow/react` + `konva`/`react-konva` + `perfect-freehand` + Zustand/`zundo` (and Liveblocks in multiplayer).
- The real chat pulls in the `ai` SDK (v6) streaming machinery + network calls.

Mounting any of those on a marketing page ships hundreds of KB of JS and boots state machines for a non-interactive demo. **Instead build plain styled `div`s that *look* identical**, animated with `framer-motion` (already installed — `framer-motion@^12`, zero marginal cost).

**Reuse the styling truth, drop the engine:**
- Lift the *look* of a sticky note from `src/components/canvas/sticky-note-node.tsx` — `COLOR_CLASSES` (e.g. `bg-[var(--sticky-note-yellow)]`), `TEXT_COLOR_CLASSES`, backed by CSS vars in `src/app/globals.css` (`--sticky-note-yellow`/`-blue`/`-pink`/…). Default sticky ≈ 120×120, `p-3`, `text-sm`, rounded with a soft shadow.
- Everything else uses the **olive design tokens** (`CLAUDE.md` → UI/styling). Never hardcode `gray-*`/`blue-*`/`white` — use `olive`/`neutral-olive`/`ring-selection` etc. Must look right in **both light and dark**.
- Build-pack preview: mirror the real artifact names/layout — PRD, Technical Specifications, Journey Map, Feature Priorities — taken from the existing "Build Pack Deliverables" section already in `page.tsx` (the rows starting ~line 295) and `src/lib/build-pack/presentation-builder.ts`. Render static styled cards, not the real `prd-viewer-dialog`.

Component layout — **`src/components/marketing/product-demo/`**:
- `product-demo.tsx` — orchestrator (client component, owns the animation timeline + section chrome).
- `mock-canvas.tsx` — faux canvas, absolutely-positioned animated sticky `div`s on a subtle dotted/grid background.
- `mock-chat.tsx` — simulated AI dialogue with a typing effect.
- `mock-build-pack.tsx` — build-pack preview card(s).
- `demo-data.ts` — scripted content (sticky text, chat lines, build-pack items) in one place for easy copy tweaks.

## Performance playbook (non-negotiable)

1. **Animate `transform` and `opacity` only.** GPU-composited, no layout thrash. Never animate width/height/top/left/margin.
2. **Gate on viewport.** framer-motion `whileInView` / `useInView` — the sequence runs only when scrolled into view.
3. **Respect `prefers-reduced-motion`.** Via `useReducedMotion()`: skip the choreography, render the *final* end-state statically (notes placed, chat shown, build-pack visible).
4. **Client-only.** Mark the demo `'use client'`. When later wired into the real homepage, import it via `next/dynamic` with `{ ssr: false }` so it doesn't bloat server HTML / first hydration. On `/landing-v4` direct import is fine. Keep the existing `contentVisibility: "auto"` wrapper behavior on the section.
5. **"AI typing" is fake.** Character-reveal via interval / framer-motion. **No `ai` SDK, no network, no tokens.**
6. **One canvas illusion, not a real canvas.** Absolutely-positioned sticky `div`s + staggered entrance (`staggerChildren`) reads as "a canvas filling up" with zero `@xyflow/react`.
7. **Loop politely.** Controlled ~8–12s loop with a hold on the end-state; pause when off-screen (tie to the same `useInView`).

## Suggested choreography (adjust to Figma)

1. Faux canvas fades in (empty, subtle dotted grid like the real canvas).
2. Sticky notes pop in one-by-one (`scale` 0.8→1 + `opacity`, staggered ~120ms) at scattered positions, a few real palette colors.
3. Chat panel slides in; an AI message types out ("Let's reframe that as a How-Might-We…"), then a user reply appears.
4. Build-pack panel slides up / fades in with titled artifact cards (PRD, Tech Spec, Journey Map, Feature Priorities) — the "here's what you walk away with" payoff.
5. Hold end-state ~2s, gently reset and loop (reduced-motion = stay on end-state).

## Figma handoff

Mockups will be provided. When they arrive:
- Match spacing, sizing, sticky colors, and layout to the Figma frames for the **new section only**.
- Map Figma colors to existing olive/sticky CSS vars rather than new hex values; if a token is genuinely missing, add it to `globals.css` (light + dark) — don't hardcode.
- Flag any Figma element that would *require* the heavy real components — we substitute a lightweight equivalent.

## Definition of done

- `/landing-v4` renders the full live homepage with ONLY the PROCESS section replaced by the animated demo; every other section identical to `src/app/page.tsx`.
- Demo works light + dark, matches Figma, loops, and shows a clean static end-state under `prefers-reduced-motion`.
- No import of `@xyflow/react`, `konva`, `react-konva`, Liveblocks, or the `ai` SDK anywhere in `src/components/marketing/product-demo/` (grep to confirm).
- Animations are transform/opacity-only and gated on `useInView`.
- `npm run lint` and `npx tsc --noEmit` clean.
- **Do NOT modify `src/app/page.tsx`** until the user approves the `/landing-v4` version.

## Repo orientation (quick pointers)

- Dev server / worktrees: `CLAUDE.md` "Multi-worktree workflow". Confirm which worktree the dev server runs from before editing — HMR only reloads the worktree it started in.
- Live homepage to clone: `src/app/page.tsx` (PROCESS / "How It Works" section ≈ lines 231–293; Build Pack Deliverables ≈ from line 295).
- Versioned-landing convention: `src/app/landing-v0|v2|v3/page.tsx`.
- Real sticky styling: `src/components/canvas/sticky-note-node.tsx` (`COLOR_CLASSES`, `TEXT_COLOR_CLASSES`).
- CSS vars / tokens: `src/app/globals.css` (`--sticky-note-*`, olive tokens).
- Build-pack reference: `src/lib/build-pack/presentation-builder.ts`; deliverables copy already in `page.tsx`.
- `framer-motion@^12` is already installed.

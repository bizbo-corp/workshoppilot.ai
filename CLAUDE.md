# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WorkshopPilot.ai — an AI-facilitated design-thinking workflow that takes a vague idea through 10 structured steps and produces a Build Pack (PRD, tech specs, journey map, feature prioritization). The AI is the **primary facilitator**, not a sidebar assistant. Split-screen layout: conversational chat panel + interactive canvas (`@xyflow/react`).

Deployed at workshoppilot.ai. See `.planning/PROJECT.md` for the full product brief, milestones, and shipped feature list.

## Read these first

Living architecture docs, regenerated with `/gsd:map-codebase`. Read the relevant one before non-trivial work — it's faster and more current than re-exploring the tree:

- `.planning/codebase/ARCHITECTURE.md` — system architecture
- `.planning/codebase/STRUCTURE.md` — directory and file map
- `.planning/codebase/STACK.md` — frameworks and libraries
- `.planning/codebase/CONVENTIONS.md` — code patterns used here
- `.planning/codebase/INTEGRATIONS.md` — Clerk / Neon / Liveblocks / Gemini / Stripe wiring
- `.planning/codebase/CONCERNS.md` — known footguns and tech debt
- `.planning/codebase/TESTING.md` — test strategy
- `.planning/codebase/DEFENSIVE_PATTERNS.md` — regression-critical fixes; read before touching the chat greeting flow

Project state docs:

- `.planning/PROJECT.md` — what's shipped, what's next
- `.planning/STATE.md` — current phase / focus
- `.planning/ROADMAP.md` — milestone history and pointers to per-milestone roadmaps in `.planning/milestones/`

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3000; use `PORT=3001 npm run dev` to run a worktree alongside) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Typecheck | `npx tsc --noEmit` (no script alias — use this directly) |
| E2E tests | `npm run test:e2e` (auto-sets `BYPASS_AUTH=true`) |
| Single E2E test | `npm run test:e2e -- e2e/path/to/test.spec.ts` |
| E2E headed / debug | `npm run test:e2e:headed` / `npm run test:e2e:debug` |
| DB push (dev) | `npm run db:push:dev` |
| DB migrate | `npm run db:migrate` |
| DB studio (GUI) | `npm run db:studio` |
| Seed step defs | `npm run db:seed` |
| Seed sample workshop | `npm run db:seed:workshop` |

## Stack at a glance

Next.js 16 App Router · React 19 · Tailwind 4 · shadcn/ui (Radix primitives) · TypeScript 5
Clerk (auth) · Neon Postgres (`@neondatabase/serverless`, edge-compatible) · Drizzle ORM · Vercel Blob
Vercel AI SDK v6 + `@ai-sdk/google` (Gemini) · `@liveblocks/react` + `@liveblocks/zustand` (multiplayer)
`@xyflow/react` v12 (canvas) · Konva + `perfect-freehand` (EzyDraw drawing tool)
Zustand + `zundo` (state + undo) · Zod (schemas) · Stripe (checkout) · Resend (email) · Playwright (E2E)

## Mental model

- **Conversation is a projection of state, not the source of truth.** State lives in Zustand stores (`src/stores/`) and Postgres (`src/db/schema/`). The chat re-derives prompts from current state each turn — `src/lib/ai/workshop-context.ts`.
- **Hierarchical context compression** (short-term + long-term + persistent tiers) keeps the 10-step flow from blowing the context window.
- **Solo vs multiplayer is a runtime flag, not two codebases.** Solo: Zustand + debounced server autosave (`src/hooks/use-canvas-autosave.ts`). Multiplayer: same Zustand store wrapped with `@liveblocks/zustand` middleware (`src/stores/multiplayer-canvas-store.ts`); autosave disabled, Liveblocks Storage CRDT handles persistence. **Most canvas/feature code should be store-agnostic** — the difference lives in the provider (`src/providers/canvas-store-provider.tsx`).
- **Edge-compatible Neon driver only.** Don't introduce drivers that need a TCP socket — they'll work locally and break in Vercel serverless. The `with-retry.ts` wrapper handles Neon cold starts (500ms–5s).

## Code conventions

- **App Router server components by default.** Add `'use client'` only where state, effects, refs, or browser APIs are needed.
- **Server actions in `src/actions/*.ts`** return `{ success, data?, error? }` shapes. Don't throw across the boundary.
- **Zustand stores** in `src/stores/`. Solo and multiplayer stores implement the same surface; the multiplayer one wraps with `liveblocks()` middleware.
- **DB schema** split per table in `src/db/schema/*.ts`, re-exported from `src/db/schema/index.ts`. Use the `with-retry.ts` wrapper for queries that ride out cold starts.
- **AI prompts** live in `src/lib/ai/prompts/`. The AI's voice is `src/lib/ai/soul.md` — opinionated and load-bearing. Don't drift the tone.
- **Structured AI outputs** go through Zod schemas in `src/lib/schemas/` / `src/lib/ai/prompts/`.

## UI / styling

- Tailwind 4 with the **olive** design token system. Never reintroduce hardcoded `gray-*`, `blue-*`, `white` — use `olive` / `neutral-olive` / `ring-selection` etc., backed by `var(--*)` CSS variables in `src/app/globals.css`. Light and dark both have to look right.
- `shadcn/ui` components live in `src/components/ui/`. Theme via `next-themes`.
- Toasts via Sonner (`sonner`), olive-themed.

## Canvas gotchas

`src/components/canvas/react-flow-canvas.tsx` is the canvas root. A few non-obvious things:

- Uses a **controlled-nodes pattern**: a `nodes` useMemo derives from store state, a `useEffect` mirrors it to `controlledNodes`, and `handleNodesChange` applies live changes via `applyNodeChanges`. Don't bypass this — anything that mutates positions outside this flow will race.
- **Live refs** (`livePositions`, `liveDimensions`) carry mid-drag/mid-resize values so the useMemo can recompute safely without snap-back.
- **`liveDimensions` is shared by manual resize AND auto-fit text-grow.** Do NOT use its presence as a proxy for "currently resizing." Use `activelyResizingIds` (added in `handleResize`, removed in `handleResizeEnd`). This was a real bug — sticky notes snapped back on every drop because the guard misread auto-fit cache as active resize.
- **Sticky notes don't declare a `dragHandle`** — the whole node is draggable. Concept cards, persona templates, and HMW cards do use `dragHandle: '.card-drag-handle'`.

## Multi-worktree workflow

This repo runs sibling git worktrees so dev servers and feature branches can coexist:

- `~/devProjects/workshoppilot.ai` — `main` branch (default cwd; commits land here)
- `~/devProjects/workshoppilot.ai-wt1` — `wt1` branch
- `~/devProjects/workshoppilot.ai-wt2` — `wt2` branch

`git worktree list` shows current state.

**Before editing any source file, confirm which worktree the dev server is running from** — HMR only reloads the worktree it was started in. Editing a different checkout's copy is silently a no-op (cost us a debug cycle on the canvas drag bug; don't repeat).

Typical flow: feature work on `wt1`/`wt2` branches; merge into `main` from the main checkout when done; fast-forward the worktree's branch back to `main` to start fresh.

## Notes for working with the user

- Solo founder, not a CTO. Prefer terse practical answers; explain non-obvious trade-offs but don't lecture.
- Worktrees and other git internals are still new to them — explain what you're about to do before destructive git ops.
- When in doubt about scope, ask one focused question rather than guessing.

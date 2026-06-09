# Coding Conventions

**Analysis Date:** 2026-02-07

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `Logo.tsx`)
- Utilities: camelCase (e.g., `utils.ts`)
- Pages: lowercase with hyphens (Next.js convention)
- No explicit suffix patterns (no `.component.tsx`, `.util.ts`)

**Functions:**
- Named exports use PascalCase for React components: `export default function Home() {}`
- Utility functions use camelCase: `export function cn(...inputs: ClassValue[]) {}`
- Interface types use PascalCase: `interface LogoProps {}`

**Variables:**
- Local variables use camelCase: `const sizeClasses = {...}`
- Constants use camelCase: `const geistSans = Geist({...})`
- CSS class mappings use camelCase keys: `const sizeClasses = { sm: 'text-2xl', ... }`

**Types:**
- React component props: PascalCase with `Props` suffix (e.g., `LogoProps`)
- Type imports explicit: `import type { Metadata }` (TypeScript best practice)
- Interface definitions for component props

## Code Style

**Formatting:**
- ESLint configuration: `eslint.config.mjs` (flat config format)
- Rules: Extended from `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No separate Prettier config detected; using ESLint defaults
- Line length: No explicit limit enforced in configuration

**Linting:**
- Tool: ESLint 9.x
- Config extends Next.js recommended configs for web vitals and TypeScript
- Global ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
- Run command: `npm run lint` (configured in package.json)

**TypeScript:**
- Target: ES2017
- Strict mode enabled: `"strict": true`
- JSX preset: `react-jsx`
- Module resolution: bundler
- Path aliases enabled: `@/*` maps to `./src/*`
- Isolated modules: enabled

## Import Organization

**Order:**
1. External library imports (React, Next.js): `import React from 'react'`
2. Type imports: `import type { Metadata }` (explicit `type` keyword)
3. Internal module imports: `import "./globals.css"` (CSS imports)
4. Path aliases: `import Logo from "@/components/Logo"`
5. Relative imports from internal modules

**Path Aliases:**
- `@/*` resolves to `./src/*` (tsconfig.json)
- shadcn/ui aliases configured but not all currently used:
  - `@/components` → components directory
  - `@/lib/utils` → utility functions
  - `@/components/ui` → UI components (reserved)
  - `@/hooks` → custom hooks directory
  - `@/lib` → shared lib directory

## Error Handling

**Patterns:**
- No explicit error handling patterns in current codebase (no try-catch blocks present)
- Component rendering is straightforward JSX
- No error boundaries detected
- No error logging mechanism in place

## Logging

**Framework:** Not detected. Console logging not used in current codebase.

**Patterns:**
- No logging infrastructure currently present
- Components use direct JSX rendering without logging

## Comments

**When to Comment:**
- Inline comments minimal in current code
- One inline comment example: `// Sage green color` in Logo.tsx explaining hex value

**JSDoc/TSDoc:**
- Not used in current codebase
- No function documentation comments found

## Function Design

**Size:** Functions are small and focused
- Component functions: 4-40 lines
- Utility functions: 2-3 lines (e.g., `cn()` function)

**Parameters:**
- React components: destructured props using interface types
- Example: `({ className = '', size = 'lg' })` with default values
- Type annotations mandatory for all parameters

**Return Values:**
- Components return JSX elements
- Utility functions return composed values (merged Tailwind classes)
- All functions have implicit or explicit return typing

## Module Design

**Exports:**
- Default exports for components: `export default Logo`
- Named exports for utilities: `export function cn(...)`
- Mixed pattern: Pages use default exports, utilities use named exports

**Barrel Files:**
- Not used; no index.ts re-exports detected in current structure

## TypeScript Patterns

**Type Imports:**
- Explicit `type` keyword used: `import type { Metadata } from "next"`
- Interface props: `interface LogoProps { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; }`
- Union types for restricted values: `size?: 'sm' | 'md' | 'lg' | 'xl'`

**Styling Convention:**
- Tailwind CSS classes composed inline: `className="flex min-h-screen items-center..."`
- CSS merging utility: `cn()` function for combining and deduplicating classes
- Class mappings using object literals for variants

## React Patterns

**Component Types:**
- Functional components with React.FC generic type: `const Logo: React.FC<LogoProps> = (...)`
- Function components without generic type: `export default function Home() {}`

**Props:**
- Optional props with defaults: `className = ''`
- TypeScript interfaces for prop types
- React.ReactNode for children: `children: React.ReactNode`

**Styling:**
- Inline className strings with Tailwind utilities
- Object mappings for conditional classes: `sizeClasses[size]`
- CSS variables in theme (globals.css)

## Design System

The consolidated primitives live in `src/components/ui/`. Prefer them over hand-rolled markup; pass `className` for layout, not to restyle the primitive.

**Tokens (`src/app/globals.css`)** — semantic, defined for light AND dark, mapped via `@theme inline`:
- Color: `--primary` / `--secondary` / `--tertiary`, `--primary-brand` (strong olive CTA), `--destructive`, and the state set `--success` / `--warning` / `--info` (+ `*-foreground`). Never use `gray-*`/`slate-*`/`blue-*`/raw `white`; use `olive-*` / `neutral-olive-*` / semantic tokens.
- Radius: `rounded-card` / `rounded-node` / `rounded-pill` (+ Tailwind `--radius-*`).
- Type: `tracking-eyebrow` is the one canonical all-caps tracking value.

**Buttons (`button.tsx`)** — semantic tiers: `primary` (most important, brand olive) › `secondary` (neutral solid) › `tertiary` (pale pill) › plus `destructive` / `outline` / `ghost` / `link`. `default` is a deprecated neutral alias kept so no-variant call sites don't shift mid-migration — declare an explicit tier on new buttons.

**Typography (`typography.tsx`)** — `Heading` (level 1–4) / `H1`–`H4`, `Text` (`body`/`muted`/`lead`/`small`), `Eyebrow`, `Caption`, `Code`. Use these instead of copy-pasting size/weight/tracking strings.

**Surfaces** — `Card` (slotted header/content/footer) for structured cards; `Surface` (`card`/`panel`/`node` variants) for plain card-like boxes instead of hand-rolled `rounded-* border bg-card shadow-*` divs.

**Other primitives** — `Icon` (constrained size scale + `currentColor`; usually unneeded inside `Button`), `Avatar` (initials/image), `EmptyState` (icon+title+description+CTA), `SuggestionPill`, `Badge`.

**Enforcement** — `npm run lint:tokens` scans `src/app` + `src/components` and reports OFF_BRAND / RAW white-black / STATE_COLOR / HEX violations (allow-lists canvas/ezydraw/marketing palettes). Report-only today; `--strict` gates on OFF_BRAND once that list is cleaned.

---

*Convention analysis: 2026-02-07 · Design System section added 2026-06-10*

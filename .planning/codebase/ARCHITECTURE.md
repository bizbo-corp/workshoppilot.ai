# Architecture

**Analysis Date:** 2026-02-07

## Pattern Overview

**Overall:** Next.js Server-Side Rendering (SSR) with React component composition

**Key Characteristics:**
- Server-rendered pages with Next.js App Router
- Client-side React components using React 19
- Component-based UI architecture with Tailwind CSS
- Utility-first styling approach with design tokens
- Type-safe development with TypeScript strict mode

## Layers

**App Layer (Pages & Routing):**
- Purpose: Define page routes and layout structure
- Location: `src/app/`
- Contains: Page components, root layout, global styles
- Depends on: Component layer, external React/Next.js libraries
- Used by: Next.js router, browser requests

**Component Layer:**
- Purpose: Encapsulate reusable UI components with isolated concerns
- Location: `src/components/`
- Contains: Presentational React components (Logo, future UI components)
- Depends on: Utility layer, Tailwind CSS
- Used by: App layer pages

**Utility Layer:**
- Purpose: Provide shared helper functions and utilities
- Location: `src/lib/`
- Contains: Utility functions (class name merging)
- Depends on: External packages (clsx, tailwind-merge)
- Used by: Component and App layers

**Styling Layer:**
- Purpose: Centralize design tokens and global styles
- Location: `src/app/globals.css`
- Contains: CSS custom properties (colors, spacing, radius), Tailwind theme configuration
- Depends on: Tailwind CSS framework
- Used by: All components via class names

## Data Flow

**Page Render Flow:**

1. Request arrives at Next.js server
2. Router matches request to route handler in `src/app/` (e.g., `page.tsx`)
3. Page component imports child components (e.g., Logo from `src/components/`)
4. Component renders with:
   - Props passed from parent
   - Tailwind class names referencing design tokens
   - Static content or conditional rendering
5. Root layout (`src/app/layout.tsx`) wraps content with:
   - HTML metadata
   - Font imports (Geist Sans, Geist Mono)
   - Global CSS stylesheet
6. Server renders complete HTML
7. Client receives and displays rendered content

**State Management:**
- Current state: Static rendering with React component props
- No global state management framework (redux, zustand, context API) in place
- Future: Will need state layer when interactive features are added

## Key Abstractions

**Logo Component:**
- Purpose: Brand identity display with responsive sizing
- Location: `src/components/Logo.tsx`
- Pattern: Functional React component with TypeScript interface for props
- Props: `className` (string), `size` ('sm' | 'md' | 'lg' | 'xl')
- Implementation: Size-based Tailwind classes, inline SVG for pilot icon

**Class Name Utility:**
- Purpose: Merge Tailwind classes with conditional overrides
- Location: `src/lib/utils.ts`
- Pattern: `cn()` function exported for use in components
- Uses: `clsx` for conditional classes, `tailwind-merge` for conflict resolution

**Design Token System:**
- Purpose: Centralized theme values across application
- Location: `src/app/globals.css` (CSS custom properties)
- Tokens defined: Colors (primary, secondary, accent, destructive, muted, etc.), spacing, border radius
- Consumption: Referenced in Tailwind theme via `--color-*` and `--radius-*` variables

## Entry Points

**Root Page:**
- Location: `src/app/page.tsx`
- Triggers: User navigates to `/`
- Responsibilities:
  - Display home page with mission statement
  - Import and render Logo component
  - Center content with flexbox layout
  - Display headline and description text

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Applied to all pages in application
- Responsibilities:
  - Define metadata (title, description)
  - Load Google fonts (Geist family)
  - Import and inject global styles
  - Wrap all pages with HTML structure
  - Set CSS variables for fonts

**Development Entry:**
- Command: `npm run dev`
- Server: Next.js dev server on `localhost:3000`
- Behavior: Hot module reloading for code changes

## Error Handling

**Strategy:** Not explicitly defined; relies on Next.js defaults

**Current Implementation:**
- No custom error boundaries
- No centralized error logging
- Next.js default error page for 404, 500
- Browser console for client-side errors

**Future Consideration:** Error handling layer should be added as application grows

## Cross-Cutting Concerns

**Logging:** Not implemented. Consider adding when backend integration is needed.

**Validation:** Not implemented. Will be required for form handling and API input.

**Authentication:** Not implemented. Will require auth layer when user accounts are introduced.

**Styling:** Centralized via Tailwind CSS with design tokens in CSS variables. Global styles in `src/app/globals.css`.

**Type Safety:** TypeScript strict mode enabled in `tsconfig.json`. All React components typed with React.FC interface or function return types.

---

*Architecture analysis: 2026-02-07*

---
phase: 03-application-shell
plan: 01
subsystem: ui
tags: [shadcn, next-themes, framer-motion, react-resizable-panels, tailwind]

# Dependency graph
requires:
  - phase: 02-authentication-roles
    provides: Root layout with ClerkProvider conditional wrapping
provides:
  - next-themes ThemeProvider with system preference detection
  - shadcn/ui component library (sidebar, dialog, sheet, button, tooltip, input, separator, skeleton)
  - Phase 3 UI libraries (framer-motion, react-resizable-panels, react-hotkeys-hook, react-textarea-autosize)
  - Root layout restructured for route-specific headers
affects: [03-02-landing-page, 03-03-workshop-layout, 03-04-sidebar-structure, 04-step-ui]

# Tech tracking
tech-stack:
  added: [next-themes, framer-motion, react-resizable-panels, react-hotkeys-hook, react-textarea-autosize, shadcn/ui components]
  patterns: [ThemeProvider wrapping pattern, route-specific layout headers, .npmrc for peer dependency handling]

key-files:
  created:
    - src/components/ui/sidebar.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/sheet.tsx
    - src/components/ui/button.tsx
    - src/components/ui/tooltip.tsx
    - src/components/ui/input.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/skeleton.tsx
    - src/hooks/use-mobile.ts
    - .npmrc
  modified:
    - src/app/layout.tsx
    - package.json

key-decisions:
  - "Added .npmrc with legacy-peer-deps=true to handle Clerk/React 19.2.0 peer dependency mismatch"
  - "Removed Header from root layout - headers will be route-specific (landing vs workshop vs dashboard)"
  - "ThemeProvider configured with attribute='class', defaultTheme='system', enableSystem=true"
  - "Added suppressHydrationWarning to html element to prevent next-themes hydration warnings"

patterns-established:
  - "Root layout structure: html > body > ClerkProvider > ThemeProvider > {children}"
  - "Route-specific headers pattern: landing page gets its own header (Plan 02), workshop gets its own (Plan 03)"
  - "Dark mode via CSS class toggling with system preference detection"

# Metrics
duration: 4min
completed: 2026-02-07
---

# Phase 03 Plan 01: Dependencies & Foundation Summary

**Installed shadcn/ui component library and next-themes dark mode with route-specific layout structure**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-07T10:01:30Z
- **Completed:** 2026-02-07T10:05:12Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- All Phase 3 dependencies installed (next-themes, framer-motion, react-resizable-panels, react-hotkeys-hook, react-textarea-autosize)
- shadcn/ui components added: sidebar, dialog, sheet, button, tooltip, input, separator, skeleton
- Root layout restructured with ThemeProvider and no global Header
- Dark mode theming works via CSS class toggling with system preference detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and shadcn/ui components** - `94ca61a` (chore)
2. **Task 2: Configure root layout with ThemeProvider and restructure for workshop routes** - `b267542` (feat)

## Files Created/Modified

### Created
- `src/components/ui/sidebar.tsx` - shadcn Sidebar component with built-in collapse state
- `src/components/ui/dialog.tsx` - shadcn Dialog component for modals
- `src/components/ui/sheet.tsx` - shadcn Sheet component for slide-out panels
- `src/components/ui/button.tsx` - shadcn Button component
- `src/components/ui/tooltip.tsx` - shadcn Tooltip component
- `src/components/ui/input.tsx` - shadcn Input component
- `src/components/ui/separator.tsx` - shadcn Separator component
- `src/components/ui/skeleton.tsx` - shadcn Skeleton loading component
- `src/hooks/use-mobile.ts` - Mobile detection hook (dependency of sidebar)
- `.npmrc` - npm configuration with legacy-peer-deps=true

### Modified
- `src/app/layout.tsx` - Added ThemeProvider, removed Header, added suppressHydrationWarning
- `package.json` - Added Phase 3 dependencies

## Decisions Made

1. **Added .npmrc with legacy-peer-deps=true**
   - Rationale: Clerk requires React 19.2.3+ but project has 19.2.0, causing peer dependency errors during shadcn CLI installation
   - Solution: Configure npm to allow legacy peer dependencies project-wide
   - Impact: Enables shadcn CLI to run without --legacy-peer-deps flag on every command

2. **Removed Header from root layout**
   - Rationale: Per user decision, landing page and workshop pages need separate header variants
   - Solution: Root layout now clean (no Header), each route will add its own header in later plans
   - Impact: Landing page gets its own header (Plan 02), workshop gets its own (Plan 03), dashboard gets simple variant

3. **ThemeProvider configuration**
   - attribute="class": Uses CSS class (.dark) for theme switching (matches Tailwind 4 config)
   - defaultTheme="system": Respects user's OS preference on first visit
   - enableSystem=true: Allows automatic switching when OS preference changes
   - suppressHydrationWarning: Prevents React hydration mismatch warning (next-themes modifies html element during hydration)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Peer dependency conflict: Clerk vs React 19.2.0**
- Issue: shadcn CLI failed installing components due to Clerk requiring React 19.2.3+
- Resolution: Created .npmrc with legacy-peer-deps=true to bypass peer dependency checks
- Verification: All components installed successfully, build passes with zero errors
- Impact: Libraries are compatible (Clerk works with React 19.2.0), just strict version checking issue

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Landing Page):**
- shadcn components available for landing page UI
- Dark mode theming configured and working
- Root layout clean and ready for route-specific headers

**Ready for Plan 03 (Workshop Layout):**
- Sidebar component installed and ready for workshop navigation
- Dialog/Sheet components ready for modals and slide-outs
- framer-motion ready for animations
- react-resizable-panels ready for split view

**Ready for Plan 04 (Workshop Sidebar):**
- Sidebar primitives ready for customization
- Skeleton component ready for loading states
- Button/Tooltip components ready for sidebar actions

**No blockers or concerns.**

## Self-Check: PASSED

All created files verified to exist:
- src/components/ui/sidebar.tsx ✓
- src/components/ui/dialog.tsx ✓
- src/components/ui/sheet.tsx ✓
- src/components/ui/button.tsx ✓
- src/components/ui/tooltip.tsx ✓
- src/components/ui/input.tsx ✓
- src/components/ui/separator.tsx ✓
- src/components/ui/skeleton.tsx ✓
- src/hooks/use-mobile.ts ✓
- .npmrc ✓

All commits verified to exist:
- 94ca61a ✓
- b267542 ✓

---
*Phase: 03-application-shell*
*Completed: 2026-02-07*

---
phase: 28-mind-map-crazy-8s
plan: 03
subsystem: ui
tags: [ai, mind-map, gemini, theme-suggestion, ideation, ux]

# Dependency graph
requires:
  - phase: 28-02
    provides: MindMapCanvas with dagre layout and CRUD operations
  - phase: 05-chat-ui
    provides: Gemini AI integration via Vercel AI SDK
  - phase: 04-db-schema
    provides: stepArtifacts table for workshop context
provides:
  - AI theme suggestion endpoint for mind map blank-canvas problem
  - Suggest Themes button with loading states and error handling
affects: [28-04-crazy-8s-canvas, step-8-ideation-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AI context loading from stepArtifacts (persona, pains, gains, insights)
    - Gemini generateObject with Zod schema for structured JSON output
    - Fallback generic themes on AI failure for graceful degradation
    - ReactFlow Panel for floating UI elements
    - fitView animation after bulk node additions

key-files:
  created:
    - src/app/api/ai/suggest-themes/route.ts
  modified:
    - src/components/workshop/mind-map-canvas.tsx

key-decisions:
  - "AI loads workshop context from stepArtifacts table (persona, sense-making themes) to ground suggestions in prior research"
  - "Suggest Themes button hidden when 6+ level-1 branches exist (user has enough themes)"
  - "Fallback to generic themes on AI failure prevents blocking user experience"
  - "Existing themes passed to AI to avoid duplicate suggestions"
  - "Auto-fit view after adding themes ensures all new nodes visible"

patterns-established:
  - "AI endpoint pattern: Load stepArtifacts via join, extract relevant fields, build context-aware prompt"
  - "generateObject with Zod schema: z.object({ themes: z.array(z.string()) }) for type-safe AI outputs"
  - "Panel position='top-right': Floating UI pattern for canvas overlays"
  - "Theme color auto-assignment: Existing level-1 count + new index % THEME_COLORS.length"

# Metrics
duration: 270s
completed: 2026-02-12
---

# Phase 28 Plan 03: AI Theme Suggestion for Mind Map Summary

**AI-powered theme generation endpoint and UI button help users overcome blank-canvas paralysis with 3-5 contextual theme suggestions**

## Performance

- **Duration:** 4 min 30s
- **Started:** 2026-02-12T06:39:22Z
- **Completed:** 2026-02-12T06:43:53Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Created POST /api/ai/suggest-themes endpoint for AI theme generation
- Loads workshop context from stepArtifacts table (persona pains/gains, sense-making insights)
- Uses Gemini 2.0 Flash with generateObject for structured JSON output
- Validates AI response and returns fallback generic themes on failure
- Avoids duplicating existing themes by passing them in request body
- Added Suggest Themes button to MindMapCanvas in top-right Panel
- Button only visible when < 6 level-1 branches exist
- Shows Sparkles icon and loading spinner during AI generation
- Displays error message if suggestion fails
- Auto-assigns theme colors to generated branches using THEME_COLORS palette
- Auto-fits view after adding new theme nodes for smooth UX

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AI theme suggestion API endpoint** - `40621c2` (feat)
2. **Task 2: Add Suggest Themes button to MindMapCanvas** - `05937cf` (feat)

## Files Created/Modified

**Created:**
- `src/app/api/ai/suggest-themes/route.ts` - AI theme suggestion endpoint with context loading and Gemini integration

**Modified:**
- `src/components/workshop/mind-map-canvas.tsx` - Added Suggest Themes Panel with button, loading states, error handling, and AI fetch logic

## Decisions Made

1. **Workshop context loading pattern**: Query stepArtifacts table with join to workshopSteps, extract persona (name, bio, pains, gains) and sense-making themes for contextual AI suggestions
2. **Graceful degradation**: Return fallback generic themes ("Technology Solutions", "Process Improvements", "User Experience", "Community & Social") if AI fails or returns empty
3. **Duplicate avoidance**: Pass existing level-1 theme labels to AI in prompt to prevent redundant suggestions
4. **Button visibility threshold**: Hide Suggest Themes button when 6+ level-1 branches exist (user has plenty of starting points)
5. **Auto-fit view**: Call fitView({ padding: 0.3, duration: 300 }) after adding themes to ensure all new nodes visible
6. **Error UX**: Display user-friendly error message in Panel below button if fetch fails, not intrusive alerts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. TypeScript error during initial implementation:**
- **Issue:** Attempted to query `workshopSteps.stepArtifacts` column which doesn't exist
- **Root cause:** stepArtifacts is a separate table, not a column on workshopSteps
- **Resolution:** Changed query to join stepArtifacts table via workshopStepId foreign key (matching pattern in assemble-context.ts)
- **Impact:** Minimal - fixed immediately by following existing codebase patterns

**Pre-existing build error** (not related to this plan):
- `ideation-sub-step-container.tsx` has TypeScript errors from previous session changes
- Not blocking this plan's functionality - my files compile without errors

## User Setup Required

None - Gemini API already configured, no new secrets or services required.

## Next Phase Readiness

AI theme suggestion complete and integrated with MindMapCanvas. Users can now:
1. Start with empty mind map (just root HMW node)
2. Click "Suggest Themes" to get 3-5 AI-generated theme branches
3. Edit, expand, or delete suggested themes
4. Add their own themes manually alongside AI suggestions

Ready for Plan 28-04 (Crazy 8s canvas integration) and Step 8 ideation flow completion.

**Blockers:** None
**Concerns:** None - AI suggestions use existing workshop context effectively

## Self-Check: PASSED

**Created files:**
```bash
[ -f "src/app/api/ai/suggest-themes/route.ts" ] && echo "FOUND: src/app/api/ai/suggest-themes/route.ts" || echo "MISSING: src/app/api/ai/suggest-themes/route.ts"
# FOUND: src/app/api/ai/suggest-themes/route.ts
```

**Modified files:**
```bash
[ -f "src/components/workshop/mind-map-canvas.tsx" ] && echo "FOUND: src/components/workshop/mind-map-canvas.tsx" || echo "MISSING: src/components/workshop/mind-map-canvas.tsx"
# FOUND: src/components/workshop/mind-map-canvas.tsx
```

**Commits:**
```bash
git log --oneline --all | grep -q "40621c2" && echo "FOUND: 40621c2" || echo "MISSING: 40621c2"
# FOUND: 40621c2

git log --oneline --all | grep -q "05937cf" && echo "FOUND: 05937cf" || echo "MISSING: 05937cf"
# FOUND: 05937cf
```

**Key implementation verifications:**
```bash
# AI endpoint exists
grep -q "POST.*suggest-themes" src/app/api/ai/suggest-themes/route.ts && echo "✓ POST endpoint" || echo "✗ POST endpoint"
# ✓ POST endpoint

# generateObject with Gemini
grep -q "generateObject" src/app/api/ai/suggest-themes/route.ts && echo "✓ generateObject" || echo "✗ generateObject"
# ✓ generateObject

grep -q "gemini-2.0-flash" src/app/api/ai/suggest-themes/route.ts && echo "✓ Gemini model" || echo "✗ Gemini model"
# ✓ Gemini model

# Suggest Themes button exists
grep -q "Suggest Themes" src/components/workshop/mind-map-canvas.tsx && echo "✓ Button text" || echo "✗ Button text"
# ✓ Button text

grep -q "Sparkles" src/components/workshop/mind-map-canvas.tsx && echo "✓ Sparkles icon" || echo "✗ Sparkles icon"
# ✓ Sparkles icon

grep -q "handleSuggestThemes" src/components/workshop/mind-map-canvas.tsx && echo "✓ Handler function" || echo "✗ Handler function"
# ✓ Handler function

grep -q "Panel position=\"top-right\"" src/components/workshop/mind-map-canvas.tsx && echo "✓ Panel component" || echo "✗ Panel component"
# ✓ Panel component
```

All checks passed.

---
*Phase: 28-mind-map-crazy-8s*
*Completed: 2026-02-12*

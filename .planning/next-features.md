# Post-v1.0 Feature Ideas

Captured observations and improvement ideas to consider after v1.0 milestone (Phase 14 completion). Not committed to any milestone yet — to be evaluated during MMP planning.

---

## 1. Reset Step

**Problem:** Users who go down a wrong path in a step have no clean way to start over without navigating away and back.

**Proposed Behavior:**

- "Reset Step" action clears conversation and extracted artifact for the current step
- Confirmation dialog: "This will clear your conversation and any extracted output for this step. Continue?"
- Step status resets to `in_progress` with `arcPhase: orient`
- Downstream steps cascade-invalidated (same mechanism as "Revise This Step" from Phase 10)
- Chat panel clears, AI re-orients the user from scratch

**Implementation Notes:**

- Leverages existing cascade invalidation logic (Phase 10 Plan 2)
- New server action: `resetStep(workshopId, stepId)` — clears messages, artifact, summary, resets status
- UI: "Reset Step" option in step actions (alongside "Revise This Step" for completed steps)

---

## 2. Restructure Step 8 Ideation into Sub-Steps

**Problem:** Step 8 packs 6 ideation rounds into a single conversational flow (cluster generation, user input, brain writing x3, Crazy 8s, selection). It's the longest and most complex step. The ordering should also be revised — Crazy 8s (rapid divergent thinking) should come *before* Brain Writing (building on ideas), not after.

**Proposed Structure:**

- **Step 8a: Mind Mapping** — AI generates themed clusters with wild cards, user adds their own ideas
- **Step 8b: Crazy 8s** — Rapid-fire idea generation (8 ideas with energetic conversational pacing)
- **Step 8c: Brain Writing** — "Yes, and..." evolution of best ideas from 8a and 8b

**Idea Selection UX:**

- Ideas from all 3 sub-steps presented as a combined set
- Users select ideas directly within the chat pane (interactive selection, not just text)
- Users can add their own via free-text input ("Add your own idea" field below AI-generated list)
- Selected ideas (max 3-4) flow forward to Step 9 Concept Development

**UX Considerations:**

- Sub-steps could use a tabbed or accordion UI within Step 8's container
- Each sub-step produces intermediate output visible in the output panel
- Selection state persists across sub-steps (select from 8a, still selected in 8c)
- Inline idea chips with toggle selection vs. separate selection panel
- Progress indicator shows sub-step progress (8a/8b/8c) within overall Step 8

**Implementation Impact:**

- Step metadata changes: sub-step support or splitting into 3 separate steps (expanding total to 12)
- Schema changes: each sub-step gets own artifact, or Step 8 artifact retains current multi-round structure
- Prompt changes: each sub-step gets focused prompt instead of current 6-round mega-prompt
- Navigation: back-navigation within sub-steps vs. treating each as independent step
- **Key trade-off:** Sub-steps within a step (preserves 10-step mental model) vs. expanding to 12 steps (simpler implementation, breaks familiar structure)
---
phase: 33-ai-personality
plan: 02
subsystem: AI Facilitation
tags: [personality, prompts, step-instructions, UX]
dependency_graph:
  requires: [33-01-SUMMARY.md]
  provides: [personality-consistent step instructions for all 10 steps]
  affects: [all step-specific AI facilitation, arc phase behavior consistency]
tech_stack:
  added: []
  patterns: [personality-driven step instructions, consultant voice across all 10 steps]
key_files:
  created: []
  modified:
    - src/lib/ai/prompts/step-prompts.ts
decisions:
  - Steps 1-5 updated with sharp consultant personality tone
  - Steps 6-10 updated with consistent consultant voice
  - Sub-steps 8a/8b/8c updated with personality-appropriate energy
  - All functional content preserved (methodology, format instructions, evidence requirements)
  - File length increased by 6.3% (761 → 809 lines) within +/- 15% constraint
metrics:
  duration: 478s
  tasks: 2
  files_created: 0
  files_modified: 1
  commits: 2
  completed: 2026-02-13
---

# Phase 33 Plan 02: Step-Specific Prompt Updates Summary

**One-liner:** All 10 design thinking step prompts and 3 ideation sub-step prompts updated with sharp consultant personality tone, transforming textbook instructions into practitioner-driven facilitation while preserving all functional methodology.

## What Was Built

### Task 1: Update Steps 1-5 Prompts with Personality Tone
**Commit:** `24ac5ee`

Updated the step-specific instructions for Steps 1-5 to use sharp consultant personality tone from soul.md:

**Challenge (Step 1) — "Let's cut through the noise and find the real problem"**
- Anti-patterns: "Watch out for solutions disguised as problems — 'We need an app' is a solution, not a problem. Redirect them."
- Boundary redirects: "I love the energy, but let's nail the problem first. Solutions come in Step 8 — and they'll be way better if we do this right."
- Gathering requirements: "Nail down the core problem. What's actually broken? Who feels the pain most?"
- Prior context: "You're setting the foundation for the entire workshop."

**Stakeholder Mapping (Step 2) — "Who has power here? Who gets forgotten?"**
- Design thinking principles: "Prioritize by power (can they kill this?) and interest (do they care?)"
- Proactive prompting: "Pull from the Challenge (Step 1) — who showed up in the HMW? Who else is lurking in this problem space?"
- Category checklist: Natural consultant language with domain-specific prompting
- Boundary: "Don't generate interview questions or insights yet — that's Step 3. Focus on WHO exists in the ecosystem, not WHAT they think."

**User Research (Step 3) — "Let's hear what real people actually experience"**
- Design thinking principles: "'Sarah spends 20 minutes every morning manually reconciling data' is gold."
- Synthetic interview quality: "Real people are inconsistent."
- Gathering requirements: Direct, active questions
- Disclaimer: "Be clear: synthetic interviews are AI-generated simulations based on the challenge and stakeholder context."

**Sense Making (Step 4) — "I'm looking for what connects these dots"**
- Design thinking principles: "If only one person said it, it's an anecdote. If three said it, it's a pattern."
- Evidence traceability: "Don't make stuff up. If the research doesn't support a claim, don't make it."
- Affinity mapping: "Don't cherry-pick — consider every stakeholder's input."
- Challenge relevance: Natural language showing how research deepened understanding

**Persona (Step 5) — "Let's bring this user to life with real evidence"**
- Evidence traceability: Transparent about what's inferred vs what's from research
- Proactive drafting: "This is NOT a Q&A session where you ask the user to provide each field. YOU draft it, THEY review it."
- Multi-persona guidance: "Don't ask 'how many personas do you want?' upfront — let the research guide the count."
- Boundary: "If ideation starts, redirect: 'Let's finish developing the persona first. Solutions come after we map their journey in Step 6.'"

**Files modified:**
- `src/lib/ai/prompts/step-prompts.ts` (Challenge, Stakeholder Mapping, User Research, Sense Making, Persona)

### Task 2: Update Steps 6-10 and Sub-Step Prompts with Personality Tone
**Commit:** `6a79b54`

Updated the step-specific instructions for Steps 6-10 and all 3 ideation sub-steps to use consistent sharp consultant personality tone:

**Journey Mapping (Step 6) — "Let's walk in their shoes and find where it breaks down"**
- Design thinking principles: "The 'dip' is the stage with the most acute pain — that's where the opportunity lives."
- Dip identification: Consultant providing clear rationale with evidence
- Boundary: "If ideation starts, redirect: 'Let's finish mapping the current journey first. Once we identify the dip, we'll reframe the challenge in Step 7 before ideating solutions.'"

**Reframe (Step 7) — "Time to take everything we've learned and rewrite the question"**
- Design thinking principles: "This is a FRESH REWRITE, not an evolution of Step 1 — draft new HMW from scratch using all accumulated research."
- 4-part HMW builder: Consultant suggesting options with source context
- Validation: Showing traceability and quality assessment before finalizing
- Boundary: "If ideation starts, redirect: 'Let's finalize the reframed challenge first. In Step 8, we'll generate many ideas to address this HMW.'"

**Ideation (Step 8) — "No judgment zone. Let's go wide before we go deep"**
- Design thinking principles: "Quantity over quality in early ideation (divergent thinking). Wild card ideas challenge assumptions."
- Boundary: "Defer feasibility, SWOT, and concept development to Step 9."
- Prior context: Natural references to HMW, persona, journey dip, and pains/gains

**Concept (Step 9) — "Let's turn your best ideas into something you'd present to a CEO"**
- Design thinking principles: "SWOT analysis must be honest and evidence-grounded. No cheerleading. If there's a weakness, call it out."
- Concept sheet generation: Proactive drafting with user refinement
- Evidence traceability: Every SWOT bullet and feasibility score must trace to prior steps
- Boundary: "This step is about developing and testing concepts, not choosing which to build or planning implementation."

**Validate (Step 10) — "Let's look at what you built with clear eyes"**
- Design thinking principles: "Honest assessment, not cheerleading — confidence rating MUST reflect actual research quality."
- Confidence assessment: "Be HONEST. Don't inflate the score to make the user feel good."
- Example (honest): "Confidence: 6/10. Research was synthetic (no real user interviews), but persona and concept align well with the stated challenge."
- Next steps: "Don't include generic advice like 'do more research' — be specific about WHAT to research and WHY"

**Sub-Step Prompts:**

**Mind Mapping (8a) — "Let's branch out in every direction"**
- Task: "Quantity over quality in early ideation (divergent thinking). Wild card ideas challenge assumptions and unlock new creative directions."
- User engagement: Direct invitation to contribute ideas with natural language

**Crazy 8s (8b) — High-energy language preserved and enhanced**
- Task: Existing high-energy pacing maintained ("Quick — first thought that comes to mind!")
- Design thinking principles: "Speed breaks overthinking — first ideas are often most creative."

**Idea Selection (8c) — "Which ideas have legs? Let's find the ones worth developing"**
- Conversation flow: Direct consultant language guiding selection
- Criteria: Clear, actionable selection dimensions

**Files modified:**
- `src/lib/ai/prompts/step-prompts.ts` (Journey Mapping, Reframe, Ideation, Concept, Validate, Mind Mapping, Crazy 8s, Idea Selection)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

**TypeScript Compilation:** ✓ Pass (0 errors in project)

**File Length:** ✓ 761 lines → 809 lines (+48 lines, +6.3% increase) — within +/- 15% constraint

**All 10 Step IDs Present:** ✓ challenge, stakeholder-mapping, user-research, sense-making, persona, journey-mapping, reframe, ideation, concept, validate

**All 3 Sub-Step IDs Present:** ✓ mind-mapping, crazy-eights, idea-selection

**STEP GOAL Lines Preserved:** ✓ All 10 STEP GOAL meta-instructions unchanged

**BOUNDARY Sections Preserved:** ✓ All BOUNDARY redirects present with personality-updated language

**PRIOR CONTEXT Sections Preserved:** ✓ All PRIOR CONTEXT USAGE sections present with natural bridging language

**GRID_ITEM Format Instructions:** ✓ Preserved in journey-mapping

**4-PART HMW BUILDER:** ✓ Preserved in reframe

**CONCEPT_GENERATION_PROMPT Constant:** ✓ Unchanged (JSON generation prompt at bottom of file)

**SYNTHESIS FORMAT:** ✓ Preserved in validate

**BILLBOARD HERO:** ✓ Preserved in concept

**Personality Language Present:** ✓ Direct, active consultant voice throughout all steps

## Success Criteria Met

- [x] All 10 steps and 3 sub-steps use consistent sharp consultant personality
- [x] Step prompts sound like an experienced practitioner, not a textbook
- [x] Boundary redirects are firm but friendly
- [x] Prior context references use natural bridging language
- [x] All functional prompt content is preserved exactly
- [x] No TypeScript compilation errors

## Impact

**User Experience:**
- Step-specific AI responses will match the sharp consultant personality from soul.md
- Design thinking principles feel like hard-won lessons from a practitioner, not textbook rules
- Boundary redirects maintain conversational energy while keeping users on track
- Prior context references feel natural ("Pull from the Challenge (Step 1) — who showed up in the HMW?")
- All 10 steps now have consistent personality tone and voice

**Developer Experience:**
- Step-prompts.ts personality is now aligned with soul.md and arc-phases.ts
- Personality updates are text-only — no structural changes to prompt assembly
- All functional methodology preserved (evidence requirements, format instructions, validation criteria)
- File length increase minimal (+6.3%) — personality adds minimal token overhead

**Technical:**
- No breaking changes — only text content updates in step instructions
- All existing functionality preserved (GRID_ITEM tags, HMW builder, concept sheets, synthesis format)
- CONCEPT_GENERATION_PROMPT constant unchanged (JSON generation, not conversational)
- Personality foundation now complete: soul.md (Plan 01) → chat-config.ts (Plan 01) → arc-phases.ts (Plan 01) → step-prompts.ts (Plan 02)

## Self-Check

Verifying claimed outputs exist:

**Files Modified:**
```bash
[ -f "/Users/michaelchristie/devProjects/workshoppilot.ai/src/lib/ai/prompts/step-prompts.ts" ] && echo "FOUND: src/lib/ai/prompts/step-prompts.ts" || echo "MISSING: src/lib/ai/prompts/step-prompts.ts"
```
FOUND: src/lib/ai/prompts/step-prompts.ts

**File Line Count:**
```bash
wc -l /Users/michaelchristie/devProjects/workshoppilot.ai/src/lib/ai/prompts/step-prompts.ts
```
809 /Users/michaelchristie/devProjects/workshoppilot.ai/src/lib/ai/prompts/step-prompts.ts

**Commits Exist:**
```bash
git log --oneline --all | grep -E "24ac5ee|6a79b54" | head -2
```
6a79b54 feat(33-02): update steps 6-10 and sub-steps with sharp consultant personality tone
24ac5ee feat(33-02): update steps 1-5 with sharp consultant personality tone

**Commit Hashes Verified:**
```bash
git log --oneline --all | grep -q "24ac5ee" && echo "FOUND: 24ac5ee" || echo "MISSING: 24ac5ee"
git log --oneline --all | grep -q "6a79b54" && echo "FOUND: 6a79b54" || echo "MISSING: 6a79b54"
```
FOUND: 24ac5ee
FOUND: 6a79b54

## Self-Check: PASSED

All claimed files and commits verified.

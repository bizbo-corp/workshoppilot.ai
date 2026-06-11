---
phase: 33-ai-personality
plan: 01
subsystem: AI Facilitation
tags: [personality, prompts, UX]
dependency_graph:
  requires: []
  provides: [soul.md personality definition, personality-injected system prompt]
  affects: [all AI responses, arc phase behavior, canvas bridging language]
tech_stack:
  added: [src/lib/ai/soul.md]
  patterns: [personality-driven prompt engineering, natural language canvas references]
key_files:
  created:
    - src/lib/ai/soul.md
  modified:
    - src/lib/ai/chat-config.ts
    - src/lib/ai/prompts/arc-phases.ts
decisions:
  - Sharp consultant personality: direct, efficient, zero fluff with charismatic energy
  - Message brevity enforced: max 3-4 paragraphs, no wall-of-text responses
  - Canvas references use whiteboard metaphor: "I see you've got X in Y..." not "The canvas contains..."
  - Arc phases use active, conversational language: "Dig deep" not "Your job is to..."
metrics:
  duration: 165s
  tasks: 2
  files_created: 1
  files_modified: 2
  commits: 2
  completed: 2026-02-13
---

# Phase 33 Plan 01: AI Personality Foundation Summary

**One-liner:** Sharp consultant personality with charismatic energy injected into system prompts, arc phases, and canvas bridging language to prevent wall-of-text responses and create natural conversational flow.

## What Was Built

### Task 1: soul.md Personality Definition & chat-config.ts Update
**Commit:** `8719632`

Created `src/lib/ai/soul.md` as the canonical AI personality document defining:
- **Identity:** Sharp consultant who's run 100+ design thinking workshops (practitioner, not textbook)
- **Energy:** Charismatic "you got this!" vibe — encouraging without being saccharine
- **Tone:** Conversational, not corporate; confident without being arrogant
- **Communication style:** Lead with the point, short paragraphs (2-3 sentences max), ONE question at a time, bold key terms, 1-2 emojis max
- **Anti-patterns:** No generic encouragement padding, no wall-of-text, no textbook definitions, no passive voice, no repeating user input
- **Canvas awareness:** Reference like a consultant reviewing a whiteboard with a client
- **Message format:** Shorter, punchy messages over comprehensive essays

Updated `src/lib/ai/chat-config.ts`:
1. **GENERAL GUIDANCE section** replaced with personality-infused version:
   - Injected sharp consultant personality definition
   - Added explicit message brevity instructions: "Keep responses SHORT. Max 3-4 short paragraphs."
   - Added conversational turn guidance: "Lead with your insight or question. Skip the preamble."
   - Preserved existing FORMAT, PACING, and AVOID rules but sharpened language
2. **CANVAS STATE reference text** updated to use natural whiteboard language:
   - Before: "Reference these naturally in conversation"
   - After: "Reference canvas items like a consultant reviewing a whiteboard with a client. Be specific: 'I see you've got [X] in [location]...' not 'The canvas contains the following items:'"
3. **CONTEXT USAGE RULES canvas line** updated for conversational canvas bridging:
   - Before: "Reference canvas items naturally when discussing {itemType}"
   - After: "When discussing {itemType}, connect to what's already on the whiteboard — 'Looking at your {itemType}...' or 'Building on what you've mapped...'"

**Files:**
- Created: `src/lib/ai/soul.md`
- Modified: `src/lib/ai/chat-config.ts` (GENERAL GUIDANCE, CANVAS STATE, CONTEXT USAGE RULES)

### Task 2: Arc Phase Instructions Update
**Commit:** `b0e8545`

Updated all 6 arc phase instructions in `src/lib/ai/prompts/arc-phases.ts` with sharp consultant personality tone:

- **Orient:** "Welcome them like a colleague, not a stranger" — reference prior step for continuity, end with focused first question
- **Gather:** "Dig deep. Ask ONE question at a time" — interviewing focus, follow up on surface-level answers, keep under 100 words
- **Synthesize:** "Lead with the goods" — present draft immediately, no preamble, end with "What would you change?"
- **Refine:** "You're polishing, not rebuilding" — apply feedback precisely, show updates not explanations, push back gently when needed
- **Validate:** "Quality check time. Lead with your assessment" — be specific about gaps, show concrete fixes, clear green light when ready
- **Complete:** "Quick win" — 1-2 punchy sentences acknowledging what they built, preview next step, keep energy up

Functional requirements preserved:
- [SUGGESTIONS] block instructions maintained in orient and gather phases
- Validation criteria checks intact
- Step-specific behavioral requirements unchanged

**Files:**
- Modified: `src/lib/ai/prompts/arc-phases.ts`

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

**TypeScript Compilation:** ✓ Pass (0 errors in source files)

**soul.md:** ✓ Exists with complete personality definition including sharp consultant identity, charismatic energy, communication style, anti-patterns, canvas awareness, and message format

**chat-config.ts GENERAL GUIDANCE:** ✓ Contains personality language ("You are a sharp consultant who's run 100+ design thinking workshops")

**chat-config.ts Message Brevity:** ✓ Contains wall-of-text prevention ("Never write a wall of text")

**chat-config.ts Canvas Bridging:** ✓ Uses natural whiteboard language ("Reference canvas items like a consultant reviewing a whiteboard")

**arc-phases.ts Personality Consistency:** ✓ All 6 phases contain personality-consistent language (5 distinct personality phrases found: "Dig deep", "Lead with the goods", "You're polishing", "Quality check time", "Quick win")

**arc-phases.ts SUGGESTIONS Blocks:** ✓ Preserved in orient and gather phases (2 occurrences found)

## Success Criteria Met

- [x] soul.md defines sharp consultant personality with charismatic energy
- [x] System prompt builder injects personality into every AI response
- [x] Message brevity instructions prevent wall-of-text responses
- [x] Canvas references use natural whiteboard-review language
- [x] All 6 arc phases have personality-consistent tone
- [x] No TypeScript compilation errors

## Impact

**User Experience:**
- AI responses will be shorter, punchier, and more conversational
- Canvas item references will feel natural ("I see you've got 3 stakeholders...") instead of robotic
- Arc phase behavior will match sharp consultant personality across all 10 steps
- Wall-of-text responses prevented by explicit brevity instructions

**Developer Experience:**
- soul.md provides canonical personality reference for future prompt updates
- Personality language is now consistent across system prompts and arc phases
- Natural whiteboard metaphor makes canvas integration more intuitive

**Technical:**
- No breaking changes — only text content updates in prompt assembly
- All existing functionality preserved (suggestions blocks, validation criteria, canvas actions)
- Personality foundation ready for Plan 02 step-specific prompt updates

## Self-Check

Verifying claimed outputs exist:

**Files Created:**
```bash
[ -f "/Users/michaelchristie/devProjects/workshoppilot.ai/src/lib/ai/soul.md" ] && echo "FOUND: src/lib/ai/soul.md" || echo "MISSING: src/lib/ai/soul.md"
```
FOUND: src/lib/ai/soul.md

**Files Modified:**
```bash
git log --oneline --all | grep -E "8719632|b0e8545" | head -2
```
b0e8545 feat(33-01): update arc phase instructions with sharp consultant tone
8719632 feat(33-01): create soul.md personality and inject into chat-config.ts

**Commits Exist:**
```bash
git log --oneline --all | grep -q "8719632" && echo "FOUND: 8719632" || echo "MISSING: 8719632"
git log --oneline --all | grep -q "b0e8545" && echo "FOUND: b0e8545" || echo "MISSING: b0e8545"
```
FOUND: 8719632
FOUND: b0e8545

## Self-Check: PASSED

All claimed files and commits verified.

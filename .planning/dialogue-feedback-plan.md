# Dialogue Feedback — Action Plan

Pulled from `/admin/dialogue` on 2026-05-16. 4 pending entries. Tackle in priority order.

| # | ID | Step | Severity | Title |
|---|----|------|----------|-------|
| 1 | `df_mr5rudfx0fbz9h18f44558v6` | user-research | ✅ **DONE** | Prompt example placeholder leaks into chat |
| 2 | `df_alpvbdra37waiamv7muebxha` | user-research | ✅ **DONE** | Interview confirm gets stuck, blocks workshop progression |
| 3 | `df_gaf52bv863yw8spowmrqw0d1` | user-research | ✅ **DONE** | Off-topic insight extraction (mis-reported as cross-workshop leak) |
| 4 | `df_vm1s6g2mmur3uyhu9mscj7qa` | challenge | ✅ **DONE** | Accept dialog talks about synthesizing the HMW but no statement gets emitted |

---

## 1. `df_mr5rudfx0fbz9h18f44558v6` — Prompt placeholder leaking into chat

**Step:** `user-research` · **Marker:** `src/lib/ai/prompts/steps/03_user_research.ts → userResearchStep`
**Workshop:** `ws_gorg6yevjenjk4zcyosdx2ye` · **Captured:** 2026-05-16T02:05:20Z

### Original feedback
> Some artifact is being seen in the dialogue which should be parsed or hidden before the user sees it in the chat window:
>
> `[In-character answer to the 4th question]... Well, that's the thing, isn't it? There's no one magic number. We look at a basket of indicators -- brand perception scores from surveys, social media sentiment, employee satisfaction ratings, customer loyalty metrics, and of course, good old financial performance. We weigh them differently depending on the client and the specific industry, but the goal is always to get a holistic picture.`

### Diagnosis
The string `"[In-character answer to the 4th question]..."` appears verbatim as a worked example inside the prompt at `03_user_research.ts:317`:

```
"[In-character answer to the 4th question]...

[CANVAS_ITEM: Final insight from this persona, Cluster: Persona Name]
```

Gemini is occasionally reproducing the literal placeholder text from the example into its real output. This is a prompt-engineering bug, not a parser bug — there is nothing to "hide" because the model is being instructed (by example) that this string is a valid prefix.

### Plan
1. Rewrite the worked example in `03_user_research.ts:315-323` so the placeholder is unambiguous (e.g. wrap in angle brackets / italics / explicit "EXAMPLE STRUCTURE — DO NOT COPY" header) **and** show a fully-realised concrete example alongside, so the model has something to imitate that is not itself a placeholder.
2. Audit the rest of `03_user_research.ts` (and other step prompts) for `[Persona Name]`, `[First Name]`, `[role grounded …]`, `[A vivid …]`, etc. — anywhere a bracketed placeholder appears INSIDE quoted example output, the same leakage class is possible. Replace with realised examples.
3. Add a defensive client-side filter in the chat renderer: strip any line that starts with `[` and ends with `]...` or contains the literal phrases `In-character answer`, `[Persona Name]`, `[First Name]`, `[role grounded`. This is a belt-and-braces fix in case future prompts regress.

### Files
- `src/lib/ai/prompts/steps/03_user_research.ts` — fix examples
- All other `src/lib/ai/prompts/steps/*.ts` — audit for the same pattern
- Chat message renderer (likely under `src/components/chat/` or `src/components/workshop/`) — add filter

### Verification
- Manually run a user-research interview to the 4th question and confirm no bracket placeholder appears.
- Add a unit test that asserts the rendered message does not contain `[In-character` / `[Persona Name]` / `[First Name]`.

### Status — landed
- `src/lib/ai/prompts/steps/03_user_research.ts` rewritten: added a top-level `PLACEHOLDER CONVENTION` rule that forbids both `<<…>>` and `[Descriptive …]` markers, converted every example slot to the `<<…>>` convention, and paired each structural example with a concrete realised example for the model to imitate.
- `src/lib/chat/parse-utils.ts` — `stripLeakedTags` now also strips `<<…>>` markers and any `[…]` whose contents aren't UPPERCASE_WITH_UNDERSCORES markup tags. New `isPlaceholderText` helper. `parseCanvasItems` now drops sticky-note items whose payload is itself a placeholder, so a leaked `[CANVAS_ITEM: <<final insight>>, Cluster: <<persona>>]` never becomes a real sticky note.
- `src/components/workshop/chat-panel.tsx` — same updates to the inline copies of `stripLeakedTags` and `parseCanvasItems`.
- Verified with 14 scrubber test cases (strips the exact leak from the feedback, keeps valid markup, drops placeholder-only canvas items, keeps real ones). `npx tsc --noEmit` clean.
- Same placeholder pattern exists in `02_stakeholder_mapping.ts`, `04_sense_making.ts` (extensive), and likely others — the defensive renderer scrub now covers them all, but the prompts themselves should be migrated to the `<<…>>` convention as a follow-up.

---

## 2. `df_alpvbdra37waiamv7muebxha` — Interview Confirm gets stuck, blocks workshop

**Step:** `user-research` · **Marker:** `src/lib/ai/prompts/steps/03_user_research.ts → userResearchStep`
**Workshop:** `ws_gorg6yevjenjk4zcyosdx2ye` · **Captured:** 2026-05-16T02:10:02Z

### Original feedback (summary)
After the last persona's interview, the AI offers the "happy with what we've captured" wrap-up before the user is finished asking questions. The user wanted to ask another question, but doing so caused the dialog to lose track and never resurface the **Confirm Interview** button. Without confirming interviews, the **Next** button to the next stage is gated, so the entire workshop is stuck.

The pasted transcript shows the wrap-up text appearing twice, interleaved with a stray "give me question ideas for this persona" → answer cycle and a bare "can we confirm the interview" line that the model ignored.

### Diagnosis
Two intertwined failures:
- **Premature transition.** Phase B → Phase C ("ready to wrap up") fires on the 4th question of the last persona without the user having opted in. The prompt at `03_user_research.ts:283-289` mandates a two-option fork (`Ask one more question` / `Move to next interviewee`) on the 4th question of every persona, but the LAST persona transitions straight into Phase C wrap-up text (line 308). User has no escape hatch.
- **Stuck state.** Once Phase C wrap-up has been emitted, asking another question or saying "can we confirm the interview" no longer surfaces a Confirm Interview affordance. The model echoes the same wrap-up text instead of recognising the explicit confirmation request.

### Plan
1. **Add the same fork after the last persona.** Change the prompt section at `03_user_research.ts:307-308` ("LAST PERSONA → Phase C") so the model still surfaces a `[SUGGESTIONS]` fork before transitioning. Options: `Wrap up and review insights` / `Ask one more question`. Only on `Wrap up …` does it move to Phase C.
2. **Make Confirm Interview reachable from any state once min items met.** Trace where the Confirm Interview button is gated (likely the same `step-container.tsx` logic as the Accept Challenge gate at line 409-417 of `step-container.tsx`). For `user-research`, the gate should be: at least one [CANVAS_ITEM] per selected persona AND `allPersonasInterviewed === true` — independent of whether Phase C wrap-up has been emitted. Confirm that's the current behaviour; if so, the bug is purely (1). If not, fix the gate too.
3. **Recognise explicit confirmation intent.** Add a rule to the prompt: if the user types "confirm", "we're done", "can we move on", "next stage", or similar, IMMEDIATELY emit a short acknowledgement and a `[SUGGESTIONS]` block with `Confirm interviews and move on`. Do not re-emit wrap-up prose.
4. **Manual recovery path.** If the gate logic in (2) turns out to be brittle, expose an admin/diagnostic "force-confirm" affordance so a stuck user can unblock themselves. (Lower priority — fix the prompt first.)

### Files
- `src/lib/ai/prompts/steps/03_user_research.ts` — fork rule, intent recognition
- `src/components/workshop/step-container.tsx` — verify/adjust `showConfirm` gate for user-research
- Possibly `src/lib/workshop/step-metadata.ts` — confirm gate config

### Verification
- Reproduce: run the workshop to the last persona, ask 4 questions, then explicitly type "ask one more" — must get the in-character answer and the Confirm fork again.
- Reproduce: in the wrap-up state, type "can we confirm the interview" — must surface the Confirm button immediately.
- Confirm the `Next` button activates after Confirm Interview is pressed.

### Status — landed
- `src/lib/ai/prompts/steps/03_user_research.ts` — three changes:
  1. **Fork-first rule everywhere.** Rewrote the "AFTER THE FINAL QUESTION FOR A PERSONA" section so EVERY persona's 4th-question response surfaces a `[SUGGESTIONS]` fork — never auto-transitions. For non-last personas the fork is `Ask one more question for X / Move to next interviewee`; for the last remaining persona it's `Ask one more question for X / Wrap up and review what we've gathered`. The old "LAST PERSONA → go DIRECTLY to Phase C" rule (which was the smoking gun) is gone.
  2. **MESSAGE 1 / MESSAGE 2 split.** Restructured the transition example to make it explicit that the answer-plus-fork is one message and the next-persona introduction is a SEPARATE message that only fires after the user picks "Move to next interviewee" — eliminating the bundled-transition pattern that previously stole the user's chance to extend an interview.
  3. **Universal confirmation-intent rule.** New top-level "UNIVERSAL RULE" section that fires at ANY point: if the user types confirm-y intent ("confirm", "we're done", "next stage", "I'm happy", etc.), the model emits a single short reply pointing to the Confirm Research Insights button — no wrap-up prose, no SUGGESTIONS, no CANVAS_ITEM, no further questions. If the button isn't yet visible, the rule says to name which persona is missing an insight.
- Confirm-button gate verified in `src/components/workshop/step-container.tsx:376-417` — it is purely canvas-state-based (5+ canvas items, every persona card has at least one insight clustered to it), with no dependency on AI dialog state. No code change needed here; the bug was entirely in the prompt loop.
- `npx tsc --noEmit` clean.

---

## 3. `df_gaf52bv863yw8spowmrqw0d1` — Cross-workshop context leakage

**Step:** `user-research` · **Marker:** `src/lib/ai/prompts/steps/03_user_research.ts → userResearchStep`
**Workshop:** `ws_gorg6yevjenjk4zcyosdx2ye` · **Captured:** 2026-05-16T02:07:48Z

### Original feedback
> Some unrelated "Storytelling" stuff is leaking from one workshop into the next. This is about corporate reputation not storytelling. Check there is no leaking.

### Diagnosis
The "storytelling" reference is suspicious because `01_challenge.ts` uses storytelling repeatedly as a worked example (lines 88, 94 — "if someone says 'I want to create a storytelling framework…'"). Two hypotheses, in order of likelihood:

1. **Prompt example bleed.** Same class of bug as #1 — the model is pulling "storytelling" from the example text in the challenge-step prompt and treating it as in-domain content.
2. **Cross-workshop persistent context bleed.** The user has a previous workshop in their history about storytelling, and the persistent-context layer (per `assemble-context.ts`) is mixing it into the current workshop's prompt. Possible if persistent context is keyed on `userId` rather than `(userId, workshopId)`.

### Plan
1. **Confirm which.** Pull the captured system prompt for this entry via `/api/admin/chat-request-log?sessionId=ws_gorg6yevjenjk4zcyosdx2ye&stepId=user-research&at=2026-05-16T02:07:48Z`. If "storytelling" appears anywhere in the assembled context, that points to (2). If it only appears in the prompt examples, (1).
2. **If (1):** Replace storytelling examples in `01_challenge.ts:88,94` with a non-thematically-loaded alternative (e.g. "if someone says 'I want to create a habit-tracker app…'") to avoid biasing the model's attention.
3. **If (2):** Audit `src/lib/context/assemble-context.ts` — verify every layer is scoped by `workshopId`. Specifically check the long-term/persistent layers. Add a unit test that two workshops belonging to the same user produce non-overlapping context.
4. Add a regression check: a script that scrapes recent assembled prompts from `chat_request_log` and flags any prompt that mentions a topic from a *different* workshop owned by the same user.

### Files
- `src/lib/context/assemble-context.ts`
- `src/lib/ai/prompts/steps/01_challenge.ts` (if hypothesis 1)
- New test under `src/lib/context/__tests__/`

### Verification
- Captured prompt no longer mentions storytelling for a corporate-reputation workshop.
- Two workshops by the same user, one about Storytelling and one about Reputation, both produce clean, non-overlapping prompts.

### Status — landed (and the diagnosis was different than expected)
- **Pulled the captured chat_request_log for this workshop (ws_gorg6yevjenjk4zcyosdx2ye, step user-research, ~2026-05-15T14:08Z).** Result: NOT cross-workshop bleed. All `PRIOR STEP CONTEXT` references were to this same workshop's challenge + stakeholder-mapping outputs. The only stray "storytelling" mentions were (a) one line in the shared `chat-config.ts` emoji-usage example, and (b) two appearances of the literal sticky note **"Storytelling skills are becoming crucial for analysts"** in the canvas-state section — a sticky the AI itself wrote during the Anders persona interview, capturing a metaphor ("we're moving from data crunchers to storytellers") from the in-character answer as if it were on-topic for the corporate-reputation challenge.
- **Hypothesis 2 (persistent-context bleed) ruled out.** No `assemble-context.ts` audit needed.
- **Hypothesis 1 (example bleed) partially confirmed** — the `chat-config.ts` line was the only cross-step "storytelling" prime in the assembled prompt. The `01_challenge.ts` storytelling references stay scoped to the challenge step and didn't appear in the user-research prompt at all.
- **Real root cause: off-topic insight extraction.** The AI was capturing whatever sounded quotable from the persona's answer rather than filtering for on-challenge relevance.
- **Fixes landed:**
  1. `src/lib/ai/prompts/steps/03_user_research.ts` — added an `INSIGHT ANCHORING` rule to In-Character Response Rules: `[CANVAS_ITEM]` insights must bear directly on the Step 1 challenge, with the exact "Storytelling skills…" failure called out by name as a concrete don't-do example. If the only takeaway is off-topic, the model now emits no canvas item rather than capturing a tangent. Added the same `TIGHTLY anchored` requirement to in-character answers (it previously only applied to suggestion questions).
  2. `src/lib/ai/chat-config.ts` — swapped the `"Ooh, storytelling for professionals — I'm into this 🔥"` emoji example to `"Ooh, habit tracking for shift workers"` so the shared system prompt no longer primes "storytelling" as a recurring topic across all steps.
- `npx tsc --noEmit` clean.
- **Bonus finding (not fixed, worth follow-up):** the captured prompt's `Interview Progress` and `Persona Cards` sections are mis-counting — they list a sticky note ("Quantitative data only tells you 'what,' not 'why,' Cluster: Anders…") as if it were a persona card, which inflates Persona Cards to 4 and shows the same item in "Remaining". This is the same root data-shape issue that could cause the `allPersonasInterviewed` gate to mis-fire (item #2). Worth a separate fix.

---

## 4. `df_vm1s6g2mmur3uyhu9mscj7qa` — Accept dialog without a written challenge statement

**Step:** `challenge` · **Marker:** `src/lib/ai/prompts/steps/01_challenge.ts → challengeStep`
**Workshop:** `ws_vutdmmjeidkkx0axi5z3wquq` · **Captured:** 2026-05-16T03:18:46Z

### Original feedback
> Help me craft the challenge statement from the idea, the problem, and the audience.
> Okay, I can see you've already pinned down the idea, the problem, and the audience on the board. … Let's pull that together into a "How might we…" question.
>
> **Accept Challenge Statement [Button]**
>
> Dialog shows this but the challenge statement is not written, nor is it on the sticky note.

### Diagnosis
There's already a guard added in response to a prior feedback (`df_d3dgmx43wvb48du2pkub1180`) at `step-container.tsx:400-407`:

```ts
const challengeStatementFilled =
  step?.id === 'challenge'
    ? stickyNotes.some(
        (p) => p.templateKey === 'challenge-statement' && p.text.trim().length > 0,
      )
    : true;
```

So the Accept button SHOULD only appear once a `challenge-statement` sticky has text. Two ways this still goes wrong:

1. The model emits an EMPTY `[CANVAS_ITEM key="challenge-statement"]` (e.g. literal `How might we…?` from the prompt instruction at `01_challenge.ts:114`) — text is `"How might we…?"` so `text.trim().length > 0` passes but the user sees a placeholder.
2. The model writes prose ("Let's pull that together into a 'How might we…' question.") but never actually emits the `[CANVAS_ITEM key="challenge-statement"]` markup. In that case the gate would correctly hide the Accept button — but the screenshot shows the button visible. Possible: a *different* sticky with key `challenge-statement` exists from an earlier turn with placeholder text.

### Plan
1. **Tighten the gate.** Reject placeholder text. Update `step-container.tsx:400-407` to also exclude obvious placeholder values:
   ```ts
   const placeholderRe = /^how might we[…\.\?\s]*$/i;
   const challengeStatementFilled = step?.id === 'challenge'
     ? stickyNotes.some(
         (p) => p.templateKey === 'challenge-statement'
           && p.text.trim().length > 5
           && !placeholderRe.test(p.text.trim()),
       )
     : true;
   ```
2. **Fix the prompt.** `01_challenge.ts:114` instructs the model to emit `[CANVAS_ITEM key="challenge-statement"]How might we…?[/CANVAS_ITEM]` — that's the literal placeholder string. Replace with a clear instruction: "Synthesize the challenge statement now and emit `[CANVAS_ITEM key="challenge-statement"]<your full one-sentence HMW question, no placeholders>[/CANVAS_ITEM]`. Never emit the literal text 'How might we…?' — always include the actual content."
3. **Sanity-check sticky persistence.** Confirm that previous-turn placeholder stickies aren't sticking around between AI turns. If the model corrects itself in a later turn, the old placeholder sticky should be replaced, not duplicated.
4. **Reproduce + verify** by completing inputs (idea/problem/audience), then asking for the synthesis, and confirming: (a) a real HMW sticky appears, (b) Accept button appears only after that, (c) clicking Accept advances cleanly.

### Files
- `src/components/workshop/step-container.tsx` — tighten gate
- `src/lib/ai/prompts/steps/01_challenge.ts` — line 114 placeholder fix
- Possibly the canvas-item parser/applier (search for `challenge-statement` handling)

### Verification
- Cannot get the Accept button to appear with an empty / "How might we…?" sticky.
- Statement is fully written before the Accept dialog ever surfaces.

### Status — landed
- **Tightened the gate** in `src/components/workshop/step-container.tsx:400-417`. The `challengeStatementFilled` check now requires `text.length >= 10` AND rejects any text matching `^how might we[\s.…?!]*$` (case-insensitive). So a sticky containing only `"How might we…?"`, `"How might we...?"`, `"How might we?"`, or any prefix-only variant no longer satisfies the gate — Accept stays hidden until the model writes a content-bearing question.
- **Fixed the upstream prompt sources that primed the placeholder leak.** Five spots were instructing or showing the model the literal `[CANVAS_ITEM key="challenge-statement"]How might we…?[/CANVAS_ITEM]` as an output example, which Gemini was sometimes emitting verbatim:
  1. `src/lib/ai/prompts/steps/01_challenge.ts:113-116` — "Use the board" handler now pairs a STRUCTURAL pattern (`<verb phrase>`, `<for whom>`, `<so that what changes>`) with a CONCRETE realised example (`How might we help first-time managers give honest feedback without damaging trust?`), plus an explicit "NEVER emit the literal prefix-only string" rule.
  2. `src/lib/ai/chat-config.ts:251-269` — the shared CANVAS ACTIONS block: structural examples now use `<angle bracket>` placeholders, and a fully realised CONCRETE EXAMPLE block (idea/problem/audience/challenge-statement, all with real content) sits beside it. The "always include at minimum `[CANVAS_ITEM key="challenge-statement"]How might we...?[/CANVAS_ITEM]`" instruction is gone — the new rule says don't emit a CANVAS_ITEM you can't fill with real content.
  3. `src/lib/workshop/context/canvas-context.ts:683` — in-context DIRECTIVE rewritten to call out "never the bare literal placeholder" and require the FULL HMW sentence.
  4. `src/app/api/chat/route.ts:282-286` — TURN OVERRIDE for "use the board" now embeds a concrete realised example (`"How might we help first-time managers…"`) and explicitly forbids the bare-prefix payload.
- `npx tsc --noEmit` clean.

---

## Cross-cutting follow-ups (not blockers)

- **Prompt placeholder lint.** Items #1 and #4 are the same root cause (prompt examples that the model occasionally emits verbatim). Add a one-shot lint: scan `src/lib/ai/prompts/**` for any `"["..."]"` token that appears inside a quoted example. Either rewrite or wrap in a `<<placeholder>>` convention plus a system instruction "never emit `<<...>>`".
- **Defensive renderer filter.** Item #1 also benefits from a renderer-side scrub of obvious placeholder leakage. One file change covers all future regressions of this class.
- **Capture richer logs.** Items #2, #3, #4 would all be much easier to diagnose if the captured prompt log included the full *output* of the AI turn that triggered the feedback, not just the system prompt. Worth a small follow-up.

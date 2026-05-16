# Step 2 ABSENCE PROTOCOL Bug — Triage & Fix Plan

**Status:** Diagnosed (root cause confirmed in code)
**Severity:** Blocker — users cannot progress past Step 1 via the Set-up/Start-Workshop entry path
**Reported:** 2026-05-16, during phase 62.2 verification
**Reporter:** Michael (orchestrator surfaced during live-DB checks)

> **Handoff note (read first if resuming with fresh context):**
> The stuck dev session `ses_lw3pqlqrv272udsyosj5mwtv` has been unstuck manually with a sentinel `step_summaries` row tagged `id = 'sum_manual_unstick_62'` (workshop_step `wst_a2nkbmoka7cmzg4yhqx26x6a`). The stale stakeholder-mapping `chat_messages` rows (refusal + step-start trigger) were deleted at the same time. So this dev workshop will appear to work normally even though the underlying code bug is unfixed. The backfill script in action item #3 should either ignore or overwrite that sentinel row.

---

## Symptom

When a user navigates to **Step 2 (Stakeholder Mapping)**, the AI greeting outputs a single hard-stop line and refuses to proceed:

> It looks like Step 1 (Challenge) hasn't been confirmed yet. Please go back to Step 1, lock in your challenge statement, then return here.

This happens even when:
- The URL is `step/2` (so the user genuinely is on stakeholder-mapping)
- `workshop_steps` shows `status = 'complete'` for the `challenge` row
- The user has a real challenge conversation in `chat_messages` on Step 1 (e.g. 4 exchanges on the challenge step)

So from the user's POV: "I confirmed it. Why is the AI gaslighting me?"

---

## What Is the ABSENCE PROTOCOL?

`src/lib/ai/prompts/steps/02_stakeholder_mapping.ts:85-90` — a guard added in **phase 62.1 Plan 03 (HALL-01)** to prevent the model from fabricating a challenge statement when none is available:

```
ABSENCE PROTOCOL (CRITICAL — SUPERSEDES THE GREETING DIRECTIVE BELOW):
If the PRIOR STEP CONTEXT contains the literal string "NO PRIOR STEP CONTEXT AVAILABLE",
or the Step 1 challenge summary is missing, blank, or contains no recognizable
"How might we…?" challenge statement: do NOT proceed with the greeting.
[...]
Reply with EXACTLY this single short message and nothing else:
> It looks like Step 1 (Challenge) hasn't been confirmed yet. Please go back to Step 1,
> lock in your challenge statement, then return here.
This is a hard stop.
```

The trigger string is injected by `assembleStepContext` (`src/lib/context/assemble-context.ts`) when a step has deps but `step_summaries` returns 0 rows for those deps. This is intentional — preventing hallucination is the point.

**The safeguard is working as designed. The bug is upstream:** Step 1 gets marked `complete` without `step_summaries` ever being written.

---

## Root Cause (Confirmed in Code)

There are **two paths** that mark a workshop step complete in this codebase:

### Path A — `advanceToNextStep` server action

`src/actions/workshop-actions.ts:609` — the Next/Continue button flow.

```ts
await generateStepSummary(workshopId, sessionId, workshopStepId, currentStepId, stepName);
```

**Correctly generates a summary.** No bug here.

### Path B — `advanceFromStepOne` helper (Set-up / Start-Workshop flow)

`src/actions/workshop-setup-actions.ts:195-215`:

```ts
async function advanceFromStepOne(workshopId: string): Promise<void> {
  const now = new Date();
  await db
    .update(workshopSteps)
    .set({ status: 'complete', completedAt: now })   // <-- marks complete
    .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, STEP_1_ID)));
  await db
    .update(workshopSteps)
    .set({ status: 'in_progress', startedAt: now })
    .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, STEP_2_ID)));
  // <-- never calls generateStepSummary
}
```

**This helper marks Step 1 complete WITHOUT generating a step_summary.** It's called from two places:

1. `setupWorkshop("start_now")` — the "Set-up Workshop" wizard's start-now branch (`workshop-setup-actions.ts:107`)
2. `startWorkshop` — the lobby's "Start Workshop" button (`workshop-setup-actions.ts:178`)

Both entry points come from UI added during the v1.9 / v2.0 multiplayer + dot voting work.

### Live-DB Confirmation

For session `ses_lw3pqlqrv272udsyosj5mwtv` (workshop `ws_vutdmmjeidkkx0axi5z3wquq`):

```
workshop_steps.challenge.status         = 'complete'
step_summaries(workshop_step_id=...)    = 0 rows
chat_messages on challenge step          = 8 rows (4 user, 4 assistant)
chat_request_logs on stakeholder-mapping = 1 row (the ABSENCE PROTOCOL refusal)
```

So we have full chat history (Path B doesn't clear it), step is `complete`, summary is missing, downstream step injects the sentinel → model hits the protocol → user sees the refusal.

### Why It Wasn't Caught Earlier

- `generateStepSummary` has an internal try/catch with a fallback summary insert. So even when summary generation _fails_, a fallback row lands — preserving the invariant for Path A.
- Path B simply **never calls** `generateStepSummary`. There's no catch-it-anyway fallback for this path.
- The 62.1 sentinel/ABSENCE PROTOCOL only landed on 2026-05-15. Before that, the missing-summary state was tolerated (model would hallucinate a generic stakeholder discussion). 62.1 surfaced the latent gap by hard-stopping instead of fabricating.
- The PawPal seed data and most E2E tests use Path A (advanceToNextStep), so the gap never appeared in tests.

---

## Sprint Context: What Changed in 62.1 & 62.2

This bug was created by v1.9/v2.0 (Path B introduction) and **surfaced** by 62.1 (sentinel hard-stop). Understanding both sprints helps frame the fix.

### Phase 62.1 — Cross-Workshop Dialogue Leak + Duplicate Greetings (shipped 2026-05-16)

Hotfix under v2.0. Three plans:

**Plan A (DIAG-01)** — Observability: hoisted `let requestId: string | null = null` in `/api/chat` POST handler, added fresh-generation logging to `chat_request_logs`. Replay logging deferred to Plan B.

**Plan B (GREET-01 + SCOPE-01)** — Duplicate greeting fix + scope enforcement:
- Migration `0024_chat_messages_nonempty_check.sql` added composite unique index and CHECK constraint `chat_messages_message_id_nonempty_chk` (length > 0)
- DB-lock greeting singleton via `claimGreetingPlaceholder` — prevents concurrent greeting generation under React Strict Mode 5x-rapid-mount
- 409/404 scope assertion: server returns 409 if another participant won the greeting race, 404 if the workshop scope is wrong
- Skip `abortSignal` for `__step_start__` requests (placeholder already inserted, stream must complete server-side)
- `result.consumeStream()` added alongside `toUIMessageStreamResponse` so the stream finishes server-side even when client disconnects
- `fillGreetingPlaceholder` UPDATES the placeholder row from `greeting:…` id to the real assistant id

**Plan C (HALL-01) — Hallucination hardening** ← _this is the one that introduced the protocol you're hitting_:
- `assembleStepContext` injects the literal sentinel `⚠️ NO PRIOR STEP CONTEXT AVAILABLE — DO NOT INVENT ONE` when a step has non-empty deps but `step_summaries` returns 0 rows for those deps
- Stakeholder-mapping prompt (Step 2) gained the ABSENCE PROTOCOL block: if the sentinel is present OR the challenge summary is missing/blank/lacks "How might we…?", output the single hard-stop refusal and end
- Defense-in-depth: the sentinel is injected at the context layer independent of the prompt layer, so even if the prompt is bypassed the missing-summary state is visible

**Why this exists:** Before 62.1, when prior context was missing, the model would invent a plausible-sounding stakeholder list anchored to a fabricated challenge. The fix stops that — but it surfaces the latent Path B gap as a user-facing refusal.

### Phase 62.2 — AI SDK v5 Message-ID Server-Side Resolution (shipped 2026-05-16)

Follow-up under v2.0 to eliminate three workarounds inherited from 62.1. Two plans:

**Plan 01** — Server-side `generateMessageId`:
- Hoisted `responseMessageId = createPrefixedId('msg')` adjacent to the hoisted `requestId` in `/api/chat` POST handler
- `chat_request_logs.response_message_id` populated **at INSERT time** (no post-stream backfill)
- `toUIMessageStreamResponse({ generateMessageId: () => responseMessageId!, originalMessages: messages, onFinish })` — server-id authoritative, propagated to client via AI SDK v6 wire-format `start` chunk
- `fillGreetingPlaceholder` called with `responseMessage.id` (real AI SDK-generated id) instead of `greetingClaim.messageId` (deterministic placeholder) — eliminates dual-row state
- Backfill UPDATE block at `route.ts:342-357` deleted
- Empty-id `.filter((row) => row.messageId.length > 0)` at `message-persistence.ts:81` deleted (CHECK constraint is the canary now)

**Plan 02** — Verification artifacts:
- `scripts/verify-message-id-resolution.ts` codifies AC-1, AC-2, AC-4, AC-2-wire-through, AC-6 (runs via `npx tsx`, follows `verify-sentinel.ts` precedent)
- 62.1 SUMMARYs' "Known Limitations" sections marked CLOSED with phase 62.2 reference

**Live-DB verification (5/5 fresh-gen rows passed):** Every fresh-gen `chat_request_logs.response_message_id` is populated, matches the corresponding `chat_messages.message_id`, no `greeting:…` ids linger, CHECK constraint intact, zero empty ids project-wide.

**Relevance to this bug:** None directly. 62.2 changes message-id flow, not summary generation. The ABSENCE PROTOCOL refusal observed on `stakeholder-mapping` during 62.2 verification was the FIRST clean signal that the latent Path B gap existed.

---

## Fix Path

### The Decision: Where Should the Summary Come From?

Path B fires when the user finishes the Set-up Workshop wizard or clicks Start Workshop from the lobby. At that point:
- The challenge **structured artifact** is already populated on the `workshops` table (`hmwStatement`, `idea`, `problem`, `audience`, `originalIdea`, `challengeRevision`, `challengePublishedAt`) — see `src/lib/workshop/challenge-artifact.ts:80-89`
- A challenge **conversation** may or may not exist in `chat_messages` (depends on whether the user used chat before clicking Set-up)

The summary needs to satisfy the stakeholder-mapping prompt's check: contain a recognizable "How might we…?" statement. The structured artifact has exactly that (`hmwStatement`).

### Recommended Fix (one-line in code, low-risk)

Call `generateStepSummary` from `advanceFromStepOne` **with the same try/catch tolerance** as `advanceToNextStep`. But also write a **deterministic structured fallback** when chat is empty so we never depend on Gemini for this critical path.

**Option A — Minimal patch:** add `generateStepSummary` call to `advanceFromStepOne`. Relies on chat-history-driven summary; falls back to "Step Challenge completed. Summary generation failed…" if Gemini fails (the existing fallback). **Risk:** if `chat_messages` is empty (user used the form-only Set-up wizard without chatting), Gemini summarizes nothing useful and the model still fails to satisfy "How might we…?" recognition.

**Option B (preferred) — Structured fallback:** introduce a new helper `generateChallengeSummaryFromArtifact(workshopId, workshopStepId)` that synthesizes a deterministic summary from the `workshops` row's structured challenge fields. Format:

```
- Challenge: How might we [hmwStatement] for [audience]?
- Original idea: [originalIdea or "—"]
- Problem framing: [problem]
- Target audience: [audience]
```

In `advanceFromStepOne`, prefer chat-derived summary if `chat_messages` for step 1 is non-empty, else use the structured fallback. Both write `step_summaries` synchronously before returning.

**Why Option B:** the Set-up Workshop wizard is intentionally a form-first entry; users may never chat on step 1 before advancing. We can't depend on chat history existing. The structured artifact is the source of truth for the challenge at that moment.

### Backfill for Existing Stuck Sessions

Any session currently in `workshop_steps.challenge.status='complete' AND no step_summary` is stuck. One-shot script: find affected rows, call the new helper for each. Could be a `scripts/backfill-missing-challenge-summaries.ts` following the existing verify-script pattern.

Affected session in dev DB right now: `ses_lw3pqlqrv272udsyosj5mwtv` (workshop `ws_vutdmmjeidkkx0axi5z3wquq`).

### Edge Cases to Cover

1. **Idempotency** — `advanceFromStepOne` is called from two entry points and may be called twice (e.g., facilitator clicks Start Workshop after wizard already ran). Summary write must be `onConflictDoNothing()` against the existing `step_summaries_workshop_step_id_unique` constraint.
2. **Multiplayer + Liveblocks** — challenge artifact may live in Liveblocks storage until `syncChallengeArtifactFromLiveblocks` runs (which `setupWorkshop` already calls right after `advanceFromStepOne`). Reorder: sync FIRST, then advance + summarize, OR re-read the artifact after sync inside the summary helper.
3. **Set-up wizard "schedule" branch** — only `start_now` calls `advanceFromStepOne`. The "schedule" branch defers stepping to the lobby's `startWorkshop`. No change needed there beyond also covering `startWorkshop` (which we get for free since both share the helper).
4. **`completedAt` ordering** — `workshop_steps.status='complete'` should not be visible to readers until `step_summaries` exists. Wrap both writes in a transaction so a reader-poll between the two updates never sees the inconsistent intermediate state. The repo uses `neon-http` (no SELECT FOR UPDATE) so a single `db.transaction([…])` batch is sufficient.

---

## File-Level Action List

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/context/generate-summary.ts` | Add `generateChallengeSummaryFromArtifact(workshopId, workshopStepId)` exporting alongside `generateStepSummary`. Pulls structured fields from `workshops` row, writes `step_summaries` with `onConflictDoNothing`. |
| 2 | `src/actions/workshop-setup-actions.ts` | Inside `advanceFromStepOne`: after marking step 1 complete (or in same transaction batch), call summary helper. Prefer chat-derived (via `generateStepSummary`) if `chat_messages` on step 1 is non-empty, else structured fallback. Wrap in try/catch — never block step advance. |
| 3 | `scripts/backfill-missing-challenge-summaries.ts` (new) | One-shot backfill: find workshops with `challenge.status='complete'` and no `step_summaries` row → run the structured-fallback helper for each. Idempotent. |
| 4 | (optional) `src/lib/context/__tests__/assemble-context.test.ts` | Add a regression test: workshop where step 1 was completed via setup path → context assembly does NOT inject the sentinel for stakeholder-mapping (proof the gap is closed). |
| 5 | (optional) `scripts/verify-message-id-resolution.ts` precedent | Add `scripts/verify-step-summary-on-setup.ts` that drives `setupWorkshop("start_now")` against a fixture workshop and asserts a `step_summaries` row lands. Codifies the regression check. |

**No DB migration needed** — `step_summaries` already has the right schema; the unique index already prevents double-inserts.

---

## Suggested Phase Framing (when ready for GSD)

This sits naturally as a **decimal hotfix phase 62.3** under v2.0, same pattern as 62.1/62.2:

- **Plan 01** — Add summary write to `advanceFromStepOne` + structured-fallback helper. Human-verify checkpoint covering: Set-up Workshop → Step 2 greeting is normal (not the refusal). Stuck session is re-runnable via backfill.
- **Plan 02** — Backfill script + regression test.

But the user explicitly asked for this to be **outside GSD** for now — so consider this document the design doc; spin up GSD only when ready to execute.

---

## Quick Manual Workaround (for the stuck session right now)

If you want to unstick `ses_lw3pqlqrv272udsyosj5mwtv` without code changes, you can manually INSERT a `step_summaries` row pointing at the challenge workshop_step:

```sql
INSERT INTO step_summaries (workshop_step_id, step_id, summary, token_count)
VALUES (
  'wst_a2nkbmoka7cmzg4yhqx26x6a',
  'challenge',
  '- Challenge: [paste How might we statement here]
- Audience: [audience]
- Problem framing: [problem]',
  NULL
);
```

Then refresh Step 2. The sentinel will no longer inject, the ABSENCE PROTOCOL will not trigger, and the model will greet normally using the inserted summary as Step 1 context.

You can pull the actual challenge details from the `workshops` row:

```sql
SELECT hmw_statement, idea, problem, audience, original_idea
FROM workshops WHERE id = 'ws_vutdmmjeidkkx0axi5z3wquq';
```

---

## Open Questions

1. **Set-up Workshop wizard UX** — should we require the user to chat on Step 1 before allowing "Start Workshop", or is the form-only path a first-class entry? (Implementation differs slightly; current code clearly assumes form-only is fine.)
2. **Multiplayer-only or solo too?** Quick check needed: does the solo workshop creation path also go through `advanceFromStepOne`, or only `advanceToNextStep`? If solo never hits Path B, this is multiplayer-only and lower-blast-radius.
3. **Other steps with deps** — are there OTHER step pairs where a similar Path-B-style helper bypasses summary generation? `journey-mapping`, `persona`, etc. all have deps. A grep for any other update site of `workshop_steps.status` would catch them; the only other "set to complete" hit in code is the dedicated complete API route (which DOES generate a summary). So we're likely safe — but worth a 5-minute audit before declaring scope.

---

## Appendix — Files Touched / Referenced

- `src/lib/ai/prompts/steps/02_stakeholder_mapping.ts:85-90` — ABSENCE PROTOCOL definition
- `src/lib/context/assemble-context.ts` — sentinel injection logic (from 62.1 Plan C)
- `src/lib/context/generate-summary.ts` — `generateStepSummary` (Path A's summary writer)
- `src/actions/workshop-actions.ts:609` — Path A caller (`advanceToNextStep`)
- `src/actions/workshop-setup-actions.ts:195-215` — Path B (`advanceFromStepOne` — the bug)
- `src/actions/workshop-setup-actions.ts:48-140` — `setupWorkshop` (Path B caller #1)
- `src/actions/workshop-setup-actions.ts:142-189` — `startWorkshop` (Path B caller #2)
- `src/components/workshop/setup-workshop-wizard.tsx:146` — UI trigger for `setupWorkshop`
- `src/app/workshop/[sessionId]/lobby/start-workshop-button.tsx:27` — UI trigger for `startWorkshop`
- `src/lib/workshop/challenge-artifact.ts:80-89` — structured challenge fields available for fallback
- `src/db/schema/step-summaries.ts` — table schema, unique on workshop_step_id
- `drizzle/0024_chat_messages_nonempty_check.sql` — 62.1 migration (composite key + CHECK)
- `.planning/phases/62.1-fix-cross-workshop-dialogue-leak-and-duplicate-greetings/` — phase 62.1 plans + SUMMARYs
- `.planning/phases/62.2-ai-sdk-v5-message-id-resolution/` — phase 62.2 plans + SUMMARYs + VERIFICATION

---
name: dialogue-feedback
description: >-
  Pull and work through the Dialogue Feedback backlog — the admin critiques
  logged from the in-app feedback dialog (admin/dialogue) about specific AI
  facilitation steps. Use when the user says "work through the dialogue
  feedback", "get the feedback backlog", "address the admin feedback",
  "what feedback came in", "fix the dialogue critiques", or similar. Fetches
  pending entries, opens the file each one points at, applies the fix, then
  marks the entry resolved. WorkshopPilot.ai-only project skill.
---

# Dialogue Feedback backlog

While testing a workshop, the admin logs critiques about specific AI dialogue
moments via the in-app feedback dialog (visible only when the admin guide-edit
toggle is on). Each critique is stored in the `dialogue_feedback` table with a
**technical marker** (the exact `filePath` + `componentName` it refers to) and a
**context snapshot** (step, arc phase, captured system prompt, app state). This
skill turns that backlog into code changes.

The whole loop runs through two existing npm scripts — do **not** hand-write DB
queries or hit the admin API.

## Workflow

### 1. Fetch the backlog (read-only, safe)

```bash
npm run get-feedback                # pending only (default)
npm run get-feedback -- --all       # everything, including resolved
npm run get-feedback -- --resolved  # resolved only
```

Output is structured JSON: `entries[]`, each with `id`, `feedbackText` (the
critique), `dialogueStepId`, `arcPhase`, `technicalMarker.{filePath,
componentName}`, `contextSnapshot`, and `createdAt`. If it prints
"No pending feedback entries found", there's nothing to do — tell the user.

### 2. Summarize, then triage

Give the user a short list: how many entries, which steps they touch, and a
one-line gist of each `feedbackText`. If there are several, ask whether to work
through all of them or pick specific ones — don't silently batch through a long
backlog.

### 3. Address each entry

For each one you're working:

- Open `technicalMarker.filePath` and locate `componentName`. Prompt/dialogue
  copy usually lives in `src/lib/ai/prompts/` (the AI voice is `soul.md` — keep
  the tone; see CLAUDE.md). The marker may point at a renderer or a prompt def.
- Treat `feedbackText` as the spec for the fix.
- Use `contextSnapshot` for grounding — it often holds the captured system
  prompt / step state from the moment the critique was logged, which tells you
  *why* the dialogue behaved that way.
- Make the edit. Show the user the diff and let them confirm before resolving.

### 4. Mark resolved (⚠️ writes to production — see caveat)

Only after the fix is done **and committed** (so the auto-prepended SHA is
meaningful), and the user has confirmed:

```bash
npm run resolve-feedback -- <feedback-id> "<short summary of the fix>"
```

The script prepends the current short git SHA, storing the note as
`<sha>: <summary>`. Resolve one entry per fix; don't bulk-resolve.

## Caveats — read before resolving

- **This DB is shared dev/prod — `.env.local` IS production.** `get-feedback`
  is read-only and safe. `resolve-feedback` is a **live production write**. Never
  resolve an entry whose fix isn't actually shipped, and confirm with the user
  before each resolve. Don't loop-resolve the whole backlog unattended.
- **Resolve after committing, not before.** The resolution note captures the
  git SHA at run time; resolving against uncommitted work records a stale SHA.
- If a critique is vague or you can't map it to a confident change, surface it
  to the user rather than guessing at the dialogue — wrong prompt edits ship to
  every workshop.

## Where this lives

- Backlog scripts: `scripts/get-feedback.ts`, `scripts/resolve-feedback.ts`
- Table schema: `src/db/schema/dialogue-feedback.ts`
- Admin review UI: `/admin/dialogue` (`src/app/admin/dialogue/`)
- In-app capture: `src/components/workshop/dialogue-feedback-dialog.tsx`,
  `src/hooks/use-dialogue-feedback.ts`

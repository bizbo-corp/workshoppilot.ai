# Phase 35: E2E Testing - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete end-to-end testing pass that validates all 10 workshop steps work correctly with proper context flow, state persistence, AI facilitation, and canvas integrity. Includes both manual walkthrough and automated Playwright tests. Bugs found during testing are fixed inline (small fixes) or deferred (large rewrites). This phase produces a test suite and a test report.

</domain>

<decisions>
## Implementation Decisions

### Testing approach
- Manual walkthrough first to find issues, then automated Playwright tests to lock in behavior
- User does manual testing: seed data populates initial steps, then manually walks through remaining steps
- Playwright for automated E2E tests — full flow tests covering complete workshop walkthrough
- CI integration deferred to a future phase — tests run locally for now

### Issue handling
- Fix bugs inline as they're found during testing
- Large fixes (e.g., context compression rewrite) deferred to next milestone — v1.4 ships with workaround
- Quality bar: demo-ready — good enough to show someone, polish issues OK, nothing embarrassing
- Bug fixes committed batched by step (all fixes for a given step in one commit)
- Final test report artifact summarizing: what was tested, what passed, what was fixed, what's deferred

### Test scenarios
- Fresh workshop from scratch (not seed data) — tests the full creation-to-completion flow
- Real Gemini API — no mocked responses, tests actual AI behavior
- Auth bypassed in test environment — disable Clerk middleware for E2E tests
- Happy path only — forward progression through all 10 steps, no back-revise scenarios

### Coverage priorities
- All aspects equally weighted: step transitions, AI quality, canvas integrity
- No suspected fragile areas — test everything with equal scrutiny, let tests reveal issues
- Desktop viewport only — mobile testing deferred
- Structured output validation depth at Claude's discretion per step

### Claude's Discretion
- Issue tracking method (inline test report vs GitHub issues)
- Structured output validation depth per step (schema validation vs non-empty check)
- Test file organization and naming conventions
- Order of steps to test (sequential vs parallel where possible)

</decisions>

<specifics>
## Specific Ideas

- User has rough edges they're aware of but can't enumerate right now — testing will surface them
- Seed data covers some steps; manual testing picks up from there for the remaining steps

</specifics>

<deferred>
## Deferred Ideas

- CI gate integration (E2E tests blocking deploys) — future phase
- Mobile/responsive E2E testing — future phase
- Back-revise navigation testing — future phase
- Mocked AI responses for faster/cheaper test runs — future phase

</deferred>

---

*Phase: 35-e2e-testing*
*Context gathered: 2026-02-13*

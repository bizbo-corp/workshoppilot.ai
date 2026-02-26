# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.8 — Onboarding + Payments

**Shipped:** 2026-02-26
**Phases:** 7 | **Plans:** 11

### What Was Built
- Credit-based payment system with Stripe Checkout (redirect mode, zero PCI surface)
- Server-side paywall at Step 7 with atomic credit consumption and grandfathering
- Inline UpgradeDialog with outcome-framed copy at the Step 6 gate
- Return-to-workshop flow (purchase → auto-resume at Step 7)
- First-run welcome modal with DB-backed cross-device dismissal
- Dashboard credit badge showing remaining balance
- Pricing page with credit-based tiers wired to Stripe Checkout

### What Worked
- Dual-trigger fulfillment pattern (success page + webhook) eliminated the stale-credit UX problem
- Server-side paywall enforcement proved robust — middleware-only would have been vulnerable to CVE-2025-29927
- Conditional-UPDATE for atomic credit deduction worked cleanly with neon-http (no need for interactive transactions)
- Phase dependency chain (47→48→49→50→51→52) was well-structured — each phase built on the previous cleanly
- Open redirect validation at 3 points (defense in depth) was straightforward to implement

### What Was Inefficient
- Phase 53 (pricing page) was planned but ultimately completed outside GSD tracking, creating audit gaps
- The audit found PRIC-01/02/03 gaps that could have been caught earlier with a pricing page review
- SUMMARY.md one_liner fields were empty across all v1.8 phases — summary-extract yielded no quick context

### Patterns Established
- `'server-only'` import + module-load fail-fast assertion for server singletons (stripe.ts matches db/client.ts)
- Pinned Stripe apiVersion to prevent silent API contract changes
- Conditional-UPDATE (WHERE col > 0 RETURNING) as the pattern for atomic operations on neon-http
- paywall-config.ts for constants that can't live in `'use server'` files (Next.js limitation)

### Key Lessons
1. Stripe Checkout redirect mode is the right default for simple purchase flows — zero client-side Stripe code needed
2. Credit-based billing is simpler than subscriptions when usage is infrequent (1-3 workshops/year)
3. Always validate return URLs at every point in the redirect chain, not just at the entry
4. When neon-http doesn't support SELECT FOR UPDATE, conditional-UPDATE with RETURNING is provably atomic at the PG row level

### Cost Observations
- Model mix: ~70% sonnet (execution), ~30% opus (planning/orchestration)
- Milestone completed in 2 days across multiple sessions
- Notable: Phases 47-49 (database + Stripe + API) completed in a single day

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v0.5 | 6 | 19 | Initial scaffold — established GSD workflow |
| v1.0 | 8 | 25 | AI facilitation engine — heaviest planning phase |
| v1.1 | 6 | 15 | Canvas foundation — ReactFlow integration |
| v1.2 | 4 | 9 | Grid/whiteboard — coordinate system patterns |
| v1.3 | 5 | 23 | EzyDraw — most plans per phase (avg 4.6) |
| v1.4 | 6 | 13 | Polish — testing and personality |
| v1.5 | 4 | 9 | Launch ready — public-facing surfaces |
| v1.6 | 2 | 5 | Production auth — minimal scope |
| v1.7 | 4 | 7 | Build Pack — AI generation pipeline |
| v1.8 | 7 | 11 | Payments — Stripe integration, server-side enforcement |

### Top Lessons (Verified Across Milestones)

1. Phase dependency chains that build incrementally (schema → infra → API → enforcement → UI) produce clean, testable work
2. Server-side enforcement is always worth the extra effort over client-only checks
3. Keeping summary/one-liner fields populated in SUMMARY.md pays dividends for progress tracking and retrospectives
4. Completing work outside GSD tracking creates audit gaps — better to run quick plans through the system

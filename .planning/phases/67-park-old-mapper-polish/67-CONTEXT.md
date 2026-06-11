# Phase 67: Park Old Mapper + Polish - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The old UX Journey Mapper remains accessible and functional at `/workshop/[sessionId]/outputs/journey-map/` but is clearly marked as replaced: a banner points to Journey Flow, primary navigation and validation guidance no longer link to the old mapper, and the full digital-output pipeline (validate guidance card → Journey Flow → prototype prompt → copy) is verified end-to-end. No new capabilities; no removal of the old mapper.

</domain>

<decisions>
## Implementation Decisions

### Replacement banner
- Full-width strip at the top of the old journey-map page, above the canvas — doesn't block canvas content
- Dismissible per session: X to close, reappears on next visit (no persisted dismissal state)
- Plain + helpful tone: communicates "The UX Journey Mapper has been replaced by Journey Flow. Your work here is preserved." (exact copy in app voice — soul.md tone)
- Banner button opens the Journey Flow editor for this workshop directly (one click to the replacement)

### Polish scope
- E2E path fixes only: walk the full pipeline (validate card → Journey Flow AI baseline → user edits → mark complete → prototype prompt → copy) and fix only what blocks or jars in that path
- Verification via manual walkthrough human checkpoint — same pattern as Phases 65/66; no new Playwright infra for this phase
- Triage during walkthrough: small fixes (copy, spacing, broken links) land inline in this phase; anything structural is deferred to the backlog
- Old mapper is frozen: banner + de-linking are the ONLY changes to old mapper code — zero functional/behavioral changes

### Claude's Discretion
- De-linking specifics (user chose not to discuss): which entry points to update and how, within PARK-01 — primary navigation and validation guidance must stop linking to the old mapper, all guidance entry points direct to Journey Flow; the old route itself stays reachable (e.g., direct URL, build pack listings as appropriate)
- Banner component styling details (olive token system, light + dark)
- Session-dismissal mechanism (e.g., sessionStorage)

</decisions>

<specifics>
## Specific Ideas

- Verification approach should mirror the Phase 65/66 pattern: automated gates (tsc/lint/build/greps) + a blocking human-verify checkpoint walking the pipeline
- Phase 66 shipped the prototype-prompt page with `?from=validate` back-link wiring — the E2E walkthrough should confirm that full path including the guidance-card entry

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 67-park-old-mapper-polish*
*Context gathered: 2026-06-11*

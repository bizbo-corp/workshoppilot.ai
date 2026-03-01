# Phase 62: Mobile Gate - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phone and small tablet users visiting any workshop step page see a full-screen overlay recommending desktop use. The overlay is dismissible (session-scoped) and includes an email-to-self link. Landing page, dashboard, and pricing pages are unaffected. No mobile-specific layout work — this is a gate, not a responsive redesign.

</domain>

<decisions>
## Implementation Decisions

### Overlay visual design
- Full-screen edge-to-edge overlay (not a centered card/modal)
- Solid background using brand color palette — feels intentional, not like an error
- Desktop/laptop illustration to visually communicate "use a bigger screen"
- Friendly nudge tone — warm, approachable, not apologetic or blocking

### Gate messaging & tone
- Headline: direct recommendation style — "WorkshopPilot works best on desktop"
- Body: one brief sentence explaining WHY (canvas and AI tools need a larger screen)
- CTA hierarchy: "Email this link to myself" as primary button, "Continue anyway" as secondary text link below
- No apology framing — confident and helpful

### Email-to-self experience
- Primary action: "Email this link to myself" button (mailto link)
- Subject line includes workshop name + "continue on desktop" (e.g. "Continue your workshop on desktop — WorkshopPilot")
- Body includes URL + brief context ("Open this link on your desktop to continue your workshop")
- Secondary action: "Copy link" small text/icon option for users who prefer Slack, notes, etc.

### Post-dismissal behavior
- Gate fully disappears after "Continue anyway" — no persistent banner or reminder
- Dismissal stored in sessionStorage — once per browser session, covers all workshop steps
- New tab or new browser session shows the gate again
- No special mobile layout after dismissal — workshop renders as-is (best-effort)

### Detection criteria
- Trigger on coarse pointer + viewport < 1024px (includes small tablets in portrait mode)
- This expands beyond the original <768px to catch portrait-mode iPads and similar small tablets
- Only on workshop step pages — not landing, dashboard, or pricing

### Claude's Discretion
- Exact illustration style/asset for the desktop visual
- Specific brand colors and typography for the overlay
- Animation/transition when overlay appears and dismisses
- Exact copy wording (following the decided tone and style)
- How to handle edge cases like landscape phones or browser resize

</decisions>

<specifics>
## Specific Ideas

No specific external references — decisions were clear and consistent across all areas. The overlay should feel like an intentional product decision, not a bug or limitation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 62-mobile-gate*
*Context gathered: 2026-03-01*

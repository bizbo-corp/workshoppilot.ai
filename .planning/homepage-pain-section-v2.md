# Homepage Pain Section — v2 (validation-fire rewrite)

**Owner worktree:** wt2
**Target file:** `src/app/landing-v4/page.tsx` — the "Pain Points: Why Now" section (immediately below the hero, above `<ProcessScrollytelling />`).
**Status:** spec ready for implementation.

---

## Why we're doing this

The wt1 version reworked this section into a **cost breakdown + a WorkshopPilot
pricing contrast card** (timeline → itemized $ factors → "$99–$299 vs $20,000+").
It drifted too far: it foregrounds WorkshopPilot's *price* and a custom layout.

**This v2 goes back to the ORIGINAL layout** (sticky headline left + three
stat-style points right) but with much stronger, fear-driven copy.

### Goals
1. **Closer to the original layout** — two-column: sticky headline + intro on the
   left, three stacked "big number + line" pain points on the right.
2. **Three pain points, each a distinct angle:**
   - **Cost** — traditional planning/validation burns real money up front.
   - **Time** — weeks/months gone before you learn anything.
   - **Validation** — pursuing an *unvalidated* idea; tie the risk back to money
     (you don't just lose the build, you lose the runway).
3. **Build a fire.** Copy should make the reader *feel* the burn of wasted money,
   wasted time, and shipping something nobody asked for — so WorkshopPilot reads
   as the obvious escape.
4. **Dial WorkshopPilot's COST out of this section.** No `$99 / $299` here, no
   pricing-contrast card. WorkshopPilot may appear only as a soft one-line
   resolution in the intro ("...get to a validated, build-ready plan in one
   session"). This section's job is the *problem*, not the price.

### Non-goals
- No timeline / cost-spike chart (that format was rejected).
- No WorkshopPilot price numbers, no "vs $20,000+" struck-through contrast.
- Don't touch the hero, the demo cards, or any other section.

---

## Reference: the ORIGINAL layout to restore

Retrievable at `git show f2b6742:src/app/landing-v4/page.tsx` (the pain section
before the rework). Shape:

```
<section className="py-24 sm:py-32 bg-background border-t border-border" ...>
  <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

      {/* Left — sticky headline + intro */}
      <div className="lg:sticky lg:top-32 lg:self-start">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-serif leading-[1.1] tracking-tight text-foreground mb-6">…</h2>
        <p className="text-muted-foreground text-lg max-w-md leading-relaxed">…</p>
      </div>

      {/* Right — three stat points */}
      <div className="space-y-10">
        <div className="border-l-2 border-olive-300 dark:border-olive-600 pl-6">
          <p className="text-4xl sm:text-5xl font-bold text-foreground mb-2 tracking-tight">{BIG}</p>
          <p className="text-muted-foreground leading-relaxed">{BODY}</p>
        </div>
        …×3
      </div>
    </div>
  </div>
</section>
```

Keep this structure. Only the copy changes.

---

## Copy to implement (drafted — refine if you can sharpen the fire)

### Headline (left) — keep the original
> Most projects fail
> before the first
> line of code

### Intro (left) — agitate, then a soft (price-free) WorkshopPilot bridge
> Not from bad engineers — from building the wrong thing. Most teams pour weeks
> and tens of thousands of dollars into planning, specs and prototypes before
> they ever test whether the idea holds up. WorkshopPilot gets you to a
> validated, build-ready plan in a single session — so the money goes to the
> right thing.

### Point 1 — COST
> **$20,000+**
> is what "doing discovery properly" runs the old way — facilitated workshops,
> a PRD, a throwaway prototype, a stakeholder deck. You pay it all up front,
> before a single assumption is tested.

### Point 2 — TIME
> **6+ weeks**
> disappear into planning docs, meetings and revision rounds — and at the end
> you still only have an educated guess about what's worth building.

### Point 3 — VALIDATION (tie to money)
> **42%**
> of startups fail for one reason: they built something nobody needed. *(CB
> Insights)* Skip validation and you're not just risking the build — you're
> betting the runway.

---

## Design / token rules
- Olive design tokens only (`olive-*`, `neutral-olive-*`, `text-muted-foreground`,
  `border-border`). No hardcoded gray/blue/white. Light + dark must both look right.
- Match the original type scale exactly (serif `h2`, `text-4xl sm:text-5xl`
  numbers, `border-l-2 border-olive-300 dark:border-olive-600 pl-6`).
- `font-serif` on the headline, as the original.

## Things to verify before relying on it
- **The 42% / "no market need" stat is real (CB Insights)** but confirm the exact
  figure + attribution before shipping. If you'd rather not cite a third party,
  swap to a non-numeric punch (e.g. **"The wrong idea"** as the big line).
- The **$20,000+** and **6+ weeks** figures are illustrative — they mirror the
  factors already shown elsewhere on the page (workshop $5–9k, prototype $10k,
  deck $3k). Keep them consistent with the pricing/compare section lower down.

## Acceptance criteria
- [ ] Layout matches the original two-column (sticky headline + 3 stat points).
- [ ] Exactly three points: cost, time, validation — in that order.
- [ ] No WorkshopPilot price anywhere in this section; no contrast/struck card.
- [ ] Copy is sharp and fear-driven; flows into "Three steps. One session." below.
- [ ] `npx tsc --noEmit` clean; olive tokens; light + dark verified.
- [ ] Committed on the `wt2` branch.

## Context pointers
- wt1 "stashed" version (cost breakdown + 3-point pricing card): tag
  `pain-v1-cost-breakdown` / commit `25998e1`.
- Original pre-rework layout: commit `f2b6742` (and earlier).
- The AI voice / tone guide: `src/lib/ai/soul.md`. Marketing copy skill lives at
  `.claude/skills/copywriting` — clarity > cleverness, specific > vague, honest >
  sensational (don't fabricate stats).

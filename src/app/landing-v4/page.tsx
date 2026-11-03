export const dynamic = "force-dynamic";

import { Icon } from "@/components/ui/icon";
import { LandingHeader } from "@/components/layout/landing-header";
import { NewWorkshopButton } from "@/components/dialogs/new-workshop-dialog";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/landing/footer";
import {
  LazyGlobe,
  LazyHeroVisual,
} from "@/components/landing-v3/lazy-hero-visuals";
import { VideoPlayButton } from "@/components/landing-v3/video-dialog";
import { ProcessScrollytelling } from "@/components/landing-v3/process-scrollytelling";
import { PainCostCurve, PainCostBarsMobile } from "@/components/landing-v4/pain-cost-curve";

/**
 * Landing Page V4
 *
 * Changes from root: the "How It Works / Process" section is now a GSAP
 * ScrollTrigger pinned scrollytelling experience (`ProcessScrollytelling`).
 *
 * Route: /landing-v4 — also re-exported by the root `/` route.
 */
export default function LandingV4() {
  return (
    <div className="flex min-h-screen flex-col bg-background scroll-smooth">
      <LandingHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative lg:min-h-[calc(100vh-64px)] flex flex-col items-center justify-start pt-12 pb-16 sm:pt-16 sm:pb-20 md:pt-20 lg:pt-24 lg:pb-0 overflow-hidden px-4">
        {/* Decorative background */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-olive-400/20 blur-3xl dark:bg-olive-600/10" />
          <div className="absolute -bottom-32 left-1/4 h-180 w-180 rounded-full bg-olive-300/15 blur-3xl dark:bg-olive-50/10" />
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Globe — bottom, matching root page.tsx */}
        <div className="absolute inset-x-0 bottom-[-500px] md:bottom-[-700px] xl:bottom-[-900px] mx-auto h-[800px] md:h-[1200px] xl:h-[1600px] w-full max-w-none opacity-60 dark:opacity-80 pointer-events-none select-none z-0">
          <LazyGlobe className="h-full w-full" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center z-10">
          {/* Headline */}
          <h1 className="text-3xl font-serif leading-[1.08] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            From{" "}
            <span className="relative">
              <span className="text-olive-600 dark:text-olive-400">
                Vague Idea
              </span>
            </span>{" "}
            to a
            <br className="hidden sm:block" />{" "}
            <span className="text-olive-600 dark:text-olive-400">
              Ready-to-Run Validation Plan
            </span>{" "}
            <span className="relative inline-block">
              in 2 hours.
              <svg
                className="absolute -bottom-2 left-0 w-full text-olive-500/40 dark:text-olive-400/30"
                viewBox="0 0 200 8"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M1 5.5C32 2.5 62 1.5 100 3.5C138 5.5 168 4.5 199 2"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-8 max-w-6xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            ...and the honest truth about whether it&apos;s worth building.
            WorkshopPilot facilitates a real design-thinking workshop: it finds
            your{" "}
            <strong className="text-foreground/80 dark:text-foreground/80">
              riskiest assumption
            </strong>
            , designs the cheapest test that proves or kills it, and tells you
            straight whether the idea is ready. Digital ideas also get a Build
            Pack, ready to hand to an AI coding agent.
          </p>

          {/* Reassurance — speed + zero barrier to entry */}
          <div className="mx-auto mt-6 flex max-w-3xl flex-col items-start gap-x-6 gap-y-2 text-sm font-normal text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Icon name="timer" className="h-4 w-4 text-olive-600 dark:text-olive-400" />
              Know before you spend months building
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Icon name="briefcase" className="h-4 w-4 text-olive-600 dark:text-olive-400" />
              No experience required
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Icon name="lightbulb" className="h-4 w-4 text-olive-600 dark:text-olive-400" />
              Any idea — not just apps
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-row flex-wrap items-center justify-center gap-2 sm:gap-3">
            <NewWorkshopButton
              size="lg"
              className="px-4 text-base shadow-lg shadow-olive-600/20"
            >
              Start Workshop
              <Icon name="arrow-right" className="ml-2 h-4 w-4" />
            </NewWorkshopButton>

            <VideoPlayButton />
          </div>
        </div>

        {/* Visual area — flows below CTA buttons */}
        <div className="relative w-full flex-1 mt-10 min-h-[280px] sm:min-h-[360px] lg:mt-0 lg:min-h-0">
          {/* Social proof — glassmorphic pill, top-center of visual area */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex w-full max-w-xs sm:max-w-none flex-col items-center gap-2 px-6 py-2.5">
            <p className="text-sm text-foreground text-center">
              Built by a facilitator who has run these workshops for years.
            </p>
          </div>

          {/* Floating stickies + deliverables */}
          <LazyHeroVisual />
        </div>

        {/* Bottom-center "See what you get" — glassmorphic pill */}
        <a
          href="#deliverables"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full bg-card/90 border border-foreground/[0.08] px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.12)",
          }}
        >
          See what you get
          <Icon name="chevron-down" className="h-4 w-4 animate-bounce" />
        </a>
      </section>

      {/* ── Pain Points: "Why Now" ───────────────────────────── */}
      <section className="relative flex min-h-screen items-start overflow-hidden border-t border-border bg-background py-24 sm:py-32 xl:items-center">
        {/* Cost-vs-time chart (eye candy, behind the copy, hoverable).
            Large screens only — on phones/tablets it would collide with the
            stacked copy, so below xl we render PainCostBarsMobile in flow. */}
        <div className="hidden xl:block" aria-hidden="true">
          <PainCostCurve />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-16">
            {/* Left column — sticky headline + intro */}
            <div className="xl:sticky xl:top-32 xl:self-start">
              <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-[3.5rem] font-serif leading-[1.1] tracking-tight text-foreground mb-6">
                Most projects fail
                <br /> before the first
                <br /> line of code
              </h2>
              <p className="text-foreground text-lg max-w-md leading-relaxed">
                Not from bad engineers, but from building the wrong thing. Most
                teams pour weeks and tens of thousands of dollars into planning,
                specs and prototypes before they ever test whether the idea
                holds up. WorkshopPilot gets you to a validated, build-ready
                plan in a single session, so the money goes to the right thing.
              </p>

              {/* Ties the copy to the olive bar at Week 0 on the chart below —
                  same olive accent + mini-bar glyph make the link read visually. */}
              <div className="mt-7 flex items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className="h-9 w-[3px] shrink-0 rounded-full bg-olive-500 shadow-[0_0_10px_2px_var(--neutral-olive-50),0_0_4px_1px_var(--neutral-olive-50)] dark:shadow-[0_0_14px_3px_var(--olive-500),0_0_5px_1px_var(--olive-400)]"
                />
                <p className="max-w-xs text-sm leading-snug">
                  <span className="font-semibold text-olive-700 dark:text-olive-400">
                    WorkshopPilot
                  </span>
                  <span className="text-muted-foreground">
                    : a free workshop, and a validated plan for{" "}
                    <span className="font-medium text-foreground">$20</span> of
                    credits.
                  </span>
                </p>
              </div>
            </div>

            {/* Right column — three fear-driven pain points, labelled by
                angle (cost · time · validation) instead of fabricated figures.
                No WorkshopPilot pricing here — this section is the problem,
                not the price. */}
            <div className="space-y-10">
              {/* Cost */}
              <div className="border-l border-neutral-olive-400/80 pl-6 dark:border-neutral-olive-500/70">
                <p className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Expensive
                </p>
                <p className="leading-relaxed text-muted-foreground">
                  &ldquo;Doing discovery properly&rdquo; the old way means
                  facilitated workshops, a PRD, a throwaway prototype, a
                  stakeholder deck. It burns real money up front, before a single
                  assumption is tested.
                </p>
              </div>

              {/* Time */}
              <div className="border-l border-neutral-olive-400/80 pl-6 dark:border-neutral-olive-500/70">
                <p className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Time-consuming
                </p>
                <p className="leading-relaxed text-muted-foreground">
                  Weeks disappear into planning docs, meetings and revision
                  rounds, and at the end you still only have an educated guess
                  about what&apos;s worth building.
                </p>
              </div>

              {/* Unvalidated */}
              <div className="border-l border-neutral-olive-400/80 pl-6 dark:border-neutral-olive-500/70">
                <p className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Unvalidated
                </p>
                <p className="leading-relaxed text-muted-foreground">
                  Most projects that fail built something nobody needed. Skip
                  validation and you&apos;re not just risking the build.
                  You&apos;re betting the runway.
                </p>
              </div>
            </div>

            {/* Mobile/tablet only — the cost-vs-time chart as in-flow
                horizontal bars so it never overlaps the copy above. */}
            <PainCostBarsMobile />
          </div>
        </div>
      </section>

      {/* ── How It Works (GSAP pinned scrollytelling) ────────── */}
      <ProcessScrollytelling />

      {/* ── Build Pack Deliverables ──────────────────────────── */}
      <section
        id="deliverables"
        className="relative py-24 sm:py-32 border-t border-border scroll-mt-20 overflow-hidden"
      >
        {/* Decorative blurs for glassmorphic effect */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute top-1/4 -left-32 h-80 w-80 rounded-full bg-olive-400/20 blur-3xl dark:bg-olive-600/15" />
          <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-olive-300/15 blur-3xl dark:bg-olive-500/10" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header — left-aligned, consistent with other sections */}
          <div className="max-w-2xl mb-16 sm:mb-20">
            <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-4">
              What you walk out with
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-[1.1] tracking-tight text-foreground mb-4">
              Walk away knowing
              <br className="hidden sm:block" /> if it&apos;s worth building
            </h2>
            <p className="text-muted-foreground text-lg">
              Not a PDF of your chat. A validation plan ready to run for any
              kind of idea — plus structured, developer-ready artifacts when
              your idea is digital.
            </p>
          </div>

          {/* Deliverables — ruled rows */}
          <div
            className="divide-y divide-foreground/[0.06] rounded-2xl border border-foreground/[0.08] bg-card/90 p-6 sm:p-8 shadow-sm"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.06), 0 4px 24px -4px rgba(0,0,0,0.08)",
            }}
          >
            {[
              {
                icon: "clipboard-check" as const,
                title: "Validation Plan",
                format: ".md",
                audience: "Every idea — apps, services, campaigns",
                description:
                  "Your riskiest assumption, the cheapest test that proves or kills it, and a pre-committed success signal — with a Validation Score once you record results.",
              },
              {
                icon: "file-text" as const,
                title: "Product Requirements Document",
                format: ".md",
                audience: "Digital ideas — Developers & Product Managers",
                description:
                  "Scope, features and acceptance criteria in one structured document — ready to hand a developer or drop straight into an AI coding agent like Cursor or Claude Code.",
              },
              {
                icon: "code" as const,
                title: "Technical Specifications",
                format: ".md",
                audience: "Digital ideas — Engineers & Architects",
                description:
                  "Architecture recommendations, data models and API contracts. Enough detail for your dev team or AI coder to start shipping on day one.",
              },
              {
                icon: "route" as const,
                title: "Journey Map",
                format: ".md",
                audience: "Designers & UX Teams",
                description:
                  "A step-by-step map of how users move through your product. Identifies pain points, drop-off risks and moments that matter before a single screen is designed.",
              },
              {
                icon: "mouse-pointer-click" as const,
                title: "Prototype",
                format: "Interactive",
                audience: "Everyone",
                description:
                  "A clickable prototype that brings your idea to life. Test assumptions with real users, align your team visually and validate before you invest in code.",
              },
            ].map((item) => {
              return (
                <div
                  key={item.title}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 py-8 first:pt-0"
                >
                  <div className="md:col-span-5">
                    <div className="flex items-center gap-3">
                      <Icon name={item.icon} className="h-6 w-6 text-olive-600 dark:text-olive-400 shrink-0" />
                      <h3 className="text-lg font-semibold text-foreground tracking-tight">
                        {item.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-8">
                      <span className="text-xs font-mono text-olive-600 dark:text-olive-400">
                        {item.format}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.audience}
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-7">
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Value Comparison ──────────────────────────────────── */}
      <section
        className="py-24 sm:py-32 bg-background border-t border-border"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left — headline + WorkshopPilot highlight */}
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-4">
                Compare
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-[1.1] tracking-tight text-foreground mb-6">
                The same answer.
                <br /> A fraction of the cost.
              </h2>

              {/* WorkshopPilot callout */}
              <div className="border-l-2 border-olive-500 dark:border-olive-400 pl-6 mt-10">
                <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-2">
                  WorkshopPilot
                </p>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
                    $0
                  </span>
                  <span className="text-lg text-muted-foreground">
                    for the workshop, about $20 for the Verdict
                  </span>
                </div>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  A fraction of a consultant&apos;s fee, and you keep the output
                  forever.
                </p>
              </div>
            </div>

            {/* Right — alternatives */}
            <div className="divide-y divide-border">
              {[
                {
                  label: "Hire a Product Manager",
                  price: "$3,000+",
                  time: "2–4 weeks",
                  detail:
                    "Scoping, stakeholder interviews, documentation. Assumes they already understand your domain.",
                },
                {
                  label: "Design Thinking Workshop",
                  price: "$5,000+",
                  time: "3–5 days",
                  detail:
                    "Facilitator fees, venue rental, participant time. Then someone still has to write up the outputs.",
                },
                {
                  label: "Freelance Consultant",
                  price: "$2,000+",
                  time: "1–2 weeks",
                  detail:
                    "Back-and-forth over email, multiple revision rounds and a deliverable format that may not fit your workflow.",
                },
              ].map((row) => (
                <div key={row.label} className="py-8 first:pt-0">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-lg font-semibold text-foreground/50 line-through decoration-foreground/20">
                      {row.label}
                    </h3>
                    <div className="flex items-baseline gap-4">
                      <span className="text-sm text-muted-foreground/60 line-through decoration-muted-foreground/30">
                        {row.time}
                      </span>
                      <span className="text-xl font-bold text-foreground/40 line-through decoration-foreground/20">
                        {row.price}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground/60">
                    {row.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section
        id="pricing"
        className="py-24 sm:py-32 bg-background border-t border-border scroll-mt-20"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 900px" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-4">
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-[1.1] tracking-tight text-foreground mb-4">
              The workshop is free.
              <br className="hidden sm:block" /> Pay for the verdict.
            </h2>
            <p className="text-muted-foreground text-lg">
              Run the whole workshop, every stage and every board, for nothing.
              Credits pay for the heavy lifting: the honest Verdict, the Build
              Pack and sketch clean-ups. They never expire.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
            {/* Free */}
            <div className="rounded-2xl border border-border p-8 flex flex-col">
              <h3 className="text-lg font-semibold text-foreground mb-1">Free workshop</h3>
              <p className="text-sm text-muted-foreground mb-6">
                The full facilitated workshop for any kind of idea: digital,
                service, process or physical.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-serif text-foreground">$0</span>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground mb-8 flex-1">
                {[
                  "Setup plus Discover, Define, Develop, Deliver",
                  "The AI facilitator in chat and on the boards",
                  "Stakeholder rings, empathy map, journey strip, idea board",
                  "Upload your own sketches",
                  "A one-page summary and your armed Validation Score",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-olive-600 dark:text-olive-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <NewWorkshopButton variant="secondary" size="lg" className="w-full text-base">
                Start a free workshop
              </NewWorkshopButton>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Sign in with Google, Apple or email. No card.
              </p>
            </div>

            {/* Credits */}
            <div className="rounded-2xl border-2 border-olive-600 dark:border-olive-500 p-8 flex flex-col relative bg-card">
              <span className="absolute -top-3 left-8 rounded-full bg-olive-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white dark:bg-olive-500">
                Most people
              </span>
              <h3 className="text-lg font-semibold text-foreground mb-1">Credits</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Buy a pack once; spend credits on the jobs that need a stronger
                model.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-serif text-foreground">$25</span>
                <span className="text-muted-foreground"> for 500 credits</span>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground mb-8 flex-1">
                {[
                  "The Verdict: 400 credits. The honest read, your riskiest assumption, the cheapest test with a target and a kill threshold",
                  "The Build Pack, included with the Verdict: PRD and tech specs, service blueprint, process map or product brief, by idea type",
                  "Sketch clean-up: 10 credits an image",
                  "Bigger packs: 1,500 for $60, 5,000 for $150",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-olive-600 dark:text-olive-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <NewWorkshopButton size="lg" className="w-full text-base shadow-lg shadow-olive-600/20">
                Start, then decide
              </NewWorkshopButton>
              <p className="text-center text-xs text-muted-foreground mt-4">
                New accounts get 50 credits to try a clean-up.
              </p>
            </div>

            {/* Guided */}
            <div
              id="guided-pilot"
              className="rounded-2xl border border-premium-border ring-1 ring-amber-500/20 dark:ring-amber-400/15 p-8 flex flex-col scroll-mt-28 bg-gradient-to-b from-amber-50/50 via-card to-card dark:from-amber-950/30 dark:via-card dark:to-card"
            >
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 rounded-full px-3 py-1">
                  <Icon name="sparkles" className="h-3 w-3" />
                  With a human
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Coach and Guided Pilot</h3>
              <p className="text-sm text-muted-foreground mb-6">
                An experienced facilitator reviews your Verdict and keeps you
                honest until the test is done, or runs the workshop live with
                your team.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-serif text-foreground">$299</span>
                <span className="text-muted-foreground"> a month, or $1,499 per pilot</span>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground mb-8 flex-1">
                {[
                  "Weekly 30 minute check-in until your test has run",
                  "A second pair of eyes on the Verdict and the Build Pack",
                  "Guided Pilot: a live facilitated workshop with your team",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="lg" className="w-full text-base">
                <a href="mailto:michael@bizbo.co.nz?subject=WorkshopPilot%20Coach%20or%20Guided%20Pilot">Talk to Michael</a>
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Best for teams and funded founders.
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-start gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Icon name="shield" className="h-4 w-4" />
              Secure payment via Stripe
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section
        className="py-24 sm:py-32 bg-background border-t border-border"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — headline */}
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-serif leading-[1.1] tracking-tight text-foreground">
                Stop guessing.
                <br /> Find out.
              </h2>
            </div>

            {/* Right — copy + actions */}
            <div>
              <p className="text-muted-foreground text-lg leading-relaxed mb-3">
                Start a free workshop and walk away with a plan you can test
                next week: your riskiest assumption, the cheapest test that
                proves or kills it, and an honest read on whether the idea holds
                up. Digital ideas also get a Build Pack: PRD and tech specs.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                The whole workshop is free. No card to start.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <NewWorkshopButton
                  size="lg"
                  className="min-w-[200px] text-base shadow-lg shadow-olive-600/20"
                >
                  Start Free Workshop
                  <Icon name="arrow-right" className="ml-2 h-4 w-4" />
                </NewWorkshopButton>
                <a href="#pricing">
                  <Button variant="outline" size="lg" className="text-base">
                    View Pricing
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

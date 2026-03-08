export const dynamic = "force-dynamic";

import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Code2,
  FileText,
  FlagTriangleRight,
  MousePointerClick,
  Package,
  Route,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { LandingHeader } from "@/components/layout/landing-header";
import { NewWorkshopButton } from "@/components/dialogs/new-workshop-dialog";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/landing/footer";
import { Globe } from "@/components/ui/globe";
import { HeroVisual } from "@/components/landing-v3/hero-visual";
import { VideoPlayButton } from "@/components/landing-v3/video-dialog";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background scroll-smooth">
      <LandingHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-start pt-16 md:pt-24 overflow-hidden px-4">
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
          <Globe className="h-full w-full" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center z-10">
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-olive-300/50 bg-olive-50/80 px-4 py-1.5 text-sm font-medium text-olive-700 dark:border-olive-700/50 dark:bg-olive-950/50 dark:text-olive-300">
            <Clock className="h-4 w-4" />
            Save weeks of planning in one session
          </div>

          {/* Headline */}
          <h1 className="text-3xl font-serif leading-[1.08] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            Go from{" "}
            <span className="relative">
              <span className="text-olive-600 dark:text-olive-400">
                &ldquo;Vague Idea&rdquo;
              </span>
            </span>
            <br className="hidden sm:block" /> to{" "}
            <span className="text-olive-600 dark:text-olive-400">
              &ldquo;Developer-Ready&rdquo;
            </span>
            <br className="hidden xl:block" />{" "}
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
            WorkshopPilot uses Design-Thinking activities to turn your vision
            into a comprehensive{" "}
            <strong className="text-foreground/80 dark:text-foreground/80">
              Build Pack
            </strong>{" "}
            - the ultimate tool to align stakeholders, win over investors and
            hand off directly to an AI coding agent. <br />
            <br />
            <span className="text-foreground font-semibold">
              No experience required. Just bring your ideas and creativity.
            </span>
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <NewWorkshopButton
              size="lg"
              className="min-w-[200px] text-base shadow-lg shadow-olive-600/20"
            >
              Start Free Workshop
              <ArrowRight className="ml-2 h-4 w-4" />
            </NewWorkshopButton>

            <VideoPlayButton />
          </div>
        </div>

        {/* Visual area — flows below CTA buttons */}
        <div className="relative w-full flex-1">
          {/* Social proof — glassmorphic pill, top-center of visual area */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 rounded-full bg-card/10 backdrop-blur-lg  px-6 py-2.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-olive-500 text-olive-500 dark:fill-olive-400 dark:text-olive-400"
                />
              ))}
            </div>
            <p className="text-sm text-foreground whitespace-nowrap">
              Trusted by indie founders, product teams and innovators like you.
            </p>
          </div>

          {/* Floating stickies + deliverables */}
          <HeroVisual />
        </div>

        {/* Bottom-center "See what you get" — glassmorphic pill */}
        <a
          href="#deliverables"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full bg-card/50 backdrop-blur-xl border border-foreground/[0.08] px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.12)",
          }}
        >
          See what you get
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </a>
      </section>

      {/* ── Pain Points: "Why Now" ───────────────────────────── */}
      <section className="py-24 sm:py-32 bg-background border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left column — sticky headline */}
            <div className="lg:sticky lg:top-32 lg:self-start">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-serif leading-[1.1] tracking-tight text-foreground mb-6">
                Most projects fail
                <br /> before the first
                <br /> line of code
              </h2>
              <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
                Not from bad developers. From building the wrong thing.
                WorkshopPilot replaces weeks of scattered planning with a single
                structured session — so you ship with clarity, not guesswork.
              </p>
            </div>

            {/* Right column — stacked pain points */}
            <div className="space-y-10">
              {/* Pain 1 */}
              <div className="border-l-2 border-olive-300 dark:border-olive-600 pl-6">
                <p className="text-4xl sm:text-5xl font-bold text-foreground mb-2 tracking-tight">
                  70%
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  of software waste traces back to bad requirements. It&apos;s a
                  clarity problem, not a coding one.
                </p>
              </div>

              {/* Pain 2 */}
              <div className="border-l-2 border-olive-300 dark:border-olive-600 pl-6">
                <p className="text-4xl sm:text-5xl font-bold text-foreground mb-2 tracking-tight">
                  3 weeks
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  is the average time spent writing PRDs, user stories and specs
                  that still miss the mark.
                </p>
              </div>

              {/* Pain 3 */}
              <div className="border-l-2 border-olive-300 dark:border-olive-600 pl-6">
                <p className="text-4xl sm:text-5xl font-bold text-foreground mb-2 tracking-tight">
                  &ldquo;Just build it&rdquo;
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  is the most expensive advice in tech. Two hours of structure
                  beats six months of guessing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-background border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-2xl mb-16 sm:mb-20">
            <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-4">
              Process
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-[1.1] tracking-tight text-foreground mb-4">
              Three steps. One session.
              <br /> A complete blueprint.
            </h2>
          </div>

          {/* Steps — horizontal ruled layout */}
          <div className="divide-y divide-border">
            {[
              {
                step: "01",
                title: "Describe Your Idea",
                description:
                  'Even if it\'s just a sentence. "I want to build an app that helps dog walkers find clients" is enough to start.',
              },
              {
                step: "02",
                title: "AI Runs the Workshop",
                description:
                  "Our AI facilitator walks you through a structured 10-step Design Thinking process — the same framework used by consultants charging $5,000+.",
              },
              {
                step: "03",
                title: "Walk Away Build-Ready",
                description:
                  "Download your Build Pack: PRD, user stories, technical roadmap and more. Hand it to developers or feed it to AI coding tools.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-10 first:pt-0"
              >
                <div className="md:col-span-1">
                  <span className="text-sm font-mono text-olive-600 dark:text-olive-400">
                    {item.step}
                  </span>
                </div>
                <div className="md:col-span-4">
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                    {item.title}
                  </h3>
                </div>
                <div className="md:col-span-7">
                  <p className="text-muted-foreground leading-relaxed max-w-lg">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Build Pack Deliverables ──────────────────────────── */}
      <section
        id="deliverables"
        className="relative py-24 sm:py-32 border-t border-border scroll-mt-20 overflow-hidden"
      >
        {/* Decorative blurs for glassmorphic effect */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute top-1/4 -left-32 h-80 w-80 rounded-full bg-olive-400/20 blur-3xl dark:bg-olive-600/15" />
          <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-olive-300/15 blur-3xl dark:bg-olive-500/10" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header — left-aligned, consistent with other sections */}
          <div className="max-w-2xl mb-16 sm:mb-20">
            <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-4">
              Your Build Pack
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-[1.1] tracking-tight text-foreground mb-4">
              Walk away with everything
              <br className="hidden sm:block" /> you need to start building
            </h2>
            <p className="text-muted-foreground text-lg">
              Not a PDF of your chat. Structured, professional artifacts you can
              hand straight to developers, stakeholders or AI coding tools.
            </p>
          </div>

          {/* Deliverables — ruled rows */}
          <div
            className="divide-y divide-foreground/[0.06] rounded-2xl border border-foreground/[0.08] bg-card/50 backdrop-blur-xl p-6 sm:p-8 shadow-sm"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.06), 0 4px 24px -4px rgba(0,0,0,0.08)",
            }}
          >
            {[
              {
                icon: FileText,
                title: "Product Requirements Document",
                format: ".md",
                audience: "Developers & Product Managers",
                description:
                  "Scope, features and acceptance criteria in one structured document — ready to hand a developer or drop straight into an AI coding agent like Cursor or Claude Code.",
              },
              {
                icon: Code2,
                title: "Technical Specifications",
                format: ".md",
                audience: "Engineers & Systems Architects",
                description:
                  "Architecture recommendations, data models and API contracts. Enough detail for your dev team or AI coder to start shipping on day one.",
              },
              {
                icon: FlagTriangleRight,
                title: "Prioritized Feature Roadmap",
                format: ".json",
                audience: "Founders & Product Leads",
                description:
                  "Phase 1 vs. Phase 2, decided. Exportable as JSON for direct import into Jira, Linear or your project management tool of choice.",
              },
              {
                icon: Package,
                title: "Workshop Outputs Pack",
                format: ".pptx",
                audience: "Stakeholders & Investors",
                description:
                  "Every workshop artifact in one download — personas, problem statements, Lean Canvas and ideation results. Ready to share with your team or attach to a pitch deck.",
              },
              {
                icon: Route,
                title: "Journey Map",
                format: ".md",
                audience: "Designers & UX Teams",
                description:
                  "A step-by-step map of how users move through your product. Identifies pain points, drop-off risks and moments that matter before a single screen is designed.",
              },
              {
                icon: MousePointerClick,
                title: "Prototype",
                format: "Interactive",
                audience: "Everyone",
                description:
                  "A clickable prototype that brings your idea to life. Test assumptions with real users, align your team visually and validate before you invest in code.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 py-8 first:pt-0"
                >
                  <div className="md:col-span-5">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6 text-olive-600 dark:text-olive-400 shrink-0" />
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
      <section className="py-24 sm:py-32 bg-background border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left — headline + WorkshopPilot highlight */}
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-4">
                Compare
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-[1.1] tracking-tight text-foreground mb-6">
                The same deliverables.
                <br /> A fraction of the cost.
              </h2>

              {/* WorkshopPilot callout */}
              <div className="border-l-2 border-olive-500 dark:border-olive-400 pl-6 mt-10">
                <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-2">
                  WorkshopPilot
                </p>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
                    $99
                  </span>
                  <span className="text-lg text-muted-foreground">
                    ~2 hours
                  </span>
                </div>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  97% cheaper than a consultant — and you keep the output
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

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-background border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-2xl mb-16 sm:mb-20">
            <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-4">
              Testimonials
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-[1.1] tracking-tight text-foreground">
              Builders like you are
              <br className="hidden sm:block" /> shipping faster
            </h2>
          </div>

          {/* Featured testimonials — large, two-column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            {[
              {
                quote:
                  "We used WorkshopPilot to test some ideas on how we could better lean into AI tools to improve our processes and outputs. It drove the process extremely effectively, ensuring we gathered information to lay the groundwork. It was organised, creative, thoughtful and insightful. We were wrapped with the direction it gave us in steering our product.",
                name: "Irene Chapple",
                role: "Founder, Better Aotearoa",
                image:
                  "https://www.bizbo.co.nz/bitmap/people/irene-chapple.jpg",
              },
              {
                quote:
                  "WorkshopPilot guided through a process to \u2018productise\u2019 our service business. The idea is to take what we do organically to be more deliberate and predictive. It was excellent. It understands and interprets and extracts the essence of what we imagined and suggests a path forward. And all good fun along the way. Good process.",
                name: "Vincent Heeringa",
                role: "Founder, Better Aotearoa",
                image:
                  "https://www.bizbo.co.nz/bitmap/people/vincent-heeringa.jpg",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="border-l-2 border-olive-300 dark:border-olive-600 pl-6 sm:pl-8"
              >
                <div className="flex gap-0.5 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-olive-500 text-olive-500 dark:fill-olive-400 dark:text-olive-400"
                    />
                  ))}
                </div>
                <p className="text-foreground/80 leading-relaxed mb-8">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Secondary testimonials — compact ruled rows */}
          <div className="divide-y divide-border mt-16 pt-16 border-t border-border">
            {[
              {
                quote:
                  "I spent weeks trying to write a PRD for my side project. WorkshopPilot walked me through it in one session. The output was better than anything I could have written alone.",
                name: "Sarah K.",
                role: "Indie Developer",
                initial: "S",
              },
              {
                quote:
                  "As a non-technical founder, I always struggled to communicate my vision to developers. Now I hand them the Build Pack and they actually understand what I want.",
                name: "Marcus L.",
                role: "Startup Founder",
                initial: "M",
              },
              {
                quote:
                  "I was about to spend $4,000 on a product consultant. Ran WorkshopPilot instead and the deliverables were just as thorough. Wish I found this sooner.",
                name: "Priya M.",
                role: "Product Designer",
                initial: "P",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-10 first:pt-0"
              >
                <div className="md:col-span-8">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-olive-500 text-olive-500 dark:fill-olive-400 dark:text-olive-400"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                </div>
                <div className="md:col-span-4 flex items-center md:justify-end gap-3">
                  <div className="w-10 h-10 rounded-full bg-olive-200 dark:bg-olive-800 flex items-center justify-center text-sm font-semibold text-olive-700 dark:text-olive-300 shrink-0">
                    {testimonial.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section
        id="pricing"
        className="py-24 sm:py-32 bg-background border-t border-border scroll-mt-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-2xl mb-12 sm:mb-16">
            <p className="text-sm font-medium uppercase tracking-widest text-olive-600 dark:text-olive-400 mb-4">
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif leading-[1.1] tracking-tight text-foreground mb-4">
              Weeks of planning.
              <br className="hidden sm:block" /> One simple price.
            </h2>
            <p className="text-muted-foreground text-lg">
              The same deliverables a product consultant charges $3,000+ to
              produce. Start free, pay only when you&apos;re ready for the full
              Build Pack.
            </p>
          </div>

          {/* Value anchor */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-8 text-sm text-muted-foreground mb-16 sm:mb-20">
            <span className="line-through opacity-60">
              Product Manager: $3,000
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="line-through opacity-60">DT Workshop: $5,000</span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="font-semibold text-olive-600 dark:text-olive-400">
              WorkshopPilot: from $99
            </span>
          </div>

          {/* Pricing tiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
            {/* Single Pilot */}
            <div className="rounded-2xl border border-border p-8 flex flex-col">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Single Pilot
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                One complete workshop. Perfect for validating your next idea.
              </p>
              <div className="mb-6">
                <span className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                  $99
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  / one workshop
                </span>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  "Full 10-step design thinking process",
                  "AI facilitator guides every step",
                  "Complete Build Pack output",
                  "Export-ready for dev teams and AI coders",
                  "Credits never expire",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-olive-600 dark:text-olive-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              {process.env.STRIPE_PRICE_SINGLE_FLIGHT ? (
                <form method="POST" action="/api/billing/checkout">
                  <input
                    type="hidden"
                    name="priceId"
                    value={process.env.STRIPE_PRICE_SINGLE_FLIGHT}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl py-3.5 px-4 font-semibold text-sm bg-card border border-border text-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    Buy 1 Workshop Credit
                  </button>
                </form>
              ) : (
                <NewWorkshopButton className="w-full">
                  Start Free Workshop
                </NewWorkshopButton>
              )}
            </div>

            {/* Serial Entrepreneur */}
            <div className="rounded-2xl border border-olive-600 dark:border-olive-400 ring-1 ring-olive-600/20 dark:ring-olive-400/20 p-8 flex flex-col">
              <div className="mb-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-olive-700 dark:text-olive-300 bg-olive-100 dark:bg-olive-900 rounded-full px-3 py-1">
                  <Sparkles className="h-3 w-3" />
                  Save $98
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Serial Entrepreneur
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                For founders who iterate. Your first idea might pivot — and
                that&apos;s the point.
              </p>
              <div className="mb-1">
                <span className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                  $199
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  / three workshops
                </span>
              </div>
              <p className="text-sm font-medium text-olive-600 dark:text-olive-400 mb-6">
                Save 33% vs. buying individually
              </p>
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  "Everything in Single Pilot",
                  "3 workshop credits ($66 each)",
                  "Compare Build Packs across concepts",
                  "Perfect for pivots and iterations",
                  "Credits never expire",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-olive-600 dark:text-olive-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              {process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR ? (
                <form method="POST" action="/api/billing/checkout">
                  <input
                    type="hidden"
                    name="priceId"
                    value={process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl py-3.5 px-4 font-semibold text-sm bg-olive-700 text-white hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 shadow-md shadow-olive-700/20 transition-colors cursor-pointer"
                  >
                    Buy 3 Workshop Credits
                  </button>
                </form>
              ) : (
                <NewWorkshopButton className="w-full">
                  Start Free Workshop
                </NewWorkshopButton>
              )}
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-col sm:flex-row items-start gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Secure payment via Stripe
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Credits never expire
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Steps 1–6 always free
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-background border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — headline */}
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-serif leading-[1.1] tracking-tight text-foreground">
                Plan faster.
                <br /> Build smarter
              </h2>
            </div>

            {/* Right — copy + actions */}
            <div>
              <p className="text-muted-foreground text-lg leading-relaxed mb-3">
                Start a free workshop and walk away with a complete Build Pack —
                PRD, tech specs, roadmap, and more. The same deliverables that
                would cost $3,000+ from a consultant.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Steps 1–6 are free. No credit card required.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <NewWorkshopButton
                  size="lg"
                  className="min-w-[200px] text-base shadow-lg shadow-olive-600/20"
                >
                  Start Free Workshop
                  <ArrowRight className="ml-2 h-4 w-4" />
                </NewWorkshopButton>
                <a href="#pricing">
                  <Button variant="outline" size="lg">
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

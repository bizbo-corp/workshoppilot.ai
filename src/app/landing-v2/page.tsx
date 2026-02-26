export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  Lightbulb,
  Map,
  MessageSquareX,
  Rocket,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/landing-header';
import { NewWorkshopButton } from '@/components/dialogs/new-workshop-dialog';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/landing/footer';
import { Globe } from '@/components/ui/globe';
import { WorkshopSimulation } from '@/components/landing-v2/workshop-simulation';

/**
 * Landing Page V2 — conversion-optimized
 *
 * Key changes from v1:
 * - Outcome-focused copy ("weeks of work saved" not "AI generation")
 * - Pain-point "Why Now" section
 * - Build Pack deliverables showcase
 * - Consultant comparison / value anchor
 * - Stronger CTAs throughout
 *
 * Route: /landing-v2
 * To swap with original: move this to app/page.tsx and archive original
 */
export default function LandingV2() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-start pt-16 md:pt-24 gap-8 overflow-hidden px-4">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-olive-400/20 blur-3xl dark:bg-olive-600/10" />
          <div className="absolute -bottom-32 left-1/4 h-180 w-180 rounded-full bg-olive-300/15 blur-3xl dark:bg-olive-50/10" />
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        {/* Globe */}
        <div className="absolute inset-x-0 bottom-[-500px] md:bottom-[-700px] xl:bottom-[-900px] mx-auto h-[800px] md:h-[1200px] xl:h-[1600px] w-full max-w-none opacity-50 dark:opacity-70 pointer-events-none select-none z-0">
          <Globe className="h-full w-full" />
        </div>

        {/* Simulated workshop overlay — cursors, name pills, sticky notes */}
        <WorkshopSimulation />

        <div className="relative mx-auto max-w-4xl text-center z-10">
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-olive-300/50 bg-olive-50/80 px-4 py-1.5 text-sm font-medium text-olive-700 dark:border-olive-700/50 dark:bg-olive-950/50 dark:text-olive-300">
            <Clock className="h-4 w-4" />
            Save weeks of planning in one session
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-serif leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Go from{' '}
            <span className="relative">
              <span className="text-olive-600 dark:text-olive-400">&ldquo;Vague Idea&rdquo;</span>
            </span>
            <br className="hidden sm:block" /> to{' '}
            <span className="text-olive-600 dark:text-olive-400">&ldquo;Developer-Ready&rdquo;</span>
            <br className="hidden sm:block" />{' '}
            <span className="relative inline-block">
              in 60 Minutes.
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
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Stop guessing and start building. WorkshopPilot uses proven Design Thinking
            frameworks to turn your vision into a comprehensive{' '}
            <strong className="text-foreground">Build Pack</strong> — the exact blueprint you need to
            hire devs or start coding today.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <NewWorkshopButton
              size="lg"
              className="min-w-[220px] text-base shadow-lg shadow-olive-600/20"
            >
              Start Free Workshop
              <ArrowRight className="ml-2 h-4 w-4" />
            </NewWorkshopButton>

            <Link href="#deliverables">
              <Button variant="outline" size="lg">
                See what you get
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-olive-500 text-olive-500 dark:fill-olive-400 dark:text-olive-400"
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Trusted by indie founders, product teams, and first-time builders
            </p>
          </div>
        </div>
      </section>

      {/* ── Pain Points: "Why Now" ───────────────────────────── */}
      <section className="py-20 sm:py-28 bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Stop Wasting Time on the Wrong Things
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Most software projects fail before the first line of code. Here&apos;s why.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Pain 1 */}
            <div className="relative">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/50 mb-6">
                <MessageSquareX className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">
                Kill the Blank Page
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                No more staring at a cursor wondering what feature comes first. Our AI facilitator
                asks the right questions in the right order — you just answer.
              </p>
            </div>

            {/* Pain 2 */}
            <div className="relative">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/50 mb-6">
                <Ban className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">
                Avoid Costly Rebuilds
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">70% of software waste</strong> comes from poor
                requirements. We lock yours down before you spend a dime on development.
              </p>
            </div>

            {/* Pain 3 */}
            <div className="relative">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-olive-100 dark:bg-olive-950/50 mb-6">
                <Target className="h-7 w-7 text-olive-600 dark:text-olive-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">
                Founder-to-Developer Clarity
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Get the artifacts you need to brief developers, pitch investors, or hand off to AI
                coding tools — with zero ambiguity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Three steps. One session. A complete product blueprint.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {[
              {
                step: '01',
                icon: Lightbulb,
                title: 'Describe Your Idea',
                description:
                  "Even if it's just a sentence. \"I want to build an app that helps dog walkers find clients\" is enough to start.",
              },
              {
                step: '02',
                icon: Zap,
                title: 'AI Runs the Workshop',
                description:
                  'Our AI facilitator walks you through a structured 10-step Design Thinking process — the same framework used by consultants charging $5,000+.',
              },
              {
                step: '03',
                icon: Rocket,
                title: 'Walk Away Build-Ready',
                description:
                  'Download your Build Pack: PRD, user stories, technical roadmap, and more. Hand it to developers or feed it to AI coding tools.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-border bg-card p-8 text-center"
                >
                  {/* Step number */}
                  <div className="text-sm font-mono font-bold text-olive-600 dark:text-olive-400 mb-4">
                    STEP {item.step}
                  </div>
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-olive-100 dark:bg-olive-950/50 mx-auto mb-6">
                    <Icon className="h-8 w-8 text-olive-600 dark:text-olive-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Build Pack Deliverables ──────────────────────────── */}
      <section id="deliverables" className="py-20 sm:py-28 bg-card scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-olive-300/50 bg-olive-50/80 px-4 py-1.5 text-sm font-medium text-olive-700 dark:border-olive-700/50 dark:bg-olive-950/50 dark:text-olive-300 mb-6">
              <Sparkles className="h-4 w-4" />
              Your Build Pack
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Professional-Grade Deliverables
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Not a PDF of your chat. A structured set of artifacts that would cost
              thousands from a consultant.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: 'Product Requirements Document',
                description:
                  'The "Bible" for your developers. Prevents scope creep, defines exactly what gets built, and keeps everyone aligned.',
                tag: 'PRD',
              },
              {
                icon: Users,
                title: 'User Stories & Personas',
                description:
                  'Import-ready stories for Jira, Linear, or Trello. Saves 10+ hours of manual writing and ensures nothing gets missed.',
                tag: 'Stories',
              },
              {
                icon: Layers,
                title: 'Technical Specifications',
                description:
                  'Architecture recommendations, data models, and API contracts. Give your dev team (or AI coder) a massive head start.',
                tag: 'Tech Specs',
              },
              {
                icon: Map,
                title: 'Feature Roadmap',
                description:
                  'Phase 1 vs Phase 2 prioritisation. Launch an MVP instead of a bloated failure. Know exactly what to build first.',
                tag: 'Roadmap',
              },
              {
                icon: Target,
                title: 'Lean Canvas',
                description:
                  'A one-page business model breakdown. Essential for internal alignment, early pitching, and validating market fit.',
                tag: 'Canvas',
              },
              {
                icon: Zap,
                title: 'AI-Coder Ready Output',
                description:
                  'Structured for direct handoff to Cursor, Claude Code, Copilot, or any AI coding tool. Skip the prompt engineering.',
                tag: 'AI-Ready',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-border bg-background p-6 transition-all hover:border-olive-300 dark:hover:border-olive-700 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-olive-100 dark:bg-olive-950/50">
                      <Icon className="h-5 w-5 text-olive-600 dark:text-olive-400" />
                    </div>
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-olive-600 dark:text-olive-400">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Value Comparison ──────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Would This Cost You Otherwise?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              The same deliverables. A fraction of the price. Done in an afternoon.
            </p>
          </div>

          <div className="space-y-4">
            {/* Comparison rows */}
            {[
              {
                label: 'Hire a Product Manager',
                price: '$3,000+',
                time: '2-4 weeks',
                crossed: true,
              },
              {
                label: 'Design Thinking Workshop',
                price: '$5,000+',
                time: '3-5 days',
                crossed: true,
              },
              {
                label: 'Freelance Consultant',
                price: '$2,000+',
                time: '1-2 weeks',
                crossed: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4 opacity-60"
              >
                <span className="text-foreground line-through">{row.label}</span>
                <div className="flex items-center gap-6">
                  <span className="text-sm text-muted-foreground line-through">{row.time}</span>
                  <span className="text-lg font-bold text-muted-foreground line-through">
                    {row.price}
                  </span>
                </div>
              </div>
            ))}

            {/* WorkshopPilot row */}
            <div className="flex items-center justify-between rounded-xl border-2 border-olive-600 dark:border-olive-400 bg-olive-50 dark:bg-olive-950/30 px-6 py-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-olive-600 dark:text-olive-400" />
                <span className="text-lg font-bold text-foreground">WorkshopPilot</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-olive-600 dark:text-olive-400">
                  ~60 minutes
                </span>
                <span className="text-2xl font-bold text-olive-700 dark:text-olive-300">$99</span>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            That&apos;s a 97% saving vs hiring a consultant — and you keep the output forever.
          </p>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Builders Like You Are Shipping Faster
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                quote:
                  'I spent weeks trying to write a PRD for my side project. WorkshopPilot walked me through it in one session. The output was better than anything I could have written alone.',
                name: 'Sarah K.',
                role: 'Indie Developer',
                initial: 'S',
                metric: 'Saved 3 weeks',
              },
              {
                quote:
                  "As a non-technical founder, I always struggled to communicate my vision to developers. Now I hand them the Build Pack and they actually understand what I want.",
                name: 'Marcus L.',
                role: 'Startup Founder',
                initial: 'M',
                metric: 'First hire in 5 days',
              },
              {
                quote:
                  'I was about to spend $4,000 on a product consultant. Ran WorkshopPilot instead and the deliverables were just as thorough. Wish I found this sooner.',
                name: 'Priya M.',
                role: 'Product Designer',
                initial: 'P',
                metric: 'Saved $3,900',
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-2xl border border-border bg-background p-6 sm:p-8 flex flex-col"
              >
                {/* Metric badge */}
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-olive-700 dark:text-olive-300 bg-olive-100 dark:bg-olive-900 rounded-full px-3 py-1">
                    {testimonial.metric}
                  </span>
                </div>

                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5 fill-olive-500 text-olive-500 dark:fill-olive-400 dark:text-olive-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm text-foreground/80 leading-relaxed italic mb-6 flex-1">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-olive-200 dark:bg-olive-800 flex items-center justify-center text-sm font-semibold text-olive-700 dark:text-olive-300 shrink-0">
                    {testimonial.initial}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Your idea deserves more than a blank page.
          </h2>
          <p className="text-lg text-muted-foreground mb-4 max-w-xl mx-auto">
            Start a free workshop and walk away with a complete Build Pack — the same deliverables
            that would cost $3,000+ from a consultant.
          </p>
          <p className="text-sm text-muted-foreground mb-10">
            Steps 1-6 are free. No credit card required to start.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <NewWorkshopButton
              size="lg"
              className="min-w-[220px] text-base shadow-lg shadow-olive-600/20"
            >
              Start Free Workshop
              <ArrowRight className="ml-2 h-4 w-4" />
            </NewWorkshopButton>
            <Link href="/pricing-v2">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

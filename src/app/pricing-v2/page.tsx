import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  HelpCircle,
  Layers,
  Map,
  Shield,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { LandingHeader } from '@/components/layout/landing-header';
import { Footer } from '@/components/landing/footer';
import { NewWorkshopButton } from '@/components/dialogs/new-workshop-dialog';

/**
 * Pricing Page V2 — conversion-optimized with value anchoring
 *
 * Key changes from v1:
 * - $99 / $199 price points (per recommendations doc)
 * - Consultant comparison anchor pricing
 * - Expanded deliverables detail
 * - FAQ section
 * - Stronger value framing
 *
 * Route: /pricing-v2
 * To swap with original: move this to app/pricing/page.tsx and archive original
 *
 * NOTE: When swapping in, update STRIPE_PRICE_SINGLE_FLIGHT and
 * STRIPE_PRICE_SERIAL_ENTREPRENEUR in Stripe to match $99/$199 price points.
 */

interface PricingTier {
  name: string;
  price: string;
  pricePerWorkshop: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  priceId: string | undefined;
  highlighted?: boolean;
  badge?: string;
  savings?: string;
}

function getTiers(): PricingTier[] {
  return [
    {
      name: 'Single Pilot',
      price: '$99',
      pricePerWorkshop: '$99',
      period: 'one workshop',
      description: 'One complete AI-facilitated design thinking workshop. Perfect for validating your next idea.',
      features: [
        'Full 10-step design thinking process',
        'AI facilitator guides every step',
        'Interactive canvas with visual tools',
        'Complete Build Pack output',
        'PRD, user stories & tech specs',
        'Export-ready for dev teams & AI coders',
        'Credits never expire',
      ],
      cta: 'Buy 1 Workshop Credit',
      priceId: process.env.STRIPE_PRICE_SINGLE_FLIGHT,
    },
    {
      name: 'Serial Entrepreneur',
      price: '$199',
      pricePerWorkshop: '$66',
      period: 'three workshops',
      description: "For founders who iterate. Your first idea might pivot — and that's the point.",
      features: [
        'Everything in Single Pilot',
        '3 workshop credits ($66 each)',
        'Run workshops for different product ideas',
        'Compare Build Packs across concepts',
        'Best value for serial builders',
        'Perfect for pivots and iterations',
        'Credits never expire',
      ],
      cta: 'Buy 3 Workshop Credits',
      priceId: process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR,
      highlighted: true,
      badge: 'Save $98',
      savings: 'Save 33% vs buying individually',
    },
  ];
}

const FAQ_ITEMS = [
  {
    question: 'What exactly do I get?',
    answer:
      'A complete Build Pack containing a Product Requirements Document (PRD), user stories ready for Jira/Linear, technical specifications, a feature roadmap, and a lean canvas. These are the same deliverables a product consultant would charge $3,000-$5,000 to produce.',
  },
  {
    question: 'What are Steps 1-6 (the free part)?',
    answer:
      "Steps 1-6 cover the discovery phase: defining your idea, identifying users, mapping pain points, brainstorming solutions, and prioritising features. You'll see real progress and can decide if the full Build Pack is worth unlocking.",
  },
  {
    question: 'How long does a workshop take?',
    answer:
      "Most users complete a full workshop in 45-90 minutes. You can pause and resume anytime — your progress is saved. There's no time limit.",
  },
  {
    question: 'Can I use the Build Pack with AI coding tools?',
    answer:
      'Absolutely. The Build Pack is specifically structured for handoff to AI coders like Cursor, Claude Code, GitHub Copilot, and others. The PRD and tech specs are designed to be directly usable as context for AI-assisted development.',
  },
  {
    question: 'Do credits expire?',
    answer:
      "No. Workshop credits never expire. Buy them when you're ready, use them when inspiration strikes.",
  },
  {
    question: 'What if I need help during the workshop?',
    answer:
      "The AI facilitator is your guide throughout the entire process. It asks the right questions, challenges assumptions, and keeps you on track. You don't need any design thinking or product management experience.",
  },
];

interface PricingPageProps {
  searchParams: Promise<{ return_to?: string }>;
}

export default async function PricingV2Page({ searchParams }: PricingPageProps) {
  const { return_to } = await searchParams;
  const validReturnTo = return_to && return_to.startsWith('/workshop/') ? return_to : null;
  const tiers = getTiers();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        {/* ── Hero / Header ──────────────────────────────────── */}
        <section className="pt-16 pb-8 sm:pt-20 sm:pb-12 bg-background">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-olive-300/50 bg-olive-50/80 px-4 py-1.5 text-sm font-medium text-olive-700 dark:border-olive-700/50 dark:bg-olive-950/50 dark:text-olive-300 mb-6">
              <Clock className="h-4 w-4" />
              60 minutes to developer-ready
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Weeks of Planning.{' '}
              <span className="text-olive-600 dark:text-olive-400">One Simple Price.</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The same deliverables a product consultant charges $3,000+ to produce.
              Start free, pay only when you&apos;re ready for the full Build Pack.
            </p>
          </div>
        </section>

        {/* ── Value Anchor ───────────────────────────────────── */}
        <section className="pb-8 sm:pb-12 bg-background">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="line-through opacity-60">Product Manager: $3,000</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="line-through opacity-60">DT Workshop: $5,000</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-border" />
              <div className="flex items-center gap-2 font-semibold text-olive-600 dark:text-olive-400">
                WorkshopPilot: from $99
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Cards ──────────────────────────────────── */}
        <section className="pb-20 sm:pb-24 bg-background">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-2xl border bg-card p-6 sm:p-8 flex flex-col${
                    tier.highlighted
                      ? ' border-olive-600 dark:border-olive-400 ring-1 ring-olive-600/20 dark:ring-olive-400/20 shadow-lg shadow-olive-600/5'
                      : ' border-border'
                  }`}
                >
                  {/* Badge */}
                  {tier.badge && (
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-olive-700 dark:text-olive-300 bg-olive-100 dark:bg-olive-900 rounded-full px-3 py-1">
                        <Sparkles className="h-3 w-3" />
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  {/* Tier header */}
                  <h2 className="text-xl font-bold text-foreground mb-1">{tier.name}</h2>
                  <p className="text-sm text-muted-foreground mb-5">{tier.description}</p>

                  {/* Price */}
                  <div className="mb-2">
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">
                      {tier.price}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">/ {tier.period}</span>
                  </div>

                  {/* Per-workshop breakdown */}
                  {tier.savings && (
                    <p className="text-sm font-medium text-olive-600 dark:text-olive-400 mb-6">
                      {tier.savings}
                    </p>
                  )}
                  {!tier.savings && <div className="mb-6" />}

                  {/* Features list */}
                  <ul className="space-y-3 flex-1 mb-8">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check
                          size={16}
                          className="text-olive-600 dark:text-olive-400 mt-0.5 shrink-0"
                        />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {tier.priceId ? (
                    <form method="POST" action="/api/billing/checkout">
                      <input type="hidden" name="priceId" value={tier.priceId} />
                      {validReturnTo && (
                        <input type="hidden" name="workshop_return_url" value={validReturnTo} />
                      )}
                      <button
                        type="submit"
                        className={`w-full rounded-xl py-3.5 px-4 font-semibold text-sm transition-colors cursor-pointer${
                          tier.highlighted
                            ? ' bg-olive-700 text-white hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 shadow-md shadow-olive-700/20'
                            : ' bg-card border border-border text-foreground hover:bg-accent'
                        }`}
                      >
                        {tier.cta}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl py-3.5 px-4 font-semibold text-sm bg-muted text-muted-foreground cursor-not-allowed"
                    >
                      Unavailable
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Trust signals */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
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
                Steps 1-6 always free
              </div>
            </div>
          </div>
        </section>

        {/* ── What's in the Build Pack ───────────────────────── */}
        <section className="py-20 sm:py-24 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                What&apos;s in Your Build Pack?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every workshop produces professional-grade deliverables designed for immediate use.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: FileText,
                  title: 'PRD',
                  description: 'Formal Product Requirements Document — the "Bible" for your developers.',
                },
                {
                  icon: Users,
                  title: 'User Stories',
                  description: 'Import-ready for Jira, Linear, or Trello. Saves 10+ hours of manual work.',
                },
                {
                  icon: Layers,
                  title: 'Tech Specs',
                  description: 'Architecture, data models, and API contracts your dev team can act on immediately.',
                },
                {
                  icon: Map,
                  title: 'Feature Roadmap',
                  description: 'Phase 1 vs Phase 2 prioritisation. Build the right thing first.',
                },
                {
                  icon: Target,
                  title: 'Lean Canvas',
                  description: '1-page business model. Essential for alignment and early pitching.',
                },
                {
                  icon: Zap,
                  title: 'AI-Coder Ready',
                  description: 'Structured for Cursor, Claude Code, Copilot, and other AI coding tools.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-olive-100 dark:bg-olive-950/50 shrink-0">
                      <Icon className="h-5 w-5 text-olive-600 dark:text-olive-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────── */}
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-6">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="border-b border-border pb-6 last:border-0">
                  <h3 className="flex items-start gap-3 text-base font-semibold text-foreground mb-2">
                    <HelpCircle className="h-5 w-5 text-olive-600 dark:text-olive-400 mt-0.5 shrink-0" />
                    {item.question}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────── */}
        <section className="py-20 sm:py-24 bg-card">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to Turn Your Idea Into a Blueprint?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Start free. No credit card required. See real results before you pay.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <NewWorkshopButton
                size="lg"
                className="min-w-[220px] text-base shadow-lg shadow-olive-600/20"
              >
                Start Free Workshop
                <ArrowRight className="ml-2 h-4 w-4" />
              </NewWorkshopButton>
            </div>
            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 fill-olive-500 text-olive-500 dark:fill-olive-400 dark:text-olive-400"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Trusted by indie founders and product teams
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

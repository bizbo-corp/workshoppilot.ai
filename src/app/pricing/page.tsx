import { Icon } from '@/components/ui/icon';
import { LandingHeader } from '@/components/layout/landing-header';
import { Footer } from '@/components/landing/footer';
import { NewWorkshopButton } from '@/components/dialogs/new-workshop-dialog';
import { Heading, Text } from '@/components/ui/typography';

/**
 * Pricing Page — three-tier conversion-optimized layout
 *
 * Solo $99 / Team $299 (highlighted) / White Glove $1,499
 *
 * Stripe SKUs required:
 *   STRIPE_PRICE_SOLO_WORKSHOP   ($99)
 *   STRIPE_PRICE_TEAM_WORKSHOP   ($299)
 *   STRIPE_PRICE_WHITE_GLOVE     ($1,499)
 */

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  /** When set, the CTA is a form-post to /api/billing/checkout (used by Solo only — no workshopId needed). */
  priceId?: string;
  /** When set, the CTA opens NewWorkshopButton with preselectTier (used by Team / White Glove — needs workshopId). */
  preselectTier?: 'team' | 'white_glove';
  highlighted?: boolean;
  badge?: string;
  savings?: string;
}

function getTiers(): PricingTier[] {
  return [
    {
      name: 'Solo Workshop',
      price: '$99',
      period: 'one workshop',
      description: 'AI-facilitated, just you. Validate any idea start to finish in under 90 minutes.',
      features: [
        'Full 10-step design thinking process',
        'AI facilitator guides every step',
        'Interactive canvas with visual tools',
        'Complete Build Pack output',
        'PRD & tech specs for digital ideas',
        'Export-ready for dev teams & AI coders',
      ],
      cta: 'Start a Solo Workshop',
      priceId: process.env.STRIPE_PRICE_SOLO_WORKSHOP,
    },
    {
      name: 'Team Workshop',
      price: '$299',
      period: 'one team workshop',
      description: 'Run a real workshop with your team — invite by email, schedule a session, build together.',
      features: [
        'Everything in Solo, plus:',
        'Invite teammates by email',
        'Real-time multiplayer canvas',
        'Lobby + scheduled sessions',
        'Up to 15 participants',
        'Live cursors, presence, chat',
        'One unified Build Pack from the team',
      ],
      cta: 'Start a Team Workshop',
      preselectTier: 'team',
      highlighted: true,
      badge: 'Most Popular',
    },
    {
      name: 'White Glove',
      price: '$1,499',
      period: 'one engagement',
      description: 'Get a real human facilitator to take you through the workshop. Includes Team workshop plus 1:1 setup, custom Build Pack review, and 30-day support.',
      features: [
        'Everything in Team, plus:',
        '1:1 onboarding call with our team',
        'Custom Build Pack review & polish',
        'Workshop facilitation guidance',
        'Direct line to the founders',
      ],
      cta: 'Get White Glove',
      preselectTier: 'white_glove',
    },
  ];
}

const FAQ_ITEMS = [
  {
    question: 'What exactly do I get?',
    answer:
      'A ready-to-run validation plan with a pre-committed success signal — plus, for digital ideas, a complete Build Pack containing a Product Requirements Document (PRD) and technical specifications. These are the same deliverables a product consultant would charge $3,000-$5,000 to produce.',
  },
  {
    question: 'What are Steps 1-6 (the free part)?',
    answer:
      "Steps 1-6 cover the discovery phase: defining your idea, identifying users, mapping pain points, brainstorming solutions, and prioritising features. You'll see real progress and can decide if the full Build Pack is worth unlocking — for either Solo or Team.",
  },
  {
    question: 'I started a Solo workshop — can I switch to Team?',
    answer:
      "Yes. Open Step 1 of any solo workshop and click \"Switch to team mode\". If you've already paid for the Solo unlock ($99), you only pay the $200 difference. If you're still in the free trial, switching is free and the team price ($299) applies when you unlock the Build Pack.",
  },
  {
    question: 'What does White Glove include?',
    answer:
      'Everything in Team, plus a 1:1 onboarding call with our team, custom review and polish of your Build Pack, facilitation guidance, and 30 days of priority support. Best for teams running their first major workshop or shipping something high-stakes.',
  },
  {
    question: 'How long does a workshop take?',
    answer:
      "Solo workshops take 45-90 minutes. Team workshops typically run 60-120 minutes depending on the number of participants. You can pause and resume anytime — progress is saved.",
  },
  {
    question: 'Can I use the Build Pack with AI coding tools?',
    answer:
      'Absolutely. The Build Pack is specifically structured for handoff to AI coders like Cursor, Claude Code, GitHub Copilot, and others. The PRD and tech specs are designed to be directly usable as context for AI-assisted development.',
  },
  {
    question: 'What if I need help during the workshop?',
    answer:
      "The AI facilitator guides every step in Solo and Team. White Glove adds a real human you can reach during business hours.",
  },
];

interface PricingPageProps {
  searchParams: Promise<{ return_to?: string }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
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
              <Icon name="clock" className="h-4 w-4" />
              60 minutes to developer-ready
            </div>
            <Heading level={1} className="md:text-5xl mb-4">
              Weeks of Planning.{' '}
              <span className="text-olive-600 dark:text-olive-400">One Simple Price.</span>
            </Heading>
            <Text variant="muted" className="text-lg max-w-2xl mx-auto">
              The same deliverables a product consultant charges $3,000+ to produce.
              Start free, pay only when you&apos;re ready for the full Build Pack.
            </Text>
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
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
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
                        <Icon name="sparkles" className="h-3 w-3" />
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  {/* Tier header */}
                  <Heading level={3} as="h2" className="text-xl font-bold mb-1">{tier.name}</Heading>
                  <Text variant="muted" className="mb-5">{tier.description}</Text>

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
                        <Icon
                          name="check"
                          size={16}
                          className="text-olive-600 dark:text-olive-400 mt-0.5 shrink-0"
                        />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA — Solo uses form-post (no workshopId needed); Team/White Glove
                      route through the workshop-creation dialog. */}
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
                            ? ' bg-primary-brand text-primary-brand-foreground hover:bg-primary-brand/90 shadow-md shadow-primary-brand/30'
                            : ' bg-card border border-border text-foreground hover:bg-accent'
                        }`}
                      >
                        {tier.cta}
                      </button>
                    </form>
                  ) : tier.preselectTier ? (
                    <NewWorkshopButton
                      preselectTier={tier.preselectTier}
                      className={`w-full rounded-xl py-3.5 px-4 font-semibold text-sm transition-colors cursor-pointer${
                        tier.highlighted
                          ? ' bg-primary-brand text-primary-brand-foreground hover:bg-primary-brand/90 shadow-md shadow-primary-brand/30'
                          : ' bg-card border border-border text-foreground hover:bg-accent'
                      }`}
                    >
                      {tier.cta}
                    </NewWorkshopButton>
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
                <Icon name="shield" className="h-4 w-4" />
                Secure payment via Stripe
              </div>
            </div>
          </div>
        </section>

        {/* ── What's in the Build Pack ───────────────────────── */}
        <section className="py-20 sm:py-24 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Heading level={2} className="text-2xl sm:text-3xl font-bold mb-4">
                What&apos;s in Your Build Pack?
              </Heading>
              <Text variant="muted" className="max-w-xl mx-auto">
                Every workshop produces professional-grade deliverables designed for immediate use.
              </Text>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: 'file-text' as const,
                  title: 'PRD',
                  description: 'Formal Product Requirements Document — the "Bible" for your developers.',
                },
                {
                  icon: 'clipboard-check' as const,
                  title: 'Validation Plan',
                  description: 'Your riskiest assumption, the cheapest test that proves or kills it, and a pre-committed success signal.',
                },
                {
                  icon: 'layers' as const,
                  title: 'Tech Specs',
                  description: 'Architecture, data models, and API contracts your dev team can act on immediately.',
                },
                {
                  icon: 'map' as const,
                  title: 'Journey Map',
                  description: 'How users move through your product — pain points and drop-off risks mapped before you build.',
                },
                {
                  icon: 'target' as const,
                  title: 'Lean Canvas',
                  description: '1-page business model. Essential for alignment and early pitching.',
                },
                {
                  icon: 'zap' as const,
                  title: 'AI-Coder Ready',
                  description: 'Structured for Cursor, Claude Code, Copilot, and other AI coding tools.',
                },
              ].map((item) => {
                return (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-olive-100 dark:bg-olive-950/50 shrink-0">
                      <Icon name={item.icon} className="h-5 w-5 text-olive-600 dark:text-olive-400" />
                    </div>
                    <div>
                      <Heading level={4} as="h3" className="font-bold mb-1">{item.title}</Heading>
                      <Text variant="muted" className="leading-relaxed">
                        {item.description}
                      </Text>
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
              <Heading level={2} className="text-2xl sm:text-3xl font-bold mb-4">
                Frequently Asked Questions
              </Heading>
            </div>

            <div className="space-y-6">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="border-b border-border pb-6 last:border-0">
                  <Heading level={3} as="h3" className="flex items-start gap-3 text-base font-semibold mb-2">
                    <Icon name="help-circle" className="h-5 w-5 text-olive-600 dark:text-olive-400 mt-0.5 shrink-0" />
                    {item.question}
                  </Heading>
                  <Text variant="muted" className="leading-relaxed pl-8">
                    {item.answer}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────── */}
        <section className="py-20 sm:py-24 bg-card">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <Heading level={2} className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to Turn Your Idea Into a Blueprint?
            </Heading>
            <Text variant="muted" className="mb-8 max-w-xl mx-auto">
              Start free. No credit card required. See real results before you pay.
            </Text>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <NewWorkshopButton
                size="lg"
                className="min-w-[220px] text-base shadow-lg shadow-olive-600/20"
              >
                Start Free Workshop
                <Icon name="arrow-right" className="ml-2 h-4 w-4" />
              </NewWorkshopButton>
            </div>
            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon
                    key={i}
                    name="star"
                    weight="fill"
                    className="h-3.5 w-3.5 fill-olive-500 text-olive-500 dark:fill-olive-400 dark:text-olive-400"
                  />
                ))}
              </div>
              <Text variant="muted">
                Trusted by indie founders and product teams
              </Text>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

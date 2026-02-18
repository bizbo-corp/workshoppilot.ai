import { Check } from 'lucide-react';
import { LandingHeader } from '@/components/layout/landing-header';
import { Footer } from '@/components/landing/footer';

/**
 * Pricing page — server component, publicly accessible, not linked from nav.
 * Informational only: no payment processing.
 */

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Single Use',
    price: '$9',
    period: 'per workshop',
    description: 'One complete workshop session',
    features: [
      'AI-guided 10-step design thinking process',
      'Complete Build Pack output (PRD, user stories, tech specs)',
      'Canvas whiteboard with visual ideation tools',
      'Export-ready deliverables',
    ],
    cta: 'Start a Workshop',
  },
  {
    name: 'Facilitator',
    price: '$29',
    period: 'per month',
    description: 'For professionals running multiple workshops',
    features: [
      'Everything in Single Use',
      'Unlimited workshops per month',
      'Workshop history and management',
      'Priority AI processing',
      'Save and resume any workshop',
    ],
    cta: 'Get Facilitator',
    highlighted: true,
  },
  {
    name: 'Annual Subscription',
    price: '$249',
    period: 'per year',
    description: 'Best value for ongoing use',
    features: [
      'Everything in Facilitator',
      '2 months free (vs. monthly)',
      'Early access to new features',
      'Team collaboration (coming soon)',
      'Custom workshop templates (coming soon)',
    ],
    cta: 'Subscribe Annually',
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Page heading */}
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-muted-foreground text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
              Start with a single session or commit to unlimited access. Every
              tier gives you the full AI-facilitated design thinking experience.
            </p>

            {/* Pricing tiers grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {PRICING_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-xl border border-border bg-card p-6 sm:p-8 flex flex-col${
                    tier.highlighted
                      ? ' ring-2 ring-olive-600 dark:ring-olive-400'
                      : ''
                  }`}
                >
                  {/* Most Popular badge */}
                  {tier.highlighted && (
                    <div className="mb-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-olive-700 dark:text-olive-300 bg-olive-100 dark:bg-olive-900 rounded-full px-3 py-1">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Tier header */}
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {tier.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {tier.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-3xl sm:text-4xl font-bold text-foreground">
                      {tier.price}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      {tier.period}
                    </span>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-3 flex-1 mb-8">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check
                          size={16}
                          className="text-olive-600 dark:text-olive-400 mt-0.5 shrink-0"
                        />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <button
                    type="button"
                    className={`w-full rounded-lg py-3 px-4 font-semibold text-sm transition-colors${
                      tier.highlighted
                        ? ' bg-olive-700 text-white hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500'
                        : ' bg-card border border-border text-foreground hover:bg-background'
                    }`}
                  >
                    {tier.cta}
                  </button>
                </div>
              ))}
            </div>

            {/* Informational disclaimer */}
            <p className="text-sm text-muted-foreground text-center mt-12">
              Pricing is for informational purposes. Payment processing coming
              soon.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

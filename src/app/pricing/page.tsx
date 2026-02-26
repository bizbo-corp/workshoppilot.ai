import { Check, Sparkles } from 'lucide-react';
import { LandingHeader } from '@/components/layout/landing-header';
import { Footer } from '@/components/landing/footer';

/**
 * Pricing page — server component, publicly accessible.
 * CTA buttons submit forms to /api/billing/checkout which redirects to Stripe.
 */

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  priceId: string | undefined;
  highlighted?: boolean;
  badge?: string;
}

function getTiers(): PricingTier[] {
  return [
    {
      name: 'Single Flight',
      price: '$79',
      period: 'one workshop',
      description: 'One complete AI-facilitated design thinking workshop',
      features: [
        'Full 10-step design thinking process',
        'AI facilitator guides every step',
        'Interactive canvas with visual tools',
        'Complete Build Pack output (PRD, user stories, tech specs)',
        'Export-ready deliverables for your dev team',
      ],
      cta: 'Buy 1 Credit',
      priceId: process.env.STRIPE_PRICE_SINGLE_FLIGHT,
    },
    {
      name: 'Serial Entrepreneur',
      price: '$149',
      period: 'three workshops',
      description: 'For founders iterating on multiple ideas',
      features: [
        'Everything in Single Flight',
        '3 workshop credits ($49.67 each — save 37%)',
        'Run workshops for different product ideas',
        'Compare Build Packs across concepts',
        'Best value for serial builders',
      ],
      cta: 'Buy 3 Credits',
      priceId: process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR,
      highlighted: true,
      badge: 'Best Value',
    },
  ];
}

interface PricingPageProps {
  searchParams: Promise<{ return_to?: string }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const { return_to } = await searchParams;

  // Validate return_to — prevent open redirect (same check as checkout route)
  const validReturnTo = return_to && return_to.startsWith('/workshop/') ? return_to : null;

  const tiers = getTiers();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        <section className="py-20 sm:py-24 bg-background">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Page heading */}
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-muted-foreground text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
              One credit unlocks a complete AI-facilitated design thinking workshop.
              Go from vague idea to developer-ready Build Pack in a single session.
            </p>

            {/* Pricing tiers grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-xl border border-border bg-card p-6 sm:p-8 flex flex-col${
                    tier.highlighted
                      ? ' ring-2 ring-olive-600 dark:ring-olive-400'
                      : ''
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
                      / {tier.period}
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

                  {/* CTA — form POST to checkout API, browser follows 303 redirect to Stripe */}
                  {tier.priceId ? (
                    <form method="POST" action="/api/billing/checkout">
                      <input type="hidden" name="priceId" value={tier.priceId} />
                      {validReturnTo && (
                        <input type="hidden" name="workshop_return_url" value={validReturnTo} />
                      )}
                      <button
                        type="submit"
                        className={`w-full rounded-lg py-3 px-4 font-semibold text-sm transition-colors cursor-pointer${
                          tier.highlighted
                            ? ' bg-olive-700 text-white hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500'
                            : ' bg-card border border-border text-foreground hover:bg-background'
                        }`}
                      >
                        {tier.cta}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-lg py-3 px-4 font-semibold text-sm bg-muted text-muted-foreground cursor-not-allowed"
                    >
                      Unavailable
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Trust signals */}
            <div className="mt-12 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Secure payment via Stripe. Credits never expire.
              </p>
              <p className="text-xs text-muted-foreground">
                Steps 1-6 are always free. Credits unlock Steps 7-10 and your Build Pack.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

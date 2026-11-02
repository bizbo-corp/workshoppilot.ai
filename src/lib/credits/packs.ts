/**
 * Credit packs sold through Stripe Checkout. Prices in USD cents. The Stripe
 * price ids come from env so test and live accounts differ only in config.
 */
export interface CreditPack {
  id: 'starter' | 'builder' | 'studio';
  name: string;
  credits: number;
  amountCents: number;
  blurb: string;
  priceIdEnv: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 500,
    amountCents: 2500,
    blurb: 'One Verdict and a few sketch clean-ups.',
    priceIdEnv: 'STRIPE_PRICE_PACK_STARTER',
  },
  {
    id: 'builder',
    name: 'Builder',
    credits: 1500,
    amountCents: 6000,
    blurb: 'Three Verdicts, or one Validation Sprint.',
    priceIdEnv: 'STRIPE_PRICE_PACK_BUILDER',
  },
  {
    id: 'studio',
    name: 'Studio',
    credits: 5000,
    amountCents: 15000,
    blurb: 'For consultants running several ideas a month.',
    priceIdEnv: 'STRIPE_PRICE_PACK_STUDIO',
  },
];

/** Credits a new account starts with, enough to see what a paid job looks like. */
export const WELCOME_CREDITS = 50;

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function getPackByPriceId(priceId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => process.env[p.priceIdEnv] === priceId);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

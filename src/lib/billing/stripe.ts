import 'server-only';
import Stripe from 'stripe';

// Fail fast: throw at module initialization if key is missing
// Same pattern as src/db/client.ts
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY environment variable is not set. Configure your Stripe API key.'
  );
}

// Production safety: prevent test keys from reaching production
if (
  process.env.VERCEL_ENV === 'production' &&
  process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
) {
  throw new Error(
    'STRIPE_SECRET_KEY is a test key (sk_test_*) but VERCEL_ENV is production. Use production Stripe keys.'
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover', // Pinned to stripe@20.4.0 default
  typescript: true,
});

import 'server-only';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

if (process.env.VERCEL_ENV === 'production' && process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  throw new Error('STRIPE_SECRET_KEY is a test key but VERCEL_ENV is production');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

/** Absolute origin for Stripe redirect URLs. */
export function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_ENV === 'production') return 'https://www.workshoppilot.ai';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

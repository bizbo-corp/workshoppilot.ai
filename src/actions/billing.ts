'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/current-user';
import { stripe, appUrl } from '@/lib/billing/stripe';
import { getPack } from '@/lib/credits/packs';

export type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

/** Start Stripe Checkout for a credit pack. Redirects to Stripe on success. */
export async function startCreditCheckout(packId: string, returnTo?: string): Promise<ActionResult> {
  const user = await requireUser();
  const pack = getPack(packId);
  if (!pack) return { success: false, error: 'Unknown pack' };
  const priceId = process.env[pack.priceIdEnv];
  if (!priceId) return { success: false, error: `Stripe price for ${pack.name} is not configured` };

  // Only allow same-site return paths.
  const safeReturn = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email || undefined,
    client_reference_id: user.id,
    metadata: { userId: user.id, packId: pack.id, credits: String(pack.credits) },
    success_url: `${appUrl()}/credits/success?session_id={CHECKOUT_SESSION_ID}&return_to=${encodeURIComponent(safeReturn)}`,
    cancel_url: `${appUrl()}/credits?cancelled=1`,
    allow_promotion_codes: true,
  });

  if (!session.url) return { success: false, error: 'Stripe did not return a checkout URL' };
  redirect(session.url);
}

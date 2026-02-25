import { stripe } from '@/lib/billing/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { fulfillCreditPurchase } from '@/lib/billing/fulfill-credit-purchase';
import type Stripe from 'stripe';

/**
 * Stripe webhook handler for credit purchase fulfillment.
 *
 * Design decisions:
 * - 400 for invalid/missing signatures: Stripe will NOT retry 4xx. Bad signature
 *   is not transient — it means the event is invalid or from an untrusted source.
 * - 500 for handler errors: Stripe WILL retry 5xx. The onConflictDoNothing in
 *   fulfillCreditPurchase prevents double-fulfillment on retries.
 * - 200 for unhandled event types: Stripe sends many event types; returning 400
 *   causes needless delivery failures in the Dashboard.
 * - Raw body via req.text(): HMAC is computed over raw bytes. Using req.json()
 *   would break signature verification.
 *
 * Docs: https://docs.stripe.com/webhooks
 */
export async function POST(req: Request) {
  // Step 1: Read raw body — NEVER use req.json() as it breaks HMAC verification
  const body = await req.text();

  // Step 2: Extract stripe-signature header for HMAC verification
  const headerPayload = await headers();
  const signature = headerPayload.get('stripe-signature');

  if (!signature) {
    console.error('Stripe webhook: missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // Step 3: Verify HMAC signature — invalid signature returns 400 (not 500)
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Step 4: Handle events — errors return 500 so Stripe retries (idempotency prevents double-fulfillment)
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Fires immediately when checkout completes for card payments
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await fulfillCreditPurchase(session.id);
        console.log(
          `Stripe webhook fulfillment: session=${session.id} result=${result.status}`
        );
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        // Fires for deferred payment methods (ACH, etc.) that complete after session
        // The payment_status check inside fulfillCreditPurchase guards against
        // fulfilling an unpaid session if checkout.session.completed fires first
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await fulfillCreditPurchase(session.id);
        console.log(
          `Stripe webhook async fulfillment: session=${session.id} result=${result.status}`
        );
        break;
      }

      default:
        // Acknowledge unhandled events — return 200, NOT 400
        // Stripe sends many event types; returning 400 causes needless delivery failures
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    // Return 500 so Stripe retries — idempotency constraint prevents double-fulfillment
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  // Step 5: Acknowledge receipt — 200 for all successfully processed events
  return NextResponse.json({ received: true }, { status: 200 });
}

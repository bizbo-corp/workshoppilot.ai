import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { stripeEvents } from '@/db/schema';
import { stripe } from '@/lib/billing/stripe';
import { fulfilCheckoutSession } from '@/lib/billing/fulfil';

export const runtime = 'nodejs';

/**
 * Stripe webhook. Verifies the signature, records the event id first (the
 * primary key makes a replay a no-op), then fulfils. Returns 200 on anything
 * we have handled or chosen to ignore so Stripe stops retrying.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${String(err)}` }, { status: 400 });
  }

  const inserted = await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning();
  if (inserted.length === 0) return NextResponse.json({ received: true, duplicate: true });

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const result = await fulfilCheckoutSession(event.data.object);
    if (!result.ok) console.warn('[stripe] not fulfilled', event.id, result.reason);
  }

  return NextResponse.json({ received: true });
}

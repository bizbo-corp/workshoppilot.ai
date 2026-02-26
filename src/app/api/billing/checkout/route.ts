import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/billing/stripe';
import { getPriceConfig } from '@/lib/billing/price-config';
import { db } from '@/db/client';
import { users } from '@/db/schema';

export async function POST(req: Request) {
  // 1. Authenticate — return 401 if not logged in
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate request body (JSON or form data)
  let priceId: string;
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      priceId = body.priceId;
    } else {
      const formData = await req.formData();
      priceId = formData.get('priceId') as string;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 3. Validate priceId against server-side map — client never supplies credit quantity
  const priceConfig = getPriceConfig(priceId);
  if (!priceConfig) {
    return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
  }

  // 4. Look up user from DB
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  // 5. Lazily create Stripe Customer if not yet created, then persist
  let stripeCustomerId = user?.stripeCustomerId ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkUserId: userId },
      email: user?.email,
    });
    stripeCustomerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.clerkUserId, userId));
  }

  // 6. Get origin for success/cancel URLs
  const origin =
    (await headers()).get('origin') ?? 'https://workshoppilot.ai';

  // 7. Create Stripe Checkout Session
  // NOTE: {CHECKOUT_SESSION_ID} is a Stripe template variable — do NOT interpolate with JS
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    line_items: [{ price: priceConfig.priceId, quantity: 1 }],
    success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/purchase/cancel`,
    metadata: {
      clerkUserId: userId,
      creditQty: String(priceConfig.creditQty),
      productType: priceConfig.label,
    },
  });

  // 8. 303 redirect to Stripe-hosted checkout (303 = correct for POST->GET redirect)
  return NextResponse.redirect(session.url!, 303);
}

import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { stripe } from '@/lib/billing/stripe';
import { getPriceConfig, getPriceConfigBySku, type Sku } from '@/lib/billing/price-config';
import { db } from '@/db/client';
import { users, workshops } from '@/db/schema';

/**
 * Checkout session creation.
 *
 * Two ways to call this endpoint:
 *  1. Form POST with `priceId` (legacy — still used by the pricing page).
 *  2. JSON POST with `{ sku, workshopId? }` (new — used by inline upsells & conversion).
 *
 * For SKUs that target a specific workshop (team / team_upgrade / white_glove),
 * `workshopId` MUST be supplied and the caller MUST own the workshop. This is
 * enforced server-side here AND re-checked in fulfillment (defense in depth).
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let priceId: string | null = null;
  let sku: Sku | null = null;
  let workshopId: string | null = null;
  let workshopReturnUrl: string | null = null;

  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      priceId = body.priceId ?? null;
      sku = (body.sku as Sku | undefined) ?? null;
      workshopId = body.workshopId ?? null;
      workshopReturnUrl = body.workshop_return_url ?? body.returnUrl ?? null;
    } else {
      const formData = await req.formData();
      priceId = (formData.get('priceId') as string) || null;
      sku = ((formData.get('sku') as string) || null) as Sku | null;
      workshopId = (formData.get('workshopId') as string) || null;
      workshopReturnUrl = (formData.get('workshop_return_url') as string) || null;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (workshopReturnUrl && !workshopReturnUrl.startsWith('/workshop/')) {
    workshopReturnUrl = null;
  }

  // Resolve the price config from either input form
  const priceConfig = priceId
    ? getPriceConfig(priceId)
    : sku
      ? getPriceConfigBySku(sku)
      : null;

  if (!priceConfig) {
    return NextResponse.json({ error: 'Invalid price ID or SKU' }, { status: 400 });
  }

  // Validate workshop ownership for per-workshop SKUs
  if (priceConfig.requiresWorkshopId) {
    if (!workshopId) {
      return NextResponse.json(
        { error: `${priceConfig.sku} purchase requires workshopId` },
        { status: 400 }
      );
    }
    const workshop = await db.query.workshops.findFirst({
      where: and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)),
      columns: { id: true, tier: true },
    });
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }
    // team_upgrade requires the workshop to currently be at solo tier
    if (priceConfig.sku === 'team_upgrade' && workshop.tier !== 'solo') {
      return NextResponse.json(
        { error: 'Solo→Team upgrade is only valid for workshops already at solo tier' },
        { status: 400 }
      );
    }
  }

  // Lazy-create Stripe customer
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

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

  const origin = (await headers()).get('origin') ?? 'https://workshoppilot.ai';
  const returnParam = workshopReturnUrl
    ? `&return_to=${encodeURIComponent(workshopReturnUrl)}`
    : '';
  const successUrl = `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}${returnParam}`;

  const metadata: Record<string, string> = {
    clerkUserId: userId,
    sku: priceConfig.sku,
    creditQty: String(priceConfig.creditQty),
    productType: priceConfig.label,
  };
  if (workshopId) metadata.workshopId = workshopId;

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    line_items: [{ price: priceConfig.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: `${origin}/purchase/cancel`,
    metadata,
  });

  return NextResponse.redirect(session.url!, 303);
}

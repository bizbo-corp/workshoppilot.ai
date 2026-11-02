/**
 * Creates the credit-pack products and prices in the Stripe account that
 * STRIPE_SECRET_KEY points at, then prints the env lines to paste. Safe to
 * re-run: it looks products up by metadata first.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/setup-stripe-packs.ts
 */
import Stripe from 'stripe';
import { CREDIT_PACKS } from '../src/lib/credits/packs';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error('STRIPE_SECRET_KEY missing');
const stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });

async function main() {
  console.log(`Stripe account: ${key!.startsWith('sk_test_') ? 'TEST mode' : 'LIVE mode'}`);
  const lines: string[] = [];
  for (const pack of CREDIT_PACKS) {
    const search = await stripe.products.search({ query: `metadata['wp_pack']:'${pack.id}' AND active:'true'` });
    let product = search.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: `WorkshopPilot ${pack.name} pack`,
        description: `${pack.credits} credits. ${pack.blurb}`,
        metadata: { wp_pack: pack.id, credits: String(pack.credits) },
      });
      console.log(`created product ${product.id} for ${pack.id}`);
    }
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    let price = prices.data.find((p) => p.unit_amount === pack.amountCents && p.currency === 'usd');
    if (!price) {
      price = await stripe.prices.create({ product: product.id, unit_amount: pack.amountCents, currency: 'usd' });
      console.log(`created price ${price.id} for ${pack.id} at $${pack.amountCents / 100}`);
    }
    lines.push(`${pack.priceIdEnv}=${price.id}`);
  }
  console.log('\nAdd to .env.local and Vercel:\n' + lines.join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

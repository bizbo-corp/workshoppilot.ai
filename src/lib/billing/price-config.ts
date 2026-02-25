import 'server-only';

export interface PriceConfig {
  priceId: string;
  creditQty: number;
  label: string;
  amountCents: number;
}

export function getPriceConfig(priceId: string): PriceConfig | null {
  const configs: Record<string, PriceConfig> = {
    [process.env.STRIPE_PRICE_SINGLE_FLIGHT!]: {
      priceId: process.env.STRIPE_PRICE_SINGLE_FLIGHT!,
      creditQty: 1,
      label: 'Single Flight Workshop',
      amountCents: 7900,
    },
    [process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR!]: {
      priceId: process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR!,
      creditQty: 3,
      label: 'Serial Entrepreneur Pack',
      amountCents: 14900,
    },
  };
  return configs[priceId] ?? null;
}

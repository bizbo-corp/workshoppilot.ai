import 'server-only';

export type Sku = 'solo' | 'team' | 'team_upgrade' | 'white_glove';

export interface PriceConfig {
  priceId: string;
  sku: Sku;
  creditQty: number;       // 1 for solo (adds to balance); 0 for per-workshop tiers
  label: string;
  amountCents: number;
  requiresWorkshopId: boolean;  // true for team / team_upgrade / white_glove
}

function buildConfigs(): Record<string, PriceConfig> {
  const configs: Record<string, PriceConfig> = {};

  // ─── New tier SKUs ───────────────────────────────────────────────────────
  if (process.env.STRIPE_PRICE_SOLO_WORKSHOP) {
    configs[process.env.STRIPE_PRICE_SOLO_WORKSHOP] = {
      priceId: process.env.STRIPE_PRICE_SOLO_WORKSHOP,
      sku: 'solo',
      creditQty: 1,
      label: 'Solo Workshop',
      amountCents: 9900,
      requiresWorkshopId: false,
    };
  }
  if (process.env.STRIPE_PRICE_TEAM_WORKSHOP) {
    configs[process.env.STRIPE_PRICE_TEAM_WORKSHOP] = {
      priceId: process.env.STRIPE_PRICE_TEAM_WORKSHOP,
      sku: 'team',
      creditQty: 0,
      label: 'Team Workshop',
      amountCents: 29900,
      requiresWorkshopId: true,
    };
  }
  if (process.env.STRIPE_PRICE_TEAM_UPGRADE) {
    configs[process.env.STRIPE_PRICE_TEAM_UPGRADE] = {
      priceId: process.env.STRIPE_PRICE_TEAM_UPGRADE,
      sku: 'team_upgrade',
      creditQty: 0,
      label: 'Solo → Team Upgrade',
      amountCents: 20000,
      requiresWorkshopId: true,
    };
  }
  if (process.env.STRIPE_PRICE_WHITE_GLOVE) {
    configs[process.env.STRIPE_PRICE_WHITE_GLOVE] = {
      priceId: process.env.STRIPE_PRICE_WHITE_GLOVE,
      sku: 'white_glove',
      creditQty: 0,
      label: 'White Glove',
      amountCents: 149900,
      requiresWorkshopId: true,
    };
  }

  // ─── Legacy SKUs (still in env so in-flight checkouts can fulfill) ───────
  // Mapped to sku='solo' so existing webhooks/sessions complete correctly.
  if (process.env.STRIPE_PRICE_SINGLE_FLIGHT) {
    configs[process.env.STRIPE_PRICE_SINGLE_FLIGHT] = {
      priceId: process.env.STRIPE_PRICE_SINGLE_FLIGHT,
      sku: 'solo',
      creditQty: 1,
      label: 'Single Flight Workshop (legacy)',
      amountCents: 9900,
      requiresWorkshopId: false,
    };
  }
  if (process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR) {
    configs[process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR] = {
      priceId: process.env.STRIPE_PRICE_SERIAL_ENTREPRENEUR,
      sku: 'solo',
      creditQty: 3,
      label: 'Serial Entrepreneur Pack (legacy)',
      amountCents: 19900,
      requiresWorkshopId: false,
    };
  }

  return configs;
}

export function getPriceConfig(priceId: string): PriceConfig | null {
  return buildConfigs()[priceId] ?? null;
}

/**
 * Look up the canonical price config for a given SKU. Returns the FIRST match —
 * legacy duplicates (SINGLE_FLIGHT also maps to 'solo') are intentionally
 * defined after the new SKUs so the new ID wins.
 */
export function getPriceConfigBySku(sku: Sku): PriceConfig | null {
  const configs = buildConfigs();
  for (const config of Object.values(configs)) {
    if (config.sku === sku) return config;
  }
  return null;
}

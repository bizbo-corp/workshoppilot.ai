/**
 * Canned "what to measure" options for the Validate signal step.
 *
 * Gives users recognizable signals to pick from instead of a blank text box, grouped by
 * whether they measure what people DO (behaviour) or what they SAY (attitude), and tagged
 * by how strong a proxy each is for genuine adoption. Picking one fills the metric phrase
 * plus smart numeric defaults.
 */

import type { OutputType } from '@/lib/schemas/validation-schemas';

export type ProxyStrength = 'weak' | 'medium' | 'strong';

export interface MetricOption {
  key: string;
  /** Fills the "what are you measuring" phrase. */
  label: string;
  category: 'behaviour' | 'attitude';
  proxyStrength: ProxyStrength;
  metricType: 'count' | 'percent';
  /** Smart defaults applied on pick. */
  sampleSize: number;
  target: number;
  killThreshold: number | null;
}

// Reusable count-based bars (out of a small test group).
const C = (sampleSize: number, target: number, kill: number | null) => ({
  metricType: 'count' as const,
  sampleSize,
  target,
  killThreshold: kill,
});
// Reusable percent-based bars (landing / click-through style).
const P = (sampleSize: number, target: number, kill: number | null) => ({
  metricType: 'percent' as const,
  sampleSize,
  target,
  killThreshold: kill,
});

const LIBRARY: Record<OutputType, MetricOption[]> = {
  app_digital: [
    { key: 'click_into_flow', label: 'users who click into the key flow', category: 'behaviour', proxyStrength: 'weak', ...C(10, 6, 2) },
    { key: 'complete_core_task', label: 'users who complete the core task end-to-end', category: 'behaviour', proxyStrength: 'strong', ...C(10, 7, 3) },
    { key: 'finish_onboarding', label: 'users who finish onboarding', category: 'behaviour', proxyStrength: 'medium', ...C(10, 7, 3) },
    { key: 'reuse_7d', label: 'users who come back and reuse it within 7 days', category: 'behaviour', proxyStrength: 'strong', ...C(10, 5, 2) },
    { key: 'signup', label: 'people who sign up / join the waitlist', category: 'behaviour', proxyStrength: 'medium', ...P(50, 12, 2) },
    { key: 'would_use_weekly', label: 'users who say they would use it regularly', category: 'attitude', proxyStrength: 'medium', ...C(10, 7, 3) },
    { key: 'would_recommend', label: 'users who would recommend it to a peer', category: 'attitude', proxyStrength: 'medium', ...C(10, 7, 3) },
    { key: 'would_pay', label: "users who'd pay for it", category: 'attitude', proxyStrength: 'strong', ...C(10, 5, 2) },
  ],
  physical_product: [
    { key: 'use_mockup', label: 'people who use the mockup the way intended', category: 'behaviour', proxyStrength: 'medium', ...C(10, 7, 3) },
    { key: 'preorder', label: 'people who place a pre-order', category: 'behaviour', proxyStrength: 'strong', ...C(20, 6, 1) },
    { key: 'buy_now_click', label: 'people who click "buy now"', category: 'behaviour', proxyStrength: 'weak', ...P(50, 10, 2) },
    { key: 'would_buy', label: 'people who say they would buy it', category: 'attitude', proxyStrength: 'medium', ...C(10, 7, 3) },
    { key: 'would_pay_price', label: 'people who accept the target price', category: 'attitude', proxyStrength: 'strong', ...C(10, 5, 2) },
  ],
  service: [
    { key: 'complete_service', label: 'users who complete the service experience', category: 'behaviour', proxyStrength: 'strong', ...C(8, 6, 2) },
    { key: 'book_pilot', label: 'people who book a pilot session', category: 'behaviour', proxyStrength: 'medium', ...C(10, 6, 2) },
    { key: 'got_value', label: 'users who got the value they came for', category: 'behaviour', proxyStrength: 'strong', ...C(8, 6, 2) },
    { key: 'would_use_again', label: 'users who would use the service again', category: 'attitude', proxyStrength: 'medium', ...C(8, 6, 2) },
    { key: 'would_pay_service', label: 'users who would pay for it', category: 'attitude', proxyStrength: 'strong', ...C(8, 4, 1) },
  ],
  process_change: [
    { key: 'adopt_as_is', label: 'stakeholders who would adopt it as-is', category: 'attitude', proxyStrength: 'medium', ...C(8, 5, 2) },
    { key: 'complete_dryrun', label: 'people who complete a dry-run without friction', category: 'behaviour', proxyStrength: 'strong', ...C(8, 6, 2) },
    { key: 'prefer_to_current', label: 'people who prefer it to the current way', category: 'attitude', proxyStrength: 'medium', ...C(8, 5, 2) },
    { key: 'champion', label: 'stakeholders willing to champion it', category: 'attitude', proxyStrength: 'strong', ...C(8, 3, 1) },
  ],
  offering: [
    { key: 'request_demo', label: 'target buyers who request a demo', category: 'behaviour', proxyStrength: 'medium', ...P(50, 12, 2) },
    { key: 'sign_loi', label: 'buyers who sign a letter of intent', category: 'behaviour', proxyStrength: 'strong', ...C(15, 4, 1) },
    { key: 'presale', label: 'buyers who pre-pay / pre-order', category: 'behaviour', proxyStrength: 'strong', ...C(15, 3, 1) },
    { key: 'value_prop_resonates', label: 'buyers who say the value prop fits their need', category: 'attitude', proxyStrength: 'medium', ...C(10, 7, 3) },
  ],
};

export function getMetricOptions(outputType: OutputType): MetricOption[] {
  return LIBRARY[outputType] ?? [];
}

export const PROXY_STRENGTH_LABELS: Record<ProxyStrength, string> = {
  weak: 'weaker signal',
  medium: 'solid signal',
  strong: 'strong signal',
};

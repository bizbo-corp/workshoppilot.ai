/**
 * Per-output-type evidence bars: what counts as REAL evidence vs. assertion for each
 * kind of idea. Shared by the honesty read (in-session judgment) and the per-type
 * validation lenses — one definition so the judgment and the test menus agree.
 */

import type { OutputType } from '@/lib/schemas/validation-schemas';

export interface EvidenceBar {
  /** What real evidence looks like for this idea type — concrete and checkable. */
  realEvidence: string;
  /** What weak/assertion-level "evidence" sounds like — to be called out, not credited. */
  weakEvidence: string;
}

export const EVIDENCE_BARS: Record<OutputType, EvidenceBar> = {
  app_digital: {
    realEvidence:
      'people described the problem unprompted, signed up to a waitlist, clicked a fake door, or pre-paid; an existing workaround (spreadsheet, group chat) is in active use',
    weakEvidence:
      '"everyone needs this", download projections, "there is no competitor", or the founder\'s own enthusiasm for the feature list',
  },
  physical_product: {
    realEvidence:
      'pre-orders or deposits, people using a makeshift/DIY version today, retailers or distributors asking for samples, repeat usage of a prototype',
    weakEvidence:
      '"people loved it when I showed them", market-size statistics, or compliments from friends and family who were never asked to pay',
  },
  service: {
    realEvidence:
      'someone booked or paid for a pilot/concierge run, clients currently paying for a worse alternative, referrals arriving without being asked',
    weakEvidence:
      '"clients always complain about X" without a named client who would switch, or interest expressed only when the service was free',
  },
  process_change: {
    realEvidence:
      'a team ran a manual pilot of the new process, measured time/error deltas, a named owner committed to adopt it, frontline staff asked when it ships',
    weakEvidence:
      '"leadership is supportive", "this will obviously save time" with no baseline measurement, or agreement gathered in a meeting nobody dissented in',
  },
  offering: {
    realEvidence:
      'a customer accepted the new price/packaging in a real quote, signed an LOI, or chose it over the old offer when both were presented',
    weakEvidence:
      '"customers said they would pay more", competitor pricing pages, or willingness-to-pay answers from a survey with no money involved',
  },
  experience_design: {
    realEvidence:
      'baseline metrics for the current journey (drop-off, completion, support tickets), users observed struggling at the step being redesigned, an A/B or hallway test of the new flow',
    weakEvidence:
      '"the current page is obviously confusing", internal opinions about the design, or feedback only from people who built it',
  },
  brand_comms: {
    realEvidence:
      'message variants tested with the real audience (clicks, replies, recall), people re-using the new language unprompted, a sales call where the framing landed',
    weakEvidence:
      '"this positioning feels right", internal workshop consensus on the tagline, or applause from colleagues rather than the target audience',
  },
  campaign: {
    realEvidence:
      'a small paid test with measured CTR/CPA, organic engagement on a pilot post, sign-ups attributable to a teaser, a partner committing channel space',
    weakEvidence:
      '"this will go viral", reach projections, or engagement from the team\'s own network rather than the target audience',
  },
};

/** Compact, prompt-ready lines for one or two output types. */
export function evidenceBarLines(types: OutputType[]): string {
  return types
    .map((t) => {
      const bar = EVIDENCE_BARS[t];
      return `- For this kind of idea (${t}): REAL evidence looks like: ${bar.realEvidence}. WEAK (do not credit): ${bar.weakEvidence}.`;
    })
    .join('\n');
}

/**
 * Per-type cheap-test menus: the kinds of tests that fit each idea type. Injected into
 * the signal suggester so a service idea gets concierge-pilot signals, not fake-door
 * click-through rates. ADDITIVE prompt context only — the candidate schema (including
 * proxyStrength) is unchanged.
 */
export const CHEAP_TEST_MENUS: Record<OutputType, string> = {
  app_digital:
    'fake-door landing page with signups, clickable-prototype walkthroughs, waitlist conversions, a concierge (manual-behind-the-scenes) version with a few users',
  physical_product:
    'pre-orders or refundable deposits, hands-on sessions with a rough prototype or mock-up, a sales page with a real buy button, a market-stall / pop-up test',
  service:
    'a paid concierge pilot with 1–3 real clients, a paid discovery session, a signed letter of intent, referrals arriving after a trial run',
  process_change:
    'a one-team manual pilot for a week, before/after timing or error counts on the affected task, shadowing the people doing the work, a named owner committing to adopt',
  offering:
    'putting the new price/packaging in a real quote to live prospects, presenting old vs. new offer side by side, a signed letter of intent at the new terms',
  experience_design:
    'a hallway test of the new flow against the old one, an A/B on the live step with drop-off measured, watching first-time users attempt the redesigned task',
  brand_comms:
    'message A/B tests with the real audience (clicks, replies, recall), a 5-second test on the new framing, reply rates on outbound using the new language',
  campaign:
    'a small paid pilot with measured click-through / cost-per-action, organic engagement on a teaser post, sign-ups attributable to the pilot, a partner committing channel space',
};

/** One prompt-ready line listing the cheap tests that fit these types. */
export function cheapTestMenuLines(types: OutputType[]): string {
  return types
    .map((t) => `- Tests that fit this kind of idea (${t}): ${CHEAP_TEST_MENUS[t]}.`)
    .join('\n');
}

/**
 * Per-type broad-assumption phrasing examples so the proposer's wording matches the
 * idea type instead of defaulting to app language.
 */
export const ASSUMPTION_EXAMPLES: Record<OutputType, string> = {
  app_digital:
    'Speakers will want an app that helps them communicate their ideas effectively to drive action in others.',
  physical_product:
    'Commuting cyclists will want a helmet light that keeps them visible without daily charging.',
  service:
    'Busy clinic owners will pay for a service that takes compliance paperwork off their plate entirely.',
  process_change:
    'Support agents will adopt a handoff process that spares them re-explaining each case.',
  offering:
    'Existing customers will choose a subscription that bundles maintenance into one predictable fee.',
  experience_design:
    'First-time visitors will complete a redesigned signup that gets them to value in one sitting.',
  brand_comms:
    'Prospective clients will respond to messaging that names their problem in their own words.',
  campaign:
    'Local parents will engage with a campaign that makes school-route safety feel urgent and fixable.',
};

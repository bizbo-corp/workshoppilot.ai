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

/**
 * Output-type-tailored validation guidance (Step 10 — Validate).
 *
 * Different kinds of output warrant different validation techniques. This is the SINGLE
 * source of truth for that mapping — consumed by BOTH the in-app Validate step
 * (ValidationGuidanceCard) and the Build Pack markdown (plan-markdown.ts) so the two never
 * drift.
 *
 * Each entry splits guidance into:
 *  - inWorkshop:  what the team can produce and test DURING the session, and
 *  - postWorkshop: what to produce and test AFTERWARDS,
 * plus an optional `qualNote` (the qualitative angle) and a static worked `example`.
 *
 * This is purely advisory content. It does NOT touch step-completion: the Validation step is
 * marked complete as soon as the plan exists ("plan made"); post-workshop tasks never revert it.
 *
 * Output types with no tailored entry return null — callers fall back to the existing generic
 * Validation Plan content. (Every current output type has an entry; the null path is a safety net.)
 */

import type { OutputType } from '@/lib/schemas/validation-schemas';

export interface ValidationGuidance {
  /** One-line headline of the recommended toolkit. */
  approach: string;
  /** What the team can produce and test during the workshop session. */
  inWorkshop: string[];
  /** What to produce and test after the workshop. */
  postWorkshop: string[];
  /** The qualitative angle — when a number alone won't tell the whole story. */
  qualNote?: string;
  /** A concrete, generic worked example of running the test (rendered as "Worked example: …"). */
  example?: string;
}

/**
 * Several output types share a toolkit, so the source content lives once per "bucket". Note
 * `brand_comms` has its OWN bucket (a message-resonance path, NOT the journey-map + prototype
 * path used by digital apps), and `experience_design` reuses the digital toolkit by design.
 */
type GuidanceBucket = 'digital' | 'brand' | 'physical' | 'service' | 'campaign' | 'offering';

const OUTPUT_TYPE_BUCKET: Record<OutputType, GuidanceBucket> = {
  app_digital: 'digital',
  experience_design: 'digital',
  brand_comms: 'brand',
  physical_product: 'physical',
  service: 'service',
  process_change: 'service',
  campaign: 'campaign',
  offering: 'offering',
};

const GUIDANCE: Record<GuidanceBucket, ValidationGuidance> = {
  digital: {
    approach: 'A UX journey map and/or an interactive (clickable) prototype',
    inWorkshop: [
      'Sketch the journey map for the core flow.',
      'Build a low-fidelity prototype of that flow to react to.',
    ],
    postWorkshop: [
      'Build a higher-fidelity, clickable prototype (e.g. Figma-fidelity).',
      'Run usability tests with target users against the mapped journey.',
    ],
    qualNote:
      'Pair the quantitative completion/conversion number with a qualitative read of what users say as they move through the flow.',
  },
  brand: {
    approach:
      'A simple conceptual page / contextual mockup, tested for message & positioning resonance (no journey map needed)',
    inWorkshop: [
      'Build a simple contextual mockup of the message / positioning — a one-page concept.',
      'Do a quick resonance check with a few people from the target audience.',
    ],
    postWorkshop: [
      'Produce a higher-fidelity prototype or image of the message.',
      'Run a message / positioning resonance test with the target audience.',
    ],
    qualNote:
      'Resonance is mostly qualitative — capture whether the message lands and what it makes people think or feel, not just a click-rate.',
  },
  physical: {
    approach:
      'A model scaled to the product’s fidelity (paper/cardboard concept → functional mock-up), plus a focus-group reaction',
    inWorkshop: [
      'Build the simplest representative model — a conceptual object, or a half-working prototype if complexity allows.',
      'Show it to a small focus group for hands-on reactions.',
    ],
    postWorkshop: [
      'Produce a higher-fidelity model or working sample.',
      'Run a pre-order / “buy now” test for demand AND a focus group for usability, ergonomics, and desirability.',
    ],
    qualNote:
      'Combine the quantitative pre-order signal with qualitative focus-group reactions to the form and feel.',
  },
  service: {
    approach:
      'A storyboard of the end-to-end journey plus a role-play / staged walkthrough (or a concierge test)',
    inWorkshop: [
      'Storyboard the end-to-end service or process.',
      'Run a quick role-play / staged walkthrough with the team.',
    ],
    postWorkshop: [
      'Run a concierge / staged test or pilot with real participants.',
      'Capture both how many would sign up (quantitative) and the quality of their experience (qualitative).',
    ],
    qualNote:
      'Measure both the number who would sign up and a qualitative read on the experience quality of those who went through it.',
  },
  campaign: {
    approach: 'A creative concept test and/or a landing-page / sign-up test',
    inWorkshop: [
      'List the riskiest assumptions: audience, message, channel, and response.',
      'Mock the creative concept and define how each assumption would be tested.',
    ],
    postWorkshop: [
      'Run a creative concept test (does the idea land?) and a small landing-page / sign-up test (click / sign-up rate).',
      'Use the results to confirm the key assumptions before a full launch.',
    ],
    qualNote:
      'Read both the quantitative response (sign-ups, click rate) and the qualitative resonance of the creative concept.',
  },
  offering: {
    approach:
      'A landing-page / value-proposition test, or a pre-sale / letter of intent for stronger proof',
    inWorkshop: [
      'Draft the value proposition and the offer in plain terms.',
      'Sketch a one-page landing / value-prop page for it.',
    ],
    postWorkshop: [
      'Put the landing page in front of target buyers and measure interest (sign-ups, clicks, replies).',
      'For stronger proof, seek a pre-sale or a signed letter of intent.',
    ],
    qualNote:
      'Pair the quantitative interest signal with a short follow-up conversation on why buyers would — or would not — commit.',
    example:
      'If your offer is “£X/mo analytics for indie shops”, stand up a one-page site stating the price with a “Request early access” button, send it to ~20 target buyers, count the requests, then call a few to hear why they did or didn’t.',
  },
};

/**
 * Tailored validation guidance for an output type, or null if there is no tailored entry
 * (caller should fall back to the generic Validation Plan content).
 */
export function getValidationGuidance(outputType: OutputType): ValidationGuidance | null {
  const bucket = OUTPUT_TYPE_BUCKET[outputType];
  return bucket ? GUIDANCE[bucket] : null;
}

/**
 * Artifact recommendation lookup (Step 10 — Validate)
 *
 * The ONLY place output type branches. Recommend the cheapest artifact that tests the
 * chosen assumption under the chosen lens. Adding a new output type = a new table entry +
 * an artifact component — NO state-machine changes.
 *
 * Entries are ordered cheapest-valid-first: index 0 is the primary recommendation,
 * index 1 (if present) is the fallback.
 */

import type { Lens, OutputType } from '@/lib/schemas/validation-schemas';

export interface ArtifactOption {
  /** Stable key persisted on the plan (ValidationPlan.artifactType). */
  key: string;
  label: string;
  /** One-line "why this is the cheapest valid test". */
  description: string;
  /** Short cost/effort hint for display. */
  costHint: string;
  /** app_digital desirability: surfaces the reused Journey Map + V0 prototype flow. */
  revealsPrototype?: boolean;
  /** process_change desirability: generates the printable Concept Card. */
  generatesConceptCard?: boolean;
}

type LookupTable = Record<OutputType, Record<Lens, ArtifactOption[]>>;

export const ARTIFACT_LOOKUP: LookupTable = {
  app_digital: {
    desirability: [
      {
        key: 'clickable_prototype',
        label: 'Clickable prototype',
        description: 'Put a tappable mock in front of users — tests intent without building the real thing.',
        costHint: 'Low–medium',
        revealsPrototype: true,
      },
      {
        key: 'fake_door_smoke_test',
        label: 'Fake-door / landing-page smoke test',
        description: 'A landing page or "coming soon" button measures real click-through demand for near-zero cost.',
        costHint: 'Low',
      },
    ],
    feasibility: [
      {
        key: 'technical_spike',
        label: 'Technical spike / expert review',
        description: 'A timeboxed build of the riskiest technical piece, or an expert review, before committing.',
        costHint: 'Medium',
      },
    ],
    viability: [
      {
        key: 'pricing_test',
        label: 'Pricing test / pre-sign-up with intent',
        description: 'Ask for a price commitment or pre-sign-up to test willingness to pay before launch.',
        costHint: 'Low',
      },
    ],
  },
  physical_product: {
    desirability: [
      {
        key: 'physical_mockup',
        label: 'Paper or 3D mockup',
        description: 'A cheap physical stand-in lets people react to the form before tooling exists.',
        costHint: 'Low–medium',
      },
      {
        key: 'wizard_of_oz',
        label: 'Wizard-of-Oz demo',
        description: 'Fake the product behind the scenes so users get the experience without the build.',
        costHint: 'Medium',
      },
    ],
    feasibility: [
      {
        key: 'manufacturing_check',
        label: 'Materials / manufacturing feasibility check',
        description: 'Confirm the thing can actually be made at quality and cost before investing.',
        costHint: 'Medium',
      },
    ],
    viability: [
      {
        key: 'preorder_test',
        label: 'Pre-order / "buy now" test',
        description: 'A pre-order or buy-now flow proves people will actually pay, not just say they like it.',
        costHint: 'Low',
      },
    ],
  },
  service: {
    desirability: [
      {
        key: 'roleplay_walkthrough',
        label: 'Roleplay / staged walkthrough',
        description: 'Act out the service with a real person to see if the experience lands.',
        costHint: 'Low',
      },
      {
        key: 'concierge_test',
        label: 'Concierge test',
        description: 'Deliver the service manually for a few users — full experience, no infrastructure.',
        costHint: 'Medium',
      },
    ],
    feasibility: [
      {
        key: 'service_blueprint_dryrun',
        label: 'Service blueprint dry-run with real staff',
        description: 'Run the service end-to-end with the actual people who would deliver it.',
        costHint: 'Medium',
      },
    ],
    viability: [
      {
        key: 'paid_pilot',
        label: 'Willingness-to-pay / paid pilot',
        description: 'Charge for a small pilot to confirm the service is worth paying for.',
        costHint: 'Medium',
      },
    ],
  },
  process_change: {
    desirability: [
      {
        key: 'concept_card_reinterview',
        label: 'Re-interview stakeholders with a concept card',
        description: 'Show affected people a one-page concept and ask if they would adopt it as-is.',
        costHint: 'Low',
        generatesConceptCard: true,
      },
      {
        key: 'dry_run_simulation',
        label: 'Dry-run simulation',
        description: 'Walk through the new process on paper with the team to surface friction early.',
        costHint: 'Low',
      },
    ],
    feasibility: [
      {
        key: 'team_pilot',
        label: 'Pilot in one team/unit',
        description: 'Run the change in a single team before rolling it out org-wide.',
        costHint: 'Medium',
      },
    ],
    viability: [
      {
        key: 'cost_benefit_signoff',
        label: 'Cost/benefit + sponsor sign-off',
        description: 'A simple cost/benefit case and a sponsor commitment confirm it is worth doing.',
        costHint: 'Low',
      },
    ],
  },
  offering: {
    desirability: [
      {
        key: 'landing_value_prop',
        label: 'Landing page / value-prop test',
        description: 'A landing page tests whether the value proposition resonates with the target buyer.',
        costHint: 'Low',
      },
    ],
    feasibility: [
      {
        key: 'capacity_check',
        label: 'Operational capacity check',
        description: 'Confirm you can actually deliver the offer at the volume you would promise.',
        costHint: 'Medium',
      },
    ],
    viability: [
      {
        key: 'presale_loi',
        label: 'Pre-sale / letter of intent / signed pilot',
        description: 'A pre-sale or signed letter of intent is the strongest proof someone will buy.',
        costHint: 'Medium',
      },
    ],
  },
  experience_design: {
    desirability: [
      {
        key: 'usability_test',
        label: 'Usability test on a redesign prototype',
        description: 'Watch real users attempt the task on a prototype of the redesign.',
        costHint: 'Low–medium',
        revealsPrototype: true,
      },
      {
        key: 'ab_first_click',
        label: 'A/B or first-click test vs. the current design',
        description: 'Compare the redesign against the current version on a key task.',
        costHint: 'Low',
      },
    ],
    feasibility: [
      {
        key: 'design_build_spike',
        label: 'Design + build spike',
        description: 'Prototype the riskiest part of the redesign in code to confirm it is buildable.',
        costHint: 'Medium',
      },
    ],
    viability: [
      {
        key: 'completion_rate_test',
        label: 'Completion / conversion-rate test',
        description: 'Measure whether the redesign lifts task completion or conversion.',
        costHint: 'Low',
      },
    ],
  },
  brand_comms: {
    desirability: [
      {
        key: 'message_resonance_test',
        label: 'Message / positioning resonance test',
        description: 'Show alternative messages or positioning to target users and measure which resonates.',
        costHint: 'Low',
      },
      {
        key: 'five_second_test',
        label: '5-second test',
        description: 'Flash the messaging for five seconds and ask what it conveyed.',
        costHint: 'Low',
      },
    ],
    feasibility: [
      {
        key: 'brand_content_review',
        label: 'Brand / content expert review',
        description: 'Have a brand or content expert check it is ownable, clear, and deliverable.',
        costHint: 'Low',
      },
    ],
    viability: [
      {
        key: 'response_premium_test',
        label: 'Response / premium-intent test',
        description: 'Measure response, engagement, or willingness to pay vs. the current messaging.',
        costHint: 'Medium',
      },
    ],
  },
  campaign: {
    desirability: [
      {
        key: 'creative_concept_test',
        label: 'Creative concept test',
        description: 'Show the campaign concept to the target audience and gauge their response.',
        costHint: 'Low',
      },
      {
        key: 'landing_signup_test',
        label: 'Landing page / sign-up test',
        description: 'Run a small landing page or sign-up to gauge interest before launching.',
        costHint: 'Low',
      },
    ],
    feasibility: [
      {
        key: 'channel_reach_dryrun',
        label: 'Channel / reach dry-run',
        description: 'Confirm you can actually reach the audience on the chosen channels at the needed scale.',
        costHint: 'Medium',
      },
    ],
    viability: [
      {
        key: 'cost_per_action_test',
        label: 'Cost-per-action test',
        description: 'Run a small paid test to see whether the cost per sign-up/action is sustainable.',
        costHint: 'Medium',
      },
    ],
  },
};

/** Cheapest-valid-first list of artifacts for an output type + lens. */
export function getArtifacts(outputType: OutputType, lens: Lens): ArtifactOption[] {
  return ARTIFACT_LOOKUP[outputType]?.[lens] ?? [];
}

/** Look up a single artifact option by its key (across all types/lenses). */
export function findArtifactByKey(key: string): ArtifactOption | undefined {
  for (const byLens of Object.values(ARTIFACT_LOOKUP)) {
    for (const options of Object.values(byLens)) {
      const match = options.find((o) => o.key === key);
      if (match) return match;
    }
  }
  return undefined;
}

export const OUTPUT_TYPE_LABELS: Record<OutputType, string> = {
  app_digital: 'App / Digital',
  physical_product: 'Physical product',
  service: 'Service',
  process_change: 'Process change',
  offering: 'Business offering',
  experience_design: 'Experience design',
  brand_comms: 'Brand & communication',
  campaign: 'Campaign',
};

/**
 * Natural-language nouns for weaving the output type into a sentence (assumption generation),
 * as opposed to OUTPUT_TYPE_LABELS which are UI chips. "App / Digital" reads badly in prose
 * ("a App / Digital"); "app" reads naturally ("an app that helps them …").
 */
export const OUTPUT_TYPE_NOUNS: Record<OutputType, string> = {
  app_digital: 'app',
  physical_product: 'physical product',
  service: 'service',
  process_change: 'new process',
  offering: 'offer',
  experience_design: 'redesign',
  brand_comms: 'brand and messaging',
  campaign: 'campaign',
};

export const OUTPUT_TYPE_DESCRIPTIONS: Record<OutputType, string> = {
  app_digital: 'An app, web tool, software feature, or digital service.',
  physical_product: 'A physical object or piece of hardware.',
  service: 'A human-delivered or staged experience.',
  process_change: 'An internal workflow, org, or policy change.',
  offering: 'A business model, pricing, or go-to-market offer.',
  experience_design: 'Reworking an existing journey, flow, or page — e.g. a website or form redesign.',
  brand_comms: 'How the thing is named, framed, messaged, and positioned — branding, messaging, and content.',
  campaign: 'A time-bound marketing, awareness, or advocacy campaign to shift behaviour or perception.',
};

export const LENS_LABELS: Record<Lens, string> = {
  desirability: 'Desirability',
  feasibility: 'Feasibility',
  viability: 'Viability',
};

export const LENS_DESCRIPTIONS: Record<Lens, string> = {
  desirability: 'Do people actually want this? Cheapest to test, and the most common reason ideas die.',
  feasibility: 'Can we realistically build or deliver it?',
  viability: 'Does it make sense as a business — will someone pay?',
};

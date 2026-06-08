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
};

export const OUTPUT_TYPE_DESCRIPTIONS: Record<OutputType, string> = {
  app_digital: 'An app, web tool, software feature, or digital service.',
  physical_product: 'A physical object or piece of hardware.',
  service: 'A human-delivered or staged experience.',
  process_change: 'An internal workflow, org, or policy change.',
  offering: 'A business model, pricing, or go-to-market offer.',
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

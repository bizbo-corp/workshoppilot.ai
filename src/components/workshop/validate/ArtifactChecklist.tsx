'use client';

import { CheckCircle2 } from 'lucide-react';
import type { ValidationPlan } from '@/lib/schemas';

/** Static how-to steps per artifact key for non-app, non-concept-card tests. */
const CHECKLISTS: Record<string, string[]> = {
  fake_door_smoke_test: [
    'Put up a simple landing page describing the value, with a clear call-to-action.',
    'Drive a small amount of traffic to it (e.g. share with your target audience).',
    'Measure how many people click the call-to-action vs. how many visited.',
  ],
  pricing_test: [
    'Add a price (or pre-sign-up with intent) to your landing page.',
    'Send it to people who match your target user.',
    'Count how many commit at the asking price.',
  ],
  physical_mockup: [
    'Build a cheap paper or 3D stand-in of the product.',
    'Show it to target users and ask them to react / use it.',
    'Note how many respond the way your assumption predicts.',
  ],
  wizard_of_oz: [
    'Manually deliver the product experience behind the scenes.',
    'Let a few real users try it without knowing it is manual.',
    'Measure whether they get the value you expect.',
  ],
  manufacturing_check: [
    'List the materials and steps needed to make the product.',
    'Get a quote or expert opinion on cost and quality.',
    'Confirm it can be made within your constraints.',
  ],
  preorder_test: [
    'Set up a pre-order or "buy now" flow.',
    'Promote it to your target audience.',
    'Count how many actually place a pre-order.',
  ],
  roleplay_walkthrough: [
    'Script the service experience end to end.',
    'Act it out with a real person playing the customer.',
    'Note where the experience lands or breaks.',
  ],
  concierge_test: [
    'Deliver the service manually for a handful of real users.',
    'Observe their reactions and outcomes.',
    'Measure whether they get the value your assumption predicts.',
  ],
  service_blueprint_dryrun: [
    'Map the service blueprint with the staff who would deliver it.',
    'Run a full dry-run with real staff.',
    'Identify whether it can be delivered as designed.',
  ],
  paid_pilot: [
    'Offer a small paid pilot to a few willing customers.',
    'Run the pilot and collect payment.',
    'Confirm they find it worth paying for.',
  ],
  dry_run_simulation: [
    'Walk the new process through on paper with the team.',
    'Simulate a typical case end to end.',
    'Surface friction and whether people would adopt it.',
  ],
  team_pilot: [
    'Run the change in a single team or unit.',
    'Track the outcome over a set period.',
    'Decide whether to roll out more widely.',
  ],
  cost_benefit_signoff: [
    'Write a short cost/benefit case for the change.',
    'Review it with the sponsor.',
    'Get an explicit sign-off (or not).',
  ],
  landing_value_prop: [
    'Build a landing page that states the value proposition.',
    'Send it to your target buyers.',
    'Measure interest (sign-ups, clicks, replies).',
  ],
  capacity_check: [
    'Estimate the volume you would need to deliver.',
    'Check your operational capacity against it.',
    'Confirm you can deliver what you would promise.',
  ],
  presale_loi: [
    'Approach target buyers with the offer.',
    'Ask for a pre-sale, letter of intent, or signed pilot.',
    'Count how many commit.',
  ],
  technical_spike: [
    'Identify the riskiest technical unknown.',
    'Timebox a small build or expert review of it.',
    'Confirm whether it is feasible within your constraints.',
  ],
};

export function ArtifactChecklist({ plan }: { plan: ValidationPlan }) {
  const steps = CHECKLISTS[plan.artifactType] ?? [
    'Plan how you will run this test.',
    'Run it with your target people.',
    'Measure the result against your committed signal.',
  ];

  return (
    <div className="rounded-xl border bg-card p-5">
      <h4 className="text-sm font-semibold">{plan.artifactLabel}</h4>
      <p className="mt-1 text-sm text-muted-foreground">How to run this test:</p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

'use client';

import { Icon } from '@/components/ui/icon';
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
  clickable_prototype: [
    'Build a tappable mock of the core flow (low fidelity is fine).',
    'Put it in front of target users and ask them to complete the key task.',
    'Watch where they succeed, hesitate, or drop off.',
  ],
  // Experience design
  usability_test: [
    'Prototype the redesigned flow at enough fidelity to attempt the task.',
    'Watch real users try the key task on it, thinking aloud.',
    'Note completion, friction points, and what they say.',
  ],
  ab_first_click: [
    'Put the redesign next to the current version on the key task.',
    'Ask target users which they’d click first, or run a first-click test.',
    'Compare results to see if the redesign wins.',
  ],
  design_build_spike: [
    'Pick the riskiest part of the redesign to build.',
    'Prototype it in code to confirm it’s buildable.',
    'Confirm it works within your technical constraints.',
  ],
  completion_rate_test: [
    'Define the task whose completion/conversion you want to lift.',
    'Run the redesign with enough users to measure the rate.',
    'Compare the completion/conversion rate against the current design.',
  ],
  // Brand & communication
  message_resonance_test: [
    'Make a simple contextual mockup of the message / positioning.',
    'Show it (or a couple of variants) to people in the target audience.',
    'Capture which message resonates and what it makes them think or feel.',
  ],
  five_second_test: [
    'Flash the messaging in front of a target-audience person for five seconds.',
    'Ask what it conveyed and what they’d expect next.',
    'Note whether the intended message landed.',
  ],
  brand_content_review: [
    'Brief a brand or content expert on the goal and audience.',
    'Have them review the naming / messaging for clarity and ownability.',
    'Confirm it’s deliverable and distinct before investing.',
  ],
  response_premium_test: [
    'Set up the new messaging against the current version.',
    'Measure response, engagement, or willingness to pay.',
    'See whether the new framing lifts the result.',
  ],
  // Campaign
  creative_concept_test: [
    'Mock up the campaign concept (key visual + message).',
    'Show it to the target audience and gauge their reaction.',
    'Capture whether the idea lands and what it prompts them to do.',
  ],
  landing_signup_test: [
    'Stand up a small landing page or sign-up form for the campaign.',
    'Drive a little target traffic to it.',
    'Measure the sign-up / click-through rate against your bar.',
  ],
  channel_reach_dryrun: [
    'Pick the channels you’d run the campaign on.',
    'Do a small dry-run to confirm you can reach the audience at the needed scale.',
    'Check the reach and cost are realistic.',
  ],
  cost_per_action_test: [
    'Run a small paid test on the chosen channel.',
    'Measure the cost per sign-up / target action.',
    'Confirm it’s sustainable before scaling spend.',
  ],
  // Process change
  concept_card_reinterview: [
    'Put the one-page concept in front of the affected stakeholders.',
    'Ask whether they’d adopt it as-is, and what would block them.',
    'Count how many would adopt it without changes.',
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
      <h4 className="text-base font-semibold">{plan.artifactLabel}</h4>
      <p className="mt-1 text-base text-foreground/70">How to run this test:</p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-base">
            <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Validation Plan Schemas (Step 10 — Validate)
 *
 * The Validate step is a UI-driven validation-planning flow. It does NOT validate
 * "the thing" — it validates an assumption about a human need. The output type only
 * changes the artifact the user puts in front of people and the signal they measure.
 *
 * These schemas back the ValidationPlan stored inside the `validate` step artifact
 * (alongside the optional synthesis fields — see validateArtifactSchema).
 */

import { z } from 'zod';

/**
 * The kind of thing the workshop produced. Drives the artifact lookup (which cheapest-valid
 * test to recommend) and the digital-path gate: `app_digital` and `experience_design` (the
 * 'digital' guidance bucket — see output-type-guidance.ts isDigitalOutputType) route to
 * Journey Flow + the low-fi prototype builder; all other types get off-platform validation
 * alternatives.
 */
export const outputTypeSchema = z.enum([
  'app_digital', // app, web tool, software feature, digital service
  'physical_product', // a physical object / hardware
  'service', // human-delivered or staged experience
  'process_change', // internal workflow / org / policy change
  'offering', // business model / pricing / go-to-market offer
  'experience_design', // reworking an existing journey / flow / page (e.g. website or form redesign)
  'brand_comms', // how the thing is named, framed, messaged, and positioned
  'campaign', // a time-bound marketing / awareness / advocacy campaign
]);
export type OutputType = z.infer<typeof outputTypeSchema>;

/** Desirability → Feasibility → Viability lenses. Desirability is the default first pass. */
export const lensSchema = z.enum(['desirability', 'feasibility', 'viability']);
export type Lens = z.infer<typeof lensSchema>;

/** Outcome of scoring a recorded result against the pre-committed signal. */
export const verdictSchema = z.enum([
  'validated',
  'promising',
  'inconclusive',
  'invalidated',
]);
export type Verdict = z.infer<typeof verdictSchema>;

/** Tracks the furthest-completed UI section so the flow is resumable. */
export const progressStepSchema = z.enum([
  'detect',
  'assumption',
  'lens',
  'artifact',
  'signal',
  'complete',
]);
export type ProgressStep = z.infer<typeof progressStepSchema>;

/**
 * Output-type classification produced once at the Validate step from upstream artifacts.
 *
 * `signal` is an optional accumulator left empty in v1. When upstream stages later emit
 * per-stage type hints, a resolver can merge `perStage` votes into `scores` and pick the
 * argmax here — no schema migration, no change to ValidationPlan (it stores the resolved type).
 */
export const outputTypeClassificationSchema = z.object({
  type: outputTypeSchema,
  confidence: z.number().min(0).max(1).describe('Classifier confidence 0–1'),
  rationale: z.string().describe('Short plain-language reason for the detected type'),
  source: z
    .enum(['llm', 'user_override'])
    .default('llm')
    .describe('Whether the type came from the classifier or a user override'),
  classifiedAt: z.string().describe('ISO timestamp'),
  // Future cross-stage accumulation — unused in v1.
  signal: z
    .object({
      perStage: z.record(z.string(), outputTypeSchema),
      scores: z.record(outputTypeSchema, z.number()),
    })
    .optional(),
});
export type OutputTypeClassification = z.infer<typeof outputTypeClassificationSchema>;

/** Pre-committed, measurable pass/fail target — defined BEFORE the test is run. */
export const signalSchema = z.object({
  metric: z.string().describe('What is measured, e.g. "Stakeholders would adopt as-is"'),
  metricType: z
    .enum(['count', 'percent', 'ratio', 'binary', 'qualitative'])
    .describe(
      'Shape of the metric. count/percent/ratio/binary are scored numerically; "qualitative" has no numeric target — the verdict is judged from observed themes/notes.'
    ),
  target: z
    .number()
    .optional()
    .describe('Numeric pass threshold (e.g. 5 of 8, or 60 for 60%). Omitted for qualitative metrics.'),
  unit: z.string().optional().describe('Optional unit label for display'),
  sampleSize: z.number().int().min(1).describe('How many people/observations'),
  killThreshold: z
    .number()
    .nullable()
    .describe('At or below this value = pivot/kill. Null if not set.'),
  by: z.string().optional().describe('Optional deadline'),
  successCriteriaText: z.string().optional().describe('Plain-language "what would prove you right"'),
  failCriteriaText: z.string().optional().describe('Plain-language "what would tell you you are wrong"'),
  allowQualitative: z
    .boolean()
    .optional()
    .describe('Hybrid: a numeric signal that ALSO invites qualitative observations when recording.'),
});
export type Signal = z.infer<typeof signalSchema>;

/** Qualitative observations recorded against a qualitative or hybrid signal. */
export const qualitativeResultSchema = z.object({
  themes: z.array(z.string()).default([]).describe('Recurring themes / reactions observed'),
  summary: z.string().optional().describe('Free-text synthesis of what was observed'),
});
export type QualitativeResult = z.infer<typeof qualitativeResultSchema>;

/** Real-world outcome recorded after the test runs, with computed score + verdict. */
export const validationResultSchema = z.object({
  actual: z
    .number()
    .optional()
    .describe('Actual measured value (quantitative/hybrid). Omitted for qualitative-only results.'),
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe('0–100 achievement. Numeric for quant/hybrid; verdict-derived for qualitative.'),
  qualitative: qualitativeResultSchema
    .optional()
    .describe('Observed themes / synthesis (qualitative or hybrid results)'),
  verdict: verdictSchema,
  recordedAt: z.string().describe('ISO timestamp'),
  notes: z.string().optional(),
});
export type ValidationResult = z.infer<typeof validationResultSchema>;

/** One dimension of the in-session honesty read. */
export const honestyDimensionSchema = z.object({
  dimension: z
    .enum(['problem', 'audience', 'edge', 'evidence', 'cost_to_test'])
    .describe('Which universal dimension this read covers'),
  strength: z
    .enum(['solid', 'thin', 'missing'])
    .describe('Solid only when backed by evidence actually given during the workshop'),
  read: z.string().describe('1–2 direct sentences in the facilitator voice'),
  sources: z
    .array(z.string())
    .default([])
    .describe('Workshop step names the read is anchored to (empty when nothing supports it)'),
  nextTest: z
    .string()
    .optional()
    .describe('Cheapest next experiment that would firm this up — required when thin/missing'),
});
export type HonestyDimension = z.infer<typeof honestyDimensionSchema>;

/**
 * The in-session honesty read: an evidence-anchored qualitative judgment of the idea's
 * current strength. Deliberately has NO number — the Validation Score stays post-test.
 */
export const honestyReadSchema = z.object({
  dimensions: z.array(honestyDimensionSchema).min(3).max(5),
  verdictLine: z
    .string()
    .describe('The headline honest read — allowed to say "not worth building yet"'),
  generatedAt: z.string().describe('ISO timestamp'),
});
export type HonestyRead = z.infer<typeof honestyReadSchema>;

/** A complete validation plan for a single concept. A workshop may have several. */
export const validationPlanSchema = z.object({
  id: z.string().describe('Prefixed id (vpl_*)'),
  conceptName: z.string().describe('Which concept this plan validates'),
  conceptRef: z
    .string()
    .optional()
    .describe('ideaSource of the concept in the concept artifact, if known'),
  outputType: outputTypeSchema.describe('Primary resolved output type (drives the recommended test)'),
  outputTypes: z
    .array(outputTypeSchema)
    .min(1)
    .max(2)
    .optional()
    .describe('Up to two output types (primary first); the concept may combine two'),
  assumption: z.string().describe('The riskiest assumption, as a falsifiable belief'),
  assumptionAlternatives: z
    .array(z.string())
    .default([])
    .describe('Alternative assumptions offered for "suggest another"'),
  lens: lensSchema,
  artifactType: z.string().describe('Chosen artifact key from the lookup table'),
  artifactLabel: z.string().describe('Human label for the chosen artifact'),
  signal: signalSchema.nullable().describe('Pre-committed signal; null until defined'),
  result: validationResultSchema.nullable().describe('Filled later in RECORD_RESULTS'),
  tailoredExample: z
    .string()
    .optional()
    .describe('One-line LLM-tailored "for your solution, e.g. …" example, generated when the plan is assembled'),
  honestyRead: honestyReadSchema
    .nullable()
    .optional()
    .describe('In-session evidence-anchored read of the idea, generated when the plan is assembled'),
  acknowledgedAt: z
    .string()
    .optional()
    .describe('ISO timestamp when the user clicked Done on this assembled plan (per-test wrap-up)'),
  resultReminderSentAt: z
    .string()
    .optional()
    .describe('ISO timestamp when the "log your results" follow-up email was sent (sent once)'),
  progressStep: progressStepSchema.describe('Furthest-completed section (resumability)'),
  createdAt: z.string().describe('ISO timestamp'),
  updatedAt: z.string().describe('ISO timestamp'),
});
export type ValidationPlan = z.infer<typeof validationPlanSchema>;

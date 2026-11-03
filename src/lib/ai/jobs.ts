/**
 * The job registry: the one place that says which model does which job,
 * what it costs us and what we charge for it.
 *
 * Nothing else in the app names a model. Code asks for a job
 * ('facilitate', 'verdict', 'clean_sketch'); the gateway resolves it here.
 * Swapping a model is an edit to this file, or an env override
 * (AI_MODEL_<JOB>=provider/model), never a code change.
 *
 * Model ids are Vercel AI Gateway ids: `provider/model`.
 */

export const AI_JOBS = [
  'facilitate', // the facilitator's chat turn, every message
  'should_speak', // yes/no: is a reply worth sending after canvas activity
  'summarise_stage', // end-of-stage summary that feeds later stages
  'extract', // structured extraction into a Zod schema
  'interview', // synthetic user interviews in Discover
  'classify_idea', // guess the idea type at Setup
  'summary_report', // free one-page summary
  'verdict', // paid honesty read, assumption, test, score
  'build_pack', // paid PRD / tech specs / brief for the idea type
  'clean_sketch', // paid image clean-up of an uploaded drawing
  'persona_image', // persona or concept illustration
  'test_scenario', // random dummy workshop generator
  'test_user', // simulated user in a dummy workshop
  'eval_judge', // scores AI replies for relevance and tone
] as const;
export type AiJob = (typeof AI_JOBS)[number];

export interface JobConfig {
  /** Gateway model id. */
  model: string;
  /** What we charge the user, in credits. 0 means free tier. */
  credits: number;
  /** Rough reasoning effort hint for models that support it. */
  effort?: 'low' | 'medium' | 'high';
  /** Upper bound for output tokens. */
  maxOutputTokens: number;
  /** Image jobs bill per image rather than per token. */
  kind: 'text' | 'image';
}

const DEFAULTS: Record<AiJob, JobConfig> = {
  // Haiku 5.5 costs the same as Flash Lite per token and follows tool rules far better (measured 2026-11-03).
  facilitate: { model: 'anthropic/claude-haiku-5-5', credits: 0, maxOutputTokens: 600, kind: 'text' },
  should_speak: { model: 'google/gemini-2.5-flash-lite', credits: 0, maxOutputTokens: 20, kind: 'text' },
  summarise_stage: { model: 'google/gemini-2.5-flash-lite', credits: 0, maxOutputTokens: 800, kind: 'text' },
  extract: { model: 'google/gemini-2.5-flash-lite', credits: 0, maxOutputTokens: 2000, kind: 'text' },
  interview: { model: 'google/gemini-2.5-flash', credits: 0, maxOutputTokens: 900, kind: 'text' },
  classify_idea: { model: 'google/gemini-2.5-flash-lite', credits: 0, maxOutputTokens: 200, kind: 'text' },
  summary_report: { model: 'google/gemini-2.5-flash', credits: 0, maxOutputTokens: 4000, kind: 'text' },
  verdict: { model: 'anthropic/claude-opus-5-5', credits: 400, effort: 'high', maxOutputTokens: 6000, kind: 'text' },
  build_pack: { model: 'anthropic/claude-opus-5-5', credits: 0, effort: 'medium', maxOutputTokens: 12000, kind: 'text' },
  clean_sketch: { model: 'google/gemini-3.1-flash-image', credits: 10, maxOutputTokens: 0, kind: 'image' },
  persona_image: { model: 'google/gemini-3.1-flash-image', credits: 0, maxOutputTokens: 0, kind: 'image' },
  // Sonnet thinks before it answers and the reasoning counts against the output budget, so these are generous.
  test_scenario: { model: 'anthropic/claude-sonnet-5-5', credits: 0, maxOutputTokens: 4000, kind: 'text' },
  test_user: { model: 'anthropic/claude-sonnet-5-5', credits: 0, maxOutputTokens: 2500, kind: 'text' },
  eval_judge: { model: 'anthropic/claude-sonnet-5-5', credits: 0, maxOutputTokens: 2500, kind: 'text' },
};

/**
 * Prices in US dollars per million tokens (or per image). Checked monthly;
 * the admin margin view reads the actual spend from ai_calls, so a stale
 * number here only mis-estimates, it never mis-charges.
 */
export interface ModelPrice {
  inputPerM?: number;
  cachedInputPerM?: number;
  outputPerM?: number;
  perImage?: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  'google/gemini-2.5-flash-lite': { inputPerM: 0.1, cachedInputPerM: 0.025, outputPerM: 0.4 },
  'google/gemini-2.5-flash': { inputPerM: 0.3, cachedInputPerM: 0.075, outputPerM: 2.5 },
  'google/gemini-3.1-flash-image': { perImage: 0.039 },
  'anthropic/claude-opus-5-5': { inputPerM: 4, cachedInputPerM: 0.2, outputPerM: 20 },
  'anthropic/claude-sonnet-5-5': { inputPerM: 2, cachedInputPerM: 0.2, outputPerM: 10 },
  'anthropic/claude-haiku-5-5': { inputPerM: 0.1, cachedInputPerM: 0.01, outputPerM: 0.5 },
};

/** Resolve a job's config, honouring AI_MODEL_<JOB> env overrides. */
export function getJobConfig(job: AiJob): JobConfig {
  const base = DEFAULTS[job];
  const override = process.env[`AI_MODEL_${job.toUpperCase()}`];
  return override ? { ...base, model: override } : base;
}

export interface Usage {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
}

/** Cost in US cents for a call, from the price table. Unknown models cost 0 and are flagged in logs. */
export function estimateCostCents(model: string, usage: Usage): number {
  const price = MODEL_PRICES[model];
  if (!price) return 0;
  const cached = usage.cachedInputTokens ?? 0;
  const uncached = Math.max(0, (usage.inputTokens ?? 0) - cached);
  const dollars =
    (uncached / 1_000_000) * (price.inputPerM ?? 0) +
    (cached / 1_000_000) * (price.cachedInputPerM ?? price.inputPerM ?? 0) +
    ((usage.outputTokens ?? 0) / 1_000_000) * (price.outputPerM ?? 0) +
    (usage.imageCount ?? 0) * (price.perImage ?? 0);
  return dollars * 100;
}

/**
 * Credits are sold in packs; this is the smallest pack's unit price in US
 * cents per credit. Used by the margin check only.
 */
export const CREDIT_UNIT_CENTS = 5;

/** Multiple of cost that a paid job must earn. Below this the admin view goes red. */
export const MIN_MARGIN_MULTIPLE = 5;

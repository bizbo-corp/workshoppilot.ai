import { z } from 'zod';

/** Free one-page summary. */
export const summarySchema = z.object({
  headline: z.string().describe('One sentence: what this workshop decided, in plain words.'),
  challenge: z.string(),
  persona: z.string(),
  dip: z.string(),
  concept: z.string().describe('The concept in two sentences.'),
  assumption: z.string().describe('The riskiest assumption, as agreed.'),
  test: z.string().describe('The committed test with its target and kill threshold.'),
  nextSevenDays: z.array(z.string()).min(1).max(4).describe('Two to four concrete things to do this week, drawn from the test plan; never a placeholder.'),
});
export type Summary = z.infer<typeof summarySchema>;

export const STRENGTHS = ['solid', 'thin', 'missing'] as const;

export const honestyDimensionSchema = z.object({
  dimension: z.enum(['problem', 'audience', 'edge', 'evidence', 'cost_to_test']),
  strength: z.enum(STRENGTHS),
  read: z.string().describe('Two sentences, direct, anchored to the workshop record.'),
  sources: z.array(z.string()).max(4).describe('Stage names the read comes from, e.g. "Discover". Empty if nothing supports it.'),
  nextTest: z.string().optional().describe('Required when thin or missing: the cheapest experiment that would firm it up.'),
});

/** Paid Verdict: the honesty read plus the armed score. */
export const verdictSchema = z.object({
  verdictLine: z.string().describe('The headline read in one or two sentences. Honest enough to say "not worth building yet".'),
  readiness: z.enum(['build_now', 'test_first', 'not_yet']).describe('build_now only with solid evidence; test_first is the usual; not_yet when problem or audience is missing.'),
  dimensions: z.array(honestyDimensionSchema).length(5),
  assumption: z.string().describe('The riskiest assumption, sharpened: falsifiable, about need or behaviour.'),
  signal: z.object({
    metric: z.string(),
    target: z.number().describe('The number that would convince a sceptic.'),
    kill: z.number().describe('Below this, park the idea.'),
    unit: z.string().describe('e.g. "sign-ups", "bookings", "% of callers"'),
    window: z.string().describe('How long the test runs, e.g. "14 days"'),
  }),
  cheapestTest: z.string().describe('The test, in three or four lines a busy founder can start tomorrow.'),
});
export type Verdict = z.infer<typeof verdictSchema>;

export const buildPackSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({ heading: z.string(), markdown: z.string() })).min(3).max(10),
});
export type BuildPack = z.infer<typeof buildPackSchema>;

export const SCORE_VERDICTS = ['validated', 'promising', 'inconclusive', 'invalidated'] as const;
export type ScoreVerdict = (typeof SCORE_VERDICTS)[number];

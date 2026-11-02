import { generateText, generateObject, streamText, type ModelMessage, type LanguageModel } from 'ai';
import type { z } from 'zod';
import { db } from '@/db/client';
import { aiCalls } from '@/db/schema';
import { getJobConfig, estimateCostCents, type AiJob, type Usage } from './jobs';

/**
 * Every model call in the app goes through here. The caller names a job, the
 * registry picks the model, and the call is logged to ai_calls with its cost.
 *
 * Models are addressed by Vercel AI Gateway id ('google/gemini-2.5-flash-lite').
 * The AI SDK resolves string ids through the gateway using AI_GATEWAY_API_KEY
 * locally and OIDC on Vercel. Tests pass a `model` override (a MockLanguageModel)
 * so nothing here reaches the network.
 */

export interface CallContext {
  job: AiJob;
  workshopId?: string | null;
  userId?: string | null;
  /** Test override: any LanguageModel, typically ai/test's MockLanguageModelV3. */
  model?: LanguageModel;
  /** Credits already charged for this call, recorded for the margin view. */
  creditsCharged?: number;
}

interface LogParams extends CallContext {
  modelId: string;
  usage: Usage;
  durationMs: number;
  ok: boolean;
  error?: string;
}

/** Fire-and-forget usage logging; never lets a logging failure break a reply. */
export async function logCall(p: LogParams): Promise<void> {
  try {
    await db.insert(aiCalls).values({
      workshopId: p.workshopId ?? null,
      userId: p.userId ?? null,
      job: p.job,
      model: p.modelId,
      inputTokens: p.usage.inputTokens ?? null,
      cachedInputTokens: p.usage.cachedInputTokens ?? null,
      outputTokens: p.usage.outputTokens ?? null,
      imageCount: p.usage.imageCount ?? null,
      costCents: estimateCostCents(p.modelId, p.usage),
      creditsCharged: p.creditsCharged ?? 0,
      durationMs: p.durationMs,
      ok: p.ok,
      error: p.error ?? null,
    });
  } catch (err) {
    console.error('[ai] failed to log call', p.job, err);
  }
}

function resolveModel(ctx: CallContext): { model: LanguageModel; modelId: string } {
  const cfg = getJobConfig(ctx.job);
  if (ctx.model) {
    const id = typeof ctx.model === 'string' ? ctx.model : ctx.model.modelId;
    return { model: ctx.model, modelId: id };
  }
  return { model: cfg.model, modelId: cfg.model };
}

type Usage3 = { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number };

function toUsage(u: Usage3 | undefined): Usage {
  return {
    inputTokens: u?.inputTokens,
    outputTokens: u?.outputTokens,
    cachedInputTokens: u?.cachedInputTokens,
  };
}

export interface TextParams {
  system?: string;
  messages: ModelMessage[];
  maxOutputTokens?: number;
  tools?: Parameters<typeof generateText>[0]['tools'];
}

/** One-shot text, logged. */
export async function aiText(ctx: CallContext, params: TextParams) {
  const cfg = getJobConfig(ctx.job);
  const { model, modelId } = resolveModel(ctx);
  const started = Date.now();
  try {
    const result = await generateText({
      model,
      system: params.system,
      messages: params.messages,
      maxOutputTokens: params.maxOutputTokens ?? cfg.maxOutputTokens,
      tools: params.tools,
    });
    await logCall({ ...ctx, modelId, usage: toUsage(result.usage), durationMs: Date.now() - started, ok: true });
    return result;
  } catch (err) {
    await logCall({ ...ctx, modelId, usage: {}, durationMs: Date.now() - started, ok: false, error: String(err) });
    throw err;
  }
}

export interface ObjectParams<T extends z.ZodTypeAny> {
  system?: string;
  messages: ModelMessage[];
  schema: T;
  maxOutputTokens?: number;
}

/** Structured output validated against a Zod schema, logged. */
export async function aiObject<T extends z.ZodTypeAny>(ctx: CallContext, params: ObjectParams<T>): Promise<z.infer<T>> {
  const cfg = getJobConfig(ctx.job);
  const { model, modelId } = resolveModel(ctx);
  const started = Date.now();
  try {
    const result = await generateObject({
      model,
      system: params.system,
      messages: params.messages,
      schema: params.schema,
      maxOutputTokens: params.maxOutputTokens ?? cfg.maxOutputTokens,
    });
    await logCall({ ...ctx, modelId, usage: toUsage(result.usage), durationMs: Date.now() - started, ok: true });
    return result.object as z.infer<T>;
  } catch (err) {
    await logCall({ ...ctx, modelId, usage: {}, durationMs: Date.now() - started, ok: false, error: String(err) });
    throw err;
  }
}

/**
 * Streaming text for the chat panel. Usage is logged when the stream
 * finishes; callers get the AI SDK result to pipe into a response.
 */
export function aiStream(ctx: CallContext, params: TextParams) {
  const cfg = getJobConfig(ctx.job);
  const { model, modelId } = resolveModel(ctx);
  const started = Date.now();
  return streamText({
    model,
    system: params.system,
    messages: params.messages,
    maxOutputTokens: params.maxOutputTokens ?? cfg.maxOutputTokens,
    tools: params.tools,
    onFinish: async ({ usage }) => {
      await logCall({ ...ctx, modelId, usage: toUsage(usage), durationMs: Date.now() - started, ok: true });
    },
    onError: async ({ error }) => {
      await logCall({ ...ctx, modelId, usage: {}, durationMs: Date.now() - started, ok: false, error: String(error) });
    },
  });
}

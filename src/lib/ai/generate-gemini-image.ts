import { google } from '@ai-sdk/google';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';

/**
 * Single Gemini image-generation model for the whole app.
 *
 * Migrated off the Imagen 4 endpoints (imagen-4.0-*generate-001), which Google
 * discontinues on 2026-08-17. Unlike Imagen — which the Vercel AI SDK calls via
 * `generateImage` / `google.image()` against the `:predict` endpoint — Gemini
 * image-output models are language models: you call `generateText` with the
 * IMAGE response modality and read the bytes back from `result.files`.
 *
 * Gemini Flash Image is a single tier, so there is no longer a fast/standard
 * split (the old admin sketch toggle is gone).
 */
export const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';

/** Aspect ratios we actually use; a subset of what the model supports. */
export type GeminiImageAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

/**
 * Generate a single image with Gemini and return its raw bytes.
 *
 * Inherits the shared Gemini exponential-backoff retry (rate-limit aware), which
 * the old Imagen `generateImage` path did not have.
 *
 * @throws if the model returns no image part.
 */
export async function generateGeminiImage(params: {
  prompt: string;
  aspectRatio: GeminiImageAspectRatio;
  model?: string;
}): Promise<{ base64: string; mediaType: string }> {
  const { prompt, aspectRatio, model = GEMINI_IMAGE_MODEL } = params;

  const result = await generateTextWithRetry({
    model: google(model),
    prompt,
    providerOptions: {
      google: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
  });

  const imageFile = result.files.find((f) => f.mediaType?.startsWith('image/'));
  if (!imageFile) {
    throw new Error('Gemini image generation returned no image data');
  }

  return {
    base64: imageFile.base64,
    mediaType: imageFile.mediaType || 'image/png',
  };
}

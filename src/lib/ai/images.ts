import { generateText, type UserContent } from 'ai';
import { put } from '@vercel/blob';
import { db } from '@/db/client';
import { uploads } from '@/db/schema';
import { getJobConfig, type AiJob } from './jobs';
import { logCall } from './gateway';

/**
 * Image jobs through the gateway. Gemini's image model takes a prompt and
 * optionally an input image and returns PNG bytes; we store the result on
 * Blob (or as a data URL in local dev) and log the call like any other.
 */
export async function generateImageFor(job: Extract<AiJob, 'clean_sketch' | 'persona_image'>, opts: { workshopId: string; userId: string; prompt: string; sourceImageUrl?: string; sourceUploadId?: string; creditsCharged?: number }): Promise<{ url: string; uploadId: string }> {
  const cfg = getJobConfig(job);
  const started = Date.now();
  const content: UserContent = [];
  if (opts.sourceImageUrl) {
    const image = opts.sourceImageUrl.startsWith('data:') ? dataUrlToBytes(opts.sourceImageUrl) : new URL(opts.sourceImageUrl);
    content.push({ type: 'image', image });
  }
  content.push({ type: 'text', text: opts.prompt });

  try {
    const result = await generateText({
      model: cfg.model,
      messages: [{ role: 'user' as const, content }],
      providerOptions: { google: { responseModalities: ['IMAGE', 'TEXT'] } },
    });
    const file = result.files.find((f) => f.mediaType.startsWith('image/'));
    if (!file) throw new Error('The model returned no image');
    const bytes = file.uint8Array;
    const ext = file.mediaType.split('/')[1] ?? 'png';

    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`w/${opts.workshopId}/${job}-${Date.now()}.${ext}`, Buffer.from(bytes), { access: 'public', addRandomSuffix: true, contentType: file.mediaType });
      url = blob.url;
    } else {
      url = `data:${file.mediaType};base64,${Buffer.from(bytes).toString('base64')}`;
    }
    const [row] = await db
      .insert(uploads)
      .values({ workshopId: opts.workshopId, userId: opts.userId, kind: job === 'clean_sketch' ? 'ai_cleanup' : 'ai_image', url, contentType: file.mediaType, sizeBytes: bytes.length, sourceId: opts.sourceUploadId ?? null })
      .returning({ id: uploads.id });

    await logCall({ job, workshopId: opts.workshopId, userId: opts.userId, modelId: cfg.model, usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, imageCount: 1 }, durationMs: Date.now() - started, ok: true, creditsCharged: opts.creditsCharged });
    return { url, uploadId: row.id };
  } catch (err) {
    await logCall({ job, workshopId: opts.workshopId, userId: opts.userId, modelId: cfg.model, usage: {}, durationMs: Date.now() - started, ok: false, error: String(err), creditsCharged: opts.creditsCharged });
    throw err;
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

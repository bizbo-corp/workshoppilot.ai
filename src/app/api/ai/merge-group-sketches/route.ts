import { google } from '@ai-sdk/google';
import { generateImage } from 'ai';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { put } from '@vercel/blob';
import { deleteBlobUrls } from '@/lib/blob/delete-blob-urls';

export const maxDuration = 60;

type SlotData = {
  title: string;
  description?: string;
  imageUrl?: string;
};

/**
 * Fetch an image URL and return base64 data
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    // Skip data URLs — they're already base64
    if (url.startsWith('data:')) {
      return url.split(',')[1] || null;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch {
    return null;
  }
}

/**
 * Use Gemini vision to describe an existing sketch
 */
async function describeSketch(imageBase64: string): Promise<string> {
  const result = await generateTextWithRetry({
    model: google('gemini-2.0-flash'),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', image: imageBase64 },
          {
            type: 'text',
            text: 'Describe this hand-drawn sketch in 2-3 sentences. Focus on the layout, key UI elements, interactions shown, and overall concept. Be specific about what\'s depicted so an image generator can recreate and improve it.',
          },
        ],
      },
    ],
  });
  return result.text.trim();
}

/**
 * POST /api/ai/merge-group-sketches
 *
 * Generates a single merged sketch from multiple grouped Crazy 8s ideas.
 *
 * Request body:
 * - workshopId: string
 * - groupLabel: string
 * - slotData: SlotData[] (title, description, imageUrl per slot)
 * - mergePrompt?: string (user's custom merge instructions)
 * - previousImageUrl?: string (for regeneration — old blob to clean up)
 */
export async function POST(req: Request) {
  try {
    const {
      workshopId,
      groupLabel,
      slotData,
      mergePrompt,
      previousImageUrl,
    } = (await req.json()) as {
      workshopId: string;
      groupLabel: string;
      slotData: SlotData[];
      mergePrompt?: string;
      previousImageUrl?: string;
    };

    if (!workshopId || !groupLabel || !slotData?.length) {
      return new Response(
        JSON.stringify({ error: 'workshopId, groupLabel, and slotData are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Load workshop context + describe each member sketch in parallel
    const [workshopContext, ...sketchDescriptions] = await Promise.all([
      loadWorkshopContext(workshopId),
      ...slotData.map(async (slot) => {
        if (!slot.imageUrl) return `"${slot.title}": ${slot.description || 'No visual sketch available'}`;
        const base64 = await fetchImageAsBase64(slot.imageUrl);
        if (!base64) return `"${slot.title}": ${slot.description || 'Image could not be loaded'}`;
        const desc = await describeSketch(base64);
        return `"${slot.title}": ${desc}`;
      }),
    ]);

    // Build the merge prompt
    const parts: string[] = [
      'Professional hand-drawn sketch in black ink on white paper with selective yellow highlighter accents for emphasis.',
      'Confident, expressive line work — like a skilled illustrator\'s quick concept sketch.',
      `This is a MERGED concept called "${groupLabel}" that combines the following ${slotData.length} individual ideas into ONE unified design:`,
    ];

    // Add each sketch description
    for (let i = 0; i < sketchDescriptions.length; i++) {
      parts.push(`Idea ${i + 1}: ${sketchDescriptions[i]}`);
    }

    parts.push('Combine all these ideas into a single cohesive design that shows how they work together as one integrated solution.');

    // Workshop context
    if (workshopContext.reframedHmw) {
      parts.push(`This solution addresses: ${workshopContext.reframedHmw}`);
    } else if (workshopContext.hmwStatement) {
      parts.push(`This solution addresses: ${workshopContext.hmwStatement}`);
    }

    // User's custom merge prompt
    if (mergePrompt?.trim()) {
      parts.push(`User instructions: ${mergePrompt.trim()}`);
    }

    // Style constraints
    parts.push(
      'Use only three tones: black ink lines, white paper background, and warm yellow highlighter to draw attention to key elements.',
      'No grayscale shading, no gradients, no other colors. Use yellow sparingly for emphasis.',
      'Do NOT include any people, human figures, or stick figures in the sketch.',
      'Basic boxes and lines for UI elements. Include clean labels and annotations where helpful.',
      'No photorealism, no 3D rendering. Keep it looking like a polished concept sketch.',
    );

    const prompt = parts.join(' ');

    // Generate image with Imagen 4 Fast
    const result = await generateImage({
      model: google.image('imagen-4.0-fast-generate-001'),
      prompt,
      aspectRatio: '4:3',
    });

    // Record usage
    recordUsageEvent({
      workshopId,
      stepId: 'ideation',
      operation: 'merge-group-sketches',
      model: 'imagen-4.0-fast-generate-001',
      imageCount: 1,
    });

    const base64Data = result.image.base64;
    const mimeType = result.image.mediaType || 'image/png';

    // Upload to Vercel Blob
    let mergedImageUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const buffer = Buffer.from(base64Data, 'base64');
      const extension = mimeType === 'image/png' ? 'png' : 'webp';
      const blob = await put(
        `sketches/${workshopId}/merged-${Date.now()}.${extension}`,
        buffer,
        { access: 'public', addRandomSuffix: true },
      );
      mergedImageUrl = blob.url;
    } else {
      mergedImageUrl = `data:${mimeType};base64,${base64Data}`;
    }

    // Clean up previous blob if regenerating
    if (previousImageUrl && previousImageUrl !== mergedImageUrl) {
      deleteBlobUrls([previousImageUrl]).catch(console.warn);
    }

    return new Response(
      JSON.stringify({ mergedImageUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Merge group sketches error:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to merge group sketches',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

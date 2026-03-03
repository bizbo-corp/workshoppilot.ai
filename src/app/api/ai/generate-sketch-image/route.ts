import { google } from '@ai-sdk/google';
import { generateImage } from 'ai';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { put } from '@vercel/blob';
import { deleteBlobUrls } from '@/lib/blob/delete-blob-urls';
import { db } from '@/db/client';
import { workshops, workshopSteps, stepArtifacts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const maxDuration = 60;

/**
 * Load workshop context: challenge + reframed HMW for prompt enrichment
 */
async function loadWorkshopContext(workshopId: string) {
  const context: {
    originalIdea?: string;
    problemStatement?: string;
    hmwStatement?: string;
    reframedHmw?: string;
  } = {};

  // Load workshop original idea
  const [workshop] = await db
    .select({ originalIdea: workshops.originalIdea })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);

  if (workshop) {
    context.originalIdea = workshop.originalIdea;
  }

  // Load challenge artifact (Step 1)
  const [challengeStep] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.stepId, 'challenge'),
      ),
    )
    .limit(1);

  if (challengeStep) {
    const [art] = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, challengeStep.id))
      .limit(1);

    if (art) {
      const a = art.artifact as Record<string, unknown>;
      context.problemStatement = (a.problemStatement as string) || undefined;
      context.hmwStatement = (a.hmwStatement as string) || undefined;
    }
  }

  // Load reframe artifact (Step 7) for reframed HMW
  const [reframeStep] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.stepId, 'reframe'),
      ),
    )
    .limit(1);

  if (reframeStep) {
    const [art] = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, reframeStep.id))
      .limit(1);

    if (art) {
      const a = art.artifact as Record<string, unknown>;
      const hmwStatements = a.hmwStatements as
        | Array<{ fullStatement?: string }>
        | undefined;
      if (hmwStatements?.[0]?.fullStatement) {
        context.reframedHmw = hmwStatements[0].fullStatement;
      }
    }
  }

  return context;
}

/**
 * Use Gemini vision to describe an existing sketch for prompt enrichment
 */
async function describeExistingSketch(imageBase64: string): Promise<string> {
  const result = await generateTextWithRetry({
    model: google('gemini-2.0-flash'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: imageBase64,
          },
          {
            type: 'text',
            text: `Describe this hand-drawn sketch in 2-3 sentences. Focus on the layout, key UI elements, interactions shown, and overall concept. Be specific about what's depicted so an image generator can recreate and improve it.`,
          },
        ],
      },
    ],
  });

  return result.text.trim();
}

/**
 * Build the Imagen prompt for sketch generation
 */
function buildSketchPrompt(params: {
  ideaTitle: string;
  ideaDescription: string;
  additionalPrompt?: string;
  workshopContext: {
    originalIdea?: string;
    problemStatement?: string;
    hmwStatement?: string;
    reframedHmw?: string;
  };
  existingSketchDescription?: string;
  hasPersonStamps?: boolean;
}): string {
  const { ideaTitle, ideaDescription, additionalPrompt, workshopContext, existingSketchDescription, hasPersonStamps } = params;

  // Determine if this is a digital or physical/service idea
  const digitalKeywords = ['app', 'website', 'dashboard', 'screen', 'interface', 'mobile', 'web', 'digital', 'software', 'platform', 'online', 'notification', 'widget', 'modal', 'page'];
  const combinedText = `${ideaTitle} ${ideaDescription}`.toLowerCase();
  const isDigital = digitalKeywords.some((kw) => combinedText.includes(kw));

  // Build usage context — avoid mentioning people unless stamps indicate them
  const usageContext = isDigital
    ? hasPersonStamps
      ? 'a person using a mobile app or web interface on their device, showing the screen with the concept visible'
      : 'a mobile app or web interface screen showing the concept clearly'
    : hasPersonStamps
      ? 'a person interacting with this service or product in a real-life setting, showing the physical interaction'
      : 'this service or product in its real-life setting, showing how it works';

  // Core prompt parts
  const parts: string[] = [
    'Professional hand-drawn sketch in black ink on white paper with selective yellow highlighter accents for emphasis.',
    'Confident, expressive line work — like a skilled illustrator\'s quick concept sketch. Lines should feel intentional and assured but not rigid, mechanical, or too perfect.',
    `The sketch shows ${usageContext}.`,
    `Concept: "${ideaTitle}" — ${ideaDescription}.`,
  ];

  // Add workshop context for richer generation
  if (workshopContext.reframedHmw) {
    parts.push(`This idea addresses: ${workshopContext.reframedHmw}`);
  } else if (workshopContext.hmwStatement) {
    parts.push(`This idea addresses: ${workshopContext.hmwStatement}`);
  }

  // If there's an existing sketch, reference it for improvement
  if (existingSketchDescription) {
    parts.push(
      `Improve upon this existing sketch: ${existingSketchDescription}. Keep the same general layout but add more detail and clarity.`,
    );
  }

  // Additional user prompt
  if (additionalPrompt?.trim()) {
    parts.push(additionalPrompt.trim());
  }

  // Style constraints — three-tone palette: black ink, white paper, yellow highlight
  parts.push(
    'Use only three tones: black ink lines, white paper background, and warm yellow highlighter to draw attention to key elements or add visual interest.',
    'No grayscale shading, no gradients, no other colors. Use yellow sparingly for emphasis — not as fill for large areas.',
  );

  // People policy — only include figures when user has placed stickmen stamps
  if (hasPersonStamps) {
    parts.push('Include simple stick figures or people as indicated in the user\'s sketch.');
  } else {
    parts.push('Do NOT include any people, human figures, or stick figures in the sketch.');
  }

  parts.push(
    'Basic boxes and lines for UI elements.',
    'Include clean labels and annotations where helpful.',
    'No photorealism, no 3D rendering. Keep it looking like a polished concept sketch from a skilled illustrator, not a rough whiteboard doodle.',
  );

  return parts.join(' ');
}

/**
 * POST /api/ai/generate-sketch-image
 *
 * Generates a hand-drawn B&W sketch of an idea in context.
 *
 * Request body:
 * - workshopId: string
 * - ideaTitle: string
 * - ideaDescription: string
 * - additionalPrompt?: string
 * - existingImageBase64?: string (data URL or raw base64)
 */
export async function POST(req: Request) {
  try {
    const {
      workshopId,
      ideaTitle,
      ideaDescription,
      additionalPrompt,
      existingImageBase64,
      previousImageUrl,
      hasPersonStamps,
    } = await req.json();

    if (!workshopId || !ideaTitle) {
      return new Response(
        JSON.stringify({ error: 'workshopId and ideaTitle are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Load workshop context in parallel with optional sketch analysis
    const [workshopContext, existingSketchDescription] = await Promise.all([
      loadWorkshopContext(workshopId),
      existingImageBase64
        ? describeExistingSketch(existingImageBase64)
        : Promise.resolve(undefined),
    ]);

    // Build the image prompt
    const prompt = buildSketchPrompt({
      ideaTitle,
      ideaDescription: ideaDescription || '',
      additionalPrompt,
      workshopContext,
      existingSketchDescription,
      hasPersonStamps: !!hasPersonStamps,
    });

    // Generate image with Imagen 4 Fast (cheapest available tier)
    const result = await generateImage({
      model: google.image('imagen-4.0-fast-generate-001'),
      prompt,
      aspectRatio: '4:3',
    });

    // Record usage
    recordUsageEvent({
      workshopId,
      stepId: 'ideation',
      operation: 'generate-sketch-image',
      model: 'imagen-4.0-fast-generate-001',
      imageCount: 1,
    });

    const base64Data = result.image.base64;
    const mimeType = result.image.mediaType || 'image/png';

    // Upload to Vercel Blob to avoid large data URLs in client state
    let imageUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const buffer = Buffer.from(base64Data, 'base64');
      const extension = mimeType === 'image/png' ? 'png' : 'webp';
      const blob = await put(
        `sketches/${workshopId}/${Date.now()}.${extension}`,
        buffer,
        { access: 'public', addRandomSuffix: true },
      );
      imageUrl = blob.url;
    } else {
      // Fallback for local dev
      imageUrl = `data:${mimeType};base64,${base64Data}`;
    }

    // Clean up previous blob if URL changed
    if (previousImageUrl && previousImageUrl !== imageUrl) {
      deleteBlobUrls([previousImageUrl]).catch(console.warn);
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Generate sketch image error:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate sketch image',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

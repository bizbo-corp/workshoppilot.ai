import { google } from '@ai-sdk/google';
import { generateImage } from 'ai';
import { auth, currentUser } from '@clerk/nextjs/server';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { loadWorkshopContext, type WorkshopContext } from '@/lib/ai/workshop-context';
import { put } from '@vercel/blob';
import { deleteBlobUrls } from '@/lib/blob/delete-blob-urls';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { checkImageGenerationCap, imageCapExceededResponse } from '@/lib/ai/image-generation-cap';
import { isAdmin } from '@/lib/auth/roles';

export const maxDuration = 60;

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
            text: `Describe this hand-drawn sketch in 3-4 sentences so an image generator can faithfully recreate it.

IMPORTANT — describe these aspects:
1. FRAMING: Is the content drawn inside a device frame (phone, tablet, laptop)? Or is it a flat layout with no device border — like a webpage section, poster, or diagram floating on the page? State this explicitly.
2. LAYOUT: Describe the spatial arrangement — what is at the top, middle, bottom, left, right. Note relative sizes and positions.
3. CONTENT: List the specific elements — text/headings (quote exact words), buttons, icons, images, charts, logos, decorative elements.
4. STYLE: Note any visual characteristics — hand-drawn, wireframe, detailed, minimal, etc.

Be precise and literal. Describe what you actually see, not what you think the concept is trying to convey.`,
          },
        ],
      },
    ],
  });

  return result.text.trim();
}

type IdeaClassification = 'UI' | 'PROCESS';

/**
 * Use Gemini Flash to classify the idea and rewrite a coherent concept prompt
 */
async function rewriteSketchPrompt(params: {
  ideaTitle: string;
  ideaDescription: string;
  additionalPrompt?: string;
  workshopContext: WorkshopContext;
  existingSketchDescription?: string;
}): Promise<{ conceptPrompt: string; classification: IdeaClassification }> {
  const { ideaTitle, ideaDescription, additionalPrompt, workshopContext, existingSketchDescription } = params;

  const challenge = workshopContext.reframedHmw || workshopContext.hmwStatement || workshopContext.problemStatement || workshopContext.originalIdea || '';

  try {
    // Use a different prompt strategy depending on whether we have an existing sketch
    const geminiPrompt = existingSketchDescription
      ? `You are an expert at writing image generation prompts that faithfully recreate hand-drawn sketches with professional polish.

The user has drawn a sketch and wants an improved version that keeps the SAME layout and composition. Your job is to describe what they drew so an image generator can recreate it faithfully with cleaner lines and better detail.

CRITICAL RULES:
- Describe the EXACT layout and spatial arrangement from the existing sketch — what is where on the page
- If the existing sketch does NOT show a device frame (phone, tablet, laptop), do NOT add one. Describe the content as a flat layout.
- If the existing sketch DOES show a device frame, keep it.
- Preserve every element the user drew — do not drop or add major elements
- Use the idea title and description for context about labels and text content
- Naturally incorporate the user's additional instructions (if any)
- NEVER mention people, personas, characters, or users by name
- NEVER wrap content in a device frame that wasn't in the original sketch

IDEA TITLE: ${ideaTitle}
IDEA DESCRIPTION: ${ideaDescription || 'No description provided'}
${additionalPrompt ? `USER INSTRUCTIONS: ${additionalPrompt}` : ''}
EXISTING SKETCH: ${existingSketchDescription}

Respond in exactly this format:
CLASSIFICATION: <UI|PROCESS>
PROMPT: <your 2-4 sentence prompt describing the sketch layout to recreate>`
      : `You are an expert at writing image generation prompts for concept sketches shown on a tablet screen.

Given an idea title, description, and workshop context, do two things:

1. CLASSIFY the idea as one of:
   - UI: A digital interface, app, dashboard, website, tool, or ANY idea that can be represented as a screen with interactive elements. When in doubt, choose UI.
   - PROCESS: ONLY for ideas that are inherently physical — hardware, spatial layouts, architecture, physical products that cannot be represented as a screen.

DEFAULT TO UI.

2. REWRITE into a coherent 2-4 sentence prompt describing a single tablet app screen. CRITICAL RULES:
   - The screen title/header MUST be the IDEA TITLE exactly — do not invent a different name
   - Every UI element (inputs, buttons, cards, labels) MUST directly reflect the IDEA DESCRIPTION — pull specific words, concepts, and actions from the description to use as labels, placeholder text, and section headings
   - Do NOT invent a loosely related or tangential app — the screen must be a direct visual representation of what the description says
   - Describe concrete UI elements: text inputs, buttons, cards, lists, sticky notes, toggles, progress bars, tabs, etc.
   - Describe the layout: what's at the top, what's in the main content area, what actions are available
   - Naturally incorporate the user's additional instructions (if any)
   - NEVER mention people, personas, characters, or users by name
   - NEVER describe comic panels, storyboards, speech bubbles, or multi-scene layouts
   - For PROCESS ideas only: describe the physical object, environment, or spatial layout instead

IDEA TITLE: ${ideaTitle}
IDEA DESCRIPTION: ${ideaDescription || 'No description provided'}
WORKSHOP CHALLENGE: ${challenge || 'No challenge context available'}
${additionalPrompt ? `USER INSTRUCTIONS: ${additionalPrompt}` : ''}

Respond in exactly this format:
CLASSIFICATION: <UI|PROCESS>
PROMPT: <your 2-4 sentence concept prompt>`;

    const result = await generateTextWithRetry({
      model: google('gemini-2.0-flash'),
      messages: [
        {
          role: 'user',
          content: geminiPrompt,
        },
      ],
    });

    const text = result.text.trim();
    console.log('[sketch-image] Gemini rewrite raw response:', text);
    const classificationMatch = text.match(/CLASSIFICATION:\s*(UI|PROCESS)/i);
    const promptMatch = text.match(/PROMPT:\s*([\s\S]+)/i);

    if (classificationMatch && promptMatch) {
      return {
        classification: classificationMatch[1].toUpperCase() as IdeaClassification,
        conceptPrompt: promptMatch[1].trim(),
      };
    }

    // Partial parse — use whatever we got
    console.warn('[sketch-image] rewriteSketchPrompt: could not fully parse response, using fallback. Raw:', text);
  } catch (error) {
    console.warn('[sketch-image] rewriteSketchPrompt: Gemini Flash rewrite failed, falling back to mechanical prompt', error);
  }

  // Fallback: default to UI, raw concatenation
  const physicalKeywords = ['hardware', 'physical', 'building', 'furniture', 'architecture', 'warehouse', 'factory', 'machine'];
  const combinedText = `${ideaTitle} ${ideaDescription}`.toLowerCase();
  const isPhysical = physicalKeywords.some((kw) => combinedText.includes(kw));

  const fallbackParts = [`${ideaTitle}${ideaDescription ? ` — ${ideaDescription}` : ''}.`];
  if (challenge) fallbackParts.push(`This idea addresses: ${challenge}`);
  if (additionalPrompt?.trim()) fallbackParts.push(additionalPrompt.trim());
  if (existingSketchDescription) fallbackParts.push(`Improve upon this existing sketch: ${existingSketchDescription}. Keep the same general layout but add more detail and clarity.`);

  return {
    classification: isPhysical ? 'PROCESS' : 'UI',
    conceptPrompt: fallbackParts.join(' '),
  };
}

/**
 * Build the Imagen prompt for sketch generation
 */
function buildSketchPrompt(params: {
  conceptPrompt: string;
  classification: IdeaClassification;
  existingSketchDescription?: string;
  hasPersonStamps?: boolean;
}): string {
  const { conceptPrompt, classification, existingSketchDescription, hasPersonStamps } = params;

  // Core style instructions
  const parts: string[] = [
    'Professional hand-drawn sketch using black ink lines and selective yellow highlighter accents on a plain flat white background.',
    'The background must be completely plain white — no paper texture, no desk, no table, no surface, no pencils, no pens, no props, no shadows, no photographic staging of any kind. The sketch floats on pure white.',
    'Confident, expressive line work — like a skilled illustrator\'s quick concept sketch. Lines should feel intentional and assured but not rigid, mechanical, or too perfect.',
  ];

  if (existingSketchDescription) {
    // Reference mode: faithfully reproduce the user's drawing with polish
    parts.push(
      `IMPORTANT — REFERENCE DRAWING MODE: The user drew a sketch and wants a polished version that keeps the SAME composition. Here is what their drawing contains: ${existingSketchDescription}`,
      'You MUST match the spatial arrangement of the reference drawing. If elements are positioned at the top, keep them at the top. If content fills the frame edge-to-edge, keep it edge-to-edge.',
      'ABSOLUTELY DO NOT add any device frames, phone bezels, tablet borders, laptop screens, or any device hardware. Do NOT place the content inside a phone or tablet. The content should fill the entire frame directly, exactly as the user drew it.',
      'Do NOT add hands holding devices. Do NOT add device status bars, home buttons, or notches.',
      'Keep every element the user drew. Do not drop or significantly rearrange elements.',
      'Polish with cleaner lines, better typography, and refined details — but the layout and composition must match the reference.',
      conceptPrompt,
    );
  } else {
    // Fresh generation mode: use device framing based on classification
    const usageContext =
      classification === 'UI'
        ? hasPersonStamps
          ? 'a person using a mobile app or web interface on their device, showing the screen with the concept visible'
          : 'a mobile app or web interface screen showing the concept clearly'
        : hasPersonStamps
          ? 'a person interacting with this service or product in a real-life setting, showing the physical interaction'
          : 'this service or product in its real-life setting, showing how it works';

    parts.push(
      `The sketch shows ${usageContext}.`,
      conceptPrompt,
    );
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

  // Simplicity & composition constraints — prevent overcomplicated outputs
  parts.push(
    'IMPORTANT: Show ONE single screen or scene only — do not show multiple screens, devices, or viewpoints unless the user\'s reference image explicitly contains them.',
    'Do NOT add any decorative elements, ornamentation, floating objects, background embellishments, pencils, pens, stationery, or props around the sketch. No wooden desks, no paper edges, no staged photography.',
    'Keep the composition focused and minimal — only draw elements that directly communicate the concept. Every element in the sketch should serve a clear purpose.',
    'Fill the frame with the single concept — no collages, no exploded views, no surrounding vignettes.',
  );

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
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  let adminUser = isAdmin(sessionClaims);
  if (!adminUser) {
    const user = await currentUser();
    const adminEmail = process.env.ADMIN_EMAIL;
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    adminUser = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
  }

  if (!adminUser) {
    const rl = checkRateLimit(getRateLimitId(req, userId), 'image-gen');
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);
  }

  try {
    const {
      workshopId,
      ideaTitle,
      ideaDescription,
      additionalPrompt,
      existingImageBase64,
      previousImageUrl,
      hasPersonStamps,
      slotId,
      imageModel,
    } = await req.json();

    // Only admin users can use the standard model
    const resolvedModel = (adminUser && imageModel === 'standard')
      ? 'imagen-4.0-generate-001'
      : 'imagen-4.0-fast-generate-001';

    if (!workshopId || (!ideaTitle && !additionalPrompt)) {
      return new Response(
        JSON.stringify({ error: 'workshopId and either ideaTitle or additionalPrompt are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Check per-item generation cap (skip for admin)
    const itemId = slotId ? `sketch:${workshopId}:${slotId}` : `sketch:${workshopId}:unknown`;
    const capCheck = adminUser
      ? { count: 0, remaining: 999, allowed: true }
      : await checkImageGenerationCap(itemId);
    if (!capCheck.allowed) {
      return imageCapExceededResponse();
    }

    // Load workshop context in parallel with optional sketch analysis
    const [workshopContext, existingSketchDescription] = await Promise.all([
      loadWorkshopContext(workshopId),
      existingImageBase64
        ? describeExistingSketch(existingImageBase64)
        : Promise.resolve(undefined),
    ]);

    // Rewrite the prompt with Gemini Flash for coherent concept framing
    const { conceptPrompt, classification } = await rewriteSketchPrompt({
      ideaTitle,
      ideaDescription: ideaDescription || '',
      additionalPrompt,
      workshopContext,
      existingSketchDescription,
    });

    console.log('[sketch-image] classification:', classification, '| conceptPrompt:', conceptPrompt);

    // Build the final Imagen prompt with style constraints
    const prompt = buildSketchPrompt({
      conceptPrompt,
      classification,
      existingSketchDescription,
      hasPersonStamps: !!hasPersonStamps,
    });

    // Generate image with selected Imagen model
    console.log('[sketch-image] using model:', resolvedModel);
    const result = await generateImage({
      model: google.image(resolvedModel),
      prompt,
      aspectRatio: '4:3',
    });

    // Record usage with itemId for cap tracking
    recordUsageEvent({
      workshopId,
      stepId: 'ideation',
      operation: 'generate-sketch-image',
      model: resolvedModel,
      imageCount: 1,
      itemId,
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
      JSON.stringify({ imageUrl, remainingGenerations: capCheck.remaining - 1 }),
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

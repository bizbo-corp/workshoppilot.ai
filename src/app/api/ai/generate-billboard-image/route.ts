import { generateImage } from "ai";
import { google } from "@ai-sdk/google";
import { put } from "@vercel/blob";
import { deleteBlobUrls } from "@/lib/blob/delete-blob-urls";
import { recordUsageEvent } from "@/lib/ai/usage-tracking";

/**
 * Increase Vercel serverless timeout for image generation
 */
export const maxDuration = 60;

/**
 * Builds a deterministic image prompt from billboard hero data.
 * Creates a polished landing page hero / billboard visual.
 */
function buildBillboardPrompt(billboard: {
  headline: string;
  subheadline: string;
  cta: string;
  visualStyle?: string;
  userPrompt?: string;
}): string {
  const parts = [
    `Modern, polished billboard advertisement or landing page hero image.`,
    `The design visually communicates: "${billboard.headline}".`,
    `Supporting message: "${billboard.subheadline}".`,
    `Call to action: "${billboard.cta}".`,
    `Hero-style composition, 16:9 widescreen format.`,
    `No placeholder text, no lorem ipsum. Text should be readable and match the provided copy exactly.`,
    `Style: premium SaaS landing page hero, startup pitch deck cover, or Times Square billboard.`,
  ];

  if (billboard.visualStyle) {
    parts.push(billboard.visualStyle);
  } else {
    parts.push(`Clean, professional graphic design with bold typography, vibrant gradients, and modern tech aesthetic. High contrast, eye-catching colors.`);
  }

  if (billboard.userPrompt) {
    parts.push(`Additional direction: ${billboard.userPrompt}`);
  }

  return parts.join(" ");
}

/**
 * POST /api/ai/generate-billboard-image
 * Generates a 16:9 billboard hero image using Imagen 4.
 *
 * Request body:
 * - workshopId: string
 * - headline: string
 * - subheadline: string
 * - cta: string
 * - previousImageUrl?: string
 * - visualStyle?: string   — visual style prompt modifier
 * - userPrompt?: string    — freeform user prompt for image direction
 */
export async function POST(req: Request) {
  try {
    const { workshopId, headline, subheadline, cta, previousImageUrl, visualStyle, userPrompt } =
      await req.json();

    if (!workshopId || !headline) {
      return new Response(
        JSON.stringify({ error: "workshopId and headline are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const prompt = buildBillboardPrompt({ headline, subheadline, cta, visualStyle, userPrompt });

    const result = await generateImage({
      model: google.image("imagen-4.0-generate-001"),
      prompt,
      aspectRatio: "16:9",
    });

    // Record usage (fire-and-forget)
    recordUsageEvent({
      workshopId,
      stepId: "validate",
      operation: "generate-billboard-image",
      model: "imagen-4.0-generate-001",
      imageCount: 1,
    });

    const base64Data = result.image.base64;
    const mimeType = result.image.mediaType || "image/png";

    // Upload to Vercel Blob or fall back to data URL
    let imageUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const buffer = Buffer.from(base64Data, "base64");
      const extension = mimeType === "image/png" ? "png" : "webp";

      const blob = await put(
        `billboards/${workshopId}/hero.${extension}`,
        buffer,
        {
          access: "public",
          addRandomSuffix: true,
        },
      );
      imageUrl = blob.url;
    } else {
      // Fallback: data URL for local dev
      console.warn(
        "BLOB_READ_WRITE_TOKEN not set — storing billboard image as data URL.",
      );
      imageUrl = `data:${mimeType};base64,${base64Data}`;
    }

    // Clean up previous blob if URL changed
    if (previousImageUrl && previousImageUrl !== imageUrl) {
      deleteBlobUrls([previousImageUrl]).catch(console.warn);
    }

    return new Response(JSON.stringify({ imageUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate billboard image error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate billboard image",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

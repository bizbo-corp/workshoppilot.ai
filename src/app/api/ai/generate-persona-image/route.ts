import { generateImage } from "ai";
import { google } from "@ai-sdk/google";
import { put } from "@vercel/blob";

/**
 * Increase Vercel serverless timeout for image generation
 */
export const maxDuration = 60;

/**
 * Builds a deterministic image prompt from persona data.
 * Eliminates the need for an LLM prompt-crafting step.
 */
function buildImagePrompt(persona: {
  name?: string;
  age?: number;
  job?: string;
  archetype?: string;
  archetypeRole?: string;
  empathyPains?: string;
  empathyGains?: string;
  narrative?: string;
  quote?: string;
}): string {
  const characterDescription = [
    persona.age ? `${persona.age}-year-old` : "",
    persona.job || "person",
  ]
    .filter(Boolean)
    .join(" ");

  const nameContext = persona.name ? ` named ${persona.name}` : "";

  const basePrompt = `Modern profile avatar of a ${characterDescription}${nameContext}. Minimalist, centered composition, soft studio lighting. Solid pastel background. Clean digital portrait style, sharp focus. No text, no words, no letters, no watermarks, no logos, no graphics, no overlays, no UI elements — portrait only.`;

  const personality = persona.archetype
    ? `Archetype: ${persona.archetype}${persona.archetypeRole ? ` — ${persona.archetypeRole}` : ""}.`
    : "";

  const expression = persona.empathyPains
    ? `Expression conveys: ${persona.empathyPains.split(";")[0].trim().slice(0, 80)}.`
    : "";

  const context = persona.quote
    ? `Captures the essence of someone who says: "${persona.quote.slice(0, 100)}"`
    : "";

  return `${basePrompt} ${personality} ${expression} ${context}`.trim();
}

/**
 * POST /api/ai/generate-persona-image
 * Generates a B&W caricature portrait using Imagen 4 Fast.
 *
 * Request body:
 * - workshopId: string
 * - templateId: string
 * - name, age, job, archetype, archetypeRole, empathyPains, empathyGains, narrative, quote
 */
export async function POST(req: Request) {
  try {
    const {
      workshopId,
      templateId,
      name,
      age,
      job,
      archetype,
      archetypeRole,
      empathyPains,
      empathyGains,
      narrative,
      quote,
    } = await req.json();

    if (!workshopId || !templateId) {
      return new Response(
        JSON.stringify({ error: "workshopId and templateId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const prompt = buildImagePrompt({
      name,
      age,
      job,
      archetype,
      archetypeRole,
      empathyPains,
      empathyGains,
      narrative,
      quote,
    });

    const result = await generateImage({
      model: google.image("imagen-4.0-fast-generate-001"),
      prompt,
      aspectRatio: "1:1",
    });

    const base64Data = result.image.base64;
    const mimeType = result.image.mediaType || "image/png";

    // Upload to Vercel Blob or fall back to data URL
    let imageUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const buffer = Buffer.from(base64Data, "base64");
      const extension = mimeType === "image/png" ? "png" : "webp";

      const blob = await put(
        `personas/${workshopId}/${templateId}.${extension}`,
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
        "BLOB_READ_WRITE_TOKEN not set — storing persona image as data URL.",
      );
      imageUrl = `data:${mimeType};base64,${base64Data}`;
    }

    return new Response(JSON.stringify({ imageUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate persona image error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate persona image",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { serializeArtifactsSafe } from './prd-generation';

/**
 * Build a minimal Gemini prompt that generates ONLY a brief executive summary
 * synthesizing the workshop's pain point, idea, and challenge statement.
 * All step-by-step slides are built directly from artifact data — no AI needed.
 */
export function buildPresentationSummaryPrompt(artifacts: AllWorkshopArtifacts): string {
  const workshopData = serializeArtifactsSafe(artifacts as unknown as Record<string, unknown>);

  return `You are a senior strategy consultant. Based on the design thinking workshop outputs below, write a brief executive summary for the opening slide of a stakeholder presentation.

<workshop_data>
${workshopData}
</workshop_data>

Return ONLY valid JSON — no markdown fences, no commentary:

{
  "executiveSummary": "string — 2-3 sentences synthesizing the core pain point, the proposed solution/idea, and why it matters. Write for executives.",
  "subtitle": "string — a compelling one-line subtitle/tagline for the presentation title slide"
}

RULES:
- Reference specific details from the workshop data (persona names, problem specifics, concept name)
- Keep the executive summary under 60 words
- Keep the subtitle under 15 words
- Return ONLY the JSON object`;
}

/** Shape returned by Gemini for the executive summary */
export interface PresentationSummary {
  executiveSummary: string;
  subtitle: string;
}

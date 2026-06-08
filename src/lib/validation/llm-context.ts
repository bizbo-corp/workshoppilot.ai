/**
 * Build the brief the Validate-step LLM calls (classification + riskiest-assumption) reason
 * over.
 *
 * IMPORTANT: workshop step content lives in two places. The structured extraction fields
 * (challenge.problemStatement, concept.concepts[]) are frequently ABSENT — these workshops
 * are canvas-first, so the real content is in each step's `_canvas` (sticky notes, concept
 * cards) and, most reliably, in the AI-written `stepSummaries`. Reading only the structured
 * fields yields an empty brief, which makes the model hallucinate a generic SaaS idea.
 *
 * So we ground the brief in the same sources the facilitator chat uses: the workshop's
 * original idea, the concept cards, and the per-step summaries (via assembleStepContext).
 */

import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { assembleStepContext } from '@/lib/context/assemble-context';

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export interface ConceptInfo {
  name: string | null;
  elevatorPitch: string | null;
  usp: string | null;
  ideaSource: string | null;
}

/**
 * All developed concepts for the workshop. Reads the canvas-first shape
 * (concept._canvas.conceptCards) first, falling back to the structured extraction shape
 * (concept.concepts) for older/extracted artifacts.
 */
export function getConceptCards(artifacts: AllWorkshopArtifacts): ConceptInfo[] {
  const concept = artifacts.concept as Record<string, unknown> | null;
  const canvas = concept?._canvas as { conceptCards?: unknown[] } | undefined;
  const cards = canvas?.conceptCards;
  if (Array.isArray(cards) && cards.length > 0) {
    return cards.map((raw) => {
      const c = raw as Record<string, unknown>;
      return {
        name: str(c.conceptName) ?? str(c.name),
        elevatorPitch: str(c.elevatorPitch),
        usp: str(c.usp),
        ideaSource: str(c.ideaSource),
      };
    });
  }
  const extracted = (concept as { concepts?: unknown[] } | null)?.concepts;
  if (Array.isArray(extracted)) {
    return extracted.map((raw) => {
      const c = raw as Record<string, unknown>;
      return {
        name: str(c.name),
        elevatorPitch: str(c.elevatorPitch),
        usp: str(c.usp),
        ideaSource: str(c.ideaSource),
      };
    });
  }
  return [];
}

/** The primary (first) concept, if any. */
export function primaryConcept(artifacts: AllWorkshopArtifacts): ConceptInfo | null {
  return getConceptCards(artifacts)[0] ?? null;
}

/** The concept being validated — the load-bearing subject for the LLM calls. */
export function conceptSubject(artifacts: AllWorkshopArtifacts): {
  name: string | null;
  pitch: string | null;
  usp: string | null;
  hasConcept: boolean;
} {
  const c = primaryConcept(artifacts);
  return {
    name: c?.name ?? null,
    pitch: c?.elevatorPitch ?? null,
    usp: c?.usp ?? null,
    hasConcept: !!c && (!!c.name || !!c.elevatorPitch),
  };
}

export interface ValidationBrief {
  brief: string;
  conceptName: string | null;
  hasContent: boolean;
}

/**
 * Load a grounded brief for the Validate-step LLM calls from the workshop's real content:
 * original idea + concept cards + per-step summaries.
 */
export async function loadValidationBrief(workshopId: string): Promise<ValidationBrief> {
  const [ctx, stepCtx, artifacts] = await Promise.all([
    loadWorkshopContext(workshopId),
    assembleStepContext(workshopId, 'validate'),
    loadAllWorkshopArtifacts(workshopId),
  ]);

  // assembleStepContext injects a sentinel string when no summaries exist — ignore it.
  const summaries =
    stepCtx.summaries && !stepCtx.summaries.startsWith('⚠️') ? stepCtx.summaries : '';
  const concept = conceptSubject(artifacts);

  const lines: string[] = [];
  if (ctx.originalIdea) lines.push(`THE ORIGINAL IDEA / SPARK:\n- ${ctx.originalIdea}`);
  if (ctx.title) lines.push(`WORKSHOP TITLE: ${ctx.title}`);
  if (ctx.problemStatement) lines.push(`THE PROBLEM:\n- ${ctx.problemStatement}`);
  if (ctx.reframedHmw) lines.push(`REFRAMED CHALLENGE:\n- ${ctx.reframedHmw}`);

  lines.push('\nTHE CONCEPT BEING VALIDATED (the thing under test — this is the subject):');
  if (concept.hasConcept) {
    lines.push(`- Name: ${concept.name ?? 'Untitled concept'}`);
    if (concept.pitch) lines.push(`- What it is: ${concept.pitch}`);
    if (concept.usp) lines.push(`- What makes it different: ${concept.usp}`);
  } else {
    lines.push('- Infer the concept from the workshop summary below.');
  }

  if (summaries) {
    lines.push(
      `\nWHAT HAPPENED IN THE WORKSHOP (ground truth — base everything on this, do not invent a different product):\n${summaries}`
    );
  }

  return {
    brief: lines.join('\n'),
    conceptName: concept.name,
    hasContent: !!(concept.hasConcept || summaries || ctx.originalIdea),
  };
}

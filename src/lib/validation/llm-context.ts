/**
 * Build a slim text context from upstream workshop artifacts for the Validate-step
 * LLM calls (output-type classification + riskiest-assumption proposal).
 *
 * Classify-once: we read the existing artifacts rather than re-running the workshop.
 */

import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Pull the primary concept (first) from the concept artifact, if present. */
export function primaryConcept(artifacts: AllWorkshopArtifacts): {
  name: string | null;
  elevatorPitch: string | null;
  usp: string | null;
  ideaSource: string | null;
} | null {
  const concepts = (artifacts.concept as { concepts?: unknown[] } | null)?.concepts;
  const first = Array.isArray(concepts) ? (concepts[0] as Record<string, unknown>) : null;
  if (!first) return null;
  return {
    name: str(first.name),
    elevatorPitch: str(first.elevatorPitch),
    usp: str(first.usp),
    ideaSource: str(first.ideaSource),
  };
}

/** Compact, human-readable summary of the workshop for prompting. */
export function buildValidationContext(artifacts: AllWorkshopArtifacts): string {
  const lines: string[] = [];

  const challenge = artifacts.challenge as Record<string, unknown> | null;
  if (challenge) {
    const problem = str(challenge.problemStatement);
    const outcome = str(challenge.desiredOutcome);
    const hmw = str(challenge.hmwStatement);
    if (problem) lines.push(`Problem: ${problem}`);
    if (outcome) lines.push(`Desired outcome: ${outcome}`);
    if (hmw) lines.push(`How-might-we: ${hmw}`);
  }

  const reframe = artifacts.reframe as Record<string, unknown> | null;
  const reframed = str(
    (reframe?.evolution as Record<string, unknown> | undefined)?.reframedStatement
  ) ?? str((reframe?.hmwStatements as string[] | undefined)?.[0]);
  if (reframed) lines.push(`Reframed challenge: ${reframed}`);

  const journey = artifacts.journeyMapping as Record<string, unknown> | null;
  const personaName = str(journey?.personaName);
  if (journey) {
    lines.push(
      `Journey map: ${personaName ? `for ${personaName}; ` : ''}${
        Array.isArray(journey.stages) ? journey.stages.length : 0
      } stages mapped.`
    );
  }

  const concept = primaryConcept(artifacts);
  if (concept) {
    lines.push(
      `Primary concept "${concept.name ?? 'Untitled'}": ${
        concept.elevatorPitch ?? ''
      } ${concept.usp ? `USP: ${concept.usp}` : ''}`.trim()
    );
  }

  return lines.length ? lines.join('\n') : 'No upstream artifacts available.';
}

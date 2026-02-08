/**
 * Context Architecture Types
 *
 * Defines the three-tier context system that prevents context degradation
 * across the 10-step design thinking workshop flow.
 */

/**
 * Context tiers in the hierarchical compression system
 *
 * - short-term: Verbatim chat messages (current step only)
 * - long-term: AI-generated summaries (previous steps)
 * - persistent: Structured JSON artifacts (all completed steps)
 */
export type ContextTier = 'short-term' | 'long-term' | 'persistent';

/**
 * Step context assembled for AI prompts
 *
 * Combines all three tiers into a single prompt context:
 * - persistentContext: Formatted JSON artifacts from completed steps
 * - summaries: AI-generated summaries from previous steps
 * - messages: Verbatim chat history for current step
 */
export interface StepContext {
  persistentContext: string; // Formatted JSON artifacts
  summaries: string; // AI-generated summaries
  messages: Array<{
    role: string;
    content: string;
  }>;
}

/**
 * Artifact record type (placeholder until Phase 9)
 *
 * In Phase 9, this becomes a discriminated union of step-specific Zod schemas.
 * For now, it's a generic Record to allow storage of any JSON structure.
 */
export type ArtifactRecord = Record<string, unknown>;

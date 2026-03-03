'use client';

import { useCallback } from 'react';

/**
 * Maps step IDs to the source files that define their dialogue prompts.
 * Used to auto-populate the technical marker when submitting feedback.
 */
const STEP_PROMPT_FILES: Record<string, { filePath: string; componentName: string }> = {
  'challenge':           { filePath: 'src/lib/ai/prompts/steps/01_challenge.ts',           componentName: 'challengeStep' },
  'stakeholder-mapping': { filePath: 'src/lib/ai/prompts/steps/02_stakeholder_mapping.ts', componentName: 'stakeholderMappingStep' },
  'user-research':       { filePath: 'src/lib/ai/prompts/steps/03_user_research.ts',       componentName: 'userResearchStep' },
  'sense-making':        { filePath: 'src/lib/ai/prompts/steps/04_sense_making.ts',        componentName: 'senseMakingStep' },
  'persona':             { filePath: 'src/lib/ai/prompts/steps/05_persona.ts',             componentName: 'personaStep' },
  'journey-mapping':     { filePath: 'src/lib/ai/prompts/steps/06_journey_mapping.ts',     componentName: 'journeyMappingStep' },
  'reframe':             { filePath: 'src/lib/ai/prompts/steps/07_reframe.ts',             componentName: 'reframeStep' },
  'ideation':            { filePath: 'src/lib/ai/prompts/steps/08_ideation.ts',            componentName: 'ideationStep' },
  'concept':             { filePath: 'src/lib/ai/prompts/steps/09_concept.ts',             componentName: 'conceptStep' },
  'validate':            { filePath: 'src/lib/ai/prompts/steps/10_validate.ts',            componentName: 'validateStep' },
};

/** Additional files involved in prompt assembly */
const SHARED_PROMPT_FILES = {
  chatConfig:       { filePath: 'src/lib/ai/chat-config.ts',               componentName: 'buildStepSystemPrompt' },
  arcPhases:        { filePath: 'src/lib/ai/prompts/arc-phases.ts',        componentName: 'getArcPhaseInstructions' },
  validation:       { filePath: 'src/lib/ai/prompts/validation-criteria.ts', componentName: 'getValidationCriteria' },
  chatRoute:        { filePath: 'src/app/api/chat/route.ts',               componentName: 'POST' },
  contextAssembly:  { filePath: 'src/lib/context/assemble-context.ts',     componentName: 'assembleStepContext' },
};

export interface DialogueFeedbackPayload {
  feedbackText: string;
  dialogueStepId: string;
  arcPhase?: string;
  filePath: string;
  componentName: string;
  contextSnapshot: Record<string, unknown>;
}

interface CaptureContext {
  stepId: string;
  arcPhase?: string;
  workshopId?: string;
  subStep?: string;
  /** Override the auto-detected file path (e.g. for chat-config or arc-phases feedback) */
  targetFile?: keyof typeof SHARED_PROMPT_FILES;
  /** Any extra context to include in the snapshot */
  extra?: Record<string, unknown>;
}

/**
 * Hook for capturing dialogue feedback with auto-populated technical markers.
 *
 * Usage:
 * ```tsx
 * const { submitFeedback } = useDialogueFeedback();
 * await submitFeedback('The greeting feels too generic', {
 *   stepId: 'challenge',
 *   arcPhase: 'orient',
 *   workshopId: 'ws_abc123',
 * });
 * ```
 */
export function useDialogueFeedback() {
  const submitFeedback = useCallback(
    async (feedbackText: string, context: CaptureContext) => {
      // Resolve technical marker
      const marker = context.targetFile
        ? SHARED_PROMPT_FILES[context.targetFile]
        : STEP_PROMPT_FILES[context.stepId] ?? {
            filePath: `src/lib/ai/prompts/steps/${context.stepId}.ts`,
            componentName: 'unknown',
          };

      // Build clean, serializable context snapshot
      const contextSnapshot: Record<string, unknown> = {
        stepId: context.stepId,
        arcPhase: context.arcPhase ?? null,
        workshopId: context.workshopId ?? null,
        subStep: context.subStep ?? null,
        promptFiles: {
          stepPrompt: STEP_PROMPT_FILES[context.stepId] ?? null,
          systemPromptBuilder: SHARED_PROMPT_FILES.chatConfig,
          arcPhaseInstructions: SHARED_PROMPT_FILES.arcPhases,
          chatRoute: SHARED_PROMPT_FILES.chatRoute,
          contextAssembly: SHARED_PROMPT_FILES.contextAssembly,
        },
        capturedAt: new Date().toISOString(),
        ...context.extra,
      };

      const payload: DialogueFeedbackPayload = {
        feedbackText,
        dialogueStepId: context.stepId,
        arcPhase: context.arcPhase,
        filePath: marker.filePath,
        componentName: marker.componentName,
        contextSnapshot,
      };

      const res = await fetch('/api/admin/dialogue-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `Failed to submit feedback: ${res.status}`);
      }

      return res.json();
    },
    [],
  );

  return { submitFeedback };
}

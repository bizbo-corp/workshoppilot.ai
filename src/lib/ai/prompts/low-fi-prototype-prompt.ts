/**
 * low-fi-prototype-prompt.ts
 *
 * Low-fidelity prototype prompt pipeline:
 *   1. buildLowFiPreamble()       — mandatory wireframe hard-rules preamble
 *   2. buildLowFiGeminiPrompt()   — meta-prompt sent to Gemini to write the body
 *   3. assembleLowFiPrompt()      — composes final prompt: preamble + scope line + body
 *   4. buildFallbackBody()        — deterministic body used when Gemini fails
 *   5. StoredPrototypePrompt      — build_packs JSON content shape (staleness metadata)
 *
 * Imports shared helpers from @/lib/journey-flow/prompt-builder (PROMPT-04 module).
 * The hi-fi path will import the same shared helpers with its own preamble/assembler.
 *
 * DO NOT import from journey-v0-prompt.ts or src/lib/journey-mapper/*.
 */

import type { TestScope } from '@/lib/journey-flow/types';
import {
  buildScreenDescriptions,
  buildNavigationSection,
} from '@/lib/journey-flow/prompt-builder';
import type { ScreenSpec, NavLink } from '@/lib/journey-flow/prompt-builder';

// Re-export shared types so callers can import from one place
export type { ScreenSpec, NavLink };

// ---------------------------------------------------------------------------
// StoredPrototypePrompt
// ---------------------------------------------------------------------------

/**
 * Shape of the JSON stored in build_packs under the 'Prototype Prompt:' title prefix.
 *
 * generatedFromFlowUpdatedAt is the Journey Flow row's updatedAt timestamp at the
 * time of generation — used for staleness detection (Pattern 4 from research).
 */
export interface StoredPrototypePrompt {
  promptText: string;
  generatedFromFlowUpdatedAt: string;
  testScope: TestScope;
  selectedConceptId?: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// buildLowFiPreamble
// ---------------------------------------------------------------------------

/**
 * The mandatory wireframe hard-rules preamble.
 *
 * This is a LOCKED DECISION — non-negotiable rules prepended to every low-fi
 * prompt regardless of what Gemini produces. Ensures PROMPT-02 compliance even
 * if the LLM ignores the style instructions in the meta-prompt.
 */
export function buildLowFiPreamble(): string {
  return `WIREFRAME PROTOTYPE INSTRUCTIONS (non-negotiable — do not deviate):
- Render in grayscale only. No color except black, white, and grays.
- Use the system default font. No custom fonts, icons, or branded assets.
- All UI elements are boxes and outlines only. No drop shadows, gradients, or polish.
- Placeholder images are labeled gray boxes (e.g. "[Image]", "[Logo]"). No real images.
- Include ONLY the elements needed to test the core idea. Strip everything decorative.
- Build a clickable prototype in your default stack: a single self-contained app, no backend, no external APIs.
- The goal is a clickable wireframe — sketch quality is correct and expected.`;
}

// ---------------------------------------------------------------------------
// buildLowFiGeminiPrompt
// ---------------------------------------------------------------------------

export interface LowFiGeminiPromptInput {
  brief: string;
  screens: ScreenSpec[];
  nav: NavLink[];
  testScope: TestScope;
  conceptName?: string | null;
}

/**
 * Build the meta-prompt sent to Gemini.
 *
 * Gemini's job: write the BODY of a prototype prompt for an AI coding agent.
 * It must produce three sections: WHAT THIS PROTOTYPE TESTS, SCREENS TO BUILD,
 * and NAVIGATION. The preamble (wireframe rules) is prepended by assembleLowFiPrompt
 * and must NOT be produced by Gemini.
 */
export function buildLowFiGeminiPrompt(input: LowFiGeminiPromptInput): string {
  const { brief, screens, nav, testScope, conceptName } = input;

  const screenDescriptions = buildScreenDescriptions(screens);
  const navLines = buildNavigationSection(nav);

  const featureScopeInstruction =
    testScope === 'feature'
      ? `IMPORTANT — SINGLE FEATURE SCOPE: This prototype covers a single feature mini-flow only (entry screen → action → result), NOT the full product journey.${conceptName ? ` The feature being tested is: "${conceptName}".` : ''} State this scope explicitly at the start of the WHAT THIS PROTOTYPE TESTS section.`
      : '';

  return `You are writing the BODY of a prototype prompt for an AI coding agent. The coding agent will receive a wireframe preamble (style rules) separately — do NOT include any styling, visual, or branding instructions in your output.

Your output will be used directly as instructions for building a clickable low-fidelity wireframe prototype. Write clearly and concisely for a technical audience.

${featureScopeInstruction ? `${featureScopeInstruction}\n\n` : ''}WORKSHOP BRIEF (ground all content in this — do not invent a different product):
---
${brief}
---

SCREENS TO BUILD (from the Journey Flow — keep all of these, exactly as named):
---
${screenDescriptions}
---

${navLines ? `NAVIGATION LINKS (from the Journey Flow):
---
${navLines}
---

` : ''}PRODUCE exactly this structure in plain text (no markdown code fences, no headings other than those specified):

WHAT THIS PROTOTYPE TESTS:
[Write 2–4 sentences. Cover: who the user is, the core problem they face, and the validation goal — what this wireframe is meant to prove or disprove. Ground everything in the workshop brief. Do not reference design aesthetics or tech stack here.]

SCREENS TO BUILD:
[For each screen listed above, write one block. Keep the exact screen name as the heading (e.g. "Screen: {name}"). Enrich the purpose and keyElements into 2–4 concrete sentences: what to render, what is interactive/clickable, and why it matters for the validation goal. Keep every screen. Do not invent new screens. Do not drop screens.]

NAVIGATION:
[Reproduce each navigation link as "- From → To". Then add a single sentence describing the user's path through the prototype — what journey they take from first screen to last.]

OUTPUT RULES (mandatory):
- Plain text only. No markdown code fences. No bold, italic, or bullet formatting except as shown above.
- No styling, visual, or branding instructions — the wireframe preamble handles all of that.
- No tech-stack requirements or framework recommendations.
- No sample-data or placeholder-data instructions.
- Do not add sections beyond the three listed above.`;
}

// ---------------------------------------------------------------------------
// assembleLowFiPrompt
// ---------------------------------------------------------------------------

/**
 * Compose the FINAL prompt text.
 *
 * Structure: preamble + blank line + (feature scope line if applicable) + body.
 *
 * The preamble is always prepended deterministically regardless of LLM output,
 * guaranteeing PROMPT-02's mandatory wireframe rules.
 */
export function assembleLowFiPrompt(
  body: string,
  opts: { testScope: TestScope }
): string {
  const parts: string[] = [buildLowFiPreamble()];

  if (opts.testScope === 'feature') {
    parts.push(
      'SCOPE: Single-feature prototype — build only the mini-flow screens below, not a full product journey.'
    );
  }

  parts.push(body.trim());

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// buildFallbackBody
// ---------------------------------------------------------------------------

export interface FallbackBodyInput {
  brief: string;
  screens: ScreenSpec[];
  nav: NavLink[];
}

/**
 * Deterministic non-LLM body used when Gemini fails or produces invalid output.
 *
 * Produces the same three-section structure as the Gemini path, using raw
 * journey flow data and the first ~8 lines of the workshop brief.
 */
export function buildFallbackBody(input: FallbackBodyInput): string {
  const { brief, screens, nav } = input;

  // Use the first ~8 lines of the brief to keep the fallback concise
  const briefPreview = brief
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(0, 8)
    .join('\n');

  const screenDescriptions = buildScreenDescriptions(screens);
  const navLines = buildNavigationSection(nav);

  const sections: string[] = [
    `WHAT THIS PROTOTYPE TESTS:\n${briefPreview}`,
    `SCREENS TO BUILD:\n${screenDescriptions}`,
  ];

  if (navLines) {
    sections.push(`NAVIGATION:\n${navLines}`);
  }

  return sections.join('\n\n');
}

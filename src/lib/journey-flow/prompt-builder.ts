/**
 * prompt-builder.ts — PROMPT-04 shared boundary
 *
 * Fidelity-agnostic pure functions for parsing a Journey Flow into structured
 * data suitable for prompt generation. Both the low-fi path (Phase 66) and the
 * future hi-fi path import from this module — each brings its own preamble,
 * Gemini meta-prompt, and fallback assembler.
 *
 * CONSTRAINTS: No DB imports, no React, no AI SDK. Pure TypeScript only.
 */

import type {
  JourneyFlowNode,
  JourneyFlowEdge,
  JourneyFlowUiType,
  JourneyFlowPriority,
} from './types';
import { UI_TYPE_LABELS } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScreenSpec {
  name: string;
  uiType: JourneyFlowUiType;
  purpose: string;
  keyElements: string[];
  addressesPain?: string;
  priority: JourneyFlowPriority;
}

export interface NavLink {
  from: string; // source node name
  to: string;   // target node name
}

// ---------------------------------------------------------------------------
// parseScreensFromFlow
// ---------------------------------------------------------------------------

/**
 * Parse a saved flow into screens + navigation.
 *
 * Annotation nodes (isAnnotation: true) are excluded from both the screens list
 * and the nav links — they are product meta-nodes that explain two-sided market
 * dynamics and must never appear as screens in a generated prompt.
 */
export function parseScreensFromFlow(
  nodes: JourneyFlowNode[],
  edges: JourneyFlowEdge[]
): { screens: ScreenSpec[]; nav: NavLink[] } {
  // Build a set of annotation node IDs for fast lookup
  const annotationIds = new Set<string>(
    nodes.filter((n) => n.isAnnotation).map((n) => n.id)
  );

  // Map all node IDs → names (including annotation nodes, needed for edge lookup)
  const nameById = new Map<string, string>(nodes.map((n) => [n.id, n.name]));

  // Screens: non-annotation nodes only
  const screens: ScreenSpec[] = nodes
    .filter((n) => !n.isAnnotation)
    .map((n) => ({
      name: n.name,
      uiType: n.uiType,
      purpose: n.purpose,
      keyElements: n.keyElements,
      ...(n.addressesPain ? { addressesPain: n.addressesPain } : {}),
      priority: n.priority,
    }));

  // Nav: map edges to named links, then filter out annotation-touching links
  const nav: NavLink[] = edges
    .map((e) => ({
      from: nameById.get(e.sourceNodeId) ?? '',
      to: nameById.get(e.targetNodeId) ?? '',
      sourceId: e.sourceNodeId,
      targetId: e.targetNodeId,
    }))
    .filter(
      (link) =>
        // Both endpoints must be named
        link.from.trim().length > 0 &&
        link.to.trim().length > 0 &&
        // Neither endpoint may be an annotation node
        !annotationIds.has(link.sourceId) &&
        !annotationIds.has(link.targetId)
    )
    .map(({ from, to }) => ({ from, to }));

  return { screens, nav };
}

// ---------------------------------------------------------------------------
// buildScreenDescriptions
// ---------------------------------------------------------------------------

/**
 * Deterministic plain-text section describing each screen.
 *
 * Emits one block per screen:
 *   ### {name}
 *   Type: {UI_TYPE_LABELS[uiType]}
 *   Purpose: {purpose}       (omitted when empty)
 *   Include: {key, elements} (omitted when empty array)
 *   Addresses: {addressesPain} (omitted when undefined)
 *
 * Blocks are separated by a blank line.
 */
export function buildScreenDescriptions(screens: ScreenSpec[]): string {
  return screens
    .map((s) => {
      const lines: string[] = [`### ${s.name}`, `Type: ${UI_TYPE_LABELS[s.uiType]}`];

      if (s.purpose && s.purpose.trim()) {
        lines.push(`Purpose: ${s.purpose.trim()}`);
      }

      if (s.keyElements.length > 0) {
        lines.push(`Include: ${s.keyElements.join(', ')}`);
      }

      if (s.addressesPain) {
        lines.push(`Addresses: ${s.addressesPain}`);
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// buildNavigationSection
// ---------------------------------------------------------------------------

/**
 * Deterministic plain-text navigation lines.
 *
 * Returns heading-free body — just "- {from} → {to}" lines joined by newlines.
 * Returns an empty string when nav is empty.
 * Callers are responsible for adding their own section heading.
 */
export function buildNavigationSection(nav: NavLink[]): string {
  if (nav.length === 0) return '';
  return nav.map((link) => `- ${link.from} → ${link.to}`).join('\n');
}

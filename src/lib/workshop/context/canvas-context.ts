/**
 * Canvas Context Assembly Module
 * Assembles AI-readable context strings from canvas post-its, with step-specific grouping
 * Step 2 (Stakeholder Mapping): Groups by Power-Interest quadrant
 * Step 4 (Sense Making): Groups by Empathy Map quadrant
 * Other steps: Flat list of post-it text
 */

import type { PostIt } from '@/stores/canvas-store';
import type { Quadrant } from '@/lib/canvas/quadrant-detection';
import { getQuadrantLabel } from '@/lib/canvas/quadrant-detection';

/**
 * Assemble stakeholder canvas context for Step 2 (Stakeholder Mapping)
 * Groups post-its by Power-Interest quadrant
 */
export function assembleStakeholderCanvasContext(postIts: PostIt[]): string {
  // Filter out group nodes
  const items = postIts.filter(p => !p.type || p.type === 'postIt');

  if (items.length === 0) return '';

  // Define quadrant order
  const quadrantOrder: Array<Quadrant> = [
    'high-power-high-interest',
    'high-power-low-interest',
    'low-power-high-interest',
    'low-power-low-interest',
  ];

  // Group by quadrant
  const grouped = new Map<Quadrant | 'unassigned', PostIt[]>();
  items.forEach(item => {
    const key = item.quadrant || 'unassigned';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  });

  // Build sections
  const sections: string[] = [];

  // Add sections in order
  quadrantOrder.forEach(quadrant => {
    const quadrantItems = grouped.get(quadrant);
    if (quadrantItems && quadrantItems.length > 0) {
      const label = getQuadrantLabel(quadrant);
      const count = quadrantItems.length;
      const itemList = quadrantItems
        .map(p => `- ${p.text}`)
        .join('\n');
      sections.push(`**${label}** (${count} stakeholder${count > 1 ? 's' : ''}):\n${itemList}`);
    }
  });

  // Add unassigned section if any
  const unassigned = grouped.get('unassigned');
  if (unassigned && unassigned.length > 0) {
    const itemList = unassigned
      .map(p => `- ${p.text}`)
      .join('\n');
    sections.push(`**Unassigned**:\n${itemList}`);
  }

  return sections.join('\n\n');
}

/**
 * Assemble empathy map canvas context for Step 4 (Sense Making)
 * Groups post-its by Empathy Map quadrant
 */
export function assembleEmpathyMapCanvasContext(postIts: PostIt[]): string {
  // Filter out group nodes
  const items = postIts.filter(p => !p.type || p.type === 'postIt');

  if (items.length === 0) return '';

  // Define quadrant order
  const quadrantOrder: Array<Quadrant> = [
    'said',
    'thought',
    'felt',
    'experienced',
  ];

  // Group by quadrant
  const grouped = new Map<Quadrant | 'unassigned', PostIt[]>();
  items.forEach(item => {
    const key = item.quadrant || 'unassigned';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  });

  // Build sections
  const sections: string[] = [];

  // Add sections in order
  quadrantOrder.forEach(quadrant => {
    const quadrantItems = grouped.get(quadrant);
    if (quadrantItems && quadrantItems.length > 0) {
      const label = getQuadrantLabel(quadrant);
      const itemList = quadrantItems
        .map(p => `- ${p.text}`)
        .join('\n');
      sections.push(`**${label}**:\n${itemList}`);
    }
  });

  // Add unassigned section if any
  const unassigned = grouped.get('unassigned');
  if (unassigned && unassigned.length > 0) {
    const itemList = unassigned
      .map(p => `- ${p.text}`)
      .join('\n');
    sections.push(`**Unassigned**:\n${itemList}`);
  }

  return sections.join('\n\n');
}

/**
 * Assemble canvas context for a specific step
 * Routes to step-specific assembly function based on stepId
 */
export function assembleCanvasContextForStep(stepId: string, postIts: PostIt[]): string {
  // Filter out group nodes first
  const items = postIts.filter(p => !p.type || p.type === 'postIt');

  if (items.length === 0) return '';

  // Route to step-specific assembly
  if (stepId === 'stakeholder-mapping') {
    return assembleStakeholderCanvasContext(postIts);
  } else if (stepId === 'sense-making') {
    return assembleEmpathyMapCanvasContext(postIts);
  } else {
    // Default: flat list for non-quadrant steps
    const itemList = items
      .map(p => `- ${p.text}`)
      .join('\n');
    return `Canvas items:\n${itemList}`;
  }
}

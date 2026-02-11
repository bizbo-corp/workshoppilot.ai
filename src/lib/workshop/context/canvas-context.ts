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
 * Assemble journey map canvas context for Step 6 (Journey Mapping)
 * Groups post-its by grid row (swimlane) and column (journey stage)
 */
export function assembleJourneyMapCanvasContext(postIts: PostIt[]): string {
  // Filter out group nodes and preview nodes
  const items = postIts.filter(p => (!p.type || p.type === 'postIt') && !p.isPreview);

  if (items.length === 0) return '';

  // Group by row first, then by column
  const rowGroups = new Map<string, Map<string, PostIt[]>>();
  const unplaced: PostIt[] = [];

  items.forEach(item => {
    if (!item.cellAssignment) {
      unplaced.push(item);
      return;
    }

    const { row, col } = item.cellAssignment;
    if (!rowGroups.has(row)) {
      rowGroups.set(row, new Map());
    }
    const colGroups = rowGroups.get(row)!;
    if (!colGroups.has(col)) {
      colGroups.set(col, []);
    }
    colGroups.get(col)!.push(item);
  });

  // Define row order (matches GridConfig order)
  const rowOrder = [
    'actions',
    'goals',
    'barriers',
    'touchpoints',
    'emotions',
    'moments',
    'opportunities',
  ];

  // Define row labels
  const rowLabels: Record<string, string> = {
    actions: 'Actions',
    goals: 'Goals',
    barriers: 'Barriers',
    touchpoints: 'Touchpoints',
    emotions: 'Emotions',
    moments: 'Moments of Truth',
    opportunities: 'Opportunities',
  };

  // Build sections
  const sections: string[] = [];

  rowOrder.forEach(rowId => {
    const colGroups = rowGroups.get(rowId);
    if (!colGroups || colGroups.size === 0) return;

    const rowLabel = rowLabels[rowId] || rowId;
    const colSections: string[] = [];

    // Iterate through columns in order
    ['awareness', 'consideration', 'decision', 'purchase', 'onboarding'].forEach(colId => {
      const colItems = colGroups.get(colId);
      if (colItems && colItems.length > 0) {
        const colLabel = colId.charAt(0).toUpperCase() + colId.slice(1);
        const itemList = colItems.map(p => p.text).join(', ');
        colSections.push(`  ${colLabel}: ${itemList}`);
      }
    });

    if (colSections.length > 0) {
      sections.push(`**${rowLabel}:**\n${colSections.join('\n')}`);
    }
  });

  // Add unplaced section if any
  if (unplaced.length > 0) {
    const itemList = unplaced
      .map(p => `- ${p.text}`)
      .join('\n');
    sections.push(`**Unplaced:**\n${itemList}`);
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
  // Filter out group nodes and preview nodes first
  const items = postIts.filter(p => (!p.type || p.type === 'postIt') && !p.isPreview);

  if (items.length === 0) return '';

  // Route to step-specific assembly
  if (stepId === 'stakeholder-mapping') {
    return assembleStakeholderCanvasContext(postIts);
  } else if (stepId === 'sense-making') {
    return assembleEmpathyMapCanvasContext(postIts);
  } else if (stepId === 'journey-mapping') {
    return assembleJourneyMapCanvasContext(postIts);
  } else {
    // Default: flat list for non-quadrant/non-grid steps
    const itemList = items
      .map(p => `- ${p.text}`)
      .join('\n');
    return `Canvas items:\n${itemList}`;
  }
}

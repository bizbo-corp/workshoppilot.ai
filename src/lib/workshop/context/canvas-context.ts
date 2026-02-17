/**
 * Canvas Context Assembly Module
 * Assembles AI-readable context strings from canvas post-its, with step-specific grouping
 * Step 2 (Stakeholder Mapping): Groups by ring + cluster hierarchy
 * Step 4 (Sense Making): Groups by Empathy Map quadrant
 * Other steps: Flat list of post-it text
 */

import type { PostIt, GridColumn } from '@/stores/canvas-store';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';

/** Ring display order and labels */
const RING_ORDER = ['inner', 'middle', 'outer'] as const;
const RING_LABELS: Record<string, string> = {
  inner: 'Inner Ring',
  middle: 'Middle Ring',
  outer: 'Outer Ring',
};

/**
 * Assemble stakeholder canvas context for Step 2 (Stakeholder Mapping)
 * Groups post-its by ring (cellAssignment.row) with cluster hierarchy
 */
export function assembleStakeholderCanvasContext(postIts: PostIt[]): string {
  // Filter out group nodes and preview nodes
  const items = postIts.filter(p => (!p.type || p.type === 'postIt') && !p.isPreview);

  if (items.length === 0) return '';

  // Build cluster lookup: clusterName → children
  const clusterChildren = new Map<string, PostIt[]>();
  const clusterParentTexts = new Set<string>();

  for (const item of items) {
    if (item.cluster) {
      const key = item.cluster.toLowerCase();
      if (!clusterChildren.has(key)) clusterChildren.set(key, []);
      clusterChildren.get(key)!.push(item);
      clusterParentTexts.add(key);
    }
  }

  // Group items by ring
  const ringGroups = new Map<string, PostIt[]>();
  for (const item of items) {
    const ring = item.cellAssignment?.row || 'unassigned';
    if (!ringGroups.has(ring)) ringGroups.set(ring, []);
    ringGroups.get(ring)!.push(item);
  }

  // Build sections
  const sections: string[] = [];

  const renderRingSection = (ringId: string, ringItems: PostIt[]) => {
    const label = RING_LABELS[ringId] || ringId;
    const lines: string[] = [];

    // Separate into: cluster parents, cluster children, standalone
    const childIds = new Set<string>();
    for (const children of clusterChildren.values()) {
      for (const child of children) childIds.add(child.id);
    }

    const parents: PostIt[] = [];
    const standalone: PostIt[] = [];

    for (const item of ringItems) {
      if (childIds.has(item.id)) continue; // rendered under parent
      if (clusterParentTexts.has(item.text.toLowerCase())) {
        parents.push(item);
      } else {
        standalone.push(item);
      }
    }

    // Render parents with indented children
    for (const parent of parents) {
      const children = clusterChildren.get(parent.text.toLowerCase()) || [];
      lines.push(`- ${parent.text}`);
      for (const child of children) {
        lines.push(`  - ${child.text} [cluster: ${parent.text}]`);
      }
    }

    // Render standalone items
    for (const item of standalone) {
      lines.push(`- ${item.text}`);
    }

    if (lines.length > 0) {
      const count = ringItems.length;
      sections.push(`**${label}** (${count} stakeholder${count > 1 ? 's' : ''}):\n${lines.join('\n')}`);
    }
  };

  // Render rings in order
  for (const ringId of RING_ORDER) {
    const ringItems = ringGroups.get(ringId);
    if (ringItems && ringItems.length > 0) {
      renderRingSection(ringId, ringItems);
    }
  }

  // Render unassigned
  const unassigned = ringGroups.get('unassigned');
  if (unassigned && unassigned.length > 0) {
    const lines = unassigned.map(p => `- ${p.text}`);
    sections.push(`**Unassigned**:\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Assemble journey map canvas context for Step 6 (Journey Mapping)
 * Groups post-its by grid row (swimlane) and column (journey stage)
 *
 * @param postIts - Canvas post-its
 * @param gridColumns - Dynamic grid columns (user-editable). Falls back to defaults if empty.
 */
export function assembleJourneyMapCanvasContext(postIts: PostIt[], gridColumns?: GridColumn[]): string {
  // Filter out group nodes and preview nodes
  const items = postIts.filter(p => (!p.type || p.type === 'postIt') && !p.isPreview);

  // Determine column order: use dynamic gridColumns if provided, else defaults
  const defaultColumns: Array<{ id: string; label: string }> = [
    { id: 'awareness', label: 'Awareness' },
    { id: 'consideration', label: 'Consideration' },
    { id: 'decision', label: 'Decision' },
    { id: 'purchase', label: 'Purchase' },
    { id: 'onboarding', label: 'Onboarding' },
  ];
  const columns = gridColumns && gridColumns.length > 0 ? gridColumns : defaultColumns;

  // If no items but columns exist, return column structure so AI knows available columns
  if (items.length === 0 && columns.length > 0) {
    const colList = columns.map(c => `${c.id} ("${c.label}")`).join(', ');
    return `Journey map columns: ${colList}\nNo items placed yet.`;
  }

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

  // Add column header for AI reference
  const colList = columns.map(c => `${c.id} ("${c.label}")`).join(', ');
  sections.push(`Journey map columns: ${colList}`);

  rowOrder.forEach(rowId => {
    const colGroups = rowGroups.get(rowId);
    if (!colGroups || colGroups.size === 0) return;

    const rowLabel = rowLabels[rowId] || rowId;
    const colSections: string[] = [];

    // Iterate through dynamic columns in order
    columns.forEach(col => {
      const colItems = colGroups.get(col.id);
      if (colItems && colItems.length > 0) {
        const itemList = colItems.map(p => p.text).join(', ');
        colSections.push(`  ${col.label}: ${itemList}`);
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
 * Empathy zone display labels
 */
const EMPATHY_ZONE_LABELS: Record<string, string> = {
  says: 'Says',
  thinks: 'Thinks',
  feels: 'Feels',
  does: 'Does',
  pains: 'Pains',
  gains: 'Gains',
  // Legacy names
  said: 'Says',
  thought: 'Thinks',
  felt: 'Feels',
  experienced: 'Does',
};

/**
 * Assemble empathy map canvas context for Step 4 (Sense Making)
 * Groups post-its by empathy zone (stored in cellAssignment.row)
 */
export function assembleEmpathyMapCanvasContext(postIts: PostIt[]): string {
  // Filter out group nodes
  const items = postIts.filter(p => !p.type || p.type === 'postIt');

  if (items.length === 0) return '';

  // Define zone order: 4 empathy quadrants + pains/gains
  const zoneOrder = ['says', 'thinks', 'feels', 'does', 'pains', 'gains'];

  // Group by zone — empathy zone items use cellAssignment.row, legacy items use quadrant
  const grouped = new Map<string, PostIt[]>();
  items.forEach(item => {
    const key = item.cellAssignment?.row || item.quadrant || 'unassigned';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  });

  // Build sections
  const sections: string[] = [];

  // Add sections in order
  zoneOrder.forEach(zone => {
    const zoneItems = grouped.get(zone);
    if (zoneItems && zoneItems.length > 0) {
      const label = EMPATHY_ZONE_LABELS[zone] || zone;
      const itemList = zoneItems
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
 * Assemble persona template canvas context for Step 5 (Persona)
 * Formats the persona template card data as structured text the AI can reference
 */
export function assemblePersonaCanvasContext(personaTemplates: PersonaTemplateData[]): string {
  if (personaTemplates.length === 0) return '';

  const sections: string[] = [];

  for (const template of personaTemplates) {
    const lines: string[] = ['**Persona Template Card** (single card on canvas):'];

    // Identity section
    if (template.archetype || template.archetypeRole) {
      lines.push(`Archetype: ${template.archetype || '(empty)'} — ${template.archetypeRole || '(empty)'}`);
    }
    if (template.name || template.age || template.job) {
      const parts = [
        template.name || '(no name)',
        template.age ? `age ${template.age}` : null,
        template.job || null,
      ].filter(Boolean);
      lines.push(`Identity: ${parts.join(', ')}`);
    }

    // Empathy map insights
    const empathyFields = [
      { key: 'empathySays', label: 'Says' },
      { key: 'empathyThinks', label: 'Thinks' },
      { key: 'empathyFeels', label: 'Feels' },
      { key: 'empathyDoes', label: 'Does' },
      { key: 'empathyPains', label: 'Pains' },
      { key: 'empathyGains', label: 'Gains' },
    ];
    const hasEmpathy = empathyFields.some(f => template[f.key as keyof PersonaTemplateData]);
    if (hasEmpathy) {
      lines.push('Empathy Map Insights:');
      for (const { key, label } of empathyFields) {
        const value = template[key as keyof PersonaTemplateData] as string | undefined;
        if (value) {
          lines.push(`  ${label}: ${value}`);
        }
      }
    } else {
      lines.push('Empathy Map Insights: (all empty — you should populate these from Step 4 research)');
    }

    // AI-filled sections
    if (template.narrative) {
      lines.push(`Narrative: ${template.narrative}`);
    } else {
      lines.push('Narrative: (not yet drafted — you should draft this)');
    }

    if (template.quote) {
      lines.push(`Quote: "${template.quote}"`);
    } else {
      lines.push('Quote: (not yet drafted — you should draft this)');
    }

    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Assemble canvas context for a specific step
 * Routes to step-specific assembly function based on stepId
 */
export function assembleCanvasContextForStep(stepId: string, postIts: PostIt[], gridColumns?: GridColumn[], personaTemplates?: PersonaTemplateData[]): string {
  // For journey-mapping, always return context (even if no items) so AI sees column structure
  if (stepId === 'journey-mapping') {
    return assembleJourneyMapCanvasContext(postIts, gridColumns);
  }

  // Persona step uses template cards, not post-its — check before filtering
  if (stepId === 'persona' && personaTemplates && personaTemplates.length > 0) {
    return assemblePersonaCanvasContext(personaTemplates);
  }

  // Filter out group nodes and preview nodes first
  const items = postIts.filter(p => (!p.type || p.type === 'postIt') && !p.isPreview);

  if (items.length === 0) return '';

  // Route to step-specific assembly
  if (stepId === 'stakeholder-mapping') {
    return assembleStakeholderCanvasContext(postIts);
  } else if (stepId === 'sense-making') {
    return assembleEmpathyMapCanvasContext(postIts);
  } else {
    // Default: flat list for non-quadrant/non-grid steps
    const itemList = items
      .map(p => `- ${p.text}`)
      .join('\n');
    return `Canvas items:\n${itemList}`;
  }
}

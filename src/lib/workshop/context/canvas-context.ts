/**
 * Canvas Context Assembly Module
 * Assembles AI-readable context strings from canvas sticky notes, with step-specific grouping
 * Step 2 (Stakeholder Mapping): Groups by ring + cluster hierarchy
 * Step 4 (Sense Making): Groups by Empathy Map quadrant
 * Other steps: Flat list of sticky note text
 */

import type { StickyNote, GridColumn } from '@/stores/canvas-store';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';

/** Ring display order and labels */
const RING_ORDER = ['inner', 'middle', 'outer'] as const;
const RING_LABELS: Record<string, string> = {
  inner: 'Inner Ring',
  middle: 'Middle Ring',
  outer: 'Outer Ring',
};

/**
 * Assemble stakeholder canvas context for Step 2 (Stakeholder Mapping)
 * Groups sticky notes by ring (cellAssignment.row) with cluster hierarchy
 */
export function assembleStakeholderCanvasContext(stickyNotes: StickyNote[]): string {
  // Filter out group nodes and preview nodes
  const items = stickyNotes.filter(p => (!p.type || p.type === 'stickyNote') && !p.isPreview);

  if (items.length === 0) return '';

  // Build cluster lookup: clusterName → children
  const clusterChildren = new Map<string, StickyNote[]>();
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
  const ringGroups = new Map<string, StickyNote[]>();
  for (const item of items) {
    const ring = item.cellAssignment?.row || 'unassigned';
    if (!ringGroups.has(ring)) ringGroups.set(ring, []);
    ringGroups.get(ring)!.push(item);
  }

  // Build sections
  const sections: string[] = [];

  const renderRingSection = (ringId: string, ringItems: StickyNote[]) => {
    const label = RING_LABELS[ringId] || ringId;
    const lines: string[] = [];

    // Separate into: cluster parents, cluster children, standalone
    const childIds = new Set<string>();
    for (const children of clusterChildren.values()) {
      for (const child of children) childIds.add(child.id);
    }

    const parents: StickyNote[] = [];
    const standalone: StickyNote[] = [];

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
 * Groups sticky notes by grid row (swimlane) and column (journey stage)
 *
 * @param stickyNotes - Canvas sticky notes
 * @param gridColumns - Dynamic grid columns (user-editable). Falls back to defaults if empty.
 */
export function assembleJourneyMapCanvasContext(stickyNotes: StickyNote[], gridColumns?: GridColumn[]): string {
  // Filter out group nodes and preview nodes
  const items = stickyNotes.filter(p => (!p.type || p.type === 'stickyNote') && !p.isPreview);

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
  const rowGroups = new Map<string, Map<string, StickyNote[]>>();
  const unplaced: StickyNote[] = [];

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
 * Groups sticky notes by empathy zone (stored in cellAssignment.row)
 */
export function assembleEmpathyMapCanvasContext(stickyNotes: StickyNote[]): string {
  // Filter out group nodes
  const items = stickyNotes.filter(p => !p.type || p.type === 'stickyNote');

  if (items.length === 0) return '';

  // Define zone order: 4 empathy quadrants + pains/gains
  const zoneOrder = ['says', 'thinks', 'feels', 'does', 'pains', 'gains'];

  // Group by zone — empathy zone items use cellAssignment.row, legacy items use quadrant
  const grouped = new Map<string, StickyNote[]>();
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
 * Assemble HMW card canvas context for Step 7 (Reframe)
 * Formats HMW card data showing current field values and card state
 */
export function assembleHmwCardCanvasContext(hmwCards: HmwCardData[]): string {
  if (hmwCards.length === 0) return '';

  const sections: string[] = [];

  for (const card of hmwCards) {
    const lines: string[] = [`**HMW Card${card.cardIndex !== undefined && card.cardIndex > 0 ? ` #${card.cardIndex + 1} (Alternative)` : ''}** (state: ${card.cardState}):`];

    const fields = [
      { key: 'givenThat', label: 'Given that' },
      { key: 'persona', label: 'How might we help' },
      { key: 'immediateGoal', label: 'Do/be/feel/achieve' },
      { key: 'deeperGoal', label: 'So they can' },
    ];

    for (const { key, label } of fields) {
      const value = card[key as keyof HmwCardData] as string | undefined;
      if (value) {
        lines.push(`  ${label}: ${value}`);
      } else {
        lines.push(`  ${label}: (empty)`);
      }
    }

    if (card.fullStatement) {
      lines.push(`Complete statement: "${card.fullStatement}"`);
    }

    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Assemble user research canvas context for Step 3 (User Research)
 * Groups sticky notes by cluster (persona name) so the AI sees which insights
 * came from which persona interview
 */
export function assembleUserResearchCanvasContext(stickyNotes: StickyNote[]): string {
  const items = stickyNotes.filter(p => (!p.type || p.type === 'stickyNote') && !p.isPreview);

  if (items.length === 0) return '';

  // Separate persona cards (no cluster) from interview insights (have cluster)
  const personaCards: StickyNote[] = [];
  const insightsByPersona = new Map<string, StickyNote[]>();

  for (const item of items) {
    if (item.cluster) {
      const key = item.cluster;
      if (!insightsByPersona.has(key)) insightsByPersona.set(key, []);
      insightsByPersona.get(key)!.push(item);
    } else {
      personaCards.push(item);
    }
  }

  const sections: string[] = [];

  // List persona cards
  if (personaCards.length > 0) {
    const cardList = personaCards.map(p => `- ${p.text}`).join('\n');
    sections.push(`**Persona Cards** (${personaCards.length}):\n${cardList}`);
  }

  // Group insights by persona
  for (const [persona, insights] of insightsByPersona) {
    const insightList = insights.map(p => `- ${p.text}`).join('\n');
    sections.push(`**${persona}** (${insights.length} insight${insights.length > 1 ? 's' : ''}):\n${insightList}`);
  }

  return sections.join('\n\n');
}

/**
 * Assemble canvas context for a specific step
 * Routes to step-specific assembly function based on stepId
 */
export function assembleCanvasContextForStep(stepId: string, stickyNotes: StickyNote[], gridColumns?: GridColumn[], personaTemplates?: PersonaTemplateData[], hmwCards?: HmwCardData[]): string {
  // For journey-mapping, always return context (even if no items) so AI sees column structure
  if (stepId === 'journey-mapping') {
    return assembleJourneyMapCanvasContext(stickyNotes, gridColumns);
  }

  // Reframe step uses HMW cards
  if (stepId === 'reframe' && hmwCards && hmwCards.length > 0) {
    return assembleHmwCardCanvasContext(hmwCards);
  }

  // Persona step uses template cards, not sticky notes — check before filtering
  if (stepId === 'persona' && personaTemplates && personaTemplates.length > 0) {
    return assemblePersonaCanvasContext(personaTemplates);
  }

  // Challenge step: report template card state so the AI knows which cards are filled
  if (stepId === 'challenge') {
    const templateStickyNotes = stickyNotes.filter(p => p.templateKey);
    if (templateStickyNotes.length > 0) {
      const lines = templateStickyNotes.map(p => {
        const filled = p.text?.trim().length > 0;
        const status = filled ? 'filled' : 'empty';
        const content = filled ? p.text.trim() : '(not yet filled)';
        return `- [${p.templateLabel || p.templateKey}] (key: ${p.templateKey}, ${status}): ${content}`;
      });
      let result = `Template cards:\n${lines.join('\n')}`;
      // Also include any non-template sticky notes (user-added)
      const regularItems = stickyNotes.filter(p => !p.templateKey && (!p.type || p.type === 'stickyNote') && !p.isPreview && p.text?.trim());
      if (regularItems.length > 0) {
        const regularLines = regularItems.map(p => `- ${p.text.trim()}`);
        result += `\n\nAdditional canvas items:\n${regularLines.join('\n')}`;
      }
      return result;
    }
    // Fall through to default if no template sticky notes (legacy workshops)
  }

  // Filter out group nodes and preview nodes first
  const items = stickyNotes.filter(p => (!p.type || p.type === 'stickyNote') && !p.isPreview);

  if (items.length === 0) return '';

  // Route to step-specific assembly
  if (stepId === 'stakeholder-mapping') {
    return assembleStakeholderCanvasContext(stickyNotes);
  } else if (stepId === 'user-research') {
    return assembleUserResearchCanvasContext(stickyNotes);
  } else if (stepId === 'sense-making') {
    return assembleEmpathyMapCanvasContext(stickyNotes);
  } else {
    // Default: flat list for non-quadrant/non-grid steps
    const itemList = items
      .map(p => `- ${p.text}`)
      .join('\n');
    return `Canvas items:\n${itemList}`;
  }
}

import type { JourneyMapperState, JourneyMapperNode, JourneyStageColumn, UiType } from '@/lib/journey-mapper/types';
import { normalizeIntent, isMarketingIntent } from '@/lib/journey-mapper/types';

const UI_TYPE_COMPONENT_HINTS: Record<UiType, string> = {
  dashboard: 'dashboard layout with sidebar navigation, key metrics cards, and data visualizations',
  'landing-page': 'landing page with hero section, feature highlights, and call-to-action buttons',
  form: 'form with labeled inputs, validation states, and submit button',
  table: 'data table with sortable columns, search/filter bar, and row actions',
  'detail-view': 'detail view with header, content sections, and action buttons',
  wizard: 'multi-step wizard with progress indicator, step content, and navigation buttons',
  modal: 'modal dialog with header, body content, and action buttons',
  settings: 'settings page with categorized sections, toggles, and save button',
};

/**
 * Build a v0-optimized prompt from the journey mapper state.
 * Dispatches to intent-specific builders using normalized intent.
 */
export function buildJourneyAwareV0Prompt(state: JourneyMapperState): string {
  const normalized = normalizeIntent(state.strategicIntent);

  switch (normalized) {
    case 'marketing-site':
      return buildBrochureV0Prompt(state);
    case 'admin-portal':
      return buildAdminPortalV0Prompt(state);
    case 'dashboard':
      return buildDashboardV0Prompt(state);
    case 'tool':
      return buildToolV0Prompt(state);
    case 'web-app':
    default:
      return buildAppV0Prompt(state);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupNodesByStage(nodes: JourneyMapperNode[], stages: JourneyStageColumn[]) {
  const nodesByStage = new Map<string, JourneyMapperNode[]>();
  for (const node of nodes) {
    const existing = nodesByStage.get(node.stageId) || [];
    existing.push(node);
    nodesByStage.set(node.stageId, existing);
  }
  return nodesByStage;
}

function getConceptNames(nodes: JourneyMapperNode[]): string[] {
  return [...new Set(nodes.map((n) => n.conceptName))];
}

// ---------------------------------------------------------------------------
// Marketing Site / Brochure
// ---------------------------------------------------------------------------

function buildBrochureV0Prompt(state: JourneyMapperState): string {
  const { nodes, stages, personaName } = state;
  const conceptNames = getConceptNames(nodes);
  const nodesByStage = groupNodesByStage(nodes, stages);
  const lines: string[] = [];

  lines.push(`Build a high-conversion multi-section landing page for "${conceptNames.join(' + ')}".`);
  lines.push(`Target audience: ${personaName}.`);
  lines.push('');
  lines.push('This is a single-page marketing site focused on the following narrative flow:');
  lines.push('');

  for (const stage of stages) {
    const stageNodes = nodesByStage.get(stage.id) || [];
    if (stageNodes.length === 0) continue;

    lines.push(`## ${stage.name} Stage`);
    if (stage.isDip) {
      lines.push(`(Critical conversion point — address: ${stage.barriers.join(', ')})`);
    }

    for (const node of stageNodes) {
      lines.push(`### ${node.featureName}`);
      lines.push(`- Goal: ${node.featureDescription}`);
      if (node.uiPatternSuggestion) lines.push(`- Pattern: ${node.uiPatternSuggestion}`);
      if (node.addressesPain) lines.push(`- Overcomes: ${node.addressesPain}`);
    }
    lines.push('');
  }

  lines.push('DESIGN REQUIREMENTS:');
  lines.push('- Single-page scrolling layout with smooth anchor navigation');
  lines.push('- Bold hero section above the fold with strong CTA');
  lines.push('- Trust signals: testimonial cards, logo bar, stats counters');
  lines.push('- Sticky header with CTA button');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Admin Portal
// ---------------------------------------------------------------------------

function buildAdminPortalV0Prompt(state: JourneyMapperState): string {
  const { nodes, edges, stages, personaName } = state;
  const conceptNames = getConceptNames(nodes);
  const nodesByStage = groupNodesByStage(nodes, stages);
  const lines: string[] = [];

  lines.push(`Create an admin portal for "${conceptNames.join(' + ')}".`);
  lines.push(`The primary user is ${personaName} (an admin/manager).`);
  lines.push('');

  // Navigation from edges
  const primaryEdges = edges.filter((e) => e.flowType === 'primary');
  if (primaryEdges.length > 0) {
    lines.push('NAVIGATION FLOW:');
    for (const edge of primaryEdges) {
      const source = nodes.find((n) => n.id === edge.sourceNodeId);
      const target = nodes.find((n) => n.id === edge.targetNodeId);
      if (source && target) {
        lines.push(`- ${source.featureName} → ${target.featureName}${edge.label ? ` (${edge.label})` : ''}`);
      }
    }
    lines.push('');
  }

  lines.push('VIEWS AND PAGES:');
  lines.push('');

  for (const stage of stages) {
    const stageNodes = nodesByStage.get(stage.id) || [];
    if (stageNodes.length === 0) continue;

    lines.push(`## ${stage.name}${stage.isDip ? ' (Complex Operation)' : ''}`);
    for (const node of stageNodes) {
      const componentHint = UI_TYPE_COMPONENT_HINTS[node.uiType];
      lines.push('');
      lines.push(`### ${node.featureName}`);
      lines.push(`- Type: ${componentHint}`);
      if (node.uiPatternSuggestion) lines.push(`- Pattern: ${node.uiPatternSuggestion}`);
      lines.push(`- Description: ${node.featureDescription}`);
      if (node.addressesPain) lines.push(`- Solves: ${node.addressesPain}`);
      lines.push(`- Priority: ${node.priority}`);
    }
    lines.push('');
  }

  lines.push('DESIGN REQUIREMENTS:');
  lines.push('- Sidebar navigation with collapsible sections');
  lines.push('- Data tables with sorting, filtering, pagination, and bulk actions');
  lines.push('- CRUD forms with inline validation');
  lines.push('- Role-based UI hints (show/hide based on role)');
  lines.push('- Breadcrumb navigation for nested views');
  lines.push('- Toast notifications for CRUD operations');
  lines.push('- Confirmation dialogs for destructive actions');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function buildDashboardV0Prompt(state: JourneyMapperState): string {
  const { nodes, edges, stages, personaName } = state;
  const conceptNames = getConceptNames(nodes);
  const nodesByStage = groupNodesByStage(nodes, stages);
  const lines: string[] = [];

  lines.push(`Create an analytics dashboard for "${conceptNames.join(' + ')}".`);
  lines.push(`The primary user is ${personaName}.`);
  lines.push('');

  lines.push('WIDGETS AND VIEWS:');
  lines.push('');

  for (const stage of stages) {
    const stageNodes = nodesByStage.get(stage.id) || [];
    if (stageNodes.length === 0) continue;

    lines.push(`## ${stage.name}${stage.isDip ? ' (Deep Analysis)' : ''}`);
    for (const node of stageNodes) {
      const componentHint = UI_TYPE_COMPONENT_HINTS[node.uiType];
      lines.push('');
      lines.push(`### ${node.featureName}`);
      lines.push(`- Type: ${componentHint}`);
      if (node.uiPatternSuggestion) lines.push(`- Pattern: ${node.uiPatternSuggestion}`);
      lines.push(`- Description: ${node.featureDescription}`);
      if (node.addressesPain) lines.push(`- Solves: ${node.addressesPain}`);
      lines.push(`- Priority: ${node.priority}`);
    }
    lines.push('');
  }

  lines.push('DESIGN REQUIREMENTS:');
  lines.push('- KPI cards at the top with trend indicators (up/down arrows, percentage change)');
  lines.push('- Charts: line charts for trends, bar charts for comparisons, donut charts for distribution');
  lines.push('- Date range selector (preset ranges + custom)');
  lines.push('- Drill-down: click a metric card to expand into a detail view');
  lines.push('- Data tables with export to CSV');
  lines.push('- Responsive grid layout (4-col → 2-col → 1-col)');
  lines.push('- Loading skeletons for async data');
  lines.push('- Use recharts or similar for chart visualizations');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

function buildToolV0Prompt(state: JourneyMapperState): string {
  const { nodes, edges, stages, personaName } = state;
  const conceptNames = getConceptNames(nodes);
  const nodesByStage = groupNodesByStage(nodes, stages);
  const lines: string[] = [];

  lines.push(`Create a focused utility tool for "${conceptNames.join(' + ')}".`);
  lines.push(`The primary user is ${personaName}.`);
  lines.push('');

  lines.push('TOOL FLOW:');
  lines.push('');

  for (const stage of stages) {
    const stageNodes = nodesByStage.get(stage.id) || [];
    if (stageNodes.length === 0) continue;

    lines.push(`## ${stage.name}${stage.isDip ? ' (User Friction Point)' : ''}`);
    for (const node of stageNodes) {
      const componentHint = UI_TYPE_COMPONENT_HINTS[node.uiType];
      lines.push('');
      lines.push(`### ${node.featureName}`);
      lines.push(`- Type: ${componentHint}`);
      if (node.uiPatternSuggestion) lines.push(`- Pattern: ${node.uiPatternSuggestion}`);
      lines.push(`- Description: ${node.featureDescription}`);
      if (node.addressesPain) lines.push(`- Solves: ${node.addressesPain}`);
      lines.push(`- Priority: ${node.priority}`);
    }
    lines.push('');
  }

  lines.push('DESIGN REQUIREMENTS:');
  lines.push('- Clear input form with smart defaults and placeholder examples');
  lines.push('- Processing state with progress indicator or spinner');
  lines.push('- Result display with visual formatting (syntax highlighting, structured output)');
  lines.push('- One-click copy to clipboard for results');
  lines.push('- Export options (download as file, share link)');
  lines.push('- Single-page layout — no routing needed');
  lines.push('- Error states with helpful suggestions');
  lines.push('- History/recent inputs sidebar (optional)');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Web App (general)
// ---------------------------------------------------------------------------

function buildAppV0Prompt(state: JourneyMapperState): string {
  const { nodes, edges, stages, personaName, conceptRelationship } = state;
  const conceptNames = getConceptNames(nodes);
  const nodesByStage = groupNodesByStage(nodes, stages);
  const lines: string[] = [];

  // App overview
  lines.push(`Create a modern React web application${conceptNames.length > 0 ? ` for "${conceptNames.join(' + ')}"` : ''}.`);
  lines.push(`The primary user is ${personaName}.`);

  if (conceptRelationship === 'combined') {
    lines.push('This is a single cohesive application combining all concepts.');
  } else if (conceptRelationship === 'separate-sections') {
    lines.push('The application has distinct sections for each concept area.');
  }

  lines.push('');

  // Navigation requirements from edges
  const primaryEdges = edges.filter((e) => e.flowType === 'primary');
  if (primaryEdges.length > 0) {
    lines.push('NAVIGATION FLOW:');
    for (const edge of primaryEdges) {
      const source = nodes.find((n) => n.id === edge.sourceNodeId);
      const target = nodes.find((n) => n.id === edge.targetNodeId);
      if (source && target) {
        lines.push(`- ${source.featureName} → ${target.featureName}${edge.label ? ` (${edge.label})` : ''}`);
      }
    }
    lines.push('');
  }

  // Screens grouped by journey stage
  lines.push('SCREENS AND PAGES:');
  lines.push('');

  for (const stage of stages) {
    const stageNodes = nodesByStage.get(stage.id) || [];
    if (stageNodes.length === 0) continue;

    lines.push(`## ${stage.name}${stage.isDip ? ' (Critical Recovery Point)' : ''}`);

    if (stage.isDip) {
      lines.push(`User emotion is ${stage.emotion} here. Focus on supportive UX, clear guidance, and error recovery.`);
    }

    for (const node of stageNodes) {
      const componentHint = UI_TYPE_COMPONENT_HINTS[node.uiType];
      lines.push('');
      lines.push(`### ${node.featureName}`);
      lines.push(`- Type: ${componentHint}`);

      if (node.uiPatternSuggestion) {
        lines.push(`- Pattern: ${node.uiPatternSuggestion}`);
      }

      lines.push(`- Description: ${node.featureDescription}`);

      if (node.addressesPain) {
        lines.push(`- Solves: ${node.addressesPain}`);
      }

      lines.push(`- Priority: ${node.priority}`);
    }

    lines.push('');
  }

  // Design guidelines
  lines.push('DESIGN REQUIREMENTS:');
  lines.push('- Clean, modern design with consistent spacing and typography');
  lines.push('- Include proper loading states and empty states');

  // Dip-stage recovery emphasis
  const dipStages = stages.filter((s) => s.isDip);
  if (dipStages.length > 0) {
    lines.push('');
    lines.push('CRITICAL UX RECOVERY:');
    for (const dip of dipStages) {
      const dipNodes = nodesByStage.get(dip.id) || [];
      if (dipNodes.length > 0) {
        lines.push(`- ${dip.name}: Include clear progress indicators, helpful tooltips, and undo capabilities to ease user frustration.`);
      }
    }
  }

  return lines.join('\n');
}

import type { JourneyMapperNode, JourneyStageColumn, NavigationGroup } from './types';

const COLUMN_WIDTH = 280;
const COLUMN_GAP = 40;
const HEADER_HEIGHT = 120;
const NODE_HEIGHT = 160;
const NODE_VERTICAL_GAP = 20;
const TOP_PADDING = 20;

export interface LayoutConfig {
  columnWidth?: number;
  columnGap?: number;
  headerHeight?: number;
  nodeHeight?: number;
  nodeVerticalGap?: number;
}

export interface StageHeaderNode {
  id: string;
  stageId: string;
  stageName: string;
  description: string;
  emotion: JourneyStageColumn['emotion'];
  isDip: boolean;
  position: { x: number; y: number };
}

export interface GroupBackgroundNode {
  id: string;
  groupId: string;
  label: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

const PRIORITY_ORDER = { 'must-have': 0, 'should-have': 1, 'nice-to-have': 2 } as const;

/**
 * Secondary sort: cluster nodes with same groupId together within each stage column.
 * Core nodes first, then peripherals. Within each category, sorted by priority.
 */
function sortStageNodes(nodes: JourneyMapperNode[]): JourneyMapperNode[] {
  return nodes.slice().sort((a, b) => {
    // Core before peripheral
    const catA = a.nodeCategory === 'peripheral' ? 1 : 0;
    const catB = b.nodeCategory === 'peripheral' ? 1 : 0;
    if (catA !== catB) return catA - catB;

    // Same category: group by groupId
    const gA = a.groupId || '';
    const gB = b.groupId || '';
    if (gA !== gB) return gA.localeCompare(gB);

    // Same group: sort by priority
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

/**
 * Compute column-based layout for the journey mapper.
 * Stages → columns left-to-right.
 * Nodes within each column stacked vertically, sorted by priority with group clustering.
 * Stage headers are non-draggable nodes at the top.
 */
export function computeJourneyMapLayout(
  nodes: JourneyMapperNode[],
  stages: JourneyStageColumn[],
  config?: LayoutConfig
): { nodes: JourneyMapperNode[]; headerNodes: StageHeaderNode[] } {
  const colWidth = config?.columnWidth ?? COLUMN_WIDTH;
  const colGap = config?.columnGap ?? COLUMN_GAP;
  const hdrHeight = config?.headerHeight ?? HEADER_HEIGHT;
  const nodeH = config?.nodeHeight ?? NODE_HEIGHT;
  const nodeGap = config?.nodeVerticalGap ?? NODE_VERTICAL_GAP;

  const headerNodes: StageHeaderNode[] = [];
  const positionedNodes: JourneyMapperNode[] = [];

  // Group nodes by stage
  const nodesByStage = new Map<string, JourneyMapperNode[]>();
  for (const node of nodes) {
    const existing = nodesByStage.get(node.stageId) || [];
    existing.push(node);
    nodesByStage.set(node.stageId, existing);
  }

  stages.forEach((stage, colIndex) => {
    const x = colIndex * (colWidth + colGap);

    // Stage header
    headerNodes.push({
      id: `header-${stage.id}`,
      stageId: stage.id,
      stageName: stage.name,
      description: stage.description,
      emotion: stage.emotion,
      isDip: stage.isDip,
      position: { x, y: TOP_PADDING },
    });

    // Sort nodes with group clustering
    const stageNodes = sortStageNodes(nodesByStage.get(stage.id) || []);

    stageNodes.forEach((node, nodeIndex) => {
      positionedNodes.push({
        ...node,
        position: {
          x,
          y: TOP_PADDING + hdrHeight + nodeIndex * (nodeH + nodeGap),
        },
      });
    });
  });

  // Catch orphan nodes whose stageId doesn't match any stage —
  // append them to the first stage column so they're never silently dropped.
  const positionedIds = new Set(positionedNodes.map((n) => n.id));
  const orphans = nodes.filter((n) => !positionedIds.has(n.id));
  if (orphans.length > 0) {
    const firstStageX = 0;
    const firstStageCount = positionedNodes.filter(
      (n) => stages[0] && n.stageId === stages[0].id
    ).length;
    orphans.forEach((node, idx) => {
      positionedNodes.push({
        ...node,
        stageId: stages[0]?.id ?? node.stageId,
        position: {
          x: firstStageX,
          y: TOP_PADDING + hdrHeight + (firstStageCount + idx) * (nodeH + nodeGap),
        },
      });
    });
  }

  return { nodes: positionedNodes, headerNodes };
}

/**
 * Compute bounding-box container nodes for each navigation group.
 * Returns positioned group containers that surround their member nodes.
 */
export function computeGroupContainers(
  nodes: JourneyMapperNode[],
  groups: NavigationGroup[]
): GroupBackgroundNode[] {
  if (groups.length === 0) return [];

  const containers: GroupBackgroundNode[] = [];
  const padding = 40;
  const labelHeight = 28;

  for (const group of groups) {
    const groupNodes = nodes.filter((n) => n.groupId === group.id);
    if (groupNodes.length === 0) continue;

    // Always compute from node bounding boxes so containers dynamically resize
    const minX = Math.min(...groupNodes.map((n) => n.position.x));
    const minY = Math.min(...groupNodes.map((n) => n.position.y));
    const maxX = Math.max(...groupNodes.map((n) => n.position.x));
    const maxY = Math.max(...groupNodes.map((n) => n.position.y));

    containers.push({
      id: `group-container-${group.id}`,
      groupId: group.id,
      label: group.label,
      position: { x: minX - padding, y: minY - padding - labelHeight },
      width: (maxX - minX) + COLUMN_WIDTH + padding * 2,
      height: (maxY - minY) + NODE_HEIGHT + padding * 2 + labelHeight,
    });
  }

  return containers;
}

/** @deprecated Use computeGroupContainers instead */
export const computeGroupBackgrounds = computeGroupContainers;

/**
 * Auto-tidy: rearrange child nodes in a grid within each group.
 * Positions are absolute — the grid is offset by the group's current bounding box origin.
 */
export function autoTidyWithinGroups(
  nodes: JourneyMapperNode[],
  groups: NavigationGroup[]
): JourneyMapperNode[] {
  const result = [...nodes];
  const padding = 40;
  const labelHeight = 32;
  const nodeW = 260;
  const nodeH = NODE_HEIGHT;
  const hGap = 20;
  const vGap = 20;
  const cols = 4;

  for (const group of groups) {
    const groupNodeIndices = result
      .map((n, i) => (n.groupId === group.id ? i : -1))
      .filter((i) => i >= 0);

    if (groupNodeIndices.length === 0) continue;

    // Compute group bounding box origin from current node positions
    const groupNodes = groupNodeIndices.map((i) => result[i]);
    const originX = Math.min(...groupNodes.map((n) => n.position.x));
    const originY = Math.min(...groupNodes.map((n) => n.position.y));

    groupNodeIndices.forEach((idx, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      result[idx] = {
        ...result[idx],
        position: {
          x: originX + col * (nodeW + hGap),
          y: originY + row * (nodeH + vGap),
        },
      };
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sitemap / Tree view layout
// ---------------------------------------------------------------------------

const SITEMAP_GROUP_GAP = 60;
const SITEMAP_NODE_WIDTH = 260;
const SITEMAP_NODE_HEIGHT = 80;
const SITEMAP_NODE_H_GAP = 20;
const SITEMAP_NODE_V_GAP = 30;
const SITEMAP_NODES_PER_ROW = 4;

/**
 * Compute a sitemap/tree layout: groups as horizontal sections, nodes in rows within each group.
 * Returns positioned nodes + group backgrounds (no stage headers in sitemap view).
 */
export function computeSitemapLayout(
  nodes: JourneyMapperNode[],
  groups: NavigationGroup[]
): { nodes: JourneyMapperNode[]; groupBackgrounds: GroupBackgroundNode[] } {
  const positionedNodes: JourneyMapperNode[] = [];
  const groupBackgrounds: GroupBackgroundNode[] = [];

  // Determine group order: 'main' first, then alphabetical
  const sortedGroups = groups.slice().sort((a, b) => {
    if (a.id === 'main') return -1;
    if (b.id === 'main') return 1;
    return a.label.localeCompare(b.label);
  });

  // Also handle ungrouped nodes
  const ungroupedNodes = nodes.filter((n) => !n.groupId || !groups.some((g) => g.id === n.groupId));
  if (ungroupedNodes.length > 0 && !sortedGroups.some((g) => g.id === 'main')) {
    sortedGroups.unshift({ id: 'main', label: 'Main', description: 'Core features' });
  }

  let currentY = TOP_PADDING;
  const labelHeight = 32;
  const groupPadding = 20;

  for (const group of sortedGroups) {
    const groupNodes = nodes.filter((n) => n.groupId === group.id);
    // Include ungrouped in 'main'
    if (group.id === 'main') {
      groupNodes.push(...ungroupedNodes);
    }
    if (groupNodes.length === 0) continue;

    // Sort: must-have first
    groupNodes.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    const groupStartY = currentY;
    const contentStartY = groupStartY + labelHeight + groupPadding;

    // Lay out nodes in rows
    groupNodes.forEach((node, idx) => {
      const col = idx % SITEMAP_NODES_PER_ROW;
      const row = Math.floor(idx / SITEMAP_NODES_PER_ROW);

      positionedNodes.push({
        ...node,
        position: {
          x: groupPadding + col * (SITEMAP_NODE_WIDTH + SITEMAP_NODE_H_GAP),
          y: contentStartY + row * (SITEMAP_NODE_HEIGHT + SITEMAP_NODE_V_GAP),
        },
      });
    });

    const totalRows = Math.ceil(groupNodes.length / SITEMAP_NODES_PER_ROW);
    const groupContentHeight = totalRows * (SITEMAP_NODE_HEIGHT + SITEMAP_NODE_V_GAP) - SITEMAP_NODE_V_GAP;
    const groupTotalHeight = labelHeight + groupPadding * 2 + groupContentHeight;

    const groupWidth = Math.min(groupNodes.length, SITEMAP_NODES_PER_ROW)
      * (SITEMAP_NODE_WIDTH + SITEMAP_NODE_H_GAP) - SITEMAP_NODE_H_GAP + groupPadding * 2;

    groupBackgrounds.push({
      id: `group-bg-${group.id}`,
      groupId: group.id,
      label: group.label,
      position: { x: 0, y: groupStartY },
      width: groupWidth,
      height: groupTotalHeight,
    });

    currentY += groupTotalHeight + SITEMAP_GROUP_GAP;
  }

  return { nodes: positionedNodes, groupBackgrounds };
}

/** Get total canvas dimensions for the layout */
export function getLayoutDimensions(
  stageCount: number,
  maxNodesPerStage: number,
  config?: LayoutConfig
) {
  const colWidth = config?.columnWidth ?? COLUMN_WIDTH;
  const colGap = config?.columnGap ?? COLUMN_GAP;
  const hdrHeight = config?.headerHeight ?? HEADER_HEIGHT;
  const nodeH = config?.nodeHeight ?? NODE_HEIGHT;
  const nodeGap = config?.nodeVerticalGap ?? NODE_VERTICAL_GAP;

  return {
    width: stageCount * (colWidth + colGap) - colGap,
    height: TOP_PADDING + hdrHeight + maxNodesPerStage * (nodeH + nodeGap),
  };
}

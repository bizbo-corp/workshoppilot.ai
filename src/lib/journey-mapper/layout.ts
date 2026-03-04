import type { JourneyMapperNode, JourneyStageColumn } from './types';

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

const PRIORITY_ORDER = { 'must-have': 0, 'should-have': 1, 'nice-to-have': 2 } as const;

/**
 * Compute column-based layout for the journey mapper.
 * Stages → columns left-to-right.
 * Nodes within each column stacked vertically, sorted by priority.
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

    // Sort nodes by priority within column
    const stageNodes = (nodesByStage.get(stage.id) || [])
      .slice()
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

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

  return { nodes: positionedNodes, headerNodes };
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

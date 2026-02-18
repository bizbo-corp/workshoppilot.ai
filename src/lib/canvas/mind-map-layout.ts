import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { MindMapNodeState, MindMapEdgeState } from '@/stores/canvas-store';

// Node dimensions matching mind-map-node.tsx fixed width
const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

export type LayoutOptions = {
  direction?: 'TB' | 'LR';
};

/**
 * Calculate mind map tree layout using dagre (legacy — kept for backward compat).
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const { direction = 'LR' } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 120,
    nodesep: 100,
    edgesep: 50,
    marginx: 30,
    marginy: 30,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Compute radial positions for mind map nodes.
 * Root at center (0,0), level-1 nodes in a circle, deeper nodes fan out from parent.
 *
 * Mutates node.position in-place and returns the same array for convenience.
 */
export function computeRadialPositions(
  nodes: MindMapNodeState[],
  edges: MindMapEdgeState[]
): MindMapNodeState[] {
  if (nodes.length === 0) return nodes;

  // Build parent→children map
  const childrenMap = new Map<string, string[]>();
  for (const edge of edges) {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  }

  // Build id→node map
  const nodeMap = new Map<string, MindMapNodeState>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Find root
  const root = nodes.find((n) => n.isRoot);
  if (!root) return nodes;

  // Place root at center
  root.position = { x: 0, y: 0 };

  // BFS from root
  const LEVEL_1_RADIUS = 350;
  const CHILD_OFFSET = 250;

  const queue: Array<{ id: string; parentPos: { x: number; y: number }; angleFromRoot: number }> = [];

  // Place level-1 children in a circle around root
  const level1Children = childrenMap.get(root.id) || [];
  level1Children.forEach((childId, index) => {
    const angle = (2 * Math.PI * index) / level1Children.length - Math.PI / 2; // start from top
    const x = Math.round(LEVEL_1_RADIUS * Math.cos(angle));
    const y = Math.round(LEVEL_1_RADIUS * Math.sin(angle));

    const childNode = nodeMap.get(childId);
    if (childNode) {
      childNode.position = { x, y };
      queue.push({ id: childId, parentPos: { x, y }, angleFromRoot: angle });
    }
  });

  // Process deeper levels
  while (queue.length > 0) {
    const { id, parentPos, angleFromRoot } = queue.shift()!;
    const children = childrenMap.get(id) || [];

    children.forEach((childId, index) => {
      const childNode = nodeMap.get(childId);
      if (!childNode) return;

      // Fan children around the parent's angle from root
      const spread = Math.PI / 3; // 60 degree spread
      const childCount = children.length;
      const startAngle = angleFromRoot - spread / 2;
      const angleStep = childCount > 1 ? spread / (childCount - 1) : 0;
      const childAngle = childCount === 1 ? angleFromRoot : startAngle + angleStep * index;

      const x = Math.round(parentPos.x + CHILD_OFFSET * Math.cos(childAngle));
      const y = Math.round(parentPos.y + CHILD_OFFSET * Math.sin(childAngle));

      childNode.position = { x, y };
      queue.push({ id: childId, parentPos: { x, y }, angleFromRoot: childAngle });
    });
  }

  return nodes;
}

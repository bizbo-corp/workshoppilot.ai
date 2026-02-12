import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

// Node dimensions matching mind-map-node.tsx fixed width
const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

export type LayoutOptions = {
  direction?: 'TB' | 'LR';
};

/**
 * Calculate mind map tree layout using dagre.
 *
 * Uses horizontal left-to-right layout (LR) with generous spacing to prevent
 * overlap at depth 3+ nesting.
 *
 * @param nodes - ReactFlow nodes to layout
 * @param edges - ReactFlow edges defining hierarchy
 * @param options - Layout configuration (default: LR horizontal)
 * @returns Object with layouted nodes and original edges
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const { direction = 'LR' } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph layout with generous spacing (per research pitfall #3)
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 120,    // 120px between levels
    nodesep: 100,    // 100px between siblings
    edgesep: 50,     // 50px between edges
    marginx: 30,     // 30px margin
    marginy: 30,
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Map dagre positions back to ReactFlow nodes
  // dagre returns center coordinates, convert to top-left
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

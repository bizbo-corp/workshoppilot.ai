/**
 * Mind Map Theme Color System
 * Auto-assigns colors to level-1 branches with inheritance to descendants
 * Used by MindMapNode and MindMapEdge components
 */

import type { Node, Edge } from '@xyflow/react';

export type ThemeColor = {
  id: string;
  label: string;
  color: string; // border and text hex
  bgColor: string; // background hex
};

/**
 * 6-color theme palette for mind map branches
 */
export const THEME_COLORS: readonly ThemeColor[] = [
  {
    id: 'blue',
    label: 'Blue',
    color: '#3b82f6',
    bgColor: '#dbeafe',
  },
  {
    id: 'green',
    label: 'Green',
    color: '#10b981',
    bgColor: '#d1fae5',
  },
  {
    id: 'purple',
    label: 'Purple',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
  },
  {
    id: 'orange',
    label: 'Orange',
    color: '#f97316',
    bgColor: '#ffedd5',
  },
  {
    id: 'pink',
    label: 'Pink',
    color: '#ec4899',
    bgColor: '#fce7f3',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    color: '#eab308',
    bgColor: '#fef9c3',
  },
] as const;

/**
 * Root node color (neutral gray for central HMW node)
 */
export const ROOT_COLOR: ThemeColor = {
  id: 'root',
  label: 'Root',
  color: '#374151',  // gray-700 for better prominence
  bgColor: '#f9fafb', // gray-50
};

/**
 * Get theme color for a node based on its position in the hierarchy
 * - Root node (no parent): ROOT_COLOR
 * - Level-1 nodes (parent is root): auto-assign by sibling index
 * - Deeper nodes: inherit parent's themeColorId
 *
 * @param nodeId - The node to get color for
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @returns ThemeColor object with color and bgColor
 */
export function getThemeColorForNode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): ThemeColor {
  // Find the node
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return ROOT_COLOR;

  // Check if node already has a themeColorId in its data
  const nodeData = node.data as { themeColorId?: string; isRoot?: boolean };

  // Root node: use ROOT_COLOR
  if (nodeData.isRoot) {
    return ROOT_COLOR;
  }

  // Find parent edge (target is current node)
  const parentEdge = edges.find((e) => e.target === nodeId);

  // No parent edge = root node
  if (!parentEdge) {
    return ROOT_COLOR;
  }

  // Find parent node
  const parentNode = nodes.find((n) => n.id === parentEdge.source);
  if (!parentNode) return ROOT_COLOR;

  const parentData = parentNode.data as { themeColorId?: string; isRoot?: boolean };

  // If parent is root, auto-assign color based on sibling index
  if (parentData.isRoot) {
    // Find all siblings (nodes with same parent)
    const siblings = edges
      .filter((e) => e.source === parentNode.id)
      .map((e) => e.target)
      .sort(); // Sort for consistent ordering

    const siblingIndex = siblings.indexOf(nodeId);
    const colorIndex = siblingIndex % THEME_COLORS.length;

    return THEME_COLORS[colorIndex];
  }

  // Deeper node: inherit parent's themeColorId
  if (parentData.themeColorId) {
    const inheritedColor = THEME_COLORS.find((c) => c.id === parentData.themeColorId);
    if (inheritedColor) return inheritedColor;
  }

  // Fallback: use the themeColorId from node data if present
  if (nodeData.themeColorId) {
    const nodeColor = THEME_COLORS.find((c) => c.id === nodeData.themeColorId);
    if (nodeColor) return nodeColor;
  }

  // Ultimate fallback
  return ROOT_COLOR;
}

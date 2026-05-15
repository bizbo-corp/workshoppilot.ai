/**
 * Mind Map Theme Color System
 * Auto-assigns colors to level-1 branches with inheritance to descendants
 * Used by MindMapNode and MindMapEdge components
 */

import type { Node, Edge } from '@xyflow/react';

export type ThemeColor = {
  id: string;
  label: string;
  color: string;        // dark text/border (CSS variable)
  bgColor: string;      // pastel background (CSS variable)
  accentColor: string;  // medium-saturation accent for indicator dots & cursors (CSS variable)
};

/**
 * 8-color theme palette for mind map branches.
 * Order matters for multiplayer: index 0 = facilitator, index 1+ = participants.
 * MUST stay in lockstep with PARTICIPANT_COLORS in src/lib/liveblocks/config.ts
 * so that indicator dots, cursors, and mind map nodes share a hue per user.
 * Aliased from the canvas palette (same hues as sticky notes) via globals.css.
 */
export const THEME_COLORS: readonly ThemeColor[] = [
  {
    id: 'green',
    label: 'Green',
    color: 'var(--mm-green)',
    bgColor: 'var(--mm-green-bg)',
    accentColor: 'var(--canvas-green)',
  },
  {
    id: 'pink',
    label: 'Pink',
    color: 'var(--mm-pink)',
    bgColor: 'var(--mm-pink-bg)',
    accentColor: 'var(--canvas-pink)',
  },
  {
    id: 'blue',
    label: 'Blue',
    color: 'var(--mm-blue)',
    bgColor: 'var(--mm-blue-bg)',
    accentColor: 'var(--canvas-blue)',
  },
  {
    id: 'orange',
    label: 'Orange',
    color: 'var(--mm-orange)',
    bgColor: 'var(--mm-orange-bg)',
    accentColor: 'var(--canvas-orange)',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    color: 'var(--mm-yellow)',
    bgColor: 'var(--mm-yellow-bg)',
    accentColor: 'var(--canvas-yellow)',
  },
  {
    id: 'red',
    label: 'Red',
    color: 'var(--canvas-red-text)',
    bgColor: 'var(--canvas-red-pastel)',
    accentColor: 'var(--canvas-red)',
  },
  {
    id: 'teal',
    label: 'Teal',
    color: 'var(--mm-teal)',
    bgColor: 'var(--mm-teal-bg)',
    accentColor: 'var(--canvas-teal)',
  },
  {
    id: 'purple',
    label: 'Purple',
    color: 'var(--mm-purple)',
    bgColor: 'var(--mm-purple-bg)',
    accentColor: 'var(--canvas-purple)',
  },
] as const;

/**
 * Root node color (olive-neutral for central HMW node)
 */
export const ROOT_COLOR: ThemeColor = {
  id: 'root',
  label: 'Root',
  color: 'var(--mm-root)',
  bgColor: 'var(--mm-root-bg)',
  accentColor: 'var(--canvas-olive)',
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

import type { MindMapNodeState, MindMapEdgeState } from '@/stores/canvas-store';

// ── Config ──────────────────────────────────────────────────────────────
export type RadialLayoutConfig = {
  /** Approximate node width for arc-size calculation */
  nodeWidth?: number;
  /** Minimum gap between sibling arcs (px) */
  gap?: number;
  /** Cumulative radii per level: [L0, L1, L2, L3, ...] */
  levelRadii?: number[];
  /** Snap to this grid size (0 = no snap) */
  snapGrid?: number;
  /** Minimum angular arc per leaf (radians) */
  minArc?: number;
};

const DEFAULT_CONFIG: Required<RadialLayoutConfig> = {
  nodeWidth: 200,
  gap: 60,
  levelRadii: [0, 400, 700, 980, 1240, 1480],
  snapGrid: 20,
  minArc: 0.25, // ~14 degrees
};

function resolveConfig(config?: RadialLayoutConfig): Required<RadialLayoutConfig> {
  return { ...DEFAULT_CONFIG, ...config };
}

function snap(val: number, grid: number): number {
  if (grid <= 0) return val;
  return Math.round(val / grid) * grid;
}

function getLevelRadius(level: number, radii: number[]): number {
  if (level < radii.length) return radii[level];
  // Extrapolate for very deep trees
  const lastR = radii[radii.length - 1];
  const secondLastR = radii.length >= 2 ? radii[radii.length - 2] : lastR - 260;
  const step = lastR - secondLastR;
  return lastR + step * (level - radii.length + 1);
}

// ── Internal helpers ────────────────────────────────────────────────────
type TreeInfo = {
  children: string[];
  angularSize: number; // computed bottom-up
};

/**
 * Build parent→children map from primary (non-secondary) edges only.
 */
function buildChildrenMap(edges: MindMapEdgeState[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.isSecondary) continue;
    const children = map.get(edge.source) || [];
    children.push(edge.target);
    map.set(edge.source, children);
  }
  return map;
}

// ── Pass 1: Bottom-up angular sizing ────────────────────────────────────
function computeAngularSizes(
  rootId: string,
  childrenMap: Map<string, string[]>,
  nodeMap: Map<string, MindMapNodeState>,
  cfg: Required<RadialLayoutConfig>
): Map<string, TreeInfo> {
  const treeMap = new Map<string, TreeInfo>();

  function visit(nodeId: string, level: number): number {
    const children = childrenMap.get(nodeId) || [];
    const radius = getLevelRadius(level, cfg.levelRadii);

    if (children.length === 0) {
      // Leaf: minimum arc based on node width + gap at this radius
      const effectiveRadius = Math.max(radius, 1);
      const arc = Math.max(cfg.minArc, (cfg.nodeWidth + cfg.gap) / effectiveRadius);
      treeMap.set(nodeId, { children, angularSize: arc });
      return arc;
    }

    let totalArc = 0;
    for (const childId of children) {
      totalArc += visit(childId, level + 1);
    }

    // Internal node: sum of children with a floor
    const effectiveRadius = Math.max(radius, 1);
    const ownMinArc = Math.max(cfg.minArc, (cfg.nodeWidth + cfg.gap) / effectiveRadius);
    const finalArc = Math.max(totalArc, ownMinArc);
    treeMap.set(nodeId, { children, angularSize: finalArc });
    return finalArc;
  }

  visit(rootId, 0);
  return treeMap;
}

// ── Pass 2: Top-down position assignment ────────────────────────────────
function assignPositions(
  rootId: string,
  treeMap: Map<string, TreeInfo>,
  cfg: Required<RadialLayoutConfig>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Root at center
  positions.set(rootId, { x: 0, y: 0 });

  const rootInfo = treeMap.get(rootId);
  if (!rootInfo || rootInfo.children.length === 0) return positions;

  // Distribute root's children across full 2π
  const totalChildArc = rootInfo.children.reduce(
    (sum, cid) => sum + (treeMap.get(cid)?.angularSize || cfg.minArc),
    0
  );

  // Scale factor: if children don't fill 2π, spread them evenly
  const scaleFactor = (2 * Math.PI) / Math.max(totalChildArc, 0.001);

  let currentAngle = -Math.PI / 2; // start from top

  for (const childId of rootInfo.children) {
    const childInfo = treeMap.get(childId);
    const childArc = (childInfo?.angularSize || cfg.minArc) * scaleFactor;
    const midAngle = currentAngle + childArc / 2;

    assignSubtree(childId, 1, midAngle, currentAngle, currentAngle + childArc);
    currentAngle += childArc;
  }

  function assignSubtree(
    nodeId: string,
    level: number,
    angle: number,
    sectorStart: number,
    sectorEnd: number
  ) {
    const radius = getLevelRadius(level, cfg.levelRadii);
    positions.set(nodeId, {
      x: snap(radius * Math.cos(angle), cfg.snapGrid),
      y: snap(radius * Math.sin(angle), cfg.snapGrid),
    });

    const info = treeMap.get(nodeId);
    if (!info || info.children.length === 0) return;

    // Distribute children proportionally within this node's sector
    const totalChildArc = info.children.reduce(
      (sum, cid) => sum + (treeMap.get(cid)?.angularSize || cfg.minArc),
      0
    );
    const sectorWidth = sectorEnd - sectorStart;
    const childScale = sectorWidth / Math.max(totalChildArc, 0.001);

    let childCurrent = sectorStart;
    for (const childId of info.children) {
      const childInfo = treeMap.get(childId);
      const childArc = (childInfo?.angularSize || cfg.minArc) * childScale;
      const childMid = childCurrent + childArc / 2;

      assignSubtree(childId, level + 1, childMid, childCurrent, childCurrent + childArc);
      childCurrent += childArc;
    }
  }

  return positions;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Compute full radial layout for all mind map nodes.
 * Returns a Map of nodeId → {x, y} positions.
 */
export function computeRadialLayout(
  nodes: MindMapNodeState[],
  edges: MindMapEdgeState[],
  config?: RadialLayoutConfig
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const cfg = resolveConfig(config);
  const root = nodes.find((n) => n.isRoot);
  if (!root) return new Map();

  const nodeMap = new Map<string, MindMapNodeState>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const childrenMap = buildChildrenMap(edges);
  const treeMap = computeAngularSizes(root.id, childrenMap, nodeMap, cfg);
  return assignPositions(root.id, treeMap, cfg);
}

/**
 * Compute position for a single new node being added as a child of parentId.
 * Uses the current tree structure to find a non-overlapping spot.
 */
export function computeNewNodePosition(
  parentId: string,
  nodes: MindMapNodeState[],
  edges: MindMapEdgeState[],
  config?: RadialLayoutConfig
): { x: number; y: number } {
  const cfg = resolveConfig(config);

  const nodeMap = new Map<string, MindMapNodeState>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const parentNode = nodeMap.get(parentId);
  if (!parentNode) return { x: 0, y: 0 };

  const root = nodes.find((n) => n.isRoot);
  if (!root) return { x: 0, y: 0 };

  const childrenMap = buildChildrenMap(edges);

  // Existing children of this parent
  const existingSiblings = childrenMap.get(parentId) || [];
  const childLevel = parentNode.level + 1;
  const childRadius = getLevelRadius(childLevel, cfg.levelRadii);

  if (parentNode.isRoot) {
    // Level-1 node: place around root evenly
    const totalChildren = existingSiblings.length + 1;
    const angle = (2 * Math.PI * existingSiblings.length) / totalChildren - Math.PI / 2;
    return {
      x: snap(childRadius * Math.cos(angle), cfg.snapGrid),
      y: snap(childRadius * Math.sin(angle), cfg.snapGrid),
    };
  }

  // Deeper level: fan out from parent's direction relative to root
  const parentPos = parentNode.position || { x: 0, y: 0 };
  const rootPos = root.position || { x: 0, y: 0 };
  const parentAngle = Math.atan2(parentPos.y - rootPos.y, parentPos.x - rootPos.x);

  const siblingCount = existingSiblings.length;
  const arcPerChild = Math.max(cfg.minArc, (cfg.nodeWidth + cfg.gap) / Math.max(childRadius, 1));
  const totalArc = arcPerChild * (siblingCount + 1);
  const startAngle = parentAngle - totalArc / 2;
  const newChildAngle = startAngle + arcPerChild * siblingCount + arcPerChild / 2;

  return {
    x: snap(rootPos.x + childRadius * Math.cos(newChildAngle), cfg.snapGrid),
    y: snap(rootPos.y + childRadius * Math.sin(newChildAngle), cfg.snapGrid),
  };
}

// ── Legacy exports (kept for backward compat) ───────────────────────────

export type LayoutOptions = {
  direction?: 'TB' | 'LR';
};

/**
 * @deprecated Use computeRadialLayout instead.
 */
export function computeRadialPositions(
  nodes: MindMapNodeState[],
  edges: MindMapEdgeState[]
): MindMapNodeState[] {
  const positionMap = computeRadialLayout(nodes, edges);
  for (const node of nodes) {
    const pos = positionMap.get(node.id);
    if (pos) node.position = pos;
  }
  return nodes;
}

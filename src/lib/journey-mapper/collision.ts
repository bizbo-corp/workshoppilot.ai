/**
 * Collision detection for journey mapper nodes.
 * Prevents overlapping nodes by snapping to nearest free position on drag-end.
 */

const NODE_WIDTH = 260;
const NODE_HEIGHT = 160;
const SNAP_PADDING = 10;

const BOX_W = NODE_WIDTH + SNAP_PADDING * 2;
const BOX_H = NODE_HEIGHT + SNAP_PADDING * 2;

interface Position {
  x: number;
  y: number;
}

interface NodeLike {
  id: string;
  position: Position;
  groupId?: string;
}

function overlaps(a: Position, b: Position): boolean {
  return (
    Math.abs(a.x - b.x) < BOX_W &&
    Math.abs(a.y - b.y) < BOX_H
  );
}

function overlapsAny(pos: Position, others: NodeLike[]): boolean {
  return others.some((n) => overlaps(pos, n.position));
}

/**
 * Resolve overlap for a moved node by nudging it to the nearest free position.
 * Tries pushing right, left, down, up of each overlapping node and picks
 * the smallest total displacement.
 */
export function resolveOverlap(
  movedNodeId: string,
  newPosition: Position,
  allNodes: NodeLike[],
  groupId?: string
): Position {
  // Only check collisions with nodes in the same group (or both ungrouped)
  const others = allNodes.filter(
    (n) => n.id !== movedNodeId && n.groupId === groupId
  );

  if (!overlapsAny(newPosition, others)) {
    return newPosition;
  }

  // Collect candidate positions: push to each side of every overlapping node
  const candidates: Position[] = [];

  for (const other of others) {
    if (!overlaps(newPosition, other.position)) continue;

    // Push right of other
    candidates.push({ x: other.position.x + BOX_W, y: newPosition.y });
    // Push left of other
    candidates.push({ x: other.position.x - BOX_W, y: newPosition.y });
    // Push below other
    candidates.push({ x: newPosition.x, y: other.position.y + BOX_H });
    // Push above other
    candidates.push({ x: newPosition.x, y: other.position.y - BOX_H });
  }

  // Filter to candidates that don't overlap anything, pick smallest displacement
  let best: Position = newPosition;
  let bestDist = Infinity;

  for (const candidate of candidates) {
    if (overlapsAny(candidate, others)) continue;

    const dx = candidate.x - newPosition.x;
    const dy = candidate.y - newPosition.y;
    const dist = dx * dx + dy * dy;

    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }

  return best;
}

/**
 * Canvas Position Module
 * Computes pixel positions for post-its from AI-suggested metadata (quadrant, row/col).
 * Used by chat-panel.tsx to auto-place items when the AI stream completes.
 */

import type { PostIt, PostItColor } from '@/stores/canvas-store';
import type { Quadrant } from './quadrant-detection';
import { getCellBounds, type GridConfig } from './grid-layout';
import { STEP_CANVAS_CONFIGS } from './step-canvas-config';
import { distributeCardsOnRing, type RingConfig } from './ring-layout';
import { distributeCardsInZone, type EmpathyZoneConfig, type EmpathyZone } from './empathy-zones';

export const POST_IT_WIDTH = 160;
export const POST_IT_HEIGHT = 100;

/**
 * Base offsets per quadrant — matches fixtures.ts positioning.
 * Canvas origin (0,0) is the center dividing line.
 */
const QUADRANT_BASES: Record<string, { x: number; y: number }> = {
  // Power-Interest (Step 2)
  'high-power-high-interest': { x: 80, y: -300 },
  'high-power-low-interest': { x: -350, y: -300 },
  'low-power-high-interest': { x: 80, y: 80 },
  'low-power-low-interest': { x: -350, y: 80 },
  // Empathy Map (Step 4)
  thought: { x: -350, y: -300 },
  felt: { x: 80, y: -300 },
  said: { x: -350, y: 80 },
  experienced: { x: 80, y: 80 },
};

/**
 * Base offsets per persona category — arranged in a 2x2 layout.
 * Used for Step 5 (Persona Development) freeform canvas.
 */
const CATEGORY_BASES: Record<string, { x: number; y: number }> = {
  goals: { x: -350, y: -300 },
  pains: { x: 80, y: -300 },
  gains: { x: -350, y: 80 },
  motivations: { x: 80, y: 80 },
  frustrations: { x: -350, y: 350 },
  behaviors: { x: 80, y: 350 },
};

/**
 * Map persona categories to post-it colors
 */
export const CATEGORY_COLORS: Record<string, PostItColor> = {
  goals: 'blue',
  pains: 'pink',
  gains: 'green',
  motivations: 'orange',
  frustrations: 'pink',
  behaviors: 'yellow',
};

/**
 * Map empathy zones to post-it colors
 */
export const ZONE_COLORS: Record<string, PostItColor> = {
  pains: 'pink',
  gains: 'green',
  // Other zones use default 'yellow'
};

export type CanvasItemMetadata = {
  quadrant?: string;
  ring?: string;     // Ring ID for concentric ring layout (inner/middle/outer)
  row?: string;
  col?: string;
  category?: string;
  cluster?: string;  // Parent label for hierarchical clustering
};

/**
 * Compute pixel position for a new post-it based on step and metadata.
 *
 * - Steps 2 & 4: quadrant base offset + stagger per existing items in that quadrant
 * - Step 6: getCellBounds() + padding + stagger per existing items in that cell
 * - Fallback: stagger from (50, 50)
 *
 * @param gridConfigOverride - Optional dynamic GridConfig (e.g., from store columns) to use instead of static config
 */
export function computeCanvasPosition(
  stepId: string,
  metadata: CanvasItemMetadata,
  existingPostIts: PostIt[],
  gridConfigOverride?: GridConfig,
): {
  position: { x: number; y: number };
  quadrant?: Quadrant;
  cellAssignment?: { row: string; col: string };
} {
  // --- Ring-based steps (2: stakeholder-mapping with rings) ---
  const stepConfig = STEP_CANVAS_CONFIGS[stepId];
  const ringId = metadata.ring || metadata.quadrant;
  if (stepConfig?.hasRings && ringId) {
    const ringConfig = stepConfig.ringConfig as RingConfig;
    const ring = ringConfig.rings.find((r) => r.id === ringId);

    if (ring) {
      // Count existing post-its in the same ring (stored in cellAssignment.row)
      const sameRingPostIts = existingPostIts.filter(
        (p) => p.cellAssignment?.row === ringId,
      );
      const sameRingCount = sameRingPostIts.length;

      // Get positions for all cards in this ring (including the new one)
      const positions = distributeCardsOnRing(
        sameRingCount + 1,
        ring.radius,
        ringConfig.center,
      );

      // Use the last position for the new card
      const position = positions[positions.length - 1];

      return {
        position,
        cellAssignment: { row: ringId, col: '' },
      };
    }
  }

  // --- Empathy zone steps (4: sense-making with empathy zones) ---
  if (stepConfig?.hasEmpathyZones && metadata.quadrant) {
    const empathyZoneConfig = stepConfig.empathyZoneConfig as EmpathyZoneConfig;
    const zone = empathyZoneConfig.zones[metadata.quadrant as EmpathyZone];

    if (zone) {
      // Count existing post-its in the same zone (stored in cellAssignment.row)
      const sameZonePostIts = existingPostIts.filter(
        (p) => p.cellAssignment?.row === metadata.quadrant,
      );
      const sameZoneCount = sameZonePostIts.length;

      // Get positions for all cards in this zone (including the new one)
      const positions = distributeCardsInZone(
        sameZoneCount + 1,
        zone.bounds,
        { width: POST_IT_WIDTH, height: POST_IT_HEIGHT },
        15, // padding
      );

      // Use the last position for the new card
      const position = positions[positions.length - 1];

      return {
        position,
        cellAssignment: { row: metadata.quadrant, col: '' },
      };
    }
  }

  // --- Quadrant-based steps (2: stakeholder-mapping, 4: sense-making) ---
  if (metadata.quadrant && QUADRANT_BASES[metadata.quadrant]) {
    const base = QUADRANT_BASES[metadata.quadrant];
    const sameQuadrant = existingPostIts.filter(
      (p) => p.quadrant === metadata.quadrant,
    );
    const idx = sameQuadrant.length;
    const col = idx % 2;
    const row = Math.floor(idx / 2);

    return {
      position: {
        x: base.x + col * (POST_IT_WIDTH + 20),
        y: base.y + row * (POST_IT_HEIGHT + 20),
      },
      quadrant: metadata.quadrant as Quadrant,
    };
  }

  // --- Grid-based steps (6: journey-mapping) ---
  if (metadata.row && metadata.col) {
    const config = STEP_CANVAS_CONFIGS['journey-mapping'];
    const gridConfig = gridConfigOverride || (config?.gridConfig as GridConfig | undefined);

    if (gridConfig) {
      const rowIndex = gridConfig.rows.findIndex((r) => r.id === metadata.row);
      const colIndex = gridConfig.columns.findIndex((c) => c.id === metadata.col);

      if (rowIndex !== -1 && colIndex !== -1) {
        const bounds = getCellBounds({ row: rowIndex, col: colIndex }, gridConfig);
        const sameCell = existingPostIts.filter(
          (p) => p.cellAssignment?.row === metadata.row && p.cellAssignment?.col === metadata.col,
        );
        // Stagger within cell: offset by existing item count
        const staggerX = sameCell.length * 15;
        const staggerY = sameCell.length * 10;

        return {
          position: {
            x: bounds.x + gridConfig.cellPadding + staggerX,
            y: bounds.y + gridConfig.cellPadding + staggerY,
          },
          cellAssignment: { row: metadata.row, col: metadata.col },
        };
      }
    }
  }

  // --- Category-based steps (5: persona) ---
  if (metadata.category && CATEGORY_BASES[metadata.category]) {
    const base = CATEGORY_BASES[metadata.category];
    const sameCategory = existingPostIts.filter(
      (p) => p.cellAssignment?.row === metadata.category,
    );
    const idx = sameCategory.length;
    const col = idx % 2;
    const row = Math.floor(idx / 2);

    return {
      position: {
        x: base.x + col * (POST_IT_WIDTH + 20),
        y: base.y + row * (POST_IT_HEIGHT + 20),
      },
      // Store category in cellAssignment.row for stagger tracking
      cellAssignment: { row: metadata.category, col: '' },
    };
  }

  // --- Cluster-based positioning: place near parent post-it ---
  if (metadata.cluster) {
    const clusterLower = metadata.cluster.toLowerCase();
    const parent = existingPostIts.find(
      (p) => p.text.toLowerCase() === clusterLower
        || p.text.toLowerCase().startsWith(clusterLower),
    );
    if (parent) {
      // If parent is on a ring, place child on the same ring
      if (stepConfig?.hasRings && parent.cellAssignment?.row) {
        const ringConfig = stepConfig.ringConfig as RingConfig;
        const parentRing = ringConfig.rings.find((r) => r.id === parent.cellAssignment?.row);
        if (parentRing) {
          // Count all items already on this ring
          const sameRingPostIts = existingPostIts.filter(
            (p) => p.cellAssignment?.row === parent.cellAssignment?.row,
          );
          const positions = distributeCardsOnRing(
            sameRingPostIts.length + 1,
            parentRing.radius,
            ringConfig.center,
          );
          return {
            position: positions[positions.length - 1],
            cellAssignment: { row: parent.cellAssignment.row, col: '' },
          };
        }
      }

      // Non-ring fallback: place in 2-col grid below parent
      const siblings = existingPostIts.filter(
        (p) => p.id !== parent.id
          && Math.abs(p.position.x - parent.position.x) < (POST_IT_WIDTH + 20) * 3
          && Math.abs(p.position.y - parent.position.y) < (POST_IT_HEIGHT + 20) * 3,
      );
      const childIdx = siblings.length;
      const col = childIdx % 2;
      const row = Math.floor(childIdx / 2);

      return {
        position: {
          x: parent.position.x + col * (POST_IT_WIDTH + 20),
          y: parent.position.y + (POST_IT_HEIGHT + 25) + row * (POST_IT_HEIGHT + 20),
        },
        quadrant: parent.quadrant,
      };
    }
  }

  // --- Fallback: stagger from (50, 50) ---
  const idx = existingPostIts.length;
  return {
    position: {
      x: 50 + (idx % 4) * 30,
      y: 50 + Math.floor(idx / 4) * 30,
    },
  };
}

/**
 * Compute reorganized positions for all post-its, grouping by cluster
 * and distributing clusters evenly around their assigned rings.
 *
 * Used by the "Organize" button and [THEME_SORT] AI trigger.
 */
export function computeThemeSortPositions(
  postIts: PostIt[],
  stepId: string,
): Array<{ id: string; position: { x: number; y: number }; cellAssignment?: { row: string; col: string } }> {
  const stepConfig = STEP_CANVAS_CONFIGS[stepId];
  if (!stepConfig?.hasRings || !stepConfig.ringConfig) return [];

  const ringConfig = stepConfig.ringConfig as RingConfig;
  const results: Array<{ id: string; position: { x: number; y: number }; cellAssignment?: { row: string; col: string } }> = [];

  // Build cluster map: clusterName → { parent, children }
  type ClusterGroup = { parent: PostIt | null; children: PostIt[] };
  const clusters = new Map<string, ClusterGroup>();
  const standalone: PostIt[] = [];

  // Index post-its by lowercase text for parent lookup
  const textIndex = new Map<string, PostIt>();
  for (const p of postIts) {
    textIndex.set(p.text.toLowerCase(), p);
  }

  // First pass: identify parents and children
  for (const p of postIts) {
    if (p.cluster) {
      const clusterKey = p.cluster.toLowerCase();
      if (!clusters.has(clusterKey)) {
        // Check if parent exists
        const parent = textIndex.get(clusterKey) || null;
        clusters.set(clusterKey, { parent, children: [] });
      }
      const group = clusters.get(clusterKey)!;
      // Don't add the parent to its own children
      if (group.parent?.id !== p.id) {
        group.children.push(p);
      }
    } else {
      // Check if this item IS a parent of some cluster
      const asParentKey = p.text.toLowerCase();
      if (clusters.has(asParentKey)) {
        clusters.get(asParentKey)!.parent = p;
      } else {
        standalone.push(p);
      }
    }
  }

  // Second pass: standalone items that turned out to be cluster parents
  const standaloneFiltered = standalone.filter((p) => {
    const key = p.text.toLowerCase();
    if (clusters.has(key)) return false; // Already assigned as parent
    return true;
  });

  // Group clusters by ring assignment
  type RingGroup = { clusterId: string; parent: PostIt | null; children: PostIt[] }[];
  const ringGroups = new Map<string, RingGroup>();
  for (const ringDef of ringConfig.rings) {
    ringGroups.set(ringDef.id, []);
  }

  for (const [clusterId, group] of clusters) {
    // Determine ring from parent's cellAssignment, or default to 'middle'
    const ringId = group.parent?.cellAssignment?.row || 'middle';
    const validRing = ringConfig.rings.find((r) => r.id === ringId) ? ringId : 'middle';
    if (!ringGroups.has(validRing)) ringGroups.set(validRing, []);
    ringGroups.get(validRing)!.push({ clusterId, ...group });
  }

  // Add standalone items as single-item clusters
  for (const p of standaloneFiltered) {
    const ringId = p.cellAssignment?.row || 'outer';
    const validRing = ringConfig.rings.find((r) => r.id === ringId) ? ringId : 'outer';
    if (!ringGroups.has(validRing)) ringGroups.set(validRing, []);
    ringGroups.get(validRing)!.push({ clusterId: p.id, parent: p, children: [] });
  }

  // Distribute clusters around each ring
  for (const [ringId, clusterList] of ringGroups) {
    if (clusterList.length === 0) continue;
    const ring = ringConfig.rings.find((r) => r.id === ringId);
    if (!ring) continue;

    const angleStep = (2 * Math.PI) / clusterList.length;
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < clusterList.length; i++) {
      const cluster = clusterList[i];
      const angle = startAngle + i * angleStep;

      // Anchor point on ring circumference
      const anchorX = ringConfig.center.x + ring.radius * Math.cos(angle);
      const anchorY = ringConfig.center.y + ring.radius * Math.sin(angle);

      // Place parent at anchor
      if (cluster.parent) {
        results.push({
          id: cluster.parent.id,
          position: {
            x: anchorX - POST_IT_WIDTH / 2,
            y: anchorY - POST_IT_HEIGHT / 2,
          },
          cellAssignment: { row: ringId, col: '' },
        });
      }

      // Place children in 2-col grid below anchor
      for (let j = 0; j < cluster.children.length; j++) {
        const child = cluster.children[j];
        const col = j % 2;
        const row = Math.floor(j / 2);
        results.push({
          id: child.id,
          position: {
            x: anchorX - POST_IT_WIDTH / 2 + col * (POST_IT_WIDTH + 15),
            y: anchorY + POST_IT_HEIGHT / 2 + 15 + row * (POST_IT_HEIGHT + 15),
          },
          cellAssignment: { row: ringId, col: '' },
        });
      }
    }
  }

  return results;
}

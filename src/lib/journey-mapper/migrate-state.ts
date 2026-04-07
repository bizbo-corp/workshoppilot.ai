/**
 * Migration: legacy shared-state → per-view state (schema v2).
 *
 * Legacy format has top-level `edges` and `groups` but no `journeyView`/`sitemapView`.
 * New format stores independent positions, edges, and node subsets per view.
 */

import type {
  JourneyMapperState,
  ViewState,
  SitemapViewState,
} from './types';

/** Returns true if state is legacy (pre-view-separation) format */
export function isLegacyState(state: Record<string, unknown>): boolean {
  if ((state._schemaVersion as number) >= 2) return false;
  // Has nodes/edges at top level but no journeyView
  return Array.isArray(state.nodes) && !state.journeyView;
}

/** Convert legacy shared state → per-view state */
export function migrateToViewState(legacy: JourneyMapperState): JourneyMapperState {
  // Already migrated
  if (legacy._schemaVersion && legacy._schemaVersion >= 2) return legacy;
  if (legacy.journeyView && legacy.sitemapView) return legacy;

  const nodeIds = legacy.nodes.map((n) => n.id);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of legacy.nodes) {
    positions[node.id] = node.position;
  }

  const journeyView: ViewState = {
    nodeIds: [...nodeIds],
    positions: { ...positions },
    edges: legacy.edges ? [...legacy.edges] : [],
  };

  const sitemapView: SitemapViewState = {
    nodeIds: [...nodeIds],
    positions: { ...positions },
    edges: legacy.edges ? [...legacy.edges] : [],
    groups: legacy.groups ? [...legacy.groups] : [],
  };

  return {
    ...legacy,
    journeyView,
    sitemapView,
    activeView: 'journey',
    _schemaVersion: 2,
  };
}

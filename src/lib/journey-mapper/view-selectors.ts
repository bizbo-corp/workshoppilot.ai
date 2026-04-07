/**
 * View selectors: resolve per-view state against the master node pool.
 *
 * These functions combine the view's nodeIds + positions with the master
 * nodes[] array to produce fully-resolved data for rendering.
 */

import type {
  JourneyMapperState,
  JourneyMapperNode,
  JourneyMapperEdge,
  NavigationGroup,
} from './types';

/** Get nodes for a specific view, with view-specific positions applied */
export function getNodesForView(
  state: JourneyMapperState,
  view: 'journey' | 'sitemap'
): JourneyMapperNode[] {
  const viewState = view === 'journey' ? state.journeyView : state.sitemapView;
  // Fallback for unmigrated / missing view state
  if (!viewState?.nodeIds) return state.nodes;

  const nodeIdSet = new Set(viewState.nodeIds);
  const positions = viewState.positions;

  return state.nodes
    .filter((n) => nodeIdSet.has(n.id))
    .map((n) => ({
      ...n,
      position: positions[n.id] ?? n.position,
    }));
}

/** Get edges for a specific view */
export function getEdgesForView(
  state: JourneyMapperState,
  view: 'journey' | 'sitemap'
): JourneyMapperEdge[] {
  const viewState = view === 'journey' ? state.journeyView : state.sitemapView;
  if (!viewState?.edges) return state.edges;
  return viewState.edges;
}

/** Get groups for a specific view (empty for journey, sitemapView.groups for sitemap) */
export function getGroupsForView(
  state: JourneyMapperState,
  view: 'journey' | 'sitemap'
): NavigationGroup[] {
  if (view === 'journey') return [];
  return state.sitemapView?.groups ?? state.groups;
}

/** Get nodes for the currently active view */
export function getActiveViewNodes(state: JourneyMapperState): JourneyMapperNode[] {
  return getNodesForView(state, state.activeView);
}

/** Get edges for the currently active view */
export function getActiveViewEdges(state: JourneyMapperState): JourneyMapperEdge[] {
  return getEdgesForView(state, state.activeView);
}

/** Get groups for the currently active view */
export function getActiveViewGroups(state: JourneyMapperState): NavigationGroup[] {
  return getGroupsForView(state, state.activeView);
}

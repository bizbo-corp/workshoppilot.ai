import { createStore } from 'zustand/vanilla';
import type {
  JourneyMapperNode,
  JourneyMapperEdge,
  JourneyStageColumn,
  JourneyMapperState,
  ViewState,
  SitemapViewState,
  ConceptRelationship,
  StrategicIntent,
  NavigationGroup,
  LayoutMode,
} from '@/lib/journey-mapper/types';
import { GROUP_COLORS } from '@/lib/journey-mapper/types';

export type JourneyMapperActions = {
  setNodes: (nodes: JourneyMapperNode[]) => void;
  updateNode: (id: string, updates: Partial<JourneyMapperNode>) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  addNode: (node: JourneyMapperNode) => void;

  setEdges: (edges: JourneyMapperEdge[]) => void;
  addEdge: (edge: JourneyMapperEdge) => void;
  deleteEdge: (id: string) => void;
  updateEdge: (id: string, updates: Partial<JourneyMapperEdge>) => void;

  setStages: (stages: JourneyStageColumn[]) => void;
  setGroups: (groups: NavigationGroup[]) => void;
  setConceptRelationship: (rel: ConceptRelationship) => void;
  setChallengeContext: (ctx: string) => void;
  setPersonaName: (name: string) => void;

  setStrategicIntent: (intent: StrategicIntent) => void;
  setApproved: (approved: boolean) => void;

  setLayoutMode: (mode: LayoutMode) => void;
  addGroup: (group: NavigationGroup) => void;
  updateGroup: (id: string, updates: Partial<NavigationGroup>) => void;
  deleteGroup: (id: string) => void;
  moveNodeToGroup: (nodeId: string, groupId: string | undefined) => void;

  // View-specific actions
  setActiveView: (view: 'journey' | 'sitemap') => void;
  removeFromJourney: (nodeId: string) => void;
  addToJourney: (nodeId: string, pos?: { x: number; y: number }) => void;
  setViewPositions: (view: 'journey' | 'sitemap', positions: Record<string, { x: number; y: number }>) => void;

  setState: (state: Partial<JourneyMapperState>) => void;
  markDirty: () => void;
  markClean: () => void;
};

export type JourneyMapperStore = JourneyMapperState & JourneyMapperActions;

const emptyViewState: ViewState = {
  nodeIds: [],
  positions: {},
  edges: [],
};

const emptySitemapViewState: SitemapViewState = {
  nodeIds: [],
  positions: {},
  edges: [],
  groups: [],
};

const defaultState: JourneyMapperState = {
  nodes: [],
  edges: [],
  stages: [],
  groups: [],
  journeyView: { ...emptyViewState },
  sitemapView: { ...emptySitemapViewState },
  activeView: 'journey',
  challengeContext: '',
  personaName: '',
  conceptRelationship: 'combined',
  strategicIntent: 'web-app',
  layoutMode: 'freeform',
  isApproved: false,
  isDirty: false,
  lastGeneratedAt: undefined,
  _schemaVersion: 2,
};

// Helper: remove a node from a ViewState (removes from nodeIds, positions, edges)
function removeNodeFromView(view: ViewState, nodeId: string): ViewState {
  const { [nodeId]: _, ...restPositions } = view.positions;
  return {
    nodeIds: view.nodeIds.filter((id) => id !== nodeId),
    positions: restPositions,
    edges: view.edges.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
  };
}

// Helper: remove a node from a SitemapViewState
function removeNodeFromSitemapView(view: SitemapViewState, nodeId: string): SitemapViewState {
  const base = removeNodeFromView(view, nodeId);
  return { ...base, groups: view.groups };
}

export function createJourneyMapperStore(initState?: Partial<JourneyMapperState>) {
  return createStore<JourneyMapperStore>()((set, get) => ({
    ...defaultState,
    ...initState,

    setNodes: (nodes) => set({ nodes }),

    updateNode: (id, updates) =>
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        isDirty: true,
      })),

    // Updates activeView's positions map only
    moveNode: (id, position) =>
      set((state) => {
        const view = state.activeView;
        if (view === 'journey') {
          return {
            journeyView: {
              ...state.journeyView,
              positions: { ...state.journeyView.positions, [id]: position },
            },
            isDirty: true,
          };
        }
        return {
          sitemapView: {
            ...state.sitemapView,
            positions: { ...state.sitemapView.positions, [id]: position },
          },
          isDirty: true,
        };
      }),

    // Journey view: remove from journey only. Sitemap view: remove from master + both views
    deleteNode: (id) =>
      set((state) => {
        if (state.activeView === 'journey') {
          // Remove from journey view only — node stays in master pool and sitemap
          return {
            journeyView: removeNodeFromView(state.journeyView, id) as ViewState,
            isDirty: true,
          };
        }
        // Sitemap delete = permanent: remove from master pool + both views
        return {
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.sourceNodeId !== id && e.targetNodeId !== id),
          journeyView: removeNodeFromView(state.journeyView, id) as ViewState,
          sitemapView: removeNodeFromSitemapView(state.sitemapView, id),
          isDirty: true,
        };
      }),

    // Add to master pool + both views
    addNode: (node) =>
      set((state) => ({
        nodes: [...state.nodes, node],
        journeyView: {
          ...state.journeyView,
          nodeIds: [...state.journeyView.nodeIds, node.id],
          positions: { ...state.journeyView.positions, [node.id]: node.position },
        },
        sitemapView: {
          ...state.sitemapView,
          nodeIds: [...state.sitemapView.nodeIds, node.id],
          positions: { ...state.sitemapView.positions, [node.id]: node.position },
        },
        isDirty: true,
      })),

    setEdges: (edges) => set({ edges }),

    // Operate on activeView's edge array
    addEdge: (edge) =>
      set((state) => {
        const view = state.activeView;
        if (view === 'journey') {
          return {
            journeyView: {
              ...state.journeyView,
              edges: [...state.journeyView.edges, edge],
            },
            isDirty: true,
          };
        }
        return {
          sitemapView: {
            ...state.sitemapView,
            edges: [...state.sitemapView.edges, edge],
          },
          isDirty: true,
        };
      }),

    deleteEdge: (id) =>
      set((state) => {
        const view = state.activeView;
        if (view === 'journey') {
          return {
            journeyView: {
              ...state.journeyView,
              edges: state.journeyView.edges.filter((e) => e.id !== id),
            },
            isDirty: true,
          };
        }
        return {
          sitemapView: {
            ...state.sitemapView,
            edges: state.sitemapView.edges.filter((e) => e.id !== id),
          },
          isDirty: true,
        };
      }),

    updateEdge: (id, updates) =>
      set((state) => {
        const view = state.activeView;
        if (view === 'journey') {
          return {
            journeyView: {
              ...state.journeyView,
              edges: state.journeyView.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
            },
            isDirty: true,
          };
        }
        return {
          sitemapView: {
            ...state.sitemapView,
            edges: state.sitemapView.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          },
          isDirty: true,
        };
      }),

    setStages: (stages) => set({ stages }),

    // Sets groups on sitemapView (canonical location)
    setGroups: (groups) =>
      set((state) => ({
        groups,
        sitemapView: { ...state.sitemapView, groups },
      })),

    setConceptRelationship: (conceptRelationship) =>
      set({ conceptRelationship, isDirty: true }),

    setChallengeContext: (challengeContext) =>
      set({ challengeContext, isDirty: true }),

    setPersonaName: (personaName) =>
      set({ personaName, isDirty: true }),

    setStrategicIntent: (strategicIntent) =>
      set({ strategicIntent, isDirty: true }),

    setApproved: (isApproved) =>
      set({ isApproved, isDirty: true }),

    setLayoutMode: (layoutMode) =>
      set({ layoutMode, isDirty: true }),

    // Groups always operate on sitemapView
    addGroup: (group) =>
      set((state) => {
        const smGroups = state.sitemapView.groups;
        const color = group.color || GROUP_COLORS[smGroups.length % GROUP_COLORS.length].key;
        const newGroup = { ...group, color };
        return {
          groups: [...state.groups, newGroup],
          sitemapView: {
            ...state.sitemapView,
            groups: [...smGroups, newGroup],
          },
          isDirty: true,
        };
      }),

    updateGroup: (id, updates) =>
      set((state) => {
        const mapper = (g: NavigationGroup) => (g.id === id ? { ...g, ...updates } : g);
        return {
          groups: state.groups.map(mapper),
          sitemapView: {
            ...state.sitemapView,
            groups: state.sitemapView.groups.map(mapper),
          },
          isDirty: true,
        };
      }),

    deleteGroup: (id) =>
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        sitemapView: {
          ...state.sitemapView,
          groups: state.sitemapView.groups.filter((g) => g.id !== id),
        },
        nodes: state.nodes.map((n) => (n.groupId === id ? { ...n, groupId: undefined } : n)),
        isDirty: true,
      })),

    // Updates master node's groupId
    moveNodeToGroup: (nodeId, groupId) =>
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, groupId } : n)),
        isDirty: true,
      })),

    // Switch active view
    setActiveView: (activeView) => set({ activeView }),

    // Remove node from journey view only
    removeFromJourney: (nodeId) =>
      set((state) => ({
        journeyView: removeNodeFromView(state.journeyView, nodeId) as ViewState,
        isDirty: true,
      })),

    // Add existing node to journey view
    addToJourney: (nodeId, pos) =>
      set((state) => {
        if (state.journeyView.nodeIds.includes(nodeId)) return {};
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return {};
        const position = pos ?? state.sitemapView.positions[nodeId] ?? node.position;
        return {
          journeyView: {
            ...state.journeyView,
            nodeIds: [...state.journeyView.nodeIds, nodeId],
            positions: { ...state.journeyView.positions, [nodeId]: position },
          },
          isDirty: true,
        };
      }),

    // Bulk set positions for a view (used by auto-tidy/layout)
    setViewPositions: (view, positions) =>
      set((state) => {
        if (view === 'journey') {
          return {
            journeyView: { ...state.journeyView, positions: { ...state.journeyView.positions, ...positions } },
            isDirty: true,
          };
        }
        return {
          sitemapView: { ...state.sitemapView, positions: { ...state.sitemapView.positions, ...positions } },
          isDirty: true,
        };
      }),

    setState: (partial) => set(partial),

    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),
  }));
}

export type JourneyMapperStoreApi = ReturnType<typeof createJourneyMapperStore>;

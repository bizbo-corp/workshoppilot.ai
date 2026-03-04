import { createStore } from 'zustand/vanilla';
import type {
  JourneyMapperNode,
  JourneyMapperEdge,
  JourneyStageColumn,
  JourneyMapperState,
  ConceptRelationship,
  StrategicIntent,
} from '@/lib/journey-mapper/types';

export type JourneyMapperActions = {
  setNodes: (nodes: JourneyMapperNode[]) => void;
  updateNode: (id: string, updates: Partial<JourneyMapperNode>) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  addNode: (node: JourneyMapperNode) => void;

  setEdges: (edges: JourneyMapperEdge[]) => void;
  addEdge: (edge: JourneyMapperEdge) => void;
  deleteEdge: (id: string) => void;

  setStages: (stages: JourneyStageColumn[]) => void;
  setConceptRelationship: (rel: ConceptRelationship) => void;
  setChallengeContext: (ctx: string) => void;
  setPersonaName: (name: string) => void;

  setStrategicIntent: (intent: StrategicIntent) => void;
  setApproved: (approved: boolean) => void;

  setState: (state: Partial<JourneyMapperState>) => void;
  markDirty: () => void;
  markClean: () => void;
};

export type JourneyMapperStore = JourneyMapperState & JourneyMapperActions;

const defaultState: JourneyMapperState = {
  nodes: [],
  edges: [],
  stages: [],
  challengeContext: '',
  personaName: '',
  conceptRelationship: 'combined',
  strategicIntent: 'web-app',
  isApproved: false,
  isDirty: false,
  lastGeneratedAt: undefined,
};

export function createJourneyMapperStore(initState?: Partial<JourneyMapperState>) {
  return createStore<JourneyMapperStore>()((set) => ({
    ...defaultState,
    ...initState,

    setNodes: (nodes) => set({ nodes }),

    updateNode: (id, updates) =>
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        isDirty: true,
      })),

    moveNode: (id, position) =>
      set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
        isDirty: true,
      })),

    deleteNode: (id) =>
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.sourceNodeId !== id && e.targetNodeId !== id),
        isDirty: true,
      })),

    addNode: (node) =>
      set((state) => ({
        nodes: [...state.nodes, node],
        isDirty: true,
      })),

    setEdges: (edges) => set({ edges }),

    addEdge: (edge) =>
      set((state) => ({
        edges: [...state.edges, edge],
        isDirty: true,
      })),

    deleteEdge: (id) =>
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== id),
        isDirty: true,
      })),

    setStages: (stages) => set({ stages }),

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

    setState: (partial) => set(partial),

    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),
  }));
}

export type JourneyMapperStoreApi = ReturnType<typeof createJourneyMapperStore>;

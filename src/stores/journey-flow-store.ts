import { createStore } from 'zustand/vanilla';
import type {
  JourneyFlowNode,
  JourneyFlowEdge,
  JourneyFlowState,
} from '@/lib/journey-flow/types';
import { DEFAULT_JOURNEY_FLOW_STATE } from '@/lib/journey-flow/types';

export type JourneyFlowActions = {
  addNode: (node: JourneyFlowNode) => void;
  updateNode: (id: string, updates: Partial<JourneyFlowNode>) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;          // also removes edges touching the node
  addEdge: (edge: JourneyFlowEdge) => void;
  deleteEdge: (id: string) => void;
  setApproved: (approved: boolean) => void;  // set({ isApproved: approved, isDirty: true })
  setState: (state: Partial<JourneyFlowState>) => void;
  markDirty: () => void;
  markClean: () => void;
};

export type JourneyFlowStore = JourneyFlowState & JourneyFlowActions;

export function createJourneyFlowStore(initState?: Partial<JourneyFlowState>) {
  return createStore<JourneyFlowStore>()((set) => ({
    ...DEFAULT_JOURNEY_FLOW_STATE,
    ...initState,

    addNode: (node) =>
      set((state) => ({
        nodes: [...state.nodes, node],
        isDirty: true,
      })),

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
        // Cascade: remove any edge that references this node
        edges: state.edges.filter(
          (e) => e.sourceNodeId !== id && e.targetNodeId !== id
        ),
        isDirty: true,
      })),

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

    setApproved: (approved) =>
      set({ isApproved: approved, isDirty: true }),

    setState: (partial) => set(partial),
    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),
  }));
}

export type JourneyFlowStoreApi = ReturnType<typeof createJourneyFlowStore>;

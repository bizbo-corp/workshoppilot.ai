import { createStore } from 'zustand/vanilla';

export type PostIt = {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
};

export type CanvasState = {
  postIts: PostIt[];
  isDirty: boolean;
};

export type CanvasActions = {
  addPostIt: (postIt: Omit<PostIt, 'id'>) => void;
  updatePostIt: (id: string, updates: Partial<PostIt>) => void;
  deletePostIt: (id: string) => void;
  setPostIts: (postIts: PostIt[]) => void;
  markClean: () => void;
};

export type CanvasStore = CanvasState & CanvasActions;

export const createCanvasStore = (initState?: { postIts: PostIt[] }) => {
  const DEFAULT_STATE: CanvasState = {
    postIts: initState?.postIts || [],
    isDirty: false,
  };

  return createStore<CanvasStore>()((set) => ({
    ...DEFAULT_STATE,

    addPostIt: (postIt) =>
      set((state) => ({
        postIts: [
          ...state.postIts,
          {
            ...postIt,
            id: crypto.randomUUID(),
          },
        ],
        isDirty: true,
      })),

    updatePostIt: (id, updates) =>
      set((state) => ({
        postIts: state.postIts.map((postIt) =>
          postIt.id === id ? { ...postIt, ...updates } : postIt
        ),
        isDirty: true,
      })),

    deletePostIt: (id) =>
      set((state) => ({
        postIts: state.postIts.filter((postIt) => postIt.id !== id),
        isDirty: true,
      })),

    setPostIts: (postIts) =>
      set(() => ({
        postIts,
        // NOTE: Does NOT set isDirty — this is for loading from DB
      })),

    markClean: () =>
      set(() => ({
        isDirty: false,
      })),
  }));
};

import { createStore } from 'zustand/vanilla';
import { temporal } from 'zundo';

export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'orange';

export type PostIt = {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color?: PostItColor;
  parentId?: string;
  type?: 'postIt' | 'group';
};

export type CanvasState = {
  postIts: PostIt[];
  isDirty: boolean;
};

export type CanvasActions = {
  addPostIt: (postIt: Omit<PostIt, 'id'>) => void;
  updatePostIt: (id: string, updates: Partial<PostIt>) => void;
  updatePostItColor: (id: string, color: PostItColor) => void;
  deletePostIt: (id: string) => void;
  batchDeletePostIts: (ids: string[]) => void;
  setPostIts: (postIts: PostIt[]) => void;
  markClean: () => void;
};

export type CanvasStore = CanvasState & CanvasActions;

export const createCanvasStore = (initState?: { postIts: PostIt[] }) => {
  const DEFAULT_STATE: CanvasState = {
    postIts: initState?.postIts || [],
    isDirty: false,
  };

  return createStore<CanvasStore>()(
    temporal(
      (set) => ({
        ...DEFAULT_STATE,

        addPostIt: (postIt) =>
          set((state) => ({
            postIts: [
              ...state.postIts,
              {
                ...postIt,
                id: crypto.randomUUID(),
                color: postIt.color || 'yellow',
                type: postIt.type || 'postIt',
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

        updatePostItColor: (id, color) =>
          set((state) => ({
            postIts: state.postIts.map((postIt) =>
              postIt.id === id ? { ...postIt, color } : postIt
            ),
            isDirty: true,
          })),

        deletePostIt: (id) =>
          set((state) => ({
            postIts: state.postIts.filter((postIt) => postIt.id !== id),
            isDirty: true,
          })),

        batchDeletePostIts: (ids) =>
          set((state) => ({
            postIts: state.postIts.filter((postIt) => !ids.includes(postIt.id)),
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
      }),
      {
        partialize: (state) => ({
          postIts: state.postIts,
        }),
        limit: 50,
        equality: (pastState, currentState) =>
          JSON.stringify(pastState) === JSON.stringify(currentState),
      }
    )
  );
};

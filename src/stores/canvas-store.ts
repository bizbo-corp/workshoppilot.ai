import { createStore } from 'zustand/vanilla';
import { temporal } from 'zundo';
import type { Quadrant } from '@/lib/canvas/quadrant-detection';

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
  quadrant?: Quadrant; // Quadrant position for steps with quadrant layout
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
  groupPostIts: (postItIds: string[]) => void;
  ungroupPostIts: (groupId: string) => void;
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

        groupPostIts: (postItIds) =>
          set((state) => {
            // Find all post-its to be grouped
            const selectedPostIts = state.postIts.filter((p) => postItIds.includes(p.id));
            if (selectedPostIts.length < 2) return state; // Need at least 2 to group

            // Calculate bounding box
            const minX = Math.min(...selectedPostIts.map((p) => p.position.x));
            const minY = Math.min(...selectedPostIts.map((p) => p.position.y));
            const maxX = Math.max(...selectedPostIts.map((p) => p.position.x + p.width));
            const maxY = Math.max(...selectedPostIts.map((p) => p.position.y + p.height));

            // Create group node
            const groupId = crypto.randomUUID();
            const groupNode: PostIt = {
              id: groupId,
              text: '',
              type: 'group',
              color: 'yellow', // Not visible on groups, but satisfies type
              position: { x: minX - 20, y: minY - 20 }, // 20px padding
              width: maxX - minX + 40,
              height: maxY - minY + 40,
            };

            // Update children with relative positions and parentId
            const updatedChildren = selectedPostIts.map((postIt) => ({
              ...postIt,
              parentId: groupId,
              position: {
                x: postIt.position.x - minX + 20, // Relative to group + padding
                y: postIt.position.y - minY + 20,
              },
            }));

            // Build new array: group first, then non-selected, then children
            const otherPostIts = state.postIts.filter((p) => !postItIds.includes(p.id));
            const newPostIts = [groupNode, ...otherPostIts, ...updatedChildren];

            return {
              postIts: newPostIts,
              isDirty: true,
            };
          }),

        ungroupPostIts: (groupId) =>
          set((state) => {
            // Find the group node
            const group = state.postIts.find((p) => p.id === groupId);
            if (!group || group.type !== 'group') return state;

            // Find all children
            const children = state.postIts.filter((p) => p.parentId === groupId);

            // Convert children back to absolute positions
            const absoluteChildren = children.map((child) => ({
              ...child,
              parentId: undefined,
              position: {
                x: group.position.x + child.position.x,
                y: group.position.y + child.position.y,
              },
            }));

            // Remove group, keep other post-its, add absolute children
            const newPostIts = [
              ...state.postIts.filter((p) => p.id !== groupId && p.parentId !== groupId),
              ...absoluteChildren,
            ];

            return {
              postIts: newPostIts,
              isDirty: true,
            };
          }),

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

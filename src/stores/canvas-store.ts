import { createStore } from 'zustand/vanilla';
import { temporal } from 'zundo';
import type { Quadrant } from '@/lib/canvas/quadrant-detection';
import type { GridConfig } from '@/lib/canvas/grid-layout';
import { getCellBounds } from '@/lib/canvas/grid-layout';

export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'orange';

export type GridColumn = {
  id: string;
  label: string;
  width: number;
};

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
  cellAssignment?: {
    row: string; // Row ID from GridConfig (e.g., 'actions', 'goals')
    col: string; // Column ID from GridConfig (e.g., 'awareness', 'consideration')
  };
  isPreview?: boolean; // When true, indicates AI-suggested preview node awaiting confirmation
  previewReason?: string; // Optional AI explanation for why this placement was suggested
};

export type CanvasState = {
  postIts: PostIt[];
  isDirty: boolean;
  gridColumns: GridColumn[]; // Dynamic columns, initialized from step config
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
  setGridColumns: (gridColumns: GridColumn[]) => void;
  addGridColumn: (label: string) => void;
  updateGridColumn: (id: string, updates: Partial<GridColumn>) => void;
  removeGridColumn: (id: string, gridConfig: GridConfig) => void;
  confirmPreview: (id: string) => void;
  rejectPreview: (id: string) => void;
  markClean: () => void;
};

export type CanvasStore = CanvasState & CanvasActions;

export const createCanvasStore = (initState?: { postIts: PostIt[]; gridColumns?: GridColumn[] }) => {
  const DEFAULT_STATE: CanvasState = {
    postIts: initState?.postIts || [],
    gridColumns: initState?.gridColumns || [],
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

        setGridColumns: (gridColumns) =>
          set(() => ({
            gridColumns,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        addGridColumn: (label) =>
          set((state) => ({
            gridColumns: [
              ...state.gridColumns,
              {
                id: crypto.randomUUID(),
                label,
                width: 240,
              },
            ],
            isDirty: true,
          })),

        updateGridColumn: (id, updates) =>
          set((state) => ({
            gridColumns: state.gridColumns.map((col) =>
              col.id === id ? { ...col, ...updates } : col
            ),
            isDirty: true,
          })),

        removeGridColumn: (id, gridConfig) =>
          set((state) => {
            // Find column index
            const colIndex = state.gridColumns.findIndex((col) => col.id === id);
            if (colIndex === -1) return state;

            // Determine adjacent target column (prefer left, fall back to right)
            const targetColIndex = colIndex > 0 ? colIndex - 1 : colIndex + 1;
            const targetColumn = state.gridColumns[targetColIndex];

            // Filter out deleted column
            const filteredColumns = state.gridColumns.filter((col) => col.id !== id);

            // Update post-its that reference deleted column
            const updatedPostIts = state.postIts.map((postIt) => {
              const cellAssignment = postIt.cellAssignment;
              if (cellAssignment?.col === id) {
                if (targetColumn) {
                  // Move to adjacent column
                  const newColIndex = filteredColumns.findIndex(
                    (col) => col.id === targetColumn.id
                  );
                  const rowIndex = gridConfig.rows.findIndex(
                    (row) => row.id === cellAssignment.row
                  );

                  if (newColIndex !== -1 && rowIndex !== -1) {
                    const newPosition = getCellBounds(
                      { row: rowIndex, col: newColIndex },
                      { ...gridConfig, columns: filteredColumns }
                    );

                    return {
                      ...postIt,
                      cellAssignment: {
                        row: cellAssignment.row,
                        col: targetColumn.id,
                      },
                      position: {
                        x: newPosition.x + gridConfig.cellPadding,
                        y: newPosition.y + gridConfig.cellPadding,
                      },
                    };
                  }
                }
                // No target column (deleting last column) - clear cellAssignment
                return {
                  ...postIt,
                  cellAssignment: undefined,
                };
              }
              return postIt;
            });

            return {
              postIts: updatedPostIts,
              gridColumns: filteredColumns,
              isDirty: true,
            };
          }),

        confirmPreview: (id) =>
          set((state) => ({
            postIts: state.postIts.map((postIt) =>
              postIt.id === id ? { ...postIt, isPreview: false, previewReason: undefined } : postIt
            ),
            isDirty: true,
          })),

        rejectPreview: (id) =>
          set((state) => ({
            postIts: state.postIts.filter((postIt) => postIt.id !== id),
            isDirty: true,
          })),

        markClean: () =>
          set(() => ({
            isDirty: false,
          })),
      }),
      {
        partialize: (state) => ({
          postIts: state.postIts,
          gridColumns: state.gridColumns,
        }),
        limit: 50,
        equality: (pastState, currentState) =>
          JSON.stringify(pastState) === JSON.stringify(currentState),
      }
    )
  );
};

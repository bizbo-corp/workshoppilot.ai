import { createStore } from 'zustand/vanilla';
import { temporal } from 'zundo';
import type { Quadrant } from '@/lib/canvas/quadrant-detection';
import type { GridConfig } from '@/lib/canvas/grid-layout';
import { getCellBounds } from '@/lib/canvas/grid-layout';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';
import type { BrainRewritingMatrix, BrainRewritingCell } from '@/lib/canvas/brain-rewriting-types';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';

export type PendingHmwChipSelection = {
  cardId: string;
  field: string;
  value: string;
} | null;

export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'red';

export type GridColumn = {
  id: string;
  label: string;
  width: number;
};

export type MindMapNodeState = {
  id: string;
  label: string;
  themeColorId: string;
  themeColor: string;
  themeBgColor: string;
  isRoot: boolean;
  level: number;          // 0 = root, 1 = theme branch, 2+ = sub-ideas
  parentId?: string;      // ID of parent node (undefined for root)
  position?: { x: number; y: number }; // Free-form canvas position (persisted)
};

export type MindMapEdgeState = {
  id: string;
  source: string;
  target: string;
  themeColor: string;
};

export type DrawingNode = {
  id: string;
  drawingId: string;   // ID in stepArtifacts.drawings array
  imageUrl: string;    // Vercel Blob CDN URL
  position: { x: number; y: number };
  width: number;
  height: number;
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
  cluster?: string; // Parent label for hierarchical clustering (stakeholder mapping)
  isPreview?: boolean; // When true, indicates AI-suggested preview node awaiting confirmation
  previewReason?: string; // Optional AI explanation for why this placement was suggested
};

export type CanvasState = {
  postIts: PostIt[];
  drawingNodes: DrawingNode[];
  crazy8sSlots: Crazy8sSlot[];
  mindMapNodes: MindMapNodeState[];
  mindMapEdges: MindMapEdgeState[];
  conceptCards: ConceptCardData[];
  personaTemplates: PersonaTemplateData[];
  hmwCards: HmwCardData[];
  selectedSlotIds: string[];
  brainRewritingMatrices: BrainRewritingMatrix[];
  isDirty: boolean;
  gridColumns: GridColumn[]; // Dynamic columns, initialized from step config
  highlightedCell: { row: number; col: number } | null;
  pendingFitView: boolean;
  pendingHmwChipSelection: PendingHmwChipSelection;
  selectedPostItIds: string[];
};

export type CanvasActions = {
  addPostIt: (postIt: Omit<PostIt, 'id'> & { id?: string }) => void;
  updatePostIt: (id: string, updates: Partial<PostIt>) => void;
  updatePostItColor: (id: string, color: PostItColor) => void;
  deletePostIt: (id: string) => void;
  batchDeletePostIts: (ids: string[]) => void;
  groupPostIts: (postItIds: string[]) => void;
  ungroupPostIts: (groupId: string) => void;
  setPostIts: (postIts: PostIt[]) => void;
  addDrawingNode: (node: Omit<DrawingNode, 'id'>) => void;
  updateDrawingNode: (id: string, updates: Partial<DrawingNode>) => void;
  deleteDrawingNode: (id: string) => void;
  setDrawingNodes: (nodes: DrawingNode[]) => void;
  updateCrazy8sSlot: (slotId: string, updates: Partial<Crazy8sSlot>) => void;
  setCrazy8sSlots: (slots: Crazy8sSlot[]) => void;
  addMindMapNode: (node: MindMapNodeState, edge?: MindMapEdgeState) => void;
  updateMindMapNode: (id: string, updates: Partial<MindMapNodeState>) => void;
  deleteMindMapNode: (id: string) => void;
  updateMindMapNodePosition: (id: string, position: { x: number; y: number }) => void;
  setMindMapState: (nodes: MindMapNodeState[], edges: MindMapEdgeState[]) => void;
  setGridColumns: (gridColumns: GridColumn[]) => void;
  replaceGridColumns: (gridColumns: GridColumn[]) => void;
  addGridColumn: (label: string) => void;
  updateGridColumn: (id: string, updates: Partial<GridColumn>) => void;
  removeGridColumn: (id: string, gridConfig: GridConfig) => void;
  confirmPreview: (id: string) => void;
  rejectPreview: (id: string) => void;
  setHighlightedCell: (cell: { row: number; col: number } | null) => void;
  setPendingFitView: (pending: boolean) => void;
  setPendingHmwChipSelection: (selection: PendingHmwChipSelection) => void;
  batchUpdatePositions: (updates: Array<{ id: string; position: { x: number; y: number }; cellAssignment?: { row: string; col: string } }>) => void;
  setCluster: (ids: string[], clusterName: string) => void;
  clearCluster: (clusterName: string) => void;
  renameCluster: (oldName: string, newName: string) => void;
  removeFromCluster: (id: string) => void;
  setSelectedPostItIds: (ids: string[]) => void;
  addConceptCard: (card: Omit<ConceptCardData, 'id'>) => void;
  updateConceptCard: (id: string, updates: Partial<ConceptCardData>) => void;
  deleteConceptCard: (id: string) => void;
  setConceptCards: (cards: ConceptCardData[]) => void;
  addPersonaTemplate: (template: Omit<PersonaTemplateData, 'id'>) => void;
  updatePersonaTemplate: (id: string, updates: Partial<PersonaTemplateData>) => void;
  deletePersonaTemplate: (id: string) => void;
  setPersonaTemplates: (templates: PersonaTemplateData[]) => void;
  addHmwCard: (card: Omit<HmwCardData, 'id'> & { id?: string }) => void;
  updateHmwCard: (id: string, updates: Partial<HmwCardData>) => void;
  deleteHmwCard: (id: string) => void;
  setHmwCards: (cards: HmwCardData[]) => void;
  setSelectedSlotIds: (ids: string[]) => void;
  setBrainRewritingMatrices: (matrices: BrainRewritingMatrix[]) => void;
  updateBrainRewritingCell: (slotId: string, cellId: string, updates: Partial<BrainRewritingCell>) => void;
  markClean: () => void;
};

export type CanvasStore = CanvasState & CanvasActions;

export const createCanvasStore = (initState?: { postIts: PostIt[]; gridColumns?: GridColumn[]; drawingNodes?: DrawingNode[]; crazy8sSlots?: Crazy8sSlot[]; mindMapNodes?: MindMapNodeState[]; mindMapEdges?: MindMapEdgeState[]; conceptCards?: ConceptCardData[]; personaTemplates?: PersonaTemplateData[]; hmwCards?: HmwCardData[]; selectedSlotIds?: string[]; brainRewritingMatrices?: BrainRewritingMatrix[] }) => {
  const DEFAULT_STATE: CanvasState = {
    postIts: initState?.postIts || [],
    drawingNodes: initState?.drawingNodes || [],
    crazy8sSlots: initState?.crazy8sSlots || [],
    mindMapNodes: initState?.mindMapNodes || [],
    mindMapEdges: initState?.mindMapEdges || [],
    conceptCards: initState?.conceptCards || [],
    personaTemplates: initState?.personaTemplates || [],
    hmwCards: initState?.hmwCards || [],
    selectedSlotIds: initState?.selectedSlotIds || [],
    brainRewritingMatrices: initState?.brainRewritingMatrices || [],
    gridColumns: initState?.gridColumns || [],
    isDirty: false,
    highlightedCell: null,
    pendingFitView: false,
    pendingHmwChipSelection: null,
    selectedPostItIds: [],
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
                id: postIt.id || crypto.randomUUID(),
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

        addDrawingNode: (node) =>
          set((state) => ({
            drawingNodes: [
              ...state.drawingNodes,
              {
                ...node,
                id: crypto.randomUUID(),
              },
            ],
            isDirty: true,
          })),

        updateDrawingNode: (id, updates) =>
          set((state) => ({
            drawingNodes: state.drawingNodes.map((node) =>
              node.id === id ? { ...node, ...updates } : node
            ),
            isDirty: true,
          })),

        deleteDrawingNode: (id) =>
          set((state) => ({
            drawingNodes: state.drawingNodes.filter((node) => node.id !== id),
            isDirty: true,
          })),

        setDrawingNodes: (nodes) =>
          set(() => ({
            drawingNodes: nodes,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        updateCrazy8sSlot: (slotId, updates) =>
          set((state) => ({
            crazy8sSlots: state.crazy8sSlots.map((slot) =>
              slot.slotId === slotId ? { ...slot, ...updates } : slot
            ),
            isDirty: true,
          })),

        setCrazy8sSlots: (slots) =>
          set(() => ({
            crazy8sSlots: slots,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        setGridColumns: (gridColumns) =>
          set(() => ({
            gridColumns,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        replaceGridColumns: (gridColumns) =>
          set(() => ({
            gridColumns,
            isDirty: true,
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

        setHighlightedCell: (cell) =>
          set(() => ({
            highlightedCell: cell,
          })),

        setPendingFitView: (pending) =>
          set(() => ({
            pendingFitView: pending,
          })),

        setPendingHmwChipSelection: (selection) =>
          set(() => ({
            pendingHmwChipSelection: selection,
          })),

        batchUpdatePositions: (updates) =>
          set((state) => {
            const updateMap = new Map(updates.map((u) => [u.id, u]));
            return {
              postIts: state.postIts.map((postIt) => {
                const update = updateMap.get(postIt.id);
                if (!update) return postIt;
                return {
                  ...postIt,
                  position: update.position,
                  ...(update.cellAssignment !== undefined ? { cellAssignment: update.cellAssignment } : {}),
                };
              }),
              isDirty: true,
            };
          }),

        setCluster: (ids, clusterName) =>
          set((state) => {
            const idSet = new Set(ids);
            return {
              postIts: state.postIts.map((postIt) =>
                idSet.has(postIt.id) ? { ...postIt, cluster: clusterName } : postIt
              ),
              isDirty: true,
            };
          }),

        clearCluster: (clusterName) =>
          set((state) => {
            const lower = clusterName.toLowerCase();
            return {
              postIts: state.postIts.map((postIt) =>
                postIt.cluster && postIt.cluster.toLowerCase() === lower
                  ? { ...postIt, cluster: undefined }
                  : postIt
              ),
              isDirty: true,
            };
          }),

        renameCluster: (oldName, newName) =>
          set((state) => {
            const oldLower = oldName.toLowerCase();
            const newLower = newName.toLowerCase();
            // Check if a child node's text matches the new name (for parent swap)
            const promotee = state.postIts.find(
              (p) => p.cluster?.toLowerCase() === oldLower && p.text.toLowerCase() === newLower
            );
            return {
              postIts: state.postIts.map((postIt) => {
                // Child of old cluster whose text matches new name → promote to parent
                if (promotee && postIt.id === promotee.id) {
                  return { ...postIt, cluster: undefined };
                }
                // Other children of old cluster → update cluster name
                if (postIt.cluster?.toLowerCase() === oldLower) {
                  return { ...postIt, cluster: newName };
                }
                // Old parent (text matches old name, no cluster) → demote to child
                if (
                  !postIt.cluster &&
                  postIt.text.toLowerCase() === oldLower &&
                  (!postIt.type || postIt.type === 'postIt')
                ) {
                  return { ...postIt, cluster: newName };
                }
                return postIt;
              }),
              isDirty: true,
            };
          }),

        removeFromCluster: (id) =>
          set((state) => ({
            postIts: state.postIts.map((postIt) =>
              postIt.id === id ? { ...postIt, cluster: undefined } : postIt
            ),
            isDirty: true,
          })),

        setSelectedPostItIds: (ids) =>
          set(() => ({
            selectedPostItIds: ids,
          })),

        addMindMapNode: (node, edge) =>
          set((state) => ({
            mindMapNodes: [...state.mindMapNodes, node],
            mindMapEdges: edge ? [...state.mindMapEdges, edge] : state.mindMapEdges,
            isDirty: true,
          })),

        updateMindMapNode: (id, updates) =>
          set((state) => ({
            mindMapNodes: state.mindMapNodes.map((node) =>
              node.id === id ? { ...node, ...updates } : node
            ),
            isDirty: true,
          })),

        updateMindMapNodePosition: (id, position) =>
          set((state) => ({
            mindMapNodes: state.mindMapNodes.map((node) =>
              node.id === id ? { ...node, position } : node
            ),
            isDirty: true,
          })),

        deleteMindMapNode: (id) =>
          set((state) => {
            // Collect all descendant IDs via BFS
            const removalSet = new Set<string>([id]);
            const queue = [id];

            while (queue.length > 0) {
              const currentId = queue.shift()!;
              // Find all edges where current node is the source
              const childEdges = state.mindMapEdges.filter(
                (edge) => edge.source === currentId
              );
              // Add child targets to removal set and queue
              childEdges.forEach((edge) => {
                removalSet.add(edge.target);
                queue.push(edge.target);
              });
            }

            // Filter out all nodes and edges in removal set
            return {
              mindMapNodes: state.mindMapNodes.filter(
                (node) => !removalSet.has(node.id)
              ),
              mindMapEdges: state.mindMapEdges.filter(
                (edge) => !removalSet.has(edge.source) && !removalSet.has(edge.target)
              ),
              isDirty: true,
            };
          }),

        setMindMapState: (nodes, edges) =>
          set(() => ({
            mindMapNodes: nodes,
            mindMapEdges: edges,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        addConceptCard: (card) =>
          set((state) => ({
            conceptCards: [
              ...state.conceptCards,
              {
                ...card,
                id: crypto.randomUUID(),
              },
            ],
            isDirty: true,
          })),

        updateConceptCard: (id, updates) =>
          set((state) => ({
            conceptCards: state.conceptCards.map((card) =>
              card.id === id ? { ...card, ...updates } : card
            ),
            isDirty: true,
          })),

        deleteConceptCard: (id) =>
          set((state) => ({
            conceptCards: state.conceptCards.filter((card) => card.id !== id),
            isDirty: true,
          })),

        setConceptCards: (cards) =>
          set(() => ({
            conceptCards: cards,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        addPersonaTemplate: (template) =>
          set((state) => ({
            personaTemplates: [
              ...state.personaTemplates,
              {
                ...template,
                id: crypto.randomUUID(),
              },
            ],
            isDirty: true,
          })),

        updatePersonaTemplate: (id, updates) =>
          set((state) => ({
            personaTemplates: state.personaTemplates.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
            isDirty: true,
          })),

        deletePersonaTemplate: (id) =>
          set((state) => ({
            personaTemplates: state.personaTemplates.filter((t) => t.id !== id),
            isDirty: true,
          })),

        setPersonaTemplates: (templates) =>
          set(() => ({
            personaTemplates: templates,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        addHmwCard: (card) =>
          set((state) => ({
            hmwCards: [
              ...state.hmwCards,
              {
                ...card,
                id: card.id || crypto.randomUUID(),
              },
            ],
            isDirty: true,
          })),

        updateHmwCard: (id, updates) =>
          set((state) => ({
            hmwCards: state.hmwCards.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
            isDirty: true,
          })),

        deleteHmwCard: (id) =>
          set((state) => ({
            hmwCards: state.hmwCards.filter((c) => c.id !== id),
            isDirty: true,
          })),

        setHmwCards: (cards) =>
          set(() => ({
            hmwCards: cards,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        setSelectedSlotIds: (ids) =>
          set(() => ({
            selectedSlotIds: ids,
            isDirty: true,
          })),

        setBrainRewritingMatrices: (matrices) =>
          set(() => ({
            brainRewritingMatrices: matrices,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          })),

        updateBrainRewritingCell: (slotId, cellId, updates) =>
          set((state) => ({
            brainRewritingMatrices: state.brainRewritingMatrices.map((matrix) =>
              matrix.slotId === slotId
                ? {
                    ...matrix,
                    cells: matrix.cells.map((cell) =>
                      cell.cellId === cellId ? { ...cell, ...updates } : cell
                    ),
                  }
                : matrix
            ),
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
          drawingNodes: state.drawingNodes,
          gridColumns: state.gridColumns,
          crazy8sSlots: state.crazy8sSlots,
          mindMapNodes: state.mindMapNodes,
          mindMapEdges: state.mindMapEdges,
          conceptCards: state.conceptCards,
          personaTemplates: state.personaTemplates,
          hmwCards: state.hmwCards,
          selectedSlotIds: state.selectedSlotIds,
          brainRewritingMatrices: state.brainRewritingMatrices,
        }),
        limit: 50,
        equality: (pastState, currentState) =>
          JSON.stringify(pastState) === JSON.stringify(currentState),
      }
    )
  );
};

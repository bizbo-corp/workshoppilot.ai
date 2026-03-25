import { createStore } from 'zustand/vanilla';
import { temporal } from 'zundo';
import type { Quadrant } from '@/lib/canvas/quadrant-detection';
import type { GridConfig } from '@/lib/canvas/grid-layout';
import { getCellBounds } from '@/lib/canvas/grid-layout';
import type { Crazy8sSlot, SlotGroup } from '@/lib/canvas/crazy-8s-types';
import type { BrainRewritingMatrix, BrainRewritingCell } from '@/lib/canvas/brain-rewriting-types';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';
import type { DotVote, VotingSession, VotingResult } from '@/lib/canvas/voting-types';
import { DEFAULT_VOTING_SESSION } from '@/lib/canvas/voting-types';

export type IdeationPhase = 'mind-mapping' | 'crazy-eights' | 'idea-selection' | 'brain-rewriting';

export type PendingHmwChipSelection = {
  cardId: string;
  field: string;
  value: string;
} | null;

export type PendingHmwFieldFocus = { cardId: string; field: string } | null;

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'red';

export type GridColumn = {
  id: string;
  label: string;
  width: number;
};

export type MindMapNodeState = {
  id: string;
  label: string;
  description?: string;   // 1-2 sentence expansion of the label
  themeColorId: string;
  themeColor: string;
  themeBgColor: string;
  isRoot: boolean;
  level: number;          // 0 = root, 1 = theme branch, 2+ = sub-ideas
  parentId?: string;      // ID of parent node (undefined for root)
  position?: { x: number; y: number }; // Free-form canvas position (persisted)
  isStarred?: boolean;    // User-flagged for Crazy 8s carry-forward
  ownerId?: string;       // participantId or 'facilitator' (multiplayer per-participant ideation)
  ownerName?: string;     // display name (for facilitator overview)
};

export type MindMapEdgeState = {
  id: string;
  source: string;
  target: string;
  themeColor: string;
  isSecondary?: boolean; // true = manual cross-connection (not part of tree hierarchy)
  ownerId?: string;      // matches source node's ownerId (multiplayer per-participant ideation)
};

export type DrawingNode = {
  id: string;
  drawingId: string;   // ID in stepArtifacts.drawings array
  imageUrl: string;    // Vercel Blob CDN URL
  position: { x: number; y: number };
  width: number;
  height: number;
};

export type StickyNote = {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color?: StickyNoteColor;
  parentId?: string;
  type?: 'stickyNote' | 'group';
  quadrant?: Quadrant; // Quadrant position for steps with quadrant layout
  cellAssignment?: {
    row: string; // Row ID from GridConfig (e.g., 'actions', 'goals')
    col: string; // Column ID from GridConfig (e.g., 'awareness', 'consideration')
  };
  cluster?: string; // Parent label for hierarchical clustering (stakeholder mapping)
  isPreview?: boolean; // When true, indicates AI-suggested preview node awaiting confirmation
  previewReason?: string; // Optional AI explanation for why this placement was suggested
  templateKey?: string;       // Unique key for AI targeting (e.g., 'idea', 'problem')
  templateLabel?: string;     // Persistent header label (e.g., 'The Idea')
  placeholderText?: string;   // Placeholder shown when text is empty
  ownerId?: string;           // Participant who contributed this item (for provenance)
  ownerName?: string;         // Display name of the contributing participant
  ownerColor?: string;        // Hex color of the contributing participant
};

export type CanvasState = {
  stickyNotes: StickyNote[];
  drawingNodes: DrawingNode[];
  crazy8sSlots: Crazy8sSlot[];
  mindMapNodes: MindMapNodeState[];
  mindMapEdges: MindMapEdgeState[];
  conceptCards: ConceptCardData[];
  personaTemplates: PersonaTemplateData[];
  hmwCards: HmwCardData[];
  selectedSlotIds: string[];
  slotGroups: SlotGroup[];
  brainRewritingMatrices: BrainRewritingMatrix[];
  dotVotes: DotVote[];
  votingSession: VotingSession;
  ideationPhase: IdeationPhase;
  isDirty: boolean;
  gridColumns: GridColumn[]; // Dynamic columns, initialized from step config
  highlightedCell: { row: number; col: number } | null;
  pendingFitView: boolean;
  pendingFocusCardId: string | null;
  pendingHmwChipSelection: PendingHmwChipSelection;
  pendingHmwFieldFocus: PendingHmwFieldFocus;
  activeHmwCardId: string | null;
  selectedStickyNoteIds: string[];
  votingCardPositions: Record<string, { x: number; y: number }>;
  conceptActivityStarted: boolean;
};

export type CanvasActions = {
  addStickyNote: (stickyNote: Omit<StickyNote, 'id'> & { id?: string }) => void;
  updateStickyNote: (id: string, updates: Partial<StickyNote>) => void;
  updateStickyNoteColor: (id: string, color: StickyNoteColor) => void;
  deleteStickyNote: (id: string) => void;
  batchDeleteStickyNotes: (ids: string[]) => void;
  groupStickyNotes: (stickyNoteIds: string[]) => void;
  ungroupStickyNotes: (groupId: string) => void;
  setStickyNotes: (stickyNotes: StickyNote[]) => void;
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
  batchUpdateMindMapNodePositions: (updates: Array<{ id: string; position: { x: number; y: number } }>) => void;
  addMindMapEdge: (edge: MindMapEdgeState) => void;
  deleteMindMapEdge: (edgeId: string) => void;
  toggleMindMapNodeStar: (id: string) => void;
  setMindMapState: (nodes: MindMapNodeState[], edges: MindMapEdgeState[]) => void;
  setGridColumns: (gridColumns: GridColumn[]) => void;
  replaceGridColumns: (gridColumns: GridColumn[]) => void;
  addGridColumn: (label: string) => void;
  updateGridColumn: (id: string, updates: Partial<GridColumn>) => void;
  removeGridColumn: (id: string, gridConfig: GridConfig) => void;
  moveGridColumn: (id: string, toIndex: number, gridConfig: GridConfig) => void;
  confirmPreview: (id: string) => void;
  rejectPreview: (id: string) => void;
  setHighlightedCell: (cell: { row: number; col: number } | null) => void;
  setPendingFitView: (pending: boolean) => void;
  setPendingFocusCardId: (id: string | null) => void;
  setPendingHmwChipSelection: (selection: PendingHmwChipSelection) => void;
  setPendingHmwFieldFocus: (focus: PendingHmwFieldFocus) => void;
  setActiveHmwCardId: (id: string | null) => void;
  batchUpdatePositions: (updates: Array<{ id: string; position: { x: number; y: number }; cellAssignment?: { row: string; col: string } }>) => void;
  setCluster: (ids: string[], clusterName: string) => void;
  clearCluster: (clusterName: string) => void;
  renameCluster: (oldName: string, newName: string) => void;
  removeFromCluster: (id: string) => void;
  setSelectedStickyNoteIds: (ids: string[]) => void;
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
  addSlotGroup: (group: SlotGroup) => void;
  removeSlotGroup: (groupId: string) => void;
  updateSlotGroupLabel: (groupId: string, label: string) => void;
  updateSlotGroupMerge: (groupId: string, mergedImageUrl: string, mergePrompt?: string) => void;
  clearSlotGroupMerge: (groupId: string) => void;
  setSlotGroups: (groups: SlotGroup[]) => void;
  setBrainRewritingMatrices: (matrices: BrainRewritingMatrix[]) => void;
  updateBrainRewritingCell: (slotId: string, cellId: string, updates: Partial<BrainRewritingCell>) => void;
  toggleBrainRewritingIncluded: (slotId: string) => void;
  castVote: (vote: Omit<DotVote, 'id'>) => void;
  retractVote: (voteId: string) => void;
  openVoting: (voteBudget?: number) => void;
  closeVoting: () => void;
  setVotingResults: (results: VotingResult[]) => void;
  resetVoting: () => void;
  resetAndOpenVoting: (voteBudget: number) => void;
  setVotingCardPosition: (id: string, position: { x: number; y: number }) => void;
  batchSetVotingCardPositions: (positions: Record<string, { x: number; y: number }>) => void;
  clearVotingCardPositions: () => void;
  deleteOwnerContent: (ownerId: string) => void;
  setConceptActivityStarted: (started: boolean) => void;
  setIdeationPhase: (phase: IdeationPhase) => void;
  markClean: () => void;
  markDirty: () => void;
};

export type CanvasStore = CanvasState & CanvasActions;

export const createCanvasStore = (initState?: { stickyNotes: StickyNote[]; gridColumns?: GridColumn[]; drawingNodes?: DrawingNode[]; crazy8sSlots?: Crazy8sSlot[]; mindMapNodes?: MindMapNodeState[]; mindMapEdges?: MindMapEdgeState[]; conceptCards?: ConceptCardData[]; personaTemplates?: PersonaTemplateData[]; hmwCards?: HmwCardData[]; selectedSlotIds?: string[]; slotGroups?: SlotGroup[]; brainRewritingMatrices?: BrainRewritingMatrix[]; dotVotes?: DotVote[]; votingSession?: VotingSession; ideationPhase?: IdeationPhase; votingCardPositions?: Record<string, { x: number; y: number }>; conceptActivityStarted?: boolean }) => {
  const DEFAULT_STATE: CanvasState = {
    stickyNotes: initState?.stickyNotes || [],
    drawingNodes: initState?.drawingNodes || [],
    crazy8sSlots: initState?.crazy8sSlots || [],
    mindMapNodes: initState?.mindMapNodes || [],
    mindMapEdges: initState?.mindMapEdges || [],
    conceptCards: initState?.conceptCards || [],
    personaTemplates: initState?.personaTemplates || [],
    hmwCards: initState?.hmwCards || [],
    selectedSlotIds: initState?.selectedSlotIds || [],
    slotGroups: initState?.slotGroups || [],
    brainRewritingMatrices: initState?.brainRewritingMatrices || [],
    dotVotes: initState?.dotVotes || [],
    votingSession: initState?.votingSession || DEFAULT_VOTING_SESSION,
    ideationPhase: initState?.ideationPhase || 'mind-mapping',
    gridColumns: initState?.gridColumns || [],
    isDirty: false,
    highlightedCell: null,
    pendingFitView: false,
    pendingFocusCardId: null,
    pendingHmwChipSelection: null,
    pendingHmwFieldFocus: null,
    activeHmwCardId: null,
    selectedStickyNoteIds: [],
    votingCardPositions: initState?.votingCardPositions || {},
    conceptActivityStarted: initState?.conceptActivityStarted || false,
  };

  return createStore<CanvasStore>()(
    temporal(
      (set) => ({
        ...DEFAULT_STATE,

        addStickyNote: (stickyNote) =>
          set((state) => ({
            stickyNotes: [
              ...state.stickyNotes,
              {
                ...stickyNote,
                id: stickyNote.id || crypto.randomUUID(),
                color: stickyNote.color || 'yellow',
                type: stickyNote.type || 'stickyNote',
              },
            ],
            isDirty: true,
          })),

        updateStickyNote: (id, updates) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.map((stickyNote) =>
              stickyNote.id === id ? { ...stickyNote, ...updates } : stickyNote
            ),
            isDirty: true,
          })),

        updateStickyNoteColor: (id, color) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.map((stickyNote) =>
              stickyNote.id === id ? { ...stickyNote, color } : stickyNote
            ),
            isDirty: true,
          })),

        deleteStickyNote: (id) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.filter((stickyNote) => stickyNote.id !== id),
            isDirty: true,
          })),

        batchDeleteStickyNotes: (ids) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.filter((stickyNote) => !ids.includes(stickyNote.id)),
            isDirty: true,
          })),

        groupStickyNotes: (stickyNoteIds) =>
          set((state) => {
            // Find all sticky notes to be grouped
            const selectedStickyNotes = state.stickyNotes.filter((p) => stickyNoteIds.includes(p.id));
            if (selectedStickyNotes.length < 2) return state; // Need at least 2 to group

            // Calculate bounding box
            const minX = Math.min(...selectedStickyNotes.map((p) => p.position.x));
            const minY = Math.min(...selectedStickyNotes.map((p) => p.position.y));
            const maxX = Math.max(...selectedStickyNotes.map((p) => p.position.x + p.width));
            const maxY = Math.max(...selectedStickyNotes.map((p) => p.position.y + p.height));

            // Create group node
            const groupId = crypto.randomUUID();
            const groupNode: StickyNote = {
              id: groupId,
              text: '',
              type: 'group',
              color: 'yellow', // Not visible on groups, but satisfies type
              position: { x: minX - 20, y: minY - 20 }, // 20px padding
              width: maxX - minX + 40,
              height: maxY - minY + 40,
            };

            // Update children with relative positions and parentId
            const updatedChildren = selectedStickyNotes.map((stickyNote) => ({
              ...stickyNote,
              parentId: groupId,
              position: {
                x: stickyNote.position.x - minX + 20, // Relative to group + padding
                y: stickyNote.position.y - minY + 20,
              },
            }));

            // Build new array: group first, then non-selected, then children
            const otherStickyNotes = state.stickyNotes.filter((p) => !stickyNoteIds.includes(p.id));
            const newStickyNotes = [groupNode, ...otherStickyNotes, ...updatedChildren];

            return {
              stickyNotes: newStickyNotes,
              isDirty: true,
            };
          }),

        ungroupStickyNotes: (groupId) =>
          set((state) => {
            // Find the group node
            const group = state.stickyNotes.find((p) => p.id === groupId);
            if (!group || group.type !== 'group') return state;

            // Find all children
            const children = state.stickyNotes.filter((p) => p.parentId === groupId);

            // Convert children back to absolute positions
            const absoluteChildren = children.map((child) => ({
              ...child,
              parentId: undefined,
              position: {
                x: group.position.x + child.position.x,
                y: group.position.y + child.position.y,
              },
            }));

            // Remove group, keep other sticky notes, add absolute children
            const newStickyNotes = [
              ...state.stickyNotes.filter((p) => p.id !== groupId && p.parentId !== groupId),
              ...absoluteChildren,
            ];

            return {
              stickyNotes: newStickyNotes,
              isDirty: true,
            };
          }),

        setStickyNotes: (stickyNotes) =>
          set(() => ({
            stickyNotes,
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

        setCrazy8sSlots: (slots) => {
          // Deduplicate by slotId — Liveblocks CRDT merge can produce duplicates
          const seen = new Set<string>();
          const deduped = slots.filter((s) => {
            if (seen.has(s.slotId)) return false;
            seen.add(s.slotId);
            return true;
          });
          set(() => ({
            crazy8sSlots: deduped,
            // NOTE: Does NOT set isDirty — this is for loading from DB
          }));
        },

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

            // Update sticky notes: migrate cards from deleted column, reposition ALL remaining
            const newGridConfig = { ...gridConfig, columns: filteredColumns };
            const updatedStickyNotes = state.stickyNotes.map((stickyNote) => {
              const cellAssignment = stickyNote.cellAssignment;
              if (!cellAssignment) return stickyNote;

              if (cellAssignment.col === id) {
                // Card is in the deleted column — migrate to adjacent
                if (targetColumn) {
                  const newColIndex = filteredColumns.findIndex(
                    (col) => col.id === targetColumn.id
                  );
                  const rowIndex = gridConfig.rows.findIndex(
                    (row) => row.id === cellAssignment.row
                  );

                  if (newColIndex !== -1 && rowIndex !== -1) {
                    const newPosition = getCellBounds(
                      { row: rowIndex, col: newColIndex },
                      newGridConfig
                    );

                    return {
                      ...stickyNote,
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
                  ...stickyNote,
                  cellAssignment: undefined,
                };
              }

              // Card is in a surviving column — recalculate position
              // (column indices shift after removal)
              const newColIndex = filteredColumns.findIndex(
                (col) => col.id === cellAssignment.col
              );
              const rowIndex = gridConfig.rows.findIndex(
                (row) => row.id === cellAssignment.row
              );
              if (newColIndex === -1 || rowIndex === -1) return stickyNote;

              const bounds = getCellBounds(
                { row: rowIndex, col: newColIndex },
                newGridConfig
              );
              return {
                ...stickyNote,
                position: {
                  x: bounds.x + gridConfig.cellPadding,
                  y: bounds.y + gridConfig.cellPadding,
                },
              };
            });

            return {
              stickyNotes: updatedStickyNotes,
              gridColumns: filteredColumns,
              isDirty: true,
            };
          }),

        moveGridColumn: (id, toIndex, gridConfig) =>
          set((state) => {
            const currentIndex = state.gridColumns.findIndex((col) => col.id === id);
            if (currentIndex === -1 || currentIndex === toIndex) return state;

            const newColumns = [...state.gridColumns];
            const [removed] = newColumns.splice(currentIndex, 1);
            newColumns.splice(toIndex, 0, removed);

            const updatedStickyNotes = state.stickyNotes.map((note) => {
              if (!note.cellAssignment) return note;
              const newColIdx = newColumns.findIndex((c) => c.id === note.cellAssignment!.col);
              const rowIdx = gridConfig.rows.findIndex((r) => r.id === note.cellAssignment!.row);
              if (newColIdx === -1 || rowIdx === -1) return note;

              const bounds = getCellBounds({ row: rowIdx, col: newColIdx }, { ...gridConfig, columns: newColumns });
              return {
                ...note,
                position: {
                  x: bounds.x + gridConfig.cellPadding,
                  y: bounds.y + gridConfig.cellPadding,
                },
              };
            });

            return { gridColumns: newColumns, stickyNotes: updatedStickyNotes, isDirty: true };
          }),

        confirmPreview: (id) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.map((stickyNote) =>
              stickyNote.id === id ? { ...stickyNote, isPreview: false, previewReason: undefined } : stickyNote
            ),
            isDirty: true,
          })),

        rejectPreview: (id) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.filter((stickyNote) => stickyNote.id !== id),
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

        setPendingFocusCardId: (id) =>
          set(() => ({
            pendingFocusCardId: id,
          })),

        setPendingHmwChipSelection: (selection) =>
          set(() => ({
            pendingHmwChipSelection: selection,
          })),

        setPendingHmwFieldFocus: (focus) =>
          set(() => ({
            pendingHmwFieldFocus: focus,
          })),

        setActiveHmwCardId: (id) =>
          set(() => ({
            activeHmwCardId: id,
          })),

        batchUpdatePositions: (updates) =>
          set((state) => {
            const updateMap = new Map(updates.map((u) => [u.id, u]));
            return {
              stickyNotes: state.stickyNotes.map((stickyNote) => {
                const update = updateMap.get(stickyNote.id);
                if (!update) return stickyNote;
                return {
                  ...stickyNote,
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
              stickyNotes: state.stickyNotes.map((stickyNote) =>
                idSet.has(stickyNote.id) ? { ...stickyNote, cluster: clusterName } : stickyNote
              ),
              isDirty: true,
            };
          }),

        clearCluster: (clusterName) =>
          set((state) => {
            const lower = clusterName.toLowerCase();
            return {
              stickyNotes: state.stickyNotes.map((stickyNote) =>
                stickyNote.cluster && stickyNote.cluster.toLowerCase() === lower
                  ? { ...stickyNote, cluster: undefined }
                  : stickyNote
              ),
              isDirty: true,
            };
          }),

        renameCluster: (oldName, newName) =>
          set((state) => {
            const oldLower = oldName.toLowerCase();
            const newLower = newName.toLowerCase();
            // Check if a child node's text matches the new name (for parent swap)
            const promotee = state.stickyNotes.find(
              (p) => p.cluster?.toLowerCase() === oldLower && p.text.toLowerCase() === newLower
            );
            return {
              stickyNotes: state.stickyNotes.map((stickyNote) => {
                // Child of old cluster whose text matches new name → promote to parent
                if (promotee && stickyNote.id === promotee.id) {
                  return { ...stickyNote, cluster: undefined };
                }
                // Other children of old cluster → update cluster name
                if (stickyNote.cluster?.toLowerCase() === oldLower) {
                  return { ...stickyNote, cluster: newName };
                }
                // Old parent (text matches old name, no cluster) → demote to child
                if (
                  !stickyNote.cluster &&
                  stickyNote.text.toLowerCase() === oldLower &&
                  (!stickyNote.type || stickyNote.type === 'stickyNote')
                ) {
                  return { ...stickyNote, cluster: newName };
                }
                return stickyNote;
              }),
              isDirty: true,
            };
          }),

        removeFromCluster: (id) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.map((stickyNote) =>
              stickyNote.id === id ? { ...stickyNote, cluster: undefined } : stickyNote
            ),
            isDirty: true,
          })),

        setSelectedStickyNoteIds: (ids) =>
          set(() => ({
            selectedStickyNoteIds: ids,
          })),

        addMindMapNode: (node, edge) =>
          set((state) => ({
            mindMapNodes: state.mindMapNodes.some((n) => n.id === node.id)
              ? state.mindMapNodes
              : [...state.mindMapNodes, node],
            mindMapEdges: edge
              ? state.mindMapEdges.some((e) => e.id === edge.id)
                ? state.mindMapEdges
                : [...state.mindMapEdges, edge]
              : state.mindMapEdges,
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

        batchUpdateMindMapNodePositions: (updates) =>
          set((state) => {
            const updateMap = new Map(updates.map((u) => [u.id, u.position]));
            return {
              mindMapNodes: state.mindMapNodes.map((node) => {
                const pos = updateMap.get(node.id);
                return pos ? { ...node, position: pos } : node;
              }),
              isDirty: true,
            };
          }),

        addMindMapEdge: (edge) =>
          set((state) => ({
            mindMapEdges: state.mindMapEdges.some((e) => e.id === edge.id)
              ? state.mindMapEdges
              : [...state.mindMapEdges, edge],
            isDirty: true,
          })),

        deleteMindMapEdge: (edgeId) =>
          set((state) => ({
            mindMapEdges: state.mindMapEdges.filter((e) => e.id !== edgeId),
            isDirty: true,
          })),

        deleteMindMapNode: (id) =>
          set((state) => {
            // Collect all descendant IDs via BFS — only traverse primary (tree) edges
            const removalSet = new Set<string>([id]);
            const queue = [id];

            while (queue.length > 0) {
              const currentId = queue.shift()!;
              // Only follow primary (tree) edges for cascade — skip secondary cross-connections
              const childEdges = state.mindMapEdges.filter(
                (edge) => edge.source === currentId && !edge.isSecondary
              );
              childEdges.forEach((edge) => {
                if (!removalSet.has(edge.target)) {
                  removalSet.add(edge.target);
                  queue.push(edge.target);
                }
              });
            }

            // Filter out all nodes in removal set and any edges touching removed nodes
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

        toggleMindMapNodeStar: (id) =>
          set((state) => {
            const target = state.mindMapNodes.find((n) => n.id === id);
            if (!target) return state;

            // Enforce max 8 stars per owner (or globally in solo mode)
            if (!target.isStarred) {
              const currentStarred = state.mindMapNodes.filter(
                (n) => n.isStarred && !n.isRoot && n.label?.trim() &&
                  (target.ownerId ? n.ownerId === target.ownerId : true)
              ).length;
              if (currentStarred >= 8) return state;
            }

            return {
              mindMapNodes: state.mindMapNodes.map((node) =>
                node.id === id ? { ...node, isStarred: !node.isStarred } : node
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

        addSlotGroup: (group) =>
          set((state) => ({
            slotGroups: [...state.slotGroups, group],
            isDirty: true,
          })),

        removeSlotGroup: (groupId) =>
          set((state) => ({
            slotGroups: state.slotGroups.filter((g) => g.id !== groupId),
            isDirty: true,
          })),

        updateSlotGroupLabel: (groupId, label) =>
          set((state) => ({
            slotGroups: state.slotGroups.map((g) =>
              g.id === groupId ? { ...g, label } : g
            ),
            isDirty: true,
          })),

        updateSlotGroupMerge: (groupId, mergedImageUrl, mergePrompt) =>
          set((state) => ({
            slotGroups: state.slotGroups.map((g) =>
              g.id === groupId ? { ...g, mergedImageUrl, ...(mergePrompt !== undefined ? { mergePrompt } : {}) } : g
            ),
            isDirty: true,
          })),

        clearSlotGroupMerge: (groupId) =>
          set((state) => ({
            slotGroups: state.slotGroups.map((g) =>
              g.id === groupId ? { ...g, mergedImageUrl: undefined, mergePrompt: undefined } : g
            ),
            isDirty: true,
          })),

        setSlotGroups: (groups) =>
          set(() => ({
            slotGroups: groups,
            // NOTE: Does NOT set isDirty — this is for loading from DB
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

        toggleBrainRewritingIncluded: (slotId) =>
          set((state) => ({
            brainRewritingMatrices: state.brainRewritingMatrices.map((matrix) =>
              matrix.slotId === slotId
                ? { ...matrix, includedInConcepts: matrix.includedInConcepts === false }
                : matrix
            ),
            isDirty: true,
          })),

        castVote: (vote) =>
          set((state) => ({
            dotVotes: [
              ...state.dotVotes,
              { ...vote, id: crypto.randomUUID(), round: state.votingSession.votingRound },
            ],
            isDirty: true,
          })),

        retractVote: (voteId) =>
          set((state) => ({
            dotVotes: state.dotVotes.filter((v) => v.id !== voteId),
            isDirty: true,
          })),

        openVoting: (voteBudget) =>
          set((state) => ({
            votingSession: {
              ...state.votingSession,
              status: 'open' as const,
              voteBudget: voteBudget ?? state.votingSession.voteBudget,
            },
            isDirty: true,
          })),

        closeVoting: () =>
          set((state) => ({
            votingSession: { ...state.votingSession, status: 'closed' as const },
            isDirty: true,
          })),

        setVotingResults: (results) =>
          set((state) => ({
            votingSession: { ...state.votingSession, results },
            isDirty: true,
          })),

        resetVoting: () =>
          set((state) => ({
            dotVotes: [],
            votingSession: { ...DEFAULT_VOTING_SESSION, votingRound: (state.votingSession.votingRound ?? 0) + 1 },
            isDirty: true,
          })),

        resetAndOpenVoting: (voteBudget) =>
          set((state) => ({
            dotVotes: [],
            votingSession: {
              status: 'open' as const,
              voteBudget,
              results: [],
              votingRound: (state.votingSession.votingRound ?? 0) + 1,
            },
            isDirty: true,
          })),

        setVotingCardPosition: (id, position) =>
          set((state) => ({
            votingCardPositions: { ...state.votingCardPositions, [id]: position },
            isDirty: true,
          })),

        batchSetVotingCardPositions: (positions) =>
          set(() => ({
            votingCardPositions: positions,
            isDirty: true,
          })),

        clearVotingCardPositions: () =>
          set(() => ({
            votingCardPositions: {},
            isDirty: true,
          })),

        deleteOwnerContent: (ownerId) =>
          set((state) => {
            const nodeIdsToRemove = new Set(
              state.mindMapNodes.filter((n) => n.ownerId === ownerId).map((n) => n.id)
            );
            return {
              mindMapNodes: state.mindMapNodes.filter((n) => !nodeIdsToRemove.has(n.id)),
              mindMapEdges: state.mindMapEdges.filter(
                (e) => !nodeIdsToRemove.has(e.source) && !nodeIdsToRemove.has(e.target)
              ),
              crazy8sSlots: state.crazy8sSlots.filter((s) => s.ownerId !== ownerId),
              isDirty: true,
            };
          }),

        setConceptActivityStarted: (started) =>
          set(() => ({
            conceptActivityStarted: started,
            isDirty: true,
          })),

        setIdeationPhase: (phase) =>
          set(() => ({
            ideationPhase: phase,
            isDirty: true,
          })),

        markClean: () =>
          set(() => ({
            isDirty: false,
          })),

        markDirty: () =>
          set(() => ({
            isDirty: true,
          })),
      }),
      {
        partialize: (state) => ({
          stickyNotes: state.stickyNotes,
          drawingNodes: state.drawingNodes,
          gridColumns: state.gridColumns,
          crazy8sSlots: state.crazy8sSlots,
          mindMapNodes: state.mindMapNodes,
          mindMapEdges: state.mindMapEdges,
          conceptCards: state.conceptCards,
          personaTemplates: state.personaTemplates,
          hmwCards: state.hmwCards,
          selectedSlotIds: state.selectedSlotIds,
          slotGroups: state.slotGroups,
          brainRewritingMatrices: state.brainRewritingMatrices,
          dotVotes: state.dotVotes,
          votingSession: state.votingSession,
          ideationPhase: state.ideationPhase,
          conceptActivityStarted: state.conceptActivityStarted,
        }),
        limit: 50,
        equality: (pastState, currentState) =>
          JSON.stringify(pastState) === JSON.stringify(currentState),
      }
    )
  );
};

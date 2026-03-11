/**
 * Multiplayer Canvas Store
 *
 * Factory that creates a Zustand vanilla store with liveblocks() middleware
 * for real-time synchronization of canvas state across participants.
 *
 * NOTE: temporal (zundo) middleware was removed — the TypeScript type constraint
 * from liveblocks() (which wraps the state creator in WithLiveblocks<CanvasStore>)
 * is incompatible with the temporal() middleware composition at compile time.
 * Undo/redo is disabled for multiplayer sessions per the fallback decision in STATE.md.
 * "temporal removed — liveblocks+temporal composition failed, undo/redo disabled for
 * multiplayer per STATE.md fallback decision"
 *
 * The store has the same state shape and actions as `createCanvasStore`, but:
 * - `markClean()` and `markDirty()` are no-ops — Liveblocks handles persistence
 * - `isDirty` is always false — Liveblocks Storage is authoritative
 * - Ephemeral state (isDirty, selectedStickyNoteIds, highlightedCell,
 *   pendingFitView, pendingHmwChipSelection) is NOT in storageMapping —
 *   these are per-client and must not be broadcast to other participants
 *
 * storageMapping (durable fields — synced to Liveblocks Storage):
 *   stickyNotes, drawingNodes, gridColumns, crazy8sSlots, mindMapNodes,
 *   mindMapEdges, conceptCards, personaTemplates, hmwCards, selectedSlotIds,
 *   brainRewritingMatrices, dotVotes, votingSession
 */

import { createStore } from 'zustand/vanilla';
import { liveblocks, type WithLiveblocks } from '@liveblocks/zustand';
import type { OpaqueClient } from '@liveblocks/core';
import { liveblocksClient } from '@/lib/liveblocks/config';
import type {
  CanvasStore,
  CanvasState,
  StickyNote,
  DrawingNode,
  GridColumn,
  MindMapNodeState,
  MindMapEdgeState,
} from './canvas-store';
import { getCellBounds } from '@/lib/canvas/grid-layout';
import type { GridConfig } from '@/lib/canvas/grid-layout';
import type { Crazy8sSlot, SlotGroup } from '@/lib/canvas/crazy-8s-types';
import type { BrainRewritingMatrix, BrainRewritingCell } from '@/lib/canvas/brain-rewriting-types';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';
import type { DotVote, VotingSession, VotingResult } from '@/lib/canvas/voting-types';
import { DEFAULT_VOTING_SESSION } from '@/lib/canvas/voting-types';

type InitState = {
  stickyNotes: StickyNote[];
  gridColumns?: GridColumn[];
  drawingNodes?: DrawingNode[];
  crazy8sSlots?: Crazy8sSlot[];
  mindMapNodes?: MindMapNodeState[];
  mindMapEdges?: MindMapEdgeState[];
  conceptCards?: ConceptCardData[];
  personaTemplates?: PersonaTemplateData[];
  hmwCards?: HmwCardData[];
  selectedSlotIds?: string[];
  slotGroups?: SlotGroup[];
  brainRewritingMatrices?: BrainRewritingMatrix[];
  dotVotes?: DotVote[];
  votingSession?: VotingSession;
};

/**
 * Creates a multiplayer-ready Zustand store with Liveblocks sync.
 *
 * Middleware: liveblocks() only (temporal removed — see file header comment)
 *
 * Call `store.getState().liveblocks.enterRoom(roomId)` to connect to a room.
 * Call `store.getState().liveblocks.leaveRoom()` on unmount.
 */
export const createMultiplayerCanvasStore = (initState?: InitState) => {
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
    gridColumns: initState?.gridColumns || [],
    isDirty: false,
    highlightedCell: null,
    pendingFitView: false,
    pendingHmwChipSelection: null,
    selectedStickyNoteIds: [],
    ideationPhase: 'mind-mapping' as const,
  };

  return createStore<WithLiveblocks<CanvasStore>>()(
    liveblocks(
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
            // isDirty stays false in multiplayer — Liveblocks handles persistence
          })),

        updateStickyNote: (id, updates) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.map((stickyNote) =>
              stickyNote.id === id ? { ...stickyNote, ...updates } : stickyNote
            ),
          })),

        updateStickyNoteColor: (id, color) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.map((stickyNote) =>
              stickyNote.id === id ? { ...stickyNote, color } : stickyNote
            ),
          })),

        deleteStickyNote: (id) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.filter((stickyNote) => stickyNote.id !== id),
          })),

        batchDeleteStickyNotes: (ids) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.filter((stickyNote) => !ids.includes(stickyNote.id)),
          })),

        groupStickyNotes: (stickyNoteIds) =>
          set((state) => {
            const selectedStickyNotes = state.stickyNotes.filter((p) => stickyNoteIds.includes(p.id));
            if (selectedStickyNotes.length < 2) return state;

            const minX = Math.min(...selectedStickyNotes.map((p) => p.position.x));
            const minY = Math.min(...selectedStickyNotes.map((p) => p.position.y));
            const maxX = Math.max(...selectedStickyNotes.map((p) => p.position.x + p.width));
            const maxY = Math.max(...selectedStickyNotes.map((p) => p.position.y + p.height));

            const groupId = crypto.randomUUID();
            const groupNode: StickyNote = {
              id: groupId,
              text: '',
              type: 'group',
              color: 'yellow',
              position: { x: minX - 20, y: minY - 20 },
              width: maxX - minX + 40,
              height: maxY - minY + 40,
            };

            const updatedChildren = selectedStickyNotes.map((stickyNote) => ({
              ...stickyNote,
              parentId: groupId,
              position: {
                x: stickyNote.position.x - minX + 20,
                y: stickyNote.position.y - minY + 20,
              },
            }));

            const otherStickyNotes = state.stickyNotes.filter((p) => !stickyNoteIds.includes(p.id));
            return {
              stickyNotes: [groupNode, ...otherStickyNotes, ...updatedChildren],
            };
          }),

        ungroupStickyNotes: (groupId) =>
          set((state) => {
            const group = state.stickyNotes.find((p) => p.id === groupId);
            if (!group || group.type !== 'group') return state;

            const children = state.stickyNotes.filter((p) => p.parentId === groupId);
            const absoluteChildren = children.map((child) => ({
              ...child,
              parentId: undefined,
              position: {
                x: group.position.x + child.position.x,
                y: group.position.y + child.position.y,
              },
            }));

            return {
              stickyNotes: [
                ...state.stickyNotes.filter((p) => p.id !== groupId && p.parentId !== groupId),
                ...absoluteChildren,
              ],
            };
          }),

        setStickyNotes: (stickyNotes) =>
          set(() => ({ stickyNotes })),

        addDrawingNode: (node) =>
          set((state) => ({
            drawingNodes: [
              ...state.drawingNodes,
              {
                ...node,
                id: crypto.randomUUID(),
              },
            ],
          })),

        updateDrawingNode: (id, updates) =>
          set((state) => ({
            drawingNodes: state.drawingNodes.map((node) =>
              node.id === id ? { ...node, ...updates } : node
            ),
          })),

        deleteDrawingNode: (id) =>
          set((state) => ({
            drawingNodes: state.drawingNodes.filter((node) => node.id !== id),
          })),

        setDrawingNodes: (nodes) =>
          set(() => ({ drawingNodes: nodes })),

        updateCrazy8sSlot: (slotId, updates) =>
          set((state) => ({
            crazy8sSlots: state.crazy8sSlots.map((slot) =>
              slot.slotId === slotId ? { ...slot, ...updates } : slot
            ),
          })),

        setCrazy8sSlots: (slots) =>
          set(() => ({ crazy8sSlots: slots })),

        setGridColumns: (gridColumns) =>
          set(() => ({ gridColumns })),

        replaceGridColumns: (gridColumns) =>
          set(() => ({ gridColumns })),

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
          })),

        updateGridColumn: (id, updates) =>
          set((state) => ({
            gridColumns: state.gridColumns.map((col) =>
              col.id === id ? { ...col, ...updates } : col
            ),
          })),

        removeGridColumn: (id, gridConfig: GridConfig) =>
          set((state) => {
            const colIndex = state.gridColumns.findIndex((col) => col.id === id);
            if (colIndex === -1) return state;

            const targetColIndex = colIndex > 0 ? colIndex - 1 : colIndex + 1;
            const targetColumn = state.gridColumns[targetColIndex];
            const filteredColumns = state.gridColumns.filter((col) => col.id !== id);

            const newGridConfig = { ...gridConfig, columns: filteredColumns };
            const updatedStickyNotes = state.stickyNotes.map((stickyNote) => {
              const cellAssignment = stickyNote.cellAssignment;
              if (!cellAssignment) return stickyNote;

              if (cellAssignment.col === id) {
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
                return {
                  ...stickyNote,
                  cellAssignment: undefined,
                };
              }

              // Surviving column — recalculate position (indices shifted)
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
            };
          }),

        moveGridColumn: (id, toIndex, gridConfig: GridConfig) =>
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

            return { gridColumns: newColumns, stickyNotes: updatedStickyNotes };
          }),

        confirmPreview: (id) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.map((stickyNote) =>
              stickyNote.id === id ? { ...stickyNote, isPreview: false, previewReason: undefined } : stickyNote
            ),
          })),

        rejectPreview: (id) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.filter((stickyNote) => stickyNote.id !== id),
          })),

        setHighlightedCell: (cell) =>
          set(() => ({ highlightedCell: cell })),

        setPendingFitView: (pending) =>
          set(() => ({ pendingFitView: pending })),

        setPendingHmwChipSelection: (selection) =>
          set(() => ({ pendingHmwChipSelection: selection })),

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
            };
          }),

        setCluster: (ids, clusterName) =>
          set((state) => {
            const idSet = new Set(ids);
            return {
              stickyNotes: state.stickyNotes.map((stickyNote) =>
                idSet.has(stickyNote.id) ? { ...stickyNote, cluster: clusterName } : stickyNote
              ),
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
            };
          }),

        renameCluster: (oldName, newName) =>
          set((state) => {
            const oldLower = oldName.toLowerCase();
            const newLower = newName.toLowerCase();
            const promotee = state.stickyNotes.find(
              (p) => p.cluster?.toLowerCase() === oldLower && p.text.toLowerCase() === newLower
            );
            return {
              stickyNotes: state.stickyNotes.map((stickyNote) => {
                if (promotee && stickyNote.id === promotee.id) {
                  return { ...stickyNote, cluster: undefined };
                }
                if (stickyNote.cluster?.toLowerCase() === oldLower) {
                  return { ...stickyNote, cluster: newName };
                }
                if (
                  !stickyNote.cluster &&
                  stickyNote.text.toLowerCase() === oldLower &&
                  (!stickyNote.type || stickyNote.type === 'stickyNote')
                ) {
                  return { ...stickyNote, cluster: newName };
                }
                return stickyNote;
              }),
            };
          }),

        removeFromCluster: (id) =>
          set((state) => ({
            stickyNotes: state.stickyNotes.map((stickyNote) =>
              stickyNote.id === id ? { ...stickyNote, cluster: undefined } : stickyNote
            ),
          })),

        setSelectedStickyNoteIds: (ids) =>
          set(() => ({ selectedStickyNoteIds: ids })),

        addMindMapNode: (node, edge) =>
          set((state) => ({
            mindMapNodes: [...state.mindMapNodes, node],
            mindMapEdges: edge ? [...state.mindMapEdges, edge] : state.mindMapEdges,
          })),

        updateMindMapNode: (id, updates) =>
          set((state) => ({
            mindMapNodes: state.mindMapNodes.map((node) =>
              node.id === id ? { ...node, ...updates } : node
            ),
          })),

        updateMindMapNodePosition: (id, position) =>
          set((state) => ({
            mindMapNodes: state.mindMapNodes.map((node) =>
              node.id === id ? { ...node, position } : node
            ),
          })),

        batchUpdateMindMapNodePositions: (updates) =>
          set((state) => {
            const updateMap = new Map(updates.map((u) => [u.id, u.position]));
            return {
              mindMapNodes: state.mindMapNodes.map((node) => {
                const pos = updateMap.get(node.id);
                return pos ? { ...node, position: pos } : node;
              }),
            };
          }),

        addMindMapEdge: (edge) =>
          set((state) => ({
            mindMapEdges: [...state.mindMapEdges, edge],
          })),

        deleteMindMapEdge: (edgeId) =>
          set((state) => ({
            mindMapEdges: state.mindMapEdges.filter((e) => e.id !== edgeId),
          })),

        deleteMindMapNode: (id) =>
          set((state) => {
            const removalSet = new Set<string>([id]);
            const queue = [id];

            while (queue.length > 0) {
              const currentId = queue.shift()!;
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

            return {
              mindMapNodes: state.mindMapNodes.filter((node) => !removalSet.has(node.id)),
              mindMapEdges: state.mindMapEdges.filter(
                (edge) => !removalSet.has(edge.source) && !removalSet.has(edge.target)
              ),
            };
          }),

        toggleMindMapNodeStar: (id) =>
          set((state) => ({
            mindMapNodes: state.mindMapNodes.map((node) =>
              node.id === id ? { ...node, isStarred: !node.isStarred } : node
            ),
          })),

        setMindMapState: (nodes, edges) =>
          set(() => ({ mindMapNodes: nodes, mindMapEdges: edges })),

        addConceptCard: (card) =>
          set((state) => ({
            conceptCards: [
              ...state.conceptCards,
              {
                ...card,
                id: crypto.randomUUID(),
              },
            ],
          })),

        updateConceptCard: (id, updates) =>
          set((state) => ({
            conceptCards: state.conceptCards.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          })),

        deleteConceptCard: (id) =>
          set((state) => ({
            conceptCards: state.conceptCards.filter((c) => c.id !== id),
          })),

        setConceptCards: (cards) =>
          set(() => ({ conceptCards: cards })),

        addPersonaTemplate: (template) =>
          set((state) => ({
            personaTemplates: [
              ...state.personaTemplates,
              {
                ...template,
                id: crypto.randomUUID(),
              },
            ],
          })),

        updatePersonaTemplate: (id, updates) =>
          set((state) => ({
            personaTemplates: state.personaTemplates.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          })),

        deletePersonaTemplate: (id) =>
          set((state) => ({
            personaTemplates: state.personaTemplates.filter((t) => t.id !== id),
          })),

        setPersonaTemplates: (templates) =>
          set(() => ({ personaTemplates: templates })),

        addHmwCard: (card) =>
          set((state) => ({
            hmwCards: [
              ...state.hmwCards,
              {
                ...card,
                id: card.id || crypto.randomUUID(),
              },
            ],
          })),

        updateHmwCard: (id, updates) =>
          set((state) => ({
            hmwCards: state.hmwCards.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          })),

        deleteHmwCard: (id) =>
          set((state) => ({
            hmwCards: state.hmwCards.filter((c) => c.id !== id),
          })),

        setHmwCards: (cards) =>
          set(() => ({ hmwCards: cards })),

        setSelectedSlotIds: (ids) =>
          set(() => ({ selectedSlotIds: ids })),

        addSlotGroup: (group) =>
          set((state) => ({ slotGroups: [...state.slotGroups, group] })),

        removeSlotGroup: (groupId) =>
          set((state) => ({ slotGroups: state.slotGroups.filter((g) => g.id !== groupId) })),

        updateSlotGroupLabel: (groupId, label) =>
          set((state) => ({ slotGroups: state.slotGroups.map((g) => g.id === groupId ? { ...g, label } : g) })),

        updateSlotGroupMerge: (groupId, mergedImageUrl, mergePrompt) =>
          set((state) => ({
            slotGroups: state.slotGroups.map((g) =>
              g.id === groupId ? { ...g, mergedImageUrl, ...(mergePrompt !== undefined ? { mergePrompt } : {}) } : g
            ),
          })),

        clearSlotGroupMerge: (groupId) =>
          set((state) => ({
            slotGroups: state.slotGroups.map((g) =>
              g.id === groupId ? { ...g, mergedImageUrl: undefined, mergePrompt: undefined } : g
            ),
          })),

        setSlotGroups: (groups) =>
          set(() => ({ slotGroups: groups })),

        setBrainRewritingMatrices: (matrices) =>
          set(() => ({ brainRewritingMatrices: matrices })),

        updateBrainRewritingCell: (slotId, cellId, updates: Partial<BrainRewritingCell>) =>
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
          })),

        toggleBrainRewritingIncluded: (slotId) =>
          set((state) => ({
            brainRewritingMatrices: state.brainRewritingMatrices.map((matrix) =>
              matrix.slotId === slotId
                ? { ...matrix, includedInConcepts: matrix.includedInConcepts === false }
                : matrix
            ),
          })),

        castVote: (vote) =>
          set((state) => ({
            dotVotes: [
              ...state.dotVotes,
              { ...vote, id: crypto.randomUUID() },
            ],
            // isDirty stays false in multiplayer — Liveblocks handles persistence
          })),

        retractVote: (voteId) =>
          set((state) => ({
            dotVotes: state.dotVotes.filter((v) => v.id !== voteId),
          })),

        openVoting: (voteBudget) =>
          set((state) => ({
            votingSession: {
              ...state.votingSession,
              status: 'open' as const,
              voteBudget: voteBudget ?? state.votingSession.voteBudget,
            },
          })),

        closeVoting: () =>
          set((state) => ({
            votingSession: { ...state.votingSession, status: 'closed' as const },
          })),

        setVotingResults: (results) =>
          set((state) => ({
            votingSession: { ...state.votingSession, results },
          })),

        resetVoting: () =>
          set(() => ({
            dotVotes: [],
            votingSession: DEFAULT_VOTING_SESSION,
          })),

        setIdeationPhase: (phase) =>
          set(() => ({ ideationPhase: phase })),

        // no-ops in multiplayer — Liveblocks Storage is authoritative, not Neon auto-save
        markClean: () => {},
        markDirty: () => {},
      }),
      {
        // Cast to OpaqueClient — the global UserMeta augmentation (role, color in info)
        // causes a type mismatch with the internal IUserInfo type used by OpaqueClient.
        // This is safe: OpaqueClient is the erased form and the runtime behavior is unchanged.
        client: liveblocksClient as OpaqueClient,
        storageMapping: {
          // ONLY durable fields — synced to Liveblocks Storage CRDT
          // Ephemeral fields MUST NOT be here — they would thrash between participants
          stickyNotes: true,
          drawingNodes: true,
          gridColumns: true,
          crazy8sSlots: true,
          mindMapNodes: true,
          mindMapEdges: true,
          conceptCards: true,
          personaTemplates: true,
          hmwCards: true,
          selectedSlotIds: true,
          slotGroups: true,
          brainRewritingMatrices: true,
          dotVotes: true,
          votingSession: true,
          ideationPhase: true,
        },
        // presenceMapping: omitted — Presence (cursor, color, displayName) is managed
        // directly via useUpdateMyPresence() in Phase 56. No Zustand fields map to Presence.
      }
    )
  );
};

export type MultiplayerCanvasStoreApi = ReturnType<typeof createMultiplayerCanvasStore>;

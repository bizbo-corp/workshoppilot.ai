'use client';

import { useRef, useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import { applyNodeChanges, type Node, type NodeChange } from '@xyflow/react';

// Snap grid size for drag-end positions
const SNAP_GRID = 20;
function snapToGrid(val: number): number {
  return Math.round(val / SNAP_GRID) * SNAP_GRID;
}

// Container ID constants (must match mind-map-canvas.tsx values)
const VOTING_CONTAINER_ID = 'voting-container';
const BR_CONTAINER_ID = 'brain-rewriting-container';
const BR_NODE_PREFIX = 'brain-rewriting-';
const ZONE_NODE_PREFIX = 'owner-zone-';
const FLOW_BAND_PREFIX = 'flow-band-';
const PHASE_CONTAINER_PREFIX = 'phase-container-';
const CRAZY_8S_NODE_ID = 'crazy-8s-group';
const CRAZY_8S_NODE_PREFIX = 'crazy-8s-group-';
const VOTING_CARD_PREFIX = 'vc-';
const VOTING_GROUP_PREFIX = 'vg-';

const isPhaseContainerNode = (id: string) => id.startsWith(PHASE_CONTAINER_PREFIX);
const isFlowBandNode = (id: string) => id.startsWith(FLOW_BAND_PREFIX);
const isCrazy8sNode = (id: string) =>
  id === CRAZY_8S_NODE_ID || id.startsWith(CRAZY_8S_NODE_PREFIX);
const isVotingNode = (id: string) =>
  id === VOTING_CONTAINER_ID || id.startsWith(VOTING_CARD_PREFIX) || id.startsWith(VOTING_GROUP_PREFIX);

/** Resolve a node ID to its phase step number (1-4) or null */
function getContainerStep(id: string): number | null {
  if (isPhaseContainerNode(id)) return parseInt(id.slice(PHASE_CONTAINER_PREFIX.length));
  if (id === VOTING_CONTAINER_ID) return 3;
  if (id === BR_CONTAINER_ID) return 4;
  return null;
}

export type PhaseDragConfig = {
  /** Store API (solo or multiplayer) for persisting positions */
  storeApi: {
    getState: () => {
      setVotingCardPosition: (id: string, position: { x: number; y: number }) => void;
    };
  };
  /** Resolve a mind-map node ID to its ownerId */
  getNodeOwnerId: (nodeId: string) => string | undefined;
  /** Ref to current owner offsets */
  ownerOffsetsRef: MutableRefObject<Record<string, { x: number; y: number }>>;
  /** Batch-update mind map node positions in the store */
  batchUpdateMindMapNodePositions: (updates: Array<{ id: string; position: { x: number; y: number } }>) => void;
  /** Update a single mind-map node position in the store */
  updateMindMapNodePosition: (id: string, position: { x: number; y: number }) => void;
  /** Ref to current ReactFlow nodes array */
  nodesRef: MutableRefObject<Node[]>;
  /** setNodes dispatcher for ReactFlow controlled state */
  setNodes: Dispatch<SetStateAction<Node[]>>;
  /** Shared live positions ref (created externally, used by rfMindMapNodes memo) */
  livePositions: MutableRefObject<Record<string, { x: number; y: number }>>;
};

export function usePhaseDrag(config: PhaseDragConfig) {
  const {
    storeApi,
    getNodeOwnerId,
    ownerOffsetsRef,
    batchUpdateMindMapNodePositions,
    updateMindMapNodePosition,
    nodesRef,
    setNodes,
    livePositions,
  } = config;

  /** Track container being dragged */
  const containerDragRef = useRef<{ step: number; prevPos: { x: number; y: number } } | null>(null);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      let containerDelta: { x: number; y: number } | null = null;
      let containerStep: number | null = null;

      for (const c of changes) {
        if (c.type === 'position') {
          const posChange = c as NodeChange & { id: string; position?: { x: number; y: number }; dragging?: boolean };

          // Skip non-draggable infrastructure nodes (but NOT containers)
          if ((posChange.id.startsWith(BR_NODE_PREFIX) && posChange.id !== BR_CONTAINER_ID) || posChange.id.startsWith(ZONE_NODE_PREFIX) || isFlowBandNode(posChange.id)) continue;

          // Any container (phase 1-4, voting, BR): compute delta for child movement
          const isContainer = isPhaseContainerNode(posChange.id) || posChange.id === VOTING_CONTAINER_ID || posChange.id === BR_CONTAINER_ID;
          if (isContainer) {
            if (containerDragRef.current && posChange.dragging && posChange.position) {
              const { step, prevPos } = containerDragRef.current;
              const delta = {
                x: posChange.position.x - prevPos.x,
                y: posChange.position.y - prevPos.y,
              };
              if (delta.x !== 0 || delta.y !== 0) {
                containerDragRef.current.prevPos = { ...posChange.position };
                containerDelta = delta;
                containerStep = step;
              }
            }
            continue;
          }

          // Crazy 8s nodes: persist drag position for facilitator
          if (isCrazy8sNode(posChange.id)) {
            if (posChange.dragging === false && posChange.position) {
              storeApi.getState().setVotingCardPosition(`__c8s_${posChange.id}__`, posChange.position);
            }
            continue;
          }

          // Voting card/group nodes: persist position to voting store
          if (isVotingNode(posChange.id)) {
            if (posChange.dragging === false && posChange.position) {
              const storeKey = posChange.id.startsWith(VOTING_CARD_PREFIX)
                ? posChange.id.slice(VOTING_CARD_PREFIX.length)
                : posChange.id.slice(VOTING_GROUP_PREFIX.length);
              storeApi.getState().setVotingCardPosition(storeKey, posChange.position);
            }
            continue;
          }

          // Mind map nodes: track live position or persist on drag end
          if (posChange.dragging && posChange.position) {
            livePositions.current[posChange.id] = posChange.position;
          } else if (posChange.dragging === false) {
            const finalPos = posChange.position || livePositions.current[posChange.id];
            if (finalPos) {
              const oid = getNodeOwnerId(posChange.id);
              const offset = oid ? ownerOffsetsRef.current[oid] : undefined;
              const adjusted = offset
                ? { x: finalPos.x - offset.x, y: finalPos.y - offset.y }
                : finalPos;
              const snapped = {
                x: snapToGrid(adjusted.x),
                y: snapToGrid(adjusted.y),
              };
              updateMindMapNodePosition(posChange.id, snapped);
            }
            delete livePositions.current[posChange.id];
          }
        }
      }

      // Apply changes + move children atomically if dragging a phase container
      setNodes((nds) => {
        let updated = applyNodeChanges(changes, nds);
        if (containerDelta && containerStep !== null) {
          const step = containerStep;
          const delta = containerDelta;
          updated = updated.map(n => {
            // Only phases 1 & 2 need manual child movement (3 & 4 use parentId)
            const isChild =
              (step === 1 && (n.type === 'mindMapNode' || n.id.startsWith(ZONE_NODE_PREFIX))) ||
              (step === 2 && isCrazy8sNode(n.id));
            if (isChild) {
              return { ...n, position: { x: n.position.x + delta.x, y: n.position.y + delta.y } };
            }
            return n;
          });
        }
        return updated;
      });
    },
    [updateMindMapNodePosition, getNodeOwnerId, storeApi, ownerOffsetsRef, setNodes]
  );

  const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    const step = getContainerStep(node.id);
    if (step === null) return;
    containerDragRef.current = { step, prevPos: { ...node.position } };
  }, []);

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const step = getContainerStep(node.id);
    if (!containerDragRef.current || step === null) return;
    containerDragRef.current = null;

    // Persist container position (normalized key)
    storeApi.getState().setVotingCardPosition(`__phase${step}__`, node.position);

    // Persist child positions to store (phases 1 & 2 only — 3 & 4 use parentId)
    const currentNodes = nodesRef.current;
    if (step === 1) {
      const updates: Array<{ id: string; position: { x: number; y: number } }> = [];
      for (const n of currentNodes) {
        if (n.type === 'mindMapNode') {
          const oid = getNodeOwnerId(n.id);
          const offset = oid ? ownerOffsetsRef.current[oid] : undefined;
          const adjusted = offset
            ? { x: n.position.x - offset.x, y: n.position.y - offset.y }
            : n.position;
          updates.push({
            id: n.id,
            position: {
              x: snapToGrid(adjusted.x),
              y: snapToGrid(adjusted.y),
            },
          });
        }
      }
      if (updates.length > 0) {
        batchUpdateMindMapNodePositions(updates);
      }
    } else if (step === 2) {
      for (const n of currentNodes) {
        if (isCrazy8sNode(n.id)) {
          storeApi.getState().setVotingCardPosition(`__c8s_${n.id}__`, n.position);
        }
      }
    }
  }, [storeApi, getNodeOwnerId, ownerOffsetsRef, batchUpdateMindMapNodePositions, nodesRef]);

  return {
    handleNodesChange,
    handleNodeDragStart,
    handleNodeDragStop,
    containerDragRef,
  };
}

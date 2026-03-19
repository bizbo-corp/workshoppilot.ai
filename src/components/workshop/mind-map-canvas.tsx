'use client';

import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  applyNodeChanges,
  SelectionMode,
  ConnectionMode,
  type Node,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type Connection,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Undo2, Redo2, MousePointer2, Hand, LayoutGrid, ArrowRight, X, CheckCircle2, Star, Layers } from 'lucide-react';

import { cn } from '@/lib/utils';
import { MindMapNode } from '@/components/canvas/mind-map-node';
import { useMultiplayerContext } from '@/components/workshop/multiplayer-room';
import { useUser } from '@clerk/nextjs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MindMapEdge } from '@/components/canvas/mind-map-edge';
import { OwnerZoneNode } from '@/components/canvas/owner-zone-node';
import { MindMapReadinessSync, type MindMapReadinessSyncHandle, type ReadinessMap } from '@/components/canvas/mind-map-readiness';
import { Crazy8sReadinessSync, type Crazy8sReadinessSyncHandle, type Crazy8sReadinessMap } from '@/components/canvas/crazy-8s-readiness';
import {
  Crazy8sGroupNode,
  CRAZY_8S_NODE_ID,
  CRAZY_8S_NODE_HEIGHT,
  CRAZY_8S_NODE_WIDTH,
} from '@/components/canvas/crazy-8s-group-node';
import {
  BrainRewritingGroupNode as BrainRewritingGroupNodeComponent,
  BR_NODE_WIDTH,
  BR_NODE_HEIGHT,
  BR_NODE_GAP,
} from '@/components/canvas/brain-rewriting-group-node';
import { VotingCardNode, type VotingCardNodeData } from '@/components/canvas/voting-card-node';
import { VotingGroupNode, type VotingGroupNodeData } from '@/components/canvas/voting-group-node';
import { VotingContainerNode, type VotingContainerNodeData } from '@/components/canvas/voting-container-node';
import { VotingResultsSidebar } from '@/components/workshop/voting-results-sidebar';
import { computeVotingGridLayout, computeVotingContainerSize, VOTING_CARD_WIDTH, VOTING_CARD_HEIGHT, VOTING_GROUP_WIDTH, VOTING_GROUP_HEIGHT, SECTION_GAP, CONTAINER_PADDING, CONTAINER_HEADER_HEIGHT } from '@/lib/canvas/voting-layout';
import { currentRoundVotes } from '@/lib/canvas/voting-utils';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import {
  THEME_COLORS,
  ROOT_COLOR,
  type ThemeColor,
} from '@/lib/canvas/mind-map-theme-colors';
import { computeRadialLayout, computeNewNodePosition } from '@/lib/canvas/mind-map-layout';
import type {
  MindMapNodeState,
  MindMapEdgeState,
} from '@/stores/canvas-store';
import type { BrainRewritingMatrix } from '@/lib/canvas/brain-rewriting-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Define node and edge types outside component to prevent re-renders
const nodeTypes = {
  mindMapNode: MindMapNode,
  crazy8sGroupNode: Crazy8sGroupNode,
  brainRewritingGroupNode: BrainRewritingGroupNodeComponent,
  ownerZoneNode: OwnerZoneNode,
  votingCardNode: VotingCardNode,
  votingGroupNode: VotingGroupNode,
  votingContainerNode: VotingContainerNode,
};
const edgeTypes = { mindMapEdge: MindMapEdge };

// Snap grid size for drag-end positions
const SNAP_GRID = 20;
function snapToGrid(val: number): number {
  return Math.round(val / SNAP_GRID) * SNAP_GRID;
}

// Brain rewriting node ID prefix
const BR_NODE_PREFIX = 'brain-rewriting-';
// Owner zone node ID prefix
const ZONE_NODE_PREFIX = 'owner-zone-';
// Crazy 8s per-participant node ID prefix
const CRAZY_8S_NODE_PREFIX = 'crazy-8s-group-';
/** Check if a node ID is a crazy 8s group node (legacy single or per-participant) */
const isCrazy8sNode = (id: string) =>
  id === CRAZY_8S_NODE_ID || id.startsWith(CRAZY_8S_NODE_PREFIX);

// Voting node ID prefixes (prevent collisions with crazy8s slotId-based nodes)
const VOTING_CARD_PREFIX = 'vc-';
const VOTING_GROUP_PREFIX = 'vg-';
const VOTING_CONTAINER_ID = 'voting-container';
const isVotingNode = (id: string) =>
  id === VOTING_CONTAINER_ID || id.startsWith(VOTING_CARD_PREFIX) || id.startsWith(VOTING_GROUP_PREFIX);

export type MindMapCanvasProps = {
  workshopId: string;
  stepId: string;
  hmwStatement?: string;
  challengeStatement?: string;
  hmwGoals?: Array<{ label: string; fullStatement: string }>;
  showCrazy8s?: boolean;
  onSaveCrazy8s?: () => Promise<void>;
  // Selection mode (inline on crazy 8s node)
  selectionMode?: boolean;
  selectedSlotIds?: string[];
  onSelectionChange?: (slotIds: string[]) => void;
  onConfirmSelection?: (skip: boolean) => void;
  onBackToDrawing?: () => void;
  // Brain rewriting
  brainRewritingMatrices?: BrainRewritingMatrix[];
  onBrainRewritingCellUpdate?: (slotId: string, cellId: string, imageUrl: string, drawingId: string) => void;
  onBrainRewritingToggleIncluded?: (slotId: string) => void;
  onBrainRewritingDone?: () => void;
  // Voting mode pass-through to Crazy8sCanvas
  votingMode?: boolean;
  onVoteSelectionConfirm?: (selectedSlotIds: string[]) => void;
  onReVote?: () => void;
  // Merge dialog trigger
  onStartMerge?: (groupId: string) => void;
  // Per-participant filtering (multiplayer ideation)
  currentOwnerId?: string;           // filter canvas to this owner's nodes
  allOwnerIds?: string[];             // for facilitator switcher dropdown
  ownerNames?: Record<string, string>; // ownerId → display name
  ownerColors?: Record<string, string>; // ownerId → hex color (legacy, dots use theme accent)
  onOwnerSwitch?: (ownerId: string | null) => void;
  onDeleteOwner?: (ownerId: string) => void;
  facilitatorOwnerId?: string; // The facilitator's ownerId (cannot be deleted)
  isMultiplayerIdeation?: boolean; // Stable flag — true when multiplayer ideation context
  onCrazy8sReadinessChange?: (map: Crazy8sReadinessMap) => void;
};

export function MindMapCanvas(props: MindMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function MindMapCanvasInner({
  workshopId,
  stepId,
  hmwStatement,
  challengeStatement,
  hmwGoals,
  showCrazy8s,
  onSaveCrazy8s,
  selectionMode,
  selectedSlotIds,
  onSelectionChange,
  onConfirmSelection,
  onBackToDrawing,
  brainRewritingMatrices,
  onBrainRewritingCellUpdate,
  onBrainRewritingToggleIncluded,
  onBrainRewritingDone,
  votingMode,
  onVoteSelectionConfirm,
  onReVote,
  onStartMerge,
  currentOwnerId,
  allOwnerIds,
  ownerNames,
  ownerColors,
  onOwnerSwitch,
  onDeleteOwner,
  facilitatorOwnerId,
  isMultiplayerIdeation,
  onCrazy8sReadinessChange,
}: MindMapCanvasProps) {
  const allMindMapNodes = useCanvasStore((state) => state.mindMapNodes);
  const allMindMapEdges = useCanvasStore((state) => state.mindMapEdges);

  // Filter mind map nodes/edges by ownerId when in per-participant mode.
  // In multiplayer, also exclude any stray unowned nodes (created by solo-mode
  // init race conditions) so they never render.
  const mindMapNodes = useMemo(() => {
    let nodes = allMindMapNodes;
    if (isMultiplayerIdeation) {
      nodes = nodes.filter((n) => n.ownerId);
    }
    if (currentOwnerId) {
      nodes = nodes.filter((n) => n.ownerId === currentOwnerId);
    }
    return nodes;
  }, [allMindMapNodes, currentOwnerId, isMultiplayerIdeation]);

  const mindMapEdges = useMemo(() => {
    let edges = allMindMapEdges;
    if (isMultiplayerIdeation) {
      edges = edges.filter((e) => e.ownerId);
    }
    if (currentOwnerId) {
      edges = edges.filter((e) => e.ownerId === currentOwnerId);
    }
    return edges;
  }, [allMindMapEdges, currentOwnerId, isMultiplayerIdeation]);
  const addMindMapNode = useCanvasStore((state) => state.addMindMapNode);
  const updateMindMapNode = useCanvasStore((state) => state.updateMindMapNode);
  const updateMindMapNodePosition = useCanvasStore((state) => state.updateMindMapNodePosition);
  const batchUpdateMindMapNodePositions = useCanvasStore((state) => state.batchUpdateMindMapNodePositions);
  const addMindMapEdge = useCanvasStore((state) => state.addMindMapEdge);
  const deleteMindMapEdge = useCanvasStore((state) => state.deleteMindMapEdge);
  const deleteMindMapNode = useCanvasStore((state) => state.deleteMindMapNode);
  const toggleMindMapNodeStar = useCanvasStore((state) => state.toggleMindMapNodeStar);
  const setMindMapState = useCanvasStore((state) => state.setMindMapState);
  const pendingFitView = useCanvasStore((state) => state.pendingFitView);
  const setPendingFitView = useCanvasStore((state) => state.setPendingFitView);
  const allCrazy8sSlots = useCanvasStore((state) => state.crazy8sSlots);
  const slotGroups = useCanvasStore((state) => state.slotGroups);
  const rawDotVotes = useCanvasStore((state) => state.dotVotes);
  const votingSession = useCanvasStore((state) => state.votingSession);
  const dotVotes = useMemo(() => currentRoundVotes(rawDotVotes, votingSession), [rawDotVotes, votingSession]);
  const votingCardPositions = useCanvasStore((state) => state.votingCardPositions);

  // Filter crazy 8s slots by ownerId (except during idea-selection which shows all)
  const crazy8sSlots = useMemo(() => {
    if (!currentOwnerId) return allCrazy8sSlots;
    // During idea-selection/voting, show ALL participants' slots
    if (votingMode) return allCrazy8sSlots;
    return allCrazy8sSlots.filter((s) => s.ownerId === currentOwnerId);
  }, [allCrazy8sSlots, currentOwnerId, votingMode]);

  const { fitView, screenToFlowPosition } = useReactFlow();

  const storeApi = useCanvasStoreApi();

  // Undo/redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Tool mode: 'select' = marquee selection on drag, 'pan' = hand tool (default)
  const [toolMode, setToolMode] = useState<'select' | 'pan'>('pan');

  // Auto-focus: track newly created node for edit-mode init + DOM-based focus retry.
  // ReactFlow steals focus during node creation, so we poll until the textarea appears.
  const [autoFocusNodeId, setAutoFocusNodeId] = useState<string | null>(null);

  // Clear autoFocusNodeId after one render cycle so isNewlyCreated doesn't persist
  useEffect(() => {
    if (autoFocusNodeId) {
      const timer = setTimeout(() => setAutoFocusNodeId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [autoFocusNodeId]);

  // DOM-based focus: polls for the node element, clicks the label to enter
  // edit mode if needed, then focuses the textarea. Belt-and-suspenders approach
  // that works regardless of React/ReactFlow rendering pipeline timing.
  const focusNodeTextarea = useCallback((nodeId: string) => {
    let attempts = 0;
    let clickedLabel = false;
    const tryFocus = () => {
      const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
      if (!nodeEl) {
        // Node not in DOM yet — keep polling
        if (attempts++ < 40) requestAnimationFrame(tryFocus);
        return;
      }
      // If textarea exists (edit mode), focus it
      const textarea = nodeEl.querySelector('textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        return;
      }
      // No textarea yet — click the label div to trigger edit mode
      if (!clickedLabel) {
        const label = nodeEl.querySelector('.cursor-text') as HTMLElement | null;
        if (label) {
          label.click();
          clickedLabel = true;
        }
      }
      // Retry to find the textarea that should now appear
      if (attempts++ < 40) requestAnimationFrame(tryFocus);
    };
    // Start polling — use setTimeout to escape the current React event batch
    setTimeout(() => requestAnimationFrame(tryFocus), 0);
  }, []);

  // Facilitator check — only facilitator can delete participants
  const { isFacilitator, participantId: selfParticipantId } = useMultiplayerContext();
  const { user } = useUser();
  const voterId = user?.id ?? 'solo-anon';

  // Readiness state for "I'm Done" feature (multiplayer ideation only)
  const [readinessMap, setReadinessMap] = useState<ReadinessMap>({});
  const toggleReadyRef = useRef<MindMapReadinessSyncHandle | null>(null);
  const handleReadinessChange = useCallback((map: ReadinessMap) => {
    setReadinessMap(map);
  }, []);

  // Crazy 8s readiness state (multiplayer ideation only)
  const [crazy8sReadinessMap, setCrazy8sReadinessMap] = useState<Crazy8sReadinessMap>({});
  const crazy8sReadyRef = useRef<Crazy8sReadinessSyncHandle | null>(null);
  const handleCrazy8sReadinessChange = useCallback((map: Crazy8sReadinessMap) => {
    setCrazy8sReadinessMap(map);
    onCrazy8sReadinessChange?.(map);
  }, [onCrazy8sReadinessChange]);

  // Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ ownerId: string; name: string } | null>(null);

  // Node cascade-delete confirmation dialog state
  const [nodeCascadeDelete, setNodeCascadeDelete] = useState<{ nodeId: string; descendantCount: number } | null>(null);

  // ── Voting state (multiplayer idea-selection on same canvas) ──
  const [votingSelectedIds, setVotingSelectedIds] = useState<string[]>([]);
  const [resultSelections, setResultSelections] = useState<Set<string>>(new Set());
  const [groupNameInput, setGroupNameInput] = useState('');
  const [showGroupPrompt, setShowGroupPrompt] = useState(false);

  // My votes
  const myVotes = useMemo(
    () => dotVotes.filter((v) => v.voterId === voterId),
    [dotVotes, voterId]
  );
  const canVote = votingSession.status === 'open' && myVotes.length < votingSession.voteBudget;

  // Vote handlers
  const handleCastVote = useCallback((targetId: string) => {
    const state = storeApi.getState();
    const roundVotes = currentRoundVotes(state.dotVotes, state.votingSession);
    const currentMyVotes = roundVotes.filter((v) => v.voterId === voterId);
    if (currentMyVotes.length >= state.votingSession.voteBudget) return;
    state.castVote({
      slotId: targetId,
      voterId,
      voteIndex: currentMyVotes.length,
    });
  }, [storeApi, voterId]);

  const handleRetractVote = useCallback((voteId: string) => {
    storeApi.getState().retractVote(voteId);
  }, [storeApi]);

  // Initialize result selections when results appear; clear when voting reopens
  useEffect(() => {
    if (votingSession.status === 'closed' && votingSession.results.length > 0) {
      const voted = votingSession.results
        .filter((r) => r.totalVotes > 0)
        .map((r) => r.slotId);
      setResultSelections(new Set(voted));
    } else if (votingSession.status !== 'closed') {
      setResultSelections(new Set());
    }
  }, [votingSession.status, votingSession.results]);

  const handleToggleSelect = useCallback((targetId: string) => {
    setResultSelections((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  }, []);

  // Voter color map for dots
  const voterColorMap = useMemo(() => {
    const map: Record<string, string> = { ...(ownerColors || {}) };
    return map;
  }, [ownerColors]);

  const getVoterDots = useCallback((targetId: string): Array<{ voterId: string; color: string }> => {
    return dotVotes
      .filter((v) => v.slotId === targetId)
      .map((v) => ({
        voterId: v.voterId,
        color: voterColorMap[v.voterId] ?? '#608850',
      }));
  }, [dotVotes, voterColorMap]);

  // Ungroup handler
  const handleUngroup = useCallback((groupId: string) => {
    const state = storeApi.getState();
    const group = state.slotGroups.find((g) => g.id === groupId);
    if (!group) return;
    const positions = computeVotingGridLayout(
      state.crazy8sSlots,
      state.slotGroups.filter((g) => g.id !== groupId)
    );
    state.removeSlotGroup(groupId);
    // Re-offset positions as container-relative
    const offsetPositions: Record<string, { x: number; y: number }> = {};
    // Preserve __container__ key
    if (state.votingCardPositions['__container__']) {
      offsetPositions['__container__'] = state.votingCardPositions['__container__'];
    }
    for (const [id, pos] of Object.entries(positions)) {
      offsetPositions[id] = {
        x: pos.x + CONTAINER_PADDING,
        y: pos.y + CONTAINER_HEADER_HEIGHT + CONTAINER_PADDING,
      };
    }
    state.batchSetVotingCardPositions(offsetPositions);
  }, [storeApi]);

  // Group confirm handler
  const handleConfirmGroup = useCallback(() => {
    if (votingSelectedIds.length < 2 || !groupNameInput.trim()) return;
    const state = storeApi.getState();
    const slotIdsToGroup = votingSelectedIds
      .map((id) => id.startsWith(VOTING_CARD_PREFIX) ? id.slice(VOTING_CARD_PREFIX.length) : id)
      .filter((id) => !state.slotGroups.some((g) => g.id === id));
    if (slotIdsToGroup.length < 2) return;

    const positions = slotIdsToGroup
      .map((id) => state.votingCardPositions[id])
      .filter(Boolean);
    const centroid = positions.length > 0
      ? {
          x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
          y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length,
        }
      : { x: CONTAINER_PADDING, y: CONTAINER_HEADER_HEIGHT + CONTAINER_PADDING };

    const groupId = crypto.randomUUID();
    state.addSlotGroup({
      id: groupId,
      label: groupNameInput.trim(),
      slotIds: slotIdsToGroup,
    });

    const newPositions = { ...state.votingCardPositions };
    slotIdsToGroup.forEach((id) => delete newPositions[id]);
    newPositions[groupId] = centroid;
    state.batchSetVotingCardPositions(newPositions);

    setGroupNameInput('');
    setShowGroupPrompt(false);
    setVotingSelectedIds([]);
  }, [votingSelectedIds, groupNameInput, storeApi]);

  const canGroupVotingCards = isFacilitator
    && votingSession.status === 'idle'
    && votingSelectedIds.length >= 2;

  // Keyboard shortcuts: V = select, H = hand (standard design tool convention)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'v' || e.key === 'V') setToolMode('select');
      if (e.key === 'h' || e.key === 'H') setToolMode('pan');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live positions ref — prevents flicker during drag (same pattern as react-flow-canvas.tsx)
  const livePositions = useRef<Record<string, { x: number; y: number }>>({});

  // Guard: only create HMW branch nodes once per mount
  const hmwNodesCreated = useRef(false);

  // Cleanup: purge stray unowned nodes from store in multiplayer mode.
  // These can be created by solo-mode init racing with Liveblocks sync.
  // The render filter above hides them immediately; this effect removes them
  // from Liveblocks Storage so they don't persist.
  const cleanupRan = useRef(false);
  useEffect(() => {
    if (!isMultiplayerIdeation || cleanupRan.current) return;
    const strays = allMindMapNodes.filter((n) => !n.ownerId);
    if (strays.length > 0) {
      cleanupRan.current = true;
      for (const node of strays) {
        deleteMindMapNode(node.id);
      }
    }
  }, [isMultiplayerIdeation, allMindMapNodes, deleteMindMapNode]);

  // Initialize root node if canvas is empty (solo mode only).
  // In multiplayer per-participant mode, useIdeationSeeding seeds per-owner roots.
  // isMultiplayerIdeation is a stable server-derived flag that never changes when
  // participants are deleted or the view switches to "All".
  useEffect(() => {
    if (isMultiplayerIdeation) return; // Multiplayer — skip solo init
    if (mindMapNodes.length === 0) {
      const rootLabel = challengeStatement || hmwStatement || 'How might we...?';
      const rootNode: MindMapNodeState = {
        id: 'root',
        label: rootLabel,
        themeColorId: 'gray',
        themeColor: ROOT_COLOR.color,
        themeBgColor: ROOT_COLOR.bgColor,
        isRoot: true,
        level: 0,
        position: { x: 0, y: 0 },
      };
      setMindMapState([rootNode], []);
    }
  }, [mindMapNodes.length, challengeStatement, hmwStatement, setMindMapState, isMultiplayerIdeation]);

  // Pre-populate HMW branch nodes (runs once, even if root already existed).
  // Skip in multiplayer per-participant mode — useIdeationSeeding seeds per-owner HMW branches.
  useEffect(() => {
    if (isMultiplayerIdeation) { hmwNodesCreated.current = true; return; }
    if (hmwNodesCreated.current) return;
    if (!hmwGoals || hmwGoals.length === 0) return;
    // Only add if no hmw-* nodes exist yet
    const hasHmwNodes = mindMapNodes.some((n) => n.id.startsWith('hmw-'));
    if (hasHmwNodes) {
      hmwNodesCreated.current = true;
      return;
    }
    // Need at least a root node before adding branches
    if (mindMapNodes.length === 0) return;

    // Horizontal layout: root on top, branches in a row below
    const H_SPACING = 400; // px between branch centers
    const V_OFFSET = 160;  // px below root
    const totalWidth = (hmwGoals.length - 1) * H_SPACING;
    const startX = -totalWidth / 2;

    hmwGoals.forEach((goal, index) => {
      const themeColor = THEME_COLORS[index % THEME_COLORS.length];
      const nodeId = `hmw-${index}`;

      const newNode: MindMapNodeState = {
        id: nodeId,
        label: goal.label,
        themeColorId: themeColor.id,
        themeColor: themeColor.color,
        themeBgColor: themeColor.bgColor,
        isRoot: false,
        level: 1,
        parentId: 'root',
        position: {
          x: snapToGrid(startX + index * H_SPACING),
          y: V_OFFSET,
        },
      };

      const newEdge: MindMapEdgeState = {
        id: `root-${nodeId}`,
        source: 'root',
        target: nodeId,
        themeColor: themeColor.color,
      };

      addMindMapNode(newNode, newEdge);
    });
    hmwNodesCreated.current = true;

    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
  }, [mindMapNodes, hmwGoals, addMindMapNode, fitView, currentOwnerId]);

  // Update root node labels to use challenge statement (handles existing canvases + multiplayer)
  const rootLabelUpdated = useRef(false);
  useEffect(() => {
    if (rootLabelUpdated.current) return;
    if (!challengeStatement) return;
    if (allMindMapNodes.length === 0) return;
    // Update ALL root nodes (each owner has one in multiplayer)
    const rootNodes = allMindMapNodes.filter((n) => n.isRoot);
    if (rootNodes.length === 0) return;
    let anyUpdated = false;
    for (const rootNode of rootNodes) {
      if (rootNode.label !== challengeStatement) {
        updateMindMapNode(rootNode.id, { label: challengeStatement });
        anyUpdated = true;
      }
    }
    if (anyUpdated || rootNodes.every((n) => n.label === challengeStatement)) {
      rootLabelUpdated.current = true;
    }
  }, [challengeStatement, allMindMapNodes, updateMindMapNode]);

  // Callback: Update node label
  const handleLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      updateMindMapNode(nodeId, { label: newLabel });
    },
    [updateMindMapNode]
  );

  // Callback: Update node description
  const handleDescriptionChange = useCallback(
    (nodeId: string, description: string) => {
      updateMindMapNode(nodeId, { description });
    },
    [updateMindMapNode]
  );

  // Callback: Add child node with radial offset from parent
  const handleAddChild = useCallback(
    (parentId: string) => {
      const parentNode = mindMapNodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const childLevel = parentNode.level + 1;

      // Determine theme color
      let themeColor: ThemeColor;
      if (parentNode.isRoot && !isMultiplayerIdeation) {
        // Solo mode: cycle through colors for different branches
        const existingLevel1Nodes = mindMapNodes.filter((n) => n.level === 1);
        const colorIndex = existingLevel1Nodes.length % THEME_COLORS.length;
        themeColor = THEME_COLORS[colorIndex];
      } else {
        // Multiplayer or non-root: inherit parent's palette color
        const inheritedColor = THEME_COLORS.find(
          (c) => c.id === parentNode.themeColorId
        );
        themeColor = inheritedColor || ROOT_COLOR;
      }

      const position = computeNewNodePosition(parentId, mindMapNodes, mindMapEdges);

      const newNodeId = crypto.randomUUID();
      const newNode: MindMapNodeState = {
        id: newNodeId,
        label: '',
        themeColorId: themeColor.id,
        themeColor: themeColor.color,
        themeBgColor: themeColor.bgColor,
        isRoot: false,
        level: childLevel,
        parentId,
        position,
        ...(currentOwnerId && { ownerId: currentOwnerId }),
      };

      const newEdge: MindMapEdgeState = {
        id: `${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        themeColor: themeColor.color,
        ...(currentOwnerId && { ownerId: currentOwnerId }),
      };

      addMindMapNode(newNode, newEdge);
      setAutoFocusNodeId(newNodeId);
      focusNodeTextarea(newNodeId);
    },
    [mindMapNodes, mindMapEdges, addMindMapNode, currentOwnerId, isMultiplayerIdeation, focusNodeTextarea]
  );

  // Callback: Delete node with cascade confirmation
  const handleDelete = useCallback(
    (nodeId: string) => {
      const nodeToDelete = mindMapNodes.find((n) => n.id === nodeId);
      if (!nodeToDelete || nodeToDelete.isRoot) return;

      const descendants = new Set<string>();
      const queue = [nodeId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const childEdges = mindMapEdges.filter((e) => e.source === currentId);
        childEdges.forEach((edge) => {
          descendants.add(edge.target);
          queue.push(edge.target);
        });
      }

      if (descendants.size > 0) {
        setNodeCascadeDelete({ nodeId, descendantCount: descendants.size });
        return;
      }

      deleteMindMapNode(nodeId);
    },
    [mindMapNodes, mindMapEdges, deleteMindMapNode]
  );

  // Callback: Toggle star on node
  const handleToggleStar = useCallback(
    (nodeId: string) => {
      toggleMindMapNodeStar(nodeId);
    },
    [toggleMindMapNodeStar]
  );

  // Callback: Add child at directional offset (from "+" hover zones)
  const DIRECTION_OFFSETS: Record<string, { x: number; y: number }> = {
    top: { x: 0, y: -200 },
    bottom: { x: 0, y: 200 },
    left: { x: -300, y: 0 },
    right: { x: 300, y: 0 },
  };

  const handleAddChildAt = useCallback(
    (parentId: string, direction: 'top' | 'bottom' | 'left' | 'right') => {
      const parentNode = mindMapNodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const childLevel = parentNode.level + 1;
      const inheritedColor = THEME_COLORS.find((c) => c.id === parentNode.themeColorId);
      const themeColor = inheritedColor || ROOT_COLOR;

      const parentPos = parentNode.position || { x: 0, y: 0 };
      const offset = DIRECTION_OFFSETS[direction];
      const position = {
        x: snapToGrid(parentPos.x + offset.x),
        y: snapToGrid(parentPos.y + offset.y),
      };

      const newNodeId = crypto.randomUUID();
      const newNode: MindMapNodeState = {
        id: newNodeId,
        label: '',
        themeColorId: themeColor.id,
        themeColor: themeColor.color,
        themeBgColor: themeColor.bgColor,
        isRoot: false,
        level: childLevel,
        parentId,
        position,
        ...(currentOwnerId && { ownerId: currentOwnerId }),
      };

      const newEdge: MindMapEdgeState = {
        id: `${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        themeColor: themeColor.color,
        ...(currentOwnerId && { ownerId: currentOwnerId }),
      };

      addMindMapNode(newNode, newEdge);
      setAutoFocusNodeId(newNodeId);
      focusNodeTextarea(newNodeId);
    },
    [mindMapNodes, addMindMapNode, currentOwnerId, focusNodeTextarea]
  );

  // Compute per-owner star counts (how many non-root nodes are starred, max 8)
  const ownerStarCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of allMindMapNodes) {
      if (node.isStarred && !node.isRoot && node.label?.trim()) {
        const key = node.ownerId || '__solo__';
        counts[key] = Math.min((counts[key] || 0) + 1, 8);
      }
    }
    return counts;
  }, [allMindMapNodes]);

  // Solo star count (for single-user mode toolbar badge)
  const soloStarCount = useMemo(() => {
    if (allOwnerIds && allOwnerIds.length > 1) return 0;
    return ownerStarCounts['__solo__'] || Object.values(ownerStarCounts).reduce((a, b) => a + b, 0);
  }, [ownerStarCounts, allOwnerIds]);

  // Compute per-owner horizontal offsets for "All" view so trees don't overlap
  const ownerOffsets = useMemo(() => {
    const offsets: Record<string, { x: number; y: number }> = {};
    if (currentOwnerId || !allOwnerIds || allOwnerIds.length <= 1) return offsets;
    const TREE_SPACING = showCrazy8s ? 2800 : 1800; // wider when crazy 8s cards shown
    const totalWidth = (allOwnerIds.length - 1) * TREE_SPACING;
    allOwnerIds.forEach((oid, i) => {
      offsets[oid] = { x: i * TREE_SPACING - totalWidth / 2, y: 0 };
    });
    return offsets;
  }, [currentOwnerId, allOwnerIds, showCrazy8s]);

  // Convert store state to ReactFlow mind map nodes
  const rfMindMapNodes: Node[] = useMemo(() => {
    return mindMapNodes.map((nodeState) => {
      const basePos = livePositions.current[nodeState.id] || nodeState.position || { x: 0, y: 0 };
      const offset = nodeState.ownerId ? ownerOffsets[nodeState.ownerId] : undefined;
      const position = offset
        ? { x: basePos.x + offset.x, y: basePos.y + offset.y }
        : basePos;

      return {
        id: nodeState.id,
        type: 'mindMapNode',
        position,
        draggable: true,
        data: {
          label: nodeState.label,
          description: nodeState.description,
          themeColorId: nodeState.themeColorId,
          themeColor: nodeState.themeColor,
          themeBgColor: nodeState.themeBgColor,
          isRoot: nodeState.isRoot,
          isStarred: nodeState.isStarred,
          level: nodeState.level,
          ownerName: nodeState.isRoot ? nodeState.ownerName : undefined,
          isNewlyCreated: autoFocusNodeId === nodeState.id,
          onLabelChange: handleLabelChange,
          onDescriptionChange: handleDescriptionChange,
          onAddChild: handleAddChild,
          onAddChildAt: handleAddChildAt,
          onDelete: handleDelete,
          onToggleStar: handleToggleStar,
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- livePositions is a ref
  }, [mindMapNodes, ownerOffsets, autoFocusNodeId, handleLabelChange, handleDescriptionChange, handleAddChild, handleAddChildAt, handleDelete, handleToggleStar]);

  // Derive owner theme colors from their root node's stored palette color.
  // Falls back to the canvas palette by index, or neutral gray.
  const getOwnerTheme = useCallback((oid: string) => {
    const rootNode = allMindMapNodes.find((n) => n.isRoot && n.ownerId === oid);
    const tc = rootNode?.themeColorId
      ? THEME_COLORS.find((c) => c.id === rootNode.themeColorId)
      : undefined;
    if (tc) {
      return { themeColor: tc.color, themeBgColor: tc.bgColor, accentColor: tc.accentColor };
    }
    // Fallback: derive from owner index in allOwnerIds
    const idx = allOwnerIds?.indexOf(oid) ?? 0;
    const fallback = THEME_COLORS[idx % THEME_COLORS.length];
    return { themeColor: fallback.color, themeBgColor: fallback.bgColor, accentColor: fallback.accentColor };
  }, [allMindMapNodes, allOwnerIds]);

  // Sync starred mind map nodes → crazy 8s slot titles with AI enhancement + dirty protection
  const syncStarsToSlots = useCallback(async () => {
    const state = storeApi.getState();
    const isPerParticipant = state.mindMapNodes.some((n) => n.ownerId);

    if (isPerParticipant) {
      const ownerIds = [...new Set(state.mindMapNodes.map((n) => n.ownerId).filter(Boolean))] as string[];
      const owners = ownerIds.map((ownerId) => {
        const ownerStarred = state.mindMapNodes
          .filter((n) => n.ownerId === ownerId && n.isStarred && !n.isRoot && n.label.trim())
          .slice(0, 8);
        return {
          ownerId,
          ideas: ownerStarred.map((n) => ({ title: n.label.trim(), description: n.description })),
        };
      }).filter((o) => o.ideas.length > 0);

      if (owners.length > 0) {
        try {
          const response = await fetch('/api/ai/enhance-sketch-ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workshopId, owners, totalSlots: 8, generateWildcards: true }),
          });
          if (response.ok) {
            const data = await response.json();
            const ownerSlotsMap = data.ownerSlots as Record<string, Array<{ title: string; description: string; sketchHint: string; sketchPrompt?: string; isWildcard?: boolean }>>;
            const allSlots = [...state.crazy8sSlots];
            for (const ownerId of ownerIds) {
              const aiSlots = ownerSlotsMap?.[ownerId] || [];
              const ownerSlots = allSlots.filter((s) => s.ownerId === ownerId);
              ownerSlots.forEach((slot, i) => {
                if (slot.isDirty) return; // Skip user-edited slots
                if (aiSlots[i]) {
                  slot.title = aiSlots[i].title || slot.title;
                  slot.description = aiSlots[i].description || slot.description || '';
                  slot.sketchHint = aiSlots[i].sketchHint || '';
                  slot.sketchPrompt = aiSlots[i].sketchPrompt || '';
                  slot.isWildcard = aiSlots[i].isWildcard || false;
                }
              });
            }
            state.setCrazy8sSlots(allSlots);
          }
        } catch {
          // Silent fail — slots keep current values
        }
      }
    } else {
      const starredNodes = state.mindMapNodes
        .filter((n) => n.isStarred && !n.isRoot && n.label.trim())
        .slice(0, 8);

      if (starredNodes.length > 0) {
        try {
          const ideaObjects = starredNodes.map((n) => ({ title: n.label.trim(), description: n.description }));
          const response = await fetch('/api/ai/enhance-sketch-ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workshopId, ideas: ideaObjects, totalSlots: 8, generateWildcards: true }),
          });
          if (response.ok) {
            const data = await response.json();
            const aiSlots = data.slots as Array<{ title: string; description: string; sketchHint: string; sketchPrompt?: string; isWildcard?: boolean }>;
            const updatedSlots = state.crazy8sSlots.map((slot, i) => {
              if (slot.isDirty) return slot; // Skip user-edited slots
              return {
                ...slot,
                title: aiSlots[i]?.title || starredNodes[i]?.label.trim() || slot.title,
                description: aiSlots[i]?.description || starredNodes[i]?.description || slot.description || '',
                sketchHint: aiSlots[i]?.sketchHint || '',
                sketchPrompt: aiSlots[i]?.sketchPrompt || '',
                isWildcard: aiSlots[i]?.isWildcard || false,
              };
            });
            state.setCrazy8sSlots(updatedSlots);
          }
        } catch {
          // Silent fail
        }
      }
    }
    state.markDirty();
  }, [storeApi, workshopId]);

  // Crazy 8s group nodes — one per participant in multiplayer, single in solo
  const crazy8sNodes = useMemo<Node[]>(() => {
    if (!showCrazy8s) return [];

    // In multiplayer, wrap onSave to also signal crazy8s readiness
    const wrappedOnSave = isMultiplayerIdeation && onSaveCrazy8s
      ? async () => {
          await onSaveCrazy8s();
          crazy8sReadyRef.current?.setReady(true);
        }
      : onSaveCrazy8s;

    const participantOwnerIds = allOwnerIds?.filter((oid) => oid !== facilitatorOwnerId) ?? [];
    const completionInfo = isMultiplayerIdeation && participantOwnerIds.length > 0
      ? {
          totalParticipants: participantOwnerIds.length,
          completedCount: Object.entries(crazy8sReadinessMap).filter(([k, v]) => k !== facilitatorOwnerId && v).length,
        }
      : undefined;

    const baseData = {
      workshopId,
      stepId,
      onSave: wrappedOnSave,
      selectionMode,
      selectedSlotIds,
      onSelectionChange,
      onConfirmSelection,
      onBackToDrawing,
      votingMode,
      onVoteSelectionConfirm,
      onReVote,
      onStartMerge,
      onSyncStars: syncStarsToSlots,
    };

    // Solo mode or single owner — single node, no ownerId filtering
    if (!allOwnerIds || allOwnerIds.length <= 1) {
      return [{
        id: CRAZY_8S_NODE_ID,
        type: 'crazy8sGroupNode',
        position: { x: 900, y: -(CRAZY_8S_NODE_HEIGHT / 2) },
        draggable: false,
        connectable: false,
        focusable: false,
        data: baseData,
      }];
    }

    // Individual view — single node for the selected owner
    if (currentOwnerId) {
      const { accentColor } = getOwnerTheme(currentOwnerId);
      return [{
        id: `${CRAZY_8S_NODE_PREFIX}${currentOwnerId}`,
        type: 'crazy8sGroupNode',
        position: { x: 900, y: -(CRAZY_8S_NODE_HEIGHT / 2) },
        draggable: false,
        connectable: false,
        focusable: false,
        data: {
          ...baseData,
          ownerId: currentOwnerId,
          ownerName: ownerNames?.[currentOwnerId] || currentOwnerId,
          ownerColor: accentColor,
          completionInfo,
        },
      }];
    }

    // "All" view — one node per owner, positioned next to their mind map
    return allOwnerIds.map((oid) => {
      const offset = ownerOffsets[oid] || { x: 0, y: 0 };
      const { accentColor } = getOwnerTheme(oid);
      return {
        id: `${CRAZY_8S_NODE_PREFIX}${oid}`,
        type: 'crazy8sGroupNode',
        position: { x: offset.x + 900, y: offset.y - CRAZY_8S_NODE_HEIGHT / 2 },
        draggable: false,
        connectable: false,
        focusable: false,
        data: {
          ...baseData,
          ownerId: oid,
          ownerName: ownerNames?.[oid] || oid,
          ownerColor: accentColor,
          // In "All" view, keep grid visible after voting closes (results shown in separate node)
          showResultsInline: false,
        },
      };
    });
  }, [showCrazy8s, workshopId, stepId, onSaveCrazy8s, selectionMode, selectedSlotIds, onSelectionChange, onConfirmSelection, onBackToDrawing, votingMode, onVoteSelectionConfirm, onReVote, onStartMerge, syncStarsToSlots, allOwnerIds, currentOwnerId, ownerOffsets, ownerNames, getOwnerTheme, isMultiplayerIdeation, crazy8sReadinessMap, facilitatorOwnerId]);

  // Should voting artifacts be visible? (during voting OR persisted into brain-rewriting)
  const showVotingArtifact = (votingMode || (!!brainRewritingMatrices?.length && votingSession.status === 'closed')) && !!isMultiplayerIdeation;

  // Compute voting container position: BELOW all content (owner zones, mind maps, crazy 8s)
  const votingContainerPos = useMemo(() => {
    if (!showVotingArtifact) return { x: 0, y: 0 };

    // Check for persisted drag position
    const state = storeApi.getState();
    const persisted = state.votingCardPositions['__container__'];
    if (persisted) return persisted;

    // Find the true content bottom across ALL node types:
    // 1. Owner zone bottoms: zones start at (offset.y - 500) and are 1400px tall → bottom = offset.y + 900
    const zoneBottoms = Object.values(ownerOffsets).map((o) => o.y + 900);
    // 2. Crazy 8s bottoms
    const c8sBottoms = crazy8sNodes.map((n) => (n.position?.y ?? 0) + CRAZY_8S_NODE_HEIGHT);
    // 3. Mind map node bottoms (approximate 60px per node)
    const mmBottoms = rfMindMapNodes.map((n) => (n.position?.y ?? 0) + 60);

    const allBottoms = [...zoneBottoms, ...c8sBottoms, ...mmBottoms];
    const contentBottom = allBottoms.length > 0 ? Math.max(...allBottoms) : 0;

    // X: align with the leftmost crazy 8s node
    const c8sXs = crazy8sNodes.map((n) => n.position?.x ?? 900);
    const containerX = c8sXs.length > 0 ? Math.min(...c8sXs) : 900;
    const containerY = contentBottom + SECTION_GAP;

    return { x: containerX, y: containerY };
  }, [showVotingArtifact, crazy8sNodes, ownerOffsets, rfMindMapNodes, storeApi]);

  // Brain rewriting group nodes — positioned below voting container (or below crazy 8s if no voting)
  const brainRewritingNodes = useMemo<Node[]>(() => {
    if (!brainRewritingMatrices || brainRewritingMatrices.length === 0) return [];

    const firstCrazy8s = crazy8sNodes[0];
    const c8sX = firstCrazy8s?.position?.x ?? 900;

    let baseX: number;
    let baseY: number;

    if (isMultiplayerIdeation && votingSession.status === 'closed') {
      // Position below the voting container
      const state = storeApi.getState();
      const containerPos = state.votingCardPositions['__container__'] || votingContainerPos;
      // Count items for container height
      const groupedIds = new Set(slotGroups.flatMap((g) => g.slotIds));
      const seen = new Set<string>();
      let cCount = 0;
      for (const s of allCrazy8sSlots) {
        if (!s.imageUrl || groupedIds.has(s.slotId) || seen.has(s.slotId)) continue;
        seen.add(s.slotId);
        cCount++;
      }
      const cSize = computeVotingContainerSize(cCount, slotGroups.length);
      baseX = containerPos.x;
      baseY = containerPos.y + cSize.height + SECTION_GAP;
    } else {
      // Solo / no voting: to the right of crazy 8s (legacy)
      baseX = c8sX + CRAZY_8S_NODE_WIDTH + 100;
      baseY = -(BR_NODE_HEIGHT / 2);
    }

    return brainRewritingMatrices.map((matrix, index) => {
      const slot = crazy8sSlots.find((s) => s.slotId === matrix.slotId);
      const slotNumber = matrix.slotId.split('-slot-').pop() || matrix.slotId.replace('slot-', '');

      // Use group label when this matrix represents a merged group
      let title = slot?.title || `Sketch ${slotNumber}`;
      if (matrix.groupId) {
        const group = slotGroups.find((g) => g.id === matrix.groupId);
        if (group) title = group.label;
      }

      return {
        id: `${BR_NODE_PREFIX}${matrix.slotId}`,
        type: 'brainRewritingGroupNode',
        position: { x: baseX + index * (BR_NODE_WIDTH + BR_NODE_GAP), y: baseY },
        draggable: false,
        connectable: false,
        focusable: false,
        data: {
          workshopId,
          stepId,
          matrix,
          slotTitle: title,
          indexLabel: `${index + 1} of ${brainRewritingMatrices.length}`,
          onCellUpdate: onBrainRewritingCellUpdate,
          onToggleIncluded: onBrainRewritingToggleIncluded,
        },
      };
    });
  }, [brainRewritingMatrices, workshopId, stepId, crazy8sSlots, allCrazy8sSlots, slotGroups, onBrainRewritingCellUpdate, onBrainRewritingToggleIncluded, crazy8sNodes, isMultiplayerIdeation, votingSession.status, storeApi, votingContainerPos]);

  // Owner zone nodes — colored background rectangles behind each participant's tree
  const showDoneButton = !!isMultiplayerIdeation && !showCrazy8s;
  const ownerZoneNodes = useMemo<Node[]>(() => {
    if (!allOwnerIds || allOwnerIds.length <= 1) return [];

    const handleToggle = () => toggleReadyRef.current?.toggleReady();

    // Zone width: wider when crazy 8s cards are shown next to mind map
    const zoneWidth = showCrazy8s ? 2600 : undefined; // undefined = default 1600

    // Individual view: show zone for the selected participant only (centered at origin)
    if (currentOwnerId) {
      const { themeColor, themeBgColor } = getOwnerTheme(currentOwnerId);
      const isSelf = !!selfParticipantId && currentOwnerId === selfParticipantId;
      return [{
        id: `${ZONE_NODE_PREFIX}${currentOwnerId}`,
        type: 'ownerZoneNode',
        position: { x: -800, y: -500 },
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        zIndex: -1,
        data: {
          ownerName: ownerNames?.[currentOwnerId] || currentOwnerId,
          ownerThemeColor: themeColor,
          ownerThemeBgColor: themeBgColor,
          isSelf,
          isReady: readinessMap[currentOwnerId] ?? false,
          showDoneButton,
          onToggleReady: handleToggle,
          width: zoneWidth,
          starCount: ownerStarCounts[currentOwnerId] || 0,
        },
      }];
    }

    // "All" view: show zones for every participant at their offset
    return allOwnerIds.map((oid) => {
      const offset = ownerOffsets[oid] || { x: 0, y: 0 };
      const { themeColor, themeBgColor } = getOwnerTheme(oid);
      const isSelf = !!selfParticipantId && oid === selfParticipantId;
      return {
        id: `${ZONE_NODE_PREFIX}${oid}`,
        type: 'ownerZoneNode',
        position: { x: offset.x - 800, y: offset.y - 500 },
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        zIndex: -1,
        data: {
          ownerName: ownerNames?.[oid] || oid,
          ownerThemeColor: themeColor,
          ownerThemeBgColor: themeBgColor,
          isSelf,
          isReady: readinessMap[oid] ?? false,
          showDoneButton,
          onToggleReady: handleToggle,
          width: zoneWidth,
          starCount: ownerStarCounts[oid] || 0,
        },
      };
    });
  }, [currentOwnerId, allOwnerIds, ownerOffsets, ownerNames, getOwnerTheme, selfParticipantId, readinessMap, showDoneButton, showCrazy8s, ownerStarCounts]);

  // ── Voting nodes (multiplayer idea-selection on same canvas) ──

  // Auto-layout voting cards when entering voting phase
  const votingLayoutInitRef = useRef(false);
  useEffect(() => {
    if (!showVotingArtifact) {
      votingLayoutInitRef.current = false;
      return;
    }
    if (votingLayoutInitRef.current) return;
    const state = storeApi.getState();
    // Check for existing container-relative positions (must have __container__ key to be valid)
    const hasContainer = !!state.votingCardPositions['__container__'];
    const existingKeys = Object.keys(state.votingCardPositions).filter((k) => k !== '__container__');
    if (hasContainer && existingKeys.length > 0) {
      votingLayoutInitRef.current = true;
      return;
    }
    const filledSlots = state.crazy8sSlots.filter((s) => s.imageUrl);
    if (filledSlots.length === 0) return;

    const rawPositions = computeVotingGridLayout(state.crazy8sSlots, state.slotGroups);
    // Positions are now container-relative: offset by padding + header
    const offsetPositions: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of Object.entries(rawPositions)) {
      offsetPositions[id] = {
        x: pos.x + CONTAINER_PADDING,
        y: pos.y + CONTAINER_HEADER_HEIGHT + CONTAINER_PADDING,
      };
    }
    // Store the container position
    offsetPositions['__container__'] = votingContainerPos;
    state.batchSetVotingCardPositions(offsetPositions);
    votingLayoutInitRef.current = true;

    requestAnimationFrame(() => {
      fitView({ padding: 0.15, duration: 400 });
    });
  }, [showVotingArtifact, storeApi, votingContainerPos, fitView]);

  // Grouped slot IDs set (for filtering individual cards)
  const groupedSlotIds = useMemo(
    () => new Set(slotGroups.flatMap((g) => g.slotIds)),
    [slotGroups]
  );

  // Build voting ReactFlow nodes (container + child cards)
  const votingNodes = useMemo<Node[]>(() => {
    if (!showVotingArtifact) return [];

    const isDuringBrainRewriting = !!brainRewritingMatrices?.length;
    const result: Node[] = [];

    // Count items for container sizing
    const seenForCount = new Set<string>();
    let cardCount = 0;
    for (const slot of allCrazy8sSlots) {
      if (!slot.imageUrl || groupedSlotIds.has(slot.slotId) || seenForCount.has(slot.slotId)) continue;
      seenForCount.add(slot.slotId);
      cardCount++;
    }
    const containerSize = computeVotingContainerSize(cardCount, slotGroups.length);

    // Container node FIRST (ReactFlow requirement for parent nodes)
    const containerData: VotingContainerNodeData = {
      title: 'Voting Results',
      cardCount: cardCount + slotGroups.length,
      isActive: !isDuringBrainRewriting,
      votingStatus: votingSession.status,
    };
    result.push({
      id: VOTING_CONTAINER_ID,
      type: 'votingContainerNode',
      position: votingContainerPos,
      draggable: isFacilitator && !isDuringBrainRewriting,
      connectable: false,
      focusable: false,
      style: { width: containerSize.width, height: containerSize.height },
      data: containerData,
    });

    // Per-target vote counts
    const voteCounts = new Map<string, number>();
    for (const vote of dotVotes) {
      voteCounts.set(vote.slotId, (voteCounts.get(vote.slotId) ?? 0) + 1);
    }

    // Results rank map
    const rankMap = new Map<string, number>();
    if (votingSession.status === 'closed') {
      for (const r of votingSession.results) {
        rankMap.set(r.slotId, r.rank);
      }
    }

    // Default position for cards without a persisted position
    const defaultCardPos = { x: CONTAINER_PADDING, y: CONTAINER_HEADER_HEIGHT + CONTAINER_PADDING };

    // Individual cards (ungrouped, filled slots — deduplicate by slotId)
    const seenSlotIds = new Set<string>();
    for (const slot of allCrazy8sSlots) {
      if (!slot.imageUrl) continue;
      if (groupedSlotIds.has(slot.slotId)) continue;
      if (seenSlotIds.has(slot.slotId)) continue;
      seenSlotIds.add(slot.slotId);

      const pos = votingCardPositions[slot.slotId] ?? defaultCardPos;
      const myVoteOnThis = myVotes.find((v) => v.slotId === slot.slotId);

      const nodeData: VotingCardNodeData = {
        slot: {
          ...slot,
          ownerName: slot.ownerName ?? (ownerNames?.[slot.ownerId ?? ''] || 'Unknown'),
          ownerColor: slot.ownerColor ?? (ownerColors?.[slot.ownerId ?? ''] || '#608850'),
        },
        voteCount: voteCounts.get(slot.slotId) ?? 0,
        rank: rankMap.get(slot.slotId),
        voterDots: getVoterDots(slot.slotId),
        myVoteId: myVoteOnThis?.id,
        canVote: isDuringBrainRewriting ? false : canVote,
        isFacilitator,
        isSelected: resultSelections.has(slot.slotId),
        votingStatus: votingSession.status,
        onCastVote: handleCastVote,
        onRetractVote: handleRetractVote,
        onToggleSelect: handleToggleSelect,
      };

      result.push({
        id: `${VOTING_CARD_PREFIX}${slot.slotId}`,
        type: 'votingCardNode',
        position: pos,
        parentId: VOTING_CONTAINER_ID,
        extent: 'parent' as const,
        data: nodeData,
        draggable: !isDuringBrainRewriting && isFacilitator && votingSession.status === 'idle',
        width: VOTING_CARD_WIDTH,
        height: VOTING_CARD_HEIGHT,
      });
    }

    // Group nodes
    for (const group of slotGroups) {
      const pos = votingCardPositions[group.id] ?? defaultCardPos;
      const memberSlots = allCrazy8sSlots.filter((s) => group.slotIds.includes(s.slotId));
      const myVoteOnThis = myVotes.find((v) => v.slotId === group.id);

      const nodeData: VotingGroupNodeData = {
        group,
        memberSlots,
        voteCount: voteCounts.get(group.id) ?? 0,
        rank: rankMap.get(group.id),
        voterDots: getVoterDots(group.id),
        myVoteId: myVoteOnThis?.id,
        canVote: isDuringBrainRewriting ? false : canVote,
        isFacilitator,
        isSelected: resultSelections.has(group.id),
        votingStatus: votingSession.status,
        hasMergedImage: !!group.mergedImageUrl,
        onCastVote: handleCastVote,
        onRetractVote: handleRetractVote,
        onToggleSelect: handleToggleSelect,
        onStartMerge: onStartMerge || (() => {}),
        onUngroup: handleUngroup,
      };

      result.push({
        id: `${VOTING_GROUP_PREFIX}${group.id}`,
        type: 'votingGroupNode',
        position: pos,
        parentId: VOTING_CONTAINER_ID,
        extent: 'parent' as const,
        data: nodeData,
        draggable: !isDuringBrainRewriting && isFacilitator && votingSession.status === 'idle',
        width: VOTING_GROUP_WIDTH,
        height: VOTING_GROUP_HEIGHT,
      });
    }

    return result;
  }, [
    showVotingArtifact, brainRewritingMatrices, allCrazy8sSlots, slotGroups, dotVotes,
    votingSession, votingCardPositions, votingContainerPos, groupedSlotIds, myVotes, canVote,
    isFacilitator, resultSelections, ownerNames, ownerColors,
    getVoterDots, handleCastVote, handleRetractVote, handleToggleSelect,
    onStartMerge, handleUngroup,
  ]);

  // Combined nodes array: mind map + owner zones + crazy 8s + brain rewriting + voting
  const rfNodes = useMemo(() => {
    const combined = [...ownerZoneNodes, ...rfMindMapNodes, ...crazy8sNodes];
    if (brainRewritingNodes.length > 0) combined.push(...brainRewritingNodes);
    if (votingNodes.length > 0) combined.push(...votingNodes);
    return combined;
  }, [rfMindMapNodes, ownerZoneNodes, crazy8sNodes, brainRewritingNodes, votingNodes]);

  // Convert store state to ReactFlow edges
  const rfEdges: Edge[] = useMemo(() => {
    return mindMapEdges.map((edgeState) => ({
      id: edgeState.id,
      source: edgeState.source,
      target: edgeState.target,
      type: 'mindMapEdge',
      // Secondary edges can be selected and deleted
      selectable: !!edgeState.isSecondary,
      deletable: !!edgeState.isSecondary,
      data: {
        themeColor: edgeState.themeColor,
        isSecondary: edgeState.isSecondary,
      },
    }));
  }, [mindMapEdges]);

  // Controlled nodes state for ReactFlow (allows drag to work)
  const [nodes, setNodes] = useState<Node[]>(rfNodes);

  // Sync controlled nodes when store changes (not during drag)
  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes]);

  // Fit view when crazy 8s appears
  const prevShowCrazy8s = useRef(showCrazy8s);
  useEffect(() => {
    if (showCrazy8s && !prevShowCrazy8s.current) {
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 200);
    }
    prevShowCrazy8s.current = showCrazy8s;
  }, [showCrazy8s, fitView]);

  // Auto-pan to brain rewriting area when nodes first appear
  const prevBrCount = useRef(0);
  useEffect(() => {
    if (brainRewritingNodes.length > 0 && prevBrCount.current === 0) {
      // Pan to show voting container + all BR nodes
      const firstC8sId = crazy8sNodes[0]?.id || CRAZY_8S_NODE_ID;
      const nodeIds = [firstC8sId, VOTING_CONTAINER_ID, ...brainRewritingNodes.map((n) => n.id)];
      setTimeout(() => {
        fitView({ nodes: nodeIds.map((id) => ({ id })), padding: 0.1, duration: 600 });
      }, 300);
    }
    prevBrCount.current = brainRewritingNodes.length;
  }, [brainRewritingNodes, crazy8sNodes, fitView]);

  // Consume pendingFitView flag set by chat panel when adding nodes
  useEffect(() => {
    if (pendingFitView) {
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 150);
      setPendingFitView(false);
    }
  }, [pendingFitView, fitView, setPendingFitView]);

  // Fit view when switching between participants / "All" view
  const prevOwnerId = useRef(currentOwnerId);
  useEffect(() => {
    if (prevOwnerId.current !== currentOwnerId) {
      prevOwnerId.current = currentOwnerId;
      setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 100);
    }
  }, [currentOwnerId, fitView]);

  // Handle node changes (drag, selection)
  // Ref for ownerOffsets so drag handler always has current values without re-creating
  const ownerOffsetsRef = useRef(ownerOffsets);
  ownerOffsetsRef.current = ownerOffsets;

  // Lookup ownerId for a node by id (for offset subtraction during drag persist)
  const getNodeOwnerId = useCallback((nodeId: string) => {
    return allMindMapNodes.find((n) => n.id === nodeId)?.ownerId;
  }, [allMindMapNodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Update live positions ref during drag for flicker-free rendering
      for (const c of changes) {
        if (c.type === 'position') {
          const posChange = c as NodeChange & { id: string; position?: { x: number; y: number }; dragging?: boolean };
          // Skip non-draggable infrastructure nodes
          if (isCrazy8sNode(posChange.id) || posChange.id.startsWith(BR_NODE_PREFIX) || posChange.id.startsWith(ZONE_NODE_PREFIX)) continue;

          // Voting nodes: persist position to voting store
          if (isVotingNode(posChange.id)) {
            if (posChange.dragging === false && posChange.position) {
              if (posChange.id === VOTING_CONTAINER_ID) {
                // Container drag: persist under '__container__' key
                storeApi.getState().setVotingCardPosition('__container__', posChange.position);
              } else {
                // Card/group drag within container: persist relative position
                const storeKey = posChange.id.startsWith(VOTING_CARD_PREFIX)
                  ? posChange.id.slice(VOTING_CARD_PREFIX.length)
                  : posChange.id.slice(VOTING_GROUP_PREFIX.length);
                storeApi.getState().setVotingCardPosition(storeKey, posChange.position);
              }
            }
            continue; // Don't process as mind map node
          }

          if (posChange.dragging && posChange.position) {
            livePositions.current[posChange.id] = posChange.position;
          } else if (posChange.dragging === false) {
            // Drag ended — snap to grid and persist to store
            const finalPos = posChange.position || livePositions.current[posChange.id];
            if (finalPos) {
              // Subtract owner offset (if in "All" view) so stored position is owner-relative
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

      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [updateMindMapNodePosition, getNodeOwnerId, storeApi]
  );

  // Undo/redo handlers (temporal middleware only exists on the solo store, not multiplayer)
  const handleUndo = useCallback(() => {
    const temporalStore = (storeApi as any).temporal;
    if (!temporalStore) return;
    const pastStates = temporalStore.getState().pastStates;
    if (pastStates.length > 0) {
      temporalStore.getState().undo();
    }
  }, [storeApi]);

  const handleRedo = useCallback(() => {
    const temporalStore = (storeApi as any).temporal;
    if (!temporalStore) return;
    const futureStates = temporalStore.getState().futureStates;
    if (futureStates.length > 0) {
      temporalStore.getState().redo();
    }
  }, [storeApi]);

  // Subscribe to temporal store for undo/redo state
  useEffect(() => {
    const temporalStore = (storeApi as any).temporal;
    if (!temporalStore) return;
    const unsubscribe = temporalStore.subscribe((state: any) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });
    return unsubscribe;
  }, [storeApi]);

  // Add a node (level 1 child of root) with radial placement
  const handleAddNode = useCallback(() => {
    // Find the root node — in multiplayer, the root id is `${ownerId}-root`
    const rootNode = mindMapNodes.find((n) => n.isRoot);
    if (!rootNode) return;

    let themeColor: ThemeColor;
    if (isMultiplayerIdeation) {
      // Multiplayer: inherit root's palette color for tree consistency
      const inheritedColor = THEME_COLORS.find((c) => c.id === rootNode.themeColorId);
      themeColor = inheritedColor || THEME_COLORS[0];
    } else {
      // Solo: cycle through colors for different branches
      const existingLevel1Nodes = mindMapNodes.filter((n) => n.level === 1);
      const colorIndex = existingLevel1Nodes.length % THEME_COLORS.length;
      themeColor = THEME_COLORS[colorIndex];
    }

    const position = computeNewNodePosition(rootNode.id, mindMapNodes, mindMapEdges);

    const newNodeId = crypto.randomUUID();
    const newNode: MindMapNodeState = {
      id: newNodeId,
      label: '',
      themeColorId: themeColor.id,
      themeColor: themeColor.color,
      themeBgColor: themeColor.bgColor,
      isRoot: false,
      level: 1,
      parentId: rootNode.id,
      position,
      ...(currentOwnerId && { ownerId: currentOwnerId }),
    };

    const newEdge: MindMapEdgeState = {
      id: `${rootNode.id}-${newNodeId}`,
      source: rootNode.id,
      target: newNodeId,
      themeColor: themeColor.color,
      ...(currentOwnerId && { ownerId: currentOwnerId }),
    };

    addMindMapNode(newNode, newEdge);
    setAutoFocusNodeId(newNodeId);
    focusNodeTextarea(newNodeId);
    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
  }, [mindMapNodes, mindMapEdges, addMindMapNode, fitView, isMultiplayerIdeation, currentOwnerId, focusNodeTextarea]);

  // Auto-layout: recompute all positions using radial algorithm
  const handleAutoLayout = useCallback(() => {
    const positionMap = computeRadialLayout(mindMapNodes, mindMapEdges);
    const updates: Array<{ id: string; position: { x: number; y: number } }> = [];
    positionMap.forEach((pos, nodeId) => {
      updates.push({ id: nodeId, position: pos });
    });
    if (updates.length > 0) {
      batchUpdateMindMapNodePositions(updates);
      // Clear live positions to avoid stale refs
      livePositions.current = {};
      setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 100);
    }
  }, [mindMapNodes, mindMapEdges, batchUpdateMindMapNodePositions, fitView]);

  // Drag-to-create: track source node when a handle drag begins
  const connectingNodeId = useRef<string | null>(null);

  const handleConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, params: { nodeId: string | null }) => {
      connectingNodeId.current = params.nodeId;
    },
    []
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const sourceId = connectingNodeId.current;
      connectingNodeId.current = null;
      if (!sourceId) return;

      // Only create when dropped on the pane (not on another node)
      const target = (event as MouseEvent).target as HTMLElement;
      const isPane = target?.classList?.contains('react-flow__pane');
      if (!isPane) return;

      const sourceNode = mindMapNodes.find((n) => n.id === sourceId);
      if (!sourceNode) return;

      // Compute flow position from screen coords
      const clientX = 'changedTouches' in event
        ? (event as TouchEvent).changedTouches[0].clientX
        : (event as MouseEvent).clientX;
      const clientY = 'changedTouches' in event
        ? (event as TouchEvent).changedTouches[0].clientY
        : (event as MouseEvent).clientY;

      let flowPos = screenToFlowPosition({ x: clientX, y: clientY });

      // In "All" view, subtract owner offset so stored position is owner-relative
      const oid = sourceNode.ownerId;
      if (oid) {
        const offset = ownerOffsets[oid];
        if (offset) {
          flowPos = { x: flowPos.x - offset.x, y: flowPos.y - offset.y };
        }
      }

      const snapped = { x: snapToGrid(flowPos.x), y: snapToGrid(flowPos.y) };

      // Inherit theme from source
      const inheritedColor = THEME_COLORS.find((c) => c.id === sourceNode.themeColorId);
      const themeColor = inheritedColor || ROOT_COLOR;

      const newNodeId = crypto.randomUUID();
      const childLevel = sourceNode.level + 1;

      const newNode: MindMapNodeState = {
        id: newNodeId,
        label: '',
        themeColorId: themeColor.id,
        themeColor: themeColor.color,
        themeBgColor: themeColor.bgColor,
        isRoot: false,
        level: childLevel,
        parentId: sourceId,
        position: snapped,
        ...(currentOwnerId && { ownerId: currentOwnerId }),
      };

      const newEdge: MindMapEdgeState = {
        id: `${sourceId}-${newNodeId}`,
        source: sourceId,
        target: newNodeId,
        themeColor: themeColor.color,
        ...(currentOwnerId && { ownerId: currentOwnerId }),
      };

      addMindMapNode(newNode, newEdge);
      setAutoFocusNodeId(newNodeId);
      focusNodeTextarea(newNodeId);
    },
    [mindMapNodes, ownerOffsets, screenToFlowPosition, addMindMapNode, currentOwnerId, focusNodeTextarea]
  );

  // Connection handler: create secondary cross-connection edge
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Get source node to inherit its theme color
      const sourceNode = mindMapNodes.find((n) => n.id === connection.source);
      const themeColor = sourceNode?.themeColor || '#94a3b8';

      const edgeId = `secondary-${connection.source}-${connection.target}`;
      const newEdge: MindMapEdgeState = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        themeColor,
        isSecondary: true,
      };

      addMindMapEdge(newEdge);
    },
    [mindMapNodes, addMindMapEdge]
  );

  // Validate connections: block self-connections, duplicates, and non-mind-map nodes
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) return false;
      // No self-connections
      if (connection.source === connection.target) return false;
      // Block connections to/from crazy 8s and brain rewriting nodes
      if (isCrazy8sNode(connection.source) || isCrazy8sNode(connection.target)) return false;
      if (connection.source.startsWith(BR_NODE_PREFIX) || connection.target.startsWith(BR_NODE_PREFIX)) return false;
      // Block connections to/from voting nodes
      if (isVotingNode(connection.source) || isVotingNode(connection.target)) return false;
      // No duplicate edges
      const exists = mindMapEdges.some(
        (e) =>
          (e.source === connection.source && e.target === connection.target) ||
          (e.source === connection.target && e.target === connection.source)
      );
      return !exists;
    },
    [mindMapEdges]
  );

  // Handle edge deletion (only secondary edges are deletable)
  const handleEdgesDelete = useCallback(
    (edges: Edge[]) => {
      for (const edge of edges) {
        // Double-check it's secondary before deleting
        const storeEdge = mindMapEdges.find((e) => e.id === edge.id);
        if (storeEdge?.isSecondary) {
          deleteMindMapEdge(edge.id);
        }
      }
    },
    [mindMapEdges, deleteMindMapEdge]
  );

  // Handle edge changes (selection, removal)
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          const storeEdge = mindMapEdges.find((e) => e.id === change.id);
          if (storeEdge?.isSecondary) {
            deleteMindMapEdge(change.id);
          }
        }
      }
    },
    [mindMapEdges, deleteMindMapEdge]
  );

  // Track voting node selection for grouping
  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const votingIds = params.nodes
      .filter((n) => isVotingNode(n.id))
      .map((n) => n.id);
    setVotingSelectedIds(votingIds);
  }, []);

  // Compute "All Ready" state — all non-facilitator participants have signaled ready
  const allReady = useMemo(() => {
    if (!isMultiplayerIdeation || !allOwnerIds || allOwnerIds.length <= 1) return false;
    const participantOwnerIds = allOwnerIds.filter((oid) => oid !== facilitatorOwnerId);
    if (participantOwnerIds.length === 0) return false;
    return participantOwnerIds.every((oid) => readinessMap[oid] === true);
  }, [isMultiplayerIdeation, allOwnerIds, facilitatorOwnerId, readinessMap]);

  return (
    <div className="h-full w-full">
      {/* Readiness sync — renderless, bridges Liveblocks presence to readiness state */}
      {isMultiplayerIdeation && !showCrazy8s && (
        <MindMapReadinessSync
          ref={toggleReadyRef}
          onReadinessChange={handleReadinessChange}
        />
      )}
      {/* Crazy 8s readiness sync — active during crazy-eights + idea-selection phases */}
      {isMultiplayerIdeation && showCrazy8s && (
        <Crazy8sReadinessSync
          ref={crazy8sReadyRef}
          onReadinessChange={handleCrazy8sReadinessChange}
        />
      )}
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onSelectionChange={handleSelectionChange}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={true}
        connectionMode={ConnectionMode.Loose}
        edgesFocusable={true}
        panOnDrag={toolMode === 'pan'}
        selectionOnDrag={toolMode === 'select' || (!!votingMode && !!isMultiplayerIdeation && isFacilitator && votingSession.status === 'idle')}
        selectionMode={SelectionMode.Partial}
        selectNodesOnDrag={false}
        snapToGrid={true}
        snapGrid={[SNAP_GRID, SNAP_GRID]}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.id.startsWith(ZONE_NODE_PREFIX)) return 'transparent';
            if (isCrazy8sNode(n.id)) return (n.data?.ownerColor as string) || '#f59e0b';
            if (n.id.startsWith(BR_NODE_PREFIX)) return '#a855f7';
            if (isVotingNode(n.id)) return '#3b82f6';
            const color = n.data?.themeColor;
            return typeof color === 'string' ? color : '#6b7280';
          }}
          nodeColor={(n) => {
            if (n.id.startsWith(ZONE_NODE_PREFIX)) return 'transparent';
            if (isCrazy8sNode(n.id)) return (n.data?.ownerColor as string) ? `color-mix(in srgb, ${n.data.ownerColor} 15%, white)` : '#fef3c7';
            if (n.id.startsWith(BR_NODE_PREFIX)) return '#f3e8ff';
            if (isVotingNode(n.id)) return '#dbeafe';
            const bgColor = n.data?.themeBgColor;
            return typeof bgColor === 'string' ? bgColor : '#f3f4f6';
          }}
          maskColor="rgba(0,0,0,0.1)"
        />

        {/* Facilitator participant switcher */}
        {allOwnerIds && allOwnerIds.length > 1 && onOwnerSwitch && (
          <Panel position="top-left" className="!mt-4 !ml-4">
            <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-md">
              <Button
                size="sm"
                variant={!currentOwnerId ? 'secondary' : 'ghost'}
                className="text-xs h-7 px-2"
                onClick={() => onOwnerSwitch(null)}
              >
                All
              </Button>
              {allOwnerIds.map((oid) => (
                <div key={oid} className="flex items-center">
                  <Button
                    size="sm"
                    variant={currentOwnerId === oid ? 'secondary' : 'ghost'}
                    className="text-xs h-7 px-2 gap-1.5"
                    onClick={() => onOwnerSwitch(oid)}
                  >
                    {readinessMap[oid] && oid !== facilitatorOwnerId && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    )}
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getOwnerTheme(oid).accentColor }}
                    />
                    {ownerNames?.[oid] || oid}
                    {typeof ownerStarCounts[oid] === 'number' && ownerStarCounts[oid] > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        {ownerStarCounts[oid]}
                      </span>
                    )}
                  </Button>
                  {onDeleteOwner && isFacilitator && oid !== facilitatorOwnerId && (
                    <button
                      className="ml-0.5 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title={`Remove ${ownerNames?.[oid] || 'participant'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ ownerId: oid, name: ownerNames?.[oid] || 'this participant' });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* "All Ready" banner — shown when all participants have signaled done */}
        {allReady && isFacilitator && (
          <Panel position="top-center" className="!mt-4">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 shadow-md">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                All participants are ready
              </span>
            </div>
          </Panel>
        )}

        {/* Proceed button when brain rewriting is active */}
        {brainRewritingMatrices && brainRewritingMatrices.length > 0 && onBrainRewritingDone && (
          <Panel position="top-right" className="!mt-4 !mr-4">
            <Button
              onClick={onBrainRewritingDone}
              size="sm"
              className="gap-1.5 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
            >
              <ArrowRight className="h-4 w-4" />
              Proceed to Concept Development
            </Button>
          </Panel>
        )}

        {/* Voting: Group Selected button */}
        {canGroupVotingCards && !showGroupPrompt && (
          <Panel position="top-center" className="!mt-4">
            <Button
              size="sm"
              className="gap-1.5 shadow-md"
              onClick={() => setShowGroupPrompt(true)}
            >
              <Layers className="h-3.5 w-3.5" />
              Group {votingSelectedIds.length} Selected
            </Button>
          </Panel>
        )}

        {/* Voting: Group name prompt */}
        {showGroupPrompt && (
          <Panel position="top-center" className="!mt-4">
            <div className="flex items-center gap-2 bg-background border rounded-lg shadow-md p-2">
              <Input
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="Group name..."
                className="h-8 w-48 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmGroup();
                  if (e.key === 'Escape') {
                    setShowGroupPrompt(false);
                    setGroupNameInput('');
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8"
                disabled={!groupNameInput.trim()}
                onClick={handleConfirmGroup}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setShowGroupPrompt(false);
                  setGroupNameInput('');
                }}
              >
                Cancel
              </Button>
            </div>
          </Panel>
        )}

        {/* Voting: Results sidebar */}
        {votingMode && isMultiplayerIdeation && votingSession.status === 'closed' && (
          <Panel position="top-right" className="!mt-4 !mr-4">
            <VotingResultsSidebar
              onConfirmSelection={(ids) => onVoteSelectionConfirm?.(ids)}
              onReVote={() => onReVote?.()}
              onStartMerge={(groupId) => onStartMerge?.(groupId)}
            />
          </Panel>
        )}

        {/* Voting: Phase status label */}
        {votingMode && isMultiplayerIdeation && (
          <Panel position="bottom-center" className="!mb-16">
            <div className="bg-background/80 backdrop-blur-sm border rounded-full px-4 py-1.5 text-xs text-muted-foreground shadow-sm">
              {votingSession.status === 'idle' && (
                isFacilitator
                  ? 'Arrange cards and group similar ideas, then start the timer to vote'
                  : 'Facilitator is arranging ideas...'
              )}
              {votingSession.status === 'open' && 'Voting in progress — tap cards to vote'}
              {votingSession.status === 'closed' && (
                isFacilitator
                  ? 'Select ideas to continue with'
                  : 'Waiting for facilitator to select ideas...'
              )}
            </div>
          </Panel>
        )}

        {/* Bottom toolbar */}
        <Panel position="bottom-center" className="!mb-4">
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1.5 shadow-md">
            {/* Tool mode toggle */}
            <Button
              onClick={() => setToolMode('select')}
              size="icon"
              variant={toolMode === 'select' ? 'secondary' : 'ghost'}
              className="h-8 w-8"
              title="Select (marquee)"
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setToolMode('pan')}
              size="icon"
              variant={toolMode === 'pan' ? 'secondary' : 'ghost'}
              className="h-8 w-8"
              title="Pan (hand)"
            >
              <Hand className="h-4 w-4" />
            </Button>
            {/* Hide mind-map controls during multiplayer voting */}
            {!(votingMode && isMultiplayerIdeation) && (
              <>
                <div className="mx-1 h-5 w-px bg-border" />
                <Button
                  onClick={handleAddNode}
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Node
                </Button>
                <Button
                  onClick={handleAutoLayout}
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  title="Auto-layout (radial)"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Layout
                </Button>
                {/* Star count badge (solo mode or when no owner tabs shown) */}
                {(!allOwnerIds || allOwnerIds.length <= 1) && (
                  <>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground" title="Starred ideas for Crazy 8s (max 8)">
                      <Star className={cn('h-3.5 w-3.5', soloStarCount > 0 ? 'fill-amber-500 text-amber-500' : '')} />
                      <span className={cn('font-medium', soloStarCount > 0 && 'text-amber-600 dark:text-amber-400')}>
                        {soloStarCount}/8
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
            <div className="mx-1 h-5 w-px bg-border" />
            <Button
              onClick={handleUndo}
              disabled={!canUndo}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleRedo}
              disabled={!canRedo}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </Panel>
      </ReactFlow>

      {/* Delete participant confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove participant</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span> and
              all their canvas content (mind map nodes and sketches). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget && onDeleteOwner) {
                  onDeleteOwner(deleteTarget.ownerId);
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Node cascade-delete confirmation dialog */}
      <AlertDialog open={!!nodeCascadeDelete} onOpenChange={(open) => { if (!open) setNodeCascadeDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete node and children</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this node and{' '}
              <span className="font-semibold text-foreground">
                {nodeCascadeDelete?.descendantCount} child node{nodeCascadeDelete?.descendantCount === 1 ? '' : 's'}
              </span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (nodeCascadeDelete) {
                  deleteMindMapNode(nodeCascadeDelete.nodeId);
                }
                setNodeCascadeDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

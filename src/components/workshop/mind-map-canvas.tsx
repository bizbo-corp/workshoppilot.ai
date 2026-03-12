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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Undo2, Redo2, MousePointer2, Hand, LayoutGrid, ArrowRight, X } from 'lucide-react';

import { MindMapNode } from '@/components/canvas/mind-map-node';
import { useMultiplayerContext } from '@/components/workshop/multiplayer-room';
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

// Define node and edge types outside component to prevent re-renders
const nodeTypes = {
  mindMapNode: MindMapNode,
  crazy8sGroupNode: Crazy8sGroupNode,
  brainRewritingGroupNode: BrainRewritingGroupNodeComponent,
  ownerZoneNode: OwnerZoneNode,
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

  // Filter crazy 8s slots by ownerId (except during idea-selection which shows all)
  const crazy8sSlots = useMemo(() => {
    if (!currentOwnerId) return allCrazy8sSlots;
    // During idea-selection/voting, show ALL participants' slots
    if (votingMode) return allCrazy8sSlots;
    return allCrazy8sSlots.filter((s) => s.ownerId === currentOwnerId);
  }, [allCrazy8sSlots, currentOwnerId, votingMode]);

  const { fitView } = useReactFlow();

  const storeApi = useCanvasStoreApi();

  // Undo/redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Tool mode: 'select' = marquee selection on drag, 'pan' = hand tool (default)
  const [toolMode, setToolMode] = useState<'select' | 'pan'>('pan');

  // Facilitator check — only facilitator can delete participants
  const { isFacilitator } = useMultiplayerContext();

  // Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ ownerId: string; name: string } | null>(null);

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
    },
    [mindMapNodes, mindMapEdges, addMindMapNode, currentOwnerId, isMultiplayerIdeation]
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
        const shouldDelete = window.confirm(
          `Delete this node and ${descendants.size} child node(s)?`
        );
        if (!shouldDelete) return;
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

  // Compute per-owner horizontal offsets for "All" view so trees don't overlap
  const ownerOffsets = useMemo(() => {
    const offsets: Record<string, { x: number; y: number }> = {};
    if (currentOwnerId || !allOwnerIds || allOwnerIds.length <= 1) return offsets;
    const TREE_SPACING = 1800; // horizontal gap between each participant's tree
    const totalWidth = (allOwnerIds.length - 1) * TREE_SPACING;
    allOwnerIds.forEach((oid, i) => {
      offsets[oid] = { x: i * TREE_SPACING - totalWidth / 2, y: 0 };
    });
    return offsets;
  }, [currentOwnerId, allOwnerIds]);

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
          themeColorId: nodeState.themeColorId,
          themeColor: nodeState.themeColor,
          themeBgColor: nodeState.themeBgColor,
          isRoot: nodeState.isRoot,
          isStarred: nodeState.isStarred,
          level: nodeState.level,
          ownerName: nodeState.isRoot ? nodeState.ownerName : undefined,
          onLabelChange: handleLabelChange,
          onAddChild: handleAddChild,
          onDelete: handleDelete,
          onToggleStar: handleToggleStar,
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- livePositions is a ref
  }, [mindMapNodes, ownerOffsets, handleLabelChange, handleAddChild, handleDelete, handleToggleStar]);

  // Crazy 8s group node — positioned to the right of the mind map
  const crazy8sNode = useMemo<Node | null>(() => {
    if (!showCrazy8s) return null;
    return {
      id: CRAZY_8S_NODE_ID,
      type: 'crazy8sGroupNode',
      position: { x: 900, y: -(CRAZY_8S_NODE_HEIGHT / 2) },
      draggable: false,
      connectable: false,
      focusable: false,
      data: {
        workshopId,
        stepId,
        onSave: onSaveCrazy8s,
        selectionMode,
        selectedSlotIds,
        onSelectionChange,
        onConfirmSelection,
        onBackToDrawing,
        // Voting mode pass-through
        votingMode,
        onVoteSelectionConfirm,
        onReVote,
        // Merge dialog trigger
        onStartMerge,
      },
    };
  }, [showCrazy8s, workshopId, stepId, onSaveCrazy8s, selectionMode, selectedSlotIds, onSelectionChange, onConfirmSelection, onBackToDrawing, votingMode, onVoteSelectionConfirm, onReVote, onStartMerge]);

  // Brain rewriting group nodes — positioned to the right of Crazy 8s
  const brainRewritingNodes = useMemo<Node[]>(() => {
    if (!brainRewritingMatrices || brainRewritingMatrices.length === 0) return [];
    const baseX = 900 + CRAZY_8S_NODE_WIDTH + 100; // gap after crazy 8s
    const baseY = -(BR_NODE_HEIGHT / 2);

    return brainRewritingMatrices.map((matrix, index) => {
      const slot = crazy8sSlots.find((s) => s.slotId === matrix.slotId);
      const slotNumber = matrix.slotId.replace('slot-', '');

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
  }, [brainRewritingMatrices, workshopId, stepId, crazy8sSlots, slotGroups, onBrainRewritingCellUpdate, onBrainRewritingToggleIncluded]);

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

  // Owner zone nodes — colored background rectangles behind each participant's tree
  const ownerZoneNodes = useMemo<Node[]>(() => {
    if (!allOwnerIds || allOwnerIds.length <= 1) return [];

    // Individual view: show zone for the selected participant only (centered at origin)
    if (currentOwnerId) {
      const { themeColor, themeBgColor } = getOwnerTheme(currentOwnerId);
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
        },
      }];
    }

    // "All" view: show zones for every participant at their offset
    return allOwnerIds.map((oid) => {
      const offset = ownerOffsets[oid] || { x: 0, y: 0 };
      const { themeColor, themeBgColor } = getOwnerTheme(oid);
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
        },
      };
    });
  }, [currentOwnerId, allOwnerIds, ownerOffsets, ownerNames, getOwnerTheme]);

  // Combined nodes array: mind map + owner zones + optional crazy 8s + brain rewriting
  const rfNodes = useMemo(() => {
    const combined = [...ownerZoneNodes, ...rfMindMapNodes];
    if (crazy8sNode) combined.push(crazy8sNode);
    if (brainRewritingNodes.length > 0) combined.push(...brainRewritingNodes);
    return combined;
  }, [rfMindMapNodes, ownerZoneNodes, crazy8sNode, brainRewritingNodes]);

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
      // Pan to show crazy 8s + all BR nodes
      const nodeIds = [CRAZY_8S_NODE_ID, ...brainRewritingNodes.map((n) => n.id)];
      setTimeout(() => {
        fitView({ nodes: nodeIds.map((id) => ({ id })), padding: 0.1, duration: 600 });
      }, 300);
    }
    prevBrCount.current = brainRewritingNodes.length;
  }, [brainRewritingNodes, fitView]);

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
          // Skip non-mind-map nodes
          if (posChange.id === CRAZY_8S_NODE_ID || posChange.id.startsWith(BR_NODE_PREFIX) || posChange.id.startsWith(ZONE_NODE_PREFIX)) continue;
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
    [updateMindMapNodePosition, getNodeOwnerId]
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
    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
  }, [mindMapNodes, mindMapEdges, addMindMapNode, fitView, isMultiplayerIdeation, currentOwnerId]);

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
      if (connection.source === CRAZY_8S_NODE_ID || connection.target === CRAZY_8S_NODE_ID) return false;
      if (connection.source.startsWith(BR_NODE_PREFIX) || connection.target.startsWith(BR_NODE_PREFIX)) return false;
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

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
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
        selectionOnDrag={toolMode === 'select'}
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
            if (n.id === CRAZY_8S_NODE_ID) return '#f59e0b';
            if (n.id.startsWith(BR_NODE_PREFIX)) return '#a855f7';
            const color = n.data?.themeColor;
            return typeof color === 'string' ? color : '#6b7280';
          }}
          nodeColor={(n) => {
            if (n.id.startsWith(ZONE_NODE_PREFIX)) return 'transparent';
            if (n.id === CRAZY_8S_NODE_ID) return '#fef3c7';
            if (n.id.startsWith(BR_NODE_PREFIX)) return '#f3e8ff';
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
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getOwnerTheme(oid).accentColor }}
                    />
                    {ownerNames?.[oid] || oid}
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
    </div>
  );
}

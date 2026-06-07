'use client';

import { useCallback, useMemo, useState, useRef, useEffect, type MutableRefObject } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  SelectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
  type OnReconnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useJourneyMapperStore, useJourneyMapperStoreApi } from '@/providers/journey-mapper-store-provider';
import { JourneyFeatureNode, type JourneyFeatureNodeData } from './journey-feature-node';
import { JourneyStageHeader, type StageHeaderData } from './journey-stage-header';
import { JourneyGroupContainer, type GroupContainerData } from './journey-group-container';
import { JourneyEdge } from './journey-edge';
import { JourneyNodeDetailDialog } from './journey-node-detail-dialog';
import { EmotionCurveOverlay } from './emotion-curve-overlay';
import { JourneyMapperToolbar } from './journey-mapper-toolbar';
import { JourneyCanvasToolbar } from './journey-canvas-toolbar';
import { V0PromptPanel } from './v0-prompt-panel';
import { CanvasZoomControls } from '@/components/canvas/canvas-zoom-controls';
import { PrdViewerDialog } from '@/components/workshop/prd-viewer-dialog';
import { GroupManagementDialog } from './group-management-dialog';
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
import {
  computeJourneyMapLayout,
  computeGroupContainers,
  computeSitemapPositions,
  computeJourneyMapPositions,
  autoTidyPositions,
} from '@/lib/journey-mapper/layout';
import {
  getNodesForView,
  getEdgesForView,
  getGroupsForView,
} from '@/lib/journey-mapper/view-selectors';
import type { JourneyMapperNode, NavigationGroup } from '@/lib/journey-mapper/types';
import { getGroupColor } from '@/lib/journey-mapper/types';
import { cn } from '@/lib/utils';

const nodeTypes = {
  featureNode: JourneyFeatureNode,
  stageHeader: JourneyStageHeader,
  groupContainer: JourneyGroupContainer,
};

const edgeTypes = {
  journeyEdge: JourneyEdge,
};

const NODE_W = 260; // featureNode width
const NODE_H = 100; // approximate featureNode height

/** Resolve best source/target handle IDs based on relative node positions. */
function resolveHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = (targetPos.x + NODE_W / 2) - (sourcePos.x + NODE_W / 2);
  const dy = (targetPos.y + NODE_H / 2) - (sourcePos.y + NODE_H / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'source-right', targetHandle: 'target-left' }
      : { sourceHandle: 'source-left', targetHandle: 'target-right' };
  }
  return dy >= 0
    ? { sourceHandle: 'source-bottom', targetHandle: 'target-top' }
    : { sourceHandle: 'source-top', targetHandle: 'target-bottom' };
}

// Per-concept color palette
const CONCEPT_COLORS = [
  'hsl(221 83% 53%)',  // blue
  'hsl(142 76% 36%)',  // green
  'hsl(262 83% 58%)',  // purple
  'hsl(25 95% 53%)',   // orange
  'hsl(346 77% 50%)',  // rose
];

// ─── Context menu types ───

type ContextMenu = {
  type: 'node' | 'edge';
  id: string;
  x: number;
  y: number;
} | null;

interface UXJourneyMapperProps {
  workshopId: string;
  sessionId: string;
  isReadOnly?: boolean;
  buildPackIdRef?: MutableRefObject<string | null>;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  onReset: () => void;
  isResetting?: boolean;
}

function JourneyMapperInner({
  workshopId,
  sessionId,
  isReadOnly,
  buildPackIdRef,
  onRegenerate,
  isRegenerating,
  onReset,
  isResetting,
}: UXJourneyMapperProps) {
  const router = useRouter();
  const storeApi = useJourneyMapperStoreApi();

  // Subscribe to view-relevant slices from the store
  const masterNodes = useJourneyMapperStore((s) => s.nodes);
  const stages = useJourneyMapperStore((s) => s.stages);
  const isApproved = useJourneyMapperStore((s) => s.isApproved);
  const strategicIntent = useJourneyMapperStore((s) => s.strategicIntent);
  const activeView = useJourneyMapperStore((s) => s.activeView);
  const journeyView = useJourneyMapperStore((s) => s.journeyView);
  const sitemapView = useJourneyMapperStore((s) => s.sitemapView);

  // Derive view-resolved data
  const viewNodes = useMemo(() => {
    const state = { ...storeApi.getState(), nodes: masterNodes, journeyView, sitemapView };
    return getNodesForView(state, activeView);
  }, [masterNodes, activeView, journeyView, sitemapView, storeApi]);

  const viewEdges = useMemo(() => {
    const state = { ...storeApi.getState(), journeyView, sitemapView };
    return getEdgesForView(state, activeView);
  }, [activeView, journeyView, sitemapView, storeApi]);

  const viewGroups = useMemo(() => {
    const state = { ...storeApi.getState(), sitemapView };
    return getGroupsForView(state, activeView);
  }, [activeView, sitemapView, storeApi]);

  const [activeTool, setActiveTool] = useState<'pointer' | 'hand'>('pointer');
  const [v0Prompt, setV0Prompt] = useState<string | null>(null);
  const [v0BuildPackId, setV0BuildPackId] = useState<string | null>(null);
  const [showPeripherals, setShowPeripherals] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>(undefined);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<string | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const edgeReconnectSuccessful = useRef(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Prototype dialog state
  const [showPrototypeDialog, setShowPrototypeDialog] = useState(false);
  const [prototypeDialogData, setPrototypeDialogData] = useState<{
    prompt: string;
    systemPrompt: string;
    conceptName: string;
    buildPackId: string;
  } | undefined>(undefined);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as HTMLElement)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  // One-time: compute layout if view positions are empty on first access
  const layoutInitRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (layoutInitRef.current.has(activeView)) return;
    const state = storeApi.getState();
    if (state.nodes.length === 0) return;

    const viewState = activeView === 'journey' ? state.journeyView : state.sitemapView;
    const hasPositions = Object.keys(viewState.positions).length > 0;
    if (hasPositions) {
      layoutInitRef.current.add(activeView);
      return;
    }

    layoutInitRef.current.add(activeView);

    // Compute and set positions for this view
    if (activeView === 'sitemap') {
      const effectiveGroups = state.sitemapView.groups.length > 0
        ? state.sitemapView.groups
        : [{ id: 'main', label: 'Main', description: 'All features' }];
      const { positions } = computeSitemapPositions(state.nodes, effectiveGroups, state.sitemapView.edges);
      storeApi.getState().setViewPositions('sitemap', positions);
    } else {
      const { positions } = computeJourneyMapPositions(state.nodes, state.stages);
      storeApi.getState().setViewPositions('journey', positions);
    }
    storeApi.getState().markDirty();
  }, [activeView, storeApi]);

  // Handle view mode switch
  const handleSetViewMode = useCallback((mode: 'journey' | 'sitemap') => {
    storeApi.getState().setActiveView(mode);
  }, [storeApi]);

  // Group container callbacks
  const handleGroupEdit = useCallback((groupId: string) => {
    setEditingGroupId(groupId);
    setShowGroupDialog(true);
  }, []);

  const handleGroupDelete = useCallback((groupId: string) => {
    setPendingDeleteGroupId(groupId);
  }, []);

  const confirmGroupDelete = useCallback(() => {
    if (pendingDeleteGroupId) {
      storeApi.getState().deleteGroup(pendingDeleteGroupId);
      setPendingDeleteGroupId(null);
    }
  }, [storeApi, pendingDeleteGroupId]);

  const handleGroupHeaderClick = useCallback((groupId: string) => {
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId));
  }, []);

  // Node detail dialog & deletion callbacks
  const handleOpenDetail = useCallback((nodeId: string) => {
    setDetailNodeId(nodeId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailNodeId(null);
  }, []);

  const handleFieldChange = useCallback(
    (id: string, field: keyof JourneyMapperNode, value: string) => {
      storeApi.getState().updateNode(id, { [field]: value } as Partial<JourneyMapperNode>);
    },
    [storeApi]
  );

  const handleDeleteNode = useCallback((nodeId: string) => {
    storeApi.getState().deleteNode(nodeId);
    setDetailNodeId(null);
  }, [storeApi]);

  // Add node at directional offset from an existing node
  const handleAddNodeAt = useCallback(
    (parentId: string, direction: 'top' | 'right' | 'bottom' | 'left') => {
      const state = storeApi.getState();
      const parent = state.nodes.find((n) => n.id === parentId);
      if (!parent) return;

      // Use view-specific position for the parent
      const viewState = state.activeView === 'journey' ? state.journeyView : state.sitemapView;
      const parentPos = viewState.positions[parentId] ?? parent.position;

      const OFFSETS = {
        top:    { x: 0,    y: -200 },
        bottom: { x: 0,    y:  200 },
        left:   { x: -300, y:  0   },
        right:  { x:  300, y:  0   },
      };
      const offset = OFFSETS[direction];
      const position = {
        x: parentPos.x + offset.x,
        y: parentPos.y + offset.y,
      };

      const id = `jm-node-${Date.now()}`;
      storeApi.getState().addNode({
        id,
        conceptIndex: parent.conceptIndex,
        conceptName: parent.conceptName,
        featureName: 'New Feature',
        featureDescription: '',
        stageId: parent.stageId,
        stageName: parent.stageName,
        uiType: 'detail-view',
        uiPatternSuggestion: '',
        addressesPain: '',
        position,
        priority: 'should-have',
        nodeCategory: 'core',
        groupId: parent.groupId,
      });

      // Connect parent → new node
      storeApi.getState().addEdge({
        id: `jm-edge-${Date.now()}`,
        sourceNodeId: parentId,
        targetNodeId: id,
        flowType: 'secondary',
      });

      storeApi.getState().markDirty();
    },
    [storeApi]
  );

  // ─── Build React Flow nodes from store state ───
  const { rfNodes, rfEdges } = useMemo(() => {
    const filteredNodes = showPeripherals
      ? viewNodes
      : viewNodes.filter((n) => n.nodeCategory !== 'peripheral');

    // Build group → color map for passing to containers and feature nodes
    const groupColorMap = new Map(viewGroups.map((g, i) => [g.id, getGroupColor(g, i)]));

    if (activeView === 'sitemap') {
      const effectiveGroups = viewGroups.length > 0
        ? viewGroups
        : [{ id: 'main', label: 'Main', description: 'All features' }];

      // Use stored positions; compute group containers from current node positions
      const containers = computeGroupContainers(filteredNodes, effectiveGroups);

      // Group container RF nodes
      const containerNodes: Node<GroupContainerData>[] = containers.map((c) => {
        const gc = groupColorMap.get(c.groupId);
        return {
          id: c.id,
          type: 'groupContainer',
          position: c.position,
          zIndex: -1,
          draggable: !isReadOnly,
          selectable: false,
          style: { width: c.width, height: c.height },
          data: {
            groupId: c.groupId,
            label: c.label,
            width: c.width,
            height: c.height,
            fillColor: gc?.fill,
            borderColor: gc?.border,
            textColor: gc?.text,
            headerBg: gc?.headerBg,
            isSelected: selectedGroupId === c.groupId,
            onHeaderClick: isReadOnly ? undefined : handleGroupHeaderClick,
            onEdit: isReadOnly ? undefined : handleGroupEdit,
            onDelete: isReadOnly ? undefined : handleGroupDelete,
          },
        };
      });

      // Feature nodes
      const featureRfNodes: Node<JourneyFeatureNodeData>[] = filteredNodes.map((node) => ({
        id: node.id,
        type: 'featureNode' as const,
        position: node.position,
        data: {
          ...node,
          conceptColor: CONCEPT_COLORS[node.conceptIndex % CONCEPT_COLORS.length],
          groupColor: node.groupId ? groupColorMap.get(node.groupId)?.text : undefined,
          onOpenDetail: isReadOnly ? undefined : handleOpenDetail,
          onDeleteNode: isReadOnly ? undefined : handleDeleteNode,
          onAddNodeAt: isReadOnly ? undefined : handleAddNodeAt,
        },
      }));

      const posMap = new Map(filteredNodes.map((n) => [n.id, n.position]));
      const visibleIds = new Set(filteredNodes.map((n) => n.id));
      const flowEdges: Edge[] = viewEdges
        .filter((e) => visibleIds.has(e.sourceNodeId) && visibleIds.has(e.targetNodeId))
        .map((edge) => {
          const handles = edge.sourceHandle && edge.targetHandle
            ? { sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle }
            : resolveHandles(
                posMap.get(edge.sourceNodeId) ?? { x: 0, y: 0 },
                posMap.get(edge.targetNodeId) ?? { x: 0, y: 0 },
              );
          return {
            id: edge.id,
            source: edge.sourceNodeId,
            target: edge.targetNodeId,
            sourceHandle: handles.sourceHandle,
            targetHandle: handles.targetHandle,
            type: 'journeyEdge' as const,
            animated: edge.flowType === 'primary',
            interactionWidth: 20,
            style: {
              stroke:
                edge.flowType === 'error'
                  ? 'hsl(0 84% 60%)'
                  : edge.flowType === 'secondary'
                  ? 'var(--muted-foreground)'
                  : 'var(--primary)',
              strokeWidth: edge.flowType === 'primary' ? 2.5 : 1.5,
            },
          };
        });

      return {
        rfNodes: [...containerNodes, ...featureRfNodes] as Node[],
        rfEdges: flowEdges,
      };
    }

    // ─── Journey (stage column) layout ───
    const layoutNodes = filteredNodes;
    const { headerNodes } = computeJourneyMapLayout(filteredNodes, stages);

    const headerRfNodes: Node<StageHeaderData>[] = headerNodes.map((h) => ({
      id: h.id,
      type: 'stageHeader',
      position: h.position,
      draggable: false,
      selectable: false,
      data: {
        stageId: h.stageId,
        stageName: h.stageName,
        description: h.description,
        emotion: h.emotion,
        isDip: h.isDip,
      },
    }));

    // No group containers in journey view (groups are sitemap-only)

    // Feature nodes
    const featureRfNodes: Node<JourneyFeatureNodeData>[] = layoutNodes.map((node) => ({
      id: node.id,
      type: 'featureNode' as const,
      position: node.position,
      data: {
        ...node,
        conceptColor: CONCEPT_COLORS[node.conceptIndex % CONCEPT_COLORS.length],
        groupColor: undefined, // No group colors in journey view
        onOpenDetail: isReadOnly ? undefined : handleOpenDetail,
        onDeleteNode: isReadOnly ? undefined : handleDeleteNode,
        onAddNodeAt: isReadOnly ? undefined : handleAddNodeAt,
      },
    }));

    // Edges
    const journeyPosMap = new Map(layoutNodes.map((n) => [n.id, n.position]));
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    const flowEdges: Edge[] = viewEdges
      .filter((e) => visibleIds.has(e.sourceNodeId) && visibleIds.has(e.targetNodeId))
      .map((edge) => {
        const handles = edge.sourceHandle && edge.targetHandle
          ? { sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle }
          : resolveHandles(
              journeyPosMap.get(edge.sourceNodeId) ?? { x: 0, y: 0 },
              journeyPosMap.get(edge.targetNodeId) ?? { x: 0, y: 0 },
            );
        return {
          id: edge.id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: 'journeyEdge' as const,
          animated: edge.flowType === 'primary',
          interactionWidth: 20,
          style: {
            stroke:
              edge.flowType === 'error'
                ? 'hsl(0 84% 60%)'
                : edge.flowType === 'secondary'
                ? 'var(--muted-foreground)'
                : 'var(--primary)',
            strokeWidth: edge.flowType === 'primary' ? 2.5 : 1.5,
          },
        };
      });

    return {
      rfNodes: [...headerRfNodes, ...featureRfNodes] as Node[],
      rfEdges: flowEdges,
    };
  }, [viewNodes, viewEdges, viewGroups, stages, isReadOnly, storeApi, activeView, showPeripherals, handleGroupEdit, handleGroupDelete, handleGroupHeaderClick, selectedGroupId, handleDeleteNode, handleOpenDetail, handleAddNodeAt]);

  // Maintain local node/edge state so ReactFlow can track selection (select changes)
  // while the store remains the source of truth for data.
  const [displayNodes, setDisplayNodes] = useState<Node[]>([]);
  const [displayEdges, setDisplayEdges] = useState<Edge[]>([]);
  useEffect(() => {
    setDisplayNodes(rfNodes);
  }, [rfNodes]);
  useEffect(() => {
    setDisplayEdges(rfEdges);
  }, [rfEdges]);

  // Fit viewport once when nodes first appear (e.g. after generation into a fresh mount)
  const { fitView } = useReactFlow();
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (hasFittedRef.current) return;
    const featureCount = rfNodes.filter((n) => n.type === 'featureNode').length;
    if (featureCount > 0) {
      hasFittedRef.current = true;
      setTimeout(() => fitView({ padding: 0.2 }), 200);
    }
  }, [rfNodes, fitView]);

  // Fit viewport on view switch
  const prevViewRef = useRef(activeView);
  useEffect(() => {
    if (prevViewRef.current !== activeView) {
      prevViewRef.current = activeView;
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [activeView, fitView]);

  // Track container positions for group-drag delta computation
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of rfNodes) {
      if (n.id.startsWith('group-container-')) {
        map.set(n.id, n.position);
      }
    }
    containerPositionsRef.current = map;
  }, [rfNodes]);

  // Handle node position changes (drag) — moveNode targets activeView via store
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setDisplayNodes((prev) => applyNodeChanges(changes, prev));

      if (isReadOnly) return;
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          if (change.id.startsWith('jm-node-')) {
            storeApi.getState().moveNode(change.id, change.position);
          } else if (change.id.startsWith('group-container-')) {
            // Group drag: move all child nodes by the same delta
            const groupId = change.id.replace('group-container-', '');
            const oldPos = containerPositionsRef.current.get(change.id);
            if (oldPos) {
              const dx = change.position.x - oldPos.x;
              const dy = change.position.y - oldPos.y;
              if (dx !== 0 || dy !== 0) {
                // Use view-resolved nodes for child detection
                const childNodes = viewNodes.filter((n) => n.groupId === groupId);
                for (const child of childNodes) {
                  storeApi.getState().moveNode(child.id, {
                    x: child.position.x + dx,
                    y: child.position.y + dy,
                  });
                }
                containerPositionsRef.current.set(change.id, change.position);
              }
            }
          }
        }
      }
    },
    [isReadOnly, storeApi, viewNodes]
  );

  // Handle node deletion via keyboard (Delete/Backspace)
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      if (isReadOnly) return;
      for (const node of deletedNodes) {
        if (node.id.startsWith('jm-node-')) {
          storeApi.getState().deleteNode(node.id);
        }
      }
      setDetailNodeId(null);
    },
    [isReadOnly, storeApi]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setDisplayEdges((prev) => applyEdgeChanges(changes, prev));

      if (isReadOnly) return;
      for (const change of changes) {
        if (change.type === 'remove') {
          storeApi.getState().deleteEdge(change.id);
        }
      }
    },
    [isReadOnly, storeApi]
  );

  // Manual edge creation via drag between handles
  const onConnect = useCallback(
    (connection: Connection) => {
      if (isReadOnly || !connection.source || !connection.target) return;
      if (!connection.source.startsWith('jm-node-') || !connection.target.startsWith('jm-node-')) return;

      const edgeId = `jm-edge-manual-${Date.now()}`;
      storeApi.getState().addEdge({
        id: edgeId,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        flowType: 'secondary',
      });
    },
    [isReadOnly, storeApi]
  );

  // Validate connections: no self-loops, only jm-node endpoints
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;
      if (!connection.source.startsWith('jm-node-') || !connection.target.startsWith('jm-node-')) return false;
      return true;
    },
    []
  );

  // ─── Edge reconnection ───

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      edgeReconnectSuccessful.current = true;
      if (!newConnection.source || !newConnection.target) return;
      storeApi.getState().deleteEdge(oldEdge.id);
      const edgeId = `jm-edge-reconnect-${Date.now()}`;
      storeApi.getState().addEdge({
        id: edgeId,
        sourceNodeId: newConnection.source,
        targetNodeId: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? undefined,
        targetHandle: newConnection.targetHandle ?? undefined,
        flowType: 'secondary',
      });
    },
    [storeApi]
  );

  const onReconnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        storeApi.getState().deleteEdge(edge.id);
      }
    },
    [storeApi]
  );

  // ─── Context menus ───

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (isReadOnly) return;
      if (!node.id.startsWith('jm-node-')) return;
      event.preventDefault();
      setContextMenu({ type: 'node', id: node.id, x: event.clientX, y: event.clientY });
    },
    [isReadOnly]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (isReadOnly) return;
      event.preventDefault();
      setContextMenu({ type: 'edge', id: edge.id, x: event.clientX, y: event.clientY });
    },
    [isReadOnly]
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectedGroupId(null);
  }, []);

  // Auto-tidy — only affects active view's positions
  const handleAutoTidy = useCallback(() => {
    const state = storeApi.getState();
    if (activeView === 'sitemap') {
      const effectiveGroups = state.sitemapView.groups.length > 0
        ? state.sitemapView.groups
        : [{ id: 'main', label: 'Main', description: 'All features' }];
      const viewNodes = getNodesForView(state, 'sitemap');
      const { positions } = computeSitemapPositions(viewNodes, effectiveGroups, state.sitemapView.edges);
      storeApi.getState().setViewPositions('sitemap', positions);
    } else {
      const viewNodes = getNodesForView(state, 'journey');
      const { positions } = computeJourneyMapPositions(viewNodes, state.stages);
      storeApi.getState().setViewPositions('journey', positions);
    }
    storeApi.getState().markDirty();
  }, [storeApi, activeView]);

  // Add feature
  const handleAddFeature = useCallback(() => {
    const state = storeApi.getState();
    const firstStage = state.stages[0];
    if (!firstStage) return;

    const id = `jm-node-${Date.now()}`;
    storeApi.getState().addNode({
      id,
      conceptIndex: 0,
      conceptName: 'New',
      featureName: 'New Feature',
      featureDescription: '',
      stageId: firstStage.id,
      stageName: firstStage.name,
      uiType: 'detail-view',
      uiPatternSuggestion: '',
      addressesPain: '',
      position: { x: 0, y: 400 },
      priority: 'should-have',
      nodeCategory: 'core',
      groupId: 'main',
    });
  }, [storeApi]);

  // Generate v0 prompt
  const handleGenerateV0Prompt = useCallback(async () => {
    const { buildJourneyAwareV0Prompt } = await import('@/lib/ai/prompts/journey-v0-prompt');
    const state = storeApi.getState();
    const prompt = buildJourneyAwareV0Prompt(state);
    setV0Prompt(prompt);
  }, [storeApi]);

  // Approve journey map
  const handleApprove = useCallback(async () => {
    storeApi.getState().setApproved(true);
    const state = storeApi.getState();
    await fetch('/api/build-pack/save-journey-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workshopId, state }),
    });
    storeApi.getState().markClean();
  }, [storeApi, workshopId]);

  // Create prototype
  const handleCreatePrototype = useCallback(async () => {
    const { buildJourneyAwareV0Prompt } = await import('@/lib/ai/prompts/journey-v0-prompt');
    const { buildV0SystemPrompt } = await import('@/lib/ai/prompts/prd-generation');
    const state = storeApi.getState();
    const prompt = buildJourneyAwareV0Prompt(state);

    const conceptNames = [...new Set(state.nodes.map((n) => n.conceptName))];
    const conceptLabel = conceptNames.join(' + ') || 'Product';
    const personaName = state.personaName || 'the target user';
    const sysPrompt = buildV0SystemPrompt(conceptLabel, personaName);

    const res = await fetch('/api/build-pack/save-journey-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workshopId, state, v0Prompt: prompt, v0SystemPrompt: sysPrompt }),
    });
    const data = await res.json();
    storeApi.getState().markClean();
    const bpId = data.buildPackId;
    if (bpId) {
      if (buildPackIdRef) buildPackIdRef.current = bpId;
      setPrototypeDialogData({
        prompt,
        systemPrompt: sysPrompt,
        conceptName: conceptLabel,
        buildPackId: bpId,
      });
      setShowPrototypeDialog(true);
    }
  }, [storeApi, workshopId, buildPackIdRef]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        className={cn(
          activeTool === 'hand' ? 'cursor-hand-tool' : 'cursor-pointer-tool'
        )}
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodesDelete={onNodesDelete}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        edgesFocusable={true}
        edgesReconnectable={!isReadOnly}
        nodesDraggable={activeTool !== 'hand'}
        elementsSelectable={activeTool !== 'hand'}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        isValidConnection={isValidConnection}
        nodesConnectable={!isReadOnly}
        onPaneClick={onPaneClick}
        panOnDrag={activeTool === 'hand'}
        panOnScroll={true}
        zoomOnScroll={false}
        selectionOnDrag={activeTool === 'pointer' && !isReadOnly}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={detailNodeId ? null : ['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <CanvasZoomControls />
        {activeView === 'journey' && <EmotionCurveOverlay stages={stages} />}
        <JourneyMapperToolbar
          sessionId={sessionId}
          isReadOnly={isReadOnly}
          isRegenerating={isRegenerating}
          isApproved={isApproved}
          strategicIntent={strategicIntent}
          viewMode={activeView}
          showPeripherals={showPeripherals}
          groupCount={viewGroups.length}
          onRegenerate={onRegenerate}
          onAutoTidy={handleAutoTidy}
          onGenerateV0Prompt={handleGenerateV0Prompt}
          onApprove={handleApprove}
          onCreatePrototype={handleCreatePrototype}
          onReset={onReset}
          isResetting={isResetting}
          onTogglePeripherals={() => setShowPeripherals((p) => !p)}
          onSetViewMode={handleSetViewMode}
          onManageGroups={isReadOnly || activeView !== 'sitemap' ? undefined : () => setShowGroupDialog(true)}
        />
      </ReactFlow>

      <JourneyCanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onAddScreen={handleAddFeature}
        isReadOnly={isReadOnly}
      />

      {/* Context menu overlay */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] min-w-[180px] rounded-md border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'node' && (
            <NodeContextMenuItems
              nodeId={contextMenu.id}
              groups={viewGroups}
              activeView={activeView}
              storeApi={storeApi}
              onClose={() => setContextMenu(null)}
              onCreateGroup={() => {
                setContextMenu(null);
                setShowGroupDialog(true);
              }}
            />
          )}
          {contextMenu.type === 'edge' && (
            <EdgeContextMenuItems
              edgeId={contextMenu.id}
              activeView={activeView}
              storeApi={storeApi}
              onClose={() => setContextMenu(null)}
            />
          )}
        </div>
      )}

      {v0Prompt && (
        <V0PromptPanel
          prompt={v0Prompt}
          buildPackId={v0BuildPackId}
          workshopId={workshopId}
          onClose={() => {
            setV0Prompt(null);
            setV0BuildPackId(null);
          }}
        />
      )}

      <PrdViewerDialog
        open={showPrototypeDialog}
        onOpenChange={(open) => {
          setShowPrototypeDialog(open);
          if (!open) setPrototypeDialogData(undefined);
        }}
        workshopId={workshopId}
        initialData={prototypeDialogData}
        onV0Started={() => {
          setShowPrototypeDialog(false);
          setPrototypeDialogData(undefined);
          router.push(`/workshop/${sessionId}/step/validate?v0=creating`);
        }}
      />

      <GroupManagementDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        editingGroupId={editingGroupId}
        onEditingGroupIdChange={setEditingGroupId}
      />

      <JourneyNodeDetailDialog
        open={!!detailNodeId}
        onOpenChange={(open) => { if (!open) handleCloseDetail(); }}
        node={detailNodeId ? masterNodes.find((n) => n.id === detailNodeId) ?? null : null}
        onFieldChange={isReadOnly ? undefined : handleFieldChange}
        onDeleteNode={isReadOnly ? undefined : handleDeleteNode}
      />

      <AlertDialog open={!!pendingDeleteGroupId} onOpenChange={(open) => { if (!open) setPendingDeleteGroupId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (!pendingDeleteGroupId) return '';
                const group = viewGroups.find((g) => g.id === pendingDeleteGroupId);
                const count = masterNodes.filter((n) => n.groupId === pendingDeleteGroupId).length;
                return `Delete group "${group?.label}"? ${count} node${count !== 1 ? 's' : ''} will become ungrouped.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmGroupDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Context Menu Components ───

function NodeContextMenuItems({
  nodeId,
  groups,
  activeView,
  storeApi,
  onClose,
  onCreateGroup,
}: {
  nodeId: string;
  groups: NavigationGroup[];
  activeView: 'journey' | 'sitemap';
  storeApi: ReturnType<typeof useJourneyMapperStoreApi>;
  onClose: () => void;
  onCreateGroup: () => void;
}) {
  const node = storeApi.getState().nodes.find((n) => n.id === nodeId);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const isJourneyView = activeView === 'journey';

  return (
    <>
      {/* Move to Group — sitemap view only */}
      {!isJourneyView && (
        <div className="relative">
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-default"
            onMouseEnter={() => setShowMoveSubmenu(true)}
            onMouseLeave={() => setShowMoveSubmenu(false)}
          >
            Move to Group
            <span className="ml-auto text-xs text-muted-foreground">&#9656;</span>
          </button>
          {showMoveSubmenu && (
            <div
              className="absolute left-full top-0 ml-1 min-w-[160px] rounded-md border bg-popover p-1 shadow-md z-10"
              onMouseEnter={() => setShowMoveSubmenu(true)}
              onMouseLeave={() => setShowMoveSubmenu(false)}
            >
              {groups.map((g) => (
                <button
                  key={g.id}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    storeApi.getState().moveNodeToGroup(nodeId, g.id);
                    onClose();
                  }}
                >
                  {g.label}
                  {node?.groupId === g.id && <span className="ml-auto text-xs text-primary">&#10003;</span>}
                </button>
              ))}
              <div className="h-px bg-border my-1" />
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground"
                onClick={() => {
                  storeApi.getState().moveNodeToGroup(nodeId, undefined);
                  onClose();
                }}
              >
                No Group
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-primary"
                onClick={onCreateGroup}
              >
                + Create New Group...
              </button>
            </div>
          )}
        </div>
      )}

      {/* Priority */}
      <div className="h-px bg-border my-1" />
      {(['must-have', 'should-have', 'nice-to-have'] as const).map((p) => (
        <button
          key={p}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          onClick={() => {
            storeApi.getState().updateNode(nodeId, { priority: p });
            onClose();
          }}
        >
          <span className={`w-2 h-2 rounded-full ${
            p === 'must-have' ? 'bg-red-500' : p === 'should-have' ? 'bg-amber-500' : 'bg-blue-400'
          }`} />
          {p === 'must-have' ? 'Must Have' : p === 'should-have' ? 'Should Have' : 'Nice to Have'}
          {node?.priority === p && <span className="ml-auto text-xs text-primary">&#10003;</span>}
        </button>
      ))}

      {/* Delete — view-aware label */}
      <div className="h-px bg-border my-1" />
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-destructive/10 text-destructive"
        onClick={() => {
          storeApi.getState().deleteNode(nodeId);
          onClose();
        }}
      >
        {isJourneyView ? 'Remove from Journey' : 'Delete Feature (permanent)'}
      </button>
    </>
  );
}

function EdgeContextMenuItems({
  edgeId,
  activeView,
  storeApi,
  onClose,
}: {
  edgeId: string;
  activeView: 'journey' | 'sitemap';
  storeApi: ReturnType<typeof useJourneyMapperStoreApi>;
  onClose: () => void;
}) {
  // Find edge in the active view's edges
  const viewState = activeView === 'journey'
    ? storeApi.getState().journeyView
    : storeApi.getState().sitemapView;
  const edge = viewState.edges.find((e) => e.id === edgeId);

  return (
    <>
      {/* Flow type */}
      {(['primary', 'secondary', 'error'] as const).map((ft) => (
        <button
          key={ft}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          onClick={() => {
            storeApi.getState().updateEdge(edgeId, { flowType: ft });
            onClose();
          }}
        >
          <span className={`w-2 h-0.5 ${
            ft === 'primary' ? 'bg-primary' : ft === 'error' ? 'bg-red-500' : 'bg-muted-foreground'
          }`} style={{ display: 'inline-block', width: 12 }} />
          {ft.charAt(0).toUpperCase() + ft.slice(1)} Flow
          {edge?.flowType === ft && <span className="ml-auto text-xs text-primary">&#10003;</span>}
        </button>
      ))}

      {/* Delete */}
      <div className="h-px bg-border my-1" />
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-destructive/10 text-destructive"
        onClick={() => {
          storeApi.getState().deleteEdge(edgeId);
          onClose();
        }}
      >
        Delete Connection
      </button>
    </>
  );
}

export function UXJourneyMapper(props: UXJourneyMapperProps) {
  return (
    <ReactFlowProvider>
      <JourneyMapperInner {...props} />
    </ReactFlowProvider>
  );
}

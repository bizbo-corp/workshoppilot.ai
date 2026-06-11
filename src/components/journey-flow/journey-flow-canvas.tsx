'use client';

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
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
import { toast } from 'sonner';

import {
  useJourneyFlowStore,
  useJourneyFlowStoreApi,
} from '@/providers/journey-flow-store-provider';
import { JourneyFlowNodeCard } from './journey-flow-node-card';
import { JourneyFlowEdge as JourneyFlowEdgeComponent } from './journey-flow-edge';
import { JourneyFlowNodeDetail } from './journey-flow-node-detail';
import { JourneyFlowToolbar, JourneyFlowCanvasToolbar } from './journey-flow-toolbar';
import { CanvasZoomControls } from '@/components/canvas/canvas-zoom-controls';
// Type-only import for the data interface (avoids name collision with the component above)
import type { JourneyFlowNode } from '@/lib/journey-flow/types';

// ---------------------------------------------------------------------------
// Module-level registrations — must be OUTSIDE the component to avoid
// ReactFlow re-registration warnings on every render.
// ---------------------------------------------------------------------------

const nodeTypes = { screenCard: JourneyFlowNodeCard };
const edgeTypes = { flowEdge: JourneyFlowEdgeComponent };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_W = 260;
const NODE_H = 100;

const ADD_OFFSETS: Record<'top' | 'right' | 'bottom' | 'left', { x: number; y: number }> = {
  top: { x: 0, y: -200 },
  bottom: { x: 0, y: 200 },
  left: { x: -300, y: 0 },
  right: { x: 300, y: 0 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public props / wrapper
// ---------------------------------------------------------------------------

export interface JourneyFlowCanvasProps {
  workshopId: string;
  sessionId: string;
  isReadOnly?: boolean;
  /** Callback from content layer to trigger regeneration confirmation. */
  onRegenerate?: () => void;
  /** When true, the Regenerate button shows a spinner and is disabled. */
  isGenerating?: boolean;
  /** When set, renders a small archetype badge in the toolbar. */
  archetype?: import('@/lib/journey-flow/types').FlowArchetype;
  /** Navigation context forwarded from the inbound ?from= query param. */
  from?: string;
}

/**
 * Public export — wraps inner canvas in ReactFlowProvider so useReactFlow
 * works inside. (useReactFlow must live under ReactFlowProvider.)
 */
export function JourneyFlowCanvas(props: JourneyFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <JourneyFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

// ---------------------------------------------------------------------------
// Inner canvas (has access to useReactFlow)
// ---------------------------------------------------------------------------

function JourneyFlowCanvasInner({
  workshopId,
  sessionId,
  isReadOnly = false,
  onRegenerate,
  isGenerating,
  archetype: archetypeProp,
  from,
}: JourneyFlowCanvasProps) {
  const storeApi = useJourneyFlowStoreApi();
  const nodes = useJourneyFlowStore((s) => s.nodes);
  const edges = useJourneyFlowStore((s) => s.edges);
  const isApproved = useJourneyFlowStore((s) => s.isApproved);
  const flowArchetype = useJourneyFlowStore((s) => s.flowArchetype);
  // Prefer the live store value; fall back to the prop passed from the content layer
  const archetype = flowArchetype ?? archetypeProp;

  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'pointer' | 'hand'>('pointer');
  const [isApproving, setIsApproving] = useState(false);

  const edgeReconnectSuccessful = useRef(true);
  const hasFittedRef = useRef(false);
  const { fitView } = useReactFlow();

  // ---------------------------------------------------------------------------
  // Callbacks declared early so they can be referenced in rfNodes useMemo
  // ---------------------------------------------------------------------------

  const handleOpenDetail = useCallback((id: string) => {
    setDetailNodeId(id);
  }, []);

  const handleAddNodeAt = useCallback(
    (parentId: string, direction: 'top' | 'right' | 'bottom' | 'left') => {
      if (isReadOnly) return;
      const parent = storeApi.getState().nodes.find((n: JourneyFlowNode) => n.id === parentId);
      if (!parent) return;

      const offset = ADD_OFFSETS[direction];
      const position = {
        x: parent.position.x + offset.x,
        y: parent.position.y + offset.y,
      };
      const id = `jf-node-${Date.now()}`;

      storeApi.getState().addNode({
        id,
        name: 'New Screen',
        uiType: 'detail-view',
        purpose: '',
        keyElements: [],
        priority: 'should-have',
        position,
      });

      const handles = resolveHandles(parent.position, position);
      storeApi.getState().addEdge({
        id: `jf-edge-${Date.now()}`,
        sourceNodeId: parentId,
        targetNodeId: id,
        ...handles,
      });

      // Open detail dialog so user can name the new node immediately
      setDetailNodeId(id);
    },
    [isReadOnly, storeApi],
  );

  // ---------------------------------------------------------------------------
  // rfNodes / rfEdges — derive ReactFlow node/edge shapes from store state
  // ---------------------------------------------------------------------------

  const { rfNodes, rfEdges } = useMemo(
    () => ({
      rfNodes: nodes.map(
        (n: JourneyFlowNode): Node => ({
          id: n.id,
          type: 'screenCard',
          position: n.position,
          data: {
            ...n,
            onOpenDetail: handleOpenDetail,
            onAddNodeAt: isReadOnly ? undefined : handleAddNodeAt,
          },
          draggable: !isReadOnly,
        }),
      ),
      rfEdges: edges.map(
        (e): Edge => ({
          id: e.id,
          type: 'flowEdge',
          source: e.sourceNodeId,
          target: e.targetNodeId,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        }),
      ),
    }),
    [nodes, edges, isReadOnly, handleOpenDetail, handleAddNodeAt],
  );

  // ---------------------------------------------------------------------------
  // Display mirror (ReactFlow tracks selection locally; store stays source of truth)
  // ---------------------------------------------------------------------------

  const [displayNodes, setDisplayNodes] = useState<Node[]>([]);
  const [displayEdges, setDisplayEdges] = useState<Edge[]>([]);

  useEffect(() => {
    setDisplayNodes(rfNodes);
  }, [rfNodes]);

  useEffect(() => {
    setDisplayEdges(rfEdges);
  }, [rfEdges]);

  // ---------------------------------------------------------------------------
  // One-time fitView when nodes first appear
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (hasFittedRef.current || rfNodes.length === 0) return;
    hasFittedRef.current = true;
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 200);
  }, [rfNodes, fitView]);

  // ---------------------------------------------------------------------------
  // Node/edge change handlers (anti-snap-back: applyNodeChanges first)
  // ---------------------------------------------------------------------------

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setDisplayNodes((prev) => applyNodeChanges(changes, prev));
      if (isReadOnly) return;
      for (const change of changes) {
        if (
          change.type === 'position' &&
          change.position &&
          change.id.startsWith('jf-node-')
        ) {
          storeApi.getState().moveNode(change.id, change.position);
        }
      }
    },
    [isReadOnly, storeApi],
  );

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
    [isReadOnly, storeApi],
  );

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      if (isReadOnly) return;
      for (const node of deletedNodes) {
        if (node.id.startsWith('jf-node-')) {
          storeApi.getState().deleteNode(node.id);
        }
      }
      setDetailNodeId(null);
    },
    [isReadOnly, storeApi],
  );

  // ---------------------------------------------------------------------------
  // Connect — no out-degree limit, forks work by default
  // ---------------------------------------------------------------------------

  const onConnect = useCallback(
    (connection: Connection) => {
      if (isReadOnly || !connection.source || !connection.target) return;
      if (
        !connection.source.startsWith('jf-node-') ||
        !connection.target.startsWith('jf-node-')
      ) {
        return;
      }
      storeApi.getState().addEdge({
        id: `jf-edge-manual-${Date.now()}`,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      });
    },
    [isReadOnly, storeApi],
  );

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;
    return (
      connection.source.startsWith('jf-node-') &&
      connection.target.startsWith('jf-node-')
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Reconnect trio (ref guards against accidental deletion on missed drops)
  // ---------------------------------------------------------------------------

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      edgeReconnectSuccessful.current = true;
      if (!newConnection.source || !newConnection.target) return;
      storeApi.getState().deleteEdge(oldEdge.id);
      storeApi.getState().addEdge({
        id: `jf-edge-reconnect-${Date.now()}`,
        sourceNodeId: newConnection.source,
        targetNodeId: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? undefined,
        targetHandle: newConnection.targetHandle ?? undefined,
      });
    },
    [storeApi],
  );

  const onReconnectEnd = useCallback(
    (_e: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        storeApi.getState().deleteEdge(edge.id);
      }
    },
    [storeApi],
  );

  // ---------------------------------------------------------------------------
  // handleAddScreen — unconnected node from bottom toolbar
  // ---------------------------------------------------------------------------

  const handleAddScreen = useCallback(() => {
    if (isReadOnly) return;
    const currentNodes = storeApi.getState().nodes;
    let position: { x: number; y: number };

    if (currentNodes.length > 0) {
      const maxX = Math.max(...currentNodes.map((n: JourneyFlowNode) => n.position.x));
      const refNode = currentNodes.find((n: JourneyFlowNode) => n.position.x === maxX);
      position = { x: maxX + 300, y: refNode?.position.y ?? 100 };
    } else {
      position = { x: 100, y: 100 };
    }

    const id = `jf-node-${Date.now()}`;
    storeApi.getState().addNode({
      id,
      name: 'New Screen',
      uiType: 'detail-view',
      purpose: '',
      keyElements: [],
      priority: 'should-have',
      position,
    });
    setDetailNodeId(id);
  }, [isReadOnly, storeApi]);

  // ---------------------------------------------------------------------------
  // handleApprove — set approved, POST to save route, mark clean
  // ---------------------------------------------------------------------------

  const handleApprove = useCallback(async () => {
    if (isApproving) return;
    setIsApproving(true);
    try {
      storeApi.getState().setApproved(true);
      const state = storeApi.getState();
      const res = await fetch('/api/build-pack/save-journey-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, state }),
      });
      if (!res.ok) {
        throw new Error(`Save failed: ${res.status}`);
      }
      storeApi.getState().markClean();
      toast.success('Journey flow marked complete');
    } catch (err) {
      console.error('[JourneyFlowCanvas] handleApprove error:', err);
      storeApi.getState().setApproved(false);
      toast.error('Failed to save approval');
    } finally {
      setIsApproving(false);
    }
  }, [isApproving, storeApi, workshopId]);

  // ---------------------------------------------------------------------------
  // Detail dialog
  // ---------------------------------------------------------------------------

  const detailNode = nodes.find((n: JourneyFlowNode) => n.id === detailNodeId) ?? null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        edgesFocusable
        edgesReconnectable={!isReadOnly}
        nodesDraggable={activeTool !== 'hand'}
        elementsSelectable={activeTool !== 'hand'}
        nodesConnectable={!isReadOnly}
        panOnDrag={activeTool === 'hand'}
        panOnScroll
        zoomOnScroll={false}
        selectionOnDrag={activeTool === 'pointer' && !isReadOnly}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        // CRITICAL: null while detail dialog is open — otherwise Backspace in
        // an input deletes the currently-selected node
        deleteKeyCode={detailNodeId ? null : ['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <CanvasZoomControls />
        <JourneyFlowToolbar
          sessionId={sessionId}
          isReadOnly={isReadOnly}
          isApproved={isApproved}
          isApproving={isApproving}
          onApprove={handleApprove}
          onRegenerate={onRegenerate}
          isGenerating={isGenerating}
          archetype={archetype}
          from={from}
        />
      </ReactFlow>

      {/* Canvas toolbar sits outside ReactFlow so it's not affected by zoom/pan */}
      <JourneyFlowCanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onAddScreen={handleAddScreen}
        isReadOnly={isReadOnly}
      />

      {/* Detail dialog */}
      <JourneyFlowNodeDetail
        open={!!detailNodeId}
        onOpenChange={(open) => {
          if (!open) setDetailNodeId(null);
        }}
        node={detailNode}
        isReadOnly={isReadOnly}
        onFieldChange={(id, updates) => storeApi.getState().updateNode(id, updates)}
        onDeleteNode={(id) => {
          storeApi.getState().deleteNode(id);
          setDetailNodeId(null);
        }}
      />
    </div>
  );
}

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
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sparkles, Loader2, Plus, Undo2, Redo2 } from 'lucide-react';

import { MindMapNode } from '@/components/canvas/mind-map-node';
import { MindMapEdge } from '@/components/canvas/mind-map-edge';
import {
  Crazy8sGroupNode,
  CRAZY_8S_NODE_ID,
  CRAZY_8S_NODE_HEIGHT,
} from '@/components/canvas/crazy-8s-group-node';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import {
  THEME_COLORS,
  ROOT_COLOR,
  type ThemeColor,
} from '@/lib/canvas/mind-map-theme-colors';
import type {
  MindMapNodeState,
  MindMapEdgeState,
} from '@/stores/canvas-store';
import { Button } from '@/components/ui/button';

// Define node and edge types outside component to prevent re-renders
const nodeTypes = {
  mindMapNode: MindMapNode,
  crazy8sGroupNode: Crazy8sGroupNode,
};
const edgeTypes = { mindMapEdge: MindMapEdge };

// Snap grid size for drag-end positions
const SNAP_GRID = 20;
function snapToGrid(val: number): number {
  return Math.round(val / SNAP_GRID) * SNAP_GRID;
}

export type MindMapCanvasProps = {
  workshopId: string;
  stepId: string;
  hmwStatement?: string;
  showCrazy8s?: boolean;
  onSaveCrazy8s?: () => Promise<void>;
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
  showCrazy8s,
  onSaveCrazy8s,
}: MindMapCanvasProps) {
  const mindMapNodes = useCanvasStore((state) => state.mindMapNodes);
  const mindMapEdges = useCanvasStore((state) => state.mindMapEdges);
  const addMindMapNode = useCanvasStore((state) => state.addMindMapNode);
  const updateMindMapNode = useCanvasStore((state) => state.updateMindMapNode);
  const updateMindMapNodePosition = useCanvasStore((state) => state.updateMindMapNodePosition);
  const deleteMindMapNode = useCanvasStore((state) => state.deleteMindMapNode);
  const setMindMapState = useCanvasStore((state) => state.setMindMapState);

  const { fitView } = useReactFlow();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const storeApi = useCanvasStoreApi();

  // Undo/redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Live positions ref — prevents flicker during drag (same pattern as react-flow-canvas.tsx)
  const livePositions = useRef<Record<string, { x: number; y: number }>>({});

  // Initialize with root node if empty
  useEffect(() => {
    if (mindMapNodes.length === 0) {
      const rootNode: MindMapNodeState = {
        id: 'root',
        label: hmwStatement || 'How might we...?',
        themeColorId: 'gray',
        themeColor: ROOT_COLOR.color,
        themeBgColor: ROOT_COLOR.bgColor,
        isRoot: true,
        level: 0,
        position: { x: 0, y: 0 },
      };
      setMindMapState([rootNode], []);
    }
  }, [mindMapNodes.length, hmwStatement, setMindMapState]);

  // Update root node label when hmwStatement arrives later
  useEffect(() => {
    if (hmwStatement && mindMapNodes.length > 0) {
      const rootNode = mindMapNodes.find((n) => n.isRoot);
      if (rootNode && rootNode.label === 'How might we...?') {
        updateMindMapNode('root', { label: hmwStatement });
      }
    }
  }, [hmwStatement, mindMapNodes, updateMindMapNode]);

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
      if (parentNode.isRoot) {
        const existingLevel1Nodes = mindMapNodes.filter((n) => n.level === 1);
        const colorIndex = existingLevel1Nodes.length % THEME_COLORS.length;
        themeColor = THEME_COLORS[colorIndex];
      } else {
        const inheritedColor = THEME_COLORS.find(
          (c) => c.id === parentNode.themeColorId
        );
        themeColor = inheritedColor || ROOT_COLOR;
      }

      // Compute radial offset from parent
      const parentPos = livePositions.current[parentId] || parentNode.position || { x: 0, y: 0 };
      const siblingCount = mindMapEdges.filter((e) => e.source === parentId).length;
      const CHILD_DISTANCE = 250;

      // If parent is root, spread around evenly; otherwise, fan out from parent's direction
      let childX: number;
      let childY: number;

      if (parentNode.isRoot) {
        const totalChildren = siblingCount + 1;
        const childAngle = (2 * Math.PI * siblingCount) / totalChildren - Math.PI / 2;
        childX = snapToGrid(parentPos.x + CHILD_DISTANCE * Math.cos(childAngle));
        childY = snapToGrid(parentPos.y + CHILD_DISTANCE * Math.sin(childAngle));
      } else {
        // Direction from root to parent
        const rootNode = mindMapNodes.find((n) => n.isRoot);
        const rootPos = rootNode?.position || { x: 0, y: 0 };
        const dirAngle = Math.atan2(parentPos.y - rootPos.y, parentPos.x - rootPos.x);
        // Fan children around that direction
        const spread = Math.PI / 3;
        const startAngle = dirAngle - spread / 2;
        const angleStep = siblingCount > 0 ? spread / siblingCount : 0;
        const childAngle = siblingCount === 0 ? dirAngle : startAngle + angleStep * siblingCount;
        childX = snapToGrid(parentPos.x + CHILD_DISTANCE * Math.cos(childAngle));
        childY = snapToGrid(parentPos.y + CHILD_DISTANCE * Math.sin(childAngle));
      }

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
        position: { x: childX, y: childY },
      };

      const newEdge: MindMapEdgeState = {
        id: `${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        themeColor: themeColor.color,
      };

      addMindMapNode(newNode, newEdge);
    },
    [mindMapNodes, mindMapEdges, addMindMapNode]
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

  // Convert store state to ReactFlow mind map nodes
  const rfMindMapNodes: Node[] = useMemo(() => {
    return mindMapNodes.map((nodeState) => ({
      id: nodeState.id,
      type: 'mindMapNode',
      position: livePositions.current[nodeState.id] || nodeState.position || { x: 0, y: 0 },
      draggable: true,
      data: {
        label: nodeState.label,
        themeColorId: nodeState.themeColorId,
        themeColor: nodeState.themeColor,
        themeBgColor: nodeState.themeBgColor,
        isRoot: nodeState.isRoot,
        level: nodeState.level,
        onLabelChange: handleLabelChange,
        onAddChild: handleAddChild,
        onDelete: handleDelete,
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- livePositions is a ref
  }, [mindMapNodes, handleLabelChange, handleAddChild, handleDelete]);

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
      data: { workshopId, stepId, onSave: onSaveCrazy8s },
    };
  }, [showCrazy8s, workshopId, stepId, onSaveCrazy8s]);

  // Combined nodes array: mind map + optional crazy 8s
  const rfNodes = useMemo(() => {
    return crazy8sNode ? [...rfMindMapNodes, crazy8sNode] : rfMindMapNodes;
  }, [rfMindMapNodes, crazy8sNode]);

  // Convert store state to ReactFlow edges
  const rfEdges: Edge[] = useMemo(() => {
    return mindMapEdges.map((edgeState) => ({
      id: edgeState.id,
      source: edgeState.source,
      target: edgeState.target,
      type: 'mindMapEdge',
      data: {
        themeColor: edgeState.themeColor,
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

  // Handle node changes (drag, selection)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Update live positions ref during drag for flicker-free rendering
      for (const c of changes) {
        if (c.type === 'position') {
          const posChange = c as NodeChange & { id: string; position?: { x: number; y: number }; dragging?: boolean };
          // Skip the crazy 8s group node
          if (posChange.id === CRAZY_8S_NODE_ID) continue;
          if (posChange.dragging && posChange.position) {
            livePositions.current[posChange.id] = posChange.position;
          } else if (posChange.dragging === false) {
            // Drag ended — snap to grid and persist to store
            const finalPos = posChange.position || livePositions.current[posChange.id];
            if (finalPos) {
              const snapped = {
                x: snapToGrid(finalPos.x),
                y: snapToGrid(finalPos.y),
              };
              updateMindMapNodePosition(posChange.id, snapped);
            }
            delete livePositions.current[posChange.id];
          }
        }
      }

      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [updateMindMapNodePosition]
  );

  // Callback: AI theme suggestion
  const handleSuggestThemes = useCallback(async () => {
    setIsSuggesting(true);
    setSuggestionError(null);

    try {
      const rootNode = mindMapNodes.find((n) => n.isRoot);
      if (!rootNode) {
        setSuggestionError('No root node found');
        return;
      }

      const existingThemes = mindMapNodes
        .filter((n) => n.level === 1)
        .map((n) => n.label)
        .filter(Boolean);

      const response = await fetch('/api/ai/suggest-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          hmwStatement: rootNode.label,
          existingThemes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate theme suggestions');
      }

      const data = await response.json();
      const themes: string[] = data.themes || [];

      if (themes.length === 0) {
        setSuggestionError('No themes generated');
        return;
      }

      // Place themes radially around root at 350px radius
      const rootPos = rootNode.position || { x: 0, y: 0 };
      const existingLevel1Count = mindMapNodes.filter((n) => n.level === 1).length;
      const totalAfter = existingLevel1Count + themes.length;

      themes.forEach((themeLabel, index) => {
        const colorIndex = (existingLevel1Count + index) % THEME_COLORS.length;
        const themeColor = THEME_COLORS[colorIndex];

        // Spread all themes (existing + new) evenly; place new ones at the end
        const angle = (2 * Math.PI * (existingLevel1Count + index)) / totalAfter - Math.PI / 2;
        const RADIUS = 350;

        const newNodeId = crypto.randomUUID();
        const newNode: MindMapNodeState = {
          id: newNodeId,
          label: themeLabel,
          themeColorId: themeColor.id,
          themeColor: themeColor.color,
          themeBgColor: themeColor.bgColor,
          isRoot: false,
          level: 1,
          parentId: 'root',
          position: {
            x: snapToGrid(rootPos.x + RADIUS * Math.cos(angle)),
            y: snapToGrid(rootPos.y + RADIUS * Math.sin(angle)),
          },
        };

        const newEdge: MindMapEdgeState = {
          id: `root-${newNodeId}`,
          source: 'root',
          target: newNodeId,
          themeColor: themeColor.color,
        };

        addMindMapNode(newNode, newEdge);
      });

      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
    } catch (error) {
      console.error('Theme suggestion error:', error);
      setSuggestionError('Failed to generate themes. Please try again.');
    } finally {
      setIsSuggesting(false);
    }
  }, [mindMapNodes, workshopId, addMindMapNode, fitView]);

  // Undo/redo handlers
  const handleUndo = useCallback(() => {
    const temporalStore = storeApi.temporal;
    const pastStates = temporalStore.getState().pastStates;
    if (pastStates.length > 0) {
      temporalStore.getState().undo();
    }
  }, [storeApi]);

  const handleRedo = useCallback(() => {
    const temporalStore = storeApi.temporal;
    const futureStates = temporalStore.getState().futureStates;
    if (futureStates.length > 0) {
      temporalStore.getState().redo();
    }
  }, [storeApi]);

  // Subscribe to temporal store for undo/redo state
  useEffect(() => {
    const temporalStore = storeApi.temporal;
    const unsubscribe = temporalStore.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });
    return unsubscribe;
  }, [storeApi]);

  // Add a node (level 1 child of root) with radial placement
  const handleAddNode = useCallback(() => {
    const existingLevel1Nodes = mindMapNodes.filter((n) => n.level === 1);
    const colorIndex = existingLevel1Nodes.length % THEME_COLORS.length;
    const themeColor = THEME_COLORS[colorIndex];

    const rootNode = mindMapNodes.find((n) => n.isRoot);
    const rootPos = rootNode?.position || { x: 0, y: 0 };
    const totalChildren = existingLevel1Nodes.length + 1;
    const angle = (2 * Math.PI * existingLevel1Nodes.length) / totalChildren - Math.PI / 2;
    const RADIUS = 350;

    const newNodeId = crypto.randomUUID();
    const newNode: MindMapNodeState = {
      id: newNodeId,
      label: '',
      themeColorId: themeColor.id,
      themeColor: themeColor.color,
      themeBgColor: themeColor.bgColor,
      isRoot: false,
      level: 1,
      parentId: 'root',
      position: {
        x: snapToGrid(rootPos.x + RADIUS * Math.cos(angle)),
        y: snapToGrid(rootPos.y + RADIUS * Math.sin(angle)),
      },
    };

    const newEdge: MindMapEdgeState = {
      id: `root-${newNodeId}`,
      source: 'root',
      target: newNodeId,
      themeColor: themeColor.color,
    };

    addMindMapNode(newNode, newEdge);
    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
  }, [mindMapNodes, addMindMapNode, fitView]);

  // Check if button should be visible (< 6 level-1 branches)
  const level1Count = mindMapNodes.filter((n) => n.level === 1).length;
  const showSuggestButton = level1Count < 6;

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        edgesFocusable={false}
        selectNodesOnDrag={false}
        snapToGrid={true}
        snapGrid={[SNAP_GRID, SNAP_GRID]}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.id === CRAZY_8S_NODE_ID) return '#f59e0b';
            const color = n.data?.themeColor;
            return typeof color === 'string' ? color : '#6b7280';
          }}
          nodeColor={(n) => {
            if (n.id === CRAZY_8S_NODE_ID) return '#fef3c7';
            const bgColor = n.data?.themeBgColor;
            return typeof bgColor === 'string' ? bgColor : '#f3f4f6';
          }}
          maskColor="rgba(0,0,0,0.1)"
        />

        {/* Bottom toolbar */}
        <Panel position="bottom-center" className="!mb-4">
          <div className="flex items-center gap-2 rounded-lg border bg-background p-1.5 shadow-md">
            <Button
              onClick={handleAddNode}
              size="sm"
              variant="ghost"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Node
            </Button>
            {showSuggestButton && (
              <Button
                onClick={handleSuggestThemes}
                disabled={isSuggesting}
                size="sm"
                variant="ghost"
                className="gap-1.5"
              >
                {isSuggesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isSuggesting ? 'Generating...' : 'Suggest Themes'}
              </Button>
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
          {suggestionError && (
            <p className="mt-1 text-center text-xs text-destructive">{suggestionError}</p>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}

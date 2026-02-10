'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type NodeChange,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { PostItNode, type PostItNodeData } from './post-it-node';
import { CanvasToolbar } from './canvas-toolbar';
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave';

// Define node types OUTSIDE component for stable reference
const nodeTypes = { postIt: PostItNode };

export interface ReactFlowCanvasProps {
  sessionId: string;
  stepId: string;
  workshopId: string;
}

function ReactFlowCanvasInner({ sessionId, stepId, workshopId }: ReactFlowCanvasProps) {
  // Store access
  const postIts = useCanvasStore((s) => s.postIts);
  const addPostIt = useCanvasStore((s) => s.addPostIt);
  const updatePostIt = useCanvasStore((s) => s.updatePostIt);

  // Auto-save integration
  const { saveStatus } = useCanvasAutosave(workshopId, stepId);

  // Editing state - track which node is being edited
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // ReactFlow hooks
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Track if we've done initial fitView
  const hasFitView = useRef(false);

  // Double-click detection for pane
  const lastPaneClickTime = useRef(0);
  const DOUBLE_CLICK_THRESHOLD = 300; // ms

  // Track when we want to edit the most recently created post-it
  const shouldEditLatest = useRef(false);
  const previousPostItCount = useRef(postIts.length);

  // Grid snap size (matches dot grid)
  const GRID_SIZE = 20;

  // Snap position to grid
  const snapToGrid = useCallback(
    (position: { x: number; y: number }) => ({
      x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
    }),
    []
  );

  // Handle editing the most recently created post-it
  useEffect(() => {
    if (shouldEditLatest.current && postIts.length > previousPostItCount.current) {
      // A new post-it was added - edit it
      const latestPostIt = postIts[postIts.length - 1];
      setEditingNodeId(latestPostIt.id);
      shouldEditLatest.current = false;
    }
    previousPostItCount.current = postIts.length;
  }, [postIts]);

  // Handle text change from PostItNode textarea
  const handleTextChange = useCallback(
    (id: string, text: string) => {
      updatePostIt(id, { text });
    },
    [updatePostIt]
  );

  // Handle edit complete (textarea blur)
  const handleEditComplete = useCallback((id: string) => {
    setEditingNodeId(null);
  }, []);

  // Convert store post-its to ReactFlow nodes
  const nodes = useMemo<Node[]>(() => {
    return postIts.map((postIt) => ({
      id: postIt.id,
      type: 'postIt',
      position: postIt.position,
      data: {
        text: postIt.text,
        color: postIt.color || 'yellow',
        isEditing: editingNodeId === postIt.id,
        onTextChange: handleTextChange,
        onEditComplete: handleEditComplete,
      } as PostItNodeData,
      style: { width: postIt.width, height: 'auto' },
    }));
  }, [postIts, editingNodeId, handleTextChange, handleEditComplete]);

  // Create post-it at position and set as editing
  const createPostItAtPosition = useCallback(
    (clientX: number, clientY: number) => {
      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });
      const snappedPosition = snapToGrid(flowPosition);

      shouldEditLatest.current = true;
      addPostIt({
        text: '',
        position: snappedPosition,
        width: 120,
        height: 120,
      });
    },
    [screenToFlowPosition, snapToGrid, addPostIt]
  );

  // Handle toolbar "+" creation (dealing-cards offset)
  const handleToolbarAdd = useCallback(() => {
    let position: { x: number; y: number };

    if (postIts.length > 0) {
      // Offset from last post-it (dealing-cards pattern)
      const lastPostIt = postIts[postIts.length - 1];
      position = {
        x: lastPostIt.position.x + 30,
        y: lastPostIt.position.y + 30,
      };
    } else {
      // Place at center of viewport
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      position = center;
    }

    const snappedPosition = snapToGrid(position);

    shouldEditLatest.current = true;
    addPostIt({
      text: '',
      position: snappedPosition,
      width: 120,
      height: 120,
    });
  }, [postIts, screenToFlowPosition, snapToGrid, addPostIt]);

  // Handle node drag
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply changes to maintain ReactFlow's internal state
      const updatedNodes = applyNodeChanges(changes, nodes);

      // Update store when drag completes
      changes.forEach((change) => {
        if (
          change.type === 'position' &&
          change.dragging === false &&
          change.position
        ) {
          const snappedPosition = snapToGrid(change.position);
          updatePostIt(change.id, { position: snappedPosition });
        }
      });

      return updatedNodes;
    },
    [nodes, snapToGrid, updatePostIt]
  );

  // Handle node double-click (enter edit mode)
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setEditingNodeId(node.id);
    },
    []
  );

  // Handle pane click (double-click detection + deselect)
  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      const now = Date.now();
      const timeSinceLastClick = now - lastPaneClickTime.current;

      if (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD) {
        // Double-click detected - create post-it
        createPostItAtPosition(event.clientX, event.clientY);
        lastPaneClickTime.current = 0; // Reset to prevent triple-click creating two post-its
      } else {
        // Single click - deselect/stop editing
        setEditingNodeId(null);
        lastPaneClickTime.current = now;
      }
    },
    [createPostItAtPosition]
  );

  // Auto-fit view on mount if nodes exist
  useEffect(() => {
    if (postIts.length > 0 && !hasFitView.current) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
        hasFitView.current = true;
      }, 100);
    }
  }, [postIts.length, fitView]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        snapToGrid={true}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView={postIts.length > 0}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        deleteKeyCode={null}
        selectionKeyCode={null}
        zoomOnDoubleClick={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d1d5db"
        />
      </ReactFlow>

      {/* Toolbar */}
      <CanvasToolbar onAddPostIt={handleToolbarAdd} />

      {/* Empty state hint */}
      {postIts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-lg">Double-click to add a post-it</p>
        </div>
      )}

      {/* Save status indicator */}
      <div className="absolute bottom-3 right-3 z-10 text-xs text-muted-foreground flex items-center gap-1.5">
        {saveStatus === 'saving' && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
            Saving...
          </>
        )}
        {saveStatus === 'saved' && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Saved
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Save failed
          </>
        )}
      </div>
    </div>
  );
}

export function ReactFlowCanvas({ sessionId, stepId, workshopId }: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner sessionId={sessionId} stepId={stepId} workshopId={workshopId} />
    </ReactFlowProvider>
  );
}

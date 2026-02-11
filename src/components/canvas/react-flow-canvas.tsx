'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  SelectionMode,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useHotkeys } from 'react-hotkeys-hook';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { PostItNode, type PostItNodeData } from './post-it-node';
import { GroupNode } from './group-node';
import { CanvasToolbar } from './canvas-toolbar';
import { ColorPicker } from './color-picker';
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave';
import { usePreventScrollOnCanvas } from '@/hooks/use-prevent-scroll-on-canvas';
import type { PostItColor, GridColumn } from '@/stores/canvas-store';
import { getStepCanvasConfig } from '@/lib/canvas/step-canvas-config';
import { QuadrantOverlay } from './quadrant-overlay';
import { detectQuadrant } from '@/lib/canvas/quadrant-detection';
import { GridOverlay } from './grid-overlay';
import { positionToCell, snapToCell } from '@/lib/canvas/grid-layout';
import type { CellCoordinate, GridConfig } from '@/lib/canvas/grid-layout';
import { DeleteColumnDialog } from '@/components/dialogs/delete-column-dialog';

// Define node types OUTSIDE component for stable reference
const nodeTypes = {
  postIt: PostItNode,
  group: GroupNode,
};

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
  const deletePostIt = useCanvasStore((s) => s.deletePostIt);
  const batchDeletePostIts = useCanvasStore((s) => s.batchDeletePostIts);
  const groupPostIts = useCanvasStore((s) => s.groupPostIts);
  const ungroupPostIts = useCanvasStore((s) => s.ungroupPostIts);
  const gridColumns = useCanvasStore((s) => s.gridColumns);
  const setGridColumns = useCanvasStore((s) => s.setGridColumns);
  const removeGridColumn = useCanvasStore((s) => s.removeGridColumn);

  // Store API for temporal undo/redo access
  const storeApi = useCanvasStoreApi();

  // Container ref for iOS Safari scroll prevention
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Prevent iOS Safari page scroll when panning canvas
  usePreventScrollOnCanvas(canvasContainerRef);

  // Auto-save integration
  const { saveStatus } = useCanvasAutosave(workshopId, stepId);

  // Step-specific canvas configuration
  const stepConfig = getStepCanvasConfig(stepId);

  // Editing state - track which node is being edited
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Dragging state - track which node is being dragged for visual feedback
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

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

  // Undo/redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Context menu state for color picker
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
    currentColor: PostItColor;
    nodeType: string;
  } | null>(null);

  // Track selected nodes for Group button visibility
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // Grid cell highlighting state
  const [highlightedCell, setHighlightedCell] = useState<CellCoordinate | null>(null);

  // Delete column dialog state
  const [deleteColumnDialog, setDeleteColumnDialog] = useState<{
    open: boolean;
    columnId: string;
    columnLabel: string;
    affectedCardCount: number;
    migrationTarget: string | null;
  } | null>(null);

  // Initialize gridColumns from stepConfig on mount (when store has empty gridColumns but step has gridConfig)
  useEffect(() => {
    if (stepConfig.hasGrid && stepConfig.gridConfig && gridColumns.length === 0) {
      // Seed dynamic columns from static step config (first load only)
      const initialColumns: GridColumn[] = stepConfig.gridConfig.columns.map(col => ({
        id: col.id,
        label: col.label,
        width: col.width,
      }));
      setGridColumns(initialColumns);
    }
  }, [stepConfig, gridColumns.length, setGridColumns]);

  // Build dynamic gridConfig from store columns
  const dynamicGridConfig = useMemo<GridConfig | undefined>(() => {
    if (!stepConfig.hasGrid || !stepConfig.gridConfig || gridColumns.length === 0) return undefined;
    return {
      ...stepConfig.gridConfig,
      columns: gridColumns,
    };
  }, [stepConfig, gridColumns]);

  // Snap position to grid
  const snapToGrid = useCallback(
    (position: { x: number; y: number }) => ({
      x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
    }),
    []
  );

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

  // Keyboard shortcuts for undo/redo
  useHotkeys('mod+z', (e) => {
    e.preventDefault();
    handleUndo();
  }, { enableOnFormTags: false });

  useHotkeys(['mod+shift+z', 'ctrl+y'], (e) => {
    e.preventDefault();
    handleRedo();
  }, { enableOnFormTags: false });

  // Subscribe to temporal store for undo/redo state
  useEffect(() => {
    const temporalStore = storeApi.temporal;
    const unsubscribe = temporalStore.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });
    return unsubscribe;
  }, [storeApi]);

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
    // Sort: groups first (parents before children for ReactFlow)
    const sorted = [...postIts].sort((a, b) => {
      if (a.type === 'group' && b.type !== 'group') return -1;
      if (a.type !== 'group' && b.type === 'group') return 1;
      return 0;
    });

    return sorted.map((postIt) => ({
      id: postIt.id,
      type: postIt.type || 'postIt',
      position: postIt.position,
      parentId: postIt.parentId,
      extent: postIt.parentId ? ('parent' as const) : undefined,
      data: {
        text: postIt.text,
        color: postIt.color || 'yellow',
        isEditing: editingNodeId === postIt.id,
        dragging: draggingNodeId === postIt.id,
        onTextChange: handleTextChange,
        onEditComplete: handleEditComplete,
      } as PostItNodeData,
      style: postIt.type === 'group'
        ? { width: postIt.width, height: postIt.height }
        : { width: postIt.width, height: 'auto' },
    }));
  }, [postIts, editingNodeId, draggingNodeId, handleTextChange, handleEditComplete]);

  // Create post-it at position and set as editing
  const createPostItAtPosition = useCallback(
    (clientX: number, clientY: number) => {
      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });

      // Grid-based snap and cell assignment for grid steps
      if (stepConfig.hasGrid && dynamicGridConfig) {
        const snappedPosition = snapToCell(flowPosition, dynamicGridConfig);
        const cell = positionToCell(snappedPosition, dynamicGridConfig);

        const cellAssignment = cell
          ? {
              row: dynamicGridConfig.rows[cell.row].id,
              col: dynamicGridConfig.columns[cell.col].id,
            }
          : undefined;

        shouldEditLatest.current = true;
        addPostIt({
          text: '',
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment,
        });
      } else {
        // Quadrant-based snap and detection for quadrant/standard steps
        const snappedPosition = snapToGrid(flowPosition);

        // Detect initial quadrant
        const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
          ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
          : undefined;

        shouldEditLatest.current = true;
        addPostIt({
          text: '',
          position: snappedPosition,
          width: 120,
          height: 120,
          quadrant,
        });
      }
    },
    [screenToFlowPosition, snapToGrid, addPostIt, stepConfig, dynamicGridConfig]
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

    // Grid-based snap and cell assignment for grid steps
    if (stepConfig.hasGrid && dynamicGridConfig) {
      const snappedPosition = snapToCell(position, dynamicGridConfig);
      const cell = positionToCell(snappedPosition, dynamicGridConfig);

      const cellAssignment = cell
        ? {
            row: dynamicGridConfig.rows[cell.row].id,
            col: dynamicGridConfig.columns[cell.col].id,
          }
        : undefined;

      shouldEditLatest.current = true;
      addPostIt({
        text: '',
        position: snappedPosition,
        width: 120,
        height: 120,
        cellAssignment,
      });
    } else {
      // Quadrant-based snap and detection for quadrant/standard steps
      const snappedPosition = snapToGrid(position);

      // Detect initial quadrant
      const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
        ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
        : undefined;

      shouldEditLatest.current = true;
      addPostIt({
        text: '',
        position: snappedPosition,
        width: 120,
        height: 120,
        quadrant,
      });
    }
  }, [postIts, screenToFlowPosition, snapToGrid, addPostIt, stepConfig, dynamicGridConfig]);

  // Handle node drag start
  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setDraggingNodeId(node.id);
    },
    []
  );

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
          // Clear dragging state
          setDraggingNodeId(null);
          // Grid-based snap and cell assignment for grid steps
          if (stepConfig.hasGrid && dynamicGridConfig) {
            const snappedPosition = snapToCell(change.position, dynamicGridConfig);
            const cell = positionToCell(snappedPosition, dynamicGridConfig);

            // Build cell assignment if position is within grid
            const cellAssignment = cell
              ? {
                  row: dynamicGridConfig.rows[cell.row].id,
                  col: dynamicGridConfig.columns[cell.col].id,
                }
              : undefined;

            updatePostIt(change.id, { position: snappedPosition, cellAssignment });
            setHighlightedCell(null); // Clear highlight on drop
          } else {
            // Quadrant-based snap and detection for quadrant steps
            const snappedPosition = snapToGrid(change.position);

            // Detect quadrant if step has quadrant layout
            const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
              ? detectQuadrant(
                  snappedPosition,
                  120, // post-it default width
                  120, // post-it default height
                  stepConfig.quadrantType
                )
              : undefined;

            updatePostIt(change.id, { position: snappedPosition, quadrant });
          }
        }
      });

      return updatedNodes;
    },
    [nodes, snapToGrid, updatePostIt, stepConfig, dynamicGridConfig]
  );

  // Handle node drag (real-time cell highlighting)
  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (stepConfig.hasGrid && dynamicGridConfig) {
        const cell = positionToCell(node.position, dynamicGridConfig);
        setHighlightedCell(cell); // null if outside grid
      }
    },
    [stepConfig, dynamicGridConfig]
  );

  // Handle node deletion
  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach(node => {
        if (node.type === 'group') {
          // Ungroup children first, then remove group
          ungroupPostIts(node.id);
        }
      });
      // Delete non-group nodes
      const nonGroupIds = deleted
        .filter(n => n.type !== 'group')
        .map(n => n.id);
      if (nonGroupIds.length > 0) {
        batchDeletePostIts(nonGroupIds);
      }
    },
    [ungroupPostIts, batchDeletePostIts]
  );

  // Handle selection change for Group button visibility
  const handleSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    // Only count non-group nodes for grouping eligibility
    const nonGroupIds = nodes
      .filter(n => n.type !== 'group')
      .map(n => n.id);
    setSelectedNodeIds(nonGroupIds);
  }, []);

  // Handle Group button click
  const handleGroup = useCallback(() => {
    if (selectedNodeIds.length >= 2) {
      groupPostIts(selectedNodeIds);
      setSelectedNodeIds([]); // Clear selection after grouping
    }
  }, [selectedNodeIds, groupPostIts]);

  // Handle delete column (passed to GridOverlay)
  const handleDeleteColumn = useCallback(
    (columnId: string, columnLabel: string, affectedCardCount: number, migrationTarget: string | null) => {
      if (affectedCardCount === 0) {
        // Empty column — delete immediately without dialog
        if (dynamicGridConfig) {
          removeGridColumn(columnId, dynamicGridConfig);
        }
      } else {
        // Has cards — show confirmation dialog
        setDeleteColumnDialog({
          open: true,
          columnId,
          columnLabel,
          affectedCardCount,
          migrationTarget,
        });
      }
    },
    [removeGridColumn, dynamicGridConfig]
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteColumnDialog && dynamicGridConfig) {
      removeGridColumn(deleteColumnDialog.columnId, dynamicGridConfig);
      setDeleteColumnDialog(null);
    }
  }, [deleteColumnDialog, removeGridColumn, dynamicGridConfig]);

  // Handle right-click on nodes (color picker or ungroup)
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const postIt = postIts.find(p => p.id === node.id);
      setContextMenu({
        nodeId: node.id,
        x: event.clientX,
        y: event.clientY,
        currentColor: postIt?.color || 'yellow',
        nodeType: node.type || 'postIt',
      });
    },
    [postIts]
  );

  // Handle color selection from picker
  const handleColorSelect = useCallback(
    (color: PostItColor) => {
      if (contextMenu) {
        updatePostIt(contextMenu.nodeId, { color });
        setContextMenu(null);
      }
    },
    [contextMenu, updatePostIt]
  );

  // Close context menu on viewport move
  const handleMoveStart = useCallback(() => {
    setContextMenu(null);
  }, []);

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
      // Close context menu if open
      setContextMenu(null);

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

  // Handle ReactFlow initialization (for empty quadrant/grid canvas centering)
  const handleInit = useCallback((instance: ReactFlowInstance) => {
    if (stepConfig.hasQuadrants && postIts.length === 0) {
      // Center viewport on (0,0) for quadrant steps
      const container = document.querySelector('.react-flow');
      if (container) {
        const rect = container.getBoundingClientRect();
        instance.setViewport({
          x: rect.width / 2,
          y: rect.height / 2,
          zoom: 1,
        });
      }
    } else if (stepConfig.hasGrid && dynamicGridConfig && postIts.length === 0) {
      // Show grid origin area for grid steps
      instance.setViewport({
        x: 50,  // Small left margin
        y: 20,  // Small top margin
        zoom: 1,
      });
    }
  }, [stepConfig, dynamicGridConfig, postIts.length]);

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
    <div ref={canvasContainerRef} className="w-full h-full relative">
      <ReactFlow
        className={draggingNodeId ? 'cursor-grabbing' : ''}
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDrag={handleNodeDrag}
        onNodeDragStart={handleNodeDragStart}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onMoveStart={handleMoveStart}
        onSelectionChange={handleSelectionChange}
        onInit={handleInit}
        snapToGrid={true}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView={postIts.length > 0}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        zoomOnDoubleClick={false}
        // Multi-select (CANV-06)
        selectionKeyCode="Shift"
        multiSelectionKeyCode={null}
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        // Delete (CANV-03)
        deleteKeyCode={editingNodeId ? null : ["Backspace", "Delete"]}
        onNodesDelete={handleNodesDelete}
        // Pan/Zoom (CANV-07)
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d1d5db"
        />
        <Controls
          showInteractive={false}
          className="!shadow-md"
        />
        {stepConfig.hasQuadrants && stepConfig.quadrantConfig && (
          <QuadrantOverlay config={stepConfig.quadrantConfig} />
        )}
        {stepConfig.hasGrid && dynamicGridConfig && (
          <GridOverlay
            config={dynamicGridConfig}
            highlightedCell={highlightedCell}
            onDeleteColumn={handleDeleteColumn}
          />
        )}
      </ReactFlow>

      {/* Toolbar */}
      <CanvasToolbar
        onAddPostIt={handleToolbarAdd}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onGroup={handleGroup}
        canGroup={selectedNodeIds.length >= 2}
      />

      {/* Context menu: ungroup for groups, color picker for post-its */}
      {contextMenu && contextMenu.nodeType === 'group' ? (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <button
            className="relative z-50 px-3 py-1.5 text-sm hover:bg-gray-100 rounded w-full text-left"
            onClick={() => {
              ungroupPostIts(contextMenu.nodeId);
              setContextMenu(null);
            }}
          >
            Ungroup
          </button>
        </div>
      ) : contextMenu ? (
        <ColorPicker
          position={{ x: contextMenu.x, y: contextMenu.y }}
          currentColor={contextMenu.currentColor}
          onColorSelect={handleColorSelect}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      {/* Delete column dialog */}
      {deleteColumnDialog && (
        <DeleteColumnDialog
          open={deleteColumnDialog.open}
          onOpenChange={(open) => {
            if (!open) setDeleteColumnDialog(null);
          }}
          onConfirm={handleConfirmDelete}
          columnLabel={deleteColumnDialog.columnLabel}
          affectedCardCount={deleteColumnDialog.affectedCardCount}
          migrationTarget={deleteColumnDialog.migrationTarget}
        />
      )}

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

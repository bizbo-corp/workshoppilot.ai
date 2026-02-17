'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  SelectionMode,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useHotkeys } from 'react-hotkeys-hook';
import { Plus, Minus, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { PostItNode, type PostItNodeData } from './post-it-node';
import { GroupNode } from './group-node';
import { DrawingImageNode } from './drawing-image-node';
import { ConceptCardNode } from './concept-card-node';
import { CanvasToolbar } from './canvas-toolbar';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import { ColorPicker } from './color-picker';
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave';
import { usePreventScrollOnCanvas } from '@/hooks/use-prevent-scroll-on-canvas';
import type { PostItColor, GridColumn, DrawingNode } from '@/stores/canvas-store';
import { getStepCanvasConfig } from '@/lib/canvas/step-canvas-config';
import { computeThemeSortPositions } from '@/lib/canvas/canvas-position';
import { QuadrantOverlay } from './quadrant-overlay';
import { detectQuadrant } from '@/lib/canvas/quadrant-detection';
import { GridOverlay } from './grid-overlay';
import { positionToCell, snapToCell } from '@/lib/canvas/grid-layout';
import type { CellCoordinate, GridConfig } from '@/lib/canvas/grid-layout';
import { DeleteColumnDialog } from '@/components/dialogs/delete-column-dialog';
import { ConcentricRingsOverlay } from './concentric-rings-overlay';
import { EmpathyMapOverlay } from './empathy-map-overlay';
import { detectRing } from '@/lib/canvas/ring-layout';
import { getZoneForPosition } from '@/lib/canvas/empathy-zones';
import { EzyDrawLoader } from '@/components/ezydraw/ezydraw-loader';
import { simplifyDrawingElements } from '@/lib/drawing/simplify';
import { saveDrawing, updateDrawing, loadDrawing } from '@/actions/drawing-actions';
import type { DrawingElement } from '@/lib/drawing/types';

// Define node types OUTSIDE component for stable reference
const nodeTypes = {
  postIt: PostItNode,
  group: GroupNode,
  drawingImage: DrawingImageNode,
  conceptCard: ConceptCardNode,
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
  const ungroupPostIts = useCanvasStore((s) => s.ungroupPostIts);
  const drawingNodes = useCanvasStore((s) => s.drawingNodes);
  const addDrawingNode = useCanvasStore((s) => s.addDrawingNode);
  const updateDrawingNode = useCanvasStore((s) => s.updateDrawingNode);
  const deleteDrawingNode = useCanvasStore((s) => s.deleteDrawingNode);
  const conceptCards = useCanvasStore((s) => s.conceptCards);
  const updateConceptCard = useCanvasStore((s) => s.updateConceptCard);
  const deleteConceptCard = useCanvasStore((s) => s.deleteConceptCard);
  const batchUpdatePositions = useCanvasStore((s) => s.batchUpdatePositions);
  const gridColumns = useCanvasStore((s) => s.gridColumns);
  const setGridColumns = useCanvasStore((s) => s.setGridColumns);
  const removeGridColumn = useCanvasStore((s) => s.removeGridColumn);
  const confirmPreview = useCanvasStore((s) => s.confirmPreview);
  const rejectPreview = useCanvasStore((s) => s.rejectPreview);
  const highlightedCell = useCanvasStore((s) => s.highlightedCell);
  const setHighlightedCell = useCanvasStore((s) => s.setHighlightedCell);
  const pendingFitView = useCanvasStore((s) => s.pendingFitView);
  const setPendingFitView = useCanvasStore((s) => s.setPendingFitView);
  const setSelectedPostItIds = useCanvasStore((s) => s.setSelectedPostItIds);

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

  // Z-index management - bring selected/dragged/new nodes to front
  const [nodeZIndices, setNodeZIndices] = useState<Record<string, number>>({});
  const zIndexCounter = useRef(100);

  // Pointer/Hand tool state
  const [activeTool, setActiveTool] = useState<'pointer' | 'hand'>('pointer');

  // ReactFlow hooks
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow();

  // Track if we've done initial fitView
  const hasFitView = useRef(false);

  // Double-click detection for pane
  const lastPaneClickTime = useRef(0);
  const DOUBLE_CLICK_THRESHOLD = 300; // ms

  // Track previous post-it count for fitView logic
  const previousPostItCount = useRef(postIts.length);

  // Bring a node to the top of the z-index stack
  const bringToFront = useCallback((nodeId: string) => {
    zIndexCounter.current += 1;
    setNodeZIndices(prev => ({ ...prev, [nodeId]: zIndexCounter.current }));
  }, []);

  // Live positions during drag — REFS to avoid re-renders during manipulation.
  // ReactFlow manages drag visuals internally; these refs are a safety net so
  // that when useMemo DOES recompute (from unrelated state changes), it uses
  // current values instead of stale store positions.
  const livePositions = useRef<Record<string, { x: number; y: number }>>({});

  // Live dimensions during resize — same ref strategy as positions.
  const liveDimensions = useRef<Record<string, { width: number; height: number }>>({});

  // Continuous resize handler — updates ref only, no re-renders
  const handleResize = useCallback(
    (id: string, width: number, height: number) => {
      liveDimensions.current[id] = { width, height };
    },
    []
  );

  // Resize end — clear ref and persist final values to store.
  // Position is included because resizing from top/left edges moves the node.
  const handleResizeEnd = useCallback(
    (id: string, width: number, height: number, x: number, y: number) => {
      delete liveDimensions.current[id];
      updatePostIt(id, {
        width: Math.round(width),
        height: Math.round(height),
        position: { x: Math.round(x), y: Math.round(y) },
      });
    },
    [updatePostIt]
  );

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

  // Track selected nodes for controlled selection state
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // Delete column dialog state
  const [deleteColumnDialog, setDeleteColumnDialog] = useState<{
    open: boolean;
    columnId: string;
    columnLabel: string;
    affectedCardCount: number;
    migrationTarget: string | null;
  } | null>(null);

  // EzyDraw modal state
  const [ezyDrawState, setEzyDrawState] = useState<{
    isOpen: boolean;
    drawingId?: string;           // undefined = new drawing, string = re-editing
    initialElements?: DrawingElement[];
  } | null>(null);

  // Track whether initial gridColumns were provided (from saved state)
  const hadInitialGridColumns = useRef(gridColumns.length > 0);

  // Initialize gridColumns from stepConfig on mount (when store has empty gridColumns but step has gridConfig)
  useEffect(() => {
    if (stepConfig.hasGrid && stepConfig.gridConfig && !hadInitialGridColumns.current && gridColumns.length === 0) {
      // Seed dynamic columns from static step config (first visit only)
      // Only runs if store was initialized with empty gridColumns (no saved state)
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

  // Spacebar hold → temporary Hand tool (only when not editing text)
  useHotkeys('space', () => {
    if (!editingNodeId) setActiveTool('hand');
  }, { keydown: true, keyup: false, enableOnFormTags: false });
  useHotkeys('space', () => {
    if (!editingNodeId) setActiveTool('pointer');
  }, { keydown: false, keyup: true, enableOnFormTags: false });

  // Subscribe to temporal store for undo/redo state
  useEffect(() => {
    const temporalStore = storeApi.temporal;
    const unsubscribe = temporalStore.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });
    return unsubscribe;
  }, [storeApi]);

  // Helper: create a post-it with pre-generated ID so editing + z-index
  // are set synchronously BEFORE the store update. This eliminates the
  // one-frame delay that caused broken auto-focus and z-index on creation.
  const createAndEditPostIt = useCallback(
    (postIt: Omit<import('@/stores/canvas-store').PostIt, 'id'>) => {
      const newId = crypto.randomUUID();
      bringToFront(newId);
      setEditingNodeId(newId);
      addPostIt({ ...postIt, id: newId });
    },
    [bringToFront, addPostIt]
  );

  // Keep previousPostItCount in sync for fitView logic
  useEffect(() => {
    previousPostItCount.current = postIts.length;
  }, [postIts.length]);

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

  // Handle concept card field changes
  const handleConceptFieldChange = useCallback(
    (id: string, field: string, value: string) => {
      // Handle nested fields like 'billboardHero.headline'
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const card = conceptCards.find((c) => c.id === id);
        if (card && card[parent as keyof ConceptCardData]) {
          updateConceptCard(id, {
            [parent]: {
              ...(card[parent as keyof ConceptCardData] as Record<string, unknown>),
              [child]: value,
            },
          });
        }
      } else {
        updateConceptCard(id, { [field]: value });
      }
    },
    [conceptCards, updateConceptCard]
  );

  const handleConceptSWOTChange = useCallback(
    (id: string, quadrant: string, index: number, value: string) => {
      const card = conceptCards.find((c) => c.id === id);
      if (!card) return;

      const updatedQuadrant = [...card.swot[quadrant as keyof typeof card.swot]];
      updatedQuadrant[index] = value;

      updateConceptCard(id, {
        swot: {
          ...card.swot,
          [quadrant]: updatedQuadrant,
        },
      });
    },
    [conceptCards, updateConceptCard]
  );

  const handleConceptFeasibilityChange = useCallback(
    (id: string, dimension: string, score?: number, rationale?: string) => {
      const card = conceptCards.find((c) => c.id === id);
      if (!card) return;

      const currentDimension = card.feasibility[dimension as keyof typeof card.feasibility];

      updateConceptCard(id, {
        feasibility: {
          ...card.feasibility,
          [dimension]: {
            score: score !== undefined ? score : currentDimension.score,
            rationale: rationale !== undefined ? rationale : currentDimension.rationale,
          },
        },
      });
    },
    [conceptCards, updateConceptCard]
  );

  // Handle preview confirmation and rejection
  const handleConfirmPreview = useCallback((id: string) => {
    confirmPreview(id);
    setHighlightedCell(null);
  }, [confirmPreview]);

  const handleRejectPreview = useCallback((id: string) => {
    rejectPreview(id);
    setHighlightedCell(null);
  }, [rejectPreview]);

  // Convert store post-its to ReactFlow nodes
  const nodes = useMemo<Node[]>(() => {
    // Sort: groups first (parents before children for ReactFlow)
    const sorted = [...postIts].sort((a, b) => {
      if (a.type === 'group' && b.type !== 'group') return -1;
      if (a.type !== 'group' && b.type === 'group') return 1;
      return 0;
    });

    const postItReactFlowNodes: Node[] = sorted.map((postIt) => {
      const isPreview = postIt.isPreview === true;
      // Use live ref values during drag/resize — safety net so that IF useMemo
      // recomputes mid-manipulation (from unrelated state changes), it reads
      // current values instead of stale store positions/dimensions.
      const livePos = livePositions.current[postIt.id];
      const liveDims = liveDimensions.current[postIt.id];

      return {
        id: postIt.id,
        type: postIt.type || 'postIt',
        position: livePos || postIt.position,
        parentId: postIt.parentId,
        extent: postIt.parentId ? ('parent' as const) : undefined,
        zIndex: nodeZIndices[postIt.id] || 20,
        draggable: !isPreview,
        selectable: !isPreview,
        selected: selectedNodeIds.includes(postIt.id),
        data: {
          text: postIt.text,
          color: postIt.color || 'yellow',
          isEditing: isPreview ? false : editingNodeId === postIt.id,
          onTextChange: handleTextChange,
          onEditComplete: handleEditComplete,
          onResize: handleResize,
          onResizeEnd: handleResizeEnd,
          ...(isPreview ? {
            isPreview: true,
            previewReason: postIt.previewReason,
            onConfirm: handleConfirmPreview,
            onReject: handleRejectPreview,
          } : {}),
        } as PostItNodeData,
        style: {
          width: liveDims?.width ?? postIt.width,
          height: liveDims?.height ?? postIt.height,
        },
      };
    });

    // Add drawing nodes
    const drawingReactFlowNodes: Node[] = drawingNodes.map((dn) => {
      const displayWidth = Math.min(dn.width, 400);
      const displayHeight = displayWidth * (dn.height / dn.width);

      return {
        id: dn.id,
        type: 'drawingImage' as const,
        position: livePositions.current[dn.id] || dn.position,
        zIndex: nodeZIndices[dn.id] || 20,
        draggable: true,
        selectable: true,
        selected: selectedNodeIds.includes(dn.id),
        data: {
          imageUrl: dn.imageUrl,
          drawingId: dn.drawingId,
          width: dn.width,
          height: dn.height,
        },
        style: { width: displayWidth, height: displayHeight },
      };
    });

    // Add concept card nodes
    const conceptCardReactFlowNodes: Node[] = conceptCards.map((card) => ({
      id: card.id,
      type: 'conceptCard' as const,
      position: livePositions.current[card.id] || card.position,
      zIndex: nodeZIndices[card.id] || 20,
      draggable: true,
      selectable: true,
      selected: selectedNodeIds.includes(card.id),
      data: {
        ...card,
        onFieldChange: handleConceptFieldChange,
        onSWOTChange: handleConceptSWOTChange,
        onFeasibilityChange: handleConceptFeasibilityChange,
      },
      style: { width: 400 },
    }));

    return [...postItReactFlowNodes, ...drawingReactFlowNodes, ...conceptCardReactFlowNodes];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- livePositions/liveDimensions are refs
  // read inside the memo body as a safety net; they must NOT be deps or every
  // mouse-move during drag would recompute and cause flickering.
  }, [postIts, drawingNodes, conceptCards, editingNodeId, selectedNodeIds, nodeZIndices, handleTextChange, handleEditComplete, handleResize, handleResizeEnd, handleConfirmPreview, handleRejectPreview, handleConceptFieldChange, handleConceptSWOTChange, handleConceptFeasibilityChange]);

  // Create post-it at position and set as editing
  const createPostItAtPosition = useCallback(
    (clientX: number, clientY: number) => {
      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });

      // Ring-based snap and assignment for ring steps
      if (stepConfig.hasRings && stepConfig.ringConfig) {
        const snappedPosition = snapToGrid(flowPosition);
        const ringId = detectRing(
          { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
          stepConfig.ringConfig
        );
        createAndEditPostIt({
          text: '',
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment: { row: ringId, col: '' },
        });
      }
      // Empathy zone snap and assignment for empathy zone steps
      else if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
        const snappedPosition = snapToGrid(flowPosition);
        const zone = getZoneForPosition(
          { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
          stepConfig.empathyZoneConfig
        );
        createAndEditPostIt({
          text: '',
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment: zone ? { row: zone, col: '' } : undefined,
        });
      }
      // Grid-based snap and cell assignment for grid steps
      else if (stepConfig.hasGrid && dynamicGridConfig) {
        const snappedPosition = snapToCell(flowPosition, dynamicGridConfig);
        const cell = positionToCell(snappedPosition, dynamicGridConfig);
        const cellAssignment = cell
          ? {
              row: dynamicGridConfig.rows[cell.row].id,
              col: dynamicGridConfig.columns[cell.col].id,
            }
          : undefined;
        createAndEditPostIt({
          text: '',
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment,
        });
      } else {
        // Quadrant-based snap and detection for quadrant/standard steps
        const snappedPosition = snapToGrid(flowPosition);
        const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
          ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
          : undefined;
        createAndEditPostIt({
          text: '',
          position: snappedPosition,
          width: 120,
          height: 120,
          quadrant,
        });
      }
    },
    [screenToFlowPosition, snapToGrid, createAndEditPostIt, stepConfig, dynamicGridConfig]
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

    // Ring-based snap and assignment for ring steps
    if (stepConfig.hasRings && stepConfig.ringConfig) {
      const snappedPosition = snapToGrid(position);
      const ringId = detectRing(
        { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
        stepConfig.ringConfig
      );
      createAndEditPostIt({
        text: '',
        position: snappedPosition,
        width: 120,
        height: 120,
        cellAssignment: { row: ringId, col: '' },
      });
    }
    // Empathy zone snap and assignment for empathy zone steps
    else if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
      const snappedPosition = snapToGrid(position);
      const zone = getZoneForPosition(
        { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
        stepConfig.empathyZoneConfig
      );
      createAndEditPostIt({
        text: '',
        position: snappedPosition,
        width: 120,
        height: 120,
        cellAssignment: zone ? { row: zone, col: '' } : undefined,
      });
    }
    // Grid-based snap and cell assignment for grid steps
    else if (stepConfig.hasGrid && dynamicGridConfig) {
      const snappedPosition = snapToCell(position, dynamicGridConfig);
      const cell = positionToCell(snappedPosition, dynamicGridConfig);
      const cellAssignment = cell
        ? {
            row: dynamicGridConfig.rows[cell.row].id,
            col: dynamicGridConfig.columns[cell.col].id,
          }
        : undefined;
      createAndEditPostIt({
        text: '',
        position: snappedPosition,
        width: 120,
        height: 120,
        cellAssignment,
      });
    } else {
      // Quadrant-based snap and detection for quadrant/standard steps
      const snappedPosition = snapToGrid(position);
      const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
        ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
        : undefined;
      createAndEditPostIt({
        text: '',
        position: snappedPosition,
        width: 120,
        height: 120,
        quadrant,
      });
    }
  }, [postIts, screenToFlowPosition, snapToGrid, createAndEditPostIt, stepConfig, dynamicGridConfig]);

  // Handle toolbar emotion post-it creation (with emoji + color preset)
  const handleEmotionAdd = useCallback((emoji: string, color: PostItColor) => {
    let position: { x: number; y: number };

    if (postIts.length > 0) {
      const lastPostIt = postIts[postIts.length - 1];
      position = {
        x: lastPostIt.position.x + 30,
        y: lastPostIt.position.y + 30,
      };
    } else {
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      position = center;
    }

    if (stepConfig.hasRings && stepConfig.ringConfig) {
      const snappedPosition = snapToGrid(position);
      const ringId = detectRing(
        { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
        stepConfig.ringConfig
      );
      createAndEditPostIt({ text: emoji, position: snappedPosition, width: 120, height: 120, color, cellAssignment: { row: ringId, col: '' } });
    } else if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
      const snappedPosition = snapToGrid(position);
      const zone = getZoneForPosition(
        { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
        stepConfig.empathyZoneConfig
      );
      createAndEditPostIt({ text: emoji, position: snappedPosition, width: 120, height: 120, color, cellAssignment: zone ? { row: zone, col: '' } : undefined });
    } else if (stepConfig.hasGrid && dynamicGridConfig) {
      const snappedPosition = snapToCell(position, dynamicGridConfig);
      const cell = positionToCell(snappedPosition, dynamicGridConfig);
      const cellAssignment = cell
        ? { row: dynamicGridConfig.rows[cell.row].id, col: dynamicGridConfig.columns[cell.col].id }
        : undefined;
      createAndEditPostIt({ text: emoji, position: snappedPosition, width: 120, height: 120, color, cellAssignment });
    } else {
      const snappedPosition = snapToGrid(position);
      const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
        ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
        : undefined;
      createAndEditPostIt({ text: emoji, position: snappedPosition, width: 120, height: 120, color, quadrant });
    }
  }, [postIts, screenToFlowPosition, snapToGrid, createAndEditPostIt, stepConfig, dynamicGridConfig]);

  // Handle theme sort — reorganize post-its by cluster on rings
  const handleThemeSort = useCallback(() => {
    const updates = computeThemeSortPositions(postIts, stepId);
    if (updates.length > 0) {
      batchUpdatePositions(updates);
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 150);
    }
  }, [postIts, stepId, batchUpdatePositions, fitView]);

  // Handle delete selected nodes from toolbar
  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    // Ungroup any selected groups first
    selectedNodes.filter(n => n.type === 'group').forEach(n => ungroupPostIts(n.id));
    // Delete selected drawing nodes
    selectedNodes.filter(n => n.type === 'drawingImage').forEach(n => deleteDrawingNode(n.id));
    // Delete selected concept cards
    selectedNodes.filter(n => n.type === 'conceptCard').forEach(n => deleteConceptCard(n.id));
    // Delete non-group, non-drawing, non-conceptCard postIt nodes
    const postItIds = selectedNodes.filter(n => n.type !== 'group' && n.type !== 'drawingImage' && n.type !== 'conceptCard').map(n => n.id);
    if (postItIds.length > 0) batchDeletePostIts(postItIds);
  }, [nodes, ungroupPostIts, batchDeletePostIts, deleteDrawingNode, deleteConceptCard]);

  // Handle node drag start — bring dragged node to top of stack
  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setDraggingNodeId(node.id);
      bringToFront(node.id);
    },
    [bringToFront]
  );

  // Handle all node changes (selection, position, removal)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // ── Track live positions during drag (ref — no re-renders) ──
      // ReactFlow handles drag visuals internally. The ref is a safety net so
      // that IF useMemo recomputes mid-drag (from unrelated state changes), it
      // reads current positions instead of stale store values.
      for (const c of changes) {
        if (c.type === 'position') {
          const posChange = c as NodeChange & { id: string; position?: { x: number; y: number }; dragging?: boolean };
          if (posChange.dragging && posChange.position) {
            livePositions.current[posChange.id] = posChange.position;
          } else if (posChange.dragging === false) {
            delete livePositions.current[posChange.id];
          }
        }
      }

      // Handle selection changes — must persist so nodes stay selected across renders
      const selectChanges = changes.filter((c): c is NodeChange & { type: 'select'; id: string; selected: boolean } => c.type === 'select');
      if (selectChanges.length > 0) {
        const newlySelected = selectChanges.filter(c => c.selected).map(c => c.id);

        setSelectedNodeIds(prev => {
          const next = new Set(prev);
          selectChanges.forEach(c => {
            if (c.selected) next.add(c.id);
            else next.delete(c.id);
          });
          return Array.from(next);
        });

        // Bring newly selected nodes to top of z-index stack
        newlySelected.forEach(id => bringToFront(id));
      }

      // Handle remove changes (Delete/Backspace key)
      const removeChanges = changes.filter(c => c.type === 'remove');
      if (removeChanges.length > 0) {
        const removedIds = removeChanges.map(c => c.id);
        removedIds.forEach(id => {
          const node = nodes.find(n => n.id === id);
          if (node?.type === 'group') {
            ungroupPostIts(id);
          } else if (node?.type === 'drawingImage') {
            deleteDrawingNode(id);
          } else if (node?.type === 'conceptCard') {
            deleteConceptCard(id);
          }
        });
        const postItIds = removedIds.filter(id => {
          const node = nodes.find(n => n.id === id);
          return node?.type !== 'group' && node?.type !== 'drawingImage' && node?.type !== 'conceptCard';
        });
        if (postItIds.length > 0) batchDeletePostIts(postItIds);
        return;
      }

      // Update store when drag completes
      changes.forEach((change) => {
        if (
          change.type === 'position' &&
          change.dragging === false &&
          change.position
        ) {
          // Skip position updates for nodes being actively resized — NodeResizer
          // dispatches position changes when resizing from top/left edges and
          // processing them mid-resize would snap the position causing jitter.
          if (liveDimensions.current[change.id]) return;

          // Clear dragging state
          setDraggingNodeId(null);

          // Check if this is a drawing node
          const drawingNode = drawingNodes.find((dn) => dn.id === change.id);
          if (drawingNode) {
            // Handle drawing node position update with snap-to-grid
            const snappedPosition = snapToGrid(change.position);
            updateDrawingNode(change.id, { position: snappedPosition });
            return;
          }

          // Check if this is a concept card node
          const conceptCard = conceptCards.find((cc) => cc.id === change.id);
          if (conceptCard) {
            const snappedPosition = snapToGrid(change.position);
            updateConceptCard(change.id, { position: snappedPosition });
            return;
          }

          // Ring-based snap and assignment for ring steps
          if (stepConfig.hasRings && stepConfig.ringConfig) {
            const snappedPosition = snapToGrid(change.position);
            const ringId = detectRing(
              { x: snappedPosition.x + 60, y: snappedPosition.y + 50 }, // card center
              stepConfig.ringConfig
            );
            updatePostIt(change.id, {
              position: snappedPosition,
              cellAssignment: { row: ringId, col: '' },
            });
          }
          // Empathy zone snap and assignment for empathy zone steps
          else if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
            const snappedPosition = snapToGrid(change.position);
            const zone = getZoneForPosition(
              { x: snappedPosition.x + 60, y: snappedPosition.y + 50 }, // card center
              stepConfig.empathyZoneConfig
            );
            updatePostIt(change.id, {
              position: snappedPosition,
              cellAssignment: zone ? { row: zone, col: '' } : undefined,
            });
          }
          // Grid-based snap and cell assignment for grid steps
          else if (stepConfig.hasGrid && dynamicGridConfig) {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- livePositions/liveDimensions are refs
    [nodes, drawingNodes, conceptCards, snapToGrid, updatePostIt, updateDrawingNode, updateConceptCard, deleteDrawingNode, deleteConceptCard, stepConfig, dynamicGridConfig, ungroupPostIts, batchDeletePostIts, bringToFront]
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
        } else if (node.type === 'drawingImage') {
          // Delete drawing node
          deleteDrawingNode(node.id);
        } else if (node.type === 'conceptCard') {
          // Delete concept card
          deleteConceptCard(node.id);
        }
      });
      // Delete non-group, non-drawing, non-conceptCard postIt nodes
      const postItIds = deleted
        .filter(n => n.type !== 'group' && n.type !== 'drawingImage' && n.type !== 'conceptCard')
        .map(n => n.id);
      if (postItIds.length > 0) {
        batchDeletePostIts(postItIds);
      }
    },
    [ungroupPostIts, batchDeletePostIts, deleteDrawingNode, deleteConceptCard]
  );


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

  // Handle drawing save from EzyDraw modal
  const handleDrawingSave = useCallback(
    async (result: { pngDataUrl: string; elements: DrawingElement[] }) => {
      const simplifiedElements = simplifyDrawingElements(result.elements);
      const vectorJson = JSON.stringify(simplifiedElements);

      // Default stage dimensions (EzyDraw 6:4 canvas)
      const width = 1200;
      const height = 800;

      if (ezyDrawState?.drawingId) {
        // Re-edit: update existing drawing
        const response = await updateDrawing({
          workshopId,
          stepId,
          drawingId: ezyDrawState.drawingId,
          pngBase64: result.pngDataUrl,
          vectorJson,
          width,
          height,
        });
        if (response.success && response.pngUrl) {
          // Find the canvas store node by drawingId (not the same as the store node id)
          const storeNode = drawingNodes.find(dn => dn.drawingId === ezyDrawState.drawingId);
          if (storeNode) {
            updateDrawingNode(storeNode.id, { imageUrl: response.pngUrl });
          }
        } else if (!response.success) {
          console.error('Failed to update drawing:', response.error);
        }
      } else {
        // New drawing: save and add to canvas
        const response = await saveDrawing({
          workshopId,
          stepId,
          pngBase64: result.pngDataUrl,
          vectorJson,
          width,
          height,
        });
        if (response.success && response.drawingId && response.pngUrl) {
          // Place at viewport center
          const center = screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
          addDrawingNode({
            drawingId: response.drawingId,
            imageUrl: response.pngUrl,
            position: center,
            width,
            height,
          });
        } else if (!response.success) {
          console.error('Failed to save drawing:', response.error);
        }
      }
    },
    [ezyDrawState, workshopId, stepId, screenToFlowPosition, addDrawingNode, updateDrawingNode]
  );

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

  // Handle node double-click (enter edit mode for postIts, or re-edit for drawings)
  const handleNodeDoubleClick = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      // Check if this is a drawing node
      const drawingNode = drawingNodes.find(dn => dn.id === node.id);
      if (drawingNode) {
        try {
          // Load vector JSON from server
          const drawing = await loadDrawing({
            workshopId,
            stepId,
            drawingId: drawingNode.drawingId,
          });
          if (drawing) {
            const elements: DrawingElement[] = JSON.parse(drawing.vectorJson);
            setEzyDrawState({
              isOpen: true,
              drawingId: drawingNode.drawingId,
              initialElements: elements,
            });
          } else {
            console.error('Drawing not found in database:', drawingNode.drawingId);
          }
        } catch (error) {
          console.error('Failed to load drawing for re-edit:', error);
        }
        return; // Don't enter postIt edit mode
      }

      // Existing postIt edit behavior
      setEditingNodeId(node.id);
    },
    [drawingNodes, workshopId, stepId]
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
    if (stepConfig.hasRings && postIts.length === 0) {
      // Center viewport on (0,0) for ring layout
      const container = document.querySelector('.react-flow');
      if (container) {
        const rect = container.getBoundingClientRect();
        instance.setViewport({
          x: rect.width / 2,
          y: rect.height / 2,
          zoom: 0.7, // Slightly zoomed out so all 3 rings visible
        });
      }
    } else if (stepConfig.hasEmpathyZones && postIts.length === 0) {
      // Center viewport to show full empathy map
      const container = document.querySelector('.react-flow');
      if (container) {
        const rect = container.getBoundingClientRect();
        instance.setViewport({
          x: rect.width / 2 - 80, // Center horizontally on the wider zone layout
          y: rect.height / 2 + 216, // Center vertically on zone layout
          zoom: 0.6, // Zoomed out enough to see all 6 zones
        });
      }
    } else if (stepConfig.hasQuadrants && postIts.length === 0) {
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

  // Animate viewport when items are added from chat panel
  useEffect(() => {
    if (pendingFitView) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
        setPendingFitView(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pendingFitView, fitView, setPendingFitView]);

  // Sync local selection to shared store (via effect to avoid setState-during-render)
  useEffect(() => {
    setSelectedPostItIds(selectedNodeIds);
  }, [selectedNodeIds, setSelectedPostItIds]);

  return (
    <div ref={canvasContainerRef} className="w-full h-full relative">
      <ReactFlow
        className={cn(
          draggingNodeId
            ? 'cursor-dragging'
            : activeTool === 'hand'
              ? 'cursor-hand-tool'
              : 'cursor-pointer-tool',
        )}
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

        onInit={handleInit}
        snapToGrid={false}
        fitView={postIts.length > 0}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        zoomOnDoubleClick={false}
        // Multi-select (CANV-06)
        selectionKeyCode="Shift"
        multiSelectionKeyCode={null}
        selectionOnDrag={activeTool === 'pointer'}
        selectionMode={SelectionMode.Partial}
        // Delete (CANV-03)
        deleteKeyCode={editingNodeId ? null : ["Backspace", "Delete"]}
        onNodesDelete={handleNodesDelete}
        // Pan/Zoom (CANV-07) - dynamic based on active tool
        panOnDrag={activeTool === 'hand'}
        zoomOnScroll={true}
        zoomOnPinch={true}
        elevateNodesOnSelect={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="var(--canvas-dots)"
        />
        {/* Zoom controls — styled to match canvas toolbar */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col items-center bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-200 dark:border-zinc-700 p-1 gap-0.5">
          <button
            onClick={() => zoomIn({ duration: 200 })}
            title="Zoom in"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => zoomOut({ duration: 200 })}
            title="Zoom out"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => fitView({ padding: 0.2, duration: 300 })}
            title="Fit view"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
        {stepConfig.hasQuadrants && stepConfig.quadrantConfig && (
          <QuadrantOverlay config={stepConfig.quadrantConfig} />
        )}
        {stepConfig.hasRings && stepConfig.ringConfig && (
          <ConcentricRingsOverlay config={stepConfig.ringConfig} />
        )}
        {stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig && (
          <EmpathyMapOverlay config={stepConfig.empathyZoneConfig} />
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
        onAddEmotionPostIt={handleEmotionAdd}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onOpenDraw={() => setEzyDrawState({ isOpen: true })}
        onThemeSort={handleThemeSort}
        showThemeSort={stepConfig.hasRings}
      />

      {/* Context menu: ungroup for groups, color picker for post-its */}
      {contextMenu && contextMenu.nodeType === 'group' ? (
        <div
          className="fixed z-50 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <button
            className="relative z-50 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded w-full text-left"
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

      {/* EzyDraw modal */}
      {ezyDrawState?.isOpen && (
        <EzyDrawLoader
          isOpen={true}
          onClose={() => setEzyDrawState(null)}
          onSave={handleDrawingSave}
          initialElements={ezyDrawState.initialElements}
          drawingId={ezyDrawState.drawingId}
        />
      )}

      {/* Empty state hint */}
      {postIts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 dark:text-gray-600 text-lg">Double-click to add a post-it</p>
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

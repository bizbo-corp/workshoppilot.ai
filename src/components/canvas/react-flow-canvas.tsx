"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  Background,
  BackgroundVariant,
  SelectionMode,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useHotkeys } from "react-hotkeys-hook";
import { CanvasZoomControls } from "./canvas-zoom-controls";
import { cn } from "@/lib/utils";
import {
  useCanvasStore,
  useCanvasStoreApi,
} from "@/providers/canvas-store-provider";
import { StickyNoteNode, type StickyNoteNodeData } from "./sticky-note-node";
import { GroupNode } from "./group-node";
import { DrawingImageNode } from "./drawing-image-node";
import { ConceptCardNode } from "./concept-card-node";
import { PersonaTemplateNode } from "./persona-template-node";
import { HmwCardNode } from "./hmw-card-node";
import { CanvasToolbar } from "./canvas-toolbar";
import type { ConceptCardData } from "@/lib/canvas/concept-card-types";
import { hasExistingContent, type ConceptFieldId } from "@/lib/canvas/concept-card-utils";
import { useConceptCardGenerate } from "@/hooks/use-concept-card-generate";
import type { PersonaTemplateData } from "@/lib/canvas/persona-template-types";
import type { HmwCardData } from "@/lib/canvas/hmw-card-types";
import { hasExistingHmwContent, type HmwFieldId } from "@/lib/canvas/hmw-card-types";
import { useHmwCardGenerate } from "@/hooks/use-hmw-card-generate";
import { ColorPicker } from "./color-picker";
import { useCanvasAutosave } from "@/hooks/use-canvas-autosave";
import { usePreventScrollOnCanvas } from "@/hooks/use-prevent-scroll-on-canvas";
import { useMultiplayerContext } from "@/components/workshop/multiplayer-room";
import { LiveCursors, CursorBroadcaster } from "./live-cursors";
import { useUpdateMyPresence, useOthers, shallow } from "@liveblocks/react";
import { PresenterFollowBanner } from "./presenter-follow-banner";
import type {
  StickyNoteColor,
  GridColumn,
  DrawingNode,
} from "@/stores/canvas-store";
import { getStepCanvasConfig } from "@/lib/canvas/step-canvas-config";
import {
  computeThemeSortPositions,
  computeClusterChildPositions,
  computePersonaColumnLayout,
} from "@/lib/canvas/canvas-position";
import { QuadrantOverlay } from "./quadrant-overlay";
import { detectQuadrant } from "@/lib/canvas/quadrant-detection";
import { GridOverlay } from "./grid-overlay";
import { positionToCell, snapToCell } from "@/lib/canvas/grid-layout";
import type { CellCoordinate, GridConfig } from "@/lib/canvas/grid-layout";
import { DeleteColumnDialog } from "@/components/dialogs/delete-column-dialog";
import { ConcentricRingsOverlay } from "./concentric-rings-overlay";
import { EmpathyMapOverlay } from "./empathy-map-overlay";
import { detectRing } from "@/lib/canvas/ring-layout";
import { getZoneForPosition } from "@/lib/canvas/empathy-zones";
import type { EmpathyZoneConfig } from "@/lib/canvas/empathy-zones";
import {
  empathyBoundsFromNotes,
  withDynamicRowHeightsFromNotes,
} from "@/lib/canvas/pack-layout";
import { EzyDrawLoader } from "@/components/ezydraw/ezydraw-loader";
import { simplifyDrawingElements } from "@/lib/drawing/simplify";
import {
  saveDrawing,
  updateDrawing,
  loadDrawing,
} from "@/actions/drawing-actions";
import { saveCanvasState, renamePersonaCandidate } from "@/actions/canvas-actions";
import { type DrawingElement, parseVectorJson } from "@/lib/drawing/types";
import { ClusterEdge } from "./cluster-edge";
import { ClusterHullsOverlay } from "./cluster-hulls-overlay";
import { ResearchSkeletonOverlay } from "./research-skeleton-overlay";
import {
  PersonaFrameOverlay,
  computePersonaFrames,
} from "./persona-frame-overlay";
import { SelectionToolbar } from "./selection-toolbar";
import { ClusterDialog } from "@/components/dialogs/cluster-dialog";
import { DedupDialog } from "@/components/dialogs/dedup-dialog";
import { CanvasGuide } from "./canvas-guide";
import { GuideNode } from "./guide-node";
import type { CanvasGuideData } from "@/lib/canvas/canvas-guide-types";
import type { StepCanvasSettingsData } from "@/lib/canvas/step-canvas-settings-types";
import { getStepTemplateStickyNotes, guidesToTemplateDefs } from "@/lib/canvas/template-sticky-note-config";
import { toast } from "sonner";
// JourneyMapSkeleton removed — skeleton placeholders are now integrated into GridOverlay

// Minimal shape of the Liveblocks Room we touch for multiplayer undo/redo. The
// @liveblocks/zustand middleware exposes the connected room at
// `store.getState().liveblocks.room`; this is the per-step canvas room (its
// history is where canvas mutations land), distinct from the base RoomProvider.
type LiveblocksRoomLike = {
  history: {
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
  };
  subscribe: (event: "history", callback: () => void) => () => void;
};

// Define node types OUTSIDE component for stable reference
const nodeTypes = {
  stickyNote: StickyNoteNode,
  group: GroupNode,
  drawingImage: DrawingImageNode,
  conceptCard: ConceptCardNode,
  personaTemplate: PersonaTemplateNode,
  hmwCard: HmwCardNode,
  guideNode: GuideNode,
};

// Define edge types OUTSIDE component for stable reference
const edgeTypes = {
  cluster: ClusterEdge,
};

/**
 * PresenterController — renderless component for "Follow me" presenter mode,
 * mounted only for the facilitator. While presenting, it streams the
 * facilitator's viewport CENTRE (in flow-space) + zoom into Liveblocks
 * presence on every viewport change. Followers re-centre their own viewport
 * on that point (see the follower logic in ReactFlowCanvasInner), so framing
 * stays correct regardless of each participant's screen size.
 *
 * Presenting is toggled from the facilitator toolbar via the
 * 'facilitator-presenting-changed' DOM event (matches the existing
 * facilitator-end-session bridge pattern, since the toolbar renders outside
 * ReactFlowProvider and can't read the viewport directly).
 *
 * Must render inside ReactFlowProvider (for useViewport) and RoomProvider
 * (for useUpdateMyPresence) — both hold in multiplayer.
 */
function PresenterController() {
  const viewport = useViewport(); // live { x, y, zoom }, re-renders on change
  const updateMyPresence = useUpdateMyPresence();
  const [presenting, setPresenting] = useState(false);

  // Toggle on/off from the toolbar. On "off", clear presence immediately.
  useEffect(() => {
    function onToggle(e: Event) {
      const next = Boolean((e as CustomEvent).detail?.presenting);
      setPresenting(next);
      if (!next) updateMyPresence({ presenterViewport: null });
    }
    document.addEventListener('facilitator-presenting-changed', onToggle);
    return () => document.removeEventListener('facilitator-presenting-changed', onToggle);
  }, [updateMyPresence]);

  // Always clear on unmount (e.g. step change / disconnect) so participants
  // aren't left following a stale viewport.
  useEffect(() => {
    return () => updateMyPresence({ presenterViewport: null });
  }, [updateMyPresence]);

  // Stream viewport centre while presenting. The Liveblocks client throttles
  // presence to 50ms (config.ts), so writing on every render is fine.
  useEffect(() => {
    if (!presenting) return;
    const el = document.querySelector('.react-flow');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = (rect.width / 2 - viewport.x) / viewport.zoom;
    const cy = (rect.height / 2 - viewport.y) / viewport.zoom;
    updateMyPresence({ presenterViewport: { cx, cy, zoom: viewport.zoom } });
  }, [viewport, presenting, updateMyPresence]);

  return null;
}

/** Flow-space centre point + zoom streamed by the presenter (see config.ts). */
type PresenterVp = { cx: number; cy: number; zoom: number };

/**
 * PresenterFollowSync — renderless bridge between Liveblocks presence and the
 * follower logic in ReactFlowCanvasInner. Mounted only in multiplayer.
 *
 * Reads/writes presence via @liveblocks/react hooks (the same path voting and
 * cursors use), NOT the zustand `liveblocks.others` slice — that slice doesn't
 * reliably surface UserMeta `.info`, so role-gating the presenter there fails.
 *
 *  - onPresenterChange: lifts the active owner's viewport (+ name) to the parent
 *  - isFollowing: parent-owned follow state, mirrored into our own presence so
 *    the facilitator's "N following" count works
 */
function PresenterFollowSync({
  onPresenterChange,
  isFollowing,
}: {
  onPresenterChange: (presenter: { vp: PresenterVp; name: string } | null) => void;
  isFollowing: boolean;
}) {
  const updateMyPresence = useUpdateMyPresence();

  // Only the owner/facilitator drives the view. info.role IS populated on the
  // react useOthers path (voting relies on it).
  const presenter = useOthers((others) => {
    const o = others.find(
      (u) => u.info?.role === "owner" && u.presence.presenterViewport,
    );
    return o
      ? { vp: o.presence.presenterViewport as PresenterVp, name: o.info?.name ?? "Facilitator" }
      : null;
  }, shallow);

  useEffect(() => {
    onPresenterChange(presenter);
  }, [presenter, onPresenterChange]);

  useEffect(() => {
    updateMyPresence({ followingPresenter: isFollowing });
  }, [isFollowing, updateMyPresence]);

  return null;
}

export interface ReactFlowCanvasProps {
  sessionId: string;
  stepId: string;
  workshopId: string;
  workshopType?: 'solo' | 'multiplayer';
  canvasGuides?: CanvasGuideData[];
  defaultViewportSettings?: StepCanvasSettingsData | null;
  isAdmin?: boolean;
  isAdminEditing?: boolean;
  onEditGuide?: (
    guide: CanvasGuideData,
    position: { x: number; y: number },
  ) => void;
  onAddGuide?: (position: { x: number; y: number }) => void;
  onGuidePositionUpdate?: (guideId: string, x: number, y: number) => void;
  onGuideSizeUpdate?: (
    guideId: string,
    width: number,
    height: number,
    x: number,
    y: number,
  ) => void;
  /** Called when admin drags a template sticky note — syncs position to DB guide */
  onTemplateStickyPositionSync?: (templateKey: string, x: number, y: number) => void;
  /** Called when admin deletes a template sticky note — removes the DB guide so it won't re-seed */
  onTemplateStickyDelete?: (templateKey: string) => void;
  canvasRef?: React.Ref<{
    getViewport: () => { x: number; y: number; zoom: number };
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  }>;
  conceptOwners?: Array<{ ownerId: string; ownerName: string; ownerColor: string }>;
}

function ReactFlowCanvasInner({
  sessionId,
  stepId,
  workshopId,
  workshopType,
  canvasGuides: canvasGuidesProp,
  defaultViewportSettings,
  isAdmin,
  isAdminEditing,
  onEditGuide,
  onAddGuide,
  onGuidePositionUpdate,
  onGuideSizeUpdate,
  onTemplateStickyPositionSync,
  onTemplateStickyDelete,
  canvasRef,
  conceptOwners,
}: ReactFlowCanvasProps) {
  // Store access
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const addStickyNote = useCanvasStore((s) => s.addStickyNote);
  const updateStickyNote = useCanvasStore((s) => s.updateStickyNote);
  const deleteStickyNote = useCanvasStore((s) => s.deleteStickyNote);
  const batchDeleteStickyNotes = useCanvasStore(
    (s) => s.batchDeleteStickyNotes,
  );
  const ungroupStickyNotes = useCanvasStore((s) => s.ungroupStickyNotes);
  const drawingNodes = useCanvasStore((s) => s.drawingNodes);
  const addDrawingNode = useCanvasStore((s) => s.addDrawingNode);
  const updateDrawingNode = useCanvasStore((s) => s.updateDrawingNode);
  const deleteDrawingNode = useCanvasStore((s) => s.deleteDrawingNode);
  const conceptCards = useCanvasStore((s) => s.conceptCards);
  const updateConceptCard = useCanvasStore((s) => s.updateConceptCard);
  const deleteConceptCard = useCanvasStore((s) => s.deleteConceptCard);
  const personaTemplates = useCanvasStore((s) => s.personaTemplates);
  const updatePersonaTemplate = useCanvasStore((s) => s.updatePersonaTemplate);
  const deletePersonaTemplate = useCanvasStore((s) => s.deletePersonaTemplate);
  const hmwCards = useCanvasStore((s) => s.hmwCards);
  const updateHmwCard = useCanvasStore((s) => s.updateHmwCard);
  const deleteHmwCard = useCanvasStore((s) => s.deleteHmwCard);
  const batchUpdatePositions = useCanvasStore((s) => s.batchUpdatePositions);
  const batchUpdateStickyNotes = useCanvasStore((s) => s.batchUpdateStickyNotes);
  const gridColumns = useCanvasStore((s) => s.gridColumns);
  const setGridColumns = useCanvasStore((s) => s.setGridColumns);
  const removeGridColumn = useCanvasStore((s) => s.removeGridColumn);
  const moveGridColumn = useCanvasStore((s) => s.moveGridColumn);
  const confirmPreview = useCanvasStore((s) => s.confirmPreview);
  const rejectPreview = useCanvasStore((s) => s.rejectPreview);
  const highlightedCell = useCanvasStore((s) => s.highlightedCell);
  const setHighlightedCell = useCanvasStore((s) => s.setHighlightedCell);
  const pendingFitView = useCanvasStore((s) => s.pendingFitView);
  const setPendingFitView = useCanvasStore((s) => s.setPendingFitView);
  const pendingFocusCardId = useCanvasStore((s) => s.pendingFocusCardId);
  const setPendingFocusCardId = useCanvasStore((s) => s.setPendingFocusCardId);
  const setPendingHmwChipSelection = useCanvasStore(
    (s) => s.setPendingHmwChipSelection,
  );
  const setPendingHmwFieldFocus = useCanvasStore(
    (s) => s.setPendingHmwFieldFocus,
  );
  const setPendingHmwManualComplete = useCanvasStore(
    (s) => s.setPendingHmwManualComplete,
  );
  const setActiveHmwCardId = useCanvasStore(
    (s) => s.setActiveHmwCardId,
  );
  const setSelectedStickyNoteIds = useCanvasStore(
    (s) => s.setSelectedStickyNoteIds,
  );
  const setCluster = useCanvasStore((s) => s.setCluster);
  const clearCluster = useCanvasStore((s) => s.clearCluster);
  const renameCluster = useCanvasStore((s) => s.renameCluster);
  const renamePersona = useCanvasStore((s) => s.renamePersona);
  const removeFromCluster = useCanvasStore((s) => s.removeFromCluster);

  // Store API for temporal undo/redo access
  const storeApi = useCanvasStoreApi();

  // Container ref for iOS Safari scroll prevention
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Cursor broadcast handlers ref — populated by CursorBroadcaster when multiplayer
  const cursorHandlersRef = useRef<{
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
  } | null>(null);

  // Prevent iOS Safari page scroll when panning canvas
  usePreventScrollOnCanvas(canvasContainerRef);

  // Auto-save integration — disabled in multiplayer mode (Liveblocks webhook handles persistence)
  const { saveStatus } = useCanvasAutosave(workshopId, stepId, workshopType !== 'multiplayer');

  // Multiplayer context — provides participant color for new sticky notes
  // Returns { isMultiplayer: false, participantColor: null } when not inside RoomProvider (solo mode)
  const { isMultiplayer, participantColor, isFacilitator, participantId } = useMultiplayerContext();

  // Concept card AI generation hook
  const { generating: conceptGenerating, generateAll: conceptGenerateAll, generateField: conceptGenerateField, elaborate: conceptElaborate } = useConceptCardGenerate(workshopId);

  // HMW card AI generation hook
  const { generating: hmwGenerating, generateAll: hmwGenerateAll, generateField: hmwGenerateField, elaborate: hmwElaborate } = useHmwCardGenerate(workshopId);

  // Mapping from participant hex color to the closest StickyNoteColor.
  // Matches PARTICIPANT_COLORS order in liveblocks/config.ts.
  const HEX_TO_STICKY_COLOR: Record<string, StickyNoteColor> = {
    '#b3efbd': 'green',   // facilitator
    '#ffa8db': 'pink',
    '#a8daff': 'blue',
    '#ffd3a8': 'orange',
    '#ffe299': 'yellow',
    '#ffafa3': 'red',
    '#b3f4ef': 'teal',
    '#d3bdff': 'purple',
    // Legacy nature palette (pre-Figma migration) — backward compat with stored data
    '#608850': 'green',
    '#b07068': 'pink',
    '#6888a0': 'blue',
    '#c08030': 'orange',
    '#c49820': 'yellow',
    '#a86050': 'red',
    // Legacy tailwind palette (further back) — backward compat with older stored data
    '#6366f1': 'blue',
    '#ec4899': 'pink',
    '#14b8a6': 'green',
    '#f59e0b': 'orange',
    '#84cc16': 'yellow',
    '#8b5cf6': 'red',
  };

  // Participant sticky note color — used when creating new notes in multiplayer mode
  const participantStickyColor: StickyNoteColor | undefined =
    isMultiplayer && participantColor
      ? (HEX_TO_STICKY_COLOR[participantColor.toLowerCase()] ?? 'yellow')
      : undefined;

  // Client-side template sticky note initialization — ensures templates exist even if
  // server-side seeding in page.tsx failed or data was lost. Runs once on mount.
  const templateSeededRef = useRef(false);
  useEffect(() => {
    if (templateSeededRef.current) return;
    const currentStickyNotes = storeApi.getState().stickyNotes;
    const hasTemplates = currentStickyNotes.some((p) => p.templateKey);
    if (!hasTemplates) {
      let templateDefs = guidesToTemplateDefs(canvasGuidesProp || []);
      if (templateDefs.length === 0) {
        templateDefs = getStepTemplateStickyNotes(stepId);
      }
      if (templateDefs.length > 0) {
        console.log(
          "[canvas] Client-side template seeding:",
          templateDefs.length,
          "templates for step",
          stepId,
        );
        templateSeededRef.current = true;
        for (const def of templateDefs) {
          addStickyNote({
            id: crypto.randomUUID(),
            text: "",
            position: def.position,
            width: def.width,
            height: def.height,
            color: def.color,
            type: "stickyNote",
            templateKey: def.key,
            templateLabel: def.label,
            placeholderText: def.placeholderText,
          });
        }
        // Save to DB immediately so the AI API route can read template state
        const allStickyNotes = storeApi.getState().stickyNotes;
        saveCanvasState(workshopId, stepId, {
          stickyNotes: allStickyNotes,
        }).then((result) => {
          console.log("[canvas] Client-side template save result:", result);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step-specific canvas configuration
  const stepConfig = getStepCanvasConfig(stepId);

  // Whether canvas has any user content (unfilled template sticky notes don't count)
  const canvasHasItems =
    stickyNotes.some((p) => !p.templateKey || p.text.trim().length > 0) ||
    personaTemplates.length > 0 ||
    hmwCards.length > 0 ||
    conceptCards.length > 0;

  // Canvas guide objects (instructional stickers/hints on the canvas)
  const stepGuides = canvasGuidesProp || [];
  const pinnedGuides = useMemo(
    () => stepGuides.filter((g) => g.placementMode !== "on-canvas"),
    [stepGuides],
  );
  const onCanvasGuides = useMemo(
    () => stepGuides.filter((g) => g.placementMode === "on-canvas"),
    [stepGuides],
  );
  const [dismissedGuideIds, setDismissedGuideIds] = useState<Set<string>>(
    new Set(),
  );
  const [exitingGuideIds, setExitingGuideIds] = useState<Set<string>>(
    new Set(),
  );

  // Editing state - track which node is being edited
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Dragging state - track which node is being dragged for visual feedback
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Tick that forces the `nodes` useMemo to recompute when auto-fit writes new
  // dimensions to the liveDimensions ref (refs alone don't trigger re-render).
  const [autoResizeTick, setAutoResizeTick] = useState(0);

  // Clear stale guide livePositions when guide data updates (e.g. from edit popover)
  // so that prop positions take precedence over cached drag positions.
  useEffect(() => {
    for (const key of Object.keys(livePositions.current)) {
      if (key.startsWith("guide-") && draggingNodeId !== key) {
        delete livePositions.current[key];
      }
    }
  }, [onCanvasGuides, draggingNodeId]);

  // Z-index management - bring selected/dragged/new nodes to front.
  // Stored as a ref (not state) so updates don't trigger useMemo recomputation
  // during drag, which would reset node positions to stale store values.
  const nodeZIndicesRef = useRef<Record<string, number>>({});
  const zIndexCounter = useRef(100);

  // Pointer/Hand tool state
  const [activeTool, setActiveTool] = useState<"pointer" | "hand">("pointer");

  // ReactFlow hooks
  const {
    screenToFlowPosition,
    fitView,
    setViewport,
    getViewport,
    setCenter,
    getNodes,
  } = useReactFlow();

  // Expose getViewport and screenToFlowPosition to parent via canvasRef
  useImperativeHandle(
    canvasRef,
    () => ({
      getViewport: () => getViewport(),
      screenToFlowPosition: (pos: { x: number; y: number }) => screenToFlowPosition(pos),
    }),
    [getViewport, screenToFlowPosition],
  );

  // Fit view with chat panel offset — shifts content right so it's centered
  // in the visible area (not obscured by the floating chat panel overlay).
  const CHAT_PANEL_WIDTH = 480;
  const fitViewWithChatOffset = useCallback(
    (options?: Parameters<typeof fitView>[0]) => {
      fitView(options);
      // After fitView settles, nudge viewport right to account for chat panel
      setTimeout(() => {
        const vp = getViewport();
        setViewport(
          { x: vp.x + (CHAT_PANEL_WIDTH * vp.zoom) / 2, y: vp.y, zoom: vp.zoom },
          { duration: options?.duration ?? 0 },
        );
      }, (options?.duration ?? 0) + 50);
    },
    [fitView, getViewport, setViewport],
  );

  // Track if we've done initial fitView
  const hasFitView = useRef(false);

  // Double-click detection for pane
  const lastPaneClickTime = useRef(0);
  const DOUBLE_CLICK_THRESHOLD = 300; // ms

  // Track previous sticky note count for fitView logic
  const previousStickyNoteCount = useRef(stickyNotes.length);

  // Bring a node to the top of the z-index stack.
  // Mutates ref only — no state update, no useMemo recomputation.
  // The new zIndex is picked up the next time useMemo runs for other reasons
  // (e.g. selectedNodeIds change on click, or store update on drag end).
  const bringToFront = useCallback((nodeId: string) => {
    zIndexCounter.current += 1;
    nodeZIndicesRef.current = {
      ...nodeZIndicesRef.current,
      [nodeId]: zIndexCounter.current,
    };
  }, []);

  // Dismiss auto-dismiss guides (called on first canvas interaction)
  const dismissAutoGuides = useCallback(() => {
    const autoIds = stepGuides
      .filter(
        (g) =>
          g.dismissBehavior === "auto-dismiss" && !dismissedGuideIds.has(g.id),
      )
      .map((g) => g.id);
    if (autoIds.length === 0) return;
    setExitingGuideIds((prev) => new Set([...prev, ...autoIds]));
    setTimeout(() => {
      setDismissedGuideIds((prev) => new Set([...prev, ...autoIds]));
      setExitingGuideIds((prev) => {
        const next = new Set(prev);
        autoIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 200);
  }, [stepGuides, dismissedGuideIds]);

  // Dismiss a single guide (for hover-X)
  const dismissGuide = useCallback((id: string) => {
    setExitingGuideIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setDismissedGuideIds((prev) => new Set([...prev, id]));
      setExitingGuideIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }, []);

  // Live positions during drag — REFS to avoid re-renders during manipulation.
  // ReactFlow manages drag visuals internally; these refs are a safety net so
  // that when useMemo DOES recompute (from unrelated state changes), it uses
  // current values instead of stale store positions.
  const livePositions = useRef<Record<string, { x: number; y: number }>>({});

  // Live dimensions during resize — same ref strategy as positions.
  // Note: this is *also* written by handleAutoResize for every rendered sticky
  // (grow-to-fit text), so presence in this map does NOT mean "actively
  // resizing." Use activelyResizingIds for that — see handleNodesChange.
  const liveDimensions = useRef<
    Record<string, { width: number; height: number }>
  >({});

  // Ids currently mid-drag of a NodeResizer handle. Distinct from
  // liveDimensions because that map also caches auto-fit dimensions for every
  // sticky. handleNodesChange uses this to skip the stray position events
  // NodeResizer emits when the top/left handles drag the node.
  const activelyResizingIds = useRef<Set<string>>(new Set());

  // Continuous resize handler — updates ref only, no re-renders
  const handleResize = useCallback(
    (id: string, width: number, height: number) => {
      liveDimensions.current[id] = { width, height };
      activelyResizingIds.current.add(id);
    },
    [],
  );

  // Auto-fit text-driven resize from the sticky-note-node measurement effect.
  // Same liveDimensions storage as manual resize, but bumps a tick so the
  // nodes useMemo recomputes and the new height flows into ReactFlow.
  const handleAutoResize = useCallback(
    (id: string, width: number, height: number) => {
      const prev = liveDimensions.current[id];
      if (prev && prev.width === width && prev.height === height) return;
      liveDimensions.current[id] = { width, height };
      setAutoResizeTick((t) => t + 1);
    },
    [],
  );

  // Resize end — clear ref and persist final values to store.
  // Position is included because resizing from top/left edges moves the node.
  const handleResizeEnd = useCallback(
    (id: string, width: number, height: number, x: number, y: number) => {
      delete liveDimensions.current[id];
      activelyResizingIds.current.delete(id);
      updateStickyNote(id, {
        width: Math.round(width),
        height: Math.round(height),
        position: { x: Math.round(x), y: Math.round(y) },
      });
    },
    [updateStickyNote],
  );

  // Guide resize handler — updates liveDimensions ref (no re-render)
  const handleGuideResize = useCallback(
    (guideId: string, width: number, height: number) => {
      liveDimensions.current[`guide-${guideId}`] = { width, height };
    },
    [],
  );

  // Guide resize end — clear ref, update livePositions, call parent callback
  const handleGuideResizeEnd = useCallback(
    (guideId: string, width: number, height: number, x: number, y: number) => {
      delete liveDimensions.current[`guide-${guideId}`];
      livePositions.current[`guide-${guideId}`] = {
        x: Math.round(x),
        y: Math.round(y),
      };
      if (onGuideSizeUpdate) {
        onGuideSizeUpdate(
          guideId,
          Math.round(width),
          Math.round(height),
          Math.round(x),
          Math.round(y),
        );
      }
    },
    [onGuideSizeUpdate],
  );

  // Grid snap size (matches dot grid)
  const GRID_SIZE = 20;

  // Undo/redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Context menu state for color picker / uncluster
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
    currentColor: StickyNoteColor;
    nodeType: string;
    isClusterParent?: boolean;
    stickyNoteText?: string;
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
    drawingId?: string; // undefined = new drawing, string = re-editing
    initialElements?: DrawingElement[];
    initialBackgroundImageUrl?: string | null;
  } | null>(null);

  // EzyDraw single-editor lock helpers (multiplayer only)
  // Uses Zustand liveblocks state to avoid conditional hook calls.
  // In solo mode, liveblocks is undefined — all operations are no-ops.
  const lbOthers = useCanvasStore((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lb = (s as any).liveblocks;
    return (lb?.others as Array<{ presence: { editingDrawingNodeId: string | null } }>) ?? [];
  });

  const isDrawingLockedByOther = useCallback(
    (drawingNodeId: string): boolean => {
      if (!isMultiplayer) return false;
      return lbOthers.some((o) => o.presence.editingDrawingNodeId === drawingNodeId);
    },
    [isMultiplayer, lbOthers],
  );

  const getLockingUser = useCallback(
    (drawingNodeId: string) => {
      if (!isMultiplayer) return null;
      return lbOthers.find((o) => o.presence.editingDrawingNodeId === drawingNodeId) ?? null;
    },
    [isMultiplayer, lbOthers],
  );

  const lockDrawingInPresence = useCallback(
    (drawingNodeId: string) => {
      if (!isMultiplayer) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lb = (storeApi.getState() as any).liveblocks;
      lb?.room?.updatePresence({ editingDrawingNodeId: drawingNodeId });
    },
    [isMultiplayer, storeApi],
  );

  const unlockDrawingInPresence = useCallback(() => {
    if (!isMultiplayer) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lb = (storeApi.getState() as any).liveblocks;
    lb?.room?.updatePresence({ editingDrawingNodeId: null });
  }, [isMultiplayer, storeApi]);

  // --- "Follow me" presenter mode (follower side) -------------------------
  // The active presenter's viewport is read from Liveblocks presence by the
  // renderless PresenterFollowSync child (react hooks, mounted only in
  // multiplayer) and lifted here. The facilitator streams the centre point; we
  // re-centre our own viewport on it.
  const [presenter, setPresenter] = useState<{ vp: PresenterVp; name: string } | null>(null);
  const handlePresenterChange = useCallback(
    (p: { vp: PresenterVp; name: string } | null) => setPresenter(p),
    [],
  );
  const presenterViewport = presenter?.vp ?? null;
  const presenterName = presenter?.name ?? null;

  // idle → not following · following → locked to presenter · brokeOut → user
  // moved away while the presenter is still active (offer a "Return" button).
  const [followState, setFollowState] = useState<"idle" | "following" | "brokeOut">("idle");
  const followStateRef = useRef(followState);
  useEffect(() => {
    followStateRef.current = followState;
  }, [followState]);
  // When true, the next viewport application animates (initial snap / resume);
  // continuous tracking applies instantly so it doesn't lag the presenter.
  const animateNextFollowRef = useRef(false);

  const applyPresenterViewport = useCallback(
    (vp: PresenterVp, animate: boolean) => {
      const el = document.querySelector(".react-flow");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setViewport(
        {
          x: rect.width / 2 - vp.cx * vp.zoom,
          y: rect.height / 2 - vp.cy * vp.zoom,
          zoom: vp.zoom,
        },
        { duration: animate ? 400 : 0 },
      );
    },
    [setViewport],
  );

  // Auto-follow when a presenter becomes active; release when they stop.
  useEffect(() => {
    if (presenterViewport && followState === "idle") {
      animateNextFollowRef.current = true;
      setFollowState("following");
    } else if (!presenterViewport && followState !== "idle") {
      setFollowState("idle");
    }
  }, [presenterViewport, followState]);

  // Track the presenter while following — paused if we're editing a node.
  useEffect(() => {
    if (followState !== "following" || !presenterViewport) return;
    if (editingNodeId) {
      // Don't yank the user mid-edit; animate the catch-up once they finish.
      animateNextFollowRef.current = true;
      return;
    }
    applyPresenterViewport(presenterViewport, animateNextFollowRef.current);
    animateNextFollowRef.current = false;
  }, [followState, presenterViewport, editingNodeId, applyPresenterViewport]);

  // (followingPresenter is mirrored into presence by PresenterFollowSync.)

  const handleExitFollow = useCallback(() => setFollowState("brokeOut"), []);
  const handleReturnFollow = useCallback(() => {
    animateNextFollowRef.current = true;
    setFollowState("following");
  }, []);

  // Cluster dialog state
  const [clusterDialogOpen, setClusterDialogOpen] = useState(false);

  // Dedup dialog state
  const [dedupDialogOpen, setDedupDialogOpen] = useState(false);

  const [dedupGroups, setDedupGroups] = useState<
    Array<{ text: string; count: number; ids: string[] }>
  >([]);

  // Track whether initial gridColumns were provided (from saved state)
  const hadInitialGridColumns = useRef(gridColumns.length > 0);

  // Initialize gridColumns from stepConfig on mount (when store has empty gridColumns but step has gridConfig)
  useEffect(() => {
    if (
      stepConfig.hasGrid &&
      stepConfig.gridConfig &&
      !hadInitialGridColumns.current &&
      gridColumns.length === 0
    ) {
      // Seed dynamic columns from static step config (first visit only)
      // Only runs if store was initialized with empty gridColumns (no saved state)
      const initialColumns: GridColumn[] = stepConfig.gridConfig.columns.map(
        (col) => ({
          id: col.id,
          label: col.label,
          width: col.width,
        }),
      );
      setGridColumns(initialColumns);
    }
  }, [stepConfig, gridColumns.length, setGridColumns]);

  // Build dynamic gridConfig from store columns (fall back to static config for
  // first render), then grow each row's height to fit its packed notes so cells
  // never overflow (journey map). Columns keep their user-managed widths.
  const dynamicGridConfig = useMemo<GridConfig | undefined>(() => {
    if (!stepConfig.hasGrid || !stepConfig.gridConfig)
      return undefined;
    const base = {
      ...stepConfig.gridConfig,
      columns: gridColumns.length > 0 ? gridColumns : stepConfig.gridConfig.columns,
    };
    return withDynamicRowHeightsFromNotes(base, stickyNotes);
  }, [stepConfig, gridColumns, stickyNotes]);

  // Empathy map: derive zone bounds from the current notes so containers grow +
  // stay aligned (see pack-layout.ts). Falls back to the static config bounds.
  const dynamicEmpathyConfig = useMemo<EmpathyZoneConfig | undefined>(() => {
    if (!stepConfig.hasEmpathyZones || !stepConfig.empathyZoneConfig)
      return undefined;
    const bounds = empathyBoundsFromNotes(stickyNotes);
    const staticZones = stepConfig.empathyZoneConfig.zones;
    const zones = {} as EmpathyZoneConfig["zones"];
    (Object.keys(staticZones) as Array<keyof typeof staticZones>).forEach((z) => {
      zones[z] = { ...staticZones[z], bounds: bounds[z] };
    });
    return { zones };
  }, [stepConfig, stickyNotes]);

  // Latest-value ref so the (deps-stable) create/drag callbacks detect zones
  // against the grown bounds without needing the memo in their dep arrays.
  const empathyConfigRef = useRef<EmpathyZoneConfig | undefined>(
    stepConfig.empathyZoneConfig,
  );
  empathyConfigRef.current =
    dynamicEmpathyConfig ?? stepConfig.empathyZoneConfig;

  // Derive cluster edges from sticky notes
  const clusterEdges = useMemo<Edge[]>(() => {
    if (!stepConfig.hasRings) return [];
    const items = stickyNotes.filter(
      (p) => (!p.type || p.type === "stickyNote") && !p.isPreview,
    );
    // Build text-to-id map for parent matching
    const textToId = new Map<string, string>();
    for (const item of items) {
      textToId.set(item.text.toLowerCase(), item.id);
    }
    const edges: Edge[] = [];
    for (const item of items) {
      if (!item.cluster) continue;
      const parentId = textToId.get(item.cluster.toLowerCase());
      if (!parentId || parentId === item.id) continue;
      edges.push({
        id: `cluster-${parentId}-${item.id}`,
        source: parentId,
        target: item.id,
        type: "cluster",
      });
    }
    return edges;
  }, [stickyNotes, stepConfig.hasRings]);

  // Compute existing cluster names and parent metadata for node data
  const { existingClusters, clusterParentMap } = useMemo(() => {
    const items = stickyNotes.filter(
      (p) => (!p.type || p.type === "stickyNote") && !p.isPreview,
    );
    const clusterSet = new Map<
      string,
      { displayName: string; count: number }
    >();
    for (const item of items) {
      if (!item.cluster) continue;
      const key = item.cluster.toLowerCase();
      const existing = clusterSet.get(key);
      if (existing) {
        existing.count++;
      } else {
        clusterSet.set(key, { displayName: item.cluster, count: 1 });
      }
    }
    // Build parentMap: stickyNote text lowercase → { label, count } for items that are cluster parents
    const parentMap = new Map<string, { label: string; count: number }>();
    for (const [key, { displayName, count }] of clusterSet) {
      parentMap.set(key, { label: displayName, count });
    }
    return {
      existingClusters: Array.from(clusterSet.values()).map(
        (v) => v.displayName,
      ),
      clusterParentMap: parentMap,
    };
  }, [stickyNotes]);

  // Snap position to grid
  const snapToGrid = useCallback(
    (position: { x: number; y: number }) => ({
      x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
    }),
    [],
  );

  // Undo/redo handlers. Solo uses zundo (temporal middleware). Multiplayer uses
  // the Liveblocks per-client history of the CANVAS store's own room — which the
  // @liveblocks/zustand middleware connects to a PER-STEP room
  // (`<roomId>-step-<stepId>`), NOT the base RoomProvider room. So we must reach
  // the room through the store (storeApi), not via @liveblocks/react hooks.
  const getCanvasRoom = useCallback((): LiveblocksRoomLike | null => {
    const lb = (
      storeApi.getState() as unknown as {
        liveblocks?: { room?: LiveblocksRoomLike | null };
      }
    ).liveblocks;
    return lb?.room ?? null;
  }, [storeApi]);

  const handleUndo = useCallback(() => {
    if (isMultiplayer) {
      getCanvasRoom()?.history.undo();
      return;
    }
    const temporalStore = storeApi.temporal;
    if (!temporalStore) return;
    const pastStates = temporalStore.getState().pastStates;
    if (pastStates.length > 0) {
      temporalStore.getState().undo();
    }
  }, [isMultiplayer, getCanvasRoom, storeApi]);

  const handleRedo = useCallback(() => {
    if (isMultiplayer) {
      getCanvasRoom()?.history.redo();
      return;
    }
    const temporalStore = storeApi.temporal;
    if (!temporalStore) return;
    const futureStates = temporalStore.getState().futureStates;
    if (futureStates.length > 0) {
      temporalStore.getState().redo();
    }
  }, [isMultiplayer, getCanvasRoom, storeApi]);

  // Keyboard shortcuts for undo/redo
  useHotkeys(
    "mod+z",
    (e) => {
      e.preventDefault();
      handleUndo();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    ["mod+shift+z", "ctrl+y"],
    (e) => {
      e.preventDefault();
      handleRedo();
    },
    { enableOnFormTags: false },
  );

  // Enter → edit the selected sticky note. Only fires when not already editing
  // and exactly one sticky note is selected (so it doesn't fight multi-select or
  // other node types). Escape-to-exit is handled by the textarea's own onKeyDown.
  useHotkeys(
    "enter",
    (e) => {
      if (editingNodeId) return;
      const selectedStickies = getNodes().filter(
        (n) => n.type === "stickyNote" && n.selected,
      );
      if (selectedStickies.length === 1) {
        e.preventDefault();
        setEditingNodeId(selectedStickies[0].id);
      }
    },
    { enableOnFormTags: false },
  );

  // Spacebar hold → temporary Hand tool (only when not editing text)
  useHotkeys(
    "space",
    () => {
      if (!editingNodeId) setActiveTool("hand");
    },
    { keydown: true, keyup: false, enableOnFormTags: false },
  );
  useHotkeys(
    "space",
    () => {
      if (!editingNodeId) setActiveTool("pointer");
    },
    { keydown: false, keyup: true, enableOnFormTags: false },
  );

  // Subscribe to temporal store for undo/redo state (temporal absent on multiplayer stores)
  useEffect(() => {
    const temporalStore = storeApi.temporal;
    if (!temporalStore) return;
    const unsubscribe = temporalStore.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });
    return unsubscribe;
  }, [storeApi]);

  // Multiplayer: drive canUndo/canRedo from the canvas store's room history.
  // The room arrives asynchronously (after enterRoom) and changes on step
  // switches, so we watch the store for the room and (re)subscribe to its
  // "history" event. Identity-checked so per-keystroke store updates are cheap.
  useEffect(() => {
    if (!isMultiplayer) return;
    let attachedRoom: LiveblocksRoomLike | null = null;
    let historyUnsub: (() => void) | undefined;
    const attach = (room: LiveblocksRoomLike | null) => {
      if (room === attachedRoom) return;
      historyUnsub?.();
      attachedRoom = room;
      if (!room) {
        setCanUndo(false);
        setCanRedo(false);
        return;
      }
      const sync = () => {
        setCanUndo(room.history.canUndo());
        setCanRedo(room.history.canRedo());
      };
      sync();
      historyUnsub = room.subscribe("history", sync);
    };
    attach(getCanvasRoom());
    const storeUnsub = storeApi.subscribe(() => attach(getCanvasRoom()));
    return () => {
      storeUnsub();
      historyUnsub?.();
    };
  }, [isMultiplayer, getCanvasRoom, storeApi]);

  // Helper: create a sticky note with pre-generated ID so editing + z-index
  // are set synchronously BEFORE the store update. This eliminates the
  // one-frame delay that caused broken auto-focus and z-index on creation.
  const createAndEditStickyNote = useCallback(
    (stickyNote: Omit<import("@/stores/canvas-store").StickyNote, "id">) => {
      const newId = crypto.randomUUID();
      bringToFront(newId);
      setEditingNodeId(newId);
      addStickyNote({ ...stickyNote, id: newId });
    },
    [bringToFront, addStickyNote],
  );

  // Keep previousStickyNoteCount in sync for fitView logic
  useEffect(() => {
    previousStickyNoteCount.current = stickyNotes.length;
  }, [stickyNotes.length]);

  // Handle text change from StickyNoteNode textarea
  const handleTextChange = useCallback(
    (id: string, text: string) => {
      updateStickyNote(id, { text });
    },
    [updateStickyNote],
  );

  // Rename a user-research persona: rewrite the card's first name + re-point every
  // child insight's cluster (store action), then update the Step 5 snapshot so the
  // new name carries forward. Reads the OLD first name before the store mutates.
  const handlePersonaRename = useCallback(
    (id: string, newName: string) => {
      const card = storeApi.getState().stickyNotes.find((n) => n.id === id);
      const trimmed = newName.trim();
      if (!card || !trimmed) return;
      const commaIdx = card.text.indexOf(",");
      const oldFirstName = (commaIdx > 0 ? card.text.slice(0, commaIdx) : card.text).trim();
      renamePersona(id, trimmed);
      if (oldFirstName && oldFirstName.toLowerCase() !== trimmed.toLowerCase()) {
        // Snapshot lives under the user-research step regardless of current step.
        void renamePersonaCandidate(workshopId, "user-research", oldFirstName, trimmed);
      }
    },
    [storeApi, renamePersona, workshopId],
  );

  // Handle edit complete (textarea blur). Persist any auto-fit dimensions so
  // the grown size sticks across reloads and is visible to other participants.
  const handleEditComplete = useCallback((id: string) => {
    setEditingNodeId(null);
    const dims = liveDimensions.current[id];
    if (dims) {
      updateStickyNote(id, { width: Math.round(dims.width), height: Math.round(dims.height) });
      delete liveDimensions.current[id];
    }
  }, [updateStickyNote]);

  // Handle concept card reassignment (facilitator only)
  const handleConceptReassign = useCallback(
    (cardId: string, ownerId: string, ownerName: string, ownerColor: string) => {
      updateConceptCard(cardId, { ownerId, ownerName, ownerColor });
    },
    [updateConceptCard],
  );

  // Handle HMW card reassignment (facilitator only)
  const handleHmwReassign = useCallback(
    (cardId: string, ownerId: string, ownerName: string, ownerColor: string) => {
      updateHmwCard(cardId, { ownerId, ownerName, ownerColor });
    },
    [updateHmwCard],
  );

  // Build HMW owners list from current HMW cards (self-contained, no server prop dependency)
  const hmwOwners = useMemo(() => {
    if (!isMultiplayer) return undefined;
    const seen = new Set<string>();
    const owners: Array<{ ownerId: string; ownerName: string; ownerColor: string }> = [];
    for (const card of hmwCards) {
      if (card.ownerId && card.ownerName && card.ownerColor && !seen.has(card.ownerId)) {
        seen.add(card.ownerId);
        owners.push({ ownerId: card.ownerId, ownerName: card.ownerName, ownerColor: card.ownerColor });
      }
    }
    return owners.length > 0 ? owners : undefined;
  }, [isMultiplayer, hmwCards]);

  // Handle concept card field changes
  const handleConceptFieldChange = useCallback(
    (id: string, field: string, value: string) => {
      // Handle nested fields like 'billboardHero.headline'
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        const card = conceptCards.find((c) => c.id === id);
        if (card && card[parent as keyof ConceptCardData]) {
          updateConceptCard(id, {
            [parent]: {
              ...(card[parent as keyof ConceptCardData] as Record<
                string,
                unknown
              >),
              [child]: value,
            },
          });
        }
      } else {
        updateConceptCard(id, { [field]: value });
      }
    },
    [conceptCards, updateConceptCard],
  );

  const handleConceptSWOTChange = useCallback(
    (id: string, quadrant: string, index: number, value: string) => {
      const card = conceptCards.find((c) => c.id === id);
      if (!card) return;

      const updatedQuadrant = [
        ...card.swot[quadrant as keyof typeof card.swot],
      ];
      updatedQuadrant[index] = value;

      updateConceptCard(id, {
        swot: {
          ...card.swot,
          [quadrant]: updatedQuadrant,
        },
      });
    },
    [conceptCards, updateConceptCard],
  );

  // Handle persona template field changes
  const handlePersonaFieldChange = useCallback(
    (id: string, field: string, value: string) => {
      if (field === "age") {
        const parsed = parseInt(value, 10);
        updatePersonaTemplate(id, { age: isNaN(parsed) ? undefined : parsed });
      } else {
        updatePersonaTemplate(id, { [field]: value });
      }
    },
    [updatePersonaTemplate],
  );

  // Assemble a complete HMW statement from the 4 field values
  const assembleHmwStatement = useCallback((merged: {
    givenThat?: string; persona?: string; immediateGoal?: string; deeperGoal?: string;
  }): string | undefined => {
    if (!merged.givenThat || !merged.persona || !merged.immediateGoal || !merged.deeperGoal) return undefined;
    const strip = (s?: string) => s?.replace(/\.+$/, '') ?? '';
    const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    return `Given that ${lcFirst(strip(merged.givenThat))}, how might we help ${lcFirst(strip(merged.persona))} ${lcFirst(strip(merged.immediateGoal))} so they can ${lcFirst(strip(merged.deeperGoal))}?`;
  }, []);

  // Handle HMW card field changes (manual text edits). Typing into a field
  // should feel exactly like picking a chip: completing an intermediate field
  // advances the card to the next one with fresh, context-aware suggestions.
  // - Last field filled → pendingHmwManualComplete (confirm/move-on prompt).
  // - Intermediate field newly filled → pendingHmwChipSelection {custom} so the
  //   AI keeps the typed text verbatim and suggests the NEXT field.
  const handleHmwFieldChange = useCallback(
    (id: string, field: string, value: string) => {
      const HMW_FIELD_ORDER = ['givenThat', 'persona', 'immediateGoal', 'deeperGoal'];
      const card = hmwCards.find((c) => c.id === id);
      const prevValue = card
        ? (card as Record<string, unknown>)[field]
        : undefined;
      const justCompleted = !prevValue && !!value.trim();

      // Clear this field's suggestions. When the field is newly completed, also
      // drop stale suggestions on all LATER fields — they were derived from the
      // old context and would otherwise linger as unrelated options.
      const updatedSuggestions = card?.suggestions
        ? ({ ...card.suggestions } as Record<string, string[]>)
        : undefined;
      if (updatedSuggestions) {
        updatedSuggestions[field] = [];
        if (justCompleted) {
          const idx = HMW_FIELD_ORDER.indexOf(field);
          if (idx >= 0) {
            for (const k of HMW_FIELD_ORDER.slice(idx + 1)) updatedSuggestions[k] = [];
          }
        }
      }

      const merged = { ...card, [field]: value };
      const fullStatement = assembleHmwStatement(merged);
      updateHmwCard(id, {
        [field]: value,
        ...(updatedSuggestions ? { suggestions: updatedSuggestions } : {}),
        ...(fullStatement ? { fullStatement } : {}),
      });

      const wasIncomplete =
        !card?.givenThat ||
        !card?.persona ||
        !card?.immediateGoal ||
        !card?.deeperGoal;
      const nowComplete =
        !!merged.givenThat &&
        !!merged.persona &&
        !!merged.immediateGoal &&
        !!merged.deeperGoal;
      if (wasIncomplete && nowComplete) {
        // Filled the last field by hand → confirm/move-on prompt.
        setPendingHmwManualComplete({ cardId: id });
      } else if (justCompleted) {
        // Completed an intermediate field by hand → advance like a chip pick.
        setActiveHmwCardId(id);
        setPendingHmwChipSelection({ cardId: id, field, value, custom: true });
      }
    },
    [
      hmwCards,
      updateHmwCard,
      assembleHmwStatement,
      setPendingHmwManualComplete,
      setPendingHmwChipSelection,
      setActiveHmwCardId,
    ],
  );

  // Handle HMW card chip selection — sets field value, clears that field's suggestions, and signals chat
  const handleHmwChipSelect = useCallback(
    (id: string, field: string, value: string) => {
      // Set the field value + clear that field's suggestions in one update
      const card = hmwCards.find((c) => c.id === id);
      const updatedSuggestions = card?.suggestions
        ? { ...card.suggestions, [field]: [] }
        : undefined;
      const merged = { ...card, [field]: value };
      const fullStatement = assembleHmwStatement(merged);
      updateHmwCard(id, {
        [field]: value,
        ...(updatedSuggestions ? { suggestions: updatedSuggestions } : {}),
        ...(fullStatement ? { fullStatement } : {}),
      });
      // Signal chat-panel to send a message + track active card for targeting
      setActiveHmwCardId(id);
      setPendingHmwChipSelection({ cardId: id, field, value });
    },
    [hmwCards, updateHmwCard, setPendingHmwChipSelection, setActiveHmwCardId, assembleHmwStatement],
  );

  // Handle HMW card full statement edit
  const handleHmwStatementChange = useCallback(
    (id: string, value: string) => {
      updateHmwCard(id, { fullStatement: value });
    },
    [updateHmwCard],
  );

  // Handle HMW field focus — triggers AI suggestion generation for empty fields
  const handleHmwFieldFocus = useCallback(
    (id: string, field: string) => {
      setActiveHmwCardId(id);
      setPendingHmwFieldFocus({ cardId: id, field });
    },
    [setPendingHmwFieldFocus, setActiveHmwCardId],
  );

  // Handle persona avatar generation
  const handleGenerateAvatar = useCallback(
    async (templateId: string): Promise<string | null> => {
      const persona = personaTemplates.find((t) => t.id === templateId);
      if (!persona) return null;

      try {
        const res = await fetch("/api/ai/generate-persona-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workshopId,
            templateId,
            name: persona.name,
            age: persona.age,
            job: persona.job,
            archetype: persona.archetype,
            archetypeRole: persona.archetypeRole,
            empathyPains: persona.empathyPains,
            empathyGains: persona.empathyGains,
            narrative: persona.narrative,
            quote: persona.quote,
            ...(persona.avatarUrl?.startsWith('https://') ? { previousAvatarUrl: persona.avatarUrl } : {}),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 403 && errData.error === 'generation_limit_reached') {
            const { toast } = await import('sonner');
            toast.error(errData.message);
          } else {
            console.error("Failed to generate persona image:", errData);
          }
          return null;
        }

        const { imageUrl } = await res.json();
        updatePersonaTemplate(templateId, { avatarUrl: imageUrl });
        return imageUrl;
      } catch (error) {
        console.error("Error generating persona avatar:", error);
        return null;
      }
    },
    [personaTemplates, workshopId, updatePersonaTemplate],
  );

  // Fill the persona card's empty AI zones (empathy fields, narrative, quote)
  // grounded in the workshop research. Only empty fields are applied so we never
  // clobber the user's edits or AI content already on the card.
  const handleFillPersonaFields = useCallback(
    async (templateId: string): Promise<void> => {
      const persona = personaTemplates.find((t) => t.id === templateId);
      if (!persona) return;

      const res = await fetch("/api/ai/persona-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshopId,
          templateId,
          persona: {
            name: persona.name,
            age: persona.age,
            job: persona.job,
            archetype: persona.archetype,
            archetypeRole: persona.archetypeRole,
            empathySays: persona.empathySays,
            empathyThinks: persona.empathyThinks,
            empathyFeels: persona.empathyFeels,
            empathyDoes: persona.empathyDoes,
            empathyPains: persona.empathyPains,
            empathyGains: persona.empathyGains,
            narrative: persona.narrative,
            quote: persona.quote,
          },
        }),
      });

      if (!res.ok) {
        const { toast } = await import("sonner");
        if (res.status === 429) {
          toast.error("Slow down a moment — too many AI requests. Try again shortly.");
        } else {
          toast.error("Couldn't complete the persona. Please try again.");
        }
        return;
      }

      const { data } = (await res.json()) as {
        data: Record<string, string>;
      };
      if (!data) return;

      // Apply only to zones that are currently empty — never overwrite content.
      const fillable = [
        "empathySays",
        "empathyThinks",
        "empathyFeels",
        "empathyDoes",
        "empathyPains",
        "empathyGains",
        "narrative",
        "quote",
      ] as const;
      const updates: Record<string, string> = {};
      for (const field of fillable) {
        const current = persona[field as keyof typeof persona];
        const isEmpty = !(typeof current === "string" && current.trim());
        if (isEmpty && data[field]?.trim()) {
          updates[field] = data[field].trim();
        }
      }

      if (Object.keys(updates).length > 0) {
        updatePersonaTemplate(templateId, updates);
      } else {
        const { toast } = await import("sonner");
        toast.info("This persona's zones are already filled in.");
      }
    },
    [personaTemplates, workshopId, updatePersonaTemplate],
  );

  const handleConceptFeasibilityChange = useCallback(
    (id: string, dimension: string, score?: number, rationale?: string) => {
      const card = conceptCards.find((c) => c.id === id);
      if (!card) return;

      const currentDimension =
        card.feasibility[dimension as keyof typeof card.feasibility];

      updateConceptCard(id, {
        feasibility: {
          ...card.feasibility,
          [dimension]: {
            score: score !== undefined ? score : currentDimension.score,
            rationale:
              rationale !== undefined ? rationale : currentDimension.rationale,
          },
        },
      });
    },
    [conceptCards, updateConceptCard],
  );

  // Handle preview confirmation and rejection
  const handleConfirmPreview = useCallback(
    (id: string) => {
      confirmPreview(id);
      setHighlightedCell(null);
    },
    [confirmPreview],
  );

  const handleRejectPreview = useCallback(
    (id: string) => {
      rejectPreview(id);
      setHighlightedCell(null);
    },
    [rejectPreview],
  );

  // Convert store sticky notes to ReactFlow nodes
  const nodes = useMemo<Node[]>(() => {
    // Sort: groups first (parents before children for ReactFlow)
    const sorted = [...stickyNotes].sort((a, b) => {
      if (a.type === "group" && b.type !== "group") return -1;
      if (a.type !== "group" && b.type === "group") return 1;
      return 0;
    });

    const stickyNoteReactFlowNodes: Node[] = sorted.map((stickyNote) => {
      const isPreview = stickyNote.isPreview === true;
      // Use live ref values during drag/resize — safety net so that IF useMemo
      // recomputes mid-manipulation (from unrelated state changes), it reads
      // current values instead of stale store positions/dimensions.
      const livePos = livePositions.current[stickyNote.id];
      const liveDims = liveDimensions.current[stickyNote.id];

      // Cluster parent badge data
      const clusterInfo = clusterParentMap.get(stickyNote.text.toLowerCase());

      return {
        id: stickyNote.id,
        type: stickyNote.type || "stickyNote",
        position: livePos || stickyNote.position,
        parentId: stickyNote.parentId,
        extent: stickyNote.parentId ? ("parent" as const) : undefined,
        zIndex: nodeZIndicesRef.current[stickyNote.id] || 20,
        draggable: !isPreview,
        selectable: !isPreview,
        selected: selectedNodeIds.includes(stickyNote.id),
        data: {
          text: stickyNote.text,
          color: stickyNote.color || "yellow",
          isEditing: isPreview ? false : editingNodeId === stickyNote.id,
          onTextChange: handleTextChange,
          onEditComplete: handleEditComplete,
          onResize: handleResize,
          onResizeEnd: handleResizeEnd,
          onAutoResize: handleAutoResize,
          ...(stickyNote.templateKey
            ? {
                templateKey: stickyNote.templateKey,
                templateLabel: stickyNote.templateLabel,
                placeholderText: stickyNote.placeholderText,
              }
            : {}),
          ...(clusterInfo && !stickyNote.cluster
            ? {
                clusterLabel: clusterInfo.label,
                clusterChildCount: clusterInfo.count,
              }
            : {}),
          ...(stickyNote.cluster ? { cluster: stickyNote.cluster } : {}),
          ...(stickyNote.isPersona ? { isPersona: true } : {}),
          onPersonaRename: handlePersonaRename,
          ...(stickyNote.lockSize ? { lockSize: true } : {}),
          ...(isPreview
            ? {
                isPreview: true,
                previewReason: stickyNote.previewReason,
                onConfirm: handleConfirmPreview,
                onReject: handleRejectPreview,
              }
            : {}),
        } as StickyNoteNodeData,
        style: {
          width: liveDims?.width ?? stickyNote.width,
          height: liveDims?.height ?? stickyNote.height,
        },
      };
    });

    // Add drawing nodes
    const drawingReactFlowNodes: Node[] = drawingNodes.map((dn) => {
      const displayWidth = Math.min(dn.width, 400);
      const displayHeight = displayWidth * (dn.height / dn.width);
      const locked = isDrawingLockedByOther(dn.id);
      const locker = locked ? getLockingUser(dn.id) : null;
      const lockerName = (locker as { presence: { displayName?: string } } | null)?.presence?.displayName;

      return {
        id: dn.id,
        type: "drawingImage" as const,
        position: livePositions.current[dn.id] || dn.position,
        zIndex: nodeZIndicesRef.current[dn.id] || 20,
        draggable: true,
        selectable: true,
        selected: selectedNodeIds.includes(dn.id),
        data: {
          imageUrl: dn.imageUrl,
          drawingId: dn.drawingId,
          width: dn.width,
          height: dn.height,
          isLocked: locked,
          lockedByName: lockerName ?? undefined,
        },
        style: { width: displayWidth, height: displayHeight },
      };
    });

    // Add concept card nodes
    const conceptCardReactFlowNodes: Node[] = conceptCards.map((card) => {
      const cardIsOwner = isMultiplayer && (
        (isFacilitator && card.ownerId === 'facilitator') ||
        (!!participantId && card.ownerId === participantId)
      );
      const canAiGenerate = !isMultiplayer || cardIsOwner || isFacilitator;

      return {
        id: card.id,
        type: "conceptCard" as const,
        position: livePositions.current[card.id] || card.position,
        zIndex: nodeZIndicesRef.current[card.id] || 20,
        draggable: true,
        dragHandle: '.card-drag-handle',
        selectable: true,
        selected: selectedNodeIds.includes(card.id),
        data: {
          ...card,
          onFieldChange: handleConceptFieldChange,
          onSWOTChange: handleConceptSWOTChange,
          onFeasibilityChange: handleConceptFeasibilityChange,
          onReassign: handleConceptReassign,
          onGenerateField: canAiGenerate ? (_id: string, field: ConceptFieldId) => {
            conceptGenerateField(_id, field);
          } : undefined,
          onGenerateAll: canAiGenerate ? (_id: string) => {
            const c = conceptCards.find((cc) => cc.id === _id);
            if (c && hasExistingContent(c)) {
              if (!window.confirm('This will overwrite existing content. Continue?')) return;
            }
            conceptGenerateAll(_id);
          } : undefined,
          onElaborate: canAiGenerate ? (_id: string, field: ConceptFieldId, content: string, instructions: string) => {
            conceptElaborate(_id, field, content, instructions);
          } : undefined,
          generatingState: conceptGenerating[card.id],
          availableOwners: conceptOwners,
          isFacilitator,
          isMultiplayer,
          isOwner: cardIsOwner,
        },
        style: { width: 680 },
      };
    });

    // Add persona template nodes
    const personaTemplateReactFlowNodes: Node[] = personaTemplates.map(
      (template) => ({
        id: template.id,
        type: "personaTemplate" as const,
        position: livePositions.current[template.id] || template.position,
        zIndex: nodeZIndicesRef.current[template.id] || 20,
        draggable: true,
        dragHandle: '.card-drag-handle',
        selectable: true,
        selected: selectedNodeIds.includes(template.id),
        data: {
          ...template,
          onFieldChange: handlePersonaFieldChange,
          onGenerateAvatar: handleGenerateAvatar,
          onFillFields: handleFillPersonaFields,
        },
        style: { width: 680, height: 1100 },
      }),
    );

    // Add HMW card nodes
    const hmwCardReactFlowNodes: Node[] = hmwCards.map((card) => {
      const cardIsOwner = isMultiplayer && (
        (isFacilitator && card.ownerId === 'facilitator') ||
        (!!participantId && card.ownerId === participantId)
      );
      const canHmwAiGenerate = !isMultiplayer || cardIsOwner || isFacilitator;
      return {
        id: card.id,
        type: "hmwCard" as const,
        position: livePositions.current[card.id] || card.position,
        zIndex: nodeZIndicesRef.current[card.id] || 20,
        draggable: true,
        dragHandle: '.card-drag-handle',
        selectable: true,
        selected: selectedNodeIds.includes(card.id),
        data: {
          ...card,
          isMultiplayer,
          isFacilitator,
          isOwner: cardIsOwner,
          onFieldChange: handleHmwFieldChange,
          onChipSelect: handleHmwChipSelect,
          onStatementChange: handleHmwStatementChange,
          onFieldFocus: handleHmwFieldFocus,
          onDelete: isFacilitator ? deleteHmwCard : undefined,
          onReassign: isFacilitator ? handleHmwReassign : undefined,
          availableOwners: isFacilitator ? hmwOwners : undefined,
          onGenerateField: canHmwAiGenerate ? (_id: string, field: string) => {
            hmwGenerateField(_id, field as HmwFieldId);
          } : undefined,
          onGenerateAll: canHmwAiGenerate ? (_id: string) => {
            const c = hmwCards.find((cc) => cc.id === _id);
            if (c && hasExistingHmwContent(c)) {
              if (!window.confirm('This will overwrite existing content. Continue?')) return;
            }
            hmwGenerateAll(_id);
          } : undefined,
          onElaborate: canHmwAiGenerate ? (_id: string, field: string, content: string, instructions: string) => {
            hmwElaborate(_id, field as HmwFieldId, content, instructions);
          } : undefined,
          generatingState: hmwGenerating[card.id],
        },
        style: { width: 700 },
      };
    });

    // Add on-canvas guide nodes
    // Default dimensions per variant — used when guide has no saved width/height
    const guideDefaultDims: Record<string, { w: number; h?: number }> = {
      "template-sticky-note": { w: 160, h: 100 },
      frame: { w: 400, h: 300 },
      arrow: { w: 120, h: 40 },
      card: { w: 240 }, // height auto-sizes to content
      image: { w: 200, h: 200 },
    };

    // Template-sticky-note guide variants are never rendered — they're invisible
    // DB records used only for seeding positions. The real sticky notes (canvas store)
    // are the single visible cards; admin drags sync back to DB guides.
    const guideReactFlowNodes: Node[] = onCanvasGuides
      .filter(
        (g) =>
          g.variant !== "template-sticky-note" &&
          !dismissedGuideIds.has(g.id) &&
          (!g.showOnlyWhenEmpty || !canvasHasItems),
      )
      .map((g) => {
        const nodeId = `guide-${g.id}`;
        const liveDims = liveDimensions.current[nodeId];
        const defaults = guideDefaultDims[g.variant] || { w: 200, h: 80 };
        const nodeWidth = liveDims?.width ?? g.width ?? defaults.w;
        const nodeHeight = defaults.h != null ? (liveDims?.height ?? g.height ?? defaults.h) : undefined;

        return {
          id: nodeId,
          type: "guideNode" as const,
          position: livePositions.current[nodeId] || {
            x: g.canvasX ?? 0,
            y: g.canvasY ?? 0,
          },
          zIndex: (g.layer === "background" ? 2 : 25) + (g.sortOrder ?? 0),
          draggable: !!isAdmin && !!isAdminEditing,
          selectable: !!isAdmin && !!isAdminEditing,
          selected: selectedNodeIds.includes(nodeId),
          data: {
            ...g,
            isAdmin,
            isAdminEditing,
            onDismiss: dismissGuide,
            onEdit: onEditGuide,
            onGuideResize: handleGuideResize,
            onGuideResizeEnd: handleGuideResizeEnd,
            isExiting: exitingGuideIds.has(g.id),
          },
          // Card variant: width-only (height auto-sizes to content)
          // Other variants: explicit width + height
          style: nodeHeight != null
            ? { width: nodeWidth, height: nodeHeight }
            : { width: nodeWidth },
        };
      });

    return [
      ...stickyNoteReactFlowNodes,
      ...drawingReactFlowNodes,
      ...conceptCardReactFlowNodes,
      ...personaTemplateReactFlowNodes,
      ...hmwCardReactFlowNodes,
      ...guideReactFlowNodes,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- livePositions/liveDimensions/nodeZIndicesRef are refs
    // read inside the memo body as a safety net; they must NOT be deps or every
    // mouse-move during drag would recompute and cause flickering.
  }, [
    stickyNotes,
    drawingNodes,
    conceptCards,
    personaTemplates,
    hmwCards,
    editingNodeId,
    selectedNodeIds,
    clusterParentMap,
    onCanvasGuides,
    dismissedGuideIds,
    exitingGuideIds,
    canvasHasItems,
    isAdmin,
    isAdminEditing,
    onEditGuide,
    handleGuideResize,
    handleGuideResizeEnd,
    autoResizeTick,
    handleTextChange,
    handleEditComplete,
    handlePersonaRename,
    handleResize,
    handleResizeEnd,
    handleConfirmPreview,
    handleRejectPreview,
    handleConceptFieldChange,
    handleConceptSWOTChange,
    handleConceptFeasibilityChange,
    handlePersonaFieldChange,
    handleGenerateAvatar,
    handleFillPersonaFields,
    handleHmwFieldChange,
    handleHmwChipSelect,
    handleHmwFieldFocus,
    dismissGuide,
    isDrawingLockedByOther,
    getLockingUser,
  ]);

  // Controlled nodes state — mirrors the `nodes` memo but applies position
  // changes from ReactFlow during drag, enabling smooth visual movement.
  // Without this, the useMemo-based approach doesn't re-render mid-drag.
  const [controlledNodes, setControlledNodes] = useState<Node[]>(nodes);

  // Sync computed nodes → controlled state whenever the memo recomputes.
  // Safe during drag because the memo reads livePositions.current as a
  // safety net, so recomputed positions stay correct mid-drag.
  useEffect(() => {
    setControlledNodes(nodes);
  }, [nodes]);

  // Create sticky note at position and set as editing
  const createStickyNoteAtPosition = useCallback(
    (clientX: number, clientY: number) => {
      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });

      // Ring-based snap and assignment for ring steps
      if (stepConfig.hasRings && stepConfig.ringConfig) {
        const snappedPosition = snapToGrid(flowPosition);
        const ringId = detectRing(
          { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
          stepConfig.ringConfig,
        );
        createAndEditStickyNote({
          text: "",
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment: { row: ringId, col: "" },
        });
      }
      // Empathy zone snap and assignment for empathy zone steps
      else if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
        const snappedPosition = snapToGrid(flowPosition);
        const zone = getZoneForPosition(
          { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
          empathyConfigRef.current ?? stepConfig.empathyZoneConfig,
        );
        createAndEditStickyNote({
          text: "",
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment: zone ? { row: zone, col: "" } : undefined,
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
        createAndEditStickyNote({
          text: "",
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment,
        });
      } else {
        // Quadrant-based snap and detection for quadrant/standard steps
        const snappedPosition = snapToGrid(flowPosition);
        const quadrant =
          stepConfig.hasQuadrants && stepConfig.quadrantType
            ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
            : undefined;
        createAndEditStickyNote({
          text: "",
          position: snappedPosition,
          width: 120,
          height: 120,
          quadrant,
        });
      }
    },
    [
      screenToFlowPosition,
      snapToGrid,
      createAndEditStickyNote,
      stepConfig,
      dynamicGridConfig,
    ],
  );

  // Handle toolbar "+" creation (dealing-cards offset)
  const handleToolbarAdd = useCallback(
    (color?: StickyNoteColor) => {
      // In multiplayer mode, new sticky notes inherit the participant's assigned color
      // (unless the caller explicitly passes a color override)
      const effectiveColor = color ?? participantStickyColor;
      let position: { x: number; y: number };

      if (stickyNotes.length > 0) {
        // Offset from last sticky note (dealing-cards pattern)
        const lastStickyNote = stickyNotes[stickyNotes.length - 1];
        position = {
          x: lastStickyNote.position.x + 30,
          y: lastStickyNote.position.y + 30,
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
          stepConfig.ringConfig,
        );
        createAndEditStickyNote({
          text: "",
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment: { row: ringId, col: "" },
          ...(effectiveColor ? { color: effectiveColor } : {}),
        });
      }
      // Empathy zone snap and assignment for empathy zone steps
      else if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
        const snappedPosition = snapToGrid(position);
        const zone = getZoneForPosition(
          { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
          empathyConfigRef.current ?? stepConfig.empathyZoneConfig,
        );
        createAndEditStickyNote({
          text: "",
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment: zone ? { row: zone, col: "" } : undefined,
          ...(effectiveColor ? { color: effectiveColor } : {}),
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
        createAndEditStickyNote({
          text: "",
          position: snappedPosition,
          width: 120,
          height: 120,
          cellAssignment,
          ...(effectiveColor ? { color: effectiveColor } : {}),
        });
      } else {
        // Quadrant-based snap and detection for quadrant/standard steps
        const snappedPosition = snapToGrid(position);
        const quadrant =
          stepConfig.hasQuadrants && stepConfig.quadrantType
            ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
            : undefined;
        createAndEditStickyNote({
          text: "",
          position: snappedPosition,
          width: 120,
          height: 120,
          quadrant,
          ...(effectiveColor ? { color: effectiveColor } : {}),
        });
      }
      dismissAutoGuides();
    },
    [
      stickyNotes,
      screenToFlowPosition,
      snapToGrid,
      createAndEditStickyNote,
      stepConfig,
      dynamicGridConfig,
      dismissAutoGuides,
      participantStickyColor,
    ],
  );

  // Handle toolbar emotion sticky note creation (with emoji + color preset)
  const handleEmotionAdd = useCallback(
    (emoji: string, color: StickyNoteColor) => {
      let position: { x: number; y: number };

      if (stickyNotes.length > 0) {
        const lastStickyNote = stickyNotes[stickyNotes.length - 1];
        position = {
          x: lastStickyNote.position.x + 30,
          y: lastStickyNote.position.y + 30,
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
          stepConfig.ringConfig,
        );
        createAndEditStickyNote({
          text: emoji,
          position: snappedPosition,
          width: 120,
          height: 120,
          color,
          cellAssignment: { row: ringId, col: "" },
        });
      } else if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
        const snappedPosition = snapToGrid(position);
        const zone = getZoneForPosition(
          { x: snappedPosition.x + 60, y: snappedPosition.y + 50 },
          empathyConfigRef.current ?? stepConfig.empathyZoneConfig,
        );
        createAndEditStickyNote({
          text: emoji,
          position: snappedPosition,
          width: 120,
          height: 120,
          color,
          cellAssignment: zone ? { row: zone, col: "" } : undefined,
        });
      } else if (stepConfig.hasGrid && dynamicGridConfig) {
        const snappedPosition = snapToCell(position, dynamicGridConfig);
        const cell = positionToCell(snappedPosition, dynamicGridConfig);
        const cellAssignment = cell
          ? {
              row: dynamicGridConfig.rows[cell.row].id,
              col: dynamicGridConfig.columns[cell.col].id,
            }
          : undefined;
        createAndEditStickyNote({
          text: emoji,
          position: snappedPosition,
          width: 120,
          height: 120,
          color,
          cellAssignment,
        });
      } else {
        const snappedPosition = snapToGrid(position);
        const quadrant =
          stepConfig.hasQuadrants && stepConfig.quadrantType
            ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
            : undefined;
        createAndEditStickyNote({
          text: emoji,
          position: snappedPosition,
          width: 120,
          height: 120,
          color,
          quadrant,
        });
      }
      dismissAutoGuides();
    },
    [
      stickyNotes,
      screenToFlowPosition,
      snapToGrid,
      createAndEditStickyNote,
      stepConfig,
      dynamicGridConfig,
      dismissAutoGuides,
    ],
  );

  // --- User-research persona column table ---
  // Auto-lay out persona cards + their insights into aligned columns. Keyed on a
  // STRUCTURAL signature (ids + text + cluster + preview flag), so it re-packs when
  // notes are added / confirmed / renamed / deleted — but NOT on position-only
  // changes, so the packed positions don't fight a frame drag or loop on its own
  // updates. Covers seeding, AI insights, real-interview confirm, and load.
  const personaLayoutSigRef = useRef<string>("");
  useEffect(() => {
    if (stepId !== "user-research") return;
    const sig = stickyNotes
      .filter((p) => !p.type || p.type === "stickyNote")
      .map((p) => `${p.id}:${p.isPreview ? 1 : 0}:${p.cluster ?? ""}:${p.text}`)
      .sort()
      .join("|");
    if (sig === personaLayoutSigRef.current) return;
    personaLayoutSigRef.current = sig;
    const updates = computePersonaColumnLayout(stickyNotes);
    if (updates.length > 0) batchUpdateStickyNotes(updates);
  }, [stickyNotes, stepId, batchUpdateStickyNotes]);

  // Handle theme sort — reorganize sticky notes by cluster on rings
  const handleThemeSort = useCallback(() => {
    const updates = computeThemeSortPositions(stickyNotes, stepId);
    if (updates.length > 0) {
      batchUpdatePositions(updates);
      setTimeout(() => fitViewWithChatOffset({ padding: 0.2, duration: 400 }), 150);
    }
  }, [stickyNotes, stepId, batchUpdatePositions, fitViewWithChatOffset]);

  // Handle opening cluster dialog from selection toolbar
  const handleOpenClusterDialog = useCallback(() => {
    setClusterDialogOpen(true);
  }, []);

  // Handle clicking a cluster hull — select all members so they can be dragged together
  const handleSelectCluster = useCallback(
    (memberIds: string[]) => {
      setSelectedNodeIds(memberIds);
      // Bring all members to front
      memberIds.forEach((id) => bringToFront(id));
    },
    [bringToFront],
  );

  // Handle renaming a cluster via hull label inline edit
  const handleRenameCluster = useCallback(
    (oldName: string, newName: string) => {
      if (newName.trim() && newName !== oldName) {
        renameCluster(oldName, newName.trim());
      }
    },
    [renameCluster],
  );

  // Rearrange a cluster's children in 3-wide rows centered below parent
  const rearrangeCluster = useCallback(
    (
      clusterName: string,
      parentStickyNote: import("@/stores/canvas-store").StickyNote | undefined,
      childStickyNotes: import("@/stores/canvas-store").StickyNote[],
    ) => {
      if (!parentStickyNote || childStickyNotes.length === 0) return;

      const childPositions = computeClusterChildPositions(
        parentStickyNote.position,
        parentStickyNote.width,
        parentStickyNote.height,
        childStickyNotes.length,
        childStickyNotes[0]?.width || 120,
        childStickyNotes[0]?.height || 120,
      );

      const updates = childStickyNotes.map((child, j) => ({
        id: child.id,
        position: childPositions[j],
        // Inherit parent's ring assignment if available
        ...(parentStickyNote.cellAssignment
          ? { cellAssignment: parentStickyNote.cellAssignment }
          : {}),
      }));

      if (updates.length > 0) {
        batchUpdatePositions(updates);
        setPendingFitView(true);
      }
    },
    [batchUpdatePositions, setPendingFitView],
  );

  // Handle cluster dialog confirm
  const handleClusterConfirm = useCallback(
    (clusterName: string) => {
      // Find the selected sticky note IDs (only non-group stickyNotes)
      const selectedStickyNotes = stickyNotes.filter(
        (p) =>
          selectedNodeIds.includes(p.id) &&
          (!p.type || p.type === "stickyNote"),
      );
      if (selectedStickyNotes.length === 0) return;

      const lowerName = clusterName.toLowerCase();

      // Identify parent: either a selected item whose text matches, or an existing one on the canvas
      let parentStickyNote = selectedStickyNotes.find(
        (p) => p.text.toLowerCase() === lowerName,
      );
      if (!parentStickyNote) {
        parentStickyNote = stickyNotes.find(
          (p) =>
            p.text.toLowerCase() === lowerName &&
            (!p.type || p.type === "stickyNote"),
        );
      }

      // If no parent exists, create one above the topmost selected item
      if (!parentStickyNote) {
        const topY = Math.min(...selectedStickyNotes.map((p) => p.position.y));
        const avgX =
          selectedStickyNotes.reduce((sum, p) => sum + p.position.x, 0) /
          selectedStickyNotes.length;
        const parentId = crypto.randomUUID();
        const newParent: import("@/stores/canvas-store").StickyNote = {
          id: parentId,
          text: clusterName,
          position: { x: Math.round(avgX), y: Math.round(topY - 120 - 15) }, // above children with gap
          width: 160,
          height: 100,
          color: "yellow",
        };
        addStickyNote(newParent);
        parentStickyNote = newParent;
      }

      // All selected items become children (exclude any that match the parent text)
      const childIds = selectedStickyNotes
        .filter((p) => p.text.toLowerCase() !== lowerName)
        .map((p) => p.id);

      if (childIds.length > 0) {
        setCluster(childIds, clusterName);

        // Rearrange children around parent
        const childStickyNotes = selectedStickyNotes.filter(
          (p) => p.text.toLowerCase() !== lowerName,
        );
        rearrangeCluster(clusterName, parentStickyNote, childStickyNotes);
      }
    },
    [stickyNotes, selectedNodeIds, setCluster, rearrangeCluster, addStickyNote],
  );

  // Handle dedup from toolbar
  const handleDeduplicate = useCallback(() => {
    const items = stickyNotes.filter(
      (p) => (!p.type || p.type === "stickyNote") && !p.isPreview,
    );
    // Group by normalized text
    const groups = new Map<string, { text: string; ids: string[] }>();
    for (const item of items) {
      const key = item.text.trim().toLowerCase().replace(/\s+/g, " ");
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, { text: item.text, ids: [] });
      groups.get(key)!.ids.push(item.id);
    }
    // Filter to groups with duplicates
    const dupes = Array.from(groups.values())
      .filter((g) => g.ids.length > 1)
      .map((g) => ({ text: g.text, count: g.ids.length, ids: g.ids }));

    if (dupes.length === 0) return;
    setDedupGroups(dupes);
    setDedupDialogOpen(true);
  }, [stickyNotes]);

  // Handle dedup confirm
  const handleDedupConfirm = useCallback(() => {
    // Keep first of each group, delete rest
    const idsToDelete: string[] = [];
    for (const group of dedupGroups) {
      idsToDelete.push(...group.ids.slice(1));
    }
    if (idsToDelete.length > 0) {
      batchDeleteStickyNotes(idsToDelete);
    }
    setDedupDialogOpen(false);
    setDedupGroups([]);
  }, [dedupGroups, batchDeleteStickyNotes]);

  // Handle delete selected nodes from toolbar
  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    // Ungroup any selected groups first
    selectedNodes
      .filter((n) => n.type === "group")
      .forEach((n) => ungroupStickyNotes(n.id));
    // Delete selected drawing nodes
    selectedNodes
      .filter((n) => n.type === "drawingImage")
      .forEach((n) => deleteDrawingNode(n.id));
    // Delete selected concept cards
    selectedNodes
      .filter((n) => n.type === "conceptCard")
      .forEach((n) => deleteConceptCard(n.id));
    // Delete selected persona templates
    selectedNodes
      .filter((n) => n.type === "personaTemplate")
      .forEach((n) => deletePersonaTemplate(n.id));
    // Delete selected HMW cards
    selectedNodes
      .filter((n) => n.type === "hmwCard")
      .forEach((n) => deleteHmwCard(n.id));
    // Delete non-group, non-drawing, non-conceptCard, non-personaTemplate, non-hmwCard stickyNote nodes
    const stickyNoteIds = selectedNodes
      .filter(
        (n) =>
          n.type !== "group" &&
          n.type !== "drawingImage" &&
          n.type !== "conceptCard" &&
          n.type !== "personaTemplate" &&
          n.type !== "hmwCard",
      )
      .map((n) => n.id);
    if (stickyNoteIds.length > 0) {
      // When admin deletes template sticky notes, also remove the DB guide
      if (isAdminEditing && onTemplateStickyDelete) {
        stickyNoteIds.forEach((id) => {
          const sn = stickyNotes.find((s) => s.id === id);
          if (sn?.templateKey) onTemplateStickyDelete(sn.templateKey);
        });
      }
      batchDeleteStickyNotes(stickyNoteIds);
    }
  }, [
    nodes,
    stickyNotes,
    isAdminEditing,
    ungroupStickyNotes,
    batchDeleteStickyNotes,
    deleteDrawingNode,
    deleteConceptCard,
    deletePersonaTemplate,
    deleteHmwCard,
    onTemplateStickyDelete,
  ]);

  // Handle node drag start — bring dragged node to top of stack
  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("guide-")) {
        console.log("[Guide DnD] dragStart", {
          id: node.id,
          position: node.position,
          draggable: node.draggable,
        });
      }
      // Capture the node's current position in livePositions as a safety net.
      // If useMemo recomputes before onNodesChange populates drag positions,
      // this ensures the node doesn't snap back to a stale store value.
      if (node.position) {
        livePositions.current[node.id] = node.position;
      }
      setDraggingNodeId(node.id);
      bringToFront(node.id);
      // Note: dismissAutoGuides() intentionally NOT called here — it updates
      // dismissedGuideIds/exitingGuideIds state which are useMemo deps, causing
      // the nodes array to recompute mid-drag with stale store positions.
      // Guides are already dismissed from pane clicks, double-clicks, and panning.
    },
    [bringToFront],
  );

  // Guarantee draggingNodeId is cleared on drag end. The onNodesChange path
  // can miss this for zero-distance drags, escape-cancelled drags, mouseup
  // outside the viewport, or when the node is mid-resize. If missed,
  // `cursor-dragging` stays applied and the canvas shows a grabbing cursor
  // everywhere.
  const handleNodeDragStop = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  // Handle all node changes (selection, position, removal)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply changes to controlled state — enables smooth visual drag.
      // Without this, nodes only jump to final position on mouse release.
      setControlledNodes((nds) => applyNodeChanges(changes, nds));

      // ── Track live positions during drag (ref — safety net) ──
      // If the nodes useMemo recomputes mid-drag (from unrelated state changes),
      // the ref ensures it reads current positions instead of stale store values.
      for (const c of changes) {
        if (c.type === "position") {
          const posChange = c as NodeChange & {
            id: string;
            position?: { x: number; y: number };
            dragging?: boolean;
          };
          if (posChange.dragging && posChange.position) {
            livePositions.current[posChange.id] = posChange.position;
          } else if (posChange.dragging === false) {
            delete livePositions.current[posChange.id];
          }
        }
      }

      // Handle selection changes — must persist so nodes stay selected across renders
      const selectChanges = changes.filter(
        (
          c,
        ): c is NodeChange & {
          type: "select";
          id: string;
          selected: boolean;
        } => c.type === "select",
      );
      if (selectChanges.length > 0) {
        const newlySelected = selectChanges
          .filter((c) => c.selected)
          .map((c) => c.id);

        setSelectedNodeIds((prev) => {
          const next = new Set(prev);
          selectChanges.forEach((c) => {
            if (c.selected) next.add(c.id);
            else next.delete(c.id);
          });
          return Array.from(next);
        });

        // Bring newly selected nodes to top of z-index stack
        newlySelected.forEach((id) => bringToFront(id));
      }

      // Handle remove changes (Delete/Backspace key) — skip guide nodes
      const removeChanges = changes.filter(
        (c): c is NodeChange & { type: "remove"; id: string } =>
          c.type === "remove" &&
          "id" in c &&
          !String(c.id).startsWith("guide-"),
      );
      if (removeChanges.length > 0) {
        const removedIds = removeChanges.map((c) => c.id);
        removedIds.forEach((id) => {
          const node = nodes.find((n) => n.id === id);
          if (node?.type === "group") {
            ungroupStickyNotes(id);
          } else if (node?.type === "drawingImage") {
            deleteDrawingNode(id);
          } else if (node?.type === "conceptCard") {
            deleteConceptCard(id);
          } else if (node?.type === "personaTemplate") {
            deletePersonaTemplate(id);
          } else if (node?.type === "hmwCard") {
            deleteHmwCard(id);
          }
        });
        const stickyNoteIds = removedIds.filter((id) => {
          const node = nodes.find((n) => n.id === id);
          return (
            node?.type !== "group" &&
            node?.type !== "drawingImage" &&
            node?.type !== "conceptCard" &&
            node?.type !== "personaTemplate" &&
            node?.type !== "hmwCard"
          );
        });
        if (stickyNoteIds.length > 0) {
          // When admin deletes template sticky notes, also remove the DB guide
          if (isAdminEditing && onTemplateStickyDelete) {
            stickyNoteIds.forEach((id) => {
              const sn = stickyNotes.find((s) => s.id === id);
              if (sn?.templateKey) onTemplateStickyDelete(sn.templateKey);
            });
          }
          batchDeleteStickyNotes(stickyNoteIds);
        }
        return;
      }

      // Update store when drag completes
      changes.forEach((change) => {
        if (
          change.type === "position" &&
          change.dragging === false &&
          change.position
        ) {
          // Skip position updates for nodes being actively resized — NodeResizer
          // dispatches position changes when resizing from top/left edges and
          // processing them mid-resize would snap the position causing jitter.
          if (activelyResizingIds.current.has(change.id)) return;

          // Clear dragging state
          setDraggingNodeId(null);

          // Check if this is a guide node (admin drag-to-reposition)
          if (change.id.startsWith("guide-")) {
            const guideId = change.id.replace("guide-", "");
            const snappedPosition = snapToGrid(change.position);
            console.log("[Guide DnD] dragEnd", {
              guideId,
              from: change.position,
              snapped: snappedPosition,
              hasCallback: !!onGuidePositionUpdate,
            });
            // Retain snapped position in livePositions so the node doesn't
            // snap back to old prop values before parent state updates.
            livePositions.current[change.id] = snappedPosition;
            // Update parent state (optimistic) + persist via debounced PATCH
            if (onGuidePositionUpdate) {
              onGuidePositionUpdate(
                guideId,
                Math.round(snappedPosition.x),
                Math.round(snappedPosition.y),
              );
            } else {
              // Fallback: direct PATCH when no callback provided
              fetch(`/api/admin/canvas-guides/${guideId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  canvasX: Math.round(snappedPosition.x),
                  canvasY: Math.round(snappedPosition.y),
                }),
              }).catch(console.error);
            }
            return;
          }

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

          // Check if this is a persona template node
          const personaTemplate = personaTemplates.find(
            (pt) => pt.id === change.id,
          );
          if (personaTemplate) {
            const snappedPosition = snapToGrid(change.position);
            updatePersonaTemplate(change.id, { position: snappedPosition });
            return;
          }

          // Check if this is an HMW card node
          const hmwCard = hmwCards.find((hc) => hc.id === change.id);
          if (hmwCard) {
            const snappedPosition = snapToGrid(change.position);
            updateHmwCard(change.id, { position: snappedPosition });
            return;
          }

          // Ring-based snap and assignment for ring steps
          if (stepConfig.hasRings && stepConfig.ringConfig) {
            const snappedPosition = snapToGrid(change.position);
            const ringId = detectRing(
              { x: snappedPosition.x + 60, y: snappedPosition.y + 50 }, // card center
              stepConfig.ringConfig,
            );
            updateStickyNote(change.id, {
              position: snappedPosition,
              cellAssignment: { row: ringId, col: "" },
            });
          }
          // Empathy zone snap and assignment for empathy zone steps
          else if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
            const snappedPosition = snapToGrid(change.position);
            const zone = getZoneForPosition(
              { x: snappedPosition.x + 60, y: snappedPosition.y + 50 }, // card center
              empathyConfigRef.current ?? stepConfig.empathyZoneConfig,
            );
            updateStickyNote(change.id, {
              position: snappedPosition,
              cellAssignment: zone ? { row: zone, col: "" } : undefined,
            });
          }
          // Grid-based snap and cell assignment for grid steps
          else if (stepConfig.hasGrid && dynamicGridConfig) {
            const snappedPosition = snapToCell(
              change.position,
              dynamicGridConfig,
            );
            const cell = positionToCell(snappedPosition, dynamicGridConfig);

            // Build cell assignment if position is within grid
            const cellAssignment = cell
              ? {
                  row: dynamicGridConfig.rows[cell.row].id,
                  col: dynamicGridConfig.columns[cell.col].id,
                }
              : undefined;

            updateStickyNote(change.id, {
              position: snappedPosition,
              cellAssignment,
            });
            setHighlightedCell(null); // Clear highlight on drop
          } else {
            // Quadrant-based snap and detection for quadrant steps
            const snappedPosition = snapToGrid(change.position);

            // Detect quadrant if step has quadrant layout
            const quadrant =
              stepConfig.hasQuadrants && stepConfig.quadrantType
                ? detectQuadrant(
                    snappedPosition,
                    120, // sticky note default width
                    120, // sticky note default height
                    stepConfig.quadrantType,
                  )
                : undefined;

            updateStickyNote(change.id, {
              position: snappedPosition,
              quadrant,
            });
          }

          // --- Cluster membership detection on drag-end ---
          const draggedStickyNote = stickyNotes.find((p) => p.id === change.id);
          if (
            draggedStickyNote &&
            (!draggedStickyNote.type ||
              draggedStickyNote.type === "stickyNote") &&
            !draggedStickyNote.isPreview &&
            change.position
          ) {
            if (draggedStickyNote.cluster) {
              // --- Drag-out detection for cluster children ---
              // Use ALL members (including the dragged node at its pre-drag position
              // from `stickyNotes`) so the bbox represents the full cluster extent.
              // This prevents false detaches when rearranging within the cluster.
              const clusterName = draggedStickyNote.cluster.toLowerCase();
              const allMembers = stickyNotes.filter((p) => {
                if (p.cluster?.toLowerCase() === clusterName) return true;
                if (
                  !p.cluster &&
                  p.text.toLowerCase() === clusterName &&
                  (!p.type || p.type === "stickyNote")
                )
                  return true;
                return false;
              });
              if (allMembers.length >= 2) {
                const DETACH_MARGIN = 320;
                const minX =
                  Math.min(...allMembers.map((m) => m.position.x)) -
                  DETACH_MARGIN;
                const minY =
                  Math.min(...allMembers.map((m) => m.position.y)) -
                  DETACH_MARGIN;
                const maxX =
                  Math.max(...allMembers.map((m) => m.position.x + m.width)) +
                  DETACH_MARGIN;
                const maxY =
                  Math.max(...allMembers.map((m) => m.position.y + m.height)) +
                  DETACH_MARGIN;
                const cx = change.position.x + draggedStickyNote.width / 2;
                const cy = change.position.y + draggedStickyNote.height / 2;
                if (cx < minX || cx > maxX || cy < minY || cy > maxY) {
                  removeFromCluster(change.id);
                }
              }
            } else {
              // --- Drag-into detection for unclustered nodes ---
              // If the node landed inside an existing cluster's hull, join it.
              const items = stickyNotes.filter(
                (p) => (!p.type || p.type === "stickyNote") && !p.isPreview,
              );
              const clusterGroups = new Map<
                string,
                {
                  displayName: string;
                  children: typeof items;
                  parent: (typeof items)[0] | undefined;
                }
              >();
              for (const item of items) {
                if (!item.cluster) continue;
                const key = item.cluster.toLowerCase();
                if (!clusterGroups.has(key)) {
                  const parent = items.find(
                    (p) =>
                      p.text.toLowerCase() === key &&
                      !p.cluster &&
                      p.id !== change.id,
                  );
                  clusterGroups.set(key, {
                    displayName: item.cluster,
                    children: [],
                    parent,
                  });
                }
                clusterGroups.get(key)!.children.push(item);
              }

              const HULL_PADDING = 24; // matches visual hull padding in cluster-hulls-overlay
              const cx = change.position.x + draggedStickyNote.width / 2;
              const cy = change.position.y + draggedStickyNote.height / 2;

              let hullMatchFound = false;
              for (const [
                key,
                { displayName, children, parent },
              ] of clusterGroups) {
                // Don't add if this node IS the parent (text matches cluster name)
                if (draggedStickyNote.text.toLowerCase() === key) continue;
                const members = parent ? [parent, ...children] : children;
                if (members.length < 2) continue;

                const minX =
                  Math.min(...members.map((m) => m.position.x)) - HULL_PADDING;
                const minY =
                  Math.min(...members.map((m) => m.position.y)) - HULL_PADDING;
                const maxX =
                  Math.max(...members.map((m) => m.position.x + m.width)) +
                  HULL_PADDING;
                const maxY =
                  Math.max(...members.map((m) => m.position.y + m.height)) +
                  HULL_PADDING;

                if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
                  setCluster([change.id], displayName);
                  // Auto-rearrange children (including new member) around parent
                  if (parent) {
                    rearrangeCluster(displayName, parent, [
                      ...children,
                      draggedStickyNote,
                    ]);
                  }
                  hullMatchFound = true;
                  break;
                }
              }

              // --- Drag-into-persona-frame fallback for user-research step ---
              // When no hull match found, check if the dropped sticky note's center
              // falls inside a persona column frame. Uses the SAME frame geometry as
              // the overlay (computePersonaFrames) so the drop zones match what's drawn.
              if (!hullMatchFound && stepId === "user-research") {
                const frames = computePersonaFrames(items);
                for (const frame of frames) {
                  if (frame.cardId === change.id) continue;
                  const { x: fx, y: fy, width: fw, height: fh } = frame.bounds;
                  if (cx >= fx && cx <= fx + fw && cy >= fy && cy <= fy + fh) {
                    setCluster([change.id], frame.name);
                    updateStickyNote(change.id, {
                      color: (frame.color as StickyNoteColor) || "yellow",
                    });
                    break;
                  }
                }
              }
            }
          }

          // --- Sync template sticky note position to DB guide (admin only) ---
          // When admin drags a real template sticky note, persist the new position
          // to the corresponding canvas_guide row so future sessions inherit it.
          if (isAdminEditing && draggedStickyNote?.templateKey && onTemplateStickyPositionSync) {
            const snappedPos = snapToGrid(change.position);
            onTemplateStickyPositionSync(
              draggedStickyNote.templateKey,
              Math.round(snappedPos.x),
              Math.round(snappedPos.y),
            );
          }
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- livePositions/liveDimensions are refs
    [
      nodes,
      stickyNotes,
      drawingNodes,
      conceptCards,
      personaTemplates,
      hmwCards,
      snapToGrid,
      updateStickyNote,
      updateDrawingNode,
      updateConceptCard,
      updatePersonaTemplate,
      updateHmwCard,
      deleteDrawingNode,
      deleteConceptCard,
      deletePersonaTemplate,
      stepConfig,
      dynamicGridConfig,
      ungroupStickyNotes,
      batchDeleteStickyNotes,
      bringToFront,
      removeFromCluster,
      setCluster,
      rearrangeCluster,
      onGuidePositionUpdate,
      onTemplateStickyPositionSync,
      onTemplateStickyDelete,
      isAdminEditing,
      stepId,
    ],
  );

  // Handle node drag (real-time cell highlighting)
  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (stepConfig.hasGrid && dynamicGridConfig) {
        const cell = positionToCell(node.position, dynamicGridConfig);
        setHighlightedCell(cell); // null if outside grid
      }
    },
    [stepConfig, dynamicGridConfig],
  );

  // Handle node deletion
  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((node) => {
        if (node.type === "group") {
          // Ungroup children first, then remove group
          ungroupStickyNotes(node.id);
        } else if (node.type === "drawingImage") {
          // Delete drawing node
          deleteDrawingNode(node.id);
        } else if (node.type === "conceptCard") {
          // Delete concept card
          deleteConceptCard(node.id);
        } else if (node.type === "personaTemplate") {
          // Delete persona template
          deletePersonaTemplate(node.id);
        } else if (node.type === "hmwCard") {
          // Delete HMW card
          deleteHmwCard(node.id);
        }
      });
      // Delete non-group, non-drawing, non-conceptCard, non-personaTemplate, non-hmwCard stickyNote nodes
      const stickyNoteIds = deleted
        .filter(
          (n) =>
            n.type !== "group" &&
            n.type !== "drawingImage" &&
            n.type !== "conceptCard" &&
            n.type !== "personaTemplate" &&
            n.type !== "hmwCard",
        )
        .map((n) => n.id);
      if (stickyNoteIds.length > 0) {
        // When admin deletes template sticky notes, also remove the DB guide
        if (isAdminEditing && onTemplateStickyDelete) {
          stickyNoteIds.forEach((id) => {
            const sn = stickyNotes.find((s) => s.id === id);
            if (sn?.templateKey) onTemplateStickyDelete(sn.templateKey);
          });
        }
        batchDeleteStickyNotes(stickyNoteIds);
      }
    },
    [
      stickyNotes,
      isAdminEditing,
      ungroupStickyNotes,
      batchDeleteStickyNotes,
      deleteDrawingNode,
      deleteConceptCard,
      deletePersonaTemplate,
      deleteHmwCard,
      onTemplateStickyDelete,
    ],
  );

  // Handle delete column (passed to GridOverlay)
  const handleDeleteColumn = useCallback(
    (
      columnId: string,
      columnLabel: string,
      affectedCardCount: number,
      migrationTarget: string | null,
    ) => {
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
    [removeGridColumn, dynamicGridConfig],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteColumnDialog && dynamicGridConfig) {
      removeGridColumn(deleteColumnDialog.columnId, dynamicGridConfig);
      setDeleteColumnDialog(null);
    }
  }, [deleteColumnDialog, removeGridColumn, dynamicGridConfig]);

  // Handle move column (passed to GridOverlay)
  const handleMoveColumn = useCallback(
    (columnId: string, toIndex: number) => {
      if (dynamicGridConfig) {
        moveGridColumn(columnId, toIndex, dynamicGridConfig);
      }
    },
    [moveGridColumn, dynamicGridConfig],
  );

  // Solo mode: always true. Multiplayer: only facilitator.
  const canEditStructure = !isMultiplayer || isFacilitator;

  // Handle drawing save from EzyDraw modal
  const handleDrawingSave = useCallback(
    async (result: { pngDataUrl: string; elements: DrawingElement[]; backgroundImageUrl: string | null }) => {
      const simplifiedElements = simplifyDrawingElements(result.elements);
      const vectorJson = JSON.stringify({
        elements: simplifiedElements,
        backgroundImageUrl: result.backgroundImageUrl || null,
      });

      // Default stage dimensions (EzyDraw 6:4 canvas)
      const width = 1200;
      const height = 800;

      // Step 1: Upload image via API route as binary FormData
      let pngUrl = '';
      if (result.pngDataUrl) {
        try {
          const blobRes = await fetch(result.pngDataUrl);
          const imageBlob = await blobRes.blob();

          const formData = new FormData();
          formData.append('file', imageBlob, `drawing.${imageBlob.type === 'image/png' ? 'png' : imageBlob.type === 'image/webp' ? 'webp' : 'jpg'}`);
          formData.append('workshopId', workshopId);

          const uploadRes = await fetch('/api/upload-drawing-png', {
            method: 'POST',
            body: formData,
          });
          if (!uploadRes.ok) {
            console.error("Image upload failed:", uploadRes.statusText);
            return;
          }
          const uploadData = await uploadRes.json();
          pngUrl = uploadData.pngUrl;
        } catch (err) {
          console.error("Image upload error:", err);
          return;
        }
      }

      // Step 2: Save metadata via server action
      if (ezyDrawState?.drawingId) {
        // Re-edit: update existing drawing
        const response = await updateDrawing({
          workshopId,
          stepId,
          drawingId: ezyDrawState.drawingId,
          pngUrl,
          vectorJson,
          width,
          height,
        });
        if (response.success && response.pngUrl) {
          // Find the canvas store node by drawingId (not the same as the store node id)
          const storeNode = drawingNodes.find(
            (dn) => dn.drawingId === ezyDrawState.drawingId,
          );
          if (storeNode) {
            updateDrawingNode(storeNode.id, { imageUrl: response.pngUrl });
          }
        } else if (!response.success) {
          console.error("Failed to update drawing:", response.error);
        }
      } else {
        // New drawing: save and add to canvas
        const response = await saveDrawing({
          workshopId,
          stepId,
          pngUrl,
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
          console.error("Failed to save drawing:", response.error);
        }
      }
    },
    [
      ezyDrawState,
      workshopId,
      stepId,
      screenToFlowPosition,
      addDrawingNode,
      updateDrawingNode,
    ],
  );

  // Handle right-click on nodes (color picker, ungroup, or uncluster)
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const stickyNote = stickyNotes.find((p) => p.id === node.id);
      const isClusterParent = stickyNote
        ? clusterParentMap.has(stickyNote.text.toLowerCase())
        : false;
      setContextMenu({
        nodeId: node.id,
        x: event.clientX,
        y: event.clientY,
        currentColor: stickyNote?.color || "yellow",
        nodeType: node.type || "stickyNote",
        isClusterParent,
        stickyNoteText: stickyNote?.text,
      });
    },
    [stickyNotes, clusterParentMap],
  );

  // Handle color selection from picker
  const handleColorSelect = useCallback(
    (color: StickyNoteColor) => {
      if (contextMenu) {
        updateStickyNote(contextMenu.nodeId, { color });
        setContextMenu(null);
      }
    },
    [contextMenu, updateStickyNote],
  );

  // Close context menu on viewport move. Also the escape hatch for "Follow me":
  // a real user gesture (pan/zoom) breaks the follower out. ReactFlow passes a
  // non-null event for user gestures and null for programmatic setViewport, so
  // our own tracking updates never trigger a false break-out.
  const handleMoveStart = useCallback(
    (event: unknown) => {
      setContextMenu(null);
      dismissAutoGuides();
      if (event && followStateRef.current === "following") {
        setFollowState("brokeOut");
      }
    },
    [dismissAutoGuides],
  );

  // Reset the pane double-click counter on any node click so a node interaction
  // can't be mistaken for the second click of a pane double-click sequence.
  const handleNodeClick = useCallback(() => {
    lastPaneClickTime.current = 0;
  }, []);

  // Handle node double-click (enter edit mode for stickyNotes, or re-edit for drawings)
  const handleNodeDoubleClick = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      // Wipe the pane double-click counter so a stray pane click that arrived
      // first can't combine with this node double-click to create a new sticky.
      lastPaneClickTime.current = 0;

      // Check if this is a drawing node
      const drawingNode = drawingNodes.find((dn) => dn.id === node.id);
      if (drawingNode) {
        // Multiplayer: check if another participant is already editing this drawing
        if (isDrawingLockedByOther(drawingNode.id)) {
          const locker = getLockingUser(drawingNode.id);
          const name = (locker as { presence: { displayName?: string } } | null)?.presence?.displayName ?? 'Another participant';
          toast.error(`${name} is currently editing this drawing`);
          return;
        }

        try {
          // Load vector JSON from server
          const drawing = await loadDrawing({
            workshopId,
            stepId,
            drawingId: drawingNode.drawingId,
          });
          if (drawing) {
            const { elements, backgroundImageUrl } = parseVectorJson(drawing.vectorJson);
            // Lock drawing in presence before opening EzyDraw
            lockDrawingInPresence(drawingNode.id);
            setEzyDrawState({
              isOpen: true,
              drawingId: drawingNode.drawingId,
              initialElements: elements,
              initialBackgroundImageUrl: backgroundImageUrl,
            });
          } else {
            console.error(
              "Drawing not found in database:",
              drawingNode.drawingId,
            );
          }
        } catch (error) {
          console.error("Failed to load drawing for re-edit:", error);
        }
        return; // Don't enter stickyNote edit mode
      }

      // Existing stickyNote edit behavior
      setEditingNodeId(node.id);
    },
    [drawingNodes, workshopId, stepId, isDrawingLockedByOther, getLockingUser, lockDrawingInPresence],
  );

  // Handle pane click (double-click detection + deselect)
  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      // Defensive: if the event target is inside a node, don't treat as a pane
      // click. Prevents fast double-clicks near a sticky's edge from leaking
      // through and creating a new sticky on top of the one being edited.
      const target = event.target as HTMLElement | null;
      if (target?.closest('.react-flow__node')) {
        lastPaneClickTime.current = 0;
        return;
      }

      // Close context menu if open
      setContextMenu(null);
      dismissAutoGuides();

      const now = Date.now();
      const timeSinceLastClick = now - lastPaneClickTime.current;

      if (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD) {
        // Double-click detected - create sticky note
        createStickyNoteAtPosition(event.clientX, event.clientY);
        lastPaneClickTime.current = 0; // Reset to prevent triple-click creating two sticky notes
      } else {
        // Single click - deselect/stop editing
        setEditingNodeId(null);
        lastPaneClickTime.current = now;
      }
    },
    [createStickyNoteAtPosition, dismissAutoGuides],
  );

  // Handle ReactFlow initialization (for empty quadrant/grid canvas centering)
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      // Admin-configured default viewport takes absolute priority — it applies
      // regardless of canvas content (grid steps like journey-mapping always have
      // sticky notes, so an "empty canvas" check would never let it run for them).
      // When set, it wins over every fit-to-content path below.
      if (defaultViewportSettings) {
        const container = document.querySelector(".react-flow");
        if (container) {
          const rect = container.getBoundingClientRect();
          if (defaultViewportSettings.viewportMode === "center-offset") {
            instance.setViewport({
              x: rect.width / 2 + defaultViewportSettings.defaultX,
              y: rect.height / 2 + defaultViewportSettings.defaultY,
              zoom: defaultViewportSettings.defaultZoom,
            });
          } else {
            instance.setViewport({
              x: defaultViewportSettings.defaultX,
              y: defaultViewportSettings.defaultY,
              zoom: defaultViewportSettings.defaultZoom,
            });
          }
          return;
        }
      }

      if (stepConfig.hasRings && stickyNotes.length === 0) {
        // Center viewport on (0,0) for ring layout
        const container = document.querySelector(".react-flow");
        if (container) {
          const rect = container.getBoundingClientRect();
          // Fit outer ring (1080px radius = 2160px diameter) in viewport with padding
          const fitZoom = Math.min(rect.width, rect.height) / (2160 + 100);
          instance.setViewport({
            x: rect.width / 2,
            y: rect.height / 2,
            zoom: Math.max(0.3, Math.min(fitZoom, 0.7)),
          });
        }
      } else if (stepConfig.hasEmpathyZones && stickyNotes.length === 0) {
        // Center viewport to show full empathy map
        const container = document.querySelector(".react-flow");
        if (container) {
          const rect = container.getBoundingClientRect();
          instance.setViewport({
            x: rect.width / 2 - 80, // Center horizontally on the wider zone layout
            y: rect.height / 2 + 216, // Center vertically on zone layout
            zoom: 0.6, // Zoomed out enough to see all 6 zones
          });
        }
      } else if (stepConfig.hasQuadrants && stickyNotes.length === 0) {
        // Center viewport on (0,0) for quadrant steps
        const container = document.querySelector(".react-flow");
        if (container) {
          const rect = container.getBoundingClientRect();
          instance.setViewport({
            x: rect.width / 2,
            y: rect.height / 2,
            zoom: 1,
          });
        }
      } else if (
        stepConfig.hasGrid &&
        dynamicGridConfig &&
        stickyNotes.length === 0
      ) {
        // Fit the full grid in the viewport
        const container = document.querySelector(".react-flow");
        if (container) {
          const rect = container.getBoundingClientRect();
          const gridW =
            dynamicGridConfig.origin.x +
            dynamicGridConfig.columns.reduce((s, c) => s + c.width, 0);
          const gridH =
            dynamicGridConfig.origin.y +
            dynamicGridConfig.rows.reduce((s, r) => s + r.height, 0);
          const pad = 60;
          const z = Math.min(
            (rect.width - pad) / gridW,
            (rect.height - pad) / gridH,
            1,
          );
          instance.setViewport({
            x: (rect.width - gridW * z) / 2,
            y: (rect.height - gridH * z) / 2,
            zoom: z,
          });
        }
      }
    },
    [
      stepConfig,
      dynamicGridConfig,
      stickyNotes.length,
      personaTemplates.length,
      hmwCards.length,
      conceptCards.length,
      defaultViewportSettings,
    ],
  );

  // Auto-fit view on mount if nodes exist — skipped when an admin default view
  // is configured, which owns the initial viewport for this step.
  useEffect(() => {
    if (
      !defaultViewportSettings &&
      (stickyNotes.length > 0 ||
        personaTemplates.length > 0 ||
        hmwCards.length > 0 ||
        conceptCards.length > 0) &&
      !hasFitView.current
    ) {
      setTimeout(() => {
        fitViewWithChatOffset({ padding: 0.2, duration: 300 });
        hasFitView.current = true;
      }, 100);
    }
  }, [stickyNotes.length, personaTemplates.length, hmwCards.length, conceptCards.length, fitViewWithChatOffset, defaultViewportSettings]);

  // Fit grid to viewport when dynamicGridConfig first becomes available (after gridColumns are seeded)
  const hasSetGridViewport = useRef(false);
  useEffect(() => {
    if (
      defaultViewportSettings ||
      !dynamicGridConfig ||
      stickyNotes.length > 0 ||
      hasFitView.current ||
      hasSetGridViewport.current
    )
      return;
    hasSetGridViewport.current = true;
    const container = document.querySelector(".react-flow");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const gridW =
      dynamicGridConfig.origin.x +
      dynamicGridConfig.columns.reduce((s, c) => s + c.width, 0);
    const gridH =
      dynamicGridConfig.origin.y +
      dynamicGridConfig.rows.reduce((s, r) => s + r.height, 0);
    const pad = 60;
    const z = Math.min(
      (rect.width - pad) / gridW,
      (rect.height - pad) / gridH,
      1,
    );
    setViewport({
      x: (rect.width - gridW * z) / 2,
      y: (rect.height - gridH * z) / 2,
      zoom: z,
    });
  }, [dynamicGridConfig, stickyNotes.length, setViewport, defaultViewportSettings]);

  // Animate viewport when items are added from chat panel
  useEffect(() => {
    if (pendingFitView) {
      const timer = setTimeout(() => {
        fitViewWithChatOffset({ padding: 0.3, duration: 500 });
        setPendingFitView(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingFitView, fitViewWithChatOffset, setPendingFitView]);

  // Smoothly center on a specific concept card when the AI moves to a new card
  useEffect(() => {
    if (!pendingFocusCardId) return;
    const card = conceptCards.find((c) => c.id === pendingFocusCardId);
    if (!card) {
      setPendingFocusCardId(null);
      return;
    }
    const timer = setTimeout(() => {
      // Center on the card's midpoint, accounting for card dimensions (680×~900)
      const CARD_WIDTH = 680;
      const CARD_HEIGHT = 900;
      const CHAT_OFFSET = 240; // shift left to account for chat panel overlay
      setCenter(
        card.position.x + CARD_WIDTH / 2 - CHAT_OFFSET,
        card.position.y + CARD_HEIGHT / 2,
        { zoom: 0.55, duration: 500 },
      );
      setPendingFocusCardId(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingFocusCardId, conceptCards, setCenter, setPendingFocusCardId]);

  // Sync local selection to shared store (via effect to avoid setState-during-render)
  useEffect(() => {
    setSelectedStickyNoteIds(selectedNodeIds);
  }, [selectedNodeIds, setSelectedStickyNoteIds]);

  // Canvas guide objects — filter visible pinned guides
  const visiblePinnedGuides = useMemo(() => {
    return pinnedGuides.filter((g) => {
      if (dismissedGuideIds.has(g.id)) return false;
      if (g.showOnlyWhenEmpty && canvasHasItems) return false;
      return true;
    });
  }, [pinnedGuides, dismissedGuideIds, canvasHasItems]);

  return (
    <div ref={canvasContainerRef} data-canvas-capture className="w-full h-full relative overflow-hidden">
      {/* CursorBroadcaster — renderless; wires mouse handlers for presence broadcast (multiplayer only) */}
      {workshopType === 'multiplayer' && (
        <CursorBroadcaster handlersRef={cursorHandlersRef} />
      )}
      {/* "Follow me" presenter mode — multiplayer only. The facilitator streams
          their viewport via PresenterController (inside ReactFlowProvider, so
          useViewport() works); followers apply it via the inline follow logic
          above, with the banner offering Exit / Return. */}
      {workshopType === 'multiplayer' && isFacilitator && <PresenterController />}
      {workshopType === 'multiplayer' && (
        <PresenterFollowSync
          onPresenterChange={handlePresenterChange}
          isFollowing={followState === 'following'}
        />
      )}
      {workshopType === 'multiplayer' && presenterViewport && presenterName && followState !== 'idle' && (
        <PresenterFollowBanner
          presenterName={presenterName}
          mode={followState === 'following' ? 'following' : 'brokeOut'}
          onExit={handleExitFollow}
          onReturn={handleReturnFollow}
        />
      )}
      <ReactFlow
        className={cn(
          draggingNodeId
            ? "cursor-dragging"
            : activeTool === "hand"
              ? "cursor-hand-tool"
              : "cursor-pointer-tool",
        )}
        nodes={controlledNodes}
        edges={clusterEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onSelectionDragStop={handleNodeDragStop}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onMoveStart={handleMoveStart}
        onInit={handleInit}
        snapToGrid={false}
        fitView={
          !defaultViewportSettings &&
          (stickyNotes.length > 0 ||
            personaTemplates.length > 0 ||
            hmwCards.length > 0 ||
            conceptCards.length > 0)
        }
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        zoomOnDoubleClick={false}
        // Multi-select (CANV-06)
        selectionKeyCode="Shift"
        multiSelectionKeyCode={null}
        // Marquee selection follows the pointer tool, including while an admin is
        // editing guides — admins still need to box-select and delete leftover
        // cards. Node dragging (sticky notes, guide stickies) coexists with this:
        // mousedown on a node drags it, mousedown on the pane draws the selection
        // box (proven by normal pointer mode, which is always selectionOnDrag).
        selectionOnDrag={activeTool === "pointer"}
        selectionMode={SelectionMode.Partial}
        // v12 default is 1px — set to 0 to eliminate drag dead-zone
        nodeDragThreshold={0}
        // Delete (CANV-03)
        deleteKeyCode={editingNodeId || ezyDrawState?.isOpen ? null : ["Backspace", "Delete"]}
        onNodesDelete={handleNodesDelete}
        // Pan/Zoom (CANV-07) - dynamic based on active tool
        panOnDrag={activeTool === "hand"}
        zoomOnScroll={activeTool !== "hand"}
        panOnScroll={activeTool === "hand"}
        zoomOnPinch={true}
        elementsSelectable={activeTool !== "hand"}
        nodesDraggable={activeTool !== "hand"}
        elevateNodesOnSelect={false}
        proOptions={{ hideAttribution: true }}
        onMouseMove={(e) => cursorHandlersRef.current?.onMouseMove(e)}
        onMouseLeave={() => cursorHandlersRef.current?.onMouseLeave()}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="var(--canvas-dots)"
        />
        <CanvasZoomControls onFitView={() => fitViewWithChatOffset({ padding: 0.2, duration: 300 })} />
        {stepConfig.hasQuadrants && stepConfig.quadrantConfig && (
          <QuadrantOverlay config={stepConfig.quadrantConfig} />
        )}
        {stepConfig.hasRings && stepConfig.ringConfig && (
          <ConcentricRingsOverlay config={stepConfig.ringConfig} />
        )}
        {stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig && (
          <EmpathyMapOverlay
            config={dynamicEmpathyConfig ?? stepConfig.empathyZoneConfig}
          />
        )}
        {stepConfig.hasGrid && dynamicGridConfig && (
          <GridOverlay
            config={dynamicGridConfig}
            highlightedCell={highlightedCell}
            onDeleteColumn={handleDeleteColumn}
            onMoveColumn={handleMoveColumn}
            canEditStructure={canEditStructure}
          />
        )}
      </ReactFlow>

      {/* Cluster hull overlay — HTML divs with absolute positioning, rendered outside ReactFlow */}
      {stepConfig.hasRings && stepId !== "user-research" && (
        <ClusterHullsOverlay
          onSelectCluster={handleSelectCluster}
          onRenameCluster={handleRenameCluster}
        />
      )}

      {/* Persona frame overlay — visible frames for each persona card (user-research step only) */}
      {stepId === "user-research" && <PersonaFrameOverlay />}

      {/* Skeleton empty-state — placeholder persona rows shown while the user-research canvas is empty */}
      {stepId === "user-research" && <ResearchSkeletonOverlay />}

      {/* Live cursors — rendered outside ReactFlow so they appear above all canvas overlays */}
      {workshopType === 'multiplayer' && <LiveCursors />}

      {/* Toolbar */}
      <CanvasToolbar
        onAddStickyNote={handleToolbarAdd}
        onAddEmotionStickyNote={handleEmotionAdd}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onOpenDraw={() => setEzyDrawState({ isOpen: true })}
        onThemeSort={handleThemeSort}
        showThemeSort={stepConfig.hasRings}
        onDeduplicate={handleDeduplicate}
        showDedup={stepConfig.hasRings}
      />

      {/* Selection toolbar — shown when 2+ sticky notes are selected */}
      {selectedNodeIds.length >= 2 &&
        (stepConfig.hasRings || stepId === "user-research") &&
        (() => {
          // Compute bounding box center of selected nodes in screen coords
          const selectedStickyNotes = stickyNotes.filter((p) =>
            selectedNodeIds.includes(p.id),
          );
          if (selectedStickyNotes.length < 2) return null;
          const canvasRef = canvasContainerRef.current;
          if (!canvasRef) return null;
          const rect = canvasRef.getBoundingClientRect();

          // Persona options for "Assign to" dropdown (user-research only)
          const personaCards =
            stepId === "user-research"
              ? stickyNotes.filter(
                  (p) =>
                    (!p.type || p.type === "stickyNote") &&
                    !p.isPreview &&
                    !p.cluster &&
                    p.text.includes(" — "),
                )
              : [];
          const personaOpts = personaCards.map((c) => ({
            name: c.text.split(/\s*[—–]\s*/)[0].trim(),
            color: c.color || "yellow",
          }));

          return (
            <SelectionToolbar
              count={selectedNodeIds.length}
              position={{ x: rect.left + rect.width / 2, y: rect.top + 60 }}
              onCluster={handleOpenClusterDialog}
              onDelete={handleDeleteSelected}
              personaOptions={
                stepId === "user-research" ? personaOpts : undefined
              }
              onAssignToPersona={
                stepId === "user-research"
                  ? (name) => {
                      const card = personaCards.find(
                        (c) => c.text.split(/\s*[—–]\s*/)[0].trim() === name,
                      );
                      if (!card) return;
                      const selStickyNotes = stickyNotes.filter(
                        (p) =>
                          selectedNodeIds.includes(p.id) &&
                          (!p.type || p.type === "stickyNote"),
                      );
                      const ids = selStickyNotes.map((p) => p.id);
                      setCluster(ids, name);
                      ids.forEach((id) =>
                        updateStickyNote(id, { color: card.color || "yellow" }),
                      );
                      setSelectedNodeIds([]);
                    }
                  : undefined
              }
            />
          );
        })()}

      {/* Context menu: ungroup for groups, uncluster for parents, color picker for sticky notes */}
      {contextMenu && contextMenu.nodeType === "group" ? (
        <div
          className="fixed z-50 bg-popover rounded-lg shadow-lg border border-border p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <button
            className="relative z-50 px-3 py-1.5 text-sm hover:bg-accent rounded w-full text-left"
            onClick={() => {
              ungroupStickyNotes(contextMenu.nodeId);
              setContextMenu(null);
            }}
          >
            Ungroup
          </button>
        </div>
      ) : contextMenu ? (
        <div className="contents">
          <ColorPicker
            position={{ x: contextMenu.x, y: contextMenu.y }}
            currentColor={contextMenu.currentColor}
            onColorSelect={handleColorSelect}
            onClose={() => setContextMenu(null)}
          />
          {contextMenu.isClusterParent && contextMenu.stickyNoteText && (
            <div
              className="fixed z-[60] bg-popover rounded-lg shadow-lg border border-border p-1"
              style={{ left: contextMenu.x, top: contextMenu.y + 50 }}
            >
              <button
                className="px-3 py-1.5 text-sm hover:bg-accent rounded w-full text-left"
                onClick={() => {
                  clearCluster(contextMenu.stickyNoteText!);
                  setContextMenu(null);
                }}
              >
                Uncluster
              </button>
            </div>
          )}
          {/* Assign to persona — user-research step only */}
          {stepId === "user-research" &&
            (() => {
              const contextStickyNote = stickyNotes.find(
                (p) => p.id === contextMenu.nodeId,
              );
              const isPersonaCard =
                contextStickyNote &&
                !contextStickyNote.cluster &&
                contextStickyNote.text.includes(" — ");
              if (isPersonaCard || contextMenu.isClusterParent) return null;
              const personaCards = stickyNotes.filter(
                (p) =>
                  (!p.type || p.type === "stickyNote") &&
                  !p.isPreview &&
                  !p.cluster &&
                  p.text.includes(" — "),
              );
              if (personaCards.length === 0) return null;
              const COLOR_DOT: Record<string, string> = {
                pink: "bg-pink-400",
                blue: "bg-blue-400",
                green: "bg-green-400",
                yellow: "bg-yellow-400",
                orange: "bg-orange-400",
                red: "bg-red-400",
              };
              return (
                <div
                  className="fixed z-[60] bg-popover rounded-lg shadow-lg border border-border p-1 min-w-[140px]"
                  style={{ left: contextMenu.x, top: contextMenu.y + 50 }}
                >
                  <p className="text-xs text-muted-foreground px-3 py-1">
                    Assign to:
                  </p>
                  {personaCards.map((card) => {
                    const personaName = card.text.split(/\s*[—–]\s*/)[0].trim();
                    return (
                      <button
                        key={card.id}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent rounded w-full text-left"
                        onClick={() => {
                          setCluster([contextMenu.nodeId], personaName);
                          updateStickyNote(contextMenu.nodeId, {
                            color: card.color || "yellow",
                          });
                          setContextMenu(null);
                        }}
                      >
                        <span
                          className={cn(
                            "inline-block h-2.5 w-2.5 rounded-full",
                            COLOR_DOT[card.color || "yellow"],
                          )}
                        />
                        {personaName}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
        </div>
      ) : null}

      {/* Cluster dialog */}
      <ClusterDialog
        open={clusterDialogOpen}
        onOpenChange={setClusterDialogOpen}
        defaultName={
          selectedNodeIds.length > 0
            ? stickyNotes.find((p) => p.id === selectedNodeIds[0])?.text || ""
            : ""
        }
        existingClusters={existingClusters}
        onConfirm={handleClusterConfirm}
      />

      {/* Dedup dialog */}
      <DedupDialog
        open={dedupDialogOpen}
        onOpenChange={setDedupDialogOpen}
        groups={dedupGroups}
        onConfirm={handleDedupConfirm}
      />

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
          onClose={() => {
            // Clear EzyDraw lock in Liveblocks presence when closing
            unlockDrawingInPresence();
            setEzyDrawState(null);
          }}
          onSave={handleDrawingSave}
          initialElements={ezyDrawState.initialElements}
          initialBackgroundImageUrl={ezyDrawState.initialBackgroundImageUrl}
          drawingId={ezyDrawState.drawingId}
        />
      )}

      {/* Canvas guide objects — pinned guides (viewport-fixed) */}
      {visiblePinnedGuides.length > 0 && !stepConfig.hasGrid && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {visiblePinnedGuides.map((guide) => (
            <CanvasGuide
              key={guide.id}
              guide={guide}
              onDismiss={dismissGuide}
              isExiting={exitingGuideIds.has(guide.id)}
              isAdminEditing={isAdminEditing}
              onEdit={onEditGuide}
            />
          ))}
        </div>
      )}

      {/* Save status indicator */}
      <div className="absolute bottom-3 right-3 z-10 text-xs text-muted-foreground flex items-center gap-1.5">
        {saveStatus === "saving" && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
            Saving...
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Saved
          </>
        )}
        {saveStatus === "error" && (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Save failed
          </>
        )}
      </div>
    </div>
  );
}

export function ReactFlowCanvas({
  sessionId,
  stepId,
  workshopId,
  workshopType,
  canvasGuides,
  defaultViewportSettings,
  isAdmin,
  isAdminEditing,
  onEditGuide,
  onAddGuide,
  onGuidePositionUpdate,
  onGuideSizeUpdate,
  onTemplateStickyPositionSync,
  onTemplateStickyDelete,
  canvasRef,
  conceptOwners,
}: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner
        sessionId={sessionId}
        stepId={stepId}
        workshopId={workshopId}
        workshopType={workshopType}
        canvasGuides={canvasGuides}
        defaultViewportSettings={defaultViewportSettings}
        isAdmin={isAdmin}
        isAdminEditing={isAdminEditing}
        onEditGuide={onEditGuide}
        onAddGuide={onAddGuide}
        onGuidePositionUpdate={onGuidePositionUpdate}
        onGuideSizeUpdate={onGuideSizeUpdate}
        onTemplateStickyPositionSync={onTemplateStickyPositionSync}
        onTemplateStickyDelete={onTemplateStickyDelete}
        canvasRef={canvasRef}
        conceptOwners={conceptOwners}
      />
    </ReactFlowProvider>
  );
}

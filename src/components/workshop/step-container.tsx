"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { UIMessage } from "ai";
import { ChatPanel } from "./chat-panel";
import { RightPanel } from "./right-panel";
import { SynthesisBuildPackSection } from "./synthesis-summary-view";
import { MobileTabBar } from "./mobile-tab-bar";
import { StepNavigation } from "./step-navigation";
import { ResetStepDialog } from "@/components/dialogs/reset-step-dialog";
import { PrdViewerDialog } from "./prd-viewer-dialog";
import { IdeationSubStepContainer } from "./ideation-sub-step-container";
import {
  Loader2,
  Megaphone,
  ImageIcon,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  X,
  ExternalLink,
  Rocket,
  CheckCircle2,
  FileCode2,
  Minimize2,
  Maximize2,
} from "lucide-react";
import {
  resetStep,
  updateStepStatus,
  completeWorkshop,
} from "@/actions/workshop-actions";
import { loadCanvasState, saveCanvasState } from "@/actions/canvas-actions";
import {
  getStepByOrder,
  STEP_CONFIRM_LABELS,
  STEP_CONFIRM_MIN_ITEMS,
  areAllPersonasInterviewed,
} from "@/lib/workshop/step-metadata";
import { STEP_CANVAS_CONFIGS } from "@/lib/canvas/step-canvas-config";
import { fireConfetti } from "@/lib/utils/confetti";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { ConceptCardData } from "@/lib/canvas/concept-card-types";
import { toast } from "sonner";
import {
  useCanvasStore,
  useCanvasStoreApi,
} from "@/providers/canvas-store-provider";
import { CanvasWrapper } from "@/components/canvas/canvas-wrapper";
import { ConceptCanvasOverlay } from "./concept-canvas-overlay";
import { GuideEditPopover } from "@/components/canvas/guide-edit-popover";
import { AssetDrawer } from "@/components/canvas/asset-drawer";
import { useAdminGuides } from "@/hooks/use-admin-guides";
import { usePanelLayout } from "@/hooks/use-panel-layout";
import { StepTransitionWrapper } from "./step-transition-wrapper";
import type { CanvasGuideData } from "@/lib/canvas/canvas-guide-types";
import type { StepCanvasSettingsData } from "@/lib/canvas/step-canvas-settings-types";
import { useMultiplayerContext } from "@/components/workshop/multiplayer-room";
import { useBroadcastEvent } from "@liveblocks/react";
import { FacilitatorControls } from "./facilitator-controls";
import { PresenceBar } from "./presence-bar";

const CANVAS_ENABLED_STEPS = [
  "challenge",
  "stakeholder-mapping",
  "user-research",
  "sense-making",
  "persona",
  "journey-mapping",
  "reframe",
  "concept",
];
const CANVAS_ONLY_STEPS = ["stakeholder-mapping", "sense-making", "concept"];

/**
 * StepAdvanceBroadcaster — renderless component that captures useBroadcastEvent
 * and exposes it via a ref. Only rendered in multiplayer mode (inside RoomProvider).
 *
 * This pattern is required because useBroadcastEvent() must be called inside
 * RoomProvider. StepContainer is conditionally inside RoomProvider (multiplayer only),
 * so we conditionally MOUNT this component rather than conditionally calling the hook.
 */
function StepAdvanceBroadcaster({
  broadcastRef,
}: {
  broadcastRef: React.MutableRefObject<
    | ((event: {
        type: "STEP_CHANGED";
        stepOrder: number;
        stepName: string;
      }) => void)
    | null
  >;
}) {
  const broadcast = useBroadcastEvent();
  React.useEffect(() => {
    broadcastRef.current = broadcast;
    return () => {
      broadcastRef.current = null;
    };
  }, [broadcast, broadcastRef]);
  return null;
}

const BILLBOARD_VISUAL_STYLES = [
  {
    value: "vibrant",
    label: "Bold & Vibrant",
    prompt:
      "Bold, vibrant colors with high contrast, energetic gradient backgrounds, eye-catching neon accents",
  },
  {
    value: "minimalist",
    label: "Clean & Minimalist",
    prompt:
      "Minimalist clean design, lots of white space, subtle typography, muted color palette, Swiss design principles",
  },
  {
    value: "corporate",
    label: "Corporate & Professional",
    prompt:
      "Professional corporate aesthetic, navy/gray tones, structured layout, executive boardroom quality",
  },
  {
    value: "playful",
    label: "Playful & Fun",
    prompt:
      "Playful, whimsical design with rounded shapes, bright pastels, hand-drawn feel, friendly and approachable",
  },
  {
    value: "dark",
    label: "Dark & Moody",
    prompt:
      "Dark theme with deep blacks, dramatic lighting, cinematic atmosphere, premium luxury feel",
  },
  {
    value: "retro",
    label: "Retro & Vintage",
    prompt:
      "Retro vintage aesthetic, 1970s/80s color palette, halftone textures, nostalgic warmth",
  },
  {
    value: "futuristic",
    label: "Futuristic & Tech",
    prompt:
      "Futuristic sci-fi aesthetic, holographic elements, circuit patterns, cyber-blue glows, cutting edge technology",
  },
  {
    value: "organic",
    label: "Organic & Natural",
    prompt:
      "Organic natural aesthetic, earth tones, botanical elements, warm textures, sustainable feel",
  },
] as const;

interface StepContainerProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  workshopType?: "solo" | "multiplayer";
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?:
    | "not_started"
    | "in_progress"
    | "complete"
    | "needs_regeneration";
  workshopStatus?: "draft" | "active" | "paused" | "completed";
  hmwStatement?: string;
  challengeStatement?: string;
  hmwGoals?: Array<{ label: string; fullStatement: string }>;
  step8SelectedSlotIds?: string[];
  step8Crazy8sSlots?: Array<{
    slotId: string;
    title: string;
    imageUrl?: string;
  }>;
  isAdmin?: boolean;
  canvasGuides?: CanvasGuideData[];
  canvasSettings?: StepCanvasSettingsData | null;
}

export function StepContainer({
  stepOrder,
  sessionId,
  workshopId,
  workshopType,
  initialMessages,
  initialArtifact,
  stepStatus,
  workshopStatus,
  hmwStatement,
  challengeStatement,
  hmwGoals,
  step8SelectedSlotIds,
  step8Crazy8sSlots,
  isAdmin,
  canvasGuides,
  canvasSettings,
}: StepContainerProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<"chat" | "canvas">("chat");
  const {
    chatCollapsed,
    setChatCollapsed,
  } = usePanelLayout();

  // Multiplayer facilitator state — determines whether step navigation is visible
  // and whether STEP_CHANGED broadcasts fire. Both default to false in solo mode
  // (isMultiplayer=false from the default MultiplayerContext value).
  const { isFacilitator, isMultiplayer } = useMultiplayerContext();

  // Broadcast ref — populated by StepAdvanceBroadcaster (only mounted in multiplayer).
  // Allows StepContainer to trigger broadcasts without calling useBroadcastEvent directly
  // (which would throw outside RoomProvider in solo mode).
  const broadcastRef = React.useRef<
    | ((event: {
        type: "STEP_CHANGED";
        stepOrder: number;
        stepName: string;
      }) => void)
    | null
  >(null);

  const handleBeforeAdvance = React.useCallback(
    (nextStepOrder: number, nextStepName: string) => {
      broadcastRef.current?.({
        type: "STEP_CHANGED",
        stepOrder: nextStepOrder,
        stepName: nextStepName,
      });
    },
    [],
  );

  // Artifact confirmation state
  // For complete steps: pre-set confirmed (artifact was already confirmed)
  // For needs_regeneration: not confirmed (needs re-confirmation after revision)
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    stepStatus === "complete" && initialArtifact !== null,
  );

  // Concept step: allow early proceed when user explicitly asks to move on (AI emits [CONCEPT_COMPLETE])
  const [conceptProceedOverride, setConceptProceedOverride] =
    React.useState(false);

  // Canvas step detection — canvas steps skip extraction
  const step = getStepByOrder(stepOrder);
  const isCanvasStep = step ? CANVAS_ENABLED_STEPS.includes(step.id) : false;
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const conceptCards = useCanvasStore((s) => s.conceptCards);
  const hmwCards = useCanvasStore((s) => s.hmwCards);
  const setStickyNotes = useCanvasStore((s) => s.setStickyNotes);
  const setDrawingNodes = useCanvasStore((s) => s.setDrawingNodes);
  const setCrazy8sSlots = useCanvasStore((s) => s.setCrazy8sSlots);
  const setMindMapState = useCanvasStore((s) => s.setMindMapState);
  const setConceptCards = useCanvasStore((s) => s.setConceptCards);
  const gridColumns = useCanvasStore((s) => s.gridColumns);
  const setGridColumns = useCanvasStore((s) => s.setGridColumns);
  const setSelectedSlotIds = useCanvasStore((s) => s.setSelectedSlotIds);
  const personaTemplates = useCanvasStore((s) => s.personaTemplates);
  const setPersonaTemplates = useCanvasStore((s) => s.setPersonaTemplates);
  const setHmwCards = useCanvasStore((s) => s.setHmwCards);
  const setBrainRewritingMatrices = useCanvasStore(
    (s) => s.setBrainRewritingMatrices,
  );
  // Voting state — used to derive votingMode for FacilitatorControls in Step 8
  const votingSession = useCanvasStore((s) => s.votingSession);
  const brainRewritingMatrices = useCanvasStore(
    (s) => s.brainRewritingMatrices,
  );
  const storeApi = useCanvasStoreApi();

  // Flush pending canvas changes to DB — called before step navigation
  const flushCanvasToDb = React.useCallback(async () => {
    if (!isCanvasStep || !step) return;
    const s = storeApi.getState();
    if (!s.isDirty) return;
    await saveCanvasState(workshopId, step.id, {
      stickyNotes: s.stickyNotes,
      ...(s.gridColumns.length > 0 ? { gridColumns: s.gridColumns } : {}),
      ...(s.drawingNodes.length > 0 ? { drawingNodes: s.drawingNodes } : {}),
      ...(s.mindMapNodes.length > 0 ? { mindMapNodes: s.mindMapNodes } : {}),
      ...(s.mindMapEdges.length > 0 ? { mindMapEdges: s.mindMapEdges } : {}),
      ...(s.crazy8sSlots.length > 0 ? { crazy8sSlots: s.crazy8sSlots } : {}),
      ...(s.conceptCards.length > 0 ? { conceptCards: s.conceptCards } : {}),
      ...(s.personaTemplates.length > 0
        ? { personaTemplates: s.personaTemplates }
        : {}),
      ...(s.hmwCards.length > 0 ? { hmwCards: s.hmwCards } : {}),
    });
    s.markClean();
  }, [isCanvasStep, workshopId, step, storeApi]);

  // HMW card counts as "content" only when all 4 fields are filled (card is 'filled')
  const hmwCardComplete = hmwCards.some((c) => c.cardState === "filled");
  // Concept card counts as "content" only when all sections are filled (pitch, USP, SWOT, feasibility, billboard)
  const conceptCardComplete = conceptCards.some(
    (c) => c.cardState === "filled",
  );
  // Concept step: require ALL cards filled before showing confirm (unless user explicitly asked to proceed early)
  const allConceptCardsFilled =
    step?.id === "concept"
      ? conceptCards.length > 0 &&
        conceptCards.every((c) => c.cardState === "filled")
      : true;
  const canvasHasContent =
    stickyNotes.some((p) => !p.templateKey || p.text.trim().length > 0) ||
    conceptCardComplete ||
    hmwCardComplete ||
    personaTemplates.some((t) => !!t.name);

  // Next button requires explicit confirmation (e.g. "Confirm Research Insights") for all steps
  const effectiveConfirmed = artifactConfirmed;

  // In-chat accept button: show when step has a confirm label, canvas has enough content, and user hasn't clicked Accept yet
  const confirmLabel = step ? STEP_CONFIRM_LABELS[step.id] : undefined;
  const minItems = step ? (STEP_CONFIRM_MIN_ITEMS[step.id] ?? 1) : 1;
  const filledConceptCount = conceptCards.filter(
    (c) => c.cardState === "filled",
  ).length;
  const canvasItemCount =
    stickyNotes.length +
    filledConceptCount +
    (hmwCardComplete ? 1 : 0) +
    personaTemplates.filter((t) => !!t.name).length;
  const allPersonasInterviewed =
    step?.id === "user-research"
      ? areAllPersonasInterviewed(stickyNotes)
      : true;
  // Journey map: require every cell (row × column) to have at least one grid item
  const allSwimLanesFilled =
    step?.id === "journey-mapping"
      ? gridColumns.length > 0 &&
        (() => {
          const gridRows =
            STEP_CANVAS_CONFIGS["journey-mapping"]?.gridConfig?.rows ?? [];
          return (
            gridRows.length > 0 &&
            gridRows.every((row) =>
              gridColumns.every((col) =>
                stickyNotes.some(
                  (n) =>
                    n.cellAssignment?.row === row.id &&
                    n.cellAssignment?.col === col.id,
                ),
              ),
            )
          );
        })()
      : true;
  const showConfirm =
    !!confirmLabel &&
    !artifactConfirmed &&
    canvasHasContent &&
    canvasItemCount >= minItems &&
    allPersonasInterviewed &&
    allSwimLanesFilled &&
    (allConceptCardsFilled || conceptProceedOverride);

  // Fire confetti when user clicks Accept (not on auto-confirm from canvas content)
  const prevConfirmed = React.useRef(artifactConfirmed);
  React.useEffect(() => {
    if (artifactConfirmed && !prevConfirmed.current) {
      fireConfetti();
    }
    prevConfirmed.current = artifactConfirmed;
  }, [artifactConfirmed]);

  // Last AI message text — shown in collapsed chat strip preview
  const [lastAiMessage, setLastAiMessage] = React.useState("");

  // Local messages state — allows clearing before ChatPanel re-mounts on reset
  const [localMessages, setLocalMessages] = React.useState(initialMessages);

  // Track whether auto-start already fired — survives ChatPanel unmount/remount (e.g. chat toggle).
  // Reset when navigating to a different step or when messages are explicitly cleared (reset).
  const [autoStartFired, setAutoStartFired] = React.useState(false);
  const handleAutoStarted = React.useCallback(
    () => setAutoStartFired(true),
    [],
  );

  // Sync from server when navigating between steps
  React.useEffect(() => {
    setLocalMessages(initialMessages);
    setAutoStartFired(false); // Reset for the new step
  }, [stepOrder]);

  // Admin guide editing state
  const [isGuideEditing, setIsGuideEditing] = React.useState(false);
  const [editingPopover, setEditingPopover] = React.useState<{
    guide: CanvasGuideData;
    position: { x: number; y: number };
  } | null>(null);

  // Asset drawer state
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = React.useState(false);
  // When true, selecting an asset swaps the current editing popover guide's libraryAssetId
  const [assetDrawerSelectionMode, setAssetDrawerSelectionMode] =
    React.useState(false);
  // Cache of linked asset data for popover display
  const [linkedAssetCache, setLinkedAssetCache] = React.useState<
    Record<string, import("@/lib/asset-library/asset-library-types").AssetData>
  >({});

  // Local guide state — initialized from server prop, synced when editing toggles off.
  // Without this, toggling guides off reverts to stale server-loaded data.
  const [localCanvasGuides, setLocalCanvasGuides] =
    React.useState(canvasGuides);

  // Lift useAdminGuides hook for live preview + popover operations
  const adminGuides = useAdminGuides(step?.id || "", !!isAdmin);

  const handleToggleGuideEditor = React.useCallback(() => {
    setIsGuideEditing((prev) => {
      const next = !prev;
      if (!next) {
        // Turning off editing — flush pending API writes and sync local state
        adminGuides.flushAll();
        setLocalCanvasGuides(adminGuides.guides);
        setEditingPopover(null);
      }
      return next;
    });
  }, [adminGuides]);

  const handleEditGuide = React.useCallback(
    (guide: CanvasGuideData, position: { x: number; y: number }) => {
      setEditingPopover({ guide, position });
    },
    [],
  );

  const handleAddGuide = React.useCallback(
    async (_clickPosition: { x: number; y: number }) => {
      // Compute viewport center in canvas coords for new guide placement
      const container = document.querySelector(".react-flow");
      const rect = container?.getBoundingClientRect();
      let canvasX = 200;
      let canvasY = 200;
      if (rect && canvasRef.current?.screenToFlowPosition) {
        const center = canvasRef.current.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        canvasX = Math.round(center.x);
        canvasY = Math.round(center.y);
      }

      const created = await adminGuides.createGuide({ canvasX, canvasY });
      if (created) {
        // Position popover at screen center + 120px right offset
        const popoverX = rect
          ? rect.left + rect.width / 2 + 120
          : _clickPosition.x;
        const popoverY = rect
          ? rect.top + rect.height / 2 - 100
          : _clickPosition.y;
        setEditingPopover({
          guide: created,
          position: { x: popoverX, y: popoverY },
        });
      }
    },
    [adminGuides],
  );

  const handleUpdateGuide = React.useCallback(
    (guideId: string, updates: Partial<CanvasGuideData>) => {
      adminGuides.updateGuide(guideId, updates);
      // Update the popover's guide state for live preview within the popover
      setEditingPopover((prev) =>
        prev && prev.guide.id === guideId
          ? { ...prev, guide: { ...prev.guide, ...updates } }
          : prev,
      );
    },
    [adminGuides],
  );

  const handleDeleteGuide = React.useCallback(
    async (guideId: string) => {
      await adminGuides.deleteGuide(guideId);
      setEditingPopover(null);
    },
    [adminGuides],
  );

  // Asset drawer: open in selection mode for hot-swap from popover
  const handleOpenAssetDrawer = React.useCallback(() => {
    setAssetDrawerSelectionMode(true);
    setIsAssetDrawerOpen(true);
  }, []);

  // Asset drawer: handle asset selection
  const handleAssetSelected = React.useCallback(
    (asset: import("@/lib/asset-library/asset-library-types").AssetData) => {
      if (assetDrawerSelectionMode && editingPopover) {
        // Hot-swap: update the guide's libraryAssetId, clear legacy inline SVG, and set new linkedAsset for live preview
        handleUpdateGuide(editingPopover.guide.id, {
          libraryAssetId: asset.id,
          imageSvg: null,
          linkedAsset: {
            inlineSvg: asset.inlineSvg ?? null,
            blobUrl: asset.blobUrl,
            name: asset.name,
          },
        });
        // Cache linked asset for popover display
        setLinkedAssetCache((prev) => ({ ...prev, [asset.id]: asset }));
      } else {
        // Place mode: create a new image guide linked to the asset
        const container = document.querySelector(".react-flow");
        const rect = container?.getBoundingClientRect();
        let canvasX = 200;
        let canvasY = 200;
        if (rect && canvasRef.current?.screenToFlowPosition) {
          const center = canvasRef.current.screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
          canvasX = Math.round(center.x);
          canvasY = Math.round(center.y);
        }
        adminGuides.createGuide({
          variant: "image",
          canvasX,
          canvasY,
          libraryAssetId: asset.id,
          linkedAsset: {
            inlineSvg: asset.inlineSvg ?? null,
            blobUrl: asset.blobUrl,
            name: asset.name,
          },
          body: "",
        });
        setLinkedAssetCache((prev) => ({ ...prev, [asset.id]: asset }));
      }
      setIsAssetDrawerOpen(false);
      setAssetDrawerSelectionMode(false);
    },
    [assetDrawerSelectionMode, editingPopover, handleUpdateGuide, adminGuides],
  );

  // Canvas ref for reading viewport (Save Default View) and screen-to-flow position conversion
  const canvasRef = React.useRef<{
    getViewport: () => { x: number; y: number; zoom: number };
    screenToFlowPosition: (position: { x: number; y: number }) => {
      x: number;
      y: number;
    };
  }>(null);

  // Handle "Save Default View" — reads current viewport, converts to center-offset, saves via API
  const handleSaveDefaultView = React.useCallback(async () => {
    if (!canvasRef.current || !step) return;
    const vp = canvasRef.current.getViewport();
    // Convert to center-offset: subtract container center to get offset values
    const container = document.querySelector(".react-flow");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const offsetX = Math.round(vp.x - rect.width / 2);
    const offsetY = Math.round(vp.y - rect.height / 2);

    try {
      const res = await fetch("/api/admin/canvas-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: step.id,
          defaultZoom: Math.round(vp.zoom * 100) / 100,
          defaultX: offsetX,
          defaultY: offsetY,
          viewportMode: "center-offset",
        }),
      });
      if (res.ok) {
        toast.success("Default view saved");
      } else {
        toast.error("Failed to save default view");
      }
    } catch (err) {
      console.error("Failed to save default view:", err);
      toast.error("Failed to save default view");
    }
  }, [step]);

  // Handle guide position updates from canvas drag — updates local state + debounced PATCH
  const handleGuidePositionUpdate = React.useCallback(
    (guideId: string, x: number, y: number) => {
      adminGuides.updateGuide(guideId, { canvasX: x, canvasY: y });
    },
    [adminGuides],
  );

  // Handle guide size updates from canvas resize — updates local state + debounced PATCH
  const handleGuideSizeUpdate = React.useCallback(
    (guideId: string, width: number, height: number, x: number, y: number) => {
      adminGuides.updateGuide(guideId, {
        width,
        height,
        canvasX: x,
        canvasY: y,
      });
    },
    [adminGuides],
  );

  // Sync template sticky note position to the corresponding DB guide by templateKey.
  // When admin drags a real template sticky note, persist the new position globally
  // so future sessions inherit the updated layout.
  const handleTemplateStickyPositionSync = React.useCallback(
    (templateKey: string, x: number, y: number) => {
      const guide = adminGuides.guides.find(
        (g) =>
          g.variant === "template-sticky-note" && g.templateKey === templateKey,
      );
      if (guide) {
        adminGuides.updateGuide(guide.id, { canvasX: x, canvasY: y });
      }
    },
    [adminGuides],
  );

  // Delete a template sticky note's DB guide when admin removes it from the canvas.
  const handleTemplateStickyDelete = React.useCallback(
    (templateKey: string) => {
      const guide = adminGuides.guides.find(
        (g) =>
          g.variant === "template-sticky-note" && g.templateKey === templateKey,
      );
      if (guide) {
        adminGuides.deleteGuide(guide.id);
      }
    },
    [adminGuides],
  );

  // PRD viewer dialog state
  const [showPrdDialog, setShowPrdDialog] = React.useState(false);

  // Step 10: client-side extraction state
  const [step10Artifact, setStep10Artifact] = React.useState<Record<
    string,
    unknown
  > | null>(stepOrder === 10 ? initialArtifact || null : null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(
    null,
  );
  const [step10MessageCount, setStep10MessageCount] = React.useState(0);

  // V0 prototype creation status (polling from journey map)
  const searchParams = useSearchParams();
  const v0Creating = stepOrder === 10 && searchParams.get("v0") === "creating";
  const [v0Status, setV0Status] = React.useState<
    "idle" | "creating" | "ready" | "error"
  >(v0Creating ? "creating" : "idle");
  const [v0Result, setV0Result] = React.useState<{
    demoUrl: string;
    editorUrl: string;
    fileCount: number;
  } | null>(null);

  // Workshop completion state — initialized from server-provided workshopStatus
  const [workshopCompleted, setWorkshopCompleted] = React.useState(
    workshopStatus === "completed",
  );
  const [isCompletingWorkshop, setIsCompletingWorkshop] = React.useState(false);

  // Billboard — concept data from Step 9
  const [conceptCardsForBillboard, setConceptCardsForBillboard] =
    React.useState<ConceptCardData[]>([]);
  const [isLoadingConcepts, setIsLoadingConcepts] = React.useState(false);

  // Billboard detail dialog (2-step flow)
  const [showBillboardDetail, setShowBillboardDetail] = React.useState(false);
  const [billboardDialogStep, setBillboardDialogStep] = React.useState<
    "text" | "image"
  >("text");
  const [selectedConceptIndexes, setSelectedConceptIndexes] = React.useState<
    number[]
  >([]);
  const [billboardMode, setBillboardMode] = React.useState<
    "combined" | "separate"
  >("combined");
  const [billboardUserPrompt, setBillboardUserPrompt] = React.useState("");
  const [billboardVisualStyle, setBillboardVisualStyle] =
    React.useState("vibrant");
  const [billboardImagePrompt, setBillboardImagePrompt] = React.useState("");

  // Generated billboards (1 in combined mode, N in separate)
  const [generatedBillboards, setGeneratedBillboards] = React.useState<
    Array<{
      headline: string;
      subheadline: string;
      cta: string;
      conceptName?: string;
    }>
  >([]);
  const [isBillboardTextGenerating, setIsBillboardTextGenerating] =
    React.useState(false);

  // Editable billboard text fields (keyed by index)
  const [editedBillboards, setEditedBillboards] = React.useState<
    Record<number, { headline: string; subheadline: string; cta: string }>
  >({});

  // Per-billboard image state (keyed by index)
  const [billboardImages, setBillboardImages] = React.useState<
    Record<number, string>
  >({});
  const [billboardImageGenerating, setBillboardImageGenerating] =
    React.useState<Record<number, boolean>>({});
  const [showBillboardImageDialog, setShowBillboardImageDialog] =
    React.useState<number | null>(null);

  // Step 10: load Step 9 concepts for billboard generator
  React.useEffect(() => {
    if (stepOrder !== 10) return;
    setIsLoadingConcepts(true);
    loadCanvasState(workshopId, "concept")
      .then((data) => {
        const cards =
          data?.conceptCards?.filter((c) => c.cardState === "filled") || [];
        setConceptCardsForBillboard(cards);
        setSelectedConceptIndexes(cards.map((_, i) => i));
      })
      .finally(() => setIsLoadingConcepts(false));
  }, [stepOrder, workshopId]);

  // Step 10: extraction handler — extracts synthesis artifact and marks step complete
  const handleStep10Extract = React.useCallback(async () => {
    if (stepOrder !== 10 || !step || isExtracting || step10Artifact) return;

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshopId,
          stepId: step.id,
          sessionId,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        // Response body wasn't JSON
      }

      if (!res.ok) {
        console.warn("Step 10 extract API error:", res.status, data);
        throw new Error(
          (data?.message as string) ||
            (data?.error as string) ||
            `Extraction failed (${res.status})`,
        );
      }

      setStep10Artifact(data.artifact as Record<string, unknown>);

      // Mark step 10 as complete
      await updateStepStatus(workshopId, step.id, "complete", sessionId);
      toast.success("Build Pack extracted", { duration: 4000 });
    } catch (error) {
      console.error("Step 10 extraction failed:", error);
      setExtractionError(
        error instanceof Error ? error.message : "Something went wrong",
      );
      toast.error("Failed to extract output", { duration: 4000 });
    } finally {
      setIsExtracting(false);
    }
  }, [stepOrder, step, isExtracting, step10Artifact, workshopId, sessionId]);

  // Workshop completion handler — calls server action, fires confetti, transitions UI
  const handleCompleteWorkshop = React.useCallback(async () => {
    if (isCompletingWorkshop || workshopCompleted) return;

    setIsCompletingWorkshop(true);
    try {
      await completeWorkshop(workshopId, sessionId);
      setWorkshopCompleted(true);
      fireConfetti();
      toast.success("Workshop completed!", { duration: 4000 });
    } catch (error) {
      // completeWorkshop does not call redirect(), so no NEXT_REDIRECT to rethrow
      console.error("Failed to complete workshop:", error);
      toast.error("Failed to complete workshop");
    } finally {
      setIsCompletingWorkshop(false);
    }
  }, [isCompletingWorkshop, workshopCompleted, workshopId, sessionId]);

  // Step 10: auto-extract on mount when conversation already exists
  const hasAutoExtracted = React.useRef(false);
  React.useEffect(() => {
    if (
      stepOrder === 10 &&
      !step10Artifact &&
      !isExtracting &&
      !hasAutoExtracted.current
    ) {
      // Auto-extract if we have initial messages from DB (returning user)
      // or if enough live messages accumulated (new session)
      const hasEnoughInitial = (initialMessages?.length ?? 0) >= 4;
      const hasEnoughLive = step10MessageCount >= 6;

      if (hasEnoughInitial || hasEnoughLive) {
        hasAutoExtracted.current = true;
        // Small delay to avoid Gemini rate limits from the preceding chat conversation
        const timer = setTimeout(() => handleStep10Extract(), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [
    stepOrder,
    step10Artifact,
    isExtracting,
    initialMessages?.length,
    step10MessageCount,
    handleStep10Extract,
  ]);

  // V0 prototype polling — check status every 3s while creating
  React.useEffect(() => {
    if (v0Status !== "creating") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/build-pack/v0-status?workshopId=${workshopId}`,
        );
        if (cancelled) return;
        const data = await res.json();
        if (data.status === "ready") {
          setV0Status("ready");
          setV0Result({
            demoUrl: data.demoUrl,
            editorUrl: data.editorUrl,
            fileCount: data.fileCount,
          });
          toast.success("v0 prototype created!", { duration: 5000 });
        } else if (data.status === "failed") {
          setV0Status("error");
        }
        // Keep polling on 'pending'
      } catch {
        // Network error — keep polling
      }
    };

    // Start polling after a short initial delay
    const initialTimer = setTimeout(poll, 2000);
    const interval = setInterval(poll, 3000);

    // Stop after 5 minutes (V0 async generation can take 60-120s)
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setV0Status("error");
      }
    }, 300000);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [v0Status, workshopId]);

  // Reset dialog state
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  // Reset key forces ChatPanel/IdeationSubStepContainer to re-mount (clearing useChat state)
  const [resetKey, setResetKey] = React.useState(0);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset mobile tab to 'chat' when navigating between steps
  React.useEffect(() => {
    setMobileTab("chat");
  }, [stepOrder]);

  // Handle reset (clear data and full forward wipe)
  const handleReset = React.useCallback(async () => {
    try {
      setIsResetting(true);
      const step = getStepByOrder(stepOrder);
      if (!step) {
        console.error("Step not found for reset");
        return;
      }
      await resetStep(workshopId, step.id, sessionId);
      setShowResetDialog(false);
      // Reset local state
      setArtifactConfirmed(false);
      setLocalMessages([]);
      setAutoStartFired(false); // Allow auto-start to fire again after reset
      // Clear Step 10 extraction state
      setStep10Artifact(null);
      hasAutoExtracted.current = false;
      // Clear billboard state
      setGeneratedBillboards([]);
      setEditedBillboards({});
      setBillboardImages({});
      setConceptCardsForBillboard([]);
      setBillboardDialogStep("text");
      // Force re-mount of ChatPanel/IdeationSubStepContainer to clear useChat state
      setResetKey((prev) => prev + 1);
      // Clear canvas/whiteboard state AFTER resetKey so the new store mount
      // gets overwritten with empty state (resetKey re-creates store from stale server props)
      requestAnimationFrame(() => {
        setStickyNotes([]);
        setDrawingNodes([]);
        setCrazy8sSlots([]);
        setMindMapState([], []);
        setConceptCards([]);
        setGridColumns([]);
        setSelectedSlotIds([]);
        setPersonaTemplates([]);
        setHmwCards([]);
        setBrainRewritingMatrices([]);
      });
      // Refresh page to reload with cleared server state
      router.refresh();
    } catch (error) {
      console.error("Failed to reset step:", error);
    } finally {
      setIsResetting(false);
    }
  }, [
    workshopId,
    stepOrder,
    sessionId,
    router,
    setStickyNotes,
    setDrawingNodes,
    setCrazy8sSlots,
    setMindMapState,
    setConceptCards,
    setGridColumns,
    setSelectedSlotIds,
    setPersonaTemplates,
    setHmwCards,
    setBrainRewritingMatrices,
  ]);

  // Billboard text generation handler
  const handleGenerateBillboardText = React.useCallback(async () => {
    const selected = selectedConceptIndexes
      .map((i) => conceptCardsForBillboard[i])
      .filter(Boolean);
    if (selected.length === 0 || isBillboardTextGenerating) return;

    setIsBillboardTextGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-billboard-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshopId,
          concepts: selected.map((c) => ({
            conceptName: c.conceptName,
            elevatorPitch: c.elevatorPitch,
            usp: c.usp,
          })),
          mode: billboardMode,
          userPrompt: billboardUserPrompt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || `Failed (${res.status})`,
        );
      }

      const { billboards } = await res.json();
      setGeneratedBillboards(billboards);
      // Populate editable fields from generated text
      const edited: Record<
        number,
        { headline: string; subheadline: string; cta: string }
      > = {};
      (
        billboards as Array<{
          headline: string;
          subheadline: string;
          cta: string;
        }>
      ).forEach((bb, i) => {
        edited[i] = {
          headline: bb.headline,
          subheadline: bb.subheadline,
          cta: bb.cta,
        };
      });
      setEditedBillboards(edited);
      setBillboardImages({});
      setBillboardImageGenerating({});
    } catch (error) {
      console.error("Billboard text generation failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate billboard text",
      );
    } finally {
      setIsBillboardTextGenerating(false);
    }
  }, [
    selectedConceptIndexes,
    conceptCardsForBillboard,
    billboardMode,
    billboardUserPrompt,
    workshopId,
    isBillboardTextGenerating,
  ]);

  // Billboard image generation handler (per-billboard index)
  const handleGenerateBillboardImageForIndex = React.useCallback(
    async (idx: number) => {
      const edited = editedBillboards[idx];
      const billboard = edited || generatedBillboards[idx];
      if (!billboard || billboardImageGenerating[idx]) return;

      const styleObj = BILLBOARD_VISUAL_STYLES.find(
        (s) => s.value === billboardVisualStyle,
      );

      setBillboardImageGenerating((prev) => ({ ...prev, [idx]: true }));
      try {
        const res = await fetch("/api/ai/generate-billboard-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workshopId,
            headline: billboard.headline,
            subheadline: billboard.subheadline,
            cta: billboard.cta,
            previousImageUrl: billboardImages[idx] || undefined,
            visualStyle: styleObj?.prompt,
            userPrompt: billboardImagePrompt || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error || `Failed (${res.status})`,
          );
        }

        const { imageUrl } = await res.json();
        setBillboardImages((prev) => ({ ...prev, [idx]: imageUrl }));
      } catch (error) {
        console.error("Billboard image generation failed:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to generate billboard image",
        );
      } finally {
        setBillboardImageGenerating((prev) => ({ ...prev, [idx]: false }));
      }
    },
    [
      editedBillboards,
      generatedBillboards,
      billboardImages,
      billboardImageGenerating,
      workshopId,
      billboardVisualStyle,
      billboardImagePrompt,
    ],
  );

  // Step 10: render Build Pack deliverable cards + extraction status
  // Synthesis summary (narrative, journey, confidence, next steps) lives on the results page
  const renderStep10Content = () => {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="space-y-8">
          {/* Extraction status banner — non-blocking */}
          {isExtracting && (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">
                Generating synthesis summary...
              </p>
            </div>
          )}
          {extractionError && (
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-muted-foreground">
                Summary generation failed — you can still generate your Build
                Pack below.
              </p>
              <button
                onClick={() => {
                  hasAutoExtracted.current = false;
                  setExtractionError(null);
                  handleStep10Extract();
                }}
                className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Build Pack deliverables — always available */}
          <SynthesisBuildPackSection
            workshopId={workshopId}
            onGeneratePrd={() => setShowPrdDialog(true)}
            onGenerateBillboard={() => {
              // Resume at the right step based on previous progress
              if (generatedBillboards.length > 0) {
                setBillboardDialogStep("image");
              }
              setShowBillboardDetail(true);
            }}
            hasBillboard={generatedBillboards.length > 0}
            workshopCompleted={workshopCompleted}
          />

          {/* UX Journey Map — central gatekeeper before prototyping */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
                  <path d="M9 3v15" />
                  <path d="M15 6v15" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold">UX Journey Map</h3>
                <p className="text-xs text-muted-foreground">
                  Review and approve your journey map before creating a
                  prototype
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your validated concepts are mapped onto user journey stages.
              Approve the map to unlock prototype generation.
            </p>
            <div className="flex items-center gap-3">
              <a
                href={`/workshop/${sessionId}/outputs/journey-map`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
                  <path d="M9 3v15" />
                  <path d="M15 6v15" />
                </svg>
                Open Journey Map
              </a>
              <span className="text-xs text-muted-foreground">
                Approve your map to enable prototyping
              </span>
            </div>
          </div>

          {/* V0 Prototype creation status */}
          {v0Status === "creating" && (
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    Creating Prototype
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Your v0 prototype is being built from your journey map...
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This typically takes 30-60 seconds. You&apos;ll be notified when
                it&apos;s ready.
              </p>
            </div>
          )}

          {v0Status === "ready" && v0Result && (
            <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Prototype Ready</h3>
                  <p className="text-xs text-muted-foreground">
                    Your v0 prototype has been created successfully
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {v0Result.editorUrl && (
                  <a
                    href={`${v0Result.editorUrl}${v0Result.editorUrl.includes("?") ? "&" : "?"}f=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Rocket className="h-4 w-4" />
                    View Prototype
                  </a>
                )}
                {v0Result.editorUrl && (
                  <a
                    href={v0Result.editorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Edit in v0
                  </a>
                )}
                {v0Result.fileCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileCode2 className="h-3.5 w-3.5" />
                    {v0Result.fileCount} file
                    {v0Result.fileCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {v0Status === "error" && (
            <div className="rounded-xl border-2 border-destructive/20 bg-destructive/5 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <Rocket className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    Prototype Creation Issue
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    The prototype is taking longer than expected or may have
                    failed.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setV0Status("creating")}
                  className="gap-1.5"
                >
                  <Loader2 className="h-3.5 w-3.5" />
                  Keep Waiting
                </Button>
                <a
                  href={`/workshop/${sessionId}/outputs/journey-map`}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Journey Map
                </a>
              </div>
            </div>
          )}
        </div>
        <PrdViewerDialog
          open={showPrdDialog}
          onOpenChange={setShowPrdDialog}
          workshopId={workshopId}
        />

        {/* Billboard full-size image lightbox — edge-to-edge overlay */}
        {showBillboardImageDialog !== null &&
          billboardImages[showBillboardImageDialog] && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
              onClick={() => setShowBillboardImageDialog(null)}
            >
              <button
                onClick={() => setShowBillboardImageDialog(null)}
                className="absolute top-4 right-4 rounded-full bg-background/10 p-2 text-white hover:bg-background/20 transition-colors z-10"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={billboardImages[showBillboardImageDialog]}
                alt="Billboard hero visual — full size"
                className="max-h-[95vh] max-w-[95vw] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

        {/* Billboard Detail Dialog — 2-step flow */}
        <Dialog
          open={showBillboardDetail}
          onOpenChange={setShowBillboardDetail}
        >
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Billboard Hero
              </DialogTitle>
              <DialogDescription>
                {billboardDialogStep === "text"
                  ? "Generate and edit your billboard copy."
                  : "Choose a visual style and generate your hero image."}
              </DialogDescription>
            </DialogHeader>

            {billboardDialogStep === "text" ? (
              /* ===== Step 1: Text Generation & Editing ===== */
              <div className="space-y-5 py-2">
                {/* Show generated text editing if we have results */}
                {generatedBillboards.length > 0 ? (
                  <div className="space-y-5">
                    {generatedBillboards.map((bb, idx) => {
                      const edited = editedBillboards[idx] || {
                        headline: bb.headline,
                        subheadline: bb.subheadline,
                        cta: bb.cta,
                      };
                      return (
                        <div key={idx} className="space-y-3">
                          {generatedBillboards.length > 1 && (
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {bb.conceptName || `Billboard ${idx + 1}`}
                            </p>
                          )}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Headline
                            </label>
                            <input
                              type="text"
                              value={edited.headline}
                              onChange={(e) =>
                                setEditedBillboards((prev) => ({
                                  ...prev,
                                  [idx]: {
                                    ...edited,
                                    headline: e.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Subheadline
                            </label>
                            <textarea
                              value={edited.subheadline}
                              onChange={(e) =>
                                setEditedBillboards((prev) => ({
                                  ...prev,
                                  [idx]: {
                                    ...edited,
                                    subheadline: e.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Call to Action
                            </label>
                            <input
                              type="text"
                              value={edited.cta}
                              onChange={(e) =>
                                setEditedBillboards((prev) => ({
                                  ...prev,
                                  [idx]: { ...edited, cta: e.target.value },
                                }))
                              }
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      );
                    })}

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="outline"
                        onClick={handleGenerateBillboardText}
                        disabled={isBillboardTextGenerating}
                        className="gap-2"
                      >
                        {isBillboardTextGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Regenerate Text
                      </Button>
                      <Button
                        onClick={() => setBillboardDialogStep("image")}
                        className="gap-2"
                      >
                        Continue to Image
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  /* --- Text generation form --- */
                  <div className="space-y-5">
                    {/* Loading concepts */}
                    {isLoadingConcepts ? (
                      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Loading concepts...
                        </p>
                      </div>
                    ) : conceptCardsForBillboard.length === 0 ? (
                      <div className="rounded-lg border bg-card p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Complete Step 9 (Concept Development) to unlock the
                          Billboard Hero.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Concept checkboxes */}
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Concepts</p>
                          {conceptCardsForBillboard.map((card, idx) => (
                            <label
                              key={card.id}
                              className="flex items-start gap-3 cursor-pointer group"
                            >
                              <Checkbox
                                checked={selectedConceptIndexes.includes(idx)}
                                onCheckedChange={(checked) => {
                                  setSelectedConceptIndexes((prev) =>
                                    checked
                                      ? [...prev, idx]
                                      : prev.filter((i) => i !== idx),
                                  );
                                }}
                                className="mt-0.5"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                                  {card.conceptName}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {card.elevatorPitch}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* Mode toggle — only when 2+ concepts selected */}
                        {selectedConceptIndexes.length >= 2 && (
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">
                                Separate billboards
                              </p>
                              <p className="text-xs text-muted-foreground">
                                One billboard per concept instead of combined
                              </p>
                            </div>
                            <Switch
                              checked={billboardMode === "separate"}
                              onCheckedChange={(checked) =>
                                setBillboardMode(
                                  checked ? "separate" : "combined",
                                )
                              }
                            />
                          </div>
                        )}

                        {/* Creative direction */}
                        <div className="space-y-2">
                          <label
                            htmlFor="billboard-prompt"
                            className="text-sm font-medium"
                          >
                            Creative direction{" "}
                            <span className="text-muted-foreground font-normal">
                              (optional)
                            </span>
                          </label>
                          <textarea
                            id="billboard-prompt"
                            value={billboardUserPrompt}
                            onChange={(e) =>
                              setBillboardUserPrompt(e.target.value)
                            }
                            placeholder="e.g. Make it playful and bold, target Gen Z audience..."
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            rows={3}
                          />
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowBillboardDetail(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleGenerateBillboardText}
                            disabled={
                              selectedConceptIndexes.length === 0 ||
                              isBillboardTextGenerating
                            }
                            className="gap-2"
                          >
                            {isBillboardTextGenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Generate Billboard Text
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ===== Step 2: Image Generation ===== */
              <div className="space-y-5 py-2">
                {/* Editable text + generated image */}
                {generatedBillboards.map((bb, idx) => {
                  const edited = editedBillboards[idx] || {
                    headline: bb.headline,
                    subheadline: bb.subheadline,
                    cta: bb.cta,
                  };
                  return (
                    <div key={idx} className="space-y-3">
                      {generatedBillboards.length > 1 && (
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {bb.conceptName || `Billboard ${idx + 1}`}
                        </p>
                      )}
                      <div className="rounded-lg border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 p-5 space-y-3">
                        <input
                          type="text"
                          value={edited.headline}
                          onChange={(e) =>
                            setEditedBillboards((prev) => ({
                              ...prev,
                              [idx]: { ...edited, headline: e.target.value },
                            }))
                          }
                          className="w-full bg-transparent text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1"
                        />
                        <textarea
                          value={edited.subheadline}
                          onChange={(e) =>
                            setEditedBillboards((prev) => ({
                              ...prev,
                              [idx]: { ...edited, subheadline: e.target.value },
                            }))
                          }
                          className="w-full bg-transparent text-center text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1 resize-none"
                          rows={2}
                        />
                        <div className="text-center">
                          <input
                            type="text"
                            value={edited.cta}
                            onChange={(e) =>
                              setEditedBillboards((prev) => ({
                                ...prev,
                                [idx]: { ...edited, cta: e.target.value },
                              }))
                            }
                            className="inline-block bg-primary text-primary-foreground text-center text-sm font-semibold rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>

                      {/* Generated image */}
                      {billboardImages[idx] && (
                        <button
                          onClick={() => setShowBillboardImageDialog(idx)}
                          className="w-full overflow-hidden rounded-lg border-2 border-primary/30 transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <img
                            src={billboardImages[idx]}
                            alt={`Billboard visual ${idx + 1}`}
                            className="w-full object-cover"
                          />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Visual style dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visual Style</label>
                  <div className="relative">
                    <select
                      value={billboardVisualStyle}
                      onChange={(e) => setBillboardVisualStyle(e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {BILLBOARD_VISUAL_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                {/* Freeform image prompt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Image direction{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={billboardImagePrompt}
                    onChange={(e) => setBillboardImagePrompt(e.target.value)}
                    placeholder="e.g. Include abstract geometric shapes, use purple and gold tones..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setBillboardDialogStep("text")}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {/* Generate image for each billboard */}
                  <Button
                    onClick={() => {
                      generatedBillboards.forEach((_, idx) =>
                        handleGenerateBillboardImageForIndex(idx),
                      );
                    }}
                    disabled={Object.values(billboardImageGenerating).some(
                      Boolean,
                    )}
                    className="gap-2"
                  >
                    {Object.values(billboardImageGenerating).some(Boolean) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4" />
                        {Object.keys(billboardImages).length > 0
                          ? "Regenerate Image"
                          : "Generate Image"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Step 8 uses specialized sub-step container
  if (stepOrder === 8) {
    // votingMode is true when in idea-selection phase (no brain-rewriting matrices yet)
    // and voting has not yet closed. FacilitatorControls uses this to couple the timer
    // to the voting lifecycle (VOTING_OPENED / VOTING_CLOSED broadcasts).
    const isVotingMode =
      brainRewritingMatrices.length === 0 && votingSession.status !== "closed";

    return (
      <>
        <IdeationSubStepContainer
          key={resetKey}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={localMessages}
          initialArtifact={initialArtifact}
          stepStatus={stepStatus}
          isAdmin={isAdmin}
          onReset={() => setShowResetDialog(true)}
          hmwStatement={hmwStatement}
          challengeStatement={challengeStatement}
          hmwGoals={hmwGoals}
        />
        {/* FacilitatorControls for Step 8 — rendered inside multiplayer tree so
            useBroadcastEvent() works. votingMode couples timer to voting lifecycle. */}
        {workshopType === "multiplayer" && (
          <>
            <StepAdvanceBroadcaster broadcastRef={broadcastRef} />
            <FacilitatorControls
              workshopId={workshopId}
              sessionId={sessionId}
              votingMode={isVotingMode}
            />
          </>
        )}
        <ResetStepDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          onConfirm={handleReset}
          isResetting={isResetting}
          stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
        />
      </>
    );
  }

  // Render content section
  const renderContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      {!isMobile && (
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              AI
            </div>
            <span className="text-sm font-medium">Workshop Pilot</span>
          </div>
          <button
            onClick={() => setChatCollapsed(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Minimize chat"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ChatPanel
          key={resetKey}
          stepOrder={stepOrder}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={localMessages}
          onMessageCountChange={
            stepOrder === 10 ? setStep10MessageCount : undefined
          }
          showStepConfirm={showConfirm}
          onStepConfirm={() => setArtifactConfirmed(true)}
          onStepRevise={() => setArtifactConfirmed(false)}
          stepConfirmLabel={confirmLabel}
          stepAlreadyConfirmed={artifactConfirmed}
          onConceptComplete={() => setConceptProceedOverride(true)}
          skipAutoStart={autoStartFired}
          onAutoStarted={handleAutoStarted}
          onLastAssistantMessage={setLastAiMessage}
          hideAvatar={!isMobile}
        />
      </div>
    </div>
  );

  // Mobile: tab-based layout
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        {/* Content area - show one panel at a time */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* Both panels mounted, visibility toggled with CSS for instant switching */}
          <div className={cn("h-full", mobileTab !== "chat" && "hidden")}>
            {renderContent()}
          </div>
          <div className={cn("h-full", mobileTab !== "canvas" && "hidden")}>
            {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
              <div className="h-full relative">
                <CanvasWrapper
                  sessionId={sessionId}
                  stepId={step.id}
                  workshopId={workshopId}
                  workshopType={workshopType}
                  canvasGuides={
                    isGuideEditing ? adminGuides.guides : localCanvasGuides
                  }
                  defaultViewportSettings={canvasSettings}
                  isAdmin={isAdmin}
                  isAdminEditing={isGuideEditing}
                  onEditGuide={handleEditGuide}
                  onAddGuide={handleAddGuide}
                  onGuidePositionUpdate={handleGuidePositionUpdate}
                  onGuideSizeUpdate={handleGuideSizeUpdate}
                  onTemplateStickyPositionSync={
                    handleTemplateStickyPositionSync
                  }
                  onTemplateStickyDelete={handleTemplateStickyDelete}
                  canvasRef={canvasRef}
                />
                {step.id === "concept" && (
                  <ConceptCanvasOverlay
                    workshopId={workshopId}
                    stepId={step.id}
                    selectedSketchSlotIds={step8SelectedSlotIds}
                    crazy8sSlots={step8Crazy8sSlots}
                  />
                )}
              </div>
            ) : stepOrder === 10 ? (
              renderStep10Content()
            ) : (
              <RightPanel
                stepOrder={stepOrder}
                sessionId={sessionId}
                workshopId={workshopId}
                workshopType={workshopType}
                canvasGuides={
                  isGuideEditing ? adminGuides.guides : localCanvasGuides
                }
                defaultViewportSettings={canvasSettings}
                isAdmin={isAdmin}
                isAdminEditing={isGuideEditing}
                onEditGuide={handleEditGuide}
                onAddGuide={handleAddGuide}
                onGuidePositionUpdate={handleGuidePositionUpdate}
                onGuideSizeUpdate={handleGuideSizeUpdate}
                onTemplateStickyPositionSync={handleTemplateStickyPositionSync}
                onTemplateStickyDelete={handleTemplateStickyDelete}
                canvasRef={canvasRef}
              />
            )}
          </div>
        </div>

        {/* Tab bar - above step navigation */}
        <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} />

        {/* Step navigation - fixed at bottom, full width */}
        {/* Hidden for participants in multiplayer mode — only the facilitator can advance */}
        {(!isMultiplayer || isFacilitator) && (
          <StepNavigation
            sessionId={sessionId}
            workshopId={workshopId}
            currentStepOrder={stepOrder}
            artifactConfirmed={effectiveConfirmed}
            stepExplicitlyConfirmed={artifactConfirmed}
            stepStatus={stepStatus}
            isAdmin={isAdmin}
            onReset={() => setShowResetDialog(true)}
            onToggleGuideEditor={
              isCanvasStep || isAdmin ? handleToggleGuideEditor : undefined
            }
            isGuideEditing={isGuideEditing}
            onAddGuide={isGuideEditing ? handleAddGuide : undefined}
            onSaveDefaultView={
              isGuideEditing ? handleSaveDefaultView : undefined
            }
            onCompleteWorkshop={
              stepOrder === 10 ? handleCompleteWorkshop : undefined
            }
            isCompletingWorkshop={isCompletingWorkshop}
            workshopCompleted={workshopCompleted}
            canCompleteWorkshop={stepOrder === 10 && !!step10Artifact}
            onBeforeAdvance={handleBeforeAdvance}
            onFlushCanvas={flushCanvasToDb}
          />
        )}
        <ResetStepDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          onConfirm={handleReset}
          isResetting={isResetting}
          stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
        />
        {/* Admin guide popover */}
        {isAdmin && editingPopover && (
          <GuideEditPopover
            guide={editingPopover.guide}
            position={editingPopover.position}
            onUpdate={handleUpdateGuide}
            onDelete={handleDeleteGuide}
            onSave={adminGuides.flushAll}
            hasPendingChanges={adminGuides.hasPendingChanges}
            onClose={() => setEditingPopover(null)}
            linkedAsset={
              editingPopover.guide.libraryAssetId
                ? (linkedAssetCache[editingPopover.guide.libraryAssetId] ??
                  null)
                : null
            }
            onOpenAssetDrawer={handleOpenAssetDrawer}
            allGuides={adminGuides.guides}
          />
        )}
        {/* Asset drawer */}
        {isAdmin && (
          <AssetDrawer
            open={isAssetDrawerOpen}
            onOpenChange={(open) => {
              setIsAssetDrawerOpen(open);
              if (!open) setAssetDrawerSelectionMode(false);
            }}
            onSelectAsset={handleAssetSelected}
            selectionLabel={
              assetDrawerSelectionMode ? "Select asset to swap" : undefined
            }
          />
        )}
      </div>
    );
  }

  // Canvas panel renderer — shared between resizable and full-width layouts
  const renderCanvasPanel = () => {
    if (step && CANVAS_ONLY_STEPS.includes(step.id)) {
      return (
        <div className="h-full relative">
          <CanvasWrapper
            sessionId={sessionId}
            stepId={step.id}
            workshopId={workshopId}
            workshopType={workshopType}
            canvasGuides={
              isGuideEditing ? adminGuides.guides : localCanvasGuides
            }
            defaultViewportSettings={canvasSettings}
            isAdmin={isAdmin}
            isAdminEditing={isGuideEditing}
            onEditGuide={handleEditGuide}
            onAddGuide={handleAddGuide}
            onGuidePositionUpdate={handleGuidePositionUpdate}
            onGuideSizeUpdate={handleGuideSizeUpdate}
            onTemplateStickyPositionSync={handleTemplateStickyPositionSync}
            onTemplateStickyDelete={handleTemplateStickyDelete}
            canvasRef={canvasRef}
          />
          {step.id === "concept" && (
            <ConceptCanvasOverlay
              workshopId={workshopId}
              stepId={step.id}
              selectedSketchSlotIds={step8SelectedSlotIds}
              crazy8sSlots={step8Crazy8sSlots}
            />
          )}
        </div>
      );
    }
    if (stepOrder === 10) {
      return (
        <div className="h-full relative">
          {renderStep10Content()}
        </div>
      );
    }
    return (
      <RightPanel
        stepOrder={stepOrder}
        sessionId={sessionId}
        workshopId={workshopId}
        workshopType={workshopType}
        canvasGuides={isGuideEditing ? adminGuides.guides : localCanvasGuides}
        defaultViewportSettings={canvasSettings}
        isAdmin={isAdmin}
        isAdminEditing={isGuideEditing}
        onEditGuide={handleEditGuide}
        onAddGuide={handleAddGuide}
        onGuidePositionUpdate={handleGuidePositionUpdate}
        onGuideSizeUpdate={handleGuideSizeUpdate}
        onTemplateStickyPositionSync={handleTemplateStickyPositionSync}
        onTemplateStickyDelete={handleTemplateStickyDelete}
        canvasRef={canvasRef}
      />
    );
  };

  // Bubble text: last AI message or a helpful default
  const collapsedBubbleText =
    lastAiMessage ||
    "Stuck? Let me help you with anything — tips, ideas and sorting items";

  // Desktop: canvas always full-width, chat floats over it
  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <StepTransitionWrapper stepId={step?.id ?? String(stepOrder)}>
          <div className="flex h-full">
            {/* Canvas — always takes full width */}
            <div className="flex-1">{renderCanvasPanel()}</div>
          </div>
        </StepTransitionWrapper>

        {/* Floating chat panel — expands from bottom-left, overlays the canvas */}
        {!chatCollapsed ? (
          <div
            className="absolute bottom-3 left-3 right-3 z-40 flex"
            style={{ maxWidth: 480, top: "15%" }}
          >
            <div className="flex w-full flex-col overflow-hidden rounded-2xl border bg-neutral-olive-50/95 shadow-xl backdrop-blur-sm dark:bg-olive-950/95">
              {renderContent()}
            </div>
          </div>
        ) : (
          /* Hidden render to keep React state alive */
          <div className="hidden">{renderContent()}</div>
        )}

        {/* Floating AI bubble — bottom-left when chat is collapsed */}
        {chatCollapsed && (
          <button
            onClick={() => setChatCollapsed(false)}
            className="group absolute bottom-3 left-3 z-40 flex max-w-md items-center gap-2.5 rounded-full border bg-neutral-olive-50/90 py-2 pl-2 pr-4 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            title="Open chat"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              AI
            </div>
            <span className="truncate text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {collapsedBubbleText}
            </span>
            <Maximize2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        )}
      </div>
      {/* StepAdvanceBroadcaster — only mounted in multiplayer (inside RoomProvider).
          Captures useBroadcastEvent and exposes it via ref for handleBeforeAdvance. */}
      {workshopType === "multiplayer" && (
        <>
          <StepAdvanceBroadcaster broadcastRef={broadcastRef} />
          {/* Multiplayer controls — fixed top-right, below header bar on the canvas.
              Styled to match the bottom canvas toolbar (bg-card rounded-xl shadow-md border). */}
          <div className="fixed top-[4.5rem] right-4 z-50 flex items-center gap-0.5 bg-card rounded-xl shadow-md border border-border px-1.5 py-1">
            <FacilitatorControls workshopId={workshopId} sessionId={sessionId} />
            <PresenceBar />
          </div>
        </>
      )}
      {/* Step navigation — hidden for participants in multiplayer mode */}
      {(!isMultiplayer || isFacilitator) && (
        <StepNavigation
          sessionId={sessionId}
          workshopId={workshopId}
          currentStepOrder={stepOrder}
          artifactConfirmed={effectiveConfirmed}
          stepExplicitlyConfirmed={artifactConfirmed}
          stepStatus={stepStatus}
          isAdmin={isAdmin}
          onReset={() => setShowResetDialog(true)}
          onToggleGuideEditor={
            isCanvasStep || isAdmin ? handleToggleGuideEditor : undefined
          }
          isGuideEditing={isGuideEditing}
          onAddGuide={isGuideEditing ? handleAddGuide : undefined}
          onSaveDefaultView={isGuideEditing ? handleSaveDefaultView : undefined}
          onCompleteWorkshop={
            stepOrder === 10 ? handleCompleteWorkshop : undefined
          }
          isCompletingWorkshop={isCompletingWorkshop}
          workshopCompleted={workshopCompleted}
          canCompleteWorkshop={stepOrder === 10 && !!step10Artifact}
          onBeforeAdvance={handleBeforeAdvance}
          onFlushCanvas={flushCanvasToDb}
        />
      )}
      <ResetStepDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleReset}
        isResetting={isResetting}
        stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
      />
      {/* Admin guide popover */}
      {isAdmin && editingPopover && (
        <GuideEditPopover
          guide={editingPopover.guide}
          position={editingPopover.position}
          onUpdate={handleUpdateGuide}
          onDelete={handleDeleteGuide}
          onSave={adminGuides.flushAll}
          hasPendingChanges={adminGuides.hasPendingChanges}
          onClose={() => setEditingPopover(null)}
          linkedAsset={
            editingPopover.guide.libraryAssetId
              ? (linkedAssetCache[editingPopover.guide.libraryAssetId] ?? null)
              : null
          }
          onOpenAssetDrawer={handleOpenAssetDrawer}
        />
      )}
      {/* Asset drawer */}
      {isAdmin && (
        <AssetDrawer
          open={isAssetDrawerOpen}
          onOpenChange={(open) => {
            setIsAssetDrawerOpen(open);
            if (!open) setAssetDrawerSelectionMode(false);
          }}
          onSelectAsset={handleAssetSelected}
          selectionLabel={
            assetDrawerSelectionMode ? "Select asset to swap" : undefined
          }
        />
      )}
    </div>
  );
}

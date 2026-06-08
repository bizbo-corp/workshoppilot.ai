"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { UIMessage } from "ai";
import { ChatPanel, type ChatPanelHandle } from "./chat-panel";
import { StepConfirmButton } from "./step-confirm-button";
import { ParticipantChatPanel } from "./participant-chat-panel";
import { RightPanel } from "./right-panel";
import { WorkshopSetup } from "./setup/workshop-setup";
import { ValidatePanel } from "./validate/ValidatePanel";
import { MobileTabBar } from "./mobile-tab-bar";
import { StepNavigation } from "./step-navigation";
import { ResetStepDialog } from "@/components/dialogs/reset-step-dialog";
import { PrdViewerDialog } from "./prd-viewer-dialog";
import { useIdeationPhases } from "@/hooks/use-ideation-phases";
import { useBrainwritingPhase, type BrainwritingSeed } from "@/hooks/use-brainwriting-phase";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  UserPlus,
  X,
} from "lucide-react";
import {
  resetStep,
  updateStepStatus,
  completeWorkshop,
  convertToTeamWorkshop,
} from "@/actions/workshop-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users } from "lucide-react";
import { saveCanvasState } from "@/actions/canvas-actions";
import {
  getStepByOrder,
  STEP_CONFIRM_LABELS,
  STEP_CONFIRM_MIN_ITEMS,
  areAllPersonasInterviewed,
} from "@/lib/workshop/step-metadata";
import { STEP_CANVAS_CONFIGS } from "@/lib/canvas/step-canvas-config";
import { fireConfetti } from "@/lib/utils/confetti";
import { cn } from "@/lib/utils";
import { FACILITATOR } from "@/lib/ai/facilitator";
import { getWorkshopColor } from "@/lib/workshop/workshop-appearance";
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
import { usePanelLayout, clampChatWidth } from "@/hooks/use-panel-layout";
import { WorkshopHeader } from "@/components/layout/workshop-header";
import { ShareLinkButton } from "@/components/workshop/share-link-button";
import { StepTransitionWrapper } from "./step-transition-wrapper";
import type { CanvasGuideData } from "@/lib/canvas/canvas-guide-types";
import type { StepCanvasSettingsData } from "@/lib/canvas/step-canvas-settings-types";
import { useMultiplayerContext } from "@/components/workshop/multiplayer-room";
import { SetupWorkshopWizard } from "@/components/workshop/setup-workshop-wizard";
import { useBroadcastEvent } from "@liveblocks/react";
import { FacilitatorControls } from "./facilitator-controls";
import { PresenceBar } from "./presence-bar";
import { ParticipantOverview } from "./participant-overview";
import { usePendingInviteCount } from "@/hooks/use-pending-invite-count";
import { Crazy8sProgressPanel, type ParticipantProgress } from "./crazy8s-progress-panel";

const CANVAS_ENABLED_STEPS = [
  "challenge",
  "stakeholder-mapping",
  "user-research",
  "sense-making",
  "persona",
  "journey-mapping",
  "reframe",
  "ideation",
  "brainwriting",
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
    | ((event:
        | { type: "STEP_RESET"; stepSlug: string }
        | { type: "INTERVIEW_MODE_SELECTED"; interviewMode: "synthetic" | "real" }
        | {
            type: "JOURNEY_POLL_OPENED";
            options: import("@/lib/canvas/journey-poll-types").JourneyPollOption[];
          }
      ) => void)
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

interface StepContainerProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  workshopType?: "solo" | "multiplayer";
  workshopColor?: string | null;
  /** Workshop title + emoji — rendered in the desktop canvas-column header. */
  workshopName?: string;
  workshopEmoji?: string | null;
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
  participantId?: string | null;
  participantDisplayName?: string | null;
  participantColor?: string | null;
  ideationOwners?: Array<{ ownerId: string; ownerName: string; ownerColor: string; hmwBranchLabel: string; hmwFullStatement?: string }>;
  conceptOwners?: Array<{ ownerId: string; ownerName: string; ownerColor: string }>;
  /** Seed data for the dedicated Brain Writing step — the sketches selected in Ideation. */
  brainwritingSeed?: BrainwritingSeed;
  shareToken?: string | null;
  workshopSessionId?: string | null;
  journeyMapApproved?: boolean;
  canvasConfirmed?: boolean;
  /** v2.1 — Workshop in team mode = facilitator frames challenge + invites by email. */
  facilitatorMode?: 'solo' | 'team';
  /** v2.3 — Pricing tier already purchased for this workshop. Drives upgrade-dialog copy. */
  tier?: 'solo' | 'team' | 'white_glove' | null;
  /** v2.1 — True once the facilitator publishes the challenge (challengePublishedAt is set). */
  challengePublished?: boolean;
  /** v2.2 — True once the workshop has actually started (workshopStartedAt set).
   *  Locks inline challenge editing in the settings dialog for running multiplayer sessions. */
  workshopStarted?: boolean;
  /** True when the current Clerk user owns the workshop (matches workshops.clerkUserId).
   *  Distinct from multiplayer-context isFacilitator, which is false in solo mode.
   *  Used to gate the "Switch to team workshop" affordance on Step 1 for solo owners. */
  isWorkshopOwner?: boolean;
  /** v2.2 — Challenge fields surfaced in the setup wizard's "Confirm" step. */
  challengeIdea?: string | null;
  challengeProblem?: string | null;
  challengeAudience?: string | null;
  /** SSR-hydrated latest workshop-pulse narration for this (workshop, step).
   *  Passed straight through to ParticipantChatPanel. Null when no narration
   *  exists yet for the step or this is a solo workshop. */
  initialPulse?: import("./workshop-pulse-card").WorkshopPulseSnapshot | null;
}

export function StepContainer({
  stepOrder,
  sessionId,
  workshopId,
  workshopType,
  workshopColor,
  workshopName = 'New Workshop',
  workshopEmoji,
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
  participantId,
  participantDisplayName,
  participantColor,
  ideationOwners,
  conceptOwners,
  brainwritingSeed,
  shareToken,
  workshopSessionId,
  journeyMapApproved = false,
  canvasConfirmed = false,
  facilitatorMode,
  tier = null,
  challengePublished = false,
  workshopStarted = false,
  isWorkshopOwner = false,
  challengeIdea,
  challengeProblem,
  challengeAudience,
  initialPulse,
}: StepContainerProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<"chat" | "canvas">("chat");
  const {
    chatCollapsed,
    setChatCollapsed,
    chatWidth,
    setChatWidth,
  } = usePanelLayout();

  // Drag-to-resize for the full-height chat column (desktop). While dragging we
  // track a live width locally to avoid thrashing localStorage; the committed
  // value persists on pointer-up. transition-[width] is disabled mid-drag.
  const [isResizingChat, setIsResizingChat] = React.useState(false);
  const [liveChatWidth, setLiveChatWidth] = React.useState<number | null>(null);
  const resizeStartRef = React.useRef<{ x: number; width: number } | null>(null);
  // Mirror of liveChatWidth so pointer-up can read the final value without a
  // setState updater (calling setChatWidth inside an updater would fire the
  // external store's subscribers during render — an illegal setState-in-render).
  const liveWidthRef = React.useRef<number | null>(null);

  const handleChatResizeStart = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      resizeStartRef.current = { x: e.clientX, width: chatWidth };
      liveWidthRef.current = chatWidth;
      setLiveChatWidth(chatWidth);
      setIsResizingChat(true);
    },
    [chatWidth]
  );

  React.useEffect(() => {
    if (!isResizingChat) return;
    const handleMove = (e: PointerEvent) => {
      const start = resizeStartRef.current;
      if (!start) return;
      const next = clampChatWidth(start.width + (e.clientX - start.x));
      liveWidthRef.current = next;
      setLiveChatWidth(next);
    };
    const handleUp = () => {
      if (liveWidthRef.current != null) setChatWidth(liveWidthRef.current);
      liveWidthRef.current = null;
      resizeStartRef.current = null;
      setLiveChatWidth(null);
      setIsResizingChat(false);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    // Avoid text selection / canvas grabbing while dragging the divider.
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [isResizingChat, setChatWidth]);

  const effectiveChatWidth = liveChatWidth ?? chatWidth;

  // Multiplayer facilitator state — determines whether step navigation is visible
  // and whether STEP_CHANGED broadcasts fire. Both default to false in solo mode
  // (isMultiplayer=false from the default MultiplayerContext value).
  const {
    isFacilitator,
    isMultiplayer,
    participantId: contextParticipantId,
    displayName: contextDisplayName,
    participantColor: contextParticipantColor,
  } = useMultiplayerContext();

  // Effective participant values — prefer server-side props, fall back to Liveblocks context
  const effectiveParticipantId = participantId ?? contextParticipantId;
  const effectiveDisplayName = participantDisplayName ?? contextDisplayName;
  const effectiveColor = participantColor ?? contextParticipantColor;

  // Broadcast ref — populated by StepAdvanceBroadcaster (only mounted in multiplayer).
  // Allows StepContainer + descendants to trigger broadcasts without calling
  // useBroadcastEvent directly (which would throw outside RoomProvider in solo mode).
  // STEP_CHANGED is broadcast server-side from advanceToNextStep; this ref carries
  // other client-initiated events that have no server-action equivalent:
  //   - STEP_RESET — facilitator resets the current step
  //   - INTERVIEW_MODE_SELECTED — facilitator picks AI vs Real interviews on step 3
  //   - JOURNEY_POLL_OPENED — facilitator AI emits step-6 template poll options
  const broadcastRef = React.useRef<
    | ((event:
        | { type: "STEP_RESET"; stepSlug: string }
        | { type: "INTERVIEW_MODE_SELECTED"; interviewMode: "synthetic" | "real" }
        | {
            type: "JOURNEY_POLL_OPENED";
            options: import("@/lib/canvas/journey-poll-types").JourneyPollOption[];
          }
      ) => void)
    | null
  >(null);

  // Artifact confirmation state
  // For complete steps: pre-set confirmed (artifact was already confirmed)
  // For needs_regeneration: not confirmed (needs re-confirmation after revision)
  // Also restore from canvas _confirmed flag (survives refresh while step is still in_progress)
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    (stepStatus === "complete" && initialArtifact !== null) || canvasConfirmed,
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
  const clearJourneyPoll = useCanvasStore((s) => s.clearJourneyPoll);
  // Crazy 8s slots — used for progress panel slot fill counts
  const crazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);
  // Voting state — used to derive votingMode for FacilitatorControls in Step 8
  const votingSession = useCanvasStore((s) => s.votingSession);
  const brainRewritingMatrices = useCanvasStore(
    (s) => s.brainRewritingMatrices,
  );
  const setConceptActivityStarted = useCanvasStore(
    (s) => s.setConceptActivityStarted,
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
      ...(s.selectedSlotIds.length > 0 ? { selectedSlotIds: s.selectedSlotIds } : {}),
      ...(s.slotGroups.length > 0 ? { slotGroups: s.slotGroups } : {}),
      ...(s.brainRewritingMatrices.length > 0 ? { brainRewritingMatrices: s.brainRewritingMatrices } : {}),
      ...(s.dotVotes.length > 0 ? { dotVotes: s.dotVotes } : {}),
      ...(s.votingSession.status !== 'idle' ? { votingSession: s.votingSession } : {}),
      ...(s.interviewMode ? { interviewMode: s.interviewMode } : {}),
      ...(s.journeyPoll ? { journeyPoll: s.journeyPoll } : {}),
    });
    s.markClean();
  }, [isCanvasStep, workshopId, step, storeApi]);

  // Ideation phases hook — active only for step 8
  // Determine currentOwnerId for per-participant filtering
  const ideationOwnerId = React.useMemo(() => {
    if (!isMultiplayer) return undefined; // Solo: no filtering
    if (isFacilitator) return 'facilitator';
    if (effectiveParticipantId) return effectiveParticipantId;
    return undefined;
  }, [isMultiplayer, isFacilitator, effectiveParticipantId]);

  const ideation = useIdeationPhases({
    enabled: step?.id === 'ideation',
    workshopId,
    stepId: step?.id || '',
    stepStatus,
    initialArtifact,
    hmwStatement,
    challengeStatement,
    hmwGoals,
    currentOwnerId: ideationOwnerId,
    ideationOwners,
  });

  // Dedicated Brain Writing step — seeds from Ideation's selected sketches.
  // onDone routes through the generic step-confirm flow (persistStepConfirmation,
  // defined below); a ref breaks the declaration-order cycle.
  const brainwritingDoneRef = React.useRef<() => void>(() => {});
  const stableBrainwritingDone = React.useCallback(() => brainwritingDoneRef.current?.(), []);
  const brainwriting = useBrainwritingPhase({
    enabled: step?.id === 'brainwriting',
    workshopId,
    stepId: step?.id || '',
    seed: brainwritingSeed,
    owners: ideationOwners?.map((o) => ({ ownerId: o.ownerId, ownerName: o.ownerName })),
    onDone: stableBrainwritingDone,
  });

  // HMW card counts as "content" only when all 4 fields are filled (card is 'filled')
  const hmwCardComplete = hmwCards.some((c) => c.cardState === "filled");
  // Concept card counts as "content" only when all sections are filled (pitch, USP, SWOT, feasibility)
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
  const effectiveConfirmed = step?.id === 'ideation' ? ideation.artifactConfirmed : artifactConfirmed;

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
  // Journey map: require every row (swim lane) to have at least one item
  // Relaxed from requiring every cell (row × column) — the AI may not fill all 35 cells
  const allSwimLanesFilled =
    step?.id === "journey-mapping"
      ? (() => {
          const gridRows =
            STEP_CANVAS_CONFIGS["journey-mapping"]?.gridConfig?.rows ?? [];
          return (
            gridRows.length > 0 &&
            gridRows.every((row) =>
              stickyNotes.some((n) => n.cellAssignment?.row === row.id),
            )
          );
        })()
      : true;
  // Challenge step: the Accept button label is "Accept Challenge Statement",
  // so it must only appear once a challenge-statement sticky has actual text.
  // Without this, filling any input template card (idea/problem/audience) was
  // enough to surface the Accept button — surfacing it before the synthesis
  // exists. df_d3dgmx43wvb48du2pkub1180.
  //
  // Additionally reject the literal placeholder string "How might we...?"
  // — when the AI emits the worked-example placeholder verbatim, the sticky
  // is technically non-empty but content-free. df_vm1s6g2mmur3uyhu9mscj7qa.
  const challengeStatementFilled =
    step?.id === 'challenge'
      ? stickyNotes.some((p) => {
          if (p.templateKey !== 'challenge-statement') return false;
          const text = p.text.trim();
          if (text.length < 10) return false;
          // Reject bare opener stubs with no content after the prefix —
          // "How might we...?", "What if we...?", "Imagine...", etc. The
          // statement can open any way now, so we guard the known openers.
          return !/^(how might we|what if we(?: could)?|imagine(?: a world where)?)[\s.…?!]*$/i.test(
            text
          );
        })
      : true;

  // Sense-making: the empathy map's Pains and Gains zones must each hold at
  // least one sticky with text before the user can confirm. Without this gate,
  // Confirm Sense Making surfaced as soon as the Says/Thinks/Feels/Does
  // quadrants were populated — i.e. before pains & gains exist, which is the
  // second half of the exercise. Stickies (AI-generated or manually dropped)
  // carry their zone in cellAssignment.row.
  const senseMakingPainsAndGainsFilled =
    step?.id === "sense-making"
      ? stickyNotes.some(
          (n) =>
            n.cellAssignment?.row === "pains" && n.text.trim().length > 0,
        ) &&
        stickyNotes.some(
          (n) =>
            n.cellAssignment?.row === "gains" && n.text.trim().length > 0,
        )
      : true;

  const showConfirm =
    !!confirmLabel &&
    !artifactConfirmed &&
    canvasHasContent &&
    canvasItemCount >= minItems &&
    allPersonasInterviewed &&
    allSwimLanesFilled &&
    challengeStatementFilled &&
    senseMakingPainsAndGainsFilled &&
    (allConceptCardsFilled || conceptProceedOverride);

  // Floating canvas confirm — mirrors the in-chat confirm's availability so the
  // user/facilitator can confirm directly over the board (e.g. with the chat
  // collapsed). Routed through ChatPanel's imperative handle so the behaviour
  // (artifact lock + AI wrap-up / step-8 transition) is identical to the chat
  // button. Hidden for read-only participants, same as in chat.
  const canvasConfirmVisible =
    (!isMultiplayer || isFacilitator) &&
    (step?.id === 'ideation'
      ? ideation.currentPhase === "mind-mapping" &&
        !ideation.showCrazy8s &&
        ideation.hasEnoughMessages &&
        ideation.mindMapHasThemes
      : showConfirm);
  const canvasConfirmLabel =
    step?.id === 'ideation'
      ? ideation.isEnhancingIdeas
        ? "Enhancing ideas..."
        : "Confirm Mind Map"
      : confirmLabel;
  const canvasConfirmDisabled =
    step?.id === 'ideation' ? ideation.isEnhancingIdeas : false;

  // Lock in the current step's artifact: flip local state + persist the
  // _confirmed flag so it survives refresh. Shared by the chat confirm button
  // and the on-board confirm button (e.g. WorkshopSetup's challenge step).
  const persistStepConfirmation = React.useCallback(() => {
    setArtifactConfirmed(true);
    if (step) {
      const s = storeApi.getState();
      saveCanvasState(workshopId, step.id, {
        stickyNotes: s.stickyNotes,
        ...(s.gridColumns.length > 0 ? { gridColumns: s.gridColumns } : {}),
        ...(s.drawingNodes.length > 0 ? { drawingNodes: s.drawingNodes } : {}),
        ...(s.mindMapNodes.length > 0 ? { mindMapNodes: s.mindMapNodes } : {}),
        ...(s.mindMapEdges.length > 0 ? { mindMapEdges: s.mindMapEdges } : {}),
        ...(s.crazy8sSlots.length > 0 ? { crazy8sSlots: s.crazy8sSlots } : {}),
        ...(s.conceptCards.length > 0 ? { conceptCards: s.conceptCards } : {}),
        ...(s.personaTemplates.length > 0 ? { personaTemplates: s.personaTemplates } : {}),
        ...(s.hmwCards.length > 0 ? { hmwCards: s.hmwCards } : {}),
        ...(s.selectedSlotIds.length > 0 ? { selectedSlotIds: s.selectedSlotIds } : {}),
        ...(s.slotGroups.length > 0 ? { slotGroups: s.slotGroups } : {}),
        ...(s.brainRewritingMatrices.length > 0
          ? { brainRewritingMatrices: s.brainRewritingMatrices }
          : {}),
        ...(s.dotVotes.length > 0 ? { dotVotes: s.dotVotes } : {}),
        ...(s.votingSession.status !== 'idle' ? { votingSession: s.votingSession } : {}),
        _confirmed: true,
      });
    }
  }, [step, storeApi, workshopId]);

  // Route the Brain Writing "Done" button through the generic step-confirm flow.
  brainwritingDoneRef.current = persistStepConfirmation;

  // Fire confetti when user clicks Accept (not on auto-confirm from canvas content)
  // Also fire-and-forget snapshot capture for visual reference in sidebar
  const prevConfirmed = React.useRef(artifactConfirmed);
  React.useEffect(() => {
    if (artifactConfirmed && !prevConfirmed.current) {
      fireConfetti();

      // Fire-and-forget snapshot capture — only for fresh confirmations, not revisits
      if (stepStatus !== "complete" && step) {
        const captureSnapshot = async () => {
          try {
            const { captureSingleStep } = await import(
              "@/lib/capture/capture-single-step"
            );
            const imageBase64 = await captureSingleStep(step.id, {});
            if (imageBase64) {
              await fetch("/api/upload-step-snapshot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageBase64,
                  workshopId,
                  stepId: step.id,
                }),
              });
            }
          } catch (err) {
            console.error("[step-snapshot] Capture failed:", err);
          }
        };
        captureSnapshot();
      }
    }
    prevConfirmed.current = artifactConfirmed;
  }, [artifactConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Lets the floating canvas confirm button trigger the chat's confirm flow.
  const chatPanelRef = React.useRef<ChatPanelHandle>(null);

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

  // v2.2 — Team-mode setup wizard state (Challenge step, facilitator only)
  const [showSetupWizard, setShowSetupWizard] = React.useState(false);
  const isTeamModeStepOne =
    step?.id === 'challenge' && facilitatorMode === 'team' && isFacilitator;

  // Convert solo → team workshop (Step 1, owner only, pre-publish). Affordance for
  // owners who created a solo workshop but later want to invite teammates.
  const [showConvertDialog, setShowConvertDialog] = React.useState(false);
  const [isConverting, setIsConverting] = React.useState(false);
  const canConvertToTeam =
    step?.id === 'challenge' &&
    facilitatorMode === 'solo' &&
    isWorkshopOwner &&
    !challengePublished;

  const handleConvertToTeam = React.useCallback(async () => {
    setIsConverting(true);
    try {
      const result = await convertToTeamWorkshop(workshopId);
      if (result.status === 'converted' || result.status === 'already_team') {
        router.replace(`/workshop/${sessionId}/step/challenge?setup=1`, { scroll: false });
        router.refresh();
      } else if (result.status === 'payment_required') {
        // Tier='solo' workshop → user pays $200 upgrade diff. Hand off to Stripe.
        window.location.href = result.checkoutUrl;
      } else if (result.status === 'blocked') {
        const messages: Record<string, string> = {
          challenge_published: 'Cannot convert after the challenge has been published',
          access_denied: 'Access denied',
          auth_required: 'Sign in required',
        };
        toast.error(messages[result.reason] ?? 'Could not switch workshop');
        setIsConverting(false);
      } else {
        toast.error('message' in result ? result.message : 'Could not switch workshop');
        setIsConverting(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not switch workshop');
      setIsConverting(false);
    }
  }, [workshopId, sessionId, router]);

  // Pull live challenge data from the canvas store so the wizard reflects the
  // facilitator's current sticky notes (not stale server-side artifact). In multiplayer,
  // Liveblocks keeps this in sync; in solo, saveCanvasState writes to it.
  const liveChallenge = React.useMemo(() => {
    if (!isTeamModeStepOne) return null;
    const find = (key: string) =>
      stickyNotes.find((n) => n.templateKey === key && (n.text ?? '').trim())?.text?.trim() ??
      null;
    return {
      hmwStatement: find('challenge-statement'),
      idea: find('idea'),
      problem: find('problem'),
      audience: find('audience'),
    };
  }, [isTeamModeStepOne, stickyNotes]);

  // The Next button on team-mode Step 1 only enables once the facilitator has filled
  // in the "How might we" sticky. When enabled, the button reads "Next: Invite team"
  // and opens the wizard instead of advancing. The wizard is the only path through.
  const challengeReady = !!liveChallenge?.hmwStatement;
  const nextDisabledReason =
    isTeamModeStepOne && !challengePublished && !challengeReady
      ? 'Fill in the challenge statement first, then invite your team'
      : null;

  // Step 10: client-side extraction state
  const [step10Artifact, setStep10Artifact] = React.useState<Record<
    string,
    unknown
  > | null>(step?.id === 'validate' ? initialArtifact || null : null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(
    null,
  );
  const [step10MessageCount, setStep10MessageCount] = React.useState(0);
  // Validation flow (UI-driven Step 10): plan count gates workshop completion. The build/run
  // tools (Journey Map → V0, fake-door) live behind the per-artifact CTA inside ValidatePanel.
  const [validatePlanCount, setValidatePlanCount] = React.useState(0);

  // V0 prototype creation status (polling from journey map)
  const searchParams = useSearchParams();
  const v0Creating = step?.id === 'validate' && searchParams.get("v0") === "creating";

  // After a solo → team conversion the redirect carries ?setup=1. Once the workshop
  // is team-mode (post-refresh), pop the setup wizard immediately and strip the param
  // so a manual refresh doesn't re-open it.
  React.useEffect(() => {
    if (!isTeamModeStepOne) return;
    if (searchParams.get('setup') !== '1') return;
    setShowSetupWizard(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('setup');
    const qs = next.toString();
    router.replace(`/workshop/${sessionId}/step/challenge${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [isTeamModeStepOne, searchParams, router, sessionId]);

  // Status only drives the "prototype ready" toast now; the result detail card moved off the
  // Validate page (it lives on the results page / journey-mapper toolbar).
  const [v0Status, setV0Status] = React.useState<
    "idle" | "creating" | "ready" | "error"
  >(v0Creating ? "creating" : "idle");

  // Workshop completion state — initialized from server-provided workshopStatus
  const [workshopCompleted, setWorkshopCompleted] = React.useState(
    workshopStatus === "completed",
  );
  const [isCompletingWorkshop, setIsCompletingWorkshop] = React.useState(false);

  // Step 10: extraction handler — extracts synthesis artifact and marks step complete
  const handleStep10Extract = React.useCallback(async () => {
    if (step?.id !== 'validate' || !step || isExtracting || step10Artifact) return;

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
      // Make sure the Build Pack synthesis exists before completing. It's generated from the
      // workshop's step summaries (not the chat), so a brief Validate chat won't starve it.
      if (!step10Artifact) {
        await handleStep10Extract();
      }
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
  }, [isCompletingWorkshop, workshopCompleted, workshopId, sessionId, step10Artifact, handleStep10Extract]);

  // Step 10: auto-extract on mount when conversation already exists
  const hasAutoExtracted = React.useRef(false);
  React.useEffect(() => {
    if (
      step?.id === 'validate' &&
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
  const [showParticipantOverview, setShowParticipantOverview] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  // Pending invite count for the "Manage invites" badge. Only polls when the
  // facilitator is on team-mode Step 1 and the challenge has been published —
  // that's when the Manage invites button is shown.
  const pendingInviteCount = usePendingInviteCount(
    sessionId,
    step?.id ?? 'challenge',
    !!isTeamModeStepOne && !!challengePublished
  );

  // Reset key forces ChatPanel to re-mount (clearing useChat state)
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
    const step = getStepByOrder(stepOrder);
    if (!step) {
      console.error("Step not found for reset");
      toast.error("Couldn't reset — step not found.");
      return;
    }
    try {
      setIsResetting(true);
      // Server wipe (chat, artifacts, summaries, narration) + deterministic
      // empty-template re-seed for this step. Awaited first so the rest only runs
      // on success — on failure we leave both client and server untouched and
      // surface an error, rather than silently diverging.
      await resetStep(workshopId, step.id, sessionId);
      setShowResetDialog(false);
      // Reset local state
      setArtifactConfirmed(false);
      setLocalMessages([]);
      setAutoStartFired(false); // Allow auto-start to fire again after reset
      setConceptActivityStarted(false); // Reset concept activity gate (Step 9)
      broadcastRef.current?.({ type: 'STEP_RESET', stepSlug: step.id });
      // Clear Step 10 extraction + validation-flow state
      setStep10Artifact(null);
      hasAutoExtracted.current = false;
      setValidatePlanCount(0);
      // Clear ALL canvas/whiteboard state SYNCHRONOUSLY, before the ChatPanel
      // re-mounts via resetKey. This was previously deferred in a
      // requestAnimationFrame AFTER resetKey, which left a window where the canvas
      // autosave could flush the OLD sticky notes back into _canvas after the
      // server wipe — and the regenerated greeting then read them as "already
      // filled" (the stale-context-after-reset bug). Clearing now + markClean()
      // means the autosave has nothing stale to persist; resetStep already wrote
      // the pristine seeded board server-side. (clearJourneyPoll must also run
      // before resetKey — ChatPanel's lock effect reads journeyPoll on mount.)
      clearJourneyPoll();
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
      storeApi.getState().markClean();
      // Force re-mount of ChatPanel to clear useChat state and regenerate the
      // greeting against the now-empty board.
      setResetKey((prev) => prev + 1);
      // Refresh page to reload with cleared server state
      router.refresh();
      toast.success(`${step.name} reset.`);
    } catch (error) {
      console.error("Failed to reset step:", error);
      toast.error("Reset failed — your step wasn't cleared. Please try again.");
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
    setConceptActivityStarted,
    clearJourneyPoll,
    storeApi,
  ]);

  // Step 10: render validation deliverables — journey map first, then prototype
  // Synthesis summary (narrative, journey, confidence, next steps) lives on the results page
  const renderStep10Content = () => {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <ValidatePanel
          key={`validate:${sessionId}:${resetKey}`}
          workshopId={workshopId}
          sessionId={sessionId}
          journeyMapApproved={journeyMapApproved}
          onPlanCountChange={setValidatePlanCount}
        />

        <PrdViewerDialog
          open={showPrdDialog}
          onOpenChange={setShowPrdDialog}
          workshopId={workshopId}
        />
      </div>
    );
  };

  // Render content section
  const renderContent = () => (
    <div className="relative flex h-full min-h-0 flex-col">
      {!isMobile && (
        // Frosted-glass header — sits over the scroll area so messages blur
        // behind it as they pass under. Same olive hue as the body; soft shadow
        // gives it a floating, neumorphic feel (no hard divider).
        <div className="panel-header absolute inset-x-0 top-0 z-20 flex h-16 items-center gap-2.5 px-3 bg-olive-100/70 backdrop-blur-md dark:bg-neutral-olive-950/70">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-base leading-none">
            {FACILITATOR.emoji}
          </div>
          <span className="text-sm font-bold">
            {FACILITATOR.name} - your AI{" "}
            {facilitatorMode === "team" || workshopType === "multiplayer"
              ? "assistant"
              : "facilitator"}
          </span>
        </div>
      )}
      <div className="min-h-0 flex-1">
        {isMultiplayer && !isFacilitator && effectiveParticipantId ? (
          <ParticipantChatPanel
            key={`${sessionId}:${workshopId}:${step?.id ?? stepOrder}:${resetKey}`}
            stepOrder={stepOrder}
            sessionId={sessionId}
            workshopId={workshopId}
            participantId={effectiveParticipantId}
            displayName={effectiveDisplayName || "Participant"}
            participantColor={effectiveColor || "#b3efbd"}
            initialMessages={localMessages}
            initialPulse={initialPulse}
            headerInset={!isMobile}
          />
        ) : (
          <ChatPanel
            ref={chatPanelRef}
            key={`${sessionId}:${workshopId}:${step?.id ?? stepOrder}:${resetKey}`}
            stepOrder={stepOrder}
            sessionId={sessionId}
            workshopId={workshopId}
            initialMessages={localMessages}
            onMessageCountChange={
              step?.id === 'ideation'
                ? ideation.setLiveMessageCount
                : step?.id === 'validate'
                  ? setStep10MessageCount
                  : undefined
            }
            subStep={step?.id === 'ideation' ? ideation.currentPhase : undefined}
            showStepConfirm={
              step?.id === 'ideation'
                ? ideation.currentPhase === 'mind-mapping' && !ideation.showCrazy8s && ideation.hasEnoughMessages && ideation.mindMapHasThemes
                : showConfirm
            }
            onStepConfirm={
              step?.id === 'ideation' ? ideation.handleStartCrazy8s : persistStepConfirmation
            }
            stepConfirmLabel={
              step?.id === 'ideation'
                ? (ideation.isEnhancingIdeas ? 'Enhancing ideas...' : 'Confirm Mind Map')
                : confirmLabel
            }
            stepConfirmIsTransition={step?.id === 'ideation' ? true : undefined}
            stepConfirmDisabled={step?.id === 'ideation' ? ideation.isEnhancingIdeas : undefined}
            stepAlreadyConfirmed={step?.id === 'ideation' ? undefined : artifactConfirmed}
            onConceptComplete={() => setConceptProceedOverride(true)}
            skipAutoStart={autoStartFired}
            onAutoStarted={handleAutoStarted}
            hideAvatar={!isMobile}
            onInterviewModeBroadcast={(mode) =>
              broadcastRef.current?.({ type: 'INTERVIEW_MODE_SELECTED', interviewMode: mode })
            }
            onJourneyPollOpenBroadcast={(options) =>
              broadcastRef.current?.({ type: 'JOURNEY_POLL_OPENED', options })
            }
          />
        )}
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
                  conceptOwners={conceptOwners}
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
            ) : step?.id === 'ideation' ? (
              <div className="h-full relative">
                {ideation.renderCanvas()}
              </div>
            ) : step?.id === 'validate' ? (
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
            facilitatorMode={facilitatorMode}
            artifactConfirmed={effectiveConfirmed}
            stepExplicitlyConfirmed={step?.id === 'ideation' ? ideation.explicitlyConfirmed : artifactConfirmed}
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
              step?.id === 'validate' ? handleCompleteWorkshop : undefined
            }
            isCompletingWorkshop={isCompletingWorkshop}
            workshopCompleted={workshopCompleted}
            canCompleteWorkshop={step?.id === 'validate' && (validatePlanCount > 0 || !!step10Artifact)}
            onFlushCanvas={flushCanvasToDb}
            nextDisabledReason={nextDisabledReason}
            nextLabelOverride={isTeamModeStepOne && !challengePublished ? 'Next: Invite team' : undefined}
            nextOnClickOverride={
              isTeamModeStepOne && !challengePublished
                ? () => setShowSetupWizard(true)
                : undefined
            }
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
    // Step 1 uses a bespoke "Set up your workshop" panel instead of the free
    // canvas. Data still lives in the sticky-note store (idea/problem/audience/
    // challenge-statement template keys), so the AI generation + persistence
    // machinery is unchanged — only the rendering differs.
    if (step?.id === "challenge") {
      return (
        <div className="h-full relative overflow-hidden">
          <WorkshopSetup
            workshopId={workshopId}
            workshopType={workshopType}
            confirmLabel={confirmLabel}
            canConfirm={showConfirm}
            confirmed={artifactConfirmed}
            onConfirm={persistStepConfirmation}
          />
        </div>
      );
    }
    if (step && CANVAS_ONLY_STEPS.includes(step.id)) {
      return (
        <div className="h-full relative overflow-hidden">
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
            conceptOwners={conceptOwners}
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
    if (step?.id === 'ideation') {
      return (
        <div className="h-full relative">
          {ideation.renderCanvas()}
        </div>
      );
    }
    if (step?.id === 'brainwriting') {
      return (
        <div className="h-full relative">
          {brainwriting.renderCanvas()}
        </div>
      );
    }
    if (step?.id === 'validate') {
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

  // Desktop: chat is a full-height left column (beside the sidebar); the canvas
  // column to its right owns the workshop header and the step-navigation footer.
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Chat dock — full-height left column. Always mounted to preserve chat
          state; width + body visibility toggle on collapse, and the width is
          drag-resizable when expanded. */}
      <div
        style={chatCollapsed ? undefined : { width: effectiveChatWidth }}
        className={cn(
          // Workspace stack: canvas (lightest) → chat → sidebar (deepest).
          // Light: olive-100 chat sits a step below the canvas, above the
          // olive-200 sidebar. Dark keeps the neutral-olive deep step.
          // Translucent + blur gives the chat a frosted, neumorphic glass feel.
          "relative flex shrink-0 flex-col border-r bg-olive-100/80 backdrop-blur-xl dark:bg-neutral-olive-950/80",
          chatCollapsed ? "w-14" : undefined,
          isResizingChat ? undefined : "transition-[width] duration-200"
        )}
      >
        {chatCollapsed ? (
          /* Collapsed: the whole rail is one big button that expands the chat.
             Avatar sits in an h-16 header band to align with the sidebar logo
             + canvas header. The toggle also lives in the shared footer below. */
          <button
            type="button"
            onClick={() => setChatCollapsed(false)}
            title="Expand chat"
            className="group flex min-h-0 flex-1 flex-col items-stretch text-left transition-colors hover:bg-olive-100/50 dark:hover:bg-olive-900/20"
          >
            <div className="flex h-16 items-center justify-center border-b">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-base leading-none"
                style={{ backgroundColor: getWorkshopColor(workshopColor).bgHex }}
              >
                {FACILITATOR.emoji}
              </div>
            </div>
          </button>
        ) : (
          <div className="min-h-0 flex-1">{renderContent()}</div>
        )}

        {/* Persistent footer — collapse / expand toggle, mirrors the sidebar's
            footer toggle so both panels collapse from the same spot. */}
        <div
          className={cn(
            "flex items-center border-t px-2 py-4",
            chatCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <button
            type="button"
            onClick={() => setChatCollapsed(!chatCollapsed)}
            title={chatCollapsed ? "Expand chat" : "Collapse chat"}
            className={cn(
              "flex h-9 items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-olive-100 hover:text-foreground dark:hover:bg-olive-900/30",
              chatCollapsed ? "w-9 justify-center" : "w-full justify-start px-2"
            )}
          >
            {chatCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2 text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Resize handle — sits on the chat's right edge, hidden when collapsed */}
        {!chatCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
            onPointerDown={handleChatResizeStart}
            className="group absolute -right-1.5 top-0 z-20 flex h-full w-3 cursor-col-resize touch-none items-center justify-center"
          >
            {/* Full-height guide line — brightens to olive on hover / while dragging */}
            <div
              className={cn(
                "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-olive-600/60",
                isResizingChat && "bg-olive-600"
              )}
            />
            {/* Gripper handle — olive pill that fades in on hover so the edge reads as resizable */}
            <div
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-md bg-olive-600 px-1 py-2 shadow-sm opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                isResizingChat && "opacity-100"
              )}
            >
              <span className="h-1 w-1 rounded-full bg-olive-50" />
              <span className="h-1 w-1 rounded-full bg-olive-50" />
              <span className="h-1 w-1 rounded-full bg-olive-50" />
            </div>
          </div>
        )}
      </div>

      {/* Canvas column — header, canvas, and footer span the canvas only */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <WorkshopHeader
          sessionId={sessionId}
          workshopId={workshopId}
          workshopName={workshopName}
          workshopColor={workshopColor}
          workshopEmoji={workshopEmoji}
          workshopType={workshopType ?? "solo"}
          isFacilitator={isFacilitator}
          isWorkshopOwner={isWorkshopOwner}
          isAdmin={isAdmin}
          workshopStarted={workshopStarted}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* Canvas — fills remaining height */}
          <StepTransitionWrapper stepId={step?.id ?? String(stepOrder)}>
            <div className="h-full overflow-hidden">{renderCanvasPanel()}</div>
          </StepTransitionWrapper>

          {/* Floating confirm — mirrors the in-chat confirm so the step can be
              confirmed straight from the canvas (e.g. with the chat collapsed).
              Offset to the left of the bottom-right zoom controls (bottom-4
              right-4, ~40px wide) so they never overlap; clears the centered toolbar. */}
          {canvasConfirmVisible && canvasConfirmLabel && (
            <StepConfirmButton
              label={canvasConfirmLabel}
              onClick={() => chatPanelRef.current?.confirmStep()}
              disabled={canvasConfirmDisabled}
              className="absolute bottom-6 right-20 z-20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
            />
          )}
        </div>
        {/* Step navigation — footer spans the canvas column only.
            Hidden for participants in multiplayer mode. */}
        {(!isMultiplayer || isFacilitator) && (
          <StepNavigation
            sessionId={sessionId}
            workshopId={workshopId}
            currentStepOrder={stepOrder}
            facilitatorMode={facilitatorMode}
            artifactConfirmed={effectiveConfirmed}
            stepExplicitlyConfirmed={step?.id === 'ideation' ? ideation.explicitlyConfirmed : artifactConfirmed}
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
              step?.id === 'validate' ? handleCompleteWorkshop : undefined
            }
            isCompletingWorkshop={isCompletingWorkshop}
            workshopCompleted={workshopCompleted}
            canCompleteWorkshop={step?.id === 'validate' && (validatePlanCount > 0 || !!step10Artifact)}
            onFlushCanvas={flushCanvasToDb}
            nextDisabledReason={nextDisabledReason}
            nextLabelOverride={isTeamModeStepOne && !challengePublished ? 'Next: Invite team' : undefined}
            nextOnClickOverride={
              isTeamModeStepOne && !challengePublished
                ? () => setShowSetupWizard(true)
                : undefined
            }
          />
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
            <FacilitatorControls workshopId={workshopId} sessionId={sessionId} votingMode={step?.id === 'ideation' ? brainRewritingMatrices.length === 0 : undefined} stepOrder={stepOrder} ideationPhase={step?.id === 'ideation' ? ideation.currentPhase : undefined} onBackToMindMap={step?.id === 'ideation' ? ideation.handleBackToMindMap : undefined} onResetCrazy8s={step?.id === 'ideation' ? ideation.handleResetCrazy8s : undefined} />
            {/* Post-publish: small "Manage invites" reopens the wizard from the floating bar.
                Pre-publish, the action lives on the Next button itself (handled below). */}
            {isTeamModeStepOne && challengePublished && (
              <button
                onClick={() => setShowSetupWizard(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-medium px-2 flex items-center gap-1"
                title={
                  pendingInviteCount
                    ? `${pendingInviteCount} pending — manage or nudge`
                    : 'Manage invitations or change schedule'
                }
              >
                <UserPlus className="h-4 w-4" />
                Manage invites
                {pendingInviteCount && pendingInviteCount > 0 ? (
                  <span
                    aria-label={`${pendingInviteCount} pending invitations`}
                    className="ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500/15 px-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                  >
                    {pendingInviteCount}
                  </span>
                ) : null}
              </button>
            )}
            {isFacilitator && (
              <button
                onClick={() => setShowParticipantOverview((v) => !v)}
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-medium px-2",
                  showParticipantOverview && "bg-muted text-foreground",
                )}
                title="Participant activity"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            )}
            {/* Share invite link — facilitator only, sits beside the avatars */}
            {isFacilitator && shareToken && (
              <ShareLinkButton shareToken={shareToken} />
            )}
            <PresenceBar
              shareToken={shareToken}
              workshopSessionId={workshopSessionId}
              workshopId={workshopId}
              isFacilitator={isFacilitator}
              currentIdeationPhase={step?.id === 'ideation' ? ideation.currentPhase : undefined}
            />
          </div>
          {/* Crazy 8s progress panel — facilitator only, during crazy-eights phase */}
          {isFacilitator && step?.id === 'ideation' && ideation.currentPhase === 'crazy-eights' && ideation.filteredIdeationOwners.length > 0 && !showParticipantOverview && (
            <div className="fixed top-[7rem] right-4 z-40">
              <Crazy8sProgressPanel
                participants={ideation.filteredIdeationOwners
                  .filter((o) => o.ownerId !== 'facilitator')
                  .map((o): ParticipantProgress => {
                    const ownerSlots = crazy8sSlots.filter((s) => s.ownerId === o.ownerId);
                    return {
                      ownerId: o.ownerId,
                      ownerName: o.ownerName,
                      ownerColor: o.ownerColor || '#b3efbd',
                      isCompleted: !!ideation.crazy8sReadinessMap[o.ownerId],
                      filledSlots: ownerSlots.filter((s) => s.imageUrl).length,
                      totalSlots: ownerSlots.length || 8,
                    };
                  })}
              />
            </div>
          )}
          {/* Participant overview panel */}
          {isFacilitator && showParticipantOverview && step && (
            <div className="fixed top-[7rem] right-4 z-40 w-80 max-h-[60vh] overflow-y-auto rounded-xl bg-card shadow-lg border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Participant Activity</h3>
                <button
                  onClick={() => setShowParticipantOverview(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ParticipantOverview sessionId={sessionId} stepId={step.id} workshopId={workshopId} shareToken={shareToken ?? undefined} />
            </div>
          )}
        </>
      )}
      {/* Solo-mode "Switch to team workshop" pill — top-right, Step 1 owners only.
          Lives outside the multiplayer block above (which doesn't render in solo). */}
      {canConvertToTeam && (
        <div className="fixed top-[4.5rem] right-4 z-50">
          <button
            onClick={() => setShowConvertDialog(true)}
            className="flex items-center gap-1.5 rounded-xl bg-card shadow-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Invite teammates and facilitate together"
          >
            <UserPlus className="h-4 w-4" />
            Invite team
          </button>
        </div>
      )}
      {/* Confirmation dialog for converting a solo workshop into a team workshop. */}
      <AlertDialog open={showConvertDialog} onOpenChange={(o) => !isConverting && setShowConvertDialog(o)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <AlertDialogTitle>
              {tier === 'solo' ? 'Upgrade to a team workshop?' : 'Switch to a team workshop?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {tier === 'solo' ? (
                <>
                  You&apos;ve already unlocked this as a solo workshop. Upgrading to team adds invites,
                  lobby, and real-time canvas for <span className="font-semibold text-foreground">$200</span>
                  {' '}(the difference between Solo $99 and Team $299). This can&apos;t be undone.
                </>
              ) : (
                <>
                  You&apos;ll become the facilitator. Frame the challenge on this step, then invite
                  teammates by email and run the workshop together. Payment ($299) happens when you
                  unlock the Build Pack — free until then.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConverting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToTeam} disabled={isConverting}>
              {isConverting
                ? 'Switching…'
                : tier === 'solo'
                  ? 'Upgrade to team — $200'
                  : 'Switch to team workshop'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ResetStepDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleReset}
        isResetting={isResetting}
        stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
      />
      {isTeamModeStepOne && (
        <SetupWorkshopWizard
          workshopId={workshopId}
          open={showSetupWizard}
          onOpenChange={setShowSetupWizard}
          challenge={{
            // Live values from the canvas store take priority over server-rendered
            // props (which can be stale because multiplayer canvas writes go through
            // Liveblocks and only land in stepArtifacts on step advance or webhook).
            hmwStatement: liveChallenge?.hmwStatement ?? hmwStatement ?? null,
            idea: liveChallenge?.idea ?? challengeIdea ?? null,
            problem: liveChallenge?.problem ?? challengeProblem ?? null,
            audience: liveChallenge?.audience ?? challengeAudience ?? null,
          }}
        />
      )}
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

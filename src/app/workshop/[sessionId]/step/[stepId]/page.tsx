import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { sessions, stepArtifacts, chatMessages } from "@/db/schema";
import { getStepByOrder, STEPS } from "@/lib/workshop/step-metadata";
import { loadMessages } from "@/lib/ai/message-persistence";
import { StepContainer } from "@/components/workshop/step-container";
import { CanvasStoreProvider } from "@/providers/canvas-store-provider";
import { loadCanvasState, saveCanvasState } from "@/actions/canvas-actions";
import { loadCanvasGuides } from "@/actions/canvas-guide-actions";
import { loadStepCanvasSettings } from "@/actions/step-canvas-settings-actions";
import { getDefaultStepCanvasGuides } from "@/lib/canvas/canvas-guide-config";
import type { StickyNote, GridColumn, DrawingNode, MindMapNodeState, MindMapEdgeState } from "@/stores/canvas-store";
import { type ConceptCardData, createDefaultConceptCard } from "@/lib/canvas/concept-card-types";
import type { PersonaTemplateData } from "@/lib/canvas/persona-template-types";
import type { HmwCardData } from "@/lib/canvas/hmw-card-types";
import type { Crazy8sSlot } from "@/lib/canvas/crazy-8s-types";
import type { BrainRewritingMatrix } from "@/lib/canvas/brain-rewriting-types";
import { BRAIN_REWRITING_CELL_ORDER } from "@/lib/canvas/brain-rewriting-types";
import { migrateStakeholdersToCanvas, migrateEmpathyToCanvas } from "@/lib/canvas/migration-helpers";
import { computeRadialPositions } from "@/lib/canvas/mind-map-layout";
import { getStepTemplateStickyNotes } from "@/lib/canvas/template-sticky-note-config";

interface StepPageProps {
  params: Promise<{
    sessionId: string;
    stepId: string;
  }>;
}

export default async function StepPage({ params }: StepPageProps) {
  const { sessionId, stepId } = await params;

  // Parse step number
  const stepNumber = parseInt(stepId, 10);

  // Validate step number (1-10)
  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 10) {
    redirect(`/workshop/${sessionId}/step/1`);
  }

  // Get step metadata
  const step = getStepByOrder(stepNumber);

  if (!step) {
    redirect(`/workshop/${sessionId}/step/1`);
  }

  // Fetch session with workshop and steps for sequential enforcement
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: {
        with: {
          steps: true,
        },
      },
    },
  });

  if (!session) {
    redirect("/dashboard");
  }

  // Compute admin status: check user email against ADMIN_EMAIL env var
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const userIsAdmin = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());

  // Sequential enforcement: redirect if trying to access not_started step
  const stepRecord = session.workshop.steps.find((s) => s.stepId === step.id);

  if (stepRecord?.status === "not_started") {
    // Find the current in_progress step (or first not_started if none in_progress)
    const activeStep = session.workshop.steps.find(
      (s) => s.status === "in_progress",
    );
    if (activeStep) {
      const activeStepDef = STEPS.find((s) => s.id === activeStep.stepId);
      redirect(`/workshop/${sessionId}/step/${activeStepDef?.order || 1}`);
    }
    redirect(`/workshop/${sessionId}/step/1`);
  }

  // Load chat messages for this session and step
  let initialMessages = await loadMessages(sessionId, step.id);

  // Clean up duplicate intro messages for the head step (furthest in_progress step).
  // If the user hasn't sent any real messages yet (only __step_start__ triggers + AI intros),
  // wipe the messages so auto-start generates a single fresh intro on mount.
  if (
    stepRecord?.status === "in_progress" &&
    initialMessages.length > 0
  ) {
    const hasRealUserMessage = initialMessages.some(
      (m) =>
        m.role === "user" &&
        !m.parts?.every(
          (p) => p.type === "text" && p.text === "__step_start__"
        )
    );

    if (!hasRealUserMessage) {
      // No real user interaction — clear stale/duplicate intro messages
      await db
        .delete(chatMessages)
        .where(
          and(
            eq(chatMessages.sessionId, sessionId),
            eq(chatMessages.stepId, step.id)
          )
        );
      initialMessages = [];
    }
  }

  // Query existing artifact for completed or needs_regeneration steps
  let initialArtifact: Record<string, unknown> | null = null;
  if (
    stepRecord &&
    (stepRecord.status === "complete" ||
      stepRecord.status === "needs_regeneration")
  ) {
    const artifactRecord = await db
      .select()
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, stepRecord.id))
      .limit(1);

    if (artifactRecord.length > 0) {
      // Exclude _canvas key — canvas data is loaded separately via loadCanvasState
      const { _canvas, ...extractedArtifact } = artifactRecord[0].artifact as Record<string, unknown>;
      initialArtifact = Object.keys(extractedArtifact).length > 0 ? extractedArtifact : null;
    }
  }

  // For Step 8 (ideation), load the HMW statement from Step 7 (reframe) artifact
  let hmwStatement: string | undefined;
  if (step.id === 'ideation') {
    const reframeStep = session.workshop.steps.find((s) => s.stepId === 'reframe');
    if (reframeStep) {
      const reframeArtifactRecord = await db
        .select()
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, reframeStep.id))
        .limit(1);

      if (reframeArtifactRecord.length > 0) {
        const reframeArtifact = reframeArtifactRecord[0].artifact as Record<string, unknown>;

        // Try 1: Top-level extracted artifact (from /api/extract)
        const hmwStatements = reframeArtifact.hmwStatements as Array<{ fullStatement: string }> | undefined;
        const selectedIndices = reframeArtifact.selectedForIdeation as number[] | undefined;
        const selectedIdx = selectedIndices?.[0] ?? 0;
        hmwStatement = hmwStatements?.[selectedIdx]?.fullStatement;

        // Try 2: Canvas-stored HMW cards (always saved by auto-save)
        if (!hmwStatement) {
          const canvasData = reframeArtifact._canvas as { hmwCards?: Array<{ fullStatement?: string; cardIndex?: number }> } | undefined;
          if (canvasData?.hmwCards && canvasData.hmwCards.length > 0) {
            // Prefer the card with the lowest cardIndex that has a fullStatement
            const sortedCards = [...canvasData.hmwCards]
              .sort((a, b) => (a.cardIndex ?? 0) - (b.cardIndex ?? 0));
            const filledCard = sortedCards.find((c) => c.fullStatement);
            hmwStatement = filledCard?.fullStatement;
          }
        }
      }
    }
    // Fallback: try Step 1 challenge artifact
    if (!hmwStatement) {
      const challengeStep = session.workshop.steps.find((s) => s.stepId === 'challenge');
      if (challengeStep) {
        const challengeArtifactRecord = await db
          .select()
          .from(stepArtifacts)
          .where(eq(stepArtifacts.workshopStepId, challengeStep.id))
          .limit(1);

        if (challengeArtifactRecord.length > 0) {
          const challengeArtifact = challengeArtifactRecord[0].artifact as Record<string, unknown>;
          hmwStatement = challengeArtifact.hmwStatement as string | undefined;
        }
      }
    }
  }

  // Load canvas state for this step
  const canvasData = await loadCanvasState(session.workshop.id, step.id);
  let initialCanvasStickyNotes: StickyNote[] = canvasData?.stickyNotes || [];
  const initialGridColumns: GridColumn[] = canvasData?.gridColumns || [];
  const initialDrawingNodes: DrawingNode[] = canvasData?.drawingNodes || [];
  const initialCrazy8sSlots: Crazy8sSlot[] = canvasData?.crazy8sSlots || [];
  let initialConceptCards: ConceptCardData[] = canvasData?.conceptCards || [];
  let initialPersonaTemplates: PersonaTemplateData[] = canvasData?.personaTemplates || [];
  let initialHmwCards: HmwCardData[] = canvasData?.hmwCards || [];
  let initialMindMapNodes: MindMapNodeState[] = (canvasData?.mindMapNodes as MindMapNodeState[]) || [];
  const initialMindMapEdges: MindMapEdgeState[] = (canvasData?.mindMapEdges as MindMapEdgeState[]) || [];
  const initialSelectedSlotIds: string[] = canvasData?.selectedSlotIds || [];
  const initialBrainRewritingMatrices: BrainRewritingMatrix[] = canvasData?.brainRewritingMatrices || [];

  // Migration: if mind map nodes exist but lack positions, compute radial layout
  if (initialMindMapNodes.length > 0 && !initialMindMapNodes.some((n) => n.position)) {
    initialMindMapNodes = computeRadialPositions([...initialMindMapNodes], initialMindMapEdges);
  }

  // Lazy migration: if artifact exists but no canvas state, derive initial positions
  if (initialCanvasStickyNotes.length === 0 && initialArtifact && step) {
    if (step.id === 'stakeholder-mapping') {
      const migratedStickyNotes = migrateStakeholdersToCanvas(initialArtifact);
      initialCanvasStickyNotes = migratedStickyNotes.map(stickyNote => ({
        ...stickyNote,
        id: crypto.randomUUID(),
        color: stickyNote.color || 'yellow',
        type: stickyNote.type || 'stickyNote',
      }));
    } else if (step.id === 'sense-making') {
      const migratedStickyNotes = migrateEmpathyToCanvas(initialArtifact);
      initialCanvasStickyNotes = migratedStickyNotes.map(stickyNote => ({
        ...stickyNote,
        id: crypto.randomUUID(),
        color: stickyNote.color || 'yellow',
        type: stickyNote.type || 'stickyNote',
      }));
    }
  }

  // Seed template sticky notes for steps that define them (e.g., Challenge step)
  // Check for absence of template sticky notes specifically — not an empty canvas.
  // This ensures templates are added even if the AI or user already created regular sticky notes.
  const hasTemplateStickyNotes = initialCanvasStickyNotes.some(p => p.templateKey);
  console.log(`[template-seed] step=${step.id}, stickyNotes=${initialCanvasStickyNotes.length}, hasTemplates=${hasTemplateStickyNotes}`);
  if (!hasTemplateStickyNotes) {
    const templateDefs = getStepTemplateStickyNotes(step.id);
    console.log(`[template-seed] templateDefs=${templateDefs.length} for step=${step.id}`);
    if (templateDefs.length > 0) {
      const newTemplates = templateDefs.map(def => ({
        id: crypto.randomUUID(),
        text: '',  // Empty — placeholder is metadata
        position: def.position,
        width: def.width,
        height: def.height,
        color: def.color,
        type: 'stickyNote' as const,
        templateKey: def.key,
        templateLabel: def.label,
        placeholderText: def.placeholderText,
      }));
      initialCanvasStickyNotes = [...initialCanvasStickyNotes, ...newTemplates];
      // Persist to DB immediately so the AI API route can read template state
      const saveResult = await saveCanvasState(session.workshop.id, step.id, { stickyNotes: initialCanvasStickyNotes });
      console.log(`[template-seed] saved ${initialCanvasStickyNotes.length} stickyNotes (${newTemplates.length} templates), result:`, saveResult);
    }
  }

  // Lazy migration: Create blank persona template card (AI fills all fields at once)
  if (step.id === 'persona' && initialCanvasStickyNotes.length === 0 && initialPersonaTemplates.length === 0) {
    const template: PersonaTemplateData = {
      id: crypto.randomUUID(),
      position: { x: 0, y: 0 },
    };
    initialPersonaTemplates = [template];
  }

  // Lazy migration: Create skeleton HMW card for reframe step
  if (step.id === 'reframe' && initialHmwCards.length === 0) {
    const skeletonCard: HmwCardData = {
      id: crypto.randomUUID(),
      position: { x: 0, y: 0 },
      cardState: 'skeleton',
      cardIndex: 0,
    };
    initialHmwCards = [skeletonCard];
  }

  // Load Step 9 billboard hero data for Step 10 (validate)
  let billboardHero: { headline: string; subheadline: string; cta: string } | undefined;
  if (step.id === 'validate') {
    const conceptCanvas = await loadCanvasState(session.workshop.id, 'concept');
    if (conceptCanvas?.conceptCards && conceptCanvas.conceptCards.length > 0) {
      const sortedCards = [...conceptCanvas.conceptCards]
        .sort((a, b) => (a.cardIndex ?? 0) - (b.cardIndex ?? 0));
      const filledCard = sortedCards.find(
        (c) => c.billboardHero?.headline
      ) as ConceptCardData | undefined;
      if (filledCard?.billboardHero) {
        billboardHero = filledCard.billboardHero;
      }
    }
  }

  // Load Step 8 data for Step 9 (concept)
  let step8SelectedSlotIds: string[] | undefined;
  let step8Crazy8sSlots: Array<{ slotId: string; title: string; imageUrl?: string }> | undefined;

  if (step.id === 'concept') {
    // Load Step 8 artifact for selectedSketchSlotIds
    const ideationStep = session.workshop.steps.find((s) => s.stepId === 'ideation');
    if (ideationStep) {
      const ideationArtifacts = await db
        .select({ artifact: stepArtifacts.artifact })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, ideationStep.id))
        .limit(1);
      if (ideationArtifacts.length > 0) {
        const artifact = ideationArtifacts[0].artifact as Record<string, unknown>;
        step8SelectedSlotIds = artifact?.selectedSketchSlotIds as string[] | undefined;
      }
    }

    // Load Step 8 canvas state for crazy8sSlots
    const step8Canvas = await loadCanvasState(session.workshop.id, 'ideation');
    if (step8Canvas?.crazy8sSlots) {
      // Also check for selectedSlotIds in canvas state (fallback for extraction-based path)
      if (!step8SelectedSlotIds && step8Canvas.selectedSlotIds && step8Canvas.selectedSlotIds.length > 0) {
        step8SelectedSlotIds = step8Canvas.selectedSlotIds;
      }

      const brainMatrices = step8Canvas.brainRewritingMatrices || [];

      // Resolve final sketch image per slot: use last brain rewriting iteration, or fall back to original
      step8Crazy8sSlots = step8Canvas.crazy8sSlots.map((s) => {
        let resolvedImageUrl = s.imageUrl;

        // Check if this slot has a brain rewriting matrix with completed cells
        const matrix = brainMatrices.find((m) => m.slotId === s.slotId);
        if (matrix) {
          // Find the last completed cell (has imageUrl) in BRAIN_REWRITING_CELL_ORDER
          for (let i = BRAIN_REWRITING_CELL_ORDER.length - 1; i >= 0; i--) {
            const cell = matrix.cells.find((c) => c.cellId === BRAIN_REWRITING_CELL_ORDER[i]);
            if (cell?.imageUrl) {
              resolvedImageUrl = cell.imageUrl;
              break;
            }
          }
        }

        return {
          slotId: s.slotId,
          title: s.title,
          imageUrl: resolvedImageUrl,
        };
      });
    }

    // Create skeleton concept cards for selected ideas (one per selected slot, max 4)
    if (initialConceptCards.length === 0 && step8SelectedSlotIds && step8SelectedSlotIds.length > 0 && step8Crazy8sSlots) {
      const selectedSlots = step8SelectedSlotIds
        .map((slotId) => step8Crazy8sSlots!.find((s) => s.slotId === slotId))
        .filter(Boolean)
        .slice(0, 4);

      initialConceptCards = selectedSlots.map((slot, index) =>
        createDefaultConceptCard({
          ideaSource: slot!.title || `Sketch ${slot!.slotId}`,
          sketchSlotId: slot!.slotId,
          sketchImageUrl: slot!.imageUrl,
          cardState: 'skeleton',
          cardIndex: index,
          position: { x: index * 720, y: 0 },
        })
      );
    }
  }

  // Load canvas guides from DB, falling back to hardcoded defaults
  let canvasGuides = await loadCanvasGuides(step.id);
  if (canvasGuides.length === 0) {
    canvasGuides = getDefaultStepCanvasGuides(step.id);
  }

  // Load admin-configured default viewport settings for this step
  const canvasSettings = await loadStepCanvasSettings(step.id);

  return (
    <div className="h-full">
      <CanvasStoreProvider
        initialStickyNotes={initialCanvasStickyNotes}
        initialGridColumns={initialGridColumns}
        initialDrawingNodes={initialDrawingNodes}
        initialMindMapNodes={initialMindMapNodes}
        initialMindMapEdges={initialMindMapEdges}
        initialCrazy8sSlots={initialCrazy8sSlots}
        initialConceptCards={initialConceptCards}
        initialPersonaTemplates={initialPersonaTemplates}
        initialHmwCards={initialHmwCards}
        initialSelectedSlotIds={initialSelectedSlotIds}
        initialBrainRewritingMatrices={initialBrainRewritingMatrices}
      >
        <StepContainer
          stepOrder={stepNumber}
          sessionId={sessionId}
          workshopId={session.workshop.id}
          initialMessages={initialMessages}
          initialArtifact={initialArtifact}
          stepStatus={stepRecord?.status}
          hmwStatement={hmwStatement}
          step8SelectedSlotIds={step8SelectedSlotIds}
          step8Crazy8sSlots={step8Crazy8sSlots}
          isAdmin={userIsAdmin}
          billboardHero={billboardHero}
          canvasGuides={canvasGuides}
          canvasSettings={canvasSettings}
        />
      </CanvasStoreProvider>
    </div>
  );
}

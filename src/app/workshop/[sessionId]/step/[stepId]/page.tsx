import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { sessions, stepArtifacts, chatMessages } from "@/db/schema";
import { getStepByOrder, STEPS } from "@/lib/workshop/step-metadata";
import { loadMessages } from "@/lib/ai/message-persistence";
import { StepContainer } from "@/components/workshop/step-container";
import { CanvasStoreProvider } from "@/providers/canvas-store-provider";
import { loadCanvasState } from "@/actions/canvas-actions";
import type { PostIt, GridColumn, DrawingNode } from "@/stores/canvas-store";
import type { ConceptCardData } from "@/lib/canvas/concept-card-types";
import { migrateStakeholdersToCanvas, migrateEmpathyToCanvas } from "@/lib/canvas/migration-helpers";

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
        const hmwStatements = reframeArtifact.hmwStatements as Array<{ fullStatement: string }> | undefined;
        const selectedIndices = reframeArtifact.selectedForIdeation as number[] | undefined;
        const selectedIdx = selectedIndices?.[0] ?? 0;
        hmwStatement = hmwStatements?.[selectedIdx]?.fullStatement;
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
  let initialCanvasPostIts: PostIt[] = canvasData?.postIts || [];
  const initialGridColumns: GridColumn[] = canvasData?.gridColumns || [];
  const initialDrawingNodes: DrawingNode[] = canvasData?.drawingNodes || [];
  const initialConceptCards: ConceptCardData[] = canvasData?.conceptCards || [];

  // Lazy migration: if artifact exists but no canvas state, derive initial positions
  if (initialCanvasPostIts.length === 0 && initialArtifact && step) {
    if (step.id === 'stakeholder-mapping') {
      const migratedPostIts = migrateStakeholdersToCanvas(initialArtifact);
      initialCanvasPostIts = migratedPostIts.map(postIt => ({
        ...postIt,
        id: crypto.randomUUID(),
        color: postIt.color || 'yellow',
        type: postIt.type || 'postIt',
      }));
    } else if (step.id === 'sense-making') {
      const migratedPostIts = migrateEmpathyToCanvas(initialArtifact);
      initialCanvasPostIts = migratedPostIts.map(postIt => ({
        ...postIt,
        id: crypto.randomUUID(),
        color: postIt.color || 'yellow',
        type: postIt.type || 'postIt',
      }));
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
      step8Crazy8sSlots = step8Canvas.crazy8sSlots.map((s) => ({
        slotId: s.slotId,
        title: s.title,
        imageUrl: s.imageUrl,
      }));
    }
  }

  return (
    <div className="h-full">
      <CanvasStoreProvider
        initialPostIts={initialCanvasPostIts}
        initialGridColumns={initialGridColumns}
        initialDrawingNodes={initialDrawingNodes}
        initialConceptCards={initialConceptCards}
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
        />
      </CanvasStoreProvider>
    </div>
  );
}

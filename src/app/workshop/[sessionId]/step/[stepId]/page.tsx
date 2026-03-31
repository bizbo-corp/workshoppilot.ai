import { redirect } from "next/navigation";
import { eq, and, isNull, like } from "drizzle-orm";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { sessions, stepArtifacts, chatMessages, sessionParticipants, workshopSessions, buildPacks } from "@/db/schema";
import { getStepByOrder, STEPS } from "@/lib/workshop/step-metadata";
import { loadMessages } from "@/lib/ai/message-persistence";
import { StepContainer } from "@/components/workshop/step-container";
import { CanvasStoreProvider } from "@/providers/canvas-store-provider";
import { MultiplayerRoomLoader } from "@/components/workshop/multiplayer-room-loader";
import { loadCanvasState, saveCanvasState, loadPersonaCandidates, savePersonaCandidates, saveConceptCardOwnership } from "@/actions/canvas-actions";
import { trackWorkshopVisit } from "@/actions/workshop-actions";
import { loadCanvasGuides } from "@/actions/canvas-guide-actions";
import { loadStepCanvasSettings } from "@/actions/step-canvas-settings-actions";
import { getDefaultStepCanvasGuides } from "@/lib/canvas/canvas-guide-config";
import type { StickyNote, GridColumn, DrawingNode, MindMapNodeState, MindMapEdgeState } from "@/stores/canvas-store";
import { type ConceptCardData, createDefaultConceptCard } from "@/lib/canvas/concept-card-types";
import type { PersonaTemplateData } from "@/lib/canvas/persona-template-types";
import type { HmwCardData } from "@/lib/canvas/hmw-card-types";
import type { Crazy8sSlot } from "@/lib/canvas/crazy-8s-types";
import type { BrainRewritingMatrix } from "@/lib/canvas/brain-rewriting-types";
import type { DotVote, VotingSession } from "@/lib/canvas/voting-types";
import { migrateStakeholdersToCanvas, migrateEmpathyToCanvas } from "@/lib/canvas/migration-helpers";
import { computeRadialPositions } from "@/lib/canvas/mind-map-layout";
import { getStepTemplateStickyNotes, guidesToTemplateDefs } from "@/lib/canvas/template-sticky-note-config";
import { dbWithRetry } from "@/db/with-retry";
import { PAYWALL_CUTOFF_DATE } from "@/lib/billing/paywall-config";
import { PaywallOverlay } from "@/components/workshop/paywall-overlay";
import { verifyGuestCookie, COOKIE_NAME } from "@/lib/auth/guest-cookie";
import { PARTICIPANT_COLORS } from "@/lib/liveblocks/config";

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
  const session = await dbWithRetry(() =>
    db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        workshop: {
          with: {
            steps: true,
          },
        },
      },
    })
  );

  if (!session) {
    redirect("/dashboard");
  }

  // Track visit (fire-and-forget, don't block render)
  trackWorkshopVisit(session.workshop.id).catch(() => {});

  // Compute admin status: check user email against ADMIN_EMAIL env var
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const userIsAdmin = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());

  // Determine participant identity for multiplayer
  let participantId: string | null = null;
  let participantDisplayName: string | null = null;
  let participantColor: string | null = null;

  if (session.workshop.workshopType === 'multiplayer') {
    if (!user) {
      // Guest path: read wp_guest cookie
      const cookieStore = await cookies();
      const raw = cookieStore.get(COOKIE_NAME)?.value;
      const payload = raw ? verifyGuestCookie(raw) : null;
      if (payload) {
        const [participant] = await db
          .select()
          .from(sessionParticipants)
          .where(eq(sessionParticipants.id, payload.participantId))
          .limit(1);
        if (participant && participant.role === 'participant') {
          participantId = participant.id;
          participantDisplayName = participant.displayName;
          participantColor = participant.color;
        }
      }
    } else {
      // Clerk user: check if they're a participant (not owner)
      const [participant] = await db
        .select()
        .from(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.sessionId, session.id),
            eq(sessionParticipants.clerkUserId, user.id),
            eq(sessionParticipants.role, 'participant'),
          )
        )
        .limit(1);
      if (participant) {
        participantId = participant.id;
        participantDisplayName = participant.displayName;
        participantColor = participant.color;
      }
    }
  }

  // Query workshopSession for multiplayer — used to pass shareToken to PresenceBar
  let workshopShareToken: string | null = null;
  let workshopSessionId: string | null = null;

  if (session.workshop.workshopType === 'multiplayer') {
    const [ws] = await db
      .select({ id: workshopSessions.id, shareToken: workshopSessions.shareToken })
      .from(workshopSessions)
      .where(eq(workshopSessions.workshopId, session.workshop.id))
      .limit(1);
    if (ws) {
      workshopShareToken = ws.shareToken;
      workshopSessionId = ws.id;
    }
  }

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

  // Paywall enforcement: Steps 8-10 require credit or grandfathering
  // Must run after sequential enforcement so session.workshop data is already fetched.
  // Steps 1-7 are completely unaffected — guard is stepNumber >= 8.
  const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED !== 'false';

  if (PAYWALL_ENABLED && stepNumber >= 8) {
    const workshop = session.workshop;
    const isUnlocked = workshop.creditConsumedAt !== null;
    const isGrandfathered =
      workshop.creditConsumedAt === null &&
      workshop.createdAt < PAYWALL_CUTOFF_DATE;

    if (!isUnlocked && !isGrandfathered) {
      return (
        <div className="h-full">
          <PaywallOverlay
            sessionId={sessionId}
            workshopId={workshop.id}
            stepNumber={stepNumber}
          />
        </div>
      );
    }
  }

  // Load chat messages for this session and step (scoped to participant if applicable)
  let initialMessages = await loadMessages(sessionId, step.id, participantId);

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

    // Only wipe if the AI hasn't responded yet (no assistant messages with content).
    // If the AI already generated a response, keep it to avoid regeneration on refresh.
    const hasAssistantResponse = initialMessages.some(
      (m) => m.role === "assistant" && m.parts?.some((p) => p.type === "text" && p.text.length > 0)
    );

    if (!hasRealUserMessage && !hasAssistantResponse) {
      // No real user interaction AND no AI response — clear stale trigger-only messages
      // Scope to current user's messages (participantId or facilitator NULL)
      await db
        .delete(chatMessages)
        .where(
          and(
            eq(chatMessages.sessionId, sessionId),
            eq(chatMessages.stepId, step.id),
            participantId
              ? eq(chatMessages.participantId, participantId)
              : isNull(chatMessages.participantId),
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

  // Extract a shortened label from a reframed HMW statement for mind map branch nodes.
  // Full: "Given that [context], how might we help [persona], who struggles to [X] [do Y] so they can [Z]?"
  // Label: extract the core action essence, e.g. "explain complex topics simply create a clear flow"
  function extractHmwBranchLabel(fullStatement: string): string {
    // Find "how might we" and take from there
    const hmwIdx = fullStatement.toLowerCase().indexOf('how might we');
    if (hmwIdx === -1) return fullStatement.slice(0, 60);

    let middle = fullStatement.slice(hmwIdx);
    // Strip trailing "?"
    middle = middle.replace(/\?$/, '').trim();
    // Remove "how might we" prefix
    middle = middle.replace(/^how might we\s+/i, '').trim();
    // Strip persona context: "help [name...], who [struggles/wants/needs] to" → keep the verb onwards
    middle = middle.replace(/^help\s+[^,]+?,\s*who\s+(?:struggles?|wants?|needs?|seeks?|tries?|has|finds? it)\s+to\s+/i, '').trim();
    // Also handle "help [name] to" without the "who" clause
    middle = middle.replace(/^help\s+\S+(?:\s+\S+)?\s+to\s+/i, '').trim();
    // Trim "so they/he/she can..." suffix
    middle = middle.replace(/\s+so\s+(they|he|she|we|it)\s+can\b.*$/i, '').trim();
    // Trim trailing "for his/her/their [presentations/etc]"
    middle = middle.replace(/\s+for\s+(his|her|their|the)\s+\w+$/i, '').trim();
    // Capitalize first letter
    if (middle.length > 0) {
      middle = middle.charAt(0).toUpperCase() + middle.slice(1);
    }

    return middle;
  }

  // For Step 8 (ideation), load the HMW statement from Step 7 (reframe) artifact
  // Also load challenge statement (Step 1) and all HMW goals for mind map pre-population
  let hmwStatement: string | undefined;
  let challengeStatement: string | undefined;
  let hmwGoals: Array<{ label: string; fullStatement: string }> = [];

  if (step.id === 'ideation') {
    // Load original HMW statement from Step 1 (used as mind map root node)
    const challengeStep = session.workshop.steps.find((s) => s.stepId === 'challenge');
    if (challengeStep) {
      // Try 1: Extracted artifact — use hmwStatement (the original "How might we...")
      const challengeArtifactRecord = await db
        .select()
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, challengeStep.id))
        .limit(1);

      if (challengeArtifactRecord.length > 0) {
        const challengeArtifact = challengeArtifactRecord[0].artifact as Record<string, unknown>;
        challengeStatement = challengeArtifact.hmwStatement as string | undefined;
        if (!hmwStatement) {
          hmwStatement = challengeStatement;
        }
      }

      // Try 2: Canvas "challenge-statement" template sticky note
      if (!challengeStatement) {
        const challengeCanvas = await loadCanvasState(session.workshop.id, 'challenge');
        const stickyNotes = challengeCanvas?.stickyNotes as Array<{ templateKey?: string; text?: string }> | undefined;
        if (stickyNotes) {
          const hmwNote = stickyNotes.find((n) => n.templateKey === 'challenge-statement' && n.text);
          if (hmwNote?.text) {
            challengeStatement = hmwNote.text;
          }
        }
      }

      // Try 3: Load from workshop context (same source the AI uses)
      if (!challengeStatement) {
        const { loadWorkshopContext } = await import('@/lib/ai/workshop-context');
        const ctx = await loadWorkshopContext(session.workshop.id);
        challengeStatement = ctx.hmwStatement || undefined;
        if (!hmwStatement && ctx.reframedHmw) {
          hmwStatement = ctx.reframedHmw;
        }
      }
    }

    // Load ALL HMW statements from Step 7 (reframe) artifact
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
        const hmwStatements = reframeArtifact.hmwStatements as Array<{ fullStatement: string; immediateGoal?: string }> | undefined;
        const selectedIndices = reframeArtifact.selectedForIdeation as number[] | undefined;
        const selectedIdx = selectedIndices?.[0] ?? 0;
        hmwStatement = hmwStatements?.[selectedIdx]?.fullStatement;

        // Build hmwGoals from ALL HMW statements — extract middle portion as label
        if (hmwStatements && hmwStatements.length > 0) {
          hmwGoals = hmwStatements.map((stmt) => ({
            label: extractHmwBranchLabel(stmt.fullStatement),
            fullStatement: stmt.fullStatement,
          }));
        }

        // Try 2: Canvas-stored HMW cards (always saved by auto-save)
        if (!hmwStatement || hmwGoals.length === 0) {
          const reframeCanvas = await loadCanvasState(session.workshop.id, 'reframe');
          const hmwCards = reframeCanvas?.hmwCards as Array<{
            fullStatement?: string; givenThat?: string; persona?: string;
            immediateGoal?: string; deeperGoal?: string; cardIndex?: number;
          }> | undefined;
          if (hmwCards && hmwCards.length > 0) {
            // Helper: assemble statement from fields if fullStatement is missing
            const getStatement = (c: typeof hmwCards[number]): string | undefined => {
              if (c.fullStatement) return c.fullStatement;
              if (c.givenThat && c.persona && c.immediateGoal && c.deeperGoal) {
                return `Given that ${c.givenThat}, how might we help ${c.persona} to ${c.immediateGoal} so they can ${c.deeperGoal}?`;
              }
              return undefined;
            };

            const sortedCards = [...hmwCards]
              .sort((a, b) => (a.cardIndex ?? 0) - (b.cardIndex ?? 0));

            if (!hmwStatement) {
              const filledCard = sortedCards.find((c) => getStatement(c));
              hmwStatement = filledCard ? getStatement(filledCard) : undefined;
            }

            if (hmwGoals.length === 0) {
              hmwGoals = sortedCards
                .filter((c) => getStatement(c))
                .map((c) => {
                  const stmt = getStatement(c)!;
                  return {
                    label: extractHmwBranchLabel(stmt),
                    fullStatement: stmt,
                  };
                });
            }
          }
        }
      }
    }
  }

  // Load canvas state for this step
  const canvasData = await loadCanvasState(session.workshop.id, step.id);
  let initialCanvasStickyNotes: StickyNote[] = canvasData?.stickyNotes || [];
  const initialGridColumns: GridColumn[] = canvasData?.gridColumns || [];
  const initialDrawingNodes: DrawingNode[] = canvasData?.drawingNodes || [];
  let initialCrazy8sSlots: Crazy8sSlot[] = canvasData?.crazy8sSlots || [];
  let initialConceptCards: ConceptCardData[] = canvasData?.conceptCards || [];
  let initialPersonaTemplates: PersonaTemplateData[] = canvasData?.personaTemplates || [];
  let initialHmwCards: HmwCardData[] = canvasData?.hmwCards || [];
  let initialMindMapNodes: MindMapNodeState[] = (canvasData?.mindMapNodes as MindMapNodeState[]) || [];
  let initialMindMapEdges: MindMapEdgeState[] = (canvasData?.mindMapEdges as MindMapEdgeState[]) || [];
  const initialSelectedSlotIds: string[] = canvasData?.selectedSlotIds || [];
  const initialSlotGroups = canvasData?.slotGroups || [];
  const initialBrainRewritingMatrices: BrainRewritingMatrix[] = canvasData?.brainRewritingMatrices || [];
  const initialDotVotes: DotVote[] = canvasData?.dotVotes || [];
  const initialVotingSession: VotingSession | undefined = canvasData?.votingSession;
  const initialVotingCardPositions = canvasData?.votingCardPositions;
  const initialIdeationPhase = canvasData?.ideationPhase;
  const canvasConfirmed = canvasData?._confirmed === true;

  // Migration: if mind map nodes exist but lack positions, compute radial layout
  if (initialMindMapNodes.length > 0 && !initialMindMapNodes.some((n) => n.position)) {
    initialMindMapNodes = computeRadialPositions([...initialMindMapNodes], initialMindMapEdges);
  }

  // ── Per-participant ideation owner metadata for multiplayer ──
  // Instead of seeding mind map nodes server-side (which fights Liveblocks recovery),
  // we pass owner metadata to the client. The useIdeationSeeding hook creates nodes
  // INSIDE the Liveblocks-connected store so data flows with Liveblocks, not against it.
  type IdeationOwnerEntry = { ownerId: string; ownerName: string; ownerColor: string; hmwBranchLabel: string; hmwFullStatement?: string };
  let ideationOwners: IdeationOwnerEntry[] = [];
  if (step.id === 'ideation' && session.workshop.workshopType === 'multiplayer') {
    const [workshopSessionForIdeation] = await db
      .select()
      .from(workshopSessions)
      .where(eq(workshopSessions.workshopId, session.workshop.id))
      .limit(1);

    if (workshopSessionForIdeation) {
      const allParticipantsForIdeation = await db
        .select()
        .from(sessionParticipants)
        .where(eq(sessionParticipants.sessionId, workshopSessionForIdeation.id));
      const activeIdeationParticipants = allParticipantsForIdeation.filter((p) => p.status !== 'removed');
      let ownerForIdeation = activeIdeationParticipants.find((p) => p.role === 'owner');
      const participantsForIdeation = activeIdeationParticipants.filter((p) => p.role === 'participant');

      // Dedup: if current Clerk user already has a participant record, reuse it as owner
      if (!ownerForIdeation && user) {
        const existingByClerk = activeIdeationParticipants.find((p) => p.clerkUserId === user.id);
        if (existingByClerk) {
          ownerForIdeation = existingByClerk;
        }
      }

      // Lazy init: create owner participant record if missing (existing workshops pre-fix)
      if (!ownerForIdeation && user) {
        try {
          const ownerDisplayName = user.fullName ?? user.username ?? 'Facilitator';
          const [created] = await db.insert(sessionParticipants).values({
            sessionId: workshopSessionForIdeation.id,
            clerkUserId: user.id,
            liveblocksUserId: user.id,
            displayName: ownerDisplayName,
            color: PARTICIPANT_COLORS[0],
            role: 'owner',
            status: 'active',
          }).returning();
          ownerForIdeation = created;
        } catch {
          // Race condition: another request already created the record
          const existing = allParticipantsForIdeation.find((p) => p.clerkUserId === user.id);
          if (existing) ownerForIdeation = existing;
        }
      }

      // Load each participant's HMW from two sources:
      // 1. Canvas HMW cards (from loadCanvasState — solo auto-save or webhook)
      // 2. Structured hmwStatements (from artifact — extracted on step completion or repair)
      const reframeCanvas = await loadCanvasState(session.workshop.id, 'reframe');
      const allHmwCards = (reframeCanvas?.hmwCards || []) as HmwCardData[];

      // Also load structured hmwStatements from the reframe artifact (includes ownerId)
      const reframeStepForHmw = session.workshop.steps.find((s) => s.stepId === 'reframe');
      type HmwStatementEntry = { fullStatement: string; ownerId?: string; ownerName?: string; givenThat?: string; persona?: string; immediateGoal?: string; deeperGoal?: string };
      let artifactHmwStatements: HmwStatementEntry[] = [];
      if (reframeStepForHmw) {
        const [reframeArt] = await db
          .select({ artifact: stepArtifacts.artifact })
          .from(stepArtifacts)
          .where(eq(stepArtifacts.workshopStepId, reframeStepForHmw.id))
          .limit(1);
        if (reframeArt?.artifact) {
          const art = reframeArt.artifact as Record<string, unknown>;
          if (Array.isArray(art.hmwStatements)) {
            artifactHmwStatements = art.hmwStatements as HmwStatementEntry[];
          }
        }
      }

      const getHmwStatementFromCard = (c: HmwCardData | undefined): string | undefined => {
        if (!c) return undefined;
        if (c.fullStatement) return c.fullStatement;
        if (c.givenThat && c.persona && c.immediateGoal && c.deeperGoal) {
          return `Given that ${c.givenThat}, how might we help ${c.persona} to ${c.immediateGoal} so they can ${c.deeperGoal}?`;
        }
        return undefined;
      };

      // Helper: find HMW statement for an ownerId from canvas cards or structured artifact
      const findHmwForOwner = (ownerId: string): string | undefined => {
        // Try canvas HMW cards first
        const card = allHmwCards.find((c) => c.ownerId === ownerId);
        const fromCard = getHmwStatementFromCard(card);
        if (fromCard) return fromCard;
        // Fall back to structured artifact hmwStatements
        const fromArtifact = artifactHmwStatements.find((s) => s.ownerId === ownerId);
        return fromArtifact?.fullStatement;
      };

      if (ownerForIdeation) {
        const stmt = findHmwForOwner('facilitator');
        ideationOwners.push({
          ownerId: 'facilitator',
          ownerName: ownerForIdeation.displayName,
          ownerColor: PARTICIPANT_COLORS[0],
          hmwBranchLabel: stmt ? extractHmwBranchLabel(stmt) : `${ownerForIdeation.displayName}'s HMW`,
          hmwFullStatement: stmt || undefined,
        });
      }
      for (const p of participantsForIdeation) {
        const stmt = findHmwForOwner(p.id);
        ideationOwners.push({
          ownerId: p.id,
          ownerName: p.displayName,
          ownerColor: p.color,
          hmwBranchLabel: stmt ? extractHmwBranchLabel(stmt) : `${p.displayName}'s HMW`,
          hmwFullStatement: stmt || undefined,
        });
      }
    }
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

  // Load canvas guides early so we can use DB-configured template positions
  const canvasGuidesForTemplates = await loadCanvasGuides(step.id);

  // Seed template sticky notes for steps that define them (e.g., Challenge step)
  // Check for absence of template sticky notes specifically — not an empty canvas.
  // This ensures templates are added even if the AI or user already created regular sticky notes.
  const hasTemplateStickyNotes = initialCanvasStickyNotes.some(p => p.templateKey);
  console.log(`[template-seed] step=${step.id}, stickyNotes=${initialCanvasStickyNotes.length}, hasTemplates=${hasTemplateStickyNotes}`);
  if (!hasTemplateStickyNotes) {
    // Prefer DB-configured template guides; fall back to hardcoded config
    let templateDefs = guidesToTemplateDefs(canvasGuidesForTemplates);
    if (templateDefs.length === 0) {
      templateDefs = getStepTemplateStickyNotes(step.id);
    }
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

  // Pre-seed persona skeleton cards from structured _personaCandidates saved during Step 3.
  // Falls back to legacy sticky-note text parsing for workshops that completed Step 3 before
  // the structured save was added.
  // Only creates templates when NONE exist yet — avoids duplicating cards from prior AI PERSONA_PLAN.
  if (step.id === 'persona' && initialPersonaTemplates.length === 0) {
    let candidates = await loadPersonaCandidates(session.workshop.id, 'user-research');

    // Fallback: parse persona cards from Step 3 canvas sticky notes (legacy workshops)
    if (candidates.length === 0) {
      const step3Canvas = await loadCanvasState(session.workshop.id, 'user-research');
      if (step3Canvas?.stickyNotes) {
        const personaCards = step3Canvas.stickyNotes.filter(
          (n) => (!n.type || n.type === 'stickyNote') && !n.cluster && n.text.includes(' — ')
        );
        candidates = personaCards.map((card) => {
          const [namePart, description] = card.text.split(' — ').map((s) => s.trim());
          const commaIdx = namePart ? namePart.indexOf(',') : -1;
          const firstName = commaIdx > 0 ? namePart.slice(0, commaIdx).trim() : (namePart || card.text);
          const archetype = commaIdx > 0 ? namePart.slice(commaIdx + 1).trim() : (namePart || card.text);
          return { name: firstName, archetype, description: description || '' };
        });
        // Backfill structured data so future loads skip this fallback
        if (candidates.length > 0) {
          await savePersonaCandidates(session.workshop.id, 'user-research', candidates);
          console.log(`[persona-seed] Backfilled ${candidates.length} persona candidates from legacy sticky notes`);
        }
      }
    }

    if (candidates.length > 0) {
      const PERSONA_CARD_WIDTH = 680;
      const PERSONA_GAP = 40;

      initialPersonaTemplates = candidates.map((candidate, i) => ({
        id: crypto.randomUUID(),
        position: {
          x: i * (PERSONA_CARD_WIDTH + PERSONA_GAP),
          y: 0,
        },
        personaId: `persona-${i + 1}`,
        archetype: candidate.archetype,
        archetypeRole: candidate.description,
        name: candidate.name !== candidate.archetype ? candidate.name : undefined,
      }));

      await saveCanvasState(session.workshop.id, step.id, {
        stickyNotes: initialCanvasStickyNotes,
        personaTemplates: initialPersonaTemplates,
      });
      console.log(`[persona-seed] Created ${initialPersonaTemplates.length} persona skeleton cards from ${candidates.length} candidates`);
    }
  }

  // ── Per-participant HMW cards for reframe step ──
  // In multiplayer, each person gets their own HMW card.
  // Requires looking up the workshopSession ID (different table from sessions).
  // sessionParticipants.sessionId → workshopSessions.id (prefix wses_),
  // NOT sessions.id (prefix ses_).
  if (step.id === 'reframe' && session.workshop.workshopType === 'multiplayer') {
    // Look up the multiplayer workshopSession to get the correct FK for sessionParticipants
    const [workshopSession] = await db
      .select()
      .from(workshopSessions)
      .where(eq(workshopSessions.workshopId, session.workshop.id))
      .limit(1);

    if (workshopSession) {
      const HMW_CARD_SPACING = 780; // 700px card + 80px gap

      // Query all non-removed participants for this workshop session
      const allParticipants = await db
        .select()
        .from(sessionParticipants)
        .where(eq(sessionParticipants.sessionId, workshopSession.id));
      const activeParticipants = allParticipants.filter((p) => p.status !== 'removed');
      let ownerParticipant = activeParticipants.find((p) => p.role === 'owner');
      const participants = activeParticipants.filter((p) => p.role === 'participant');

      // Lazy init: create owner participant record if missing (existing workshops pre-fix)
      if (!ownerParticipant && user) {
        try {
          const ownerDisplayName = user.fullName ?? user.username ?? 'Facilitator';
          const [created] = await db.insert(sessionParticipants).values({
            sessionId: workshopSession.id,
            clerkUserId: user.id,
            liveblocksUserId: user.id,
            displayName: ownerDisplayName,
            color: PARTICIPANT_COLORS[0],
            role: 'owner',
            status: 'active',
          }).returning();
          ownerParticipant = created;
        } catch {
          // Race condition: another request already created the record
          const existing = activeParticipants.find((p) => p.clerkUserId === user.id);
          if (existing) ownerParticipant = existing;
        }
      }

      if (initialHmwCards.length === 0) {
        // Fresh step: create skeleton cards for everyone
        if (ownerParticipant) {
          initialHmwCards.push({
            id: crypto.randomUUID(),
            position: { x: 0, y: 0 },
            cardState: 'skeleton',
            cardIndex: 0,
            ownerId: 'facilitator',
            ownerName: ownerParticipant.displayName,
            ownerColor: PARTICIPANT_COLORS[0],
          });
        }
        for (const p of participants) {
          initialHmwCards.push({
            id: crypto.randomUUID(),
            position: { x: initialHmwCards.length * HMW_CARD_SPACING, y: 0 },
            cardState: 'skeleton',
            cardIndex: initialHmwCards.length,
            ownerId: p.id,
            ownerName: p.displayName,
            ownerColor: p.color,
          });
        }
        // Fallback if no participants found
        if (initialHmwCards.length === 0) {
          initialHmwCards = [{
            id: crypto.randomUUID(),
            position: { x: 0, y: 0 },
            cardState: 'skeleton',
            cardIndex: 0,
          }];
        }
      } else if (!initialHmwCards.some((c) => c.ownerId)) {
        // Migration: existing cards without ownership (created before this feature)
        // Assign first card to facilitator, create skeletons for participants
        if (ownerParticipant) {
          initialHmwCards[0] = {
            ...initialHmwCards[0],
            ownerId: 'facilitator',
            ownerName: ownerParticipant.displayName,
            ownerColor: PARTICIPANT_COLORS[0],
          };
        }
        for (const p of participants) {
          initialHmwCards.push({
            id: crypto.randomUUID(),
            position: { x: initialHmwCards.length * HMW_CARD_SPACING, y: 0 },
            cardState: 'skeleton',
            cardIndex: initialHmwCards.length,
            ownerId: p.id,
            ownerName: p.displayName,
            ownerColor: p.color,
          });
        }
        // Persist migration to DB
        await saveCanvasState(session.workshop.id, step.id, {
          stickyNotes: initialCanvasStickyNotes,
          hmwCards: initialHmwCards,
        });
      } else {
        // Late-joiner: cards have ownership, check if current user is missing
        if (!participantId && !initialHmwCards.some((c) => c.ownerId === 'facilitator') && ownerParticipant) {
          // Insert facilitator card at position 0, shift others right
          initialHmwCards = initialHmwCards.map((c, i) => ({
            ...c,
            position: { x: (i + 1) * HMW_CARD_SPACING, y: 0 },
          }));
          initialHmwCards.unshift({
            id: crypto.randomUUID(),
            position: { x: 0, y: 0 },
            cardState: 'skeleton',
            cardIndex: 0,
            ownerId: 'facilitator',
            ownerName: ownerParticipant.displayName,
            ownerColor: PARTICIPANT_COLORS[0],
          });
        }
        if (participantId && !initialHmwCards.some((c) => c.ownerId === participantId)) {
          initialHmwCards.push({
            id: crypto.randomUUID(),
            position: { x: initialHmwCards.length * HMW_CARD_SPACING, y: 0 },
            cardState: 'skeleton',
            cardIndex: initialHmwCards.length,
            ownerId: participantId,
            ownerName: participantDisplayName || 'Participant',
            ownerColor: participantColor || '#888888',
          });
        }
      }
    }
  } else if (step.id === 'reframe' && initialHmwCards.length === 0) {
    // Solo mode: single card, no owner fields
    initialHmwCards = [{
      id: crypto.randomUUID(),
      position: { x: 0, y: 0 },
      cardState: 'skeleton',
      cardIndex: 0,
    }];
  }

  // Load Step 8 data for Step 9 (concept)
  let step8SelectedSlotIds: string[] | undefined;
  let step8Crazy8sSlots: Array<{ slotId: string; title: string; imageUrl?: string; ownerId?: string; ownerName?: string; ownerColor?: string }> | undefined;

  if (step.id === 'concept') {
    // Load Step 8 canvas state for crazy8sSlots and selectedSlotIds
    // Canvas state is the primary source — it's saved directly by the UI when user confirms selection
    const step8Canvas = await loadCanvasState(session.workshop.id, 'ideation');

    if (step8Canvas?.selectedSlotIds && step8Canvas.selectedSlotIds.length > 0) {
      step8SelectedSlotIds = step8Canvas.selectedSlotIds;
    }

    // Fallback: try AI-extracted selectedSketchSlotIds from the artifact
    if (!step8SelectedSlotIds) {
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
    }

    if (step8Canvas?.crazy8sSlots) {
      const brainMatrices = step8Canvas.brainRewritingMatrices || [];

      // Resolve final sketch image per slot: use last brain rewriting iteration, or fall back to original
      step8Crazy8sSlots = step8Canvas.crazy8sSlots.map((s) => {
        let resolvedImageUrl = s.imageUrl;

        // Check if this slot has a brain rewriting matrix with completed cells
        const matrix = brainMatrices.find((m) => m.slotId === s.slotId);
        if (matrix) {
          // Find the last completed cell (has imageUrl) by iterating cells in reverse
          for (let i = matrix.cells.length - 1; i >= 0; i--) {
            if (matrix.cells[i]?.imageUrl) {
              resolvedImageUrl = matrix.cells[i].imageUrl;
              break;
            }
          }
        }

        return {
          slotId: s.slotId,
          title: s.title,
          imageUrl: resolvedImageUrl,
          ownerId: s.ownerId,
          ownerName: s.ownerName,
          ownerColor: s.ownerColor,
        };
      });
    }

    // Filter out slots excluded from concepts via brain rewriting "Include in concepts" toggle
    if (step8SelectedSlotIds && step8SelectedSlotIds.length > 0) {
      const brainMatricesForFilter = step8Canvas?.brainRewritingMatrices || [];
      const slotGroupsForFilter = step8Canvas?.slotGroups || [];

      // Build set of excluded slot IDs
      const excludedSlotIds = new Set<string>();
      for (const matrix of brainMatricesForFilter) {
        if (matrix.includedInConcepts === false) {
          excludedSlotIds.add(matrix.slotId);
          // For group matrices, exclude all member slots
          if (matrix.groupId) {
            const group = slotGroupsForFilter.find((g) => g.id === matrix.groupId);
            if (group) group.slotIds.forEach((id) => excludedSlotIds.add(id));
          }
        }
      }

      step8SelectedSlotIds = step8SelectedSlotIds.filter((id) => !excludedSlotIds.has(id));
    }

    // Track whether concept card ownership was assigned/changed (need DB persistence)
    let conceptCardsChanged = false;

    // Create skeleton concept cards for selected ideas (one per selection unit)
    // Groups of slots count as one selection unit and become one concept card
    if (initialConceptCards.length === 0 && step8SelectedSlotIds && step8SelectedSlotIds.length > 0) {
      const step8SlotGroups = step8Canvas?.slotGroups || [];

      // Build selection units: each is either an ungrouped slot or a group
      type SelectionUnit = { type: 'slot'; slotId: string } | { type: 'group'; group: { id: string; label: string; slotIds: string[] } };
      const units: SelectionUnit[] = [];
      const processedSlotIds = new Set<string>();

      for (const slotId of step8SelectedSlotIds) {
        if (processedSlotIds.has(slotId)) continue;

        const group = step8SlotGroups.find((g) => g.slotIds.includes(slotId));
        if (group) {
          // Add the whole group as one unit, mark all members as processed
          units.push({ type: 'group', group });
          group.slotIds.forEach((id) => processedSlotIds.add(id));
        } else {
          units.push({ type: 'slot', slotId });
          processedSlotIds.add(slotId);
        }
      }

      initialConceptCards = units.map((unit, index) => {
        if (unit.type === 'group') {
          // Group → one concept card with group label as ideaSource
          // Use merged image if available, otherwise fall back to first slot's image
          const firstSlot = step8Crazy8sSlots?.find((s) => s.slotId === unit.group.slotIds[0]);
          const groupData = unit.group as { id: string; label: string; slotIds: string[]; mergedImageUrl?: string };
          const heroImage = groupData.mergedImageUrl || firstSlot?.imageUrl;
          const memberTitles = unit.group.slotIds
            .map((id) => step8Crazy8sSlots?.find((s) => s.slotId === id)?.title || id)
            .join(', ');
          return createDefaultConceptCard({
            ideaSource: `${unit.group.label} (${memberTitles})`,
            sketchSlotId: unit.group.slotIds[0],
            sketchImageUrl: heroImage,
            sketchGroupId: unit.group.id,
            ownerId: firstSlot?.ownerId,
            ownerName: firstSlot?.ownerName,
            ownerColor: firstSlot?.ownerColor,
            cardState: 'skeleton',
            cardIndex: index,
            position: { x: index * 720, y: 0 },
          });
        } else {
          // Ungrouped slot → one concept card
          const slot = step8Crazy8sSlots?.find((s) => s.slotId === unit.slotId);
          return createDefaultConceptCard({
            ideaSource: slot?.title || `Sketch ${unit.slotId}`,
            sketchSlotId: unit.slotId,
            sketchImageUrl: slot?.imageUrl,
            ownerId: slot?.ownerId,
            ownerName: slot?.ownerName,
            ownerColor: slot?.ownerColor,
            cardState: 'skeleton',
            cardIndex: index,
            position: { x: index * 720, y: 0 },
          });
        }
      });
      conceptCardsChanged = true; // freshly created cards need persistence
    }

    // Repair existing concept cards: backfill missing images/titles and add missing cards
    if (initialConceptCards.length > 0 && step8SelectedSlotIds && step8SelectedSlotIds.length > 0) {
      const step8SlotGroupsForBackfill = (step8Canvas?.slotGroups || []) as Array<{ id: string; label: string; slotIds: string[]; mergedImageUrl?: string }>;

      // Backfill images/titles on cards that are missing them (repairs AI-created cards)
      if (step8Crazy8sSlots) {
        initialConceptCards = initialConceptCards.map((card) => {
          if (card.sketchImageUrl) return card; // Already has image

          // Check if this card belongs to a group with a merged image
          if (card.sketchGroupId) {
            const group = step8SlotGroupsForBackfill.find((g) => g.id === card.sketchGroupId);
            if (group?.mergedImageUrl) {
              return { ...card, sketchImageUrl: group.mergedImageUrl };
            }
          }

          // Try to find the matching slot: by slotId first, then by cardIndex position
          let slot = card.sketchSlotId
            ? step8Crazy8sSlots!.find((s) => s.slotId === card.sketchSlotId)
            : undefined;
          if (!slot && card.cardIndex !== undefined && step8SelectedSlotIds![card.cardIndex]) {
            const inferredSlotId = step8SelectedSlotIds![card.cardIndex];
            slot = step8Crazy8sSlots!.find((s) => s.slotId === inferredSlotId);
          }
          if (!slot) return card;
          return {
            ...card,
            sketchSlotId: card.sketchSlotId || slot.slotId,
            sketchImageUrl: slot.imageUrl,
            ideaSource: card.ideaSource || slot.title || `Sketch ${slot.slotId}`,
          };
        });
      }

      // Add missing skeleton cards if fewer cards exist than selected ideas
      const maxCards = step8SelectedSlotIds.length;
      if (initialConceptCards.length < maxCards) {
        const existingSlotIds = new Set(initialConceptCards.map((c) => c.sketchSlotId).filter(Boolean));
        const missingSlotIds = step8SelectedSlotIds.filter((id) => !existingSlotIds.has(id));
        for (const slotId of missingSlotIds) {
          if (initialConceptCards.length >= maxCards) break;
          const slot = step8Crazy8sSlots?.find((s) => s.slotId === slotId);
          initialConceptCards.push(
            createDefaultConceptCard({
              ideaSource: slot?.title || `Sketch ${slotId}`,
              sketchSlotId: slotId,
              sketchImageUrl: slot?.imageUrl,
              cardState: 'skeleton',
              cardIndex: initialConceptCards.length,
              position: { x: initialConceptCards.length * 720, y: 0 },
            })
          );
        }
      }
    }

    // ── Load-balanced ownership assignment for multiplayer ──
    // After concept cards are created/repaired, ensure balanced ownership across participants
    if (session.workshop.workshopType === 'multiplayer' && initialConceptCards.length > 0) {
      // Load active session participants
      const [workshopSessionForConcept] = await db
        .select()
        .from(workshopSessions)
        .where(eq(workshopSessions.workshopId, session.workshop.id))
        .limit(1);

      if (workshopSessionForConcept) {
        const allConceptParticipants = await db
          .select()
          .from(sessionParticipants)
          .where(eq(sessionParticipants.sessionId, workshopSessionForConcept.id));
        const activeConceptParticipants = allConceptParticipants.filter((p) => p.status !== 'removed');

        // Include facilitator as potential owner
        let conceptOwnerParticipant = activeConceptParticipants.find((p) => p.role === 'owner');
        if (!conceptOwnerParticipant && user) {
          conceptOwnerParticipant = activeConceptParticipants.find((p) => p.clerkUserId === user.id) || undefined;
        }
        const conceptParticipants = activeConceptParticipants.filter((p) => p.role === 'participant');

        // Build participant list: facilitator first, then participants
        type ConceptOwnerEntry = { ownerId: string; ownerName: string; ownerColor: string };
        const availableOwners: ConceptOwnerEntry[] = [];
        if (conceptOwnerParticipant) {
          availableOwners.push({
            ownerId: 'facilitator',
            ownerName: conceptOwnerParticipant.displayName,
            ownerColor: PARTICIPANT_COLORS[0],
          });
        }
        for (const p of conceptParticipants) {
          availableOwners.push({ ownerId: p.id, ownerName: p.displayName, ownerColor: p.color });
        }

        if (availableOwners.length > 0) {
          const maxPerOwner = Math.ceil(initialConceptCards.length / availableOwners.length);

          // Count current assignments per owner
          const ownerCounts = new Map<string, number>();
          for (const owner of availableOwners) ownerCounts.set(owner.ownerId, 0);
          for (const card of initialConceptCards) {
            if (card.ownerId && ownerCounts.has(card.ownerId)) {
              ownerCounts.set(card.ownerId, (ownerCounts.get(card.ownerId) || 0) + 1);
            }
          }

          // Redistribute over-allocated cards (round-robin to least-loaded)
          const getLeastLoaded = (): ConceptOwnerEntry => {
            let minCount = Infinity;
            let minOwner = availableOwners[0];
            for (const owner of availableOwners) {
              const count = ownerCounts.get(owner.ownerId) || 0;
              if (count < minCount) {
                minCount = count;
                minOwner = owner;
              }
            }
            return minOwner;
          };

          initialConceptCards = initialConceptCards.map((card) => {
            // Card has no owner → assign to least-loaded
            if (!card.ownerId || !availableOwners.find((o) => o.ownerId === card.ownerId)) {
              const target = getLeastLoaded();
              ownerCounts.set(target.ownerId, (ownerCounts.get(target.ownerId) || 0) + 1);
              conceptCardsChanged = true;
              return { ...card, ownerId: target.ownerId, ownerName: target.ownerName, ownerColor: target.ownerColor };
            }

            // Card owner has too many → redistribute excess
            const currentCount = ownerCounts.get(card.ownerId) || 0;
            if (currentCount > maxPerOwner) {
              const target = getLeastLoaded();
              ownerCounts.set(card.ownerId, currentCount - 1);
              ownerCounts.set(target.ownerId, (ownerCounts.get(target.ownerId) || 0) + 1);
              conceptCardsChanged = true;
              return { ...card, ownerId: target.ownerId, ownerName: target.ownerName, ownerColor: target.ownerColor };
            }

            // Reconcile stale ownerColor — ensure card color matches current participant color
            const matchingOwner = availableOwners.find((o) => o.ownerId === card.ownerId);
            if (matchingOwner && card.ownerColor !== matchingOwner.ownerColor) {
              conceptCardsChanged = true;
              return { ...card, ownerColor: matchingOwner.ownerColor };
            }

            return card;
          });
        }
      }
    }

    // Persist concept card ownership to DB so the AI API route reads correct ownership
    if (conceptCardsChanged && initialConceptCards.length > 0) {
      await saveConceptCardOwnership(session.workshop.id, step.id, initialConceptCards);
    }
  }

  // Reuse already-loaded canvas guides, falling back to hardcoded defaults
  let canvasGuides = canvasGuidesForTemplates;
  if (canvasGuides.length === 0) {
    canvasGuides = getDefaultStepCanvasGuides(step.id);
  }

  // Load admin-configured default viewport settings for this step
  const canvasSettings = await loadStepCanvasSettings(step.id);

  // Step 10: check if journey map has been approved (gates prototype generation)
  let journeyMapApproved = false;
  if (stepNumber === 10) {
    const jmRows = await db
      .select({ content: buildPacks.content })
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, session.workshop.id), like(buildPacks.title, 'Journey Map:%'), eq(buildPacks.formatType, 'json')))
      .limit(1);
    if (jmRows[0]?.content) {
      try {
        const state = JSON.parse(jmRows[0].content);
        journeyMapApproved = state.isApproved === true;
      } catch { /* invalid JSON */ }
    }
  }

  // Build conceptOwners from concept card or HMW card data for multiplayer
  const conceptOwners = session.workshop.workshopType === 'multiplayer'
    && (initialConceptCards.length > 0 || initialHmwCards.length > 0)
    ? (() => {
        const seen = new Set<string>();
        const owners: Array<{ ownerId: string; ownerName: string; ownerColor: string }> = [];
        const allCards = [...initialConceptCards, ...initialHmwCards];
        for (const card of allCards) {
          if (card.ownerId && card.ownerName && card.ownerColor && !seen.has(card.ownerId)) {
            seen.add(card.ownerId);
            owners.push({ ownerId: card.ownerId, ownerName: card.ownerName, ownerColor: card.ownerColor });
          }
        }
        return owners;
      })()
    : undefined;

  return (
    <div className="h-full">
      <CanvasStoreProvider
        key={step.id}
        workshopType={session.workshop.workshopType ?? 'solo'}
        workshopId={session.workshop.id}
        stepId={step.id}
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
        initialSlotGroups={initialSlotGroups}
        initialBrainRewritingMatrices={initialBrainRewritingMatrices}
        initialDotVotes={initialDotVotes}
        initialVotingSession={initialVotingSession}
        initialVotingCardPositions={initialVotingCardPositions}
        initialIdeationPhase={initialIdeationPhase}
      >
        {session.workshop.workshopType === 'multiplayer' ? (
          <MultiplayerRoomLoader workshopId={session.workshop.id} sessionId={sessionId}>
            <StepContainer
              stepOrder={stepNumber}
              sessionId={sessionId}
              workshopId={session.workshop.id}
              workshopType={session.workshop.workshopType}
              initialMessages={initialMessages}
              initialArtifact={initialArtifact}
              stepStatus={stepRecord?.status}
              workshopStatus={session.workshop.status}
              hmwStatement={hmwStatement}
              challengeStatement={challengeStatement}
              hmwGoals={hmwGoals}
              step8SelectedSlotIds={step8SelectedSlotIds}
              step8Crazy8sSlots={step8Crazy8sSlots}
              isAdmin={userIsAdmin}
              canvasGuides={canvasGuides}
              canvasSettings={canvasSettings}
              participantId={participantId}
              participantDisplayName={participantDisplayName}
              participantColor={participantColor}
              ideationOwners={ideationOwners}
              conceptOwners={conceptOwners}
              shareToken={workshopShareToken}
              workshopSessionId={workshopSessionId}
              journeyMapApproved={journeyMapApproved}
              canvasConfirmed={canvasConfirmed}
            />
          </MultiplayerRoomLoader>
        ) : (
          <StepContainer
            stepOrder={stepNumber}
            sessionId={sessionId}
            workshopId={session.workshop.id}
            initialMessages={initialMessages}
            initialArtifact={initialArtifact}
            stepStatus={stepRecord?.status}
            workshopStatus={session.workshop.status}
            hmwStatement={hmwStatement}
            challengeStatement={challengeStatement}
            hmwGoals={hmwGoals}
            step8SelectedSlotIds={step8SelectedSlotIds}
            step8Crazy8sSlots={step8Crazy8sSlots}
            isAdmin={userIsAdmin}
            canvasGuides={canvasGuides}
            canvasSettings={canvasSettings}
            journeyMapApproved={journeyMapApproved}
            canvasConfirmed={canvasConfirmed}
          />
        )}
      </CanvasStoreProvider>
    </div>
  );
}

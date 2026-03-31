'use server';

import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { StickyNote, GridColumn, DrawingNode, MindMapNodeState, MindMapEdgeState } from '@/stores/canvas-store';
import type { Crazy8sSlot, SlotGroup } from '@/lib/canvas/crazy-8s-types';
import type { BrainRewritingMatrix } from '@/lib/canvas/brain-rewriting-types';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';
import type { DotVote, VotingSession } from '@/lib/canvas/voting-types';
import type { IdeationPhase } from '@/stores/canvas-store';
import { unwrapLiveblocksStorage } from '@/lib/liveblocks/unwrap-storage';

/**
 * Save canvas state to stepArtifacts JSONB column under the `_canvas` key.
 * Merges with existing artifact data so AI extraction outputs are preserved.
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param canvasState - The canvas state
 * @returns Promise with success flag and optional error message
 */
export async function saveCanvasState(
  workshopId: string,
  stepId: string,
  canvasState: {
    stickyNotes: StickyNote[];
    gridColumns?: GridColumn[];
    drawingNodes?: DrawingNode[];
    mindMapNodes?: MindMapNodeState[];
    mindMapEdges?: MindMapEdgeState[];
    crazy8sSlots?: Crazy8sSlot[];
    conceptCards?: ConceptCardData[];
    personaTemplates?: PersonaTemplateData[];
    hmwCards?: HmwCardData[];
    selectedSlotIds?: string[];
    slotGroups?: SlotGroup[];
    brainRewritingMatrices?: BrainRewritingMatrix[];
    dotVotes?: DotVote[];
    votingSession?: VotingSession;
    votingCardPositions?: Record<string, { x: number; y: number }>;
    ideationPhase?: IdeationPhase;
    _confirmed?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the workshopStep record
    const workshopStepRecords = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      )
      .limit(1);

    if (workshopStepRecords.length === 0) {
      return { success: false, error: 'Workshop step not found' };
    }

    const workshopStepId = workshopStepRecords[0].id;

    // Check for existing artifact — read full artifact to merge
    const existingArtifacts = await db
      .select({
        id: stepArtifacts.id,
        version: stepArtifacts.version,
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (existingArtifacts.length > 0) {
      // Merge canvas state into existing artifact, preserving extraction data.
      // Retry up to 3 times on version conflicts (auto-save and flush-before-send can race).
      const MAX_RETRIES = 3;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Re-read on retry to get fresh version
        const record = attempt === 0
          ? existingArtifacts[0]
          : (await db
              .select({ id: stepArtifacts.id, version: stepArtifacts.version, artifact: stepArtifacts.artifact })
              .from(stepArtifacts)
              .where(eq(stepArtifacts.workshopStepId, workshopStepId))
              .limit(1))[0];

        if (!record) return { success: false, error: 'Artifact disappeared during save' };

        const currentVersion = record.version;
        const newVersion = currentVersion + 1;
        const existingArtifact = (record.artifact || {}) as Record<string, unknown>;

        const mergedArtifact = {
          ...existingArtifact,
          _canvas: canvasState,
        };

        const updateResult = await db
          .update(stepArtifacts)
          .set({
            artifact: mergedArtifact,
            version: newVersion,
          })
          .where(
            and(
              eq(stepArtifacts.id, record.id),
              eq(stepArtifacts.version, currentVersion)
            )
          )
          .returning({ id: stepArtifacts.id });

        if (updateResult.length > 0) break; // Success

        // Version conflict — retry with fresh read
        if (attempt === MAX_RETRIES - 1) {
          console.warn('saveCanvasState: version conflict after max retries');
          return { success: false, error: 'version_conflict' };
        }
      }
    } else {
      // Insert new artifact with canvas under _canvas key.
      // Use onConflictDoUpdate to handle the race where two concurrent saves
      // both see no existing record and both try to insert.
      await db.insert(stepArtifacts).values({
        workshopStepId,
        stepId,
        artifact: { _canvas: canvasState },
        schemaVersion: 'canvas-1.0',
        version: 1,
      }).onConflictDoUpdate({
        target: stepArtifacts.workshopStepId,
        set: {
          artifact: { _canvas: canvasState },
          version: 2,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save canvas state:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Persona candidate stored alongside canvas data in step artifacts.
 * `name` is the human first name (e.g. "Anna"), `archetype` is the role
 * (e.g. "The Aspiring Speaker"), `description` is the tension/need.
 */
export type PersonaCandidate = { name: string; archetype: string; description: string };

/**
 * Save persona candidates to the `_personaCandidates` key of a step artifact.
 * Merges with any existing candidates, deduplicating by name (case-insensitive).
 * Writes to a separate top-level key so canvas auto-saves don't overwrite it.
 */
export async function savePersonaCandidates(
  workshopId: string,
  stepId: string,
  candidates: PersonaCandidate[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const workshopStepRecords = await db
      .select({ id: workshopSteps.id })
      .from(workshopSteps)
      .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, stepId)))
      .limit(1);

    if (workshopStepRecords.length === 0) {
      return { success: false, error: 'Workshop step not found' };
    }

    const workshopStepId = workshopStepRecords[0].id;

    const existingArtifacts = await db
      .select({ id: stepArtifacts.id, version: stepArtifacts.version, artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (existingArtifacts.length > 0) {
      const MAX_RETRIES = 3;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const record = attempt === 0
          ? existingArtifacts[0]
          : (await db
              .select({ id: stepArtifacts.id, version: stepArtifacts.version, artifact: stepArtifacts.artifact })
              .from(stepArtifacts)
              .where(eq(stepArtifacts.workshopStepId, workshopStepId))
              .limit(1))[0];

        if (!record) return { success: false, error: 'Artifact disappeared during save' };

        const currentVersion = record.version;
        const existingArtifact = (record.artifact || {}) as Record<string, unknown>;
        const existing = (existingArtifact._personaCandidates || []) as PersonaCandidate[];

        // Merge: deduplicate by archetype (case-insensitive), new values win
        const nameMap = new Map<string, PersonaCandidate>();
        for (const c of existing) nameMap.set((c.archetype || c.name).toLowerCase(), c);
        for (const c of candidates) nameMap.set((c.archetype || c.name).toLowerCase(), c);

        const merged = { ...existingArtifact, _personaCandidates: Array.from(nameMap.values()) };

        const updateResult = await db
          .update(stepArtifacts)
          .set({ artifact: merged, version: currentVersion + 1 })
          .where(and(eq(stepArtifacts.id, record.id), eq(stepArtifacts.version, currentVersion)))
          .returning({ id: stepArtifacts.id });

        if (updateResult.length > 0) break;
        if (attempt === MAX_RETRIES - 1) {
          return { success: false, error: 'version_conflict' };
        }
      }
    } else {
      await db.insert(stepArtifacts).values({
        workshopStepId,
        stepId,
        artifact: { _personaCandidates: candidates },
        schemaVersion: 'canvas-1.0',
        version: 1,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save persona candidates:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Load persona candidates from a step artifact's `_personaCandidates` key.
 * Returns an empty array if not found.
 */
export async function loadPersonaCandidates(
  workshopId: string,
  stepId: string,
): Promise<PersonaCandidate[]> {
  try {
    const workshopStepRecords = await db
      .select({ id: workshopSteps.id })
      .from(workshopSteps)
      .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, stepId)))
      .limit(1);

    if (workshopStepRecords.length === 0) return [];

    const artifactRecords = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepRecords[0].id))
      .limit(1);

    if (artifactRecords.length === 0) return [];

    const artifact = artifactRecords[0].artifact as Record<string, unknown> | null;
    if (artifact && Array.isArray(artifact._personaCandidates)) {
      // Handle legacy records missing `archetype` — treat `name` as archetype
      return (artifact._personaCandidates as Array<{ name: string; archetype?: string; description: string }>).map(
        (c) => ({ name: c.name, archetype: c.archetype || c.name, description: c.description }),
      );
    }

    return [];
  } catch (error) {
    console.error('Failed to load persona candidates:', error);
    return [];
  }
}

/**
 * Save only the concept card ownership (ownerId, ownerName, ownerColor) to the DB.
 * Surgically updates the `conceptCards` field within the existing `_canvas` JSONB column,
 * preserving all other canvas data. Used during SSR to persist rebalanced ownership
 * before the client loads, so the AI API route reads correct ownership from DB.
 */
export async function saveConceptCardOwnership(
  workshopId: string,
  stepId: string,
  conceptCards: ConceptCardData[],
): Promise<void> {
  try {
    const workshopStepRecords = await db
      .select({ id: workshopSteps.id })
      .from(workshopSteps)
      .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, stepId)))
      .limit(1);

    if (workshopStepRecords.length === 0) return;
    const workshopStepId = workshopStepRecords[0].id;

    const existing = await db
      .select({ id: stepArtifacts.id, artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (existing.length > 0) {
      // Merge concept cards into existing artifact's _canvas
      const existingArtifact = (existing[0].artifact || {}) as Record<string, unknown>;
      const existingCanvas = (existingArtifact._canvas || {}) as Record<string, unknown>;
      await db.update(stepArtifacts)
        .set({
          artifact: { ...existingArtifact, _canvas: { ...existingCanvas, conceptCards } },
        })
        .where(eq(stepArtifacts.id, existing[0].id));
    } else {
      // No artifact yet — create with concept cards
      await db.insert(stepArtifacts).values({
        workshopStepId,
        stepId,
        artifact: { _canvas: { stickyNotes: [], conceptCards } },
        schemaVersion: 'canvas-1.0',
        version: 1,
      });
    }
  } catch (error) {
    console.error('Failed to save concept card ownership:', error);
  }
}

/**
 * Load canvas state from stepArtifacts JSONB column
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @returns Promise with canvas state or null if not found
 */
export async function loadCanvasState(
  workshopId: string,
  stepId: string
): Promise<{
  stickyNotes: StickyNote[];
  gridColumns?: GridColumn[];
  drawingNodes?: DrawingNode[];
  mindMapNodes?: MindMapNodeState[];
  mindMapEdges?: MindMapEdgeState[];
  crazy8sSlots?: Crazy8sSlot[];
  conceptCards?: ConceptCardData[];
  personaTemplates?: PersonaTemplateData[];
  hmwCards?: HmwCardData[];
  selectedSlotIds?: string[];
  slotGroups?: SlotGroup[];
  brainRewritingMatrices?: BrainRewritingMatrix[];
  dotVotes?: DotVote[];
  votingSession?: VotingSession;
  votingCardPositions?: Record<string, { x: number; y: number }>;
  ideationPhase?: IdeationPhase;
  _confirmed?: boolean;
} | null> {
  try {
    // Find the workshopStep record
    const workshopStepRecords = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      )
      .limit(1);

    if (workshopStepRecords.length === 0) {
      return null;
    }

    const workshopStepId = workshopStepRecords[0].id;

    // Query stepArtifacts
    const artifactRecords = await db
      .select({
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (artifactRecords.length === 0) {
      return null;
    }

    const artifact = artifactRecords[0].artifact as Record<string, unknown> | null;

    // Read canvas data from the _canvas key (new format).
    // _canvas may be in CRDT format (from Liveblocks webhook before unwrap fix) — detect and unwrap.
    if (artifact && typeof artifact === 'object' && '_canvas' in artifact) {
      let rawCanvas = artifact._canvas as Record<string, unknown>;
      // Detect Liveblocks CRDT wrapper and unwrap if needed
      if (rawCanvas && ('liveblocksType' in rawCanvas || 'type' in rawCanvas)) {
        rawCanvas = unwrapLiveblocksStorage(rawCanvas) as Record<string, unknown>;
      }
      const canvas = rawCanvas as {
        stickyNotes?: StickyNote[];
        gridColumns?: GridColumn[];
        drawingNodes?: DrawingNode[];
        mindMapNodes?: MindMapNodeState[];
        mindMapEdges?: MindMapEdgeState[];
        crazy8sSlots?: Crazy8sSlot[];
        conceptCards?: ConceptCardData[];
        personaTemplates?: PersonaTemplateData[];
        hmwCards?: HmwCardData[];
        selectedSlotIds?: string[];
        slotGroups?: SlotGroup[];
        brainRewritingMatrices?: BrainRewritingMatrix[];
        dotVotes?: DotVote[];
        votingSession?: VotingSession;
        votingCardPositions?: Record<string, { x: number; y: number }>;
        ideationPhase?: IdeationPhase;
        _confirmed?: boolean;
      };
      if (canvas?.stickyNotes || canvas?.personaTemplates || canvas?.hmwCards || canvas?.mindMapNodes || canvas?.crazy8sSlots || canvas?.conceptCards || canvas?.selectedSlotIds || canvas?.brainRewritingMatrices || canvas?.dotVotes) {
        return {
          stickyNotes: canvas.stickyNotes || [],
          ...(canvas.gridColumns ? { gridColumns: canvas.gridColumns } : {}),
          ...(canvas.drawingNodes ? { drawingNodes: canvas.drawingNodes } : {}),
          ...(canvas.mindMapNodes ? { mindMapNodes: canvas.mindMapNodes } : {}),
          ...(canvas.mindMapEdges ? { mindMapEdges: canvas.mindMapEdges } : {}),
          ...(canvas.crazy8sSlots ? { crazy8sSlots: canvas.crazy8sSlots } : {}),
          ...(canvas.conceptCards ? { conceptCards: canvas.conceptCards } : {}),
          ...(canvas.personaTemplates ? { personaTemplates: canvas.personaTemplates } : {}),
          ...(canvas.hmwCards ? { hmwCards: canvas.hmwCards } : {}),
          ...(canvas.selectedSlotIds ? { selectedSlotIds: canvas.selectedSlotIds } : {}),
          ...(canvas.slotGroups ? { slotGroups: canvas.slotGroups } : {}),
          ...(canvas.brainRewritingMatrices ? { brainRewritingMatrices: canvas.brainRewritingMatrices } : {}),
          ...(canvas.dotVotes ? { dotVotes: canvas.dotVotes } : {}),
          ...(canvas.votingSession ? { votingSession: canvas.votingSession } : {}),
          ...(canvas.votingCardPositions ? { votingCardPositions: canvas.votingCardPositions } : {}),
          ...(canvas.ideationPhase ? { ideationPhase: canvas.ideationPhase } : {}),
          ...(canvas._confirmed ? { _confirmed: canvas._confirmed } : {}),
        };
      }
    }

    // Backward compat: if stickyNotes is at the top level (old format before fix),
    // read it but it won't be written back this way
    if (artifact && typeof artifact === 'object' && 'stickyNotes' in artifact) {
      return artifact as { stickyNotes: StickyNote[] };
    }

    return null;
  } catch (error) {
    console.error('Failed to load canvas state:', error);
    return null;
  }
}

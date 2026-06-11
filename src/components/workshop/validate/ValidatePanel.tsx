'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { createPrefixedId } from '@/lib/ids';
import {
  getValidationState,
  saveClassification,
  upsertValidationPlan,
  recordValidationResult,
  type WorkshopConcept,
} from '@/actions/validation-actions';
import type {
  Lens,
  OutputType,
  OutputTypeClassification,
  ProgressStep,
  Signal,
  ValidationPlan,
} from '@/lib/schemas';
import { findArtifactByKey, type ArtifactOption } from '@/lib/validation/artifact-lookup';
import { DetectOutputTypeCard } from './DetectOutputTypeCard';
import { ProposeAssumptionCard } from './ProposeAssumptionCard';
import { PickLensCard } from './PickLensCard';
import { RecommendArtifactCard } from './RecommendArtifactCard';
import { DefineSignalCard } from './DefineSignalCard';
import { RecordResultsCard, type RecordResultInput } from './RecordResultsCard';
import { ConceptCardArtifact } from './ConceptCardArtifact';
import { ArtifactChecklist } from './ArtifactChecklist';
import { ValidationGuidanceCard } from './ValidationGuidanceCard';
import { ValidationPlanSummary } from './ValidationPlanSummary';
import { SECTION_ORDER, sectionStatus, type SectionStatus } from './sections';

const now = () => new Date().toISOString();

// One solution per workshop: a single concept keeps its name; multiple parts roll up to one
// "Your solution" so the whole thing is validated as a unit, not concept-by-concept.
function solutionLabel(concepts: { name: string }[]): string {
  if (concepts.length === 1 && concepts[0].name) return concepts[0].name;
  return 'Your solution';
}

function makeDraft(solutionName: string, outputType: OutputType): ValidationPlan {
  const ts = now();
  return {
    id: createPrefixedId('vpl'),
    conceptName: solutionName || 'Your solution',
    conceptRef: undefined,
    outputType,
    outputTypes: [outputType],
    assumption: '',
    assumptionAlternatives: [],
    lens: 'desirability',
    artifactType: '',
    artifactLabel: '',
    signal: null,
    result: null,
    progressStep: 'detect',
    createdAt: ts,
    updatedAt: ts,
  };
}

export interface ValidatePanelProps {
  workshopId: string;
  sessionId: string;
  journeyFlowApproved?: boolean;
  /** Reports the active plan's output types (drives the app_digital reveal). */
  onOutputTypesChange?: (types: OutputType[]) => void;
  /** Reports the number of completed plans (drives workshop-completion gating). */
  onPlanCountChange?: (count: number) => void;
  /** Wraps up the plan: completes the workshop and opens the Build Pack. */
  onWrapUp?: () => void;
  /** True while the wrap-up / completion is in flight. */
  isWrappingUp?: boolean;
  /** Already completed — the CTA becomes "View Build Pack" instead of re-completing. */
  workshopCompleted?: boolean;
  /** Admin: unlocks the assumption Focus (broad/specific) toggle. */
  isAdmin?: boolean;
}

export function ValidatePanel({
  workshopId,
  sessionId,
  journeyFlowApproved = false,
  onOutputTypesChange,
  onPlanCountChange,
  onWrapUp,
  isWrappingUp = false,
  workshopCompleted = false,
  isAdmin = false,
}: ValidatePanelProps) {
  const [loading, setLoading] = React.useState(true);
  const [classification, setClassification] =
    React.useState<OutputTypeClassification | null>(null);
  const [concepts, setConcepts] = React.useState<WorkshopConcept[]>([]);
  const [problemStatement, setProblemStatement] = React.useState('');
  const [reframedStatement, setReframedStatement] = React.useState('');
  const [plans, setPlans] = React.useState<ValidationPlan[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [editingSection, setEditingSection] = React.useState<ProgressStep | null>(null);
  // Preview mode: once a plan is assembled, default to PREVIEW (step cards hidden).
  // The "Edit" button in the guidance card header switches to EDIT mode (step cards visible).
  const [previewMode, setPreviewMode] = React.useState(true);
  const [isClassifying, setIsClassifying] = React.useState(false);
  const [classifyError, setClassifyError] = React.useState<string | null>(null);
  const [isProposing, setIsProposing] = React.useState(false);
  const [proposeError, setProposeError] = React.useState<string | null>(null);
  // Dev-only provenance for the generated assumption (not persisted).
  const [assumptionMeta, setAssumptionMeta] = React.useState<{
    sources: string[];
    rationale: string;
  } | null>(null);
  // Broad (challenge-level) vs Specific (named-concept) assumption framing.
  const [assumptionScope, setAssumptionScope] = React.useState<'broad' | 'specific'>('broad');
  const [recordError, setRecordError] = React.useState<string | null>(null);
  const [recordingId, setRecordingId] = React.useState<string | null>(null);
  const [tailoring, setTailoring] = React.useState(false);

  const classifyTriggered = React.useRef(false);
  const proposeTriggered = React.useRef(false);
  const tailorTriggered = React.useRef<string | null>(null);

  const activePlan = plans.find((p) => p.id === activeId) ?? null;
  const completedPlans = plans.filter(
    (p) => p.progressStep === 'complete' && p.id !== activeId
  );
  const activeTypes = activePlan
    ? activePlan.outputTypes ?? [activePlan.outputType]
    : [];

  // ---- Initial load / resume ----
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getValidationState(workshopId);
      if (cancelled) return;
      if (!res.success) {
        setLoading(false);
        return;
      }
      const { classification: cls, validationPlans, concepts: cs } = res.data!;
      setClassification(cls);
      setConcepts(cs);
      setProblemStatement(res.data!.problemStatement);
      setReframedStatement(res.data!.reframedStatement);

      const inProgress = validationPlans.find((p) => p.progressStep !== 'complete');
      // A complete-but-unacknowledged plan still owes the user its Done row — keep it active
      // across reloads so acknowledgement (per-test, persisted) can't be skipped by a refresh.
      const unacknowledged = [...validationPlans]
        .reverse()
        .find((p) => p.progressStep === 'complete' && !p.acknowledgedAt);
      if (inProgress) {
        setPlans(validationPlans);
        setActiveId(inProgress.id);
      } else if (unacknowledged) {
        setPlans(validationPlans);
        setActiveId(unacknowledged.id);
      } else if (validationPlans.length > 0) {
        setPlans(validationPlans);
        setActiveId(null);
      } else {
        // Fresh start: seed ONE solution-level draft (concepts are its parts, not separate tests).
        const draft = makeDraft(solutionLabel(cs), cls?.type ?? 'app_digital');
        setPlans([draft]);
        setActiveId(draft.id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workshopId]);

  // Report resolved output types + completed count upward.
  const activeTypesKey = activeTypes.join(',');
  React.useEffect(() => {
    onOutputTypesChange?.(activeTypesKey ? (activeTypesKey.split(',') as OutputType[]) : []);
  }, [activeTypesKey, onOutputTypesChange]);

  const completedCount = plans.filter((p) => p.progressStep === 'complete').length;
  React.useEffect(() => {
    onPlanCountChange?.(completedCount);
  }, [completedCount, onPlanCountChange]);

  // ---- Persistence helpers ----
  const persist = React.useCallback(
    async (plan: ValidationPlan) => {
      const res = await upsertValidationPlan(workshopId, plan);
      if (!res.success) toast.error(res.error || 'Failed to save');
    },
    [workshopId]
  );

  const patchActive = React.useCallback(
    (patch: Partial<ValidationPlan>) => {
      setPlans((prev) =>
        prev.map((p) => (p.id === activeId ? { ...p, ...patch, updatedAt: now() } : p))
      );
    },
    [activeId]
  );

  // ---- Detect ----
  const runClassify = React.useCallback(async () => {
    setIsClassifying(true);
    setClassifyError(null);
    try {
      const r = await fetch('/api/validation/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Classification failed');
      setClassification(data.classification);
      patchActive({ outputType: data.classification.type, outputTypes: [data.classification.type] });
    } catch (e) {
      setClassifyError(e instanceof Error ? e.message : 'Classification failed');
    } finally {
      setIsClassifying(false);
    }
  }, [workshopId, patchActive]);

  // Auto-classify when the active plan is on Detect with no classification yet.
  React.useEffect(() => {
    if (
      activePlan?.progressStep === 'detect' &&
      !classification &&
      !isClassifying &&
      !classifyTriggered.current
    ) {
      classifyTriggered.current = true;
      void runClassify();
    }
  }, [activePlan?.progressStep, classification, isClassifying, runClassify]);

  // Toggle an output type on/off (max 2; first = primary). When the set changes, the
  // assumption auto-updates to match: we clear the stale one and regenerate it in place for
  // the new types (passing them directly so it never races on stale state).
  const toggleType = (type: OutputType) => {
    if (!activePlan) return;
    const current = activePlan.outputTypes ?? [activePlan.outputType];
    let nextTypes: OutputType[];
    if (current.includes(type)) {
      nextTypes = current.filter((t) => t !== type);
      if (nextTypes.length === 0) return; // keep at least one
    } else {
      if (current.length >= 2) return; // max 2
      nextTypes = [...current, type];
    }
    const primary = nextTypes[0];
    const hadAssumption = !!activePlan.assumption;

    const cls: OutputTypeClassification = {
      type: primary,
      confidence: 1, // explicit user choice is certain — never carry stale LLM confidence (Gap 3)
      rationale: classification?.rationale ?? '',
      source: 'user_override',
      classifiedAt: now(),
    };
    setClassification(cls);
    void saveClassification(workshopId, cls);

    const nextPlan: ValidationPlan = {
      ...activePlan,
      outputType: primary,
      outputTypes: nextTypes,
      // Clear the now-stale assumption + artifact so nothing persists out of sync.
      assumption: '',
      assumptionAlternatives: [],
      artifactType: '',
      artifactLabel: '',
      updatedAt: now(),
    };
    setPlans((prev) => prev.map((p) => (p.id === activeId ? nextPlan : p)));
    void persist(nextPlan);

    setAssumptionMeta(null);
    // Auto-regenerate the assumption for the new output set if one already existed.
    if (hadAssumption) {
      proposeTriggered.current = true; // we are generating explicitly; don't double-fire
      void runPropose(undefined, assumptionScope, nextTypes);
    } else {
      proposeTriggered.current = false; // let the auto-propose effect handle first generation
    }
  };

  // ---- Assumption ----
  const runPropose = React.useCallback(
    async (avoid?: string, scopeOverride?: 'broad' | 'specific', typesOverride?: OutputType[]) => {
      if (!activePlan) return;
      setIsProposing(true);
      setProposeError(null);
      try {
        const r = await fetch('/api/validation/propose-assumption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workshopId,
            outputTypes: typesOverride ?? activePlan.outputTypes ?? [activePlan.outputType],
            scope: scopeOverride ?? assumptionScope,
            avoid,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Could not propose an assumption');
        patchActive({ assumption: data.assumption, assumptionAlternatives: data.alternatives });
        setAssumptionMeta({ sources: data.sources ?? [], rationale: data.rationale ?? '' });
      } catch (e) {
        setProposeError(e instanceof Error ? e.message : 'Could not propose an assumption');
      } finally {
        setIsProposing(false);
      }
    },
    [activePlan, workshopId, patchActive, assumptionScope]
  );

  const changeScope = (scope: 'broad' | 'specific') => {
    if (scope === assumptionScope) return;
    setAssumptionScope(scope);
    void runPropose(undefined, scope);
  };

  // Auto-propose when entering the assumption section with no assumption yet.
  React.useEffect(() => {
    if (
      activePlan?.progressStep === 'assumption' &&
      !activePlan.assumption &&
      !isProposing &&
      !proposeTriggered.current
    ) {
      proposeTriggered.current = true;
      void runPropose();
    }
  }, [activePlan?.progressStep, activePlan?.assumption, isProposing, runPropose]);

  // When a plan is fully assembled, generate the one-line "for your solution" tailored example
  // (hybrid guidance) once, then persist it on the plan so it's stable across renders.
  React.useEffect(() => {
    const plan = plans.find((p) => p.id === activeId) ?? null;
    const isAssembled = !!plan && plan.progressStep === 'complete' && !editingSection;
    if (!plan || !isAssembled || plan.tailoredExample || tailorTriggered.current === plan.id) {
      return;
    }
    tailorTriggered.current = plan.id;
    let cancelled = false;
    (async () => {
      setTailoring(true);
      try {
        const r = await fetch('/api/validation/tailor-example', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workshopId, plan }),
        });
        const data = await r.json().catch(() => ({}));
        if (!cancelled && r.ok && typeof data.example === 'string' && data.example.trim()) {
          const updated: ValidationPlan = {
            ...plan,
            tailoredExample: data.example.trim(),
            updatedAt: now(),
          };
          setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
          void persist(updated);
        }
      } catch {
        // Best-effort: the static guidance stands on its own without the tailored line.
      } finally {
        if (!cancelled) setTailoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plans, activeId, editingSection, workshopId, persist]);

  // ---- Section commit (advance OR save-in-place when editing) ----
  const commitSection = React.useCallback(
    (section: ProgressStep, patch: Partial<ValidationPlan>) => {
      if (!activePlan) return;
      const editing = editingSection === section;
      const nextStep = editing
        ? activePlan.progressStep
        : SECTION_ORDER[Math.min(SECTION_ORDER.indexOf(section) + 1, SECTION_ORDER.length - 1)];
      const next: ValidationPlan = {
        ...activePlan,
        ...patch,
        progressStep: nextStep,
        updatedAt: now(),
      };
      setPlans((prev) => prev.map((p) => (p.id === next.id ? next : p)));
      if (editing) setEditingSection(null);
      if (nextStep === 'complete') {
        setActiveId(next.id); // keep showing the assembled plan
        setPreviewMode(true);  // newly assembled → default to Preview
      }
      void persist(next);
    },
    [activePlan, editingSection, persist]
  );

  const statusFor = (section: ProgressStep): SectionStatus => {
    if (!activePlan) return 'locked';
    const natural = sectionStatus(section, activePlan.progressStep);
    if (!editingSection) return natural;
    if (section === editingSection) return 'active';
    return natural === 'locked' ? 'locked' : 'done';
  };

  // Test ANOTHER risk of the SAME solution (not another concept). Reuses the solution's output
  // type, defaults to a not-yet-used lens, and starts at the assumption (Detect is already done).
  const addAnotherTest = () => {
    const base = activePlan ?? plans[plans.length - 1];
    const types: OutputType[] =
      base?.outputTypes ?? (base ? [base.outputType] : ['app_digital']);
    const usedLenses = new Set(plans.map((p) => p.lens));
    const nextLens =
      (['feasibility', 'viability', 'desirability'] as Lens[]).find((l) => !usedLenses.has(l)) ??
      'desirability';
    const draft: ValidationPlan = {
      ...makeDraft(solutionLabel(concepts), types[0]),
      outputTypes: types,
      lens: nextLens,
      progressStep: 'assumption',
    };
    proposeTriggered.current = false; // let the auto-propose effect generate a fresh assumption
    setEditingSection(null);
    setPreviewMode(true); // fresh wizard — preview doesn't apply until assembled
    setPlans((prev) => [...prev, draft]);
    setActiveId(draft.id);
    void persist(draft);
  };

  // Per-test wrap-up: Done acknowledges THIS plan (persisted on the plan itself, so it
  // survives reloads) and completes the workshop the first time. Subsequent tests get their
  // own Done — visibility derives from "assembled && !acknowledgedAt", never from the global
  // workshopCompleted flag (which once hid Done forever on completed workshops).
  const acknowledgeDone = () => {
    if (!activePlan) return;
    const next: ValidationPlan = { ...activePlan, acknowledgedAt: now(), updatedAt: now() };
    setPlans((prev) => prev.map((p) => (p.id === next.id ? next : p)));
    void persist(next);
    if (!workshopCompleted) onWrapUp?.();
  };

  const record = async (planId: string, input: RecordResultInput) => {
    setRecordingId(planId);
    setRecordError(null);
    const res = await recordValidationResult(workshopId, planId, input);
    setRecordingId(null);
    if (!res.success) {
      setRecordError(res.error || 'Failed to record result');
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === planId ? res.data!.plan : p)));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Icon name="spinner" className="h-6 w-6 animate-spin text-foreground/70" />
      </div>
    );
  }

  const assembled = activePlan && activePlan.progressStep === 'complete' && !editingSection;
  // In Preview mode the five step cards are hidden; Edit mode reveals them.
  // While the wizard is in progress (not yet assembled), the step cards always show.
  const showStepCards = !assembled || !previewMode;
  const selectedArtifact: ArtifactOption | undefined = activePlan
    ? findArtifactByKey(activePlan.artifactType)
    : undefined;

  return (
    <div className="flex flex-col">
      <div className="space-y-6 p-6">
        <header className="space-y-3">
          <div>
            <h2 className="font-serif text-3xl leading-[1.1] tracking-tight text-foreground">
              Validate your idea
            </h2>
            <p className="text-base text-foreground/70">
              Design thinking validates one assumption about a human need — not each piece. We&apos;ll
              test your whole solution with the cheapest experiment.
            </p>
          </div>
          {concepts.length > 1 && (
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-foreground/70">
              <span className="font-medium text-foreground">Your solution combines:</span>{' '}
              {concepts.map((c) => c.name).join(' · ')}
            </p>
          )}
        </header>

        {activePlan && showStepCards && (
          <div className="space-y-4">
            {/* EDIT mode banner — shown when manually switching back to edit after assembly */}
            {assembled && !previewMode && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-2.5">
                <span className="text-sm text-foreground/70">
                  Editing your validation plan — changes are saved automatically.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSection(null);
                    setPreviewMode(true);
                  }}
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-foreground/70 hover:bg-muted"
                >
                  Preview
                </button>
              </div>
            )}

            <DetectOutputTypeCard
              status={statusFor('detect')}
              classification={classification}
              selectedTypes={activeTypes}
              isClassifying={isClassifying}
              error={classifyError}
              onRetry={runClassify}
              onToggleType={toggleType}
              onContinue={() =>
                commitSection('detect', {
                  outputType: activePlan.outputType,
                  outputTypes: activeTypes,
                })
              }
              onEdit={() => setEditingSection('detect')}
            />

            <ProposeAssumptionCard
              status={statusFor('assumption')}
              value={activePlan.assumption}
              alternatives={activePlan.assumptionAlternatives}
              isProposing={isProposing}
              error={proposeError}
              onChange={(text) => patchActive({ assumption: text })}
              onSuggestAnother={() => runPropose(activePlan.assumption || undefined)}
              onSelectAlternative={(text) => patchActive({ assumption: text })}
              onContinue={() => commitSection('assumption', { assumption: activePlan.assumption })}
              onEdit={() => setEditingSection('assumption')}
              devMeta={assumptionMeta}
              scope={assumptionScope}
              onScopeChange={changeScope}
              isAdmin={isAdmin}
            />

            <PickLensCard
              status={statusFor('lens')}
              value={activePlan.lens}
              onChange={(lens: Lens) => patchActive({ lens })}
              onContinue={() => commitSection('lens', { lens: activePlan.lens })}
              onEdit={() => setEditingSection('lens')}
            />

            <RecommendArtifactCard
              status={statusFor('artifact')}
              outputType={activePlan.outputType}
              lens={activePlan.lens}
              selectedKey={activePlan.artifactType}
              onChange={(option) =>
                patchActive({ artifactType: option.key, artifactLabel: option.label })
              }
              onContinue={() =>
                commitSection('artifact', {
                  artifactType: activePlan.artifactType,
                  artifactLabel: activePlan.artifactLabel,
                })
              }
              onEdit={() => setEditingSection('artifact')}
            />

            <DefineSignalCard
              status={statusFor('signal')}
              initial={activePlan.signal}
              defaultMetric={defaultMetricFor(activePlan.outputType)}
              suggestContext={{
                workshopId,
                assumption: activePlan.assumption,
                outputType: activePlan.outputType,
                lens: activePlan.lens,
                artifactLabel: activePlan.artifactLabel,
              }}
              onContinue={(signal: Signal) => commitSection('signal', { signal })}
              onEdit={() => setEditingSection('signal')}
            />
          </div>
        )}

        {/* Assembled plan. The page reads as three zones (gestalt: common region + proximity):
            PLAN — the five step cards above (what we decided);
            ACT  — ONE bordered "Run your test" region: guidance, build CTA, record result;
            STATUS — the saved/Done row + test-another below. */}
        {assembled && activePlan && (
          <div className="space-y-4">
            {/* ACT — everything about running the test lives in this one region. */}
            <Surface className="space-y-5 p-5">
              <div>
                <h3 className="text-lg font-semibold">Run your test</h3>
                <p className="mt-0.5 text-sm text-foreground/70">
                  Build the test, put it in front of people, then log what happened below.
                </p>
              </div>

              <ValidationGuidanceCard
                flat
                outputType={activePlan.outputType}
                outputTypes={activePlan.outputTypes ?? [activePlan.outputType]}
                tailoredExample={activePlan.tailoredExample}
                tailoring={tailoring}
                journeyFlowApproved={journeyFlowApproved}
                classification={classification}
                sessionId={sessionId}
                onReclassify={() => setEditingSection('detect')}
                onEditMode={() => {
                  setEditingSection(null);
                  setPreviewMode(false);
                }}
              />

              {selectedArtifact?.generatesConceptCard ? (
                <ConceptCardArtifact
                  plan={activePlan}
                  context={{
                    problem: reframedStatement || problemStatement,
                    elevatorPitch: concepts[0]?.elevatorPitch ?? '',
                    usp: concepts[0]?.usp ?? '',
                  }}
                />
              ) : (
                <ArtifactChecklist plan={activePlan} />
              )}

              {/* Post-test action: record the result — own card chrome inside the zone. */}
              <RecordResultsCard
                plan={activePlan}
                isSaving={recordingId === activePlan.id}
                error={recordError}
                onRecord={(input) => record(activePlan.id, input)}
              />

              {/* Done button — lives at the bottom of the Run-your-test card.
                  Shows until THIS plan is acknowledged (per-plan, persisted).
                  Never gated on global workshopCompleted. */}
              {!activePlan.acknowledgedAt && (
                <div className="space-y-2 border-t border-border/60 pt-4">
                  {!workshopCompleted && (
                    <p className="text-center text-sm text-foreground/70">
                      Done finishes the workshop and saves your plan to the Build Pack. You can
                      record the result later — it&apos;s not required.
                    </p>
                  )}
                  <div className="flex justify-center">
                    <Button
                      size="sm"
                      className="gap-1.5 btn-shimmer"
                      onClick={acknowledgeDone}
                      disabled={isWrappingUp}
                    >
                      {isWrappingUp ? (
                        <Icon name="spinner" className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon name="check-circle" className="h-4 w-4" />
                      )}
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </Surface>
          </div>
        )}

        {/* Previously completed plans — hidden while any active test is open (mid-wizard OR
            assembled but not yet acknowledged), so focus stays on the current test. Shows
            again once the user clicks Done (acknowledgedAt set) or when no plan is active. */}
        {(!activePlan || (assembled && !!activePlan.acknowledgedAt)) && completedPlans.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground/70">
              Other assumptions you&apos;ve tested
            </h3>
            {completedPlans.map((plan) => (
              <Surface key={plan.id} className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Validation test
                  </span>
                  <div className="flex items-center gap-2">
                    {plan.result && (
                      <span className="inline-flex items-center gap-1 text-sm text-foreground/70">
                        <Icon name="rocket" className="h-3 w-3" /> score {plan.result.score}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      className="gap-1"
                      onClick={() => setActiveId(plan.id)}
                    >
                      Open
                      <Icon name="arrow-right" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <ValidationPlanSummary plan={plan} />
              </Surface>
            ))}
          </div>
        )}

        {/* Page-level action: test another assumption. Visible only after the active plan is
            acknowledged (Done clicked) or when no plan is active — matches the prior-tests
            visibility rule so the page holds one focus while any test is open. */}
        {(!activePlan || (assembled && !!activePlan.acknowledgedAt)) && plans.length < 3 && (
          <div className="flex justify-center pb-2">
            {/* Same secondary-additive treatment as "+ Record a result" (similarity) */}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={addAnotherTest}>
              <Icon name="plus" className="h-3.5 w-3.5" />
              Test another assumption
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Sensible default metric phrasing per output type. */
function defaultMetricFor(type: OutputType): string {
  switch (type) {
    case 'process_change':
      return 'Stakeholders who would adopt it as-is';
    case 'service':
      return 'Users who got the value from the service';
    case 'physical_product':
      return 'People who would buy / pre-order it';
    case 'offering':
      return 'Target buyers who committed';
    case 'experience_design':
      return 'Users who complete the task on the redesign';
    case 'brand_comms':
      return 'People who understood and acted on the message';
    case 'campaign':
      return 'People who took the campaign’s target action';
    case 'app_digital':
    default:
      return 'Users who took the key action';
  }
}

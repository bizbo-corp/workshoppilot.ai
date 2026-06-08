'use client';

import * as React from 'react';
import { Loader2, Plus, FileDown, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { ProgressRail } from './ProgressRail';
import { DetectOutputTypeCard } from './DetectOutputTypeCard';
import { ProposeAssumptionCard } from './ProposeAssumptionCard';
import { PickLensCard } from './PickLensCard';
import { RecommendArtifactCard } from './RecommendArtifactCard';
import { DefineSignalCard } from './DefineSignalCard';
import { RecordResultsCard } from './RecordResultsCard';
import { ConceptCardArtifact } from './ConceptCardArtifact';
import { ArtifactChecklist } from './ArtifactChecklist';
import { ValidationPlanSummary } from './ValidationPlanSummary';
import { SECTION_ORDER, sectionStatus, type SectionStatus } from './sections';

const now = () => new Date().toISOString();

function makeDraft(concept: WorkshopConcept | undefined, outputType: OutputType): ValidationPlan {
  const ts = now();
  return {
    id: createPrefixedId('vpl'),
    conceptName: concept?.name || 'Primary concept',
    conceptRef: concept?.ideaSource || undefined,
    outputType,
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
  journeyMapApproved?: boolean;
  /** Reports the resolved output type of the active plan (drives the app_digital reveal). */
  onOutputTypeChange?: (type: OutputType | null) => void;
  /** Reports the number of completed plans (drives workshop-completion gating). */
  onPlanCountChange?: (count: number) => void;
}

export function ValidatePanel({
  workshopId,
  onOutputTypeChange,
  onPlanCountChange,
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

  const [isClassifying, setIsClassifying] = React.useState(false);
  const [classifyError, setClassifyError] = React.useState<string | null>(null);
  const [isProposing, setIsProposing] = React.useState(false);
  const [proposeError, setProposeError] = React.useState<string | null>(null);
  const [recordError, setRecordError] = React.useState<string | null>(null);
  const [recordingId, setRecordingId] = React.useState<string | null>(null);
  const [addingToBuildPack, setAddingToBuildPack] = React.useState(false);

  const classifyTriggered = React.useRef(false);
  const proposeTriggered = React.useRef(false);

  const activePlan = plans.find((p) => p.id === activeId) ?? null;
  const completedPlans = plans.filter(
    (p) => p.progressStep === 'complete' && p.id !== activeId
  );

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
      if (inProgress) {
        setPlans(validationPlans);
        setActiveId(inProgress.id);
      } else if (validationPlans.length > 0) {
        setPlans(validationPlans);
        setActiveId(null);
      } else {
        // Fresh start: seed the first draft for the primary concept.
        const draft = makeDraft(cs[0], cls?.type ?? 'app_digital');
        setPlans([draft]);
        setActiveId(draft.id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workshopId]);

  // Report resolved output type + completed count upward.
  React.useEffect(() => {
    onOutputTypeChange?.(activePlan?.outputType ?? classification?.type ?? null);
  }, [activePlan?.outputType, classification?.type, onOutputTypeChange]);

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
      patchActive({ outputType: data.classification.type });
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

  const selectType = (type: OutputType) => {
    const next: OutputTypeClassification = {
      type,
      confidence: 1,
      rationale: classification?.rationale ?? '',
      source: 'user_override',
      classifiedAt: now(),
    };
    setClassification(next);
    // Changing the type invalidates the artifact recommendation.
    patchActive({ outputType: type, artifactType: '', artifactLabel: '' });
    void saveClassification(workshopId, next);
  };

  // ---- Assumption ----
  const runPropose = React.useCallback(
    async (avoid?: string) => {
      if (!activePlan) return;
      setIsProposing(true);
      setProposeError(null);
      try {
        const r = await fetch('/api/validation/propose-assumption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workshopId, outputType: activePlan.outputType, avoid }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Could not propose an assumption');
        patchActive({ assumption: data.assumption, assumptionAlternatives: data.alternatives });
      } catch (e) {
        setProposeError(e instanceof Error ? e.message : 'Could not propose an assumption');
      } finally {
        setIsProposing(false);
      }
    },
    [activePlan, workshopId, patchActive]
  );

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
      if (nextStep === 'complete') setActiveId(next.id); // keep showing the assembled plan
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

  const startNextConcept = () => {
    const usedRefs = new Set(plans.map((p) => p.conceptRef ?? p.conceptName));
    const nextConcept = concepts.find((c) => !usedRefs.has(c.ideaSource || c.name)) ?? concepts[0];
    const draft = makeDraft(nextConcept, classification?.type ?? 'app_digital');
    setClassification(null);
    classifyTriggered.current = false;
    proposeTriggered.current = false;
    setPlans((prev) => [...prev, draft]);
    setActiveId(draft.id);
  };

  const record = async (planId: string, actual: number, notes?: string) => {
    setRecordingId(planId);
    setRecordError(null);
    const res = await recordValidationResult(workshopId, planId, actual, notes);
    setRecordingId(null);
    if (!res.success) {
      setRecordError(res.error || 'Failed to record result');
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === planId ? res.data!.plan : p)));
  };

  const addToBuildPack = async () => {
    setAddingToBuildPack(true);
    try {
      const r = await fetch('/api/build-pack/generate-validation-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to add to Build Pack');
      }
      toast.success('Validation plan added to your Build Pack');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add to Build Pack');
    } finally {
      setAddingToBuildPack(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const assembled = activePlan && activePlan.progressStep === 'complete' && !editingSection;
  const selectedArtifact: ArtifactOption | undefined = activePlan
    ? findArtifactByKey(activePlan.artifactType)
    : undefined;

  return (
    <div className="flex flex-col">
      <div className="space-y-6 p-6">
        <header className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Validate your concept</h2>
            <p className="text-sm text-muted-foreground">
              Design thinking validates an assumption about a human need — not the thing itself.
              Let&apos;s find the cheapest way to test yours.
            </p>
          </div>
          {activePlan && <ProgressRail progress={activePlan.progressStep} />}
        </header>

        {activePlan && (
          <div className="space-y-4">
            <DetectOutputTypeCard
              status={statusFor('detect')}
              classification={classification}
              isClassifying={isClassifying}
              error={classifyError}
              onRetry={runClassify}
              onSelectType={selectType}
              onContinue={() =>
                commitSection('detect', { outputType: classification?.type ?? activePlan.outputType })
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

        {/* Assembled plan: artifact panel + record results + actions */}
        {assembled && activePlan && (
          <div className="space-y-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Your validation plan is ready</h3>
            </div>
            <ValidationPlanSummary plan={activePlan} />

            {selectedArtifact?.generatesConceptCard ? (
              <ConceptCardArtifact
                plan={activePlan}
                context={{
                  problem: reframedStatement || problemStatement,
                  elevatorPitch:
                    concepts.find((c) => (c.ideaSource || c.name) === (activePlan.conceptRef || activePlan.conceptName))
                      ?.elevatorPitch ?? '',
                  usp:
                    concepts.find((c) => (c.ideaSource || c.name) === (activePlan.conceptRef || activePlan.conceptName))
                      ?.usp ?? '',
                }}
              />
            ) : activePlan.outputType === 'app_digital' ? (
              <p className="rounded-lg border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                Prototype &amp; journey-map tools are available below.
              </p>
            ) : (
              <ArtifactChecklist plan={activePlan} />
            )}

            <RecordResultsCard
              plan={activePlan}
              isSaving={recordingId === activePlan.id}
              error={recordError}
              onRecord={(actual, notes) => record(activePlan.id, actual, notes)}
            />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={addToBuildPack}
                disabled={addingToBuildPack}
              >
                {addingToBuildPack ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                Add to Build Pack
              </Button>
              {concepts.length > 1 && (
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={startNextConcept}>
                  <Plus className="h-3.5 w-3.5" />
                  Validate the next one
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Previously completed plans */}
        {completedPlans.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Other validation plans
            </h3>
            {completedPlans.map((plan) => (
              <div key={plan.id} className="space-y-3 rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{plan.conceptName}</span>
                  {plan.result && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Rocket className="h-3 w-3" /> score {plan.result.score}
                    </span>
                  )}
                  <Button variant="ghost" size="xs" onClick={() => setActiveId(plan.id)}>
                    Open
                  </Button>
                </div>
                <ValidationPlanSummary plan={plan} />
              </div>
            ))}
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
    case 'app_digital':
    default:
      return 'Users who took the key action';
  }
}

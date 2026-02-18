'use client';

import * as React from 'react';
import { FileText, Presentation, Users, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeliverableCard, DELIVERABLES } from './deliverable-card';

interface SynthesisSummaryViewProps {
  artifact: Record<string, unknown>;
}

interface StepSummary {
  stepNumber: number;
  stepName: string;
  keyOutputs: string[];
}

interface ConfidenceAssessment {
  score: number;
  researchQuality: 'thin' | 'moderate' | 'strong';
  rationale: string;
}

const DELIVERABLE_ICONS: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-5 w-5" />,
  Presentation: <Presentation className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Code: <Code className="h-5 w-5" />,
};

/**
 * Get color class for confidence score
 */
function getConfidenceColor(score: number): string {
  if (score >= 7) return 'text-green-700 dark:text-green-400';
  if (score >= 4) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

/**
 * Get background color for confidence gauge
 */
function getConfidenceBarColor(score: number): string {
  if (score >= 7) return 'bg-green-500';
  if (score >= 4) return 'bg-amber-500';
  return 'bg-red-500';
}

/**
 * Get research quality badge color
 */
function getResearchQualityColor(quality: 'thin' | 'moderate' | 'strong'): string {
  switch (quality) {
    case 'strong':
      return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
    case 'moderate':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'thin':
      return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
  }
}

/**
 * SynthesisSummaryView component
 * Renders Step 10 validate artifact as a polished journey summary with narrative intro, step summaries, confidence gauge, and next steps
 */
export function SynthesisSummaryView({ artifact }: SynthesisSummaryViewProps) {
  const narrative = artifact.narrative as string | undefined;
  const stepSummaries = (artifact.stepSummaries as StepSummary[]) || [];
  const confidenceAssessment = artifact.confidenceAssessment as ConfidenceAssessment | undefined;
  const recommendedNextSteps = (artifact.recommendedNextSteps as string[]) || [];

  // Empty state
  if (!narrative && stepSummaries.length === 0 && !confidenceAssessment && recommendedNextSteps.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-card p-12">
        <p className="text-sm text-muted-foreground">
          Your validated synthesis summary will appear here after AI completes the review
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Narrative Intro */}
      {narrative && (
        <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
          <p className="text-base leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
            {narrative}
          </p>
        </div>
      )}

      {/* Step-by-Step Summary */}
      {stepSummaries.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Journey Summary</h3>
          <div className="space-y-3">
            {stepSummaries.map((step, idx) => (
              <div
                key={idx}
                className="flex gap-4 rounded-lg border bg-card p-4"
              >
                {/* Step number badge */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.stepNumber}
                </div>

                {/* Step content */}
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-sm">{step.stepName}</h4>
                  <ul className="space-y-1">
                    {step.keyOutputs.map((output, outputIdx) => (
                      <li key={outputIdx} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{output}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Assessment */}
      {confidenceAssessment && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Confidence Assessment</h3>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            {/* Score display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={cn('text-5xl font-bold', getConfidenceColor(confidenceAssessment.score))}>
                    {confidenceAssessment.score}
                  </div>
                  <div className="text-sm text-muted-foreground">/10</div>
                </div>
                <div className="flex-1">
                  {/* Visual gauge bar */}
                  <div className="h-4 w-full max-w-xs rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all', getConfidenceBarColor(confidenceAssessment.score))}
                      style={{ width: `${confidenceAssessment.score * 10}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Research quality badge */}
              <span className={cn(
                'rounded-md border px-3 py-1 text-xs font-medium uppercase tracking-wide',
                getResearchQualityColor(confidenceAssessment.researchQuality)
              )}>
                {confidenceAssessment.researchQuality} Research
              </span>
            </div>

            {/* Rationale */}
            <div className="rounded bg-muted/50 p-4">
              <p className="text-sm leading-relaxed">
                {confidenceAssessment.rationale}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Next Steps */}
      {recommendedNextSteps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>What's Next</span>
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </h3>
          <div className="rounded-lg border bg-card p-6">
            <ol className="space-y-3">
              {recommendedNextSteps.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  {/* Checkbox icon (unchecked) */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-muted-foreground/30">
                    <span className="text-lg font-semibold text-muted-foreground">{idx + 1}</span>
                  </div>
                  <span className="flex-1 text-sm leading-relaxed pt-0.5">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Build Pack Deliverables */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Build Pack Deliverables</h3>
        <p className="text-sm text-muted-foreground">
          Export-ready documents generated from your workshop. Available soon.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DELIVERABLES.map((d) => (
            <DeliverableCard
              key={d.id}
              title={d.title}
              description={d.description}
              icon={DELIVERABLE_ICONS[d.iconName]}
              disabled={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ConceptSheetViewProps {
  artifact: Record<string, unknown>;
}

interface Concept {
  name: string;
  ideaSource: string;
  elevatorPitch: string;
  usp: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  feasibility: {
    technical: {
      score: number;
      rationale: string;
    };
    business: {
      score: number;
      rationale: string;
    };
    userDesirability: {
      score: number;
      rationale: string;
    };
  };
  billboardHero?: {
    headline: string;
    subheadline: string;
    cta: string;
  };
}

/**
 * Get color class for feasibility score
 */
function getScoreColor(score: number): string {
  if (score >= 4) return 'text-green-700 dark:text-green-400';
  if (score >= 3) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

/**
 * Get background color for score bar
 */
function getScoreBarColor(score: number): string {
  if (score >= 4) return 'bg-green-500';
  if (score >= 3) return 'bg-amber-500';
  return 'bg-red-500';
}

/**
 * Render score dots (1-5)
 */
function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((dot) => (
        <div
          key={dot}
          className={cn(
            'h-2 w-2 rounded-full',
            dot <= score ? getScoreBarColor(score) : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}

/**
 * ConceptSheetView component
 * Renders Step 9 concept artifact with SWOT grid, feasibility scores, and Billboard Hero
 */
export function ConceptSheetView({ artifact }: ConceptSheetViewProps) {
  const concepts = (artifact.concepts as Concept[]) || [];

  // Empty state
  if (concepts.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-card p-12">
        <p className="text-sm text-muted-foreground">
          Developed concepts will appear here after AI generates concept sheets
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {concepts.map((concept, conceptIdx) => (
        <div key={conceptIdx} className="space-y-6">
          {/* Concept Header */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{concept.name}</h3>
            <p className="text-sm text-muted-foreground">
              Developed from: <span className="font-medium">{concept.ideaSource}</span>
            </p>
          </div>

          {/* Elevator Pitch */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium leading-relaxed">
              {concept.elevatorPitch}
            </p>
          </div>

          {/* USP */}
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What makes this different
            </p>
            <p className="text-sm font-medium leading-relaxed">
              {concept.usp}
            </p>
          </div>

          {/* SWOT Grid */}
          <div>
            <h4 className="mb-3 font-semibold">SWOT Analysis</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Strengths */}
              <div className="rounded-lg border border-green-500/30 bg-green-50 p-4 dark:bg-green-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-500" />
                  <h5 className="font-semibold text-sm text-green-900 dark:text-green-100">
                    Strengths
                  </h5>
                </div>
                <ol className="space-y-1">
                  {concept.swot.strengths.map((item, idx) => (
                    <li key={idx} className="text-sm text-green-800 dark:text-green-200">
                      {idx + 1}. {item}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Weaknesses */}
              <div className="rounded-lg border border-red-500/30 bg-red-50 p-4 dark:bg-red-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-500" />
                  <h5 className="font-semibold text-sm text-red-900 dark:text-red-100">
                    Weaknesses
                  </h5>
                </div>
                <ol className="space-y-1">
                  {concept.swot.weaknesses.map((item, idx) => (
                    <li key={idx} className="text-sm text-red-800 dark:text-red-200">
                      {idx + 1}. {item}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Opportunities */}
              <div className="rounded-lg border border-blue-500/30 bg-blue-50 p-4 dark:bg-blue-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-blue-500" />
                  <h5 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                    Opportunities
                  </h5>
                </div>
                <ol className="space-y-1">
                  {concept.swot.opportunities.map((item, idx) => (
                    <li key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                      {idx + 1}. {item}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Threats */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-4 dark:bg-amber-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-amber-500" />
                  <h5 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                    Threats
                  </h5>
                </div>
                <ol className="space-y-1">
                  {concept.swot.threats.map((item, idx) => (
                    <li key={idx} className="text-sm text-amber-800 dark:text-amber-200">
                      {idx + 1}. {item}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Feasibility Scores */}
          <div>
            <h4 className="mb-3 font-semibold">Feasibility Assessment</h4>
            <div className="space-y-4 rounded-lg border bg-card p-4">
              {/* Technical */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Technical Feasibility</span>
                  <div className="flex items-center gap-2">
                    <ScoreDots score={concept.feasibility.technical.score} />
                    <span className={cn('font-semibold text-sm', getScoreColor(concept.feasibility.technical.score))}>
                      {concept.feasibility.technical.score}/5
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {concept.feasibility.technical.rationale}
                </p>
              </div>

              {/* Business */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Business Viability</span>
                  <div className="flex items-center gap-2">
                    <ScoreDots score={concept.feasibility.business.score} />
                    <span className={cn('font-semibold text-sm', getScoreColor(concept.feasibility.business.score))}>
                      {concept.feasibility.business.score}/5
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {concept.feasibility.business.rationale}
                </p>
              </div>

              {/* User Desirability */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">User Desirability</span>
                  <div className="flex items-center gap-2">
                    <ScoreDots score={concept.feasibility.userDesirability.score} />
                    <span className={cn('font-semibold text-sm', getScoreColor(concept.feasibility.userDesirability.score))}>
                      {concept.feasibility.userDesirability.score}/5
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {concept.feasibility.userDesirability.rationale}
                </p>
              </div>
            </div>
          </div>

          {/* Billboard Hero Section */}
          {concept.billboardHero && (
            <div>
              <h4 className="mb-3 font-semibold">Billboard Hero</h4>
              <div className="rounded-lg border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center">
                <h3 className="mb-3 text-2xl font-bold">
                  {concept.billboardHero.headline}
                </h3>
                <p className="mb-4 text-lg text-muted-foreground">
                  {concept.billboardHero.subheadline}
                </p>
                <div className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
                  {concept.billboardHero.cta}
                </div>
              </div>
            </div>
          )}

          {/* Concept separator (if multiple concepts) */}
          {conceptIdx < concepts.length - 1 && (
            <hr className="border-t-2 border-dashed" />
          )}
        </div>
      ))}
    </div>
  );
}

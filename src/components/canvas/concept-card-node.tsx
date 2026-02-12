'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';

export type ConceptCardNodeRendererData = ConceptCardData & {
  onFieldChange?: (id: string, field: string, value: string) => void;
  onSWOTChange?: (id: string, quadrant: string, index: number, value: string) => void;
  onFeasibilityChange?: (
    id: string,
    dimension: string,
    score?: number,
    rationale?: string
  ) => void;
};

export type ConceptCardNodeType = Node<ConceptCardNodeRendererData, 'conceptCard'>;

/**
 * FeasibilityDimension sub-component for cleaner rendering
 */
function FeasibilityDimension({
  label,
  score,
  rationale,
  onScoreChange,
  onRationaleChange,
}: {
  label: string;
  score: number;
  rationale: string;
  onScoreChange: (score: number) => void;
  onRationaleChange: (rationale: string) => void;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 4) return 'bg-green-500';
    if (s === 3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((dotScore) => (
            <button
              key={dotScore}
              onClick={(e) => {
                e.stopPropagation();
                onScoreChange(dotScore);
              }}
              className={cn(
                'nodrag nopan h-3 w-3 rounded-full transition-colors hover:opacity-80',
                dotScore <= score ? getScoreColor(score) : 'bg-muted'
              )}
              aria-label={`Set ${label} score to ${dotScore}`}
            />
          ))}
        </div>
      </div>
      <textarea
        className="nodrag nopan w-full resize-none rounded border bg-background px-2 py-1 text-xs text-muted-foreground outline-none focus:border-primary"
        rows={2}
        placeholder="Rationale..."
        defaultValue={rationale}
        onBlur={(e) => onRationaleChange(e.target.value)}
      />
    </div>
  );
}

export const ConceptCardNode = memo(
  ({ data, id, selected }: NodeProps<ConceptCardNodeType>) => {
    // Collapsible sections state - only header expanded by default
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
      new Set(['header'])
    );

    const toggleSection = useCallback((section: string) => {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        if (next.has(section)) {
          next.delete(section);
        } else {
          next.add(section);
        }
        return next;
      });
    }, []);

    const isExpanded = (section: string) => expandedSections.has(section);

    return (
      <div
        className={cn(
          'max-w-[400px] w-full rounded-lg border-2 bg-card shadow-lg',
          selected ? 'border-primary' : 'border-border'
        )}
      >
        {/* Hidden handles for future connections */}
        <Handle
          type="target"
          position={Position.Top}
          className="!opacity-0 !w-0 !h-0"
        />

        {/* Header (always visible) */}
        <div className="space-y-1 border-b p-4">
          <input
            type="text"
            className="nodrag nopan w-full bg-transparent text-lg font-semibold outline-none focus:border-b focus:border-primary"
            placeholder="Concept Name"
            defaultValue={data.conceptName}
            onBlur={(e) => data.onFieldChange?.(id, 'conceptName', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            From: {data.ideaSource || 'Unknown source'}
          </p>
        </div>

        {/* Sketch Thumbnail (collapsible, only if image exists) */}
        {data.sketchImageUrl && (
          <div className="border-b">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection('sketch');
              }}
              className="nodrag nopan flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-accent"
            >
              <span>Sketch</span>
              {isExpanded('sketch') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {isExpanded('sketch') && (
              <div className="p-3">
                <img
                  src={data.sketchImageUrl}
                  alt="Concept sketch"
                  className="h-auto w-full rounded object-contain"
                />
              </div>
            )}
          </div>
        )}

        {/* Elevator Pitch (collapsible) */}
        <div className="border-b">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSection('pitch');
            }}
            className="nodrag nopan flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-accent"
          >
            <span>Elevator Pitch</span>
            {isExpanded('pitch') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded('pitch') && (
            <div className="p-3">
              <textarea
                className="nodrag nopan w-full min-h-[80px] resize-none rounded border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="2-3 sentence elevator pitch..."
                defaultValue={data.elevatorPitch}
                onBlur={(e) => data.onFieldChange?.(id, 'elevatorPitch', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* SWOT Grid (collapsible) */}
        <div className="border-b">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSection('swot');
            }}
            className="nodrag nopan flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-accent"
          >
            <span>SWOT Analysis</span>
            {isExpanded('swot') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded('swot') && (
            <div className="grid grid-cols-2 gap-2 p-3">
              {/* Strengths */}
              <div className="space-y-1 rounded-lg border border-green-500/30 bg-green-50 p-3 dark:bg-green-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-500" />
                  <h5 className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Strengths
                  </h5>
                </div>
                {data.swot.strengths.map((item, idx) => (
                  <textarea
                    key={idx}
                    className="nodrag nopan w-full resize-none rounded border border-green-500/30 bg-white px-2 py-1 text-xs text-green-800 outline-none focus:border-green-500 dark:bg-green-950/40 dark:text-green-200"
                    rows={2}
                    placeholder={`Strength ${idx + 1}`}
                    defaultValue={item}
                    onBlur={(e) =>
                      data.onSWOTChange?.(id, 'strengths', idx, e.target.value)
                    }
                  />
                ))}
              </div>

              {/* Weaknesses */}
              <div className="space-y-1 rounded-lg border border-red-500/30 bg-red-50 p-3 dark:bg-red-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-500" />
                  <h5 className="text-sm font-semibold text-red-900 dark:text-red-100">
                    Weaknesses
                  </h5>
                </div>
                {data.swot.weaknesses.map((item, idx) => (
                  <textarea
                    key={idx}
                    className="nodrag nopan w-full resize-none rounded border border-red-500/30 bg-white px-2 py-1 text-xs text-red-800 outline-none focus:border-red-500 dark:bg-red-950/40 dark:text-red-200"
                    rows={2}
                    placeholder={`Weakness ${idx + 1}`}
                    defaultValue={item}
                    onBlur={(e) =>
                      data.onSWOTChange?.(id, 'weaknesses', idx, e.target.value)
                    }
                  />
                ))}
              </div>

              {/* Opportunities */}
              <div className="space-y-1 rounded-lg border border-blue-500/30 bg-blue-50 p-3 dark:bg-blue-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-blue-500" />
                  <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Opportunities
                  </h5>
                </div>
                {data.swot.opportunities.map((item, idx) => (
                  <textarea
                    key={idx}
                    className="nodrag nopan w-full resize-none rounded border border-blue-500/30 bg-white px-2 py-1 text-xs text-blue-800 outline-none focus:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                    rows={2}
                    placeholder={`Opportunity ${idx + 1}`}
                    defaultValue={item}
                    onBlur={(e) =>
                      data.onSWOTChange?.(id, 'opportunities', idx, e.target.value)
                    }
                  />
                ))}
              </div>

              {/* Threats */}
              <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-50 p-3 dark:bg-amber-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-amber-500" />
                  <h5 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Threats
                  </h5>
                </div>
                {data.swot.threats.map((item, idx) => (
                  <textarea
                    key={idx}
                    className="nodrag nopan w-full resize-none rounded border border-amber-500/30 bg-white px-2 py-1 text-xs text-amber-800 outline-none focus:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200"
                    rows={2}
                    placeholder={`Threat ${idx + 1}`}
                    defaultValue={item}
                    onBlur={(e) =>
                      data.onSWOTChange?.(id, 'threats', idx, e.target.value)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feasibility (collapsible) */}
        <div className="border-b">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSection('feasibility');
            }}
            className="nodrag nopan flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-accent"
          >
            <span>Feasibility Assessment</span>
            {isExpanded('feasibility') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded('feasibility') && (
            <div className="space-y-3 p-3">
              <FeasibilityDimension
                label="Technical Feasibility"
                score={data.feasibility.technical.score}
                rationale={data.feasibility.technical.rationale}
                onScoreChange={(score) =>
                  data.onFeasibilityChange?.(id, 'technical', score, undefined)
                }
                onRationaleChange={(rationale) =>
                  data.onFeasibilityChange?.(id, 'technical', undefined, rationale)
                }
              />
              <FeasibilityDimension
                label="Business Viability"
                score={data.feasibility.business.score}
                rationale={data.feasibility.business.rationale}
                onScoreChange={(score) =>
                  data.onFeasibilityChange?.(id, 'business', score, undefined)
                }
                onRationaleChange={(rationale) =>
                  data.onFeasibilityChange?.(id, 'business', undefined, rationale)
                }
              />
              <FeasibilityDimension
                label="User Desirability"
                score={data.feasibility.userDesirability.score}
                rationale={data.feasibility.userDesirability.rationale}
                onScoreChange={(score) =>
                  data.onFeasibilityChange?.(id, 'userDesirability', score, undefined)
                }
                onRationaleChange={(rationale) =>
                  data.onFeasibilityChange?.(id, 'userDesirability', undefined, rationale)
                }
              />
            </div>
          )}
        </div>

        {/* Billboard Hero (collapsible, only if exists) */}
        {data.billboardHero && (
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection('billboard');
              }}
              className="nodrag nopan flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-accent"
            >
              <span>Billboard Hero</span>
              {isExpanded('billboard') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {isExpanded('billboard') && (
              <div className="space-y-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                <input
                  type="text"
                  className="nodrag nopan w-full rounded border bg-background px-3 py-2 text-center text-lg font-bold outline-none focus:border-primary"
                  placeholder="Headline (6-10 words)"
                  defaultValue={data.billboardHero.headline}
                  onBlur={(e) => data.onFieldChange?.(id, 'billboardHero.headline', e.target.value)}
                />
                <textarea
                  className="nodrag nopan w-full resize-none rounded border bg-background px-3 py-2 text-center text-sm outline-none focus:border-primary"
                  rows={2}
                  placeholder="Subheadline (1-2 sentences)"
                  defaultValue={data.billboardHero.subheadline}
                  onBlur={(e) => data.onFieldChange?.(id, 'billboardHero.subheadline', e.target.value)}
                />
                <input
                  type="text"
                  className="nodrag nopan w-full rounded bg-primary px-4 py-2 text-center font-semibold text-primary-foreground outline-none focus:ring-2 focus:ring-primary-foreground"
                  placeholder="Call to Action"
                  defaultValue={data.billboardHero.cta}
                  onBlur={(e) => data.onFieldChange?.(id, 'billboardHero.cta', e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <Handle
          type="source"
          position={Position.Bottom}
          className="!opacity-0 !w-0 !h-0"
        />
      </div>
    );
  }
);

ConceptCardNode.displayName = 'ConceptCardNode';

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface IdeationClusterViewProps {
  artifact: Record<string, unknown>;
}

interface Cluster {
  theme: string;
  ideas: Idea[];
}

interface Idea {
  title: string;
  description: string;
  isWildCard?: boolean;
}

interface CrazyEightsIdea {
  title: string;
  description: string;
}

interface MindMapTheme {
  theme: string;
  color: string;
}

/**
 * Get color class for cluster by index
 */
function getClusterColor(index: number): string {
  const colors = [
    'border-l-blue-500',
    'border-l-purple-500',
    'border-l-green-500',
    'border-l-amber-500',
    'border-l-pink-500',
    'border-l-cyan-500',
  ];
  return colors[index % colors.length];
}

/**
 * IdeationClusterView component
 * Renders Step 8 ideation artifact with themed clusters, wild cards, mind map themes, and Crazy 8s
 */
export function IdeationClusterView({ artifact }: IdeationClusterViewProps) {
  const reframedHmw = artifact.reframedHmw as string | undefined;
  const clusters = (artifact.clusters as Cluster[]) || [];
  const userIdeas = (artifact.userIdeas as Idea[]) || [];
  const mindMapThemes = (artifact.mindMapThemes as MindMapTheme[]) || [];
  const crazyEightsIdeas = (artifact.crazyEightsIdeas as CrazyEightsIdea[]) || [];
  const selectedSketchSlotIds = (artifact.selectedSketchSlotIds as string[]) || [];

  // Empty state
  if (clusters.length === 0 && mindMapThemes.length === 0 && crazyEightsIdeas.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-card p-12">
        <p className="text-sm text-muted-foreground">
          Generated ideas will appear here after the ideation rounds complete
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HMW Prompt Banner */}
      {reframedHmw && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Challenge
          </p>
          <p className="font-medium text-sm leading-relaxed">
            {reframedHmw}
          </p>
        </div>
      )}

      {/* Themed Clusters Section */}
      {clusters.length > 0 && (
        <div className="space-y-6">
          <h3 className="font-semibold text-lg">Clustered Ideas</h3>
          {clusters.map((cluster, clusterIdx) => (
            <div key={clusterIdx} className="space-y-3">
              {/* Cluster theme header with colored border */}
              <div className={cn('border-l-4 pl-4', getClusterColor(clusterIdx))}>
                <h4 className="font-semibold text-base">{cluster.theme}</h4>
              </div>

              {/* Ideas in this cluster */}
              <div className="grid gap-3 sm:grid-cols-2">
                {cluster.ideas.map((idea, ideaIdx) => (
                  <div
                    key={ideaIdx}
                    className={cn(
                      'rounded-lg p-4',
                      idea.isWildCard
                        ? 'border-2 border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border bg-card'
                    )}
                  >
                    {/* Title with wild card badge */}
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h5 className="font-semibold text-sm">{idea.title}</h5>
                      {idea.isWildCard && (
                        <span className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          <span>⚡</span>
                          Wild Card
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {idea.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mind Map Themes Section */}
      {mindMapThemes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Mind Map Themes</h3>
          <div className="flex flex-wrap gap-3">
            {mindMapThemes.map((theme, idx) => (
              <div
                key={idx}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: `${theme.color}20`,
                  color: theme.color,
                  borderLeft: `4px solid ${theme.color}`,
                }}
              >
                {theme.theme}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crazy 8s Section */}
      {crazyEightsIdeas.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span>Crazy 8s</span>
            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400">
              Rapid-Fire
            </span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {crazyEightsIdeas.map((idea, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-dashed bg-card p-3"
              >
                <h5 className="mb-1 font-semibold text-sm">{idea.title}</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {idea.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Sketches Footer */}
      {selectedSketchSlotIds.length > 0 && (
        <div className="rounded-lg border border-green-500/50 bg-green-50/50 p-4 dark:bg-green-950/20">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="h-4 w-4 text-green-700 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <h4 className="font-semibold text-sm text-green-900 dark:text-green-100">
              Selected for Concept Development
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSketchSlotIds.map((slotId, idx) => {
              const slotNumber = slotId.replace('slot-', '');
              return (
                <span
                  key={idx}
                  className="rounded-md bg-green-500/20 px-3 py-1 text-sm font-medium text-green-800 dark:text-green-200"
                >
                  Sketch {slotNumber}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

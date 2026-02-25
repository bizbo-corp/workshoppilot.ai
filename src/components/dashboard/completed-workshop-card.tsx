'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Clock, ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getWorkshopColor } from '@/lib/workshop/workshop-appearance';
import { WorkshopAppearancePicker } from '@/components/dashboard/workshop-appearance-picker';

interface ConfidenceAssessment {
  score: number;
  researchQuality: 'thin' | 'moderate' | 'strong';
  rationale: string;
}

function getConfidenceColor(score: number): string {
  if (score >= 7) return 'text-olive-700 dark:text-olive-400';
  if (score >= 4) return 'text-amber-700 dark:text-amber-400';
  return 'text-destructive dark:text-destructive';
}

function getResearchQualityColor(quality: 'thin' | 'moderate' | 'strong'): string {
  switch (quality) {
    case 'strong':
      return 'bg-olive-500/20 text-olive-700 dark:text-olive-400 border-olive-500/30';
    case 'moderate':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'thin':
      return 'bg-destructive/20 text-destructive border-destructive/30';
  }
}

interface CompletedWorkshopCardProps {
  workshopId: string;
  sessionId: string;
  title: string;
  updatedAt: Date;
  color: string | null;
  emoji: string | null;
  synthesisArtifact: Record<string, unknown> | null;
  prototypeUrl: string | null;
  totalCostCents?: number | null;
  onRename: (workshopId: string, newName: string) => Promise<void>;
  onUpdateAppearance: (workshopId: string, updates: { color?: string; emoji?: string | null }) => Promise<void>;
}

export function CompletedWorkshopCard({
  workshopId,
  sessionId,
  title,
  updatedAt,
  color,
  emoji,
  synthesisArtifact,
  prototypeUrl,
  totalCostCents,
  onRename,
  onUpdateAppearance,
}: CompletedWorkshopCardProps) {
  const workshopColor = getWorkshopColor(color);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const narrative = synthesisArtifact
    ? ((synthesisArtifact.narrativeIntro || synthesisArtifact.narrative) as string | undefined)
    : undefined;
  const confidenceAssessment = synthesisArtifact?.confidenceAssessment as ConfidenceAssessment | undefined;

  const handleRename = async () => {
    if (editedTitle.trim() === '' || editedTitle === title) {
      setEditedTitle(title);
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onRename(workshopId, editedTitle.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to rename workshop:', error);
      setEditedTitle(title);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditedTitle(title);
      setIsEditing(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden border border-border transition-all hover:shadow-md dark:hover:border-neutral-olive-700 pt-0 pb-0 gap-0">
      {/* Colored header band */}
      <div
        className="px-6 pt-5 pb-4"
        style={{ backgroundColor: workshopColor.bgHex }}
      >
        <div className="flex items-start gap-2.5">
          <WorkshopAppearancePicker
            workshopId={workshopId}
            color={color}
            emoji={emoji}
            onUpdate={onUpdateAppearance}
          />

          <div className="flex-1 min-w-0 pt-0.5">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                autoFocus
                className="text-lg font-semibold"
                maxLength={100}
              />
            ) : (
              <h3
                className="cursor-pointer text-lg font-semibold text-foreground transition-colors hover:text-olive-600"
                onClick={() => setIsEditing(true)}
              >
                {title}
              </h3>
            )}
          </div>
        </div>
      </div>

      <Link href={`/workshop/${sessionId}/results`}>
        <CardContent className="px-6 pt-4 pb-4">
          {/* Completed badge */}
          <div className="mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-olive-600 dark:text-olive-400" />
            <span className="text-sm font-medium text-olive-700 dark:text-olive-400">Completed</span>
          </div>

          {/* Narrative paragraph (truncated) */}
          {narrative ? (
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {narrative}
            </p>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              Workshop completed
            </p>
          )}

          {/* Confidence + research quality */}
          {confidenceAssessment && (
            <div className="mb-3 flex items-center gap-3">
              <span className={cn('text-lg font-bold', getConfidenceColor(confidenceAssessment.score))}>
                {confidenceAssessment.score}/10
              </span>
              <span className={cn(
                'rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
                getResearchQualityColor(confidenceAssessment.researchQuality)
              )}>
                {confidenceAssessment.researchQuality}
              </span>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </span>
          </div>

          {/* AI cost (admin only) */}
          {totalCostCents != null && totalCostCents > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              AI cost: ${(totalCostCents / 100).toFixed(4)}
            </div>
          )}
        </CardContent>
      </Link>

      {/* Prototype link — standalone, outside Link to avoid nested <a> */}
      {prototypeUrl && (
        <div className="px-6 pb-4">
          <a
            href={prototypeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            View Prototype
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      <CardFooter className="border-t bg-muted/50 p-4 dark:bg-muted/20">
        <Link href={`/workshop/${sessionId}/results`} className="w-full">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between group-hover:bg-accent"
          >
            View Results
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

/**
 * Workshop Card — redesigned with left color border, serif titles,
 * progress dots, status badges, and hero variant.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getWorkshopColor } from '@/lib/workshop/workshop-appearance';
import { WorkshopAppearancePicker } from '@/components/dashboard/workshop-appearance-picker';
import { StepProgressDots } from '@/components/dashboard/step-progress-dots';
import { WorkshopStatusBadge } from '@/components/dashboard/workshop-status-badge';
import { toast } from 'sonner';

interface StepStatus {
  stepId: string;
  status: string;
}

interface WorkshopCardProps {
  workshopId: string;
  sessionId: string;
  title: string;
  currentStep: number;
  currentStepName: string;
  updatedAt: Date;
  color: string | null;
  emoji: string | null;
  onRename: (workshopId: string, newName: string) => Promise<void>;
  totalCostCents?: number | null;
  onUpdateAppearance: (workshopId: string, updates: { color?: string; emoji?: string | null }) => Promise<void>;
  workshopType?: 'solo' | 'multiplayer';
  workshopStatus: 'completed' | 'active' | 'stalled';
  steps: StepStatus[];
  editMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  isHero?: boolean;
}

export function WorkshopCard({
  workshopId,
  sessionId,
  title,
  currentStep,
  currentStepName,
  updatedAt,
  color,
  emoji,
  totalCostCents,
  onRename,
  onUpdateAppearance,
  workshopType,
  workshopStatus,
  steps,
  editMode = false,
  selected = false,
  onSelect,
  isHero = false,
}: WorkshopCardProps) {
  const workshopColor = getWorkshopColor(color);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      toast.success('Workshop renamed', { duration: 4000 });
    } catch (error) {
      console.error('Failed to rename workshop:', error);
      setEditedTitle(title);
      setIsEditing(false);
      toast.error('Failed to rename workshop', { duration: 4000 });
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
    <Card
      className={cn(
        "group relative overflow-hidden border border-border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg dark:hover:border-neutral-olive-700 pt-0 pb-0 gap-0",
        selected && "ring-2 ring-primary border-primary",
        isHero && "lg:col-span-2"
      )}
      style={{ borderLeft: `4px solid ${workshopColor.hex}` }}
    >
      {editMode && onSelect && (
        <div
          className="absolute right-3 top-3 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect();
          }}
        >
          <Checkbox
            checked={selected}
            aria-label={`Select ${title}`}
            className="h-5 w-5"
          />
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <div className={cn("flex items-start gap-2.5", isHero && "lg:flex-row lg:items-center lg:gap-4")}>
          {/* Emoji circle */}
          <WorkshopAppearancePicker
            workshopId={workshopId}
            color={color}
            emoji={emoji}
            onUpdate={onUpdateAppearance}
          />

          {/* Workshop name with inline edit */}
          <div className="flex-1 min-w-0 pt-0.5">
            <Link href={`/workshop/${sessionId}/step/${currentStep}`}>
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  autoFocus
                  className={cn("font-serif", isHero ? "text-2xl" : "text-xl")}
                  maxLength={100}
                  onClick={(e) => e.preventDefault()}
                />
              ) : (
                <h3
                  className={cn(
                    "cursor-pointer font-serif text-foreground transition-colors hover:text-olive-600",
                    isHero ? "text-2xl" : "text-xl"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  {title}
                </h3>
              )}
            </Link>

            {/* Multiplayer badge */}
            {workshopType === 'multiplayer' && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 dark:bg-white/15">
                <Users className="h-3 w-3 text-foreground/60" />
                <span className="text-xs text-foreground/60">Multiplayer</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Link href={`/workshop/${sessionId}/step/${currentStep}`}>
        <CardContent className="px-6 pt-4 pb-6">
          {/* Current step indicator */}
          <div className="mb-3">
            <p className="text-sm text-muted-foreground">
              Step {currentStep}: {currentStepName}
            </p>
          </div>

          {/* Step progress dots */}
          <div className="mb-3">
            <StepProgressDots steps={steps} />
          </div>

          {/* Status badge + timestamp row */}
          <div className="flex items-center gap-3">
            <WorkshopStatusBadge status={workshopStatus} />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* AI cost (admin only) */}
          {totalCostCents != null && totalCostCents > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              AI cost: ${(totalCostCents / 100).toFixed(4)}
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}

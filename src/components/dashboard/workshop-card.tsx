/**
 * Workshop Card
 * Displays a workshop in the dashboard with name, current step, last active timestamp
 * Features:
 * - Card layout with Linear-style subtle border and hover effect
 * - Workshop name (bold, clickable) with inline rename on click
 * - Current step indicator
 * - Last active timestamp (relative time)
 * - Continue button
 * - Dark mode support
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getWorkshopColor } from '@/lib/workshop/workshop-appearance';
import { WorkshopAppearancePicker } from '@/components/dashboard/workshop-appearance-picker';

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
  selected?: boolean;
  onSelect?: () => void;
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
  selected = false,
  onSelect,
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
    <Card
      className={cn(
        "group relative overflow-hidden border border-border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg dark:hover:border-neutral-olive-700 pt-0 pb-0 gap-0",
        selected && "ring-2 ring-primary border-primary"
      )}
    >
      {onSelect && (
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

      {/* Colored header band */}
      <div
        className="px-6 pt-5 pb-4"
        style={{ backgroundColor: workshopColor.bgHex }}
      >
        <div className="flex items-start gap-2.5">
          {/* Emoji circle — opens appearance picker (outside Link to avoid navigation) */}
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
                  className="text-lg font-semibold"
                  maxLength={100}
                  onClick={(e) => e.preventDefault()}
                />
              ) : (
                <h3
                  className="cursor-pointer text-lg font-semibold text-foreground transition-colors hover:text-olive-600"
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

          {/* Last active timestamp */}
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

      <CardFooter className="border-t bg-muted/50 p-4 dark:bg-muted/20">
        <Link href={`/workshop/${sessionId}/step/${currentStep}`} className="w-full">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between group-hover:bg-accent btn-lift"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

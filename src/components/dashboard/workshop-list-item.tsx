'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getWorkshopColor } from '@/lib/workshop/workshop-appearance';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface StepStatus {
  stepId: string;
  status: string;
}

interface WorkshopListItemProps {
  workshopId: string;
  sessionId: string;
  title: string;
  currentStep: number;
  currentStepName: string;
  updatedAt: Date;
  color: string | null;
  emoji: string | null;
  steps: StepStatus[];
  editMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onRename: (workshopId: string, newName: string) => Promise<void>;
  onUpdateAppearance: (workshopId: string, updates: { color?: string; emoji?: string | null }) => Promise<void>;
}

export function WorkshopListItem({
  workshopId,
  sessionId,
  title,
  currentStep,
  currentStepName,
  updatedAt,
  color,
  emoji,
  steps,
  editMode,
  selected,
  onSelect,
  onRename,
}: WorkshopListItemProps) {
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
    } catch {
      setEditedTitle(title);
      setIsEditing(false);
      toast.error('Failed to rename workshop', { duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRename();
    else if (e.key === 'Escape') { setEditedTitle(title); setIsEditing(false); }
  };

  return (
    <div
      className={cn(
        'group relative flex items-center overflow-hidden rounded-lg border transition-all hover:shadow-sm',
        selected && 'ring-2 ring-primary border-primary'
      )}
    >
      {/* Color strip */}
      <div
        className="w-1 self-stretch shrink-0 rounded-l-lg"
        style={{ backgroundColor: workshopColor.hex }}
      />

      {/* Checkbox (edit mode) */}
      {editMode && (
        <div className="pl-3 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(); }}>
          <Checkbox checked={selected} aria-label={`Select ${title}`} className="h-4 w-4" />
        </div>
      )}

      {/* Emoji circle */}
      <div
        className="ml-3 flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
        style={{ backgroundColor: workshopColor.bgHex }}
      >
        {emoji || '💡'}
      </div>

      {/* Title + step label */}
      <div className="flex-1 min-w-0 px-3 py-3">
        <div className="flex items-baseline gap-2">
          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoFocus
              className="h-7 text-sm font-serif"
              maxLength={100}
            />
          ) : (
            <h3
              className="truncate font-serif text-sm font-normal text-foreground cursor-pointer hover:text-olive-600 transition-colors"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
            >
              {title}
            </h3>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            Step {currentStep}: {currentStepName}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="hidden sm:flex shrink-0 items-center gap-2 px-2 w-28">
        <Progress value={currentStep * 10} className="h-1.5" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{currentStep * 10}%</span>
      </div>

      {/* Timestamp */}
      <div className="hidden lg:flex shrink-0 px-2 text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
      </div>

      {/* Continue button */}
      <Link href={`/workshop/${sessionId}/step/${currentStep}`} className="shrink-0 pr-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}

/**
 * Workshop Card — redesigned with left color border, serif titles,
 * progress dots, status badges, and hero variant.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Check, Clock, Pencil, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getWorkshopColor } from '@/lib/workshop/workshop-appearance';
import { WorkshopAppearancePicker } from '@/components/dashboard/workshop-appearance-picker';
import { Progress } from '@/components/ui/progress';
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
  /** Count of participants who've submitted research (set only while on User Research). */
  researchSubmitted?: number;
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
  researchSubmitted,
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

  const href = `/workshop/${sessionId}/step/${currentStep}`;

  const enterEdit = () => {
    setEditedTitle(title);
    setIsEditing(true);
  };

  // Save the title if it changed. Stays in edit mode so the emoji/color picker
  // can still be used (clicking the picker blurs the title input).
  const commitTitle = async () => {
    const next = editedTitle.trim();
    if (next === '' || next === title) {
      setEditedTitle(title);
      return;
    }

    setIsSubmitting(true);
    try {
      await onRename(workshopId, next);
      toast.success('Workshop renamed', { duration: 4000 });
    } catch (error) {
      console.error('Failed to rename workshop:', error);
      setEditedTitle(title);
      toast.error('Failed to rename workshop', { duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exitEdit = async () => {
    await commitTitle();
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      exitEdit();
    } else if (e.key === 'Escape') {
      setEditedTitle(title);
      setIsEditing(false);
    }
  };

  // Derive color-keyed styles for white-glove card treatment
  const hex = workshopColor.hex;
  const cardStyle: React.CSSProperties = {
    borderColor: `color-mix(in srgb, ${hex} 40%, transparent)`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 24px -4px color-mix(in srgb, ${hex} 12%, transparent)`,
    // ring via box-shadow layering
    outline: `1px solid color-mix(in srgb, ${hex} 20%, transparent)`,
    outlineOffset: '0px',
    backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${hex} 8%, var(--card)) 0%, var(--card) 40%)`,
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg pt-0 pb-0 gap-0",
        selected && "ring-2 ring-primary !border-primary",
        isHero && "lg:col-span-2"
      )}
      style={cardStyle}
    >
      {/* Stretched navigation link — clicking anywhere on the card (outside the
          controls below) launches the workshop. Hidden while editing / bulk-selecting. */}
      {!isEditing && !editMode && (
        <Link
          href={href}
          aria-label={`Open ${title}`}
          className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      )}

      {editMode && onSelect && (
        <div
          className="absolute right-3 top-3 z-20"
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

      {/* Hover actions (Open / Edit) — and the Done button while editing */}
      {!editMode && (
        <div
          className={cn(
            "absolute right-3 top-3 z-20 flex items-center gap-1.5 transition-opacity",
            isEditing
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          )}
        >
          {isEditing ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); exitEdit(); }}
              disabled={isSubmitting}
              aria-label="Done editing"
              title="Done"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
          ) : (
            <>
              <Link
                href={href}
                aria-label={`Open ${title}`}
                title="Open workshop"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); enterEdit(); }}
                aria-label="Edit workshop"
                title="Edit workshop"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Header — grows to push progress to bottom */}
      <div className="flex-1 px-6 pt-5 pb-4">
        <div className={cn("flex items-start gap-2.5", isHero && "lg:flex-row lg:items-center lg:gap-4")}>
          {/* Emoji circle — interactive only while editing */}
          <div className={cn(isEditing && "relative z-10")}>
            <WorkshopAppearancePicker
              workshopId={workshopId}
              color={color}
              emoji={emoji}
              onUpdate={onUpdateAppearance}
              editable={isEditing}
            />
          </div>

          {/* Workshop name — plain text (launches workshop) until editing */}
          <div className="flex-1 min-w-0 pt-0.5">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                autoFocus
                className={cn("relative z-10 font-serif", isHero ? "text-2xl" : "text-xl")}
                maxLength={100}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3
                className={cn(
                  "font-serif text-foreground",
                  isHero ? "text-2xl" : "text-xl"
                )}
              >
                {title}
              </h3>
            )}

            {/* Multiplayer badge */}
            {workshopType === 'multiplayer' && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 dark:bg-white/15">
                <Users className="h-3 w-3 text-foreground/60" />
                <span className="text-xs text-foreground/60">Multiplayer</span>
              </div>
            )}

            {/* Awaiting-research chip — shown only while on the User Research step */}
            {researchSubmitted !== undefined && (
              <div className="mt-1 ml-1 inline-flex items-center gap-1 rounded-full bg-olive-100 px-2 py-0.5 dark:bg-olive-900/40">
                <span className="text-xs font-medium text-olive-800 dark:text-olive-300">
                  {researchSubmitted === 0
                    ? 'Awaiting research'
                    : `Research · ${researchSubmitted} submitted`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <CardContent className="px-6 pt-4 pb-6">
        {/* Step progress */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">
              Step {currentStep}: {currentStepName}
            </p>
            <span className="text-xs text-muted-foreground">{currentStep * 10}%</span>
          </div>
          <Progress
            value={currentStep * 10}
            className="h-1.5"
            style={{ '--progress-color': hex } as React.CSSProperties}
          />
        </div>

        {/* Timestamp + AI cost row */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </span>
          </div>
          {totalCostCents != null && totalCostCents > 0 && (
            <span>AI cost: ${(totalCostCents / 100).toFixed(4)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

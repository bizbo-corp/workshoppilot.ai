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

interface WorkshopCardProps {
  workshopId: string;
  sessionId: string;
  title: string;
  currentStep: number;
  currentStepName: string;
  updatedAt: Date;
  onRename: (workshopId: string, newName: string) => Promise<void>;
}

export function WorkshopCard({
  workshopId,
  sessionId,
  title,
  currentStep,
  currentStepName,
  updatedAt,
  onRename,
}: WorkshopCardProps) {
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
    <Card className="group relative overflow-hidden border border-border transition-all hover:shadow-md dark:hover:border-gray-700">
      <Link href={`/workshop/${sessionId}/step/${currentStep}`}>
        <CardContent className="p-6">
          {/* Workshop name with inline edit */}
          <div className="mb-4">
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
                className="cursor-pointer text-lg font-semibold text-foreground transition-colors hover:text-blue-600"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {title}
              </h3>
            )}
          </div>

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
        </CardContent>
      </Link>

      <CardFooter className="border-t bg-muted/50 p-4 dark:bg-muted/20">
        <Link href={`/workshop/${sessionId}/step/${currentStep}`} className="w-full">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between group-hover:bg-accent"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

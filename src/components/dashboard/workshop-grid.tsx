'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { WorkshopCard } from '@/components/dashboard/workshop-card';
import { deleteWorkshops } from '@/actions/workshop-actions';

interface WorkshopData {
  id: string;
  sessionId: string;
  title: string;
  currentStep: number;
  currentStepName: string;
  updatedAt: Date;
  color: string | null;
  emoji: string | null;
  totalCostCents: number | null;
}

interface WorkshopGridProps {
  workshops: WorkshopData[];
  onRename: (workshopId: string, newName: string) => Promise<void>;
  onUpdateAppearance: (workshopId: string, updates: { color?: string; emoji?: string | null }) => Promise<void>;
}

export function WorkshopGrid({ workshops, onRename, onUpdateAppearance }: WorkshopGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasSelection = selectedIds.size > 0;
  const allSelected = selectedIds.size === workshops.length && workshops.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workshops.map((w) => w.id)));
    }
  };

  const handleDelete = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      try {
        await deleteWorkshops(ids);
        setSelectedIds(new Set());
        setDialogOpen(false);
      } catch (error) {
        console.error('Failed to delete workshops:', error);
      }
    });
  };

  return (
    <div className="mb-6">
      {/* Header with select all and delete controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">All Workshops</h2>
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all workshops"
            />
            <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
              Select all
            </label>
          </div>
        </div>

        {hasSelection && (
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedIds.size} {selectedIds.size === 1 ? 'workshop' : 'workshops'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size === 1 ? 'workshop' : 'workshops'}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedIds.size === 1
                    ? 'This workshop will be removed from your dashboard. This action cannot be undone from the UI.'
                    : `These ${selectedIds.size} workshops will be removed from your dashboard. This action cannot be undone from the UI.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Workshop card grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {workshops.map((workshop) => (
          <WorkshopCard
            key={workshop.id}
            workshopId={workshop.id}
            sessionId={workshop.sessionId}
            title={workshop.title}
            currentStep={workshop.currentStep}
            currentStepName={workshop.currentStepName}
            updatedAt={workshop.updatedAt}
            color={workshop.color}
            emoji={workshop.emoji}
            totalCostCents={workshop.totalCostCents}
            onRename={onRename}
            onUpdateAppearance={onUpdateAppearance}
            selected={selectedIds.has(workshop.id)}
            onSelect={() => toggleSelect(workshop.id)}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Trash2, List, LayoutGrid, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
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
import { WorkshopListItem } from '@/components/dashboard/workshop-list-item';
import { deleteWorkshops } from '@/actions/workshop-actions';
import { NewWorkshopButton } from '@/components/dialogs/new-workshop-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';

interface StepStatus {
  stepId: string;
  status: string;
}

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
  workshopType?: 'solo' | 'multiplayer';
  steps: StepStatus[];
}

interface WorkshopGridProps {
  workshops: WorkshopData[];
  onRename: (workshopId: string, newName: string) => Promise<void>;
  onUpdateAppearance: (workshopId: string, updates: { color?: string; emoji?: string | null }) => Promise<void>;
}

export function WorkshopGrid({ workshops, onRename, onUpdateAppearance }: WorkshopGridProps) {
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('dashboard-view-mode', 'list');
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasSelection = selectedIds.size > 0;
  const allSelected = selectedIds.size === workshops.length && workshops.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(workshops.map((w) => w.id)));
  };

  const handleExitEditMode = () => {
    setEditMode(false);
    setSelectedIds(new Set());
  };

  const handleDelete = () => {
    const ids = Array.from(selectedIds);
    const count = ids.length;
    startTransition(async () => {
      try {
        await deleteWorkshops(ids);
        setSelectedIds(new Set());
        setDialogOpen(false);
        toast.success(
          count === 1 ? 'Workshop deleted' : `${count} workshops deleted`,
          { duration: 4000 }
        );
      } catch (error) {
        console.error('Failed to delete workshops:', error);
        toast.error('Failed to delete workshop', { duration: 4000 });
      }
    });
  };

  return (
    <div className="mb-6">
      {/* Header bar */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-serif text-foreground">All Workshops</h2>

        <div className="flex items-center gap-2">
          {/* Edit / Done button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={editMode ? handleExitEditMode : () => setEditMode(true)}
            className="text-muted-foreground"
          >
            {editMode ? 'Done' : <><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</>}
          </Button>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit mode controls */}
      {editMode && (
        <div className="mb-3 flex items-center gap-3">
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
      )}

      {/* Content: list or grid */}
      {viewMode === 'list' ? (
        <div className="space-y-2">
          {/* New workshop row */}
          <NewWorkshopButton variant="ghost" className="w-full justify-start gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-muted-foreground hover:text-foreground hover:border-foreground/20">
            <Plus className="h-4 w-4" />
            Start New Workshop
          </NewWorkshopButton>
          {workshops.map((workshop) => (
            <WorkshopListItem
              key={workshop.id}
              workshopId={workshop.id}
              sessionId={workshop.sessionId}
              title={workshop.title}
              currentStep={workshop.currentStep}
              currentStepName={workshop.currentStepName}
              updatedAt={workshop.updatedAt}
              color={workshop.color}
              emoji={workshop.emoji}
              steps={workshop.steps}
              editMode={editMode}
              selected={selectedIds.has(workshop.id)}
              onSelect={() => toggleSelect(workshop.id)}
              onRename={onRename}
              onUpdateAppearance={onUpdateAppearance}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* New workshop card */}
          <NewWorkshopButton
            variant="ghost"
            className="new-workshop-card flex h-full flex-col items-center justify-center gap-4 rounded-xl bg-card text-muted-foreground hover:bg-white hover:text-foreground transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:hover:bg-neutral-olive-800"
          >
            <Plus className="h-24 w-24" strokeWidth={0.8} />
            <span className="text-lg font-serif">Start New Workshop</span>
          </NewWorkshopButton>
          {workshops.map((workshop, index) => (
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
              workshopType={workshop.workshopType}
              steps={workshop.steps}
              onRename={onRename}
              onUpdateAppearance={onUpdateAppearance}
              editMode={editMode}
              selected={selectedIds.has(workshop.id)}
              onSelect={() => toggleSelect(workshop.id)}
              isHero={index === 0 && workshops.length >= 3}
            />
          ))}
        </div>
      )}
    </div>
  );
}

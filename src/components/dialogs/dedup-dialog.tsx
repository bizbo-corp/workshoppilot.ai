'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DedupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Array<{ text: string; count: number; ids: string[] }>;
  onConfirm: () => void;
}

export function DedupDialog({
  open,
  onOpenChange,
  groups,
  onConfirm,
}: DedupDialogProps) {
  const totalDuplicates = groups.reduce((sum, g) => sum + g.count - 1, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Remove Duplicates</DialogTitle>
          <DialogDescription>
            Found {totalDuplicates} duplicate{totalDuplicates !== 1 ? 's' : ''} across {groups.length} group{groups.length !== 1 ? 's' : ''}. The first occurrence of each will be kept.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-48 overflow-y-auto space-y-1.5 py-2">
          {groups.map((group) => (
            <div
              key={group.text}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="truncate mr-2">{group.text}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {group.count}x (removing {group.count - 1})
              </span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Deduplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

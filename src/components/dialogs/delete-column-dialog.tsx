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

interface DeleteColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  columnLabel: string;
  affectedCardCount: number;
  migrationTarget: string | null;
}

export function DeleteColumnDialog({
  open,
  onOpenChange,
  onConfirm,
  columnLabel,
  affectedCardCount,
  migrationTarget,
}: DeleteColumnDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete "{columnLabel}" column?</DialogTitle>
          <DialogDescription>
            {affectedCardCount === 0 ? (
              'This column is empty and can be safely removed.'
            ) : migrationTarget ? (
              <>
                This column contains {affectedCardCount} card{affectedCardCount !== 1 ? 's' : ''}.
                Cards will be moved to <strong>{migrationTarget}</strong>.
              </>
            ) : (
              <>
                This column contains {affectedCardCount} card{affectedCardCount !== 1 ? 's' : ''}.
                Cards will lose their column assignment.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
          >
            Delete Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

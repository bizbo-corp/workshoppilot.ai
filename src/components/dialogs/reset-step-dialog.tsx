/**
 * Reset Step Dialog
 * Confirmation dialog when user wants to clear all step data and start fresh
 * More destructive than revision - clears conversation, artifact, and summary
 */

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

interface ResetStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isResetting: boolean;
  stepName: string;
}

export function ResetStepDialog({
  open,
  onOpenChange,
  onConfirm,
  isResetting,
  stepName,
}: ResetStepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset {stepName}?</DialogTitle>
          <DialogDescription>
            This will permanently delete all data for this step and every step after it — conversations, canvas boards, outputs, and summaries. All downstream steps will be reset to not started. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset Step'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Exit Workshop Dialog
 * Reassuring confirmation dialog when user wants to leave workshop
 * Per user decision: "Your progress is saved automatically"
 */

'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExitWorkshopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExitWorkshopDialog({
  open,
  onOpenChange,
}: ExitWorkshopDialogProps) {
  const router = useRouter();

  const handleExit = () => {
    onOpenChange(false);
    router.push('/dashboard');
  };

  const handleStay = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return to Dashboard</DialogTitle>
          <DialogDescription>
            Your progress is saved automatically. You can continue this workshop
            anytime.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={handleStay}>
            Stay in Workshop
          </Button>
          <Button onClick={handleExit}>Return to Dashboard</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

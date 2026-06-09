/**
 * Exit Workshop Dialog
 * Reassuring confirmation dialog when user wants to leave workshop
 * Per user decision: "Your progress is saved automatically"
 *
 * Facilitators in a multiplayer workshop get a modified variant: in addition to
 * leaving (the session keeps running for everyone else), they can end the
 * session or workshop for all participants. The end flow is owned by
 * FacilitatorControls inside the Liveblocks room; we trigger it via a DOM event.
 */

'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
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
  /** True for the workshop facilitator in a multiplayer session. */
  isFacilitator?: boolean;
}

export function ExitWorkshopDialog({
  open,
  onOpenChange,
  isFacilitator = false,
}: ExitWorkshopDialogProps) {
  const router = useRouter();

  const handleExit = () => {
    onOpenChange(false);
    router.push('/dashboard');
  };

  const handleStay = () => {
    onOpenChange(false);
  };

  const handleEndForAll = () => {
    onOpenChange(false);
    // FacilitatorControls (inside the Liveblocks room) confirms + ends.
    document.dispatchEvent(new Event('facilitator-end-session'));
  };

  if (isFacilitator) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit workshop</DialogTitle>
            <DialogDescription>
              Leave on your own and the session keeps running for everyone else,
              or end the session or workshop for all participants.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-col sm:items-stretch sm:space-x-0 sm:gap-2">
            <Button onClick={handleExit} className="gap-2">
              <Icon name="log-out" className="h-4 w-4" />
              Leave (session keeps running)
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndForAll}
              className="gap-2"
            >
              <Icon name="square" className="h-3.5 w-3.5 fill-current" />
              End the session or workshop for all participants
            </Button>
            <Button variant="ghost" onClick={handleStay}>
              Stay in Workshop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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

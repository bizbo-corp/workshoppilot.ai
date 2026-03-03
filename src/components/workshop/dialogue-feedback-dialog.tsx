'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDialogueFeedback } from '@/hooks/use-dialogue-feedback';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface DialogueFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  sessionId: string;
  currentStepOrder: number;
}

export function DialogueFeedbackDialog({
  open,
  onOpenChange,
  workshopId,
  sessionId,
  currentStepOrder,
}: DialogueFeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitFeedback } = useDialogueFeedback();

  const step = getStepByOrder(currentStepOrder);
  const stepName = step?.name ?? `Step ${currentStepOrder}`;
  const stepId = step?.id ?? 'unknown';

  const handleSubmit = async () => {
    const trimmed = feedbackText.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await submitFeedback(trimmed, {
        stepId,
        workshopId,
      });
      toast.success('Feedback captured');
      setFeedbackText('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dialogue Feedback</DialogTitle>
          <DialogDescription>
            Capture a critique of the AI dialogue at this point in the workshop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What could the AI dialogue do better here?"
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            autoFocus
          />

          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Step: <span className="font-medium text-foreground">{stepName}</span></p>
            <p>File: <span className="font-mono">{step ? `src/lib/ai/prompts/steps/${step.order.toString().padStart(2, '0')}_${step.id.replace(/-/g, '_')}.ts` : 'unknown'}</span></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !feedbackText.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

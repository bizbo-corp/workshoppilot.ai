/**
 * Artifact Confirmation Component
 * Provides "Looks Good" / "Let me refine" buttons for user confirmation of extracted artifacts
 * Features:
 * - Confirmed state: Green checkmark with "Re-extract" link
 * - Unconfirmed state: Two action buttons with instructional text
 * - Loading state during confirmation API call
 */

'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArtifactConfirmationProps {
  onConfirm: () => void;
  onEdit: () => void;
  isConfirming: boolean;
  isConfirmed: boolean;
}

export function ArtifactConfirmation({
  onConfirm,
  onEdit,
  isConfirming,
  isConfirmed,
}: ArtifactConfirmationProps) {
  // Confirmed state: show checkmark and subtle re-extract link
  if (isConfirmed) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-700 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Output confirmed
          </span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Re-extract
        </button>
      </div>
    );
  }

  // Unconfirmed state: show action buttons
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <p className="mb-3 text-center text-sm text-muted-foreground">
        Review the extracted output above. Confirm when ready, or continue
        chatting to refine.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={onConfirm}
          disabled={isConfirming}
          size="default"
          variant="default"
        >
          {isConfirming ? 'Confirming...' : 'Looks Good'}
        </Button>
        <Button onClick={onEdit} size="default" variant="ghost">
          Let me refine
        </Button>
      </div>
    </div>
  );
}

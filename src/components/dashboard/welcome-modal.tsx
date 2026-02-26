'use client';

import { useState } from 'react';
import { Sparkles, MessageSquare, LayoutGrid, ListChecks } from 'lucide-react';
import { markOnboardingComplete } from '@/actions/billing-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WelcomeModalProps {
  showWelcomeModal: boolean;
}

export function WelcomeModal({ showWelcomeModal }: WelcomeModalProps) {
  const [open, setOpen] = useState(showWelcomeModal);

  async function handleDismiss() {
    setOpen(false); // Close immediately (sync)
    await markOnboardingComplete(); // Persist to DB (async)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleDismiss();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          {/* Sparkles icon in olive circle — same pattern as UpgradeDialog's Lock icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900/50">
            <Sparkles className="h-6 w-6 text-olive-700 dark:text-olive-400" />
          </div>

          <DialogTitle className="text-center text-xl font-semibold">
            Welcome to WorkshopPilot
          </DialogTitle>

          <DialogDescription className="text-center text-sm text-muted-foreground">
            Your AI-powered design thinking facilitator — take a vague idea through 10 structured
            steps and walk away with a validated Build Pack ready for AI coders.
          </DialogDescription>
        </DialogHeader>

        {/* Three key areas */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-olive-100 dark:bg-olive-900/50">
              <MessageSquare className="h-4 w-4 text-olive-700 dark:text-olive-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">AI Chat</p>
              <p className="text-sm text-muted-foreground">
                Ask questions, get guidance, and brainstorm with your AI facilitator
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-olive-100 dark:bg-olive-900/50">
              <LayoutGrid className="h-4 w-4 text-olive-700 dark:text-olive-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Canvas</p>
              <p className="text-sm text-muted-foreground">
                Visualize your ideas with mind maps, sketches, and concept cards
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-olive-100 dark:bg-olive-900/50">
              <ListChecks className="h-4 w-4 text-olive-700 dark:text-olive-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Steps</p>
              <p className="text-sm text-muted-foreground">
                Follow 10 design thinking steps from vague idea to validated Build Pack
              </p>
            </div>
          </div>
        </div>

        {/* Taste-test model note */}
        <p className="rounded-md border bg-muted/40 px-4 py-2.5 text-center text-sm text-muted-foreground">
          Steps 1&ndash;6 are free &mdash; experience the full workshop flow before deciding to unlock
          your Build Pack.
        </p>

        <DialogFooter className="sm:flex-col">
          {/* Get Started CTA */}
          <Button size="lg" className="w-full" onClick={handleDismiss}>
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

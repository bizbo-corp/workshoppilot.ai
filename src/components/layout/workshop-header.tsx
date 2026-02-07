/**
 * Workshop Header
 * Header for workshop pages (separate from landing header)
 * Features:
 * - Logo + workshop name + step indicator
 * - Theme toggle, Exit Workshop button, user menu
 * - NOT sticky (scrolls with content)
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ExitWorkshopDialog } from '@/components/dialogs/exit-workshop-dialog';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { SignInModal } from '@/components/auth/sign-in-modal';

interface WorkshopHeaderProps {
  sessionId: string;
  workshopName?: string;
}

export function WorkshopHeader({
  sessionId,
  workshopName = 'New Workshop',
}: WorkshopHeaderProps) {
  const pathname = usePathname();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  // Extract current step from pathname
  // Pathname format: /workshop/[sessionId]/step/[stepNumber]
  const stepMatch = pathname.match(/\/workshop\/[^/]+\/step\/(\d+)/);
  const currentStepNumber = stepMatch ? parseInt(stepMatch[1], 10) : null;
  const currentStep = currentStepNumber
    ? getStepByOrder(currentStepNumber)
    : null;

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        {/* Left section: Logo + workshop name + step indicator */}
        <div className="flex items-center gap-4">
          <Logo size="sm" />

          <div className="hidden md:flex md:items-center md:gap-2">
            <span className="text-sm font-medium text-foreground">
              {workshopName}
            </span>
            {currentStep && (
              <>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">
                  Step {currentStep.order}: {currentStep.name}
                </span>
              </>
            )}
          </div>

          {/* Mobile: Show only current step */}
          {currentStep && (
            <div className="flex items-center gap-2 md:hidden">
              <span className="text-sm text-muted-foreground">
                Step {currentStep.order}
              </span>
            </div>
          )}
        </div>

        {/* Right section: Theme toggle, Exit button, User menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExitDialogOpen(true)}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Workshop</span>
          </Button>

          <SignedOut>
            <Button size="sm" onClick={() => setSignInOpen(true)}>
              Sign In
            </Button>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Exit confirmation dialog */}
      <ExitWorkshopDialog
        open={exitDialogOpen}
        onOpenChange={setExitDialogOpen}
      />

      {/* Sign-in modal for signed-out users */}
      <SignInModal
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onSwitchToSignUp={() => {
          setSignInOpen(false);
          // Would open sign-up modal if needed
        }}
      />
    </>
  );
}

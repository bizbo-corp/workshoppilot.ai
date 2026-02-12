/**
 * Workshop Header
 * Header for workshop pages (separate from landing header)
 * Features:
 * - Logo + workshop name + step indicator
 * - Theme toggle, Exit Workshop button, user menu
 * - NOT sticky (scrolls with content)
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { LogOut, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ExitWorkshopDialog } from "@/components/dialogs/exit-workshop-dialog";
import { getStepByOrder } from "@/lib/workshop/step-metadata";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { renameWorkshop } from "@/actions/workshop-actions";
import { EzyDrawLoader } from "@/components/ezydraw/ezydraw-loader";

interface WorkshopHeaderProps {
  sessionId: string;
  workshopId: string;
  workshopName?: string;
}

export function WorkshopHeader({
  sessionId,
  workshopId,
  workshopName = "New Workshop",
}: WorkshopHeaderProps) {
  const pathname = usePathname();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [ezyDrawOpen, setEzyDrawOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(workshopName);
  const [editValue, setEditValue] = useState(workshopName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(displayName);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== displayName) {
      setDisplayName(trimmed);
      await renameWorkshop(workshopId, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(displayName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Extract current step from pathname
  // Pathname format: /workshop/[sessionId]/step/[stepNumber]
  const stepMatch = pathname.match(/\/workshop\/[^/]+\/step\/(\d+)/);
  const currentStepNumber = stepMatch ? parseInt(stepMatch[1], 10) : null;
  const currentStep = currentStepNumber
    ? getStepByOrder(currentStepNumber)
    : null;

  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b bg-background px-6 py-2">
        {/* Left section: Logo + workshop name + step indicator */}
        <div className="flex items-center">
          <div className="hidden md:flex md:items-center md:gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                maxLength={100}
                className="text-xs font-medium text-muted-foreground bg-transparent border-b border-primary outline-none px-0 py-0"
              />
            ) : (
              <button
                onClick={handleStartEdit}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Click to rename workshop"
              >
                {displayName}
              </button>
            )}
            {currentStep && (
              <>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs text-muted-foreground">
                  Step {currentStep.order}
                </span>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs font-medium text-foreground">
                  {currentStep.name}
                </span>
              </>
            )}
          </div>

          {/* Description hidden — available via step metadata if needed */}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEzyDrawOpen(true)}
            className="gap-2"
            title="Open EzyDraw (test)"
          >
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">EzyDraw</span>
          </Button>

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

      {/* EzyDraw test modal */}
      {ezyDrawOpen && (
        <EzyDrawLoader
          isOpen={ezyDrawOpen}
          onClose={() => setEzyDrawOpen(false)}
          onSave={(dataURL) => {
            console.log('EzyDraw saved PNG:', dataURL.substring(0, 100) + '...');
            setEzyDrawOpen(false);
          }}
        />
      )}

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

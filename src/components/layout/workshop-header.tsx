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
import { LogOut, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ExitWorkshopDialog } from "@/components/dialogs/exit-workshop-dialog";
import { getStepByOrder } from "@/lib/workshop/step-metadata";
import { getWorkshopColor } from "@/lib/workshop/workshop-appearance";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { renameWorkshop } from "@/actions/workshop-actions";

interface WorkshopHeaderProps {
  sessionId: string;
  workshopId: string;
  workshopName?: string;
  workshopColor?: string | null;
  workshopEmoji?: string | null;
  shareToken?: string | null;
  workshopType?: 'solo' | 'multiplayer';
  isFacilitator?: boolean;
}

/**
 * ShareButton — inline component for copying the workshop join URL.
 * Only rendered for multiplayer workshops with a shareToken.
 */
function ShareButton({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/join/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copied!', { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fall back to manual copy prompt
      toast.error('Could not copy link. Please copy the URL manually.');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="gap-2"
      title="Copy invite link"
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}

export function WorkshopHeader({
  sessionId,
  workshopId,
  workshopName = "New Workshop",
  workshopColor,
  workshopEmoji,
  shareToken,
  workshopType,
  isFacilitator,
}: WorkshopHeaderProps) {
  const pathname = usePathname();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
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
            {workshopEmoji && (
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-sm leading-none"
                style={{ backgroundColor: getWorkshopColor(workshopColor).bgHex }}
              >
                {workshopEmoji}
              </span>
            )}
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                maxLength={100}
                className="text-base font-medium text-muted-foreground bg-transparent border-b border-primary outline-none px-0 py-0"
              />
            ) : (
              <button
                onClick={handleStartEdit}
                className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Click to rename workshop"
              >
                {displayName}
              </button>
            )}
            {currentStep && (
              <>
                <span className="text-base text-muted-foreground">/</span>
                <span className="text-base text-muted-foreground">
                  Step {currentStep.order}
                </span>
                <span className="text-base text-muted-foreground">/</span>
                <span className="text-base font-medium text-foreground">
                  {currentStep.name}
                </span>
              </>
            )}
          </div>

          {/* Description hidden — available via step metadata if needed */}
        </div>

        <div className="flex items-center gap-2">
          {/* Share button — facilitator only */}
          {isFacilitator && workshopType === 'multiplayer' && shareToken && (
            <ShareButton shareToken={shareToken} />
          )}

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
      />
    </>
  );
}

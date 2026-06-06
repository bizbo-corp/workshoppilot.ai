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
import { LogOut, Settings, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ExitWorkshopDialog } from "@/components/dialogs/exit-workshop-dialog";
import { WorkshopSettingsDialog } from "@/components/dialogs/workshop-settings-dialog";
import { ChallengeViewDialog } from "@/components/dialogs/challenge-view-dialog";
import { getStepByOrder } from "@/lib/workshop/step-metadata";
import { getWorkshopColor } from "@/lib/workshop/workshop-appearance";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { renameWorkshop } from "@/actions/workshop-actions";
import { getPendingChangeRequestCount } from "@/actions/challenge-actions";

interface WorkshopHeaderProps {
  sessionId: string;
  workshopId: string;
  workshopName?: string;
  workshopColor?: string | null;
  workshopEmoji?: string | null;
  workshopType?: 'solo' | 'multiplayer';
  isFacilitator?: boolean;
  /** Workshop owner (true in solo too — distinct from multiplayer-context isFacilitator). */
  isWorkshopOwner?: boolean;
  /** Configured admin viewing any workshop. */
  isAdmin?: boolean;
  /** True once the multiplayer session has started (locks challenge editing). */
  workshopStarted?: boolean;
  /** Static breadcrumb segment shown after the workshop name on non-step pages
   *  (e.g. "Build Pack" on the outputs page). Ignored when a step is detected
   *  from the pathname. */
  breadcrumbTail?: string;
}

export function WorkshopHeader({
  sessionId,
  workshopId,
  workshopName = "New Workshop",
  workshopColor,
  workshopEmoji,
  workshopType,
  isFacilitator,
  isWorkshopOwner,
  isAdmin,
  workshopStarted,
  breadcrumbTail,
}: WorkshopHeaderProps) {
  const pathname = usePathname();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [changeRequests, setChangeRequests] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(workshopName);
  const [editValue, setEditValue] = useState(workshopName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Owner (incl. solo), facilitator, or admin can manage settings; everyone else
  // gets the read-only challenge view.
  const canManage = !!(isWorkshopOwner || isFacilitator || isAdmin);

  // Pending change-request badge on the Settings button (multiplayer only).
  useEffect(() => {
    if (!canManage || workshopType !== 'multiplayer') return;
    let cancelled = false;
    getPendingChangeRequestCount(workshopId)
      .then((n) => {
        if (!cancelled) setChangeRequests(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canManage, workshopType, workshopId]);

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
      <header className="panel-header flex min-h-16 items-center justify-between bg-background px-6 py-2">
        {/* Left section: Logo + workshop name + step indicator */}
        <div className="flex items-center">
          <div className="hidden md:flex md:items-center md:gap-2">
            {workshopEmoji && (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-base leading-none"
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
            {!currentStep && breadcrumbTail && (
              <>
                <span className="text-base text-muted-foreground">/</span>
                <span className="text-base font-medium text-foreground">
                  {breadcrumbTail}
                </span>
              </>
            )}
            {currentStep && (
              <>
                <span className="text-base text-muted-foreground">/</span>
                {currentStep.id === 'challenge' ? (
                  // Challenge is facilitator-only setup, not a numbered step.
                  <span className="text-base font-medium text-foreground">
                    Workshop Setup
                  </span>
                ) : (
                  <>
                    <span className="text-base text-muted-foreground">
                      Step {currentStep.order - 1}
                    </span>
                    <span className="text-base text-muted-foreground">/</span>
                    <span className="text-base font-medium text-foreground">
                      {currentStep.name}
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Description hidden — available via step metadata if needed */}
        </div>

        <div className="flex items-center gap-2">
          {canManage ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="relative gap-2"
              title="Workshop settings"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Workshop Settings</span>
              {changeRequests > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground"
                  aria-label={`${changeRequests} change request${changeRequests === 1 ? '' : 's'}`}
                >
                  {changeRequests}
                </span>
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChallengeOpen(true)}
              className="gap-2"
              title="View the challenge"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Challenge</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExitDialogOpen(true)}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Workshop</span>
          </Button>

          <ThemeToggle />

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

      {/* Exit confirmation dialog — facilitators get an "end for all" option */}
      <ExitWorkshopDialog
        open={exitDialogOpen}
        onOpenChange={setExitDialogOpen}
        isFacilitator={!!isFacilitator && workshopType === 'multiplayer'}
      />

      {/* Facilitator/admin settings, or read-only challenge view for participants */}
      {canManage ? (
        <WorkshopSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          workshopId={workshopId}
          sessionId={sessionId}
          workshopName={displayName ?? "New Workshop"}
          workshopColor={workshopColor}
          workshopEmoji={workshopEmoji}
          workshopType={workshopType ?? 'solo'}
          workshopStarted={!!workshopStarted}
        />
      ) : (
        <ChallengeViewDialog
          open={challengeOpen}
          onOpenChange={setChallengeOpen}
          workshopId={workshopId}
        />
      )}

      {/* Sign-in modal for signed-out users */}
      <SignInModal
        open={signInOpen}
        onOpenChange={setSignInOpen}
      />
    </>
  );
}

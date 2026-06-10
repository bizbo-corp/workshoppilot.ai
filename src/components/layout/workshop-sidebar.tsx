/**
 * Workshop Sidebar
 * Collapsible sidebar with step list
 * Features:
 * - Collapsed by default, expands on hover temporarily
 * - Click toggle or Cmd+B to pin/unpin expanded state
 * - First visit: auto-expands then collapses to teach discoverability
 * - Shows step number + name with status indicators
 */

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useHotkeys } from "react-hotkeys-hook";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon } from '@/components/ui/icon';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { STEPS, getStepBySlug } from "@/lib/workshop/step-metadata";
import { PAYWALL_START_SLUG } from "@/lib/billing/paywall-config";
import { cn } from "@/lib/utils";
import Logo, { LogoIcon } from "@/components/Logo";
import { StepSnapshotDialog } from "@/components/dialogs/step-snapshot-dialog";

interface WorkshopSidebarProps {
  sessionId: string;
  workshopSteps: Array<{
    stepId: string;
    status: "not_started" | "in_progress" | "complete" | "needs_regeneration";
    snapshotUrl?: string | null;
  }>;
  isPaywallLocked?: boolean;
}

export function WorkshopSidebar({
  sessionId,
  workshopSteps,
  isPaywallLocked,
}: WorkshopSidebarProps) {
  const pathname = usePathname();
  const { state, setOpen } = useSidebar();
  const [isPinned, setIsPinned, isPinnedLoading] = useLocalStorage(
    "workshoppilot-sidebar-pinned",
    false,
  );
  const [hasSeenIntro, setHasSeenIntro, isIntroLoading] = useLocalStorage(
    "workshoppilot-sidebar-intro",
    false,
  );
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoading = isPinnedLoading || isIntroLoading;

  // Restore sidebar state immediately on hydration (before paint)
  useLayoutEffect(() => {
    if (!isLoading) {
      if (!hasSeenIntro) {
        setOpen(true); // Intro animation: start expanded
      } else if (isPinned) {
        setOpen(true); // Restore pinned state
      }
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intro animation: collapse after delay on first visit
  useEffect(() => {
    if (!isLoading && !hasSeenIntro) {
      const timer = setTimeout(() => {
        setOpen(false);
        setHasSeenIntro(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasSeenIntro]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hover: temporarily expand when not pinned (with intent delay to ignore accidental pass-throughs)
  const hoverEnterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleMouseEnter = useCallback(() => {
    if (!isPinned) {
      // Cancel any pending collapse
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      // Delay expand to filter out accidental mouse-overs
      hoverEnterTimeoutRef.current = setTimeout(() => {
        setOpen(true);
      }, 300);
    }
  }, [isPinned, setOpen]);

  const handleMouseLeave = useCallback(() => {
    if (!isPinned) {
      // Cancel any pending expand (mouse left before intent threshold)
      if (hoverEnterTimeoutRef.current) {
        clearTimeout(hoverEnterTimeoutRef.current);
        hoverEnterTimeoutRef.current = null;
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 300);
    }
  }, [isPinned, setOpen]);

  // Toggle pin state
  const handleTogglePin = useCallback(() => {
    if (isPinned) {
      setIsPinned(false);
      setOpen(false);
    } else {
      setIsPinned(true);
      setOpen(true);
    }
  }, [isPinned, setIsPinned, setOpen]);

  // Cmd+B keyboard shortcut toggles pin
  useHotkeys("mod+b", (e) => {
    e.preventDefault();
    handleTogglePin();
  });

  // Extract current step slug from pathname (URLs are slug-based)
  const stepMatch = pathname.match(/\/workshop\/[^/]+\/step\/([^/?#]+)/);
  const currentStepSlug = stepMatch ? stepMatch[1] : null;
  const paywallStartOrder = getStepBySlug(PAYWALL_START_SLUG)!.order;

  // Create status lookup map
  const statusLookup = new Map(workshopSteps.map((s) => [s.stepId, s.status]));
  const snapshotLookup = new Map(
    workshopSteps.map((s) => [s.stepId, s.snapshotUrl]),
  );
  const [viewingSnapshot, setViewingSnapshot] = useState<{
    stepName: string;
    snapshotUrl: string;
  } | null>(null);

  // Show loading skeleton during hydration
  if (isLoading) {
    return (
      <Sidebar>
        <SidebarHeader className="border-b p-4">
          <Skeleton className="h-8 w-32" />
        </SidebarHeader>
        <SidebarContent className="p-4">
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo */}
      <SidebarHeader
        className={cn(
          "panel-header panel-header--flat group/logo flex h-16 flex-row items-center",
          state === "collapsed" ? "justify-center px-2" : "justify-start px-4",
        )}
      >
        {state === "collapsed" ? (
          <LogoIcon size="lg" />
        ) : (
          <>
            <Logo size="md" />
            {/* Collapse / pin control — fades in on logo hover; replaces the old
                persistent footer toggle. */}
            <button
              type="button"
              onClick={handleTogglePin}
              title={isPinned ? "Collapse sidebar (⌘B)" : "Pin sidebar open (⌘B)"}
              aria-label={isPinned ? "Collapse sidebar" : "Pin sidebar open"}
              className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-olive-100 hover:text-foreground group-hover/logo:opacity-100 dark:hover:bg-olive-900/30"
            >
              <Icon name="panel-left" className="h-4 w-4" />
            </button>
          </>
        )}
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {STEPS
            // Challenge (order 1) is facilitator-only setup, surfaced via the
            // header settings control — never shown as a numbered stepper row.
            .filter((step) => step.id !== 'challenge')
            .map((step) => {
            const status = statusLookup.get(step.id) || "not_started";
            const isComplete = status === "complete";
            const isCurrent = step.slug === currentStepSlug;
            const isAccessible = status !== "not_started";
            const isLocked = isPaywallLocked && step.order >= paywallStartOrder;

            const content = (
              <>
                {/* Step indicator */}
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium",
                    isComplete && "bg-primary text-primary-foreground",
                    isCurrent &&
                      !isComplete &&
                      "border-2 border-primary bg-background text-primary",
                    !isComplete &&
                      !isCurrent &&
                      "border bg-background text-muted-foreground",
                    isLocked &&
                      !isComplete &&
                      !isCurrent &&
                      "border bg-background text-muted-foreground",
                  )}
                >
                  {isLocked ? (
                    <Icon name="lock" className="h-3 w-3" />
                  ) : isComplete ? (
                    <Icon name="check" className="h-3 w-3" />
                  ) : (
                    // `order` is already the 1-based display number for the
                    // numbered flow (challenge is order 0 and filtered out above).
                    step.order
                  )}
                </div>

                {/* Step name (hidden when collapsed) */}
                {state === "expanded" && (
                  <span
                    className={cn(
                      "flex-1 truncate text-base font-normal",
                      // Completed = full foreground; incomplete = dimmed @ 80%.
                      isComplete ? "text-foreground" : "text-foreground/80",
                    )}
                  >
                    {step.name}
                  </span>
                )}

              </>
            );

            const snapshot = snapshotLookup.get(step.id);

            return (
              <SidebarMenuItem key={step.id}>
                <SidebarMenuButton
                  asChild={isAccessible}
                  isActive={isCurrent}
                  tooltip={state === "collapsed" ? step.name : undefined}
                  disabled={!isAccessible}
                  className={cn(
                    // Disabled (locked / not-started) steps stay ~90% visible.
                    // Hover = foreground @ 24%; current step = foreground @ 20%.
                    "transition-colors duration-150 disabled:opacity-90 hover:bg-foreground/24",
                    isCurrent && "bg-foreground/20 data-[active=true]:bg-foreground/20",
                  )}
                >
                  {isAccessible ? (
                    <Link href={`/workshop/${sessionId}/step/${step.slug}`}>
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 cursor-not-allowed">
                      {content}
                    </div>
                  )}
                </SidebarMenuButton>
                {isComplete && snapshot && state === "expanded" && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setViewingSnapshot({
                        stepName: step.name,
                        snapshotUrl: snapshot,
                      });
                    }}
                    title={`View ${step.name} snapshot`}
                    className="absolute right-1 inset-y-1 flex items-center justify-center w-8 rounded-full opacity-0 group-hover/menu-item:opacity-100 transition-opacity hover:bg-olive-200/60 dark:hover:bg-olive-800/40"
                  >
                    <Icon name="eye" className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {viewingSnapshot && (
        <StepSnapshotDialog
          open={!!viewingSnapshot}
          onOpenChange={(open) => {
            if (!open) setViewingSnapshot(null);
          }}
          stepName={viewingSnapshot.stepName}
          snapshotUrl={viewingSnapshot.snapshotUrl}
        />
      )}
    </Sidebar>
  );
}

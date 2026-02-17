/**
 * Workshop Sidebar
 * Collapsible sidebar with step list
 * Features:
 * - Collapsed by default, expands on hover temporarily
 * - Click toggle or Cmd+B to pin/unpin expanded state
 * - First visit: auto-expands then collapses to teach discoverability
 * - Shows step number + name with status indicators
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHotkeys } from 'react-hotkeys-hook';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { STEPS } from '@/lib/workshop/step-metadata';
import { cn } from '@/lib/utils';
import Logo, { LogoIcon } from '@/components/Logo';

interface WorkshopSidebarProps {
  sessionId: string;
  workshopSteps: Array<{
    stepId: string;
    status: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  }>;
}

export function WorkshopSidebar({ sessionId, workshopSteps }: WorkshopSidebarProps) {
  const pathname = usePathname();
  const { state, setOpen } = useSidebar();
  const [isPinned, setIsPinned, isPinnedLoading] = useLocalStorage('workshoppilot-sidebar-pinned', false);
  const [hasSeenIntro, setHasSeenIntro, isIntroLoading] = useLocalStorage('workshoppilot-sidebar-intro', false);
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
  const hoverEnterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  useHotkeys('mod+b', (e) => {
    e.preventDefault();
    handleTogglePin();
  });

  // Extract current step from pathname
  const stepMatch = pathname.match(/\/workshop\/[^/]+\/step\/(\d+)/);
  const currentStepNumber = stepMatch ? parseInt(stepMatch[1], 10) : null;

  // Create status lookup map
  const statusLookup = new Map(workshopSteps.map(s => [s.stepId, s.status]));

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
      <SidebarHeader className={cn("flex h-16 flex-row items-center border-b px-4", state === 'collapsed' ? 'justify-center' : 'justify-start')}>
        {state === 'collapsed' ? (
          <LogoIcon size="lg" />
        ) : (
          <Logo size="md" />
        )}
      </SidebarHeader>

      {/* Toggle row between logo and steps */}
      <div className="border-b px-2 py-2">
        {state === 'expanded' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTogglePin}
            className="w-full justify-start"
            title={isPinned ? 'Collapse sidebar (⌘B)' : 'Pin sidebar open (⌘B)'}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-2 text-sm text-muted-foreground">
              {isPinned ? 'Collapse' : 'Pin open'} (⌘B)
            </span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePin}
            className="mx-auto flex h-8 w-8"
            title="Expand sidebar (⌘B)"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {STEPS.map((step) => {
            const status = statusLookup.get(step.id) || 'not_started';
            const isComplete = status === 'complete';
            const isCurrent = step.order === currentStepNumber;
            const isAccessible = status !== 'not_started';

            const content = (
              <>
                {/* Step indicator */}
                <div
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    isComplete &&
                      'bg-primary text-primary-foreground',
                    isCurrent &&
                      !isComplete &&
                      'border-2 border-primary bg-background text-primary',
                    !isComplete &&
                      !isCurrent &&
                      'border bg-background text-muted-foreground'
                  )}
                >
                  {isComplete ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    step.order
                  )}
                </div>

                {/* Step name (hidden when collapsed) */}
                {state === 'expanded' && (
                  <span
                    className={cn(
                      'flex-1 truncate text-base',
                      isCurrent && 'font-semibold text-primary',
                      !isCurrent && 'text-foreground'
                    )}
                  >
                    {step.name}
                  </span>
                )}
              </>
            );

            return (
              <SidebarMenuItem key={step.id}>
                <SidebarMenuButton
                  asChild={isAccessible}
                  isActive={isCurrent}
                  tooltip={state === 'collapsed' ? step.name : undefined}
                  disabled={!isAccessible}
                >
                  {isAccessible ? (
                    <Link href={`/workshop/${sessionId}/step/${step.order}`}>
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 cursor-not-allowed opacity-50">
                      {content}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

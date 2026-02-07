/**
 * Workshop Sidebar
 * Collapsible sidebar with step list
 * Features:
 * - Toggle button + Cmd+B keyboard shortcut
 * - Persists collapse state in localStorage
 * - Shows step number + name with status indicators
 * - Flat list of all 10 steps
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHotkeys } from 'react-hotkeys-hook';
import { Check, ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import Logo from '@/components/Logo';

interface WorkshopSidebarProps {
  sessionId: string;
}

export function WorkshopSidebar({ sessionId }: WorkshopSidebarProps) {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const [_, __, isLoading] = useLocalStorage(
    'workshoppilot-sidebar-collapsed',
    false
  );

  // Cmd+B keyboard shortcut
  useHotkeys('mod+b', (e) => {
    e.preventDefault();
    toggleSidebar();
  });

  // Extract current step from pathname
  // Pathname format: /workshop/[sessionId]/step/[stepNumber]
  const stepMatch = pathname.match(/\/workshop\/[^/]+\/step\/(\d+)/);
  const currentStepNumber = stepMatch ? parseInt(stepMatch[1], 10) : null;

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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        {state === 'expanded' ? (
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-sm font-medium">WorkshopPilot</span>
          </div>
        ) : (
          <Logo size="sm" />
        )}
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {STEPS.map((step) => {
            const isComplete = currentStepNumber
              ? step.order < currentStepNumber
              : false;
            const isCurrent = step.order === currentStepNumber;

            return (
              <SidebarMenuItem key={step.id}>
                <SidebarMenuButton
                  asChild
                  isActive={isCurrent}
                  tooltip={state === 'collapsed' ? step.name : undefined}
                >
                  <Link href={`/workshop/${sessionId}/step/${step.order}`}>
                    {/* Step indicator */}
                    <div
                      className={cn(
                        'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
                        isComplete &&
                          'bg-primary text-primary-foreground',
                        isCurrent &&
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
                          'flex-1 truncate text-sm',
                          isCurrent && 'font-semibold text-primary',
                          !isCurrent && 'text-foreground'
                        )}
                      >
                        {step.name}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-start"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform',
              state === 'expanded' && 'rotate-180'
            )}
          />
          {state === 'expanded' && (
            <span className="ml-2 text-xs text-muted-foreground">
              Collapse (⌘B)
            </span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

/**
 * Dashboard Header
 * Header for dashboard pages (separate from landing and workshop headers)
 * Features:
 * - Logo (links to home)
 * - Credit balance badge (links to /pricing)
 * - Theme toggle
 * - User menu
 * - NOT sticky (scrolls with content)
 */

'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Coins } from 'lucide-react';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  creditBalance?: number;
}

export function DashboardHeader({ creditBalance }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Left section: Logo */}
      <Link href="/" className="flex items-center">
        <Logo size="sm" />
      </Link>

      {/* Right section: Credit badge, Theme toggle, User menu */}
      <div className="flex items-center gap-2">
        {creditBalance !== undefined && (
          <Link
            href="/pricing"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              creditBalance > 0
                ? 'bg-olive-100 text-olive-700 hover:bg-olive-200 dark:bg-olive-900/40 dark:text-olive-300 dark:hover:bg-olive-900/60'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Coins className="h-3 w-3" />
            {creditBalance > 0
              ? `${creditBalance} credit${creditBalance !== 1 ? 's' : ''}`
              : 'No credits'}
          </Link>
        )}
        <ThemeToggle />
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}

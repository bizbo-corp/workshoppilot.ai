/**
 * Dashboard Header
 * Header for dashboard pages (separate from landing and workshop headers)
 * Features:
 * - Logo (links to home)
 * - Credit balance badge (links to /pricing)
 * - Theme toggle
 * - User menu
 * - Sticky header with backdrop blur
 */

'use client';

import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';
import { Coins, Shield } from 'lucide-react';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  creditBalance?: number;
}

export function DashboardHeader({ creditBalance }: DashboardHeaderProps) {
  const { user } = useUser();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userRoles = (user?.publicMetadata as { roles?: string[] })?.roles ?? [];
  const showAdmin = userRoles.includes('admin') || !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-6">
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
        {showAdmin && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <Shield className="h-3 w-3" />
            Admin
          </Link>
        )}
        <ThemeToggle />
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}

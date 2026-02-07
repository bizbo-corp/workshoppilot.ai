/**
 * Dashboard Header
 * Header for dashboard pages (separate from landing and workshop headers)
 * Features:
 * - Logo (links to home)
 * - Theme toggle
 * - User menu
 * - NOT sticky (scrolls with content)
 */

'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Left section: Logo */}
      <Link href="/" className="flex items-center">
        <Logo size="sm" />
      </Link>

      {/* Right section: Theme toggle, User menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}

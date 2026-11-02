import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getCurrentUser } from '@/lib/auth/current-user';
import { Icon } from '@/components/ui/icon';

/**
 * Shell for every signed-in page. Middleware has already required a
 * session; getCurrentUser creates our users row on first sight.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/credits"
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-sm hover:bg-accent"
              title="Your credits"
            >
              <Icon name="coins" className="h-4 w-4 text-olive-600" />
              <span className="tabular-nums">{user?.creditBalance ?? 0}</span>
            </Link>
            {user?.isAdmin && (
              <Link href="/admin" className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent">
                Admin
              </Link>
            )}
            <ThemeToggle />
            <UserButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

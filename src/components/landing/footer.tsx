import Logo from '@/components/Logo';

/**
 * Landing page footer
 * Simple, elegant footer with branding and copyright
 * Server component — no client-side logic needed
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Logo + tagline */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              AI-powered design thinking for everyone.
            </p>
          </div>

          {/* Right: Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} WorkshopPilot
          </p>
        </div>
      </div>
    </footer>
  );
}

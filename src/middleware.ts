import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAuthBypassEnabled } from '@/lib/auth/bypass';

/**
 * E2E Test Auth Bypass
 * When BYPASS_AUTH=true (test environments only — isAuthBypassEnabled fails
 * closed in production/preview), Clerk middleware still runs (so auth() works in
 * server components/actions) but no routes are protected. auth() returns
 * { userId: null } for unauthenticated requests, and existing code falls back to
 * 'anonymous' (API routes use the matching bypass in authenticateWorkshopRequest).
 */

// Route matchers
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health',
  // Join + invite PAGES stay public so the passwordless sign-in gate can render
  // to signed-out visitors. The claim APIs below them require a Clerk session
  // (see isProtectedRoute) — joining a workshop now always requires auth.
  '/join(.*)',          // /join/[token] page
  '/api/session-status(.*)', // Lobby status polling (status-only, no PII)
  '/invite(.*)',        // /invite/[inviteToken] page
  // Multiplayer guest canvas access — all workshop step pages are public for guests.
  // The workshop page itself requires a valid session ID (redirects to /dashboard if not found).
  // Liveblocks room access requires a valid token (issued only to verified Clerk users or guests).
  // Without this, guests would be redirected to sign-in when the lobby transitions to the canvas.
  '/workshop/:path*/step/:stepId', // All steps accessible for multiplayer participants
  '/workshop/:path*/outputs',      // Guest access to workshop outputs after session end
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/workshops(.*)',
  '/api/sessions(.*)',
  '/api/guest-join',    // Join via share link — Clerk session required
  '/api/invite-claim',  // Claim an invite — Clerk session required
  // NOTE: Workshop step pages are intentionally NOT listed here. They are made
  // public for multiplayer guests via the '/workshop/:path*/step/:stepId'
  // catch-all in isPublicRoute above; per-step access control is enforced in the
  // page itself (sequential-enforcement + paywall) and by AuthGuard, not here.
  // (Previously these were numeric matchers /step/4..10 — brittle and left
  // /step/11=validate unprotected. Removed during the slug-URL migration.)
]);

export default clerkMiddleware(async (auth, req) => {
  // E2E test mode: allow all routes through without protection.
  // clerkMiddleware still establishes auth context so auth() calls work.
  // isAuthBypassEnabled() fails closed — it can never return true on a
  // production or preview deployment, even if BYPASS_AUTH leaks into env.
  if (isAuthBypassEnabled()) {
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth();
  const { pathname } = req.nextUrl;

  // Admin route protection
  if (isAdminRoute(req)) {
    const isApiRoute = pathname.startsWith('/api/');

    if (!userId) {
      return isApiRoute
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/', req.url));
    }

    const publicMetadata = sessionClaims?.publicMetadata as
      | { roles?: string[] }
      | undefined;
    const roles = (publicMetadata?.roles || []) as string[];

    if (!roles.includes('admin')) {
      // For API routes, let the handler do fine-grained checks (email-based fallback).
      // For page routes, also let through — the page server component does its own
      // full admin check with currentUser() email fallback.
      if (!isApiRoute && !process.env.ADMIN_EMAIL) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }

  // Protected route protection
  if (isProtectedRoute(req) && !userId) {
    const isApiRoute = pathname.startsWith('/api/');
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For page routes, let through — AuthGuard will show sign-in modal in-place
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

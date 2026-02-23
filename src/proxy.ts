import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * E2E Test Auth Bypass
 * When BYPASS_AUTH=true, Clerk middleware still runs (so auth() works in server
 * components/actions) but no routes are protected. auth() returns { userId: null }
 * for unauthenticated requests, and existing code falls back to 'anonymous'.
 */
const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true';

// Route matchers
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health',
  '/workshop/:path*/step/1',
  '/workshop/:path*/step/2',
  '/workshop/:path*/step/3',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/workshops(.*)',
  '/api/sessions(.*)',
  '/workshop/:path*/step/4',
  '/workshop/:path*/step/5',
  '/workshop/:path*/step/6',
  '/workshop/:path*/step/7',
  '/workshop/:path*/step/8',
  '/workshop/:path*/step/9',
  '/workshop/:path*/step/10',
]);

export default clerkMiddleware(async (auth, req) => {
  // E2E test mode: allow all routes through without protection.
  // clerkMiddleware still establishes auth context so auth() calls work.
  if (BYPASS_AUTH) {
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
      // For page routes, redirect non-admin users.
      if (!isApiRoute) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }

  // Protected route protection
  if (isProtectedRoute(req) && !userId) {
    return NextResponse.redirect(new URL('/', req.url));
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

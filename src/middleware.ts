import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Route matchers
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/workshops(.*)',
  '/api/sessions(.*)',
]);

// ============================================================
// PHASE 3 HANDOFF: WORKSHOP STEP ROUTE PROTECTION
// ============================================================
// When workshop routes are created in Phase 3, update matchers:
//   PUBLIC (add to isPublicRoute):
//     '/workshop/:path*/step/1'
//     '/workshop/:path*/step/2'
//     '/workshop/:path*/step/3'
//   PROTECTED (add to isProtectedRoute):
//     '/workshop/:path*/step/4' through step/10
//
// User decision (LOCKED): steps 1-3 public, steps 4-10 protected
// Auth wall modal triggers after step 3 on advance to step 4
// ============================================================

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = req.nextUrl;

  // Admin route protection
  if (isAdminRoute(req)) {
    if (!userId) {
      // No user - redirect to landing page
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Check if user has admin role
    const publicMetadata = sessionClaims?.publicMetadata as
      | { roles?: string[] }
      | undefined;
    const roles = (publicMetadata?.roles || []) as string[];

    if (!roles.includes('admin')) {
      // User exists but not admin - redirect to dashboard silently
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Protected route protection
  if (isProtectedRoute(req) && !userId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Landing page redirect for authenticated users
  if (pathname === '/' && userId) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
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

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Route matchers
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health',
  '/workshop/:path*/step/1',
  '/workshop/:path*/step/2',
  '/workshop/:path*/step/3',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

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

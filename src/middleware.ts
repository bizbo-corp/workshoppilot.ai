import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Sign-in is mandatory for everything except the brochure pages, the
 * webhooks and the health check. Per-workshop access is checked again in
 * the server code (membership), so this is the outer gate, not the only one.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/landing-v4',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health',
  '/manifest.webmanifest',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

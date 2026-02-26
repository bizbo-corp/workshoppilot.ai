/**
 * Step loading state — shown while the step page fetches data.
 * Next.js automatically wraps page.tsx in a Suspense boundary and shows this
 * file as the fallback UI during server-side data fetching.
 *
 * This Suspense boundary is critical: without it, the async server component
 * triggers React's "cleaning up async info not on parent Suspense boundary" error.
 */
export default function StepLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
    </div>
  );
}

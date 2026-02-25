import { WorkshopGridSkeleton } from '@/components/dashboard/workshop-grid-skeleton';

/**
 * Dashboard loading state — shown while the dashboard page fetches data.
 * Next.js automatically wraps page.tsx in a Suspense boundary and shows this
 * file as the fallback UI during server-side data fetching.
 *
 * Uses static gray skeleton blocks (no shimmer/pulse per user decision).
 */
export default function DashboardLoading() {
  return (
    <>
      {/* Page header skeleton */}
      <div className="mb-8">
        <div className="h-9 w-52 rounded-md bg-accent animate-none" />
        <div className="mt-2 h-5 w-40 rounded-md bg-accent animate-none" />
      </div>

      {/* Workshop grid skeleton */}
      <WorkshopGridSkeleton />
    </>
  );
}

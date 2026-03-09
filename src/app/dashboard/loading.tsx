import { WorkshopGridSkeleton } from '@/components/dashboard/workshop-grid-skeleton';

/**
 * Dashboard loading state — shown while the dashboard page fetches data.
 * Uses static gray skeleton blocks (no shimmer/pulse per user decision).
 */
export default function DashboardLoading() {
  return (
    <>
      {/* Page header skeleton — serif-sized title */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="h-12 w-64 rounded-md bg-accent animate-none" />
          <div className="mt-2 h-5 w-44 rounded-md bg-accent animate-none" />
        </div>
        <div className="hidden sm:block h-20 w-40 rounded-md bg-accent/30 animate-none" />
      </div>

      {/* Workshop grid skeleton */}
      <WorkshopGridSkeleton />
    </>
  );
}

import { Icon } from '@/components/ui/icon';

/**
 * Dashboard loading state — shown while the dashboard page fetches data.
 * Static header (matches the real page) + a single spinner; no skeleton blocks.
 */
export default function DashboardLoading() {
  return (
    <>
      {/* Page header — matches the real dashboard header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-serif leading-[1.1] tracking-tight text-foreground">
          Your Workshops
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Loading your workshops…
        </p>
      </div>

      <div className="flex justify-center py-24">
        <Icon name="spinner" className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </>
  );
}

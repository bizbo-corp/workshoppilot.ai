/**
 * Decorative SVG illustration for the dashboard header.
 * Abstract connected dots/shapes representing the design thinking journey.
 */
export function DashboardIllustration() {
  return (
    <svg
      viewBox="0 0 160 80"
      fill="none"
      className="hidden sm:block w-40 h-20 text-olive-400 dark:text-olive-600"
      aria-hidden="true"
    >
      {/* Journey path */}
      <path
        d="M12 60 C 30 60, 35 20, 55 25 S 80 55, 100 40 S 125 15, 148 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Journey dots — 10 steps */}
      <circle cx="12" cy="60" r="4" fill="currentColor" opacity="0.7" />
      <circle cx="28" cy="42" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="42" cy="24" r="3.5" fill="currentColor" opacity="0.65" />
      <circle cx="58" cy="28" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="72" cy="42" r="3.5" fill="currentColor" opacity="0.65" />
      <circle cx="86" cy="50" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="100" cy="40" r="3.5" fill="currentColor" opacity="0.65" />
      <circle cx="116" cy="26" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="132" cy="22" r="3.5" fill="currentColor" opacity="0.65" />
      <circle cx="148" cy="30" r="5" fill="currentColor" opacity="0.8" />
      {/* Destination marker */}
      <rect x="143" y="22" width="10" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

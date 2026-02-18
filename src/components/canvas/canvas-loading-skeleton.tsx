'use client';

export function CanvasLoadingSkeleton() {
  return (
    <div
      className="relative w-full h-full"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--neutral-olive-300) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="absolute inset-0 bg-card/50 animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading canvas...</p>
      </div>
    </div>
  );
}

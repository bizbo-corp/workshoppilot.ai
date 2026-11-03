import { cn } from '@/lib/utils';

/** The reading-width wrapper for every page except the workshop room. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 py-8', className)}>{children}</div>;
}

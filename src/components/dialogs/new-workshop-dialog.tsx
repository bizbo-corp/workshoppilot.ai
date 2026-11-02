import Link from 'next/link';
import type { ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface NewWorkshopButtonProps {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  className?: string;
  children?: ReactNode;
  /** Kept for the landing page's call sites; tiers are gone in 2.0. */
  preselectTier?: string;
}

/**
 * Landing-page entry point. In 2.0 every workshop starts from the dashboard
 * behind sign-in, so this is a plain link; the dashboard opens the new
 * workshop form when it sees `?new=1`.
 */
export function NewWorkshopButton({ variant, size, className, children }: NewWorkshopButtonProps) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href="/dashboard?new=1">{children ?? 'Start a workshop'}</Link>
    </Button>
  );
}

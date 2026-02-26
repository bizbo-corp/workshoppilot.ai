'use client';

import { useRouter } from 'next/navigation';
import { resetOnboarding } from '@/actions/billing-actions';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export function AdminResetOnboarding() {
  const router = useRouter();

  async function handleReset() {
    await resetOnboarding();
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-muted-foreground">
      <RotateCcw className="mr-1 h-3 w-3" />
      Reset Onboarding
    </Button>
  );
}

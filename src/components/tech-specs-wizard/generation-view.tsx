'use client';

import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GenerationViewProps {
  phase: 'generating' | 'error';
  errorMessage?: string;
  onRetry: () => void;
}

export function GenerationView({ phase, errorMessage, onRetry }: GenerationViewProps) {
  if (phase === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Generating Technical Specifications...</p>
          <p className="text-xs text-muted-foreground">
            This may take a moment while we analyze your requirements
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Generation failed</p>
        <p className="text-xs text-muted-foreground">
          {errorMessage || 'Something went wrong. Please try again.'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}

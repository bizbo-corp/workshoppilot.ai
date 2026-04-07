'use client';

import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
  currentPage: number;
  totalPages: number;
  isSummary: boolean;
  isGenerating: boolean;
  onBack: () => void;
  onNext: () => void;
  onGenerate: () => void;
}

export function WizardNavigation({
  currentPage,
  totalPages,
  isSummary,
  isGenerating,
  onBack,
  onNext,
  onGenerate,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={currentPage === 0 && !isSummary}
        className="gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {isSummary ? (
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="gap-2 btn-lift"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Tech Specs
            </>
          )}
        </Button>
      ) : (
        <Button onClick={onNext} className="gap-1.5 btn-lift">
          {currentPage === totalPages - 1 ? 'Review' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

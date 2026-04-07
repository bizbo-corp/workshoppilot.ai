'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Code, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeliverableDetailView } from '@/components/workshop/deliverable-detail-view';
import { WizardShell } from '@/components/tech-specs-wizard/wizard-shell';
import { GenerationView } from '@/components/tech-specs-wizard/generation-view';
import { SummaryPage } from '@/components/tech-specs-wizard/summary-page';
import { WIZARD_PAGES, TOTAL_WIZARD_PAGES } from '@/lib/tech-specs-wizard/wizard-pages';
import { createDefaultPreferences } from '@/lib/tech-specs-wizard/defaults';
import type { TechSpecsPreferences } from '@/lib/tech-specs-wizard/types';
import { toast } from 'sonner';

interface DeliverableFormat {
  id: string;
  formatType: 'markdown' | 'json' | 'pdf';
  content: string | null;
}

interface TechSpecsContentProps {
  sessionId: string;
  workshopId: string;
  savedPreferences: TechSpecsPreferences | null;
  savedSpecs: DeliverableFormat[] | null;
  isReadOnly: boolean;
}

type Phase = 'wizard' | 'generating' | 'done' | 'error';

export function TechSpecsContent({
  sessionId,
  workshopId,
  savedPreferences,
  savedSpecs,
  isReadOnly,
}: TechSpecsContentProps) {
  const router = useRouter();

  const [preferences, setPreferences] = useState<TechSpecsPreferences>(
    () => savedPreferences ?? createDefaultPreferences()
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSummary, setIsSummary] = useState(false);
  const [phase, setPhase] = useState<Phase>(savedSpecs ? 'done' : 'wizard');
  const [errorMessage, setErrorMessage] = useState('');
  const [specs, setSpecs] = useState<DeliverableFormat[]>(savedSpecs ?? []);
  const [showPreferences, setShowPreferences] = useState(true);

  const updatePreference = useCallback(
    <K extends keyof TechSpecsPreferences>(key: K, value: TechSpecsPreferences[K]) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleNext = useCallback(() => {
    if (isSummary) return;
    setDirection(1);
    if (currentPage === TOTAL_WIZARD_PAGES - 1) {
      setIsSummary(true);
    } else {
      setCurrentPage((p) => p + 1);
    }
  }, [currentPage, isSummary]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    if (isSummary) {
      setIsSummary(false);
    } else if (currentPage > 0) {
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage, isSummary]);

  const handleJumpToPage = useCallback((page: number) => {
    setPhase('wizard');
    setDirection(-1);
    setIsSummary(false);
    setCurrentPage(page);
  }, []);

  const handleGenerate = useCallback(async () => {
    setPhase('generating');
    setErrorMessage('');
    try {
      const res = await fetch('/api/build-pack/generate-tech-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, preferences, force: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Tech Specs generation failed');
      }
      const data = await res.json();
      if (!data.markdown && !data.json) {
        throw new Error('Tech Specs generation produced no content — please try again');
      }
      const formats: DeliverableFormat[] = [];
      if (data.markdown) formats.push({ id: 'ts-md', formatType: 'markdown', content: data.markdown });
      if (data.json) formats.push({ id: 'ts-json', formatType: 'json', content: typeof data.json === 'string' ? data.json : JSON.stringify(data.json, null, 2) });
      setSpecs(formats);
      setPhase('done');
      toast.success('Tech Specs generated successfully');
      router.refresh();
    } catch (err) {
      setPhase('error');
      setErrorMessage(err instanceof Error ? err.message : 'Tech Specs generation failed');
      toast.error(err instanceof Error ? err.message : 'Tech Specs generation failed');
    }
  }, [workshopId, preferences, router]);

  const handleRetry = useCallback(() => {
    setPhase('wizard');
    setIsSummary(true);
  }, []);

  const backLink = (
    <Link
      href={`/workshop/${sessionId}/outputs`}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Build Pack
    </Link>
  );

  // ── Read-only: show specs or nothing ──────────────────────────
  if (isReadOnly) {
    if (specs.length > 0) {
      return (
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-8 space-y-4">
            {backLink}
            <DeliverableDetailView
              title="Technical Specifications"
              type="tech-specs"
              formats={specs}
              onBack={() => router.push(`/workshop/${sessionId}/outputs`)}
              hideBackButton
            />
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/10">
            <Code className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Technical Specifications</h2>
          <p className="text-sm text-muted-foreground">
            Tech specs haven&apos;t been generated yet.
          </p>
          {backLink}
        </div>
      </div>
    );
  }

  // ── Results view with editable summary ────────────────────────
  if (phase === 'done' && specs.length > 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
          {backLink}

          {/* Editable preferences summary */}
          <div className="rounded-xl border">
            <button
              type="button"
              onClick={() => setShowPreferences((v) => !v)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <h2 className="text-sm font-semibold">Technical Decisions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your selections that shaped this specification
                </p>
              </div>
              {showPreferences ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {showPreferences && (
              <div className="border-t px-4 pb-4 pt-2">
                <SummaryPage
                  pages={WIZARD_PAGES}
                  preferences={preferences}
                  onJumpToPage={handleJumpToPage}
                  hideHeader
                />
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground flex-1">
                    Edit your choices above, then regenerate to update the specs and PRD.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    className="gap-2 shrink-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Specs detail view */}
          <DeliverableDetailView
            title="Technical Specifications"
            type="tech-specs"
            formats={specs}
            onBack={() => router.push(`/workshop/${sessionId}/outputs`)}
            hideBackButton
          />
        </div>
      </div>
    );
  }

  // ── Generating / Error view ───────────────────────────────────
  if (phase === 'generating' || phase === 'error') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {backLink}
          <div className="mt-6">
            {phase === 'generating' ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Generating Technical Specifications...</p>
                  <p className="text-xs text-muted-foreground">
                    This may take a moment while we analyze your requirements
                  </p>
                </div>
              </div>
            ) : (
              <GenerationView
                phase={phase}
                errorMessage={errorMessage}
                onRetry={handleRetry}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard view ───────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {backLink}
        <div className="mt-6">
          <WizardShell
            pages={WIZARD_PAGES}
            currentPage={currentPage}
            direction={direction}
            isSummary={isSummary}
            isGenerating={false}
            preferences={preferences}
            onUpdate={updatePreference}
            onNext={handleNext}
            onBack={handleBack}
            onGenerate={handleGenerate}
            onJumpToPage={handleJumpToPage}
          />
        </div>
      </div>
    </div>
  );
}

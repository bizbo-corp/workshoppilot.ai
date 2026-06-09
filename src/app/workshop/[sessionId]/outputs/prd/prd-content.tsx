'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { DeliverableDetailView } from '@/components/workshop/deliverable-detail-view';
import { toast } from 'sonner';

interface DeliverableFormat {
  id: string;
  formatType: 'markdown' | 'json' | 'pdf';
  content: string | null;
}

interface PrdContentProps {
  sessionId: string;
  workshopId: string;
  savedFormats: DeliverableFormat[] | null;
  hasFeaturePrioritization: boolean;
  hasTechSpecs: boolean;
  isReadOnly: boolean;
}

type Phase = 'ready' | 'generating' | 'done' | 'error';

export function PrdContent({
  sessionId,
  workshopId,
  savedFormats,
  hasFeaturePrioritization,
  hasTechSpecs,
  isReadOnly,
}: PrdContentProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(savedFormats ? 'done' : 'ready');
  const [formats, setFormats] = useState<DeliverableFormat[]>(savedFormats ?? []);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGenerate = useCallback(async (force = false) => {
    setPhase('generating');
    setErrorMessage('');
    try {
      const res = await fetch('/api/build-pack/generate-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, type: 'full-prd', force }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'PRD generation failed');
      }
      const data = await res.json();
      if (!data.markdown && !data.json) {
        throw new Error('PRD generation produced no content — please try again');
      }
      const newFormats: DeliverableFormat[] = [];
      if (data.markdown) newFormats.push({ id: 'prd-md', formatType: 'markdown', content: data.markdown });
      if (data.json) newFormats.push({ id: 'prd-json', formatType: 'json', content: typeof data.json === 'string' ? data.json : JSON.stringify(data.json, null, 2) });
      setFormats(newFormats);
      setPhase('done');
      toast.success('PRD generated successfully');
      router.refresh();
    } catch (err) {
      setPhase('error');
      setErrorMessage(err instanceof Error ? err.message : 'PRD generation failed');
      toast.error(err instanceof Error ? err.message : 'PRD generation failed');
    }
  }, [workshopId, router]);

  const backLink = (
    <Link
      href={`/workshop/${sessionId}/outputs`}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon name="arrow-left" className="h-3.5 w-3.5" />
      Back to Build Pack
    </Link>
  );

  // ── Read-only: show PRD or empty state ────────────────────────
  if (isReadOnly) {
    if (formats.length > 0) {
      return (
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-8 space-y-4">
            {backLink}
            <DeliverableDetailView
              title="Product Requirements Document"
              type="prd"
              formats={formats}
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
            <Icon name="file-text" className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Product Requirements Document</h2>
          <p className="text-sm text-muted-foreground">
            The PRD hasn&apos;t been generated yet.
          </p>
          {backLink}
        </div>
      </div>
    );
  }

  // ── Results view ──────────────────────────────────────────────
  if (phase === 'done' && formats.length > 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8 space-y-4">
          <div className="flex items-center justify-between">
            {backLink}
            <Button variant="outline" size="sm" onClick={() => handleGenerate(true)} className="gap-2">
              <Icon name="refresh" className="h-4 w-4" />
              Regenerate
            </Button>
          </div>
          <DeliverableDetailView
            title="Product Requirements Document"
            type="prd"
            formats={formats}
            onBack={() => router.push(`/workshop/${sessionId}/outputs`)}
          />
        </div>
      </div>
    );
  }

  // ── Generating ────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {backLink}
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Icon name="spinner" className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Generating Product Requirements Document...</p>
              <p className="text-xs text-muted-foreground">
                Synthesizing workshop data, feature prioritization, and technical specifications
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {backLink}
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Icon name="alert-circle" className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Generation failed</p>
              <p className="text-xs text-muted-foreground">
                {errorMessage || 'Something went wrong. Please try again.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPhase('ready')} className="gap-2">
              <Icon name="refresh" className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-generation view with source checklist ─────────────────
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        {backLink}

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="file-text" className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Product Requirements Document</h1>
            <p className="text-sm text-muted-foreground">
              The definitive handoff document for coding agents — combines all your workshop insights into one comprehensive PRD.
            </p>
          </div>
        </div>

        {/* Source readiness checklist */}
        <div className="rounded-xl border p-5 space-y-4">
          <h2 className="text-sm font-medium">Sources for this PRD</h2>
          <div className="space-y-3">
            <SourceItem
              icon="book-open"
              label="Workshop Data (10 steps)"
              available={true}
              description="Challenge, research, persona, journey, ideation, concept, and validation"
            />
            <SourceItem
              icon="list-ordered"
              label="Feature Prioritization"
              available={hasFeaturePrioritization}
              description={hasFeaturePrioritization
                ? 'Prioritized features will define release phases'
                : 'Generate Feature Prioritization first for release-phased features'
              }
            />
            <SourceItem
              icon="code"
              label="Technical Specifications"
              available={hasTechSpecs}
              description={hasTechSpecs
                ? 'Architecture and tech decisions will be included'
                : 'Generate Tech Specs first for technical architecture section'
              }
            />
          </div>

          {(!hasFeaturePrioritization || !hasTechSpecs) && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              You can generate the PRD now with the available sources, or generate the missing items first for a more comprehensive document.
            </p>
          )}
        </div>

        {/* Generate button */}
        <Button onClick={() => handleGenerate(false)} className="w-full gap-2 btn-lift" size="lg">
          <Icon name="sparkles" className="h-4 w-4" />
          Generate PRD
        </Button>
      </div>
    </div>
  );
}

function SourceItem({
  icon,
  label,
  available,
  description,
}: {
  icon: IconName;
  label: string;
  available: boolean;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        {available ? (
          <Icon name="check-circle" className="h-4 w-4 text-emerald-500" />
        ) : (
          <Icon name="x-circle" className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon name={icon} className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

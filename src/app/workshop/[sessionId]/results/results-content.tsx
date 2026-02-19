'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { SynthesisSummaryView, SynthesisBuildPackSection } from '@/components/workshop/synthesis-summary-view';
import { PrdViewerDialog } from '@/components/workshop/prd-viewer-dialog';
import { Button } from '@/components/ui/button';

interface ResultsContentProps {
  sessionId: string;
  workshopId: string;
  synthesisArtifact: Record<string, unknown> | null;
  prototypeUrl: string | null;
}

export function ResultsContent({
  sessionId,
  workshopId,
  synthesisArtifact,
  prototypeUrl,
}: ResultsContentProps) {
  const [showPrdDialog, setShowPrdDialog] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* Prototype link at top */}
        {prototypeUrl && (
          <a
            href={prototypeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <ExternalLink className="h-4 w-4" />
            View Prototype
          </a>
        )}

        {/* Synthesis summary (narrative, journey, confidence, next steps) */}
        {synthesisArtifact ? (
          <SynthesisSummaryView
            artifact={synthesisArtifact}
            workshopId={workshopId}
            onGeneratePrd={() => setShowPrdDialog(true)}
          />
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Workshop completed — synthesis summary is still being generated.
              </p>
              <Button variant="outline" asChild>
                <Link href={`/workshop/${sessionId}/step/10`}>
                  Go to Step 10
                </Link>
              </Button>
            </div>

            {/* Deliverables always available */}
            <SynthesisBuildPackSection
              workshopId={workshopId}
              onGeneratePrd={() => setShowPrdDialog(true)}
            />
          </div>
        )}

        <PrdViewerDialog
          open={showPrdDialog}
          onOpenChange={setShowPrdDialog}
          workshopId={workshopId}
        />
      </div>
    </div>
  );
}

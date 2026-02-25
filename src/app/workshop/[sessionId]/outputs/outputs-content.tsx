'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Code,
  Presentation,
  Users,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeliverableDetailView } from '@/components/workshop/deliverable-detail-view';
import { toast } from 'sonner';

interface DeliverableFormat {
  id: string;
  formatType: 'markdown' | 'json' | 'pdf';
  content: string | null;
}

interface Deliverable {
  type: string;
  title: string;
  formats: DeliverableFormat[];
}

interface OutputsContentProps {
  sessionId: string;
  workshopId: string;
  workshopTitle: string;
  deliverables: Deliverable[];
}

type GenerationStatus = 'idle' | 'loading' | 'done' | 'error';

const FORMAT_LABELS: Record<string, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  pdf: 'PDF',
};

/** All 4 document cards shown on the outputs page */
const DOCUMENT_CARDS = [
  {
    type: 'prd',
    title: 'Product Requirements Document',
    description:
      'Complete PRD with objectives, target users, core features, success metrics, and technical constraints — ready for development.',
    icon: <FileText className="h-5 w-5" />,
    generatable: true,
  },
  {
    type: 'tech-specs',
    title: 'Technical Specifications',
    description:
      'Architecture overview, API contracts, data models, and integration requirements derived from your concept.',
    icon: <Code className="h-5 w-5" />,
    generatable: true,
  },
  {
    type: 'stakeholder-ppt',
    title: 'Stakeholder Presentation',
    description:
      'Executive summary deck covering the problem, research insights, proposed solution, and implementation roadmap.',
    icon: <Presentation className="h-5 w-5" />,
    generatable: false,
  },
  {
    type: 'user-stories',
    title: 'User Stories',
    description:
      'Prioritized user stories with acceptance criteria, mapped to personas and journey stages from your research.',
    icon: <Users className="h-5 w-5" />,
    generatable: false,
  },
] as const;

export function OutputsContent({
  sessionId,
  workshopId,
  workshopTitle,
  deliverables,
}: OutputsContentProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [prdStatus, setPrdStatus] = useState<GenerationStatus>('idle');
  const [techSpecsStatus, setTechSpecsStatus] = useState<GenerationStatus>('idle');

  const selectedDeliverable = selectedType
    ? deliverables.find((d) => d.type === selectedType) ?? null
    : null;

  const handleGeneratePrd = useCallback(async () => {
    setPrdStatus('loading');
    try {
      const res = await fetch('/api/build-pack/generate-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, type: 'full-prd' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'PRD generation failed');
      }
      setPrdStatus('done');
      toast.success('PRD generated successfully');
      router.refresh();
    } catch (err) {
      setPrdStatus('error');
      toast.error(err instanceof Error ? err.message : 'PRD generation failed');
    }
  }, [workshopId, router]);

  const handleGenerateTechSpecs = useCallback(async () => {
    setTechSpecsStatus('loading');
    try {
      const res = await fetch('/api/build-pack/generate-tech-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Tech Specs generation failed');
      }
      setTechSpecsStatus('done');
      toast.success('Tech Specs generated successfully');
      router.refresh();
    } catch (err) {
      setTechSpecsStatus('error');
      toast.error(err instanceof Error ? err.message : 'Tech Specs generation failed');
    }
  }, [workshopId, router]);

  /** Check whether a deliverable has already been generated (exists in server data) */
  function isGenerated(type: string): boolean {
    return deliverables.some((d) => d.type === type);
  }

  function getGenerationStatus(type: string): GenerationStatus {
    if (type === 'prd') return prdStatus;
    if (type === 'tech-specs') return techSpecsStatus;
    return 'idle';
  }

  function getGenerateHandler(type: string): (() => void) | undefined {
    if (type === 'prd') return handleGeneratePrd;
    if (type === 'tech-specs') return handleGenerateTechSpecs;
    return undefined;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Build Pack</h1>
          <p className="text-muted-foreground text-sm">{workshopTitle}</p>
        </div>

        {/* Back link (only on card grid view) */}
        {!selectedDeliverable && (
          <Link
            href={`/workshop/${sessionId}/step/10`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workshop
          </Link>
        )}

        {/* Detail view or card grid */}
        {selectedDeliverable ? (
          <DeliverableDetailView
            title={selectedDeliverable.type === 'prd' ? 'Product Requirements Document' : selectedDeliverable.type === 'tech-specs' ? 'Technical Specifications' : selectedDeliverable.title}
            type={selectedDeliverable.type}
            formats={selectedDeliverable.formats}
            onBack={() => setSelectedType(null)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DOCUMENT_CARDS.map((card) => {
              const generated = isGenerated(card.type);
              const status = getGenerationStatus(card.type);
              const isLoading = status === 'loading';
              const isDone = status === 'done' || generated;
              const deliverable = deliverables.find((d) => d.type === card.type);

              // Not generatable = Coming Soon (disabled)
              if (!card.generatable) {
                return (
                  <Card
                    key={card.type}
                    className="flex flex-col justify-between gap-4 py-5 transition-all duration-150"
                  >
                    <CardHeader className="gap-3 pb-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {card.icon}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-sm">{card.title}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">
                          {card.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Coming Soon
                      </Button>
                    </CardFooter>
                  </Card>
                );
              }

              // Generatable card: generated → view details; not generated → generate button
              if (isDone && deliverable) {
                return (
                  <Card
                    key={card.type}
                    className="flex flex-col justify-between gap-4 py-5 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => setSelectedType(card.type)}
                  >
                    <CardHeader className="gap-3 pb-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {card.icon}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-sm">{card.title}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">
                          {card.description}
                        </CardDescription>
                      </div>
                      {/* Format pills */}
                      {deliverable.formats.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {deliverable.formats.map((f) => (
                            <span
                              key={f.id}
                              className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-normal text-secondary-foreground"
                            >
                              {FORMAT_LABELS[f.formatType] ?? f.formatType}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedType(card.type);
                        }}
                      >
                        View Details
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              }

              // Not yet generated — show generate button
              return (
                <Card
                  key={card.type}
                  className="flex flex-col justify-between gap-4 py-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardHeader className="gap-3 pb-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {card.icon}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-sm">{card.title}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {card.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={isLoading}
                      onClick={getGenerateHandler(card.type)}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : status === 'error' ? (
                        `Retry ${card.type === 'prd' ? 'PRD' : 'Tech Specs'}`
                      ) : (
                        `Generate ${card.type === 'prd' ? 'PRD' : 'Tech Specs'}`
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

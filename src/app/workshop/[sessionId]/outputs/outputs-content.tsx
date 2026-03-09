'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Code,
  Presentation,
  Users,
  Map as MapIcon,
  Rocket,
  ArrowRight,
  Loader2,
  Download,
  RefreshCw,
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
import { CaptureFlow } from '@/components/workshop/presentation-capture/capture-flow';
import type { StepData } from '@/components/workshop/presentation-capture/step-renderers';
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
  isReadOnly?: boolean;
}

type GenerationStatus = 'idle' | 'loading' | 'done' | 'error';

const FORMAT_LABELS: Record<string, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  pdf: 'PDF',
};

interface CardDef {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  generatable: boolean;
  navigateTo?: string;
  buttonLabel?: string;
}

interface Section {
  id: string;
  label: string;
  iconBgClass: string;
  iconTextClass: string;
  cards: CardDef[];
}

const SECTIONS: Section[] = [
  {
    id: 'business',
    label: 'Business & Product',
    iconBgClass: 'bg-amber-500/10',
    iconTextClass: 'text-amber-500',
    cards: [
      {
        type: 'stakeholder-ppt',
        title: 'Stakeholder Presentation',
        description:
          'Executive summary deck covering the problem, research insights, proposed solution, and implementation roadmap.',
        icon: <Presentation className="h-5 w-5" />,
        generatable: true,
      },
      {
        type: 'user-stories',
        title: 'User Stories',
        description:
          'Prioritized user stories with acceptance criteria, mapped to personas and journey stages from your research.',
        icon: <Users className="h-5 w-5" />,
        generatable: false,
      },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    iconBgClass: 'bg-violet-500/10',
    iconTextClass: 'text-violet-500',
    cards: [
      {
        type: 'journey-map',
        title: 'UX Journey Map',
        description:
          'Interactive roadmap mapping your concepts onto user journey stages — then generate a v0 prototype prompt.',
        icon: <MapIcon className="h-5 w-5" />,
        generatable: true,
        navigateTo: 'journey-map',
      },
      {
        type: 'prototype',
        title: 'Prototype',
        description:
          'Test your concept with real users — validate assumptions and gather feedback before building.',
        icon: <Rocket className="h-5 w-5" />,
        generatable: false,
        navigateTo: 'step/10',
        buttonLabel: 'Go to Validate',
      },
    ],
  },
  {
    id: 'development',
    label: 'Development',
    iconBgClass: 'bg-emerald-500/10',
    iconTextClass: 'text-emerald-500',
    cards: [
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
    ],
  },
];

export function OutputsContent({
  sessionId,
  workshopId,
  workshopTitle,
  deliverables,
  isReadOnly = false,
}: OutputsContentProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [prdStatus, setPrdStatus] = useState<GenerationStatus>('idle');
  const [techSpecsStatus, setTechSpecsStatus] = useState<GenerationStatus>('idle');
  const [journeyMapStatus, setJourneyMapStatus] = useState<GenerationStatus>('idle');
  const [presentationStatus, setPresentationStatus] = useState<GenerationStatus>('idle');
  const [presentationGenerated, setPresentationGenerated] = useState(
    () => deliverables.some((d) => d.type === 'stakeholder-ppt')
  );
  const [presentationProgress, setPresentationProgress] = useState('');
  const [captureStepsData, setCaptureStepsData] = useState<Record<string, StepData> | null>(null);
  const [captureTrigger, setCaptureTrigger] = useState(false);
  const captureForceRef = useRef(false);
  const [localDeliverables, setLocalDeliverables] = useState<Map<string, DeliverableFormat[]>>(new Map());

  /** Look up a deliverable from server data first, then fall back to local cache */
  function findDeliverable(type: string): Deliverable | null {
    const server = deliverables.find((d) => d.type === type);
    if (server) return server;
    const local = localDeliverables.get(type);
    if (local && local.length > 0) {
      const titleMap: Record<string, string> = {
        prd: 'Product Requirements Document',
        'tech-specs': 'Technical Specifications',
        'stakeholder-ppt': 'Stakeholder Presentation',
      };
      return {
        type,
        title: titleMap[type] || type,
        formats: local,
      };
    }
    return null;
  }

  const selectedDeliverable = selectedType
    ? findDeliverable(selectedType)
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
      const data = await res.json();
      // Validate that we actually got content back
      if (!data.markdown && !data.json) {
        throw new Error('PRD generation produced no content — please try again');
      }
      // Cache locally so card updates immediately (no waiting for router.refresh)
      const formats: DeliverableFormat[] = [];
      if (data.markdown) formats.push({ id: 'local-prd-md', formatType: 'markdown', content: data.markdown });
      if (data.json) formats.push({ id: 'local-prd-json', formatType: 'json', content: typeof data.json === 'string' ? data.json : JSON.stringify(data.json) });
      setLocalDeliverables(prev => {
        const next = new Map(prev);
        next.set('prd', formats);
        return next;
      });
      setPrdStatus('done');
      toast.success('PRD generated successfully');
      // Auto-navigate to detail view so user can immediately see the PRD
      setSelectedType('prd');
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
      const data = await res.json();
      if (!data.markdown && !data.json) {
        throw new Error('Tech Specs generation produced no content — please try again');
      }
      // Cache locally so card updates immediately
      const formats: DeliverableFormat[] = [];
      if (data.markdown) formats.push({ id: 'local-ts-md', formatType: 'markdown', content: data.markdown });
      if (data.json) formats.push({ id: 'local-ts-json', formatType: 'json', content: typeof data.json === 'string' ? data.json : JSON.stringify(data.json) });
      setLocalDeliverables(prev => {
        const next = new Map(prev);
        next.set('tech-specs', formats);
        return next;
      });
      setTechSpecsStatus('done');
      toast.success('Tech Specs generated successfully');
      setSelectedType('tech-specs');
      router.refresh();
    } catch (err) {
      setTechSpecsStatus('error');
      toast.error(err instanceof Error ? err.message : 'Tech Specs generation failed');
    }
  }, [workshopId, router]);

  const handleGenerateJourneyMap = useCallback(async () => {
    setJourneyMapStatus('loading');
    try {
      const res = await fetch('/api/build-pack/generate-journey-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Journey map generation failed');
      }
      setJourneyMapStatus('done');
      toast.success('Journey map generated');
      router.push(`/workshop/${sessionId}/outputs/journey-map`);
    } catch (err) {
      setJourneyMapStatus('error');
      toast.error(err instanceof Error ? err.message : 'Journey map generation failed');
    }
  }, [workshopId, sessionId, router]);

  const handleGeneratePresentation = useCallback(async (force = false) => {
    setPresentationStatus('loading');
    setPresentationProgress('Fetching canvas data...');
    captureForceRef.current = force;

    try {
      // Step 1: Fetch canvas data
      const canvasRes = await fetch(`/api/build-pack/canvas-data?workshopId=${workshopId}`);
      if (!canvasRes.ok) {
        throw new Error('Failed to fetch canvas data');
      }
      const canvasData = await canvasRes.json();
      const stepsData = canvasData.steps as Record<string, StepData>;

      setPresentationProgress('Capturing step visuals...');

      // Step 2: Set up capture flow
      setCaptureStepsData(stepsData);
      setCaptureTrigger(true);
    } catch (err) {
      setPresentationStatus('error');
      setPresentationProgress('');
      toast.error(err instanceof Error ? err.message : 'Presentation generation failed');
    }
  }, [workshopId]);

  /** Called when capture flow finishes capturing all step images */
  const handleCaptureComplete = useCallback(async (images: Record<string, string>) => {
    setCaptureTrigger(false);
    setCaptureStepsData(null);
    setPresentationProgress('Building presentation...');

    try {
      // Step 3: Send images to API to build PPTX
      const res = await fetch('/api/build-pack/generate-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          stepImages: images,
          force: captureForceRef.current,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Presentation generation failed');
      }

      // Response is binary PPTX — trigger download
      const blob = await res.blob();
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'Stakeholder-Presentation.pptx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPresentationStatus('done');
      setPresentationGenerated(true);
      setPresentationProgress('');
      toast.success('Presentation downloaded successfully');
    } catch (err) {
      setPresentationStatus('error');
      setPresentationProgress('');
      toast.error(err instanceof Error ? err.message : 'Presentation generation failed');
    }
  }, [workshopId]);

  const handleCaptureError = useCallback((error: Error) => {
    setCaptureTrigger(false);
    setCaptureStepsData(null);
    setPresentationStatus('error');
    setPresentationProgress('');
    toast.error(`Capture failed: ${error.message}`);
  }, []);

  /** Check whether a deliverable has already been generated (server data or local cache) */
  function isGenerated(type: string): boolean {
    return findDeliverable(type) !== null;
  }

  function getGenerationStatus(type: string): GenerationStatus {
    if (type === 'prd') return prdStatus;
    if (type === 'tech-specs') return techSpecsStatus;
    if (type === 'journey-map') return journeyMapStatus;
    if (type === 'stakeholder-ppt') return presentationStatus;
    return 'idle';
  }

  function getGenerateHandler(type: string): (() => void) | undefined {
    if (type === 'prd') return handleGeneratePrd;
    if (type === 'tech-specs') return handleGenerateTechSpecs;
    if (type === 'journey-map') return handleGenerateJourneyMap;
    if (type === 'stakeholder-ppt') return () => handleGeneratePresentation(false);
    return undefined;
  }

  function handleCardClick(card: CardDef) {
    if (card.navigateTo) {
      if (card.navigateTo === 'journey-map') {
        router.push(`/workshop/${sessionId}/outputs/journey-map`);
      } else {
        router.push(`/workshop/${sessionId}/${card.navigateTo}`);
      }
    } else {
      setSelectedType(card.type);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hidden capture flow for presentation image generation */}
      {captureStepsData && (
        <CaptureFlow
          stepsData={captureStepsData}
          trigger={captureTrigger}
          onProgress={(current, total, stepName) => {
            setPresentationProgress(`Capturing step ${current} of ${total}...`);
          }}
          onComplete={handleCaptureComplete}
          onError={handleCaptureError}
        />
      )}
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Build Pack</h1>
          <p className="text-muted-foreground text-sm">{workshopTitle}</p>
        </div>

        {/* Back link (only on card grid view, hidden for read-only guests) */}
        {!selectedDeliverable && !isReadOnly && (
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
          <div className="space-y-10">
            {SECTIONS.map((section) => (
              <div key={section.id} className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {section.cards.map((card) => {
                    const generated = isGenerated(card.type);
                    const status = getGenerationStatus(card.type);
                    const isLoading = status === 'loading';
                    const isDone = status === 'done' || generated;
                    const deliverable = findDeliverable(card.type);

                    // Navigational card (not generatable but has navigateTo) e.g. Prototype
                    if (!card.generatable && card.navigateTo) {
                      return (
                        <Card
                          key={card.type}
                          className="flex flex-col justify-between gap-4 py-5 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                          onClick={() => handleCardClick(card)}
                        >
                          <CardHeader className="gap-3 pb-0">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${section.iconBgClass} ${section.iconTextClass}`}>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(card);
                              }}
                            >
                              {card.buttonLabel ?? 'Go'}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    }

                    // Not generatable = Coming Soon (disabled)
                    if (!card.generatable) {
                      return (
                        <Card
                          key={card.type}
                          className="flex flex-col justify-between gap-4 py-5 transition-all duration-150"
                        >
                          <CardHeader className="gap-3 pb-0">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${section.iconBgClass} ${section.iconTextClass}`}>
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

                    // Presentation card: download-only (no detail view)
                    if (card.type === 'stakeholder-ppt' && (presentationGenerated || presentationStatus === 'done')) {
                      return (
                        <Card
                          key={card.type}
                          className="flex flex-col justify-between gap-4 py-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <CardHeader className="gap-3 pb-0">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${section.iconBgClass} ${section.iconTextClass}`}>
                              {card.icon}
                            </div>
                            <div className="space-y-1">
                              <CardTitle className="text-sm">{card.title}</CardTitle>
                              <CardDescription className="text-xs leading-relaxed">
                                {card.description}
                              </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-normal text-secondary-foreground">
                                PPTX
                              </span>
                            </div>
                          </CardHeader>
                          <CardFooter className="flex gap-2 pt-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              disabled={isLoading}
                              onClick={() => handleGeneratePresentation(false)}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {presentationProgress || 'Generating...'}
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4" />
                                  Download Again
                                </>
                              )}
                            </Button>
                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleGeneratePresentation(true)}
                                title="Regenerate with fresh AI content"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
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
                          onClick={() => handleCardClick(card)}
                        >
                          <CardHeader className="gap-3 pb-0">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${section.iconBgClass} ${section.iconTextClass}`}>
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
                                handleCardClick(card);
                              }}
                            >
                              View Details
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    }

                    // Not yet generated — show generate button (or disabled for read-only guests)
                    return (
                      <Card
                        key={card.type}
                        className={`flex flex-col justify-between gap-4 py-5 transition-all duration-150 ${isReadOnly ? '' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                      >
                        <CardHeader className="gap-3 pb-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${section.iconBgClass} ${section.iconTextClass}`}>
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
                          {isReadOnly ? (
                            <Button variant="outline" size="sm" className="w-full" disabled>
                              Not yet generated
                            </Button>
                          ) : (
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
                                  {card.type === 'stakeholder-ppt' && presentationProgress ? presentationProgress : 'Generating...'}
                                </>
                              ) : status === 'error' ? (
                                `Retry ${card.type === 'prd' ? 'PRD' : card.type === 'journey-map' ? 'Journey Map' : card.type === 'stakeholder-ppt' ? 'Presentation' : 'Tech Specs'}`
                              ) : (
                                `Generate ${card.type === 'prd' ? 'PRD' : card.type === 'journey-map' ? 'Journey Map' : card.type === 'stakeholder-ppt' ? 'Presentation' : 'Tech Specs'}`
                              )}
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

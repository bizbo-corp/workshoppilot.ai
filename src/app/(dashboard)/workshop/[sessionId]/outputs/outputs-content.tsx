'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heading, Eyebrow } from '@/components/ui/typography';
import { DeliverableDetailView } from '@/components/workshop/deliverable-detail-view';
import { ValidationPlanDeliverable } from '@/components/workshop/validate/ValidationPlanDeliverable';
import { WorkshopHeader } from '@/components/layout/workshop-header';
import { WorkshopSummaryTile, type WorkshopSynthesis } from '@/components/workshop/workshop-summary-tile';
import { StepJumpDialog } from '@/components/dialogs/step-jump-dialog';
import { useBuildPackNav } from '@/components/layout/build-pack-nav-context';
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
  workshopColor?: string | null;
  workshopEmoji?: string | null;
  workshopType?: 'solo' | 'multiplayer';
  isWorkshopOwner?: boolean;
  isAdmin?: boolean;
  deliverables: Deliverable[];
  isReadOnly?: boolean;
  /** Validate-step synthesis (narrative / step summaries / confidence / next steps), if any. */
  synthesis?: Record<string, unknown> | null;
  /** Journey Flow marked complete — threads through to ValidationPlanDeliverable so the
   *  prototype-builder link is active in the Build Pack the same way it is on the Validate step. */
  journeyFlowApproved?: boolean;
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
  /** Hidden from the storefront but still wired — the generator/route stays
   *  intact because other deliverables (PRD, Tech Specs, Prototype) depend on it. */
  hidden?: boolean;
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
        icon: <Icon name="presentation" className="h-5 w-5" />,
        generatable: true,
        hidden: true,
      },
      {
        type: 'feature-prioritization',
        title: 'Feature Prioritization',
        description:
          'AI-generated prioritized feature list with drag-and-drop reordering, derived from your journey map and concepts.',
        icon: <Icon name="list-ordered" className="h-5 w-5" />,
        generatable: true,
        navigateTo: 'feature-prioritization',
        hidden: true,
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
        title: 'Journey Flow',
        description:
          'AI-generated user journey flow for your digital product — edit the screens, mark it complete, then build a prototype prompt.',
        icon: <Icon name="workflow" className="h-5 w-5" />,
        generatable: false,
        navigateTo: 'journey-flow',
        buttonLabel: 'Open Journey Flow',
      },
      {
        type: 'prototype',
        title: 'Prototype',
        description:
          'Test your concept with real users — validate assumptions and gather feedback before building.',
        icon: <Icon name="rocket" className="h-5 w-5" />,
        generatable: false,
        navigateTo: 'step/validate',
        buttonLabel: 'Go to Validate',
      },
      {
        type: 'validation-plan',
        title: 'Validation Plan',
        description:
          'Your riskiest assumption, the cheapest valid test, and a pre-committed success signal — with a score once you record results.',
        icon: <Icon name="clipboard-check" className="h-5 w-5" />,
        generatable: true,
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
        type: 'tech-specs',
        title: 'Technical Specifications',
        description:
          'Architecture overview, API contracts, data models, and integration requirements derived from your concept.',
        icon: <Icon name="code" className="h-5 w-5" />,
        generatable: true,
        navigateTo: 'tech-specs',
      },
      {
        type: 'prd',
        title: 'Product Requirements Document',
        description:
          'The definitive handoff document — combines feature prioritization, technical specifications, and all workshop insights into a complete PRD for coding agents.',
        icon: <Icon name="file-text" className="h-5 w-5" />,
        generatable: true,
        navigateTo: 'prd',
      },
    ],
  },
];

export function OutputsContent({
  sessionId,
  workshopId,
  workshopTitle,
  workshopColor,
  workshopEmoji,
  workshopType = 'solo',
  isWorkshopOwner = false,
  isAdmin = false,
  deliverables,
  isReadOnly = false,
  synthesis = null,
  journeyFlowApproved = false,
}: OutputsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { info: buildPackNav } = useBuildPackNav();
  // ?view=<type> deep-links a deliverable detail (used by the dashboard sidebar)
  const viewParam = searchParams.get('view');
  const [selectedType, setSelectedType] = useState<string | null>(viewParam);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  useEffect(() => {
    setSelectedType(viewParam);
  }, [viewParam]);
  const prdStatus: GenerationStatus = 'idle';
  const techSpecsStatus: GenerationStatus = 'idle';
  const [featurePrioritizationStatus, setFeaturePrioritizationStatus] = useState<GenerationStatus>('idle');
  const [presentationStatus, setPresentationStatus] = useState<GenerationStatus>('idle');
  const [presentationGenerated, setPresentationGenerated] = useState(
    () => deliverables.some((d) => d.type === 'stakeholder-ppt')
  );
  const [presentationProgress, setPresentationProgress] = useState('');
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

  // PRD generation is now handled by the dedicated page at /outputs/prd
  // Tech specs generation is now handled by the wizard page at /outputs/tech-specs

  const handleGenerateFeaturePrioritization = useCallback(async () => {
    setFeaturePrioritizationStatus('loading');
    try {
      const res = await fetch('/api/build-pack/generate-feature-prioritization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Feature prioritization generation failed');
      }
      setFeaturePrioritizationStatus('done');
      toast.success('Feature prioritization generated');
      router.push(`/workshop/${sessionId}/outputs/feature-prioritization`);
    } catch (err) {
      setFeaturePrioritizationStatus('error');
      toast.error(err instanceof Error ? err.message : 'Feature prioritization generation failed');
    }
  }, [workshopId, sessionId, router]);

  const handleGeneratePresentation = useCallback(async (force = false) => {
    setPresentationStatus('loading');
    setPresentationProgress('Building presentation...');
    captureForceRef.current = force;

    try {
      // Send request without stepImages — server uses stored snapshots
      const res = await fetch('/api/build-pack/generate-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId, force }),
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


  /** Check whether a deliverable has already been generated (server data or local cache) */
  function isGenerated(type: string): boolean {
    return findDeliverable(type) !== null;
  }

  function getGenerationStatus(type: string): GenerationStatus {
    if (type === 'prd') return prdStatus;
    if (type === 'tech-specs') return techSpecsStatus;
    if (type === 'feature-prioritization') return featurePrioritizationStatus;
    if (type === 'stakeholder-ppt') return presentationStatus;
    return 'idle';
  }

  function getGenerateHandler(type: string): (() => void) | undefined {
    if (type === 'prd') return () => router.push(`/workshop/${sessionId}/outputs/prd`);
    if (type === 'tech-specs') return () => router.push(`/workshop/${sessionId}/outputs/tech-specs`);
    if (type === 'feature-prioritization') return handleGenerateFeaturePrioritization;
    if (type === 'stakeholder-ppt') return () => handleGeneratePresentation(false);
    if (type === 'validation-plan') return () => router.push(`/workshop/${sessionId}/step/validate`);
    return undefined;
  }

  function handleCardClick(card: CardDef) {
    if (card.navigateTo) {
      if (card.navigateTo === 'journey-flow' || card.navigateTo === 'journey-map' || card.navigateTo === 'feature-prioritization' || card.navigateTo === 'tech-specs' || card.navigateTo === 'prd') {
        router.push(`/workshop/${sessionId}/outputs/${card.navigateTo}`);
      } else {
        router.push(`/workshop/${sessionId}/${card.navigateTo}`);
      }
    } else {
      setSelectedType(card.type);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: workshop name + "Build Pack" breadcrumb + Exit to Dashboard.
          Desktop only — on mobile the workshop layout already renders the header. */}
      <div className="hidden md:block">
        <WorkshopHeader
          sessionId={sessionId}
          workshopId={workshopId}
          workshopName={workshopTitle}
          workshopColor={workshopColor}
          workshopEmoji={workshopEmoji}
          workshopType={workshopType}
          isFacilitator={isWorkshopOwner}
          isWorkshopOwner={isWorkshopOwner}
          isAdmin={isAdmin}
          breadcrumbTail="Build Pack"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
          {/* Page heading */}
          <div className="space-y-1">
            <Heading level={1} as="h1" className="font-serif text-3xl font-normal leading-[1.1] tracking-tight sm:text-3xl">Build Pack</Heading>
          </div>

        {/* Detail view or card grid */}
        {selectedDeliverable ? (
          selectedDeliverable.type === 'validation-plan' ? (
            <ValidationPlanDeliverable
              workshopId={workshopId}
              sessionId={sessionId}
              journeyFlowApproved={journeyFlowApproved}
              isReadOnly={isReadOnly}
              onBack={() => setSelectedType(null)}
            />
          ) : (
            <DeliverableDetailView
              title={selectedDeliverable.type === 'prd' ? 'Product Requirements Document' : selectedDeliverable.type === 'tech-specs' ? 'Technical Specifications' : selectedDeliverable.title}
              type={selectedDeliverable.type}
              formats={selectedDeliverable.formats}
              onBack={() => setSelectedType(null)}
            />
          )
        ) : (
          <div className="space-y-10">
            {/* Workshop summary tile — score + a few lines, expandable to the full synthesis. */}
            {synthesis &&
              (typeof synthesis.narrativeIntro === 'string' ||
                (Array.isArray(synthesis.stepSummaries) && synthesis.stepSummaries.length > 0)) && (
                <WorkshopSummaryTile
                  synthesis={synthesis as WorkshopSynthesis}
                  workshopId={workshopId}
                  onBackToWorkshop={isReadOnly ? undefined : () => setStepDialogOpen(true)}
                />
              )}
            {SECTIONS.filter((section) => section.cards.some((c) => !c.hidden)).map((section) => (
              <div key={section.id} className="space-y-4">
                <Eyebrow>{section.label}</Eyebrow>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {section.cards.filter((c) => !c.hidden).map((card) => {
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
                              <Icon name="arrow-right" className="h-4 w-4" />
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
                                  <Icon name="spinner" className="h-4 w-4 animate-spin" />
                                  {presentationProgress || 'Generating...'}
                                </>
                              ) : (
                                <>
                                  <Icon name="download" className="h-4 w-4" />
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
                                <Icon name="refresh" className="h-4 w-4" />
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
                              {card.navigateTo
                                ? `View ${card.type === 'prd' ? 'PRD' : card.type === 'tech-specs' ? 'Tech Specs' : card.type === 'feature-prioritization' ? 'Features' : 'Details'}`
                                : 'View Details'}
                              <Icon name="arrow-right" className="h-4 w-4" />
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
                                  <Icon name="spinner" className="h-4 w-4 animate-spin" />
                                  {card.type === 'stakeholder-ppt' && presentationProgress ? presentationProgress : 'Generating...'}
                                </>
                              ) : status === 'error' ? (
                                `Retry ${card.type === 'prd' ? 'PRD' : card.type === 'feature-prioritization' ? 'Features' : card.type === 'stakeholder-ppt' ? 'Presentation' : 'Tech Specs'}`
                              ) : (
                                `Generate ${card.type === 'prd' ? 'PRD' : card.type === 'feature-prioritization' ? 'Features' : card.type === 'stakeholder-ppt' ? 'Presentation' : 'Tech Specs'}`
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

      {/* "Back to Workshop" step picker (steps published by the outputs layout) */}
      <StepJumpDialog
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
        sessionId={sessionId}
        steps={buildPackNav?.steps ?? []}
      />
    </div>
  );
}

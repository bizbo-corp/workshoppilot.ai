'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import type { UIMessage } from 'ai';
import { ChatPanel } from './chat-panel';
import { RightPanel } from './right-panel';
import { SynthesisBuildPackSection } from './synthesis-summary-view';
import { MobileTabBar } from './mobile-tab-bar';
import { StepNavigation } from './step-navigation';
import { ResetStepDialog } from '@/components/dialogs/reset-step-dialog';
import { PrdViewerDialog } from './prd-viewer-dialog';
import { IdeationSubStepContainer } from './ideation-sub-step-container';
import { MessageSquare, LayoutGrid, PanelLeftClose, PanelRightClose, GripVertical, Loader2 } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { resetStep, updateStepStatus } from '@/actions/workshop-actions';
import { getStepByOrder, STEP_CONFIRM_LABELS, STEP_CONFIRM_MIN_ITEMS, areAllPersonasInterviewed } from '@/lib/workshop/step-metadata';
import { fireConfetti } from '@/lib/utils/confetti';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { CanvasWrapper } from '@/components/canvas/canvas-wrapper';
import { ConceptCanvasOverlay } from './concept-canvas-overlay';
import { GuideEditPopover } from '@/components/canvas/guide-edit-popover';
import { useAdminGuides } from '@/hooks/use-admin-guides';
import { usePanelLayout } from '@/hooks/use-panel-layout';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';
import type { StepCanvasSettingsData } from '@/lib/canvas/step-canvas-settings-types';

const CANVAS_ENABLED_STEPS = ['challenge', 'stakeholder-mapping', 'user-research', 'sense-making', 'persona', 'journey-mapping', 'reframe', 'concept'];
const CANVAS_ONLY_STEPS = ['stakeholder-mapping', 'sense-making', 'concept'];

interface StepContainerProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  hmwStatement?: string;
  step8SelectedSlotIds?: string[];
  step8Crazy8sSlots?: Array<{ slotId: string; title: string; imageUrl?: string }>;
  isAdmin?: boolean;
  billboardHero?: { headline: string; subheadline: string; cta: string };
  canvasGuides?: CanvasGuideData[];
  canvasSettings?: StepCanvasSettingsData | null;
}

export function StepContainer({
  stepOrder,
  sessionId,
  workshopId,
  initialMessages,
  initialArtifact,
  stepStatus,
  hmwStatement,
  step8SelectedSlotIds,
  step8Crazy8sSlots,
  isAdmin,
  billboardHero,
  canvasGuides,
  canvasSettings,
}: StepContainerProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<'chat' | 'canvas'>('chat');
  const { chatCollapsed, canvasCollapsed, setChatCollapsed, setCanvasCollapsed } = usePanelLayout();

  // Artifact confirmation state
  // For complete steps: pre-set confirmed (artifact was already confirmed)
  // For needs_regeneration: not confirmed (needs re-confirmation after revision)
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(
    stepStatus === 'complete' && initialArtifact !== null
  );

  // Canvas step detection — canvas steps skip extraction
  const step = getStepByOrder(stepOrder);
  const isCanvasStep = step ? CANVAS_ENABLED_STEPS.includes(step.id) : false;
  const postIts = useCanvasStore((s) => s.postIts);
  const conceptCards = useCanvasStore((s) => s.conceptCards);
  const hmwCards = useCanvasStore((s) => s.hmwCards);
  const setPostIts = useCanvasStore((s) => s.setPostIts);
  const setDrawingNodes = useCanvasStore((s) => s.setDrawingNodes);
  const setCrazy8sSlots = useCanvasStore((s) => s.setCrazy8sSlots);
  const setMindMapState = useCanvasStore((s) => s.setMindMapState);
  const setConceptCards = useCanvasStore((s) => s.setConceptCards);
  const setGridColumns = useCanvasStore((s) => s.setGridColumns);
  const setSelectedSlotIds = useCanvasStore((s) => s.setSelectedSlotIds);
  const setBrainRewritingMatrices = useCanvasStore((s) => s.setBrainRewritingMatrices);
  // HMW card counts as "content" only when all 4 fields are filled (card is 'filled')
  const hmwCardComplete = hmwCards.some((c) => c.cardState === 'filled');
  const canvasHasContent = postIts.some(p => !p.templateKey || p.text.trim().length > 0) || conceptCards.length > 0 || hmwCardComplete;

  // For canvas steps, activity is "confirmed" when post-its exist (no extraction needed)
  const effectiveConfirmed = isCanvasStep ? canvasHasContent : artifactConfirmed;

  // In-chat accept button: show when step has a confirm label, canvas has enough content, and user hasn't clicked Accept yet
  const confirmLabel = step ? STEP_CONFIRM_LABELS[step.id] : undefined;
  const minItems = step ? (STEP_CONFIRM_MIN_ITEMS[step.id] ?? 1) : 1;
  const canvasItemCount = postIts.length + conceptCards.length + (hmwCardComplete ? 1 : 0);
  const allPersonasInterviewed = step?.id === 'user-research'
    ? areAllPersonasInterviewed(postIts)
    : true;
  const showConfirm = !!confirmLabel && !artifactConfirmed && canvasHasContent
    && canvasItemCount >= minItems && allPersonasInterviewed;

  // Fire confetti when user clicks Accept (not on auto-confirm from canvas content)
  const prevConfirmed = React.useRef(artifactConfirmed);
  React.useEffect(() => {
    if (artifactConfirmed && !prevConfirmed.current) {
      fireConfetti();
    }
    prevConfirmed.current = artifactConfirmed;
  }, [artifactConfirmed]);

  // Local messages state — allows clearing before ChatPanel re-mounts on reset
  const [localMessages, setLocalMessages] = React.useState(initialMessages);

  // Sync from server when navigating between steps
  React.useEffect(() => {
    setLocalMessages(initialMessages);
  }, [stepOrder]);

  // Admin guide editing state
  const [isGuideEditing, setIsGuideEditing] = React.useState(false);
  const [editingPopover, setEditingPopover] = React.useState<{
    guide: CanvasGuideData;
    position: { x: number; y: number };
  } | null>(null);

  // Local guide state — initialized from server prop, synced when editing toggles off.
  // Without this, toggling guides off reverts to stale server-loaded data.
  const [localCanvasGuides, setLocalCanvasGuides] = React.useState(canvasGuides);

  // Lift useAdminGuides hook for live preview + popover operations
  const adminGuides = useAdminGuides(step?.id || '');

  const handleToggleGuideEditor = React.useCallback(() => {
    setIsGuideEditing(prev => {
      const next = !prev;
      if (!next) {
        // Turning off editing — flush pending API writes and sync local state
        adminGuides.flushAll();
        setLocalCanvasGuides(adminGuides.guides);
        setEditingPopover(null);
      }
      return next;
    });
  }, [adminGuides]);

  const handleEditGuide = React.useCallback((guide: CanvasGuideData, position: { x: number; y: number }) => {
    setEditingPopover({ guide, position });
  }, []);

  const handleAddGuide = React.useCallback(async (position: { x: number; y: number }) => {
    const created = await adminGuides.createGuide();
    if (created) {
      setEditingPopover({ guide: created, position });
    }
  }, [adminGuides]);

  const handleUpdateGuide = React.useCallback((guideId: string, updates: Partial<CanvasGuideData>) => {
    adminGuides.updateGuide(guideId, updates);
    // Update the popover's guide state for live preview within the popover
    setEditingPopover(prev =>
      prev && prev.guide.id === guideId
        ? { ...prev, guide: { ...prev.guide, ...updates } }
        : prev
    );
  }, [adminGuides]);

  const handleDeleteGuide = React.useCallback(async (guideId: string) => {
    await adminGuides.deleteGuide(guideId);
    setEditingPopover(null);
  }, [adminGuides]);

  // Canvas ref for reading viewport (Save Default View)
  const canvasRef = React.useRef<{ getViewport: () => { x: number; y: number; zoom: number } }>(null);

  // Handle "Save Default View" — reads current viewport, converts to center-offset, saves via API
  const handleSaveDefaultView = React.useCallback(async () => {
    if (!canvasRef.current || !step) return;
    const vp = canvasRef.current.getViewport();
    // Convert to center-offset: subtract container center to get offset values
    const container = document.querySelector('.react-flow');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const offsetX = Math.round(vp.x - rect.width / 2);
    const offsetY = Math.round(vp.y - rect.height / 2);

    try {
      const res = await fetch('/api/admin/canvas-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: step.id,
          defaultZoom: Math.round(vp.zoom * 100) / 100,
          defaultX: offsetX,
          defaultY: offsetY,
          viewportMode: 'center-offset',
        }),
      });
      if (res.ok) {
        toast.success('Default view saved');
      } else {
        toast.error('Failed to save default view');
      }
    } catch (err) {
      console.error('Failed to save default view:', err);
      toast.error('Failed to save default view');
    }
  }, [step]);

  // Handle guide position updates from canvas drag — updates local state + debounced PATCH
  const handleGuidePositionUpdate = React.useCallback((guideId: string, x: number, y: number) => {
    adminGuides.updateGuide(guideId, { canvasX: x, canvasY: y });
  }, [adminGuides]);

  // Handle guide size updates from canvas resize — updates local state + debounced PATCH
  const handleGuideSizeUpdate = React.useCallback((guideId: string, width: number, height: number, x: number, y: number) => {
    adminGuides.updateGuide(guideId, { width, height, canvasX: x, canvasY: y });
  }, [adminGuides]);

  // PRD viewer dialog state
  const [showPrdDialog, setShowPrdDialog] = React.useState(false);

  // Step 10: client-side extraction state
  const [step10Artifact, setStep10Artifact] = React.useState<Record<string, unknown> | null>(
    stepOrder === 10 ? (initialArtifact || null) : null
  );
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(null);
  const [step10MessageCount, setStep10MessageCount] = React.useState(0);

  // Step 10: extraction handler — extracts synthesis artifact and marks step complete
  const handleStep10Extract = React.useCallback(async () => {
    if (stepOrder !== 10 || !step || isExtracting || step10Artifact) return;

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          stepId: step.id,
          sessionId,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        // Response body wasn't JSON
      }

      if (!res.ok) {
        console.warn('Step 10 extract API error:', res.status, data);
        throw new Error(
          (data?.message as string) || (data?.error as string) || `Extraction failed (${res.status})`
        );
      }

      setStep10Artifact(data.artifact as Record<string, unknown>);

      // Mark step 10 as complete
      await updateStepStatus(workshopId, step.id, 'complete', sessionId);
    } catch (error) {
      console.error('Step 10 extraction failed:', error);
      setExtractionError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsExtracting(false);
    }
  }, [stepOrder, step, isExtracting, step10Artifact, workshopId, sessionId]);

  // Step 10: auto-extract on mount when conversation already exists
  const hasAutoExtracted = React.useRef(false);
  React.useEffect(() => {
    if (
      stepOrder === 10 &&
      !step10Artifact &&
      !isExtracting &&
      !hasAutoExtracted.current
    ) {
      // Auto-extract if we have initial messages from DB (returning user)
      // or if enough live messages accumulated (new session)
      const hasEnoughInitial = (initialMessages?.length ?? 0) >= 4;
      const hasEnoughLive = step10MessageCount >= 6;

      if (hasEnoughInitial || hasEnoughLive) {
        hasAutoExtracted.current = true;
        // Small delay to avoid Gemini rate limits from the preceding chat conversation
        const timer = setTimeout(() => handleStep10Extract(), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [stepOrder, step10Artifact, isExtracting, initialMessages?.length, step10MessageCount, handleStep10Extract]);

  // Reset dialog state
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  // Reset key forces ChatPanel/IdeationSubStepContainer to re-mount (clearing useChat state)
  const [resetKey, setResetKey] = React.useState(0);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset mobile tab to 'chat' when navigating between steps
  React.useEffect(() => {
    setMobileTab('chat');
  }, [stepOrder]);

  // Handle reset (clear data and full forward wipe)
  const handleReset = React.useCallback(async () => {
    try {
      setIsResetting(true);
      const step = getStepByOrder(stepOrder);
      if (!step) {
        console.error('Step not found for reset');
        return;
      }
      await resetStep(workshopId, step.id, sessionId);
      setShowResetDialog(false);
      // Reset local state
      setArtifactConfirmed(false);
      setLocalMessages([]);
      // Clear Step 10 extraction state
      setStep10Artifact(null);
      hasAutoExtracted.current = false;
      // Clear canvas/whiteboard state
      setPostIts([]);
      setDrawingNodes([]);
      setCrazy8sSlots([]);
      setMindMapState([], []);
      setConceptCards([]);
      setGridColumns([]);
      setSelectedSlotIds([]);
      setBrainRewritingMatrices([]);
      // Force re-mount of ChatPanel/IdeationSubStepContainer to clear useChat state
      setResetKey(prev => prev + 1);
      // Refresh page to reload with cleared server state
      router.refresh();
    } catch (error) {
      console.error('Failed to reset step:', error);
    } finally {
      setIsResetting(false);
    }
  }, [workshopId, stepOrder, sessionId, router, setPostIts, setDrawingNodes, setCrazy8sSlots, setMindMapState, setConceptCards, setGridColumns, setSelectedSlotIds, setBrainRewritingMatrices]);

  // Step 10: render Build Pack deliverable cards + extraction status
  // Synthesis summary (narrative, journey, confidence, next steps) lives on the results page
  const renderStep10Content = () => (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="space-y-8">
        {/* Extraction status banner — non-blocking */}
        {isExtracting && (
          <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">
              Generating synthesis summary...
            </p>
          </div>
        )}
        {extractionError && (
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-muted-foreground">
              Summary generation failed — you can still generate your Build Pack below.
            </p>
            <button
              onClick={() => {
                hasAutoExtracted.current = false;
                setExtractionError(null);
                handleStep10Extract();
              }}
              className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Build Pack deliverables — always available */}
        <SynthesisBuildPackSection
          workshopId={workshopId}
          onGeneratePrd={() => setShowPrdDialog(true)}
        />
      </div>
      <PrdViewerDialog
        open={showPrdDialog}
        onOpenChange={setShowPrdDialog}
        workshopId={workshopId}
      />
    </div>
  );

  // Step 8 uses specialized sub-step container
  if (stepOrder === 8) {
    return (
      <>
        <IdeationSubStepContainer
          key={resetKey}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={localMessages}
          initialArtifact={initialArtifact}
          stepStatus={stepStatus}
          isAdmin={isAdmin}
          onReset={() => setShowResetDialog(true)}
          hmwStatement={hmwStatement}
        />
        <ResetStepDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          onConfirm={handleReset}
          isResetting={isResetting}
          stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
        />
      </>
    );
  }

  // Render content section
  const renderContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      {!isMobile && (
        <div className="flex justify-end px-2 pt-2">
          <button
            onClick={() => setChatCollapsed(true)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Collapse chat"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ChatPanel
          key={resetKey}
          stepOrder={stepOrder}
          sessionId={sessionId}
          workshopId={workshopId}
          initialMessages={localMessages}
          onMessageCountChange={stepOrder === 10 ? setStep10MessageCount : undefined}
          showStepConfirm={showConfirm}
          onStepConfirm={() => setArtifactConfirmed(true)}
          onStepRevise={() => setArtifactConfirmed(false)}
          stepConfirmLabel={confirmLabel}
        />
      </div>
    </div>
  );


  // Mobile: tab-based layout
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        {/* Content area - show one panel at a time */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* Both panels mounted, visibility toggled with CSS for instant switching */}
          <div className={cn('h-full', mobileTab !== 'chat' && 'hidden')}>
            {renderContent()}
          </div>
          <div className={cn('h-full', mobileTab !== 'canvas' && 'hidden')}>
            {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
              <div className="h-full relative">
                <CanvasWrapper
                  sessionId={sessionId}
                  stepId={step.id}
                  workshopId={workshopId}
                  canvasGuides={isGuideEditing ? adminGuides.guides : localCanvasGuides}
                  isAdmin={isAdmin}
                  isAdminEditing={isGuideEditing}
                  onEditGuide={handleEditGuide}
                  onAddGuide={handleAddGuide}
                  onGuidePositionUpdate={handleGuidePositionUpdate}
                  onGuideSizeUpdate={handleGuideSizeUpdate}
                />
                {step.id === 'concept' && (
                  <ConceptCanvasOverlay
                    workshopId={workshopId}
                    stepId={step.id}
                    selectedSketchSlotIds={step8SelectedSlotIds}
                    crazy8sSlots={step8Crazy8sSlots}
                  />
                )}
              </div>
            ) : stepOrder === 10 ? (
              renderStep10Content()
            ) : (
              <RightPanel
                stepOrder={stepOrder}
                sessionId={sessionId}
                workshopId={workshopId}
                canvasGuides={isGuideEditing ? adminGuides.guides : localCanvasGuides}
                isAdmin={isAdmin}
                isAdminEditing={isGuideEditing}
                onEditGuide={handleEditGuide}
                onAddGuide={handleAddGuide}
                onGuidePositionUpdate={handleGuidePositionUpdate}
                  onGuideSizeUpdate={handleGuideSizeUpdate}
              />
            )}
          </div>
        </div>

        {/* Tab bar - above step navigation */}
        <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} />

        {/* Step navigation - fixed at bottom, full width */}
        <StepNavigation
          sessionId={sessionId}
          workshopId={workshopId}
          currentStepOrder={stepOrder}
          artifactConfirmed={effectiveConfirmed}
          stepExplicitlyConfirmed={artifactConfirmed}
          stepStatus={stepStatus}
          isAdmin={isAdmin}
          onReset={() => setShowResetDialog(true)}
          onToggleGuideEditor={isCanvasStep ? handleToggleGuideEditor : undefined}
          isGuideEditing={isGuideEditing}
          onAddGuide={isGuideEditing ? handleAddGuide : undefined}
          onSaveDefaultView={isGuideEditing ? handleSaveDefaultView : undefined}
        />
        <ResetStepDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          onConfirm={handleReset}
          isResetting={isResetting}
          stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
        />
        {/* Admin guide popover */}
        {isAdmin && editingPopover && (
          <GuideEditPopover
            guide={editingPopover.guide}
            position={editingPopover.position}
            onUpdate={handleUpdateGuide}
            onDelete={handleDeleteGuide}
            onSave={adminGuides.flushAll}
            hasPendingChanges={adminGuides.hasPendingChanges}
            onClose={() => setEditingPopover(null)}
          />
        )}
      </div>
    );
  }

  // Desktop: resizable panels with collapse/expand
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Chat collapsed strip */}
          {chatCollapsed && (
            <div className="flex w-10 flex-col items-center border-r bg-muted/30 py-4">
              <button
                onClick={() => setChatCollapsed(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Expand chat"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Resizable panel group (chat + canvas) */}
          {!chatCollapsed && !canvasCollapsed && (
            <PanelGroup orientation="horizontal" className="flex-1">
              <Panel defaultSize={480} minSize={280} maxSize="60%">
                {renderContent()}
              </Panel>
              <PanelResizeHandle className="group relative flex w-2 items-center justify-center bg-border/40 transition-colors hover:bg-border data-[active]:bg-primary/20">
                <div className="z-10 flex h-8 w-3.5 items-center justify-center rounded-sm border bg-border">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
              </PanelResizeHandle>
              <Panel minSize="30%">
                {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
                  <div className="h-full relative">
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={() => setCanvasCollapsed(true)}
                        className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
                        title="Collapse canvas"
                      >
                        <PanelRightClose className="h-4 w-4" />
                      </button>
                    </div>
                    <CanvasWrapper
                      sessionId={sessionId}
                      stepId={step.id}
                      workshopId={workshopId}
                      canvasGuides={isGuideEditing ? adminGuides.guides : localCanvasGuides}
                      defaultViewportSettings={canvasSettings}
                      isAdmin={isAdmin}
                      isAdminEditing={isGuideEditing}
                      onEditGuide={handleEditGuide}
                      onAddGuide={handleAddGuide}
                      onGuidePositionUpdate={handleGuidePositionUpdate}
                  onGuideSizeUpdate={handleGuideSizeUpdate}
                      canvasRef={canvasRef}
                    />
                    {step.id === 'concept' && (
                      <ConceptCanvasOverlay
                        workshopId={workshopId}
                        stepId={step.id}
                        selectedSketchSlotIds={step8SelectedSlotIds}
                        crazy8sSlots={step8Crazy8sSlots}
                      />
                    )}
                  </div>
                ) : stepOrder === 10 ? (
                  <div className="h-full relative">
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={() => setCanvasCollapsed(true)}
                        className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
                        title="Collapse panel"
                      >
                        <PanelRightClose className="h-4 w-4" />
                      </button>
                    </div>
                    {renderStep10Content()}
                  </div>
                ) : (
                  <RightPanel
                    stepOrder={stepOrder}
                    sessionId={sessionId}
                    workshopId={workshopId}
                    onCollapse={() => setCanvasCollapsed(true)}
                    canvasGuides={isGuideEditing ? adminGuides.guides : localCanvasGuides}
                    isAdmin={isAdmin}
                    isAdminEditing={isGuideEditing}
                    onEditGuide={handleEditGuide}
                    onAddGuide={handleAddGuide}
                    onGuidePositionUpdate={handleGuidePositionUpdate}
                  onGuideSizeUpdate={handleGuideSizeUpdate}
                  />
                )}
              </Panel>
            </PanelGroup>
          )}

          {/* Chat takes full width when canvas is collapsed */}
          {!chatCollapsed && canvasCollapsed && (
            <div className="flex-1">{renderContent()}</div>
          )}

          {/* Canvas takes full width when chat is collapsed */}
          {chatCollapsed && !canvasCollapsed && (
            <div className="flex-1">
              {step && CANVAS_ONLY_STEPS.includes(step.id) ? (
                <div className="h-full relative">
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={() => setCanvasCollapsed(true)}
                      className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
                      title="Collapse canvas"
                    >
                      <PanelRightClose className="h-4 w-4" />
                    </button>
                  </div>
                  <CanvasWrapper
                    sessionId={sessionId}
                    stepId={step.id}
                    workshopId={workshopId}
                    canvasGuides={isGuideEditing ? adminGuides.guides : localCanvasGuides}
                    isAdmin={isAdmin}
                    isAdminEditing={isGuideEditing}
                    onEditGuide={handleEditGuide}
                    onAddGuide={handleAddGuide}
                    onGuidePositionUpdate={handleGuidePositionUpdate}
                  onGuideSizeUpdate={handleGuideSizeUpdate}
                  />
                  {step.id === 'concept' && (
                    <ConceptCanvasOverlay
                      workshopId={workshopId}
                      stepId={step.id}
                      selectedSketchSlotIds={step8SelectedSlotIds}
                      crazy8sSlots={step8Crazy8sSlots}
                    />
                  )}
                </div>
              ) : stepOrder === 10 ? (
                <div className="h-full relative">
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={() => setCanvasCollapsed(true)}
                      className="rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-colors"
                      title="Collapse panel"
                    >
                      <PanelRightClose className="h-4 w-4" />
                    </button>
                  </div>
                  {renderStep10Content()}
                </div>
              ) : (
                <RightPanel
                  stepOrder={stepOrder}
                  sessionId={sessionId}
                  workshopId={workshopId}
                  onCollapse={() => setCanvasCollapsed(true)}
                  canvasGuides={isGuideEditing ? adminGuides.guides : localCanvasGuides}
                  isAdmin={isAdmin}
                  isAdminEditing={isGuideEditing}
                  onEditGuide={handleEditGuide}
                  onAddGuide={handleAddGuide}
                  onGuidePositionUpdate={handleGuidePositionUpdate}
                  onGuideSizeUpdate={handleGuideSizeUpdate}
                />
              )}
            </div>
          )}

          {/* Canvas collapsed strip */}
          {canvasCollapsed && (
            <div className="flex w-10 flex-col items-center border-l bg-muted/30 py-4">
              <button
                onClick={() => setCanvasCollapsed(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Expand canvas"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
      <StepNavigation
        sessionId={sessionId}
        workshopId={workshopId}
        currentStepOrder={stepOrder}
        artifactConfirmed={effectiveConfirmed}
        stepExplicitlyConfirmed={artifactConfirmed}
        stepStatus={stepStatus}
        isAdmin={isAdmin}
        onReset={() => setShowResetDialog(true)}
        onToggleGuideEditor={isCanvasStep ? handleToggleGuideEditor : undefined}
        isGuideEditing={isGuideEditing}
        onAddGuide={isGuideEditing ? handleAddGuide : undefined}
        onSaveDefaultView={isGuideEditing ? handleSaveDefaultView : undefined}
      />
      <ResetStepDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleReset}
        isResetting={isResetting}
        stepName={getStepByOrder(stepOrder)?.name || `Step ${stepOrder}`}
      />
      {/* Admin guide popover */}
      {isAdmin && editingPopover && (
        <GuideEditPopover
          guide={editingPopover.guide}
          position={editingPopover.position}
          onUpdate={handleUpdateGuide}
          onDelete={handleDeleteGuide}
          onSave={adminGuides.flushAll}
          hasPendingChanges={adminGuides.hasPendingChanges}
          onClose={() => setEditingPopover(null)}
        />
      )}
    </div>
  );
}

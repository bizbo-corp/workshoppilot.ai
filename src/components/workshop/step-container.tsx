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
import { MessageSquare, LayoutGrid, PanelLeftClose, PanelRightClose, GripVertical, Loader2, Megaphone, ImageIcon, Sparkles, ArrowLeft, ChevronDown, X } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { resetStep, updateStepStatus } from '@/actions/workshop-actions';
import { loadCanvasState } from '@/actions/canvas-actions';
import { getStepByOrder, STEP_CONFIRM_LABELS, STEP_CONFIRM_MIN_ITEMS, areAllPersonasInterviewed } from '@/lib/workshop/step-metadata';
import { STEP_CANVAS_CONFIGS } from '@/lib/canvas/step-canvas-config';
import { fireConfetti } from '@/lib/utils/confetti';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
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

const BILLBOARD_VISUAL_STYLES = [
  { value: 'vibrant', label: 'Bold & Vibrant', prompt: 'Bold, vibrant colors with high contrast, energetic gradient backgrounds, eye-catching neon accents' },
  { value: 'minimalist', label: 'Clean & Minimalist', prompt: 'Minimalist clean design, lots of white space, subtle typography, muted color palette, Swiss design principles' },
  { value: 'corporate', label: 'Corporate & Professional', prompt: 'Professional corporate aesthetic, navy/gray tones, structured layout, executive boardroom quality' },
  { value: 'playful', label: 'Playful & Fun', prompt: 'Playful, whimsical design with rounded shapes, bright pastels, hand-drawn feel, friendly and approachable' },
  { value: 'dark', label: 'Dark & Moody', prompt: 'Dark theme with deep blacks, dramatic lighting, cinematic atmosphere, premium luxury feel' },
  { value: 'retro', label: 'Retro & Vintage', prompt: 'Retro vintage aesthetic, 1970s/80s color palette, halftone textures, nostalgic warmth' },
  { value: 'futuristic', label: 'Futuristic & Tech', prompt: 'Futuristic sci-fi aesthetic, holographic elements, circuit patterns, cyber-blue glows, cutting edge technology' },
  { value: 'organic', label: 'Organic & Natural', prompt: 'Organic natural aesthetic, earth tones, botanical elements, warm textures, sustainable feel' },
] as const;

interface StepContainerProps {
  stepOrder: number;
  sessionId: string;
  workshopId: string;
  initialMessages?: UIMessage[];
  initialArtifact?: Record<string, unknown> | null;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  hmwStatement?: string;
  challengeStatement?: string;
  hmwGoals?: Array<{ label: string; fullStatement: string }>;
  step8SelectedSlotIds?: string[];
  step8Crazy8sSlots?: Array<{ slotId: string; title: string; imageUrl?: string }>;
  isAdmin?: boolean;
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
  challengeStatement,
  hmwGoals,
  step8SelectedSlotIds,
  step8Crazy8sSlots,
  isAdmin,
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

  // Concept step: allow early proceed when user explicitly asks to move on (AI emits [CONCEPT_COMPLETE])
  const [conceptProceedOverride, setConceptProceedOverride] = React.useState(false);

  // Canvas step detection — canvas steps skip extraction
  const step = getStepByOrder(stepOrder);
  const isCanvasStep = step ? CANVAS_ENABLED_STEPS.includes(step.id) : false;
  const stickyNotes = useCanvasStore((s) => s.stickyNotes);
  const conceptCards = useCanvasStore((s) => s.conceptCards);
  const hmwCards = useCanvasStore((s) => s.hmwCards);
  const setStickyNotes = useCanvasStore((s) => s.setStickyNotes);
  const setDrawingNodes = useCanvasStore((s) => s.setDrawingNodes);
  const setCrazy8sSlots = useCanvasStore((s) => s.setCrazy8sSlots);
  const setMindMapState = useCanvasStore((s) => s.setMindMapState);
  const setConceptCards = useCanvasStore((s) => s.setConceptCards);
  const gridColumns = useCanvasStore((s) => s.gridColumns);
  const setGridColumns = useCanvasStore((s) => s.setGridColumns);
  const setSelectedSlotIds = useCanvasStore((s) => s.setSelectedSlotIds);
  const personaTemplates = useCanvasStore((s) => s.personaTemplates);
  const setPersonaTemplates = useCanvasStore((s) => s.setPersonaTemplates);
  const setHmwCards = useCanvasStore((s) => s.setHmwCards);
  const setBrainRewritingMatrices = useCanvasStore((s) => s.setBrainRewritingMatrices);
  // HMW card counts as "content" only when all 4 fields are filled (card is 'filled')
  const hmwCardComplete = hmwCards.some((c) => c.cardState === 'filled');
  // Concept card counts as "content" only when all sections are filled (pitch, USP, SWOT, feasibility, billboard)
  const conceptCardComplete = conceptCards.some((c) => c.cardState === 'filled');
  // Concept step: require ALL cards filled before showing confirm (unless user explicitly asked to proceed early)
  const allConceptCardsFilled = step?.id === 'concept'
    ? conceptCards.length > 0 && conceptCards.every((c) => c.cardState === 'filled')
    : true;
  const canvasHasContent = stickyNotes.some(p => !p.templateKey || p.text.trim().length > 0) || conceptCardComplete || hmwCardComplete || personaTemplates.some(t => !!t.name);

  // Next button requires explicit confirmation (e.g. "Confirm Research Insights") for all steps
  const effectiveConfirmed = artifactConfirmed;

  // In-chat accept button: show when step has a confirm label, canvas has enough content, and user hasn't clicked Accept yet
  const confirmLabel = step ? STEP_CONFIRM_LABELS[step.id] : undefined;
  const minItems = step ? (STEP_CONFIRM_MIN_ITEMS[step.id] ?? 1) : 1;
  const filledConceptCount = conceptCards.filter(c => c.cardState === 'filled').length;
  const canvasItemCount = stickyNotes.length + filledConceptCount + (hmwCardComplete ? 1 : 0) + personaTemplates.filter(t => !!t.name).length;
  const allPersonasInterviewed = step?.id === 'user-research'
    ? areAllPersonasInterviewed(stickyNotes)
    : true;
  // Journey map: require every cell (row × column) to have at least one grid item
  const allSwimLanesFilled = step?.id === 'journey-mapping'
    ? gridColumns.length > 0 && (() => {
        const gridRows = STEP_CANVAS_CONFIGS['journey-mapping']?.gridConfig?.rows ?? [];
        return gridRows.length > 0 && gridRows.every((row) =>
          gridColumns.every((col) =>
            stickyNotes.some((n) => n.cellAssignment?.row === row.id && n.cellAssignment?.col === col.id)));
      })()
    : true;
  const showConfirm = !!confirmLabel && !artifactConfirmed && canvasHasContent
    && canvasItemCount >= minItems && allPersonasInterviewed && allSwimLanesFilled
    && (allConceptCardsFilled || conceptProceedOverride);

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

  // Billboard — concept data from Step 9
  const [conceptCardsForBillboard, setConceptCardsForBillboard] = React.useState<ConceptCardData[]>([]);
  const [isLoadingConcepts, setIsLoadingConcepts] = React.useState(false);

  // Billboard detail dialog (2-step flow)
  const [showBillboardDetail, setShowBillboardDetail] = React.useState(false);
  const [billboardDialogStep, setBillboardDialogStep] = React.useState<'text' | 'image'>('text');
  const [selectedConceptIndexes, setSelectedConceptIndexes] = React.useState<number[]>([]);
  const [billboardMode, setBillboardMode] = React.useState<'combined' | 'separate'>('combined');
  const [billboardUserPrompt, setBillboardUserPrompt] = React.useState('');
  const [billboardVisualStyle, setBillboardVisualStyle] = React.useState('vibrant');
  const [billboardImagePrompt, setBillboardImagePrompt] = React.useState('');

  // Generated billboards (1 in combined mode, N in separate)
  const [generatedBillboards, setGeneratedBillboards] = React.useState<Array<{ headline: string; subheadline: string; cta: string; conceptName?: string }>>([]);
  const [isBillboardTextGenerating, setIsBillboardTextGenerating] = React.useState(false);

  // Editable billboard text fields (keyed by index)
  const [editedBillboards, setEditedBillboards] = React.useState<Record<number, { headline: string; subheadline: string; cta: string }>>({});

  // Per-billboard image state (keyed by index)
  const [billboardImages, setBillboardImages] = React.useState<Record<number, string>>({});
  const [billboardImageGenerating, setBillboardImageGenerating] = React.useState<Record<number, boolean>>({});
  const [showBillboardImageDialog, setShowBillboardImageDialog] = React.useState<number | null>(null);

  // Step 10: load Step 9 concepts for billboard generator
  React.useEffect(() => {
    if (stepOrder !== 10) return;
    setIsLoadingConcepts(true);
    loadCanvasState(workshopId, 'concept').then(data => {
      const cards = data?.conceptCards?.filter(c => c.cardState === 'filled') || [];
      setConceptCardsForBillboard(cards);
      setSelectedConceptIndexes(cards.map((_, i) => i));
    }).finally(() => setIsLoadingConcepts(false));
  }, [stepOrder, workshopId]);

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
      // Clear billboard state
      setGeneratedBillboards([]);
      setEditedBillboards({});
      setBillboardImages({});
      setConceptCardsForBillboard([]);
      setBillboardDialogStep('text');
      // Clear canvas/whiteboard state
      setStickyNotes([]);
      setDrawingNodes([]);
      setCrazy8sSlots([]);
      setMindMapState([], []);
      setConceptCards([]);
      setGridColumns([]);
      setSelectedSlotIds([]);
      setPersonaTemplates([]);
      setHmwCards([]);
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
  }, [workshopId, stepOrder, sessionId, router, setStickyNotes, setDrawingNodes, setCrazy8sSlots, setMindMapState, setConceptCards, setGridColumns, setSelectedSlotIds, setPersonaTemplates, setHmwCards, setBrainRewritingMatrices]);

  // Billboard text generation handler
  const handleGenerateBillboardText = React.useCallback(async () => {
    const selected = selectedConceptIndexes.map(i => conceptCardsForBillboard[i]).filter(Boolean);
    if (selected.length === 0 || isBillboardTextGenerating) return;

    setIsBillboardTextGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-billboard-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          concepts: selected.map(c => ({
            conceptName: c.conceptName,
            elevatorPitch: c.elevatorPitch,
            usp: c.usp,
          })),
          mode: billboardMode,
          userPrompt: billboardUserPrompt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Failed (${res.status})`);
      }

      const { billboards } = await res.json();
      setGeneratedBillboards(billboards);
      // Populate editable fields from generated text
      const edited: Record<number, { headline: string; subheadline: string; cta: string }> = {};
      (billboards as Array<{ headline: string; subheadline: string; cta: string }>).forEach((bb, i) => {
        edited[i] = { headline: bb.headline, subheadline: bb.subheadline, cta: bb.cta };
      });
      setEditedBillboards(edited);
      setBillboardImages({});
      setBillboardImageGenerating({});
    } catch (error) {
      console.error('Billboard text generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate billboard text');
    } finally {
      setIsBillboardTextGenerating(false);
    }
  }, [selectedConceptIndexes, conceptCardsForBillboard, billboardMode, billboardUserPrompt, workshopId, isBillboardTextGenerating]);

  // Billboard image generation handler (per-billboard index)
  const handleGenerateBillboardImageForIndex = React.useCallback(async (idx: number) => {
    const edited = editedBillboards[idx];
    const billboard = edited || generatedBillboards[idx];
    if (!billboard || billboardImageGenerating[idx]) return;

    const styleObj = BILLBOARD_VISUAL_STYLES.find(s => s.value === billboardVisualStyle);

    setBillboardImageGenerating(prev => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch('/api/ai/generate-billboard-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          headline: billboard.headline,
          subheadline: billboard.subheadline,
          cta: billboard.cta,
          previousImageUrl: billboardImages[idx] || undefined,
          visualStyle: styleObj?.prompt,
          userPrompt: billboardImagePrompt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Failed (${res.status})`);
      }

      const { imageUrl } = await res.json();
      setBillboardImages(prev => ({ ...prev, [idx]: imageUrl }));
    } catch (error) {
      console.error('Billboard image generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate billboard image');
    } finally {
      setBillboardImageGenerating(prev => ({ ...prev, [idx]: false }));
    }
  }, [editedBillboards, generatedBillboards, billboardImages, billboardImageGenerating, workshopId, billboardVisualStyle, billboardImagePrompt]);

  // Step 10: render Build Pack deliverable cards + extraction status
  // Synthesis summary (narrative, journey, confidence, next steps) lives on the results page
  const renderStep10Content = () => {
    return (
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
            onGenerateBillboard={() => {
              // Resume at the right step based on previous progress
              if (generatedBillboards.length > 0) {
                setBillboardDialogStep('image');
              }
              setShowBillboardDetail(true);
            }}
            hasBillboard={generatedBillboards.length > 0}
          />
        </div>
        <PrdViewerDialog
          open={showPrdDialog}
          onOpenChange={setShowPrdDialog}
          workshopId={workshopId}
        />

        {/* Billboard full-size image lightbox — edge-to-edge overlay */}
        {showBillboardImageDialog !== null && billboardImages[showBillboardImageDialog] && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setShowBillboardImageDialog(null)}
          >
            <button
              onClick={() => setShowBillboardImageDialog(null)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={billboardImages[showBillboardImageDialog]}
              alt="Billboard hero visual — full size"
              className="max-h-[95vh] max-w-[95vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Billboard Detail Dialog — 2-step flow */}
        <Dialog open={showBillboardDetail} onOpenChange={setShowBillboardDetail}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Billboard Hero
              </DialogTitle>
              <DialogDescription>
                {billboardDialogStep === 'text'
                  ? 'Generate and edit your billboard copy.'
                  : 'Choose a visual style and generate your hero image.'}
              </DialogDescription>
            </DialogHeader>

            {billboardDialogStep === 'text' ? (
              /* ===== Step 1: Text Generation & Editing ===== */
              <div className="space-y-5 py-2">
                {/* Show generated text editing if we have results */}
                {generatedBillboards.length > 0 ? (
                  <div className="space-y-5">
                    {generatedBillboards.map((bb, idx) => {
                      const edited = editedBillboards[idx] || { headline: bb.headline, subheadline: bb.subheadline, cta: bb.cta };
                      return (
                        <div key={idx} className="space-y-3">
                          {generatedBillboards.length > 1 && (
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {bb.conceptName || `Billboard ${idx + 1}`}
                            </p>
                          )}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Headline</label>
                            <input
                              type="text"
                              value={edited.headline}
                              onChange={(e) => setEditedBillboards(prev => ({
                                ...prev,
                                [idx]: { ...edited, headline: e.target.value },
                              }))}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Subheadline</label>
                            <textarea
                              value={edited.subheadline}
                              onChange={(e) => setEditedBillboards(prev => ({
                                ...prev,
                                [idx]: { ...edited, subheadline: e.target.value },
                              }))}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Call to Action</label>
                            <input
                              type="text"
                              value={edited.cta}
                              onChange={(e) => setEditedBillboards(prev => ({
                                ...prev,
                                [idx]: { ...edited, cta: e.target.value },
                              }))}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      );
                    })}

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="outline"
                        onClick={handleGenerateBillboardText}
                        disabled={isBillboardTextGenerating}
                        className="gap-2"
                      >
                        {isBillboardTextGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Regenerate Text
                      </Button>
                      <Button
                        onClick={() => setBillboardDialogStep('image')}
                        className="gap-2"
                      >
                        Continue to Image
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  /* --- Text generation form --- */
                  <div className="space-y-5">
                    {/* Loading concepts */}
                    {isLoadingConcepts ? (
                      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading concepts...</p>
                      </div>
                    ) : conceptCardsForBillboard.length === 0 ? (
                      <div className="rounded-lg border bg-card p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Complete Step 9 (Concept Development) to unlock the Billboard Hero.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Concept checkboxes */}
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Concepts</p>
                          {conceptCardsForBillboard.map((card, idx) => (
                            <label key={card.id} className="flex items-start gap-3 cursor-pointer group">
                              <Checkbox
                                checked={selectedConceptIndexes.includes(idx)}
                                onCheckedChange={(checked) => {
                                  setSelectedConceptIndexes(prev =>
                                    checked
                                      ? [...prev, idx]
                                      : prev.filter(i => i !== idx)
                                  );
                                }}
                                className="mt-0.5"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium group-hover:text-foreground transition-colors">{card.conceptName}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{card.elevatorPitch}</p>
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* Mode toggle — only when 2+ concepts selected */}
                        {selectedConceptIndexes.length >= 2 && (
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="text-sm font-medium">Separate billboards</p>
                              <p className="text-xs text-muted-foreground">One billboard per concept instead of combined</p>
                            </div>
                            <Switch
                              checked={billboardMode === 'separate'}
                              onCheckedChange={(checked) => setBillboardMode(checked ? 'separate' : 'combined')}
                            />
                          </div>
                        )}

                        {/* Creative direction */}
                        <div className="space-y-2">
                          <label htmlFor="billboard-prompt" className="text-sm font-medium">
                            Creative direction <span className="text-muted-foreground font-normal">(optional)</span>
                          </label>
                          <textarea
                            id="billboard-prompt"
                            value={billboardUserPrompt}
                            onChange={(e) => setBillboardUserPrompt(e.target.value)}
                            placeholder="e.g. Make it playful and bold, target Gen Z audience..."
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            rows={3}
                          />
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowBillboardDetail(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleGenerateBillboardText}
                            disabled={selectedConceptIndexes.length === 0 || isBillboardTextGenerating}
                            className="gap-2"
                          >
                            {isBillboardTextGenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Generate Billboard Text
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ===== Step 2: Image Generation ===== */
              <div className="space-y-5 py-2">
                {/* Editable text + generated image */}
                {generatedBillboards.map((bb, idx) => {
                  const edited = editedBillboards[idx] || { headline: bb.headline, subheadline: bb.subheadline, cta: bb.cta };
                  return (
                    <div key={idx} className="space-y-3">
                      {generatedBillboards.length > 1 && (
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {bb.conceptName || `Billboard ${idx + 1}`}
                        </p>
                      )}
                      <div className="rounded-lg border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 p-5 space-y-3">
                        <input
                          type="text"
                          value={edited.headline}
                          onChange={(e) => setEditedBillboards(prev => ({
                            ...prev,
                            [idx]: { ...edited, headline: e.target.value },
                          }))}
                          className="w-full bg-transparent text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1"
                        />
                        <textarea
                          value={edited.subheadline}
                          onChange={(e) => setEditedBillboards(prev => ({
                            ...prev,
                            [idx]: { ...edited, subheadline: e.target.value },
                          }))}
                          className="w-full bg-transparent text-center text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1 resize-none"
                          rows={2}
                        />
                        <div className="text-center">
                          <input
                            type="text"
                            value={edited.cta}
                            onChange={(e) => setEditedBillboards(prev => ({
                              ...prev,
                              [idx]: { ...edited, cta: e.target.value },
                            }))}
                            className="inline-block bg-primary text-primary-foreground text-center text-sm font-semibold rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>

                      {/* Generated image */}
                      {billboardImages[idx] && (
                        <button
                          onClick={() => setShowBillboardImageDialog(idx)}
                          className="w-full overflow-hidden rounded-lg border-2 border-primary/30 transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <img
                            src={billboardImages[idx]}
                            alt={`Billboard visual ${idx + 1}`}
                            className="w-full object-cover"
                          />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Visual style dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visual Style</label>
                  <div className="relative">
                    <select
                      value={billboardVisualStyle}
                      onChange={(e) => setBillboardVisualStyle(e.target.value)}
                      className="w-full appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {BILLBOARD_VISUAL_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                {/* Freeform image prompt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Image direction <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={billboardImagePrompt}
                    onChange={(e) => setBillboardImagePrompt(e.target.value)}
                    placeholder="e.g. Include abstract geometric shapes, use purple and gold tones..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setBillboardDialogStep('text')}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {/* Generate image for each billboard */}
                  <Button
                    onClick={() => {
                      generatedBillboards.forEach((_, idx) => handleGenerateBillboardImageForIndex(idx));
                    }}
                    disabled={Object.values(billboardImageGenerating).some(Boolean)}
                    className="gap-2"
                  >
                    {Object.values(billboardImageGenerating).some(Boolean) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4" />
                        {Object.keys(billboardImages).length > 0 ? 'Regenerate Image' : 'Generate Image'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

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
          challengeStatement={challengeStatement}
          hmwGoals={hmwGoals}
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
          onConceptComplete={() => setConceptProceedOverride(true)}
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
              renderStep10Content()
            ) : (
              <RightPanel
                stepOrder={stepOrder}
                sessionId={sessionId}
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
          onToggleGuideEditor={isCanvasStep || isAdmin ? handleToggleGuideEditor : undefined}
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
                    defaultViewportSettings={canvasSettings}
                    isAdmin={isAdmin}
                    isAdminEditing={isGuideEditing}
                    onEditGuide={handleEditGuide}
                    onAddGuide={handleAddGuide}
                    onGuidePositionUpdate={handleGuidePositionUpdate}
                    onGuideSizeUpdate={handleGuideSizeUpdate}
                    canvasRef={canvasRef}
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
                  defaultViewportSettings={canvasSettings}
                  isAdmin={isAdmin}
                  isAdminEditing={isGuideEditing}
                  onEditGuide={handleEditGuide}
                  onAddGuide={handleAddGuide}
                  onGuidePositionUpdate={handleGuidePositionUpdate}
                  onGuideSizeUpdate={handleGuideSizeUpdate}
                  canvasRef={canvasRef}
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
        onToggleGuideEditor={isCanvasStep || isAdmin ? handleToggleGuideEditor : undefined}
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

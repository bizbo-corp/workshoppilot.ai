'use client';

import { useCallback, useMemo, useState, type MutableRefObject } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  type NodeChange,
  applyNodeChanges,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useJourneyMapperStore, useJourneyMapperStoreApi } from '@/providers/journey-mapper-store-provider';
import { JourneyFeatureNode, type JourneyFeatureNodeData } from './journey-feature-node';
import { JourneyStageHeader, type StageHeaderData } from './journey-stage-header';
import { EmotionCurveOverlay } from './emotion-curve-overlay';
import { JourneyMapperToolbar } from './journey-mapper-toolbar';
import { V0PromptPanel } from './v0-prompt-panel';
import { PrdViewerDialog } from '@/components/workshop/prd-viewer-dialog';
import { computeJourneyMapLayout, type StageHeaderNode } from '@/lib/journey-mapper/layout';
import type { JourneyMapperNode } from '@/lib/journey-mapper/types';

const nodeTypes = {
  featureNode: JourneyFeatureNode,
  stageHeader: JourneyStageHeader,
};

// Per-concept color palette
const CONCEPT_COLORS = [
  'hsl(221 83% 53%)',  // blue
  'hsl(142 76% 36%)',  // green
  'hsl(262 83% 58%)',  // purple
  'hsl(25 95% 53%)',   // orange
  'hsl(346 77% 50%)',  // rose
];

interface UXJourneyMapperProps {
  workshopId: string;
  sessionId: string;
  isReadOnly?: boolean;
  buildPackIdRef?: MutableRefObject<string | null>;
  onRegenerate: () => void;
  isRegenerating?: boolean;
  onReset: () => void;
  isResetting?: boolean;
}

function JourneyMapperInner({
  workshopId,
  sessionId,
  isReadOnly,
  buildPackIdRef,
  onRegenerate,
  isRegenerating,
  onReset,
  isResetting,
}: UXJourneyMapperProps) {
  const router = useRouter();
  const storeApi = useJourneyMapperStoreApi();
  const nodes = useJourneyMapperStore((s) => s.nodes);
  const edges = useJourneyMapperStore((s) => s.edges);
  const stages = useJourneyMapperStore((s) => s.stages);
  const isApproved = useJourneyMapperStore((s) => s.isApproved);
  const strategicIntent = useJourneyMapperStore((s) => s.strategicIntent);

  const [v0Prompt, setV0Prompt] = useState<string | null>(null);
  const [v0BuildPackId, setV0BuildPackId] = useState<string | null>(null);

  // Prototype dialog state
  const [showPrototypeDialog, setShowPrototypeDialog] = useState(false);
  const [prototypeDialogData, setPrototypeDialogData] = useState<{
    prompt: string;
    systemPrompt: string;
    conceptName: string;
    buildPackId: string;
  } | undefined>(undefined);

  // Build React Flow nodes from store state
  const { rfNodes, rfEdges } = useMemo(() => {
    // Header nodes
    const headerRfNodes: Node<StageHeaderData>[] = [];
    const { headerNodes } = computeJourneyMapLayout(nodes, stages);
    for (const h of headerNodes) {
      headerRfNodes.push({
        id: h.id,
        type: 'stageHeader',
        position: h.position,
        draggable: false,
        selectable: false,
        data: {
          stageId: h.stageId,
          stageName: h.stageName,
          description: h.description,
          emotion: h.emotion,
          isDip: h.isDip,
        },
      });
    }

    // Feature nodes
    const featureRfNodes: Node<JourneyFeatureNodeData>[] = nodes.map((node) => ({
      id: node.id,
      type: 'featureNode',
      position: node.position,
      data: {
        ...node,
        conceptColor: CONCEPT_COLORS[node.conceptIndex % CONCEPT_COLORS.length],
        onFieldChange: isReadOnly
          ? undefined
          : (id: string, field: keyof JourneyMapperNode, value: string) => {
              storeApi.getState().updateNode(id, { [field]: value } as Partial<JourneyMapperNode>);
            },
      },
    }));

    // Edges
    const flowEdges: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.label,
      type: 'default',
      animated: edge.flowType === 'primary',
      style: {
        stroke:
          edge.flowType === 'error'
            ? 'hsl(0 84% 60%)'
            : edge.flowType === 'secondary'
            ? 'hsl(var(--muted-foreground))'
            : 'hsl(var(--primary))',
        strokeWidth: edge.flowType === 'primary' ? 2 : 1,
      },
    }));

    return {
      rfNodes: [...headerRfNodes, ...featureRfNodes] as Node[],
      rfEdges: flowEdges,
    };
  }, [nodes, edges, stages, isReadOnly, storeApi]);

  // Handle node position changes (drag)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isReadOnly) return;
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id.startsWith('jm-node-')) {
          storeApi.getState().moveNode(change.id, change.position);
        }
      }
    },
    [isReadOnly, storeApi]
  );

  // Auto-layout
  const handleAutoLayout = useCallback(() => {
    const state = storeApi.getState();
    const { nodes: repositioned } = computeJourneyMapLayout(state.nodes, state.stages);
    storeApi.getState().setNodes(repositioned);
    storeApi.getState().markDirty();
  }, [storeApi]);

  // Add feature
  const handleAddFeature = useCallback(() => {
    const state = storeApi.getState();
    const firstStage = state.stages[0];
    if (!firstStage) return;

    const id = `jm-node-${Date.now()}`;
    storeApi.getState().addNode({
      id,
      conceptIndex: 0,
      conceptName: 'New',
      featureName: 'New Feature',
      featureDescription: '',
      stageId: firstStage.id,
      stageName: firstStage.name,
      uiType: 'detail-view',
      uiPatternSuggestion: '',
      addressesPain: '',
      position: { x: 0, y: 400 },
      priority: 'should-have',
    });
  }, [storeApi]);

  // Generate v0 prompt (client-side)
  const handleGenerateV0Prompt = useCallback(async () => {
    const { buildJourneyAwareV0Prompt } = await import('@/lib/ai/prompts/journey-v0-prompt');
    const state = storeApi.getState();
    const prompt = buildJourneyAwareV0Prompt(state);
    setV0Prompt(prompt);
  }, [storeApi]);

  // Approve journey map
  const handleApprove = useCallback(async () => {
    storeApi.getState().setApproved(true);
    // Save approved state to DB
    const state = storeApi.getState();
    await fetch('/api/build-pack/save-journey-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workshopId, state }),
    });
    storeApi.getState().markClean();
  }, [storeApi, workshopId]);

  // Create prototype — save with prompt + system prompt, then open PrdViewerDialog for review
  const handleCreatePrototype = useCallback(async () => {
    const { buildJourneyAwareV0Prompt } = await import('@/lib/ai/prompts/journey-v0-prompt');
    const { buildV0SystemPrompt } = await import('@/lib/ai/prompts/prd-generation');
    const state = storeApi.getState();
    const prompt = buildJourneyAwareV0Prompt(state);

    // Derive concept name(s) and persona from state
    const conceptNames = [...new Set(state.nodes.map((n) => n.conceptName))];
    const conceptLabel = conceptNames.join(' + ') || 'Product';
    const personaName = state.personaName || 'the target user';
    const sysPrompt = buildV0SystemPrompt(conceptLabel, personaName);

    // Save final validated state with both prompts
    const res = await fetch('/api/build-pack/save-journey-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workshopId, state, v0Prompt: prompt, v0SystemPrompt: sysPrompt }),
    });
    const data = await res.json();
    storeApi.getState().markClean();
    const bpId = data.buildPackId;
    if (bpId) {
      if (buildPackIdRef) buildPackIdRef.current = bpId;
      // Open PrdViewerDialog with pre-populated data for review
      setPrototypeDialogData({
        prompt,
        systemPrompt: sysPrompt,
        conceptName: conceptLabel,
        buildPackId: bpId,
      });
      setShowPrototypeDialog(true);
    }
  }, [storeApi, workshopId, buildPackIdRef]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <MiniMap
          className="!bg-background !border-border"
          maskColor="hsl(var(--muted) / 0.5)"
          nodeStrokeWidth={3}
        />
        <Controls className="!bg-background !border-border" />
        <EmotionCurveOverlay stages={stages} />
        <JourneyMapperToolbar
          sessionId={sessionId}
          isReadOnly={isReadOnly}
          isRegenerating={isRegenerating}
          isApproved={isApproved}
          strategicIntent={strategicIntent}
          onRegenerate={onRegenerate}
          onAutoLayout={handleAutoLayout}
          onGenerateV0Prompt={handleGenerateV0Prompt}
          onAddFeature={handleAddFeature}
          onApprove={handleApprove}
          onCreatePrototype={handleCreatePrototype}
          onReset={onReset}
          isResetting={isResetting}
        />
      </ReactFlow>

      {v0Prompt && (
        <V0PromptPanel
          prompt={v0Prompt}
          buildPackId={v0BuildPackId}
          workshopId={workshopId}
          onClose={() => {
            setV0Prompt(null);
            setV0BuildPackId(null);
          }}
        />
      )}

      <PrdViewerDialog
        open={showPrototypeDialog}
        onOpenChange={(open) => {
          setShowPrototypeDialog(open);
          if (!open) setPrototypeDialogData(undefined);
        }}
        workshopId={workshopId}
        initialData={prototypeDialogData}
        onV0Started={() => {
          setShowPrototypeDialog(false);
          setPrototypeDialogData(undefined);
          router.push(`/workshop/${sessionId}/step/10?v0=creating`);
        }}
      />
    </div>
  );
}

export function UXJourneyMapper(props: UXJourneyMapperProps) {
  return (
    <ReactFlowProvider>
      <JourneyMapperInner {...props} />
    </ReactFlowProvider>
  );
}

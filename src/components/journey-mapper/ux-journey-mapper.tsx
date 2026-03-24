'use client';

import { useCallback, useMemo, useState, useRef, useEffect, type MutableRefObject } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useJourneyMapperStore, useJourneyMapperStoreApi } from '@/providers/journey-mapper-store-provider';
import { JourneyFeatureNode, type JourneyFeatureNodeData } from './journey-feature-node';
import { JourneyStageHeader, type StageHeaderData } from './journey-stage-header';
import { JourneyGroupContainer, type GroupContainerData } from './journey-group-container';
import { EmotionCurveOverlay } from './emotion-curve-overlay';
import { JourneyMapperToolbar, type ViewMode } from './journey-mapper-toolbar';
import { V0PromptPanel } from './v0-prompt-panel';
import { CanvasZoomControls } from '@/components/canvas/canvas-zoom-controls';
import { PrdViewerDialog } from '@/components/workshop/prd-viewer-dialog';
import { GroupManagementDialog } from './group-management-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  computeJourneyMapLayout,
  computeGroupContainers,
  computeSitemapLayout,
  autoTidyWithinGroups,
  type StageHeaderNode,
} from '@/lib/journey-mapper/layout';
import type { JourneyMapperNode, LayoutMode, NavigationGroup } from '@/lib/journey-mapper/types';

const nodeTypes = {
  featureNode: JourneyFeatureNode,
  stageHeader: JourneyStageHeader,
  groupContainer: JourneyGroupContainer,
};

// Per-concept color palette
const CONCEPT_COLORS = [
  'hsl(221 83% 53%)',  // blue
  'hsl(142 76% 36%)',  // green
  'hsl(262 83% 58%)',  // purple
  'hsl(25 95% 53%)',   // orange
  'hsl(346 77% 50%)',  // rose
];

// ─── Context menu types ───

type ContextMenu = {
  type: 'node' | 'edge';
  id: string;
  x: number;
  y: number;
} | null;

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
  const groups = useJourneyMapperStore((s) => s.groups);
  const isApproved = useJourneyMapperStore((s) => s.isApproved);
  const strategicIntent = useJourneyMapperStore((s) => s.strategicIntent);
  const layoutMode = useJourneyMapperStore((s) => s.layoutMode) ?? 'auto';

  const [v0Prompt, setV0Prompt] = useState<string | null>(null);
  const [v0BuildPackId, setV0BuildPackId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('journey');
  const [showPeripherals, setShowPeripherals] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>(undefined);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Prototype dialog state
  const [showPrototypeDialog, setShowPrototypeDialog] = useState(false);
  const [prototypeDialogData, setPrototypeDialogData] = useState<{
    prompt: string;
    systemPrompt: string;
    conceptName: string;
    buildPackId: string;
  } | undefined>(undefined);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as HTMLElement)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  // Group container callbacks
  const handleGroupEdit = useCallback((groupId: string) => {
    setEditingGroupId(groupId);
    setShowGroupDialog(true);
  }, []);

  const handleGroupDelete = useCallback((groupId: string) => {
    setPendingDeleteGroupId(groupId);
  }, []);

  const confirmGroupDelete = useCallback(() => {
    if (pendingDeleteGroupId) {
      storeApi.getState().deleteGroup(pendingDeleteGroupId);
      setPendingDeleteGroupId(null);
    }
  }, [storeApi, pendingDeleteGroupId]);

  // ─── Build React Flow nodes from store state ───
  const { rfNodes, rfEdges } = useMemo(() => {
    const filteredNodes = showPeripherals
      ? nodes
      : nodes.filter((n) => n.nodeCategory !== 'peripheral');

    const isFreeform = layoutMode === 'freeform';

    if (viewMode === 'sitemap') {
      const effectiveGroups = groups.length > 0
        ? groups
        : [{ id: 'main', label: 'Main', description: 'All features' }];

      const { nodes: sitemapNodes, groupBackgrounds } = computeSitemapLayout(filteredNodes, effectiveGroups);

      // Group container RF nodes
      const containerNodes: Node<GroupContainerData>[] = groupBackgrounds.map((bg) => ({
        id: bg.id.replace('group-bg-', 'group-container-'),
        type: 'groupContainer',
        position: bg.position,
        draggable: isFreeform,
        selectable: true,
        style: { width: bg.width, height: bg.height },
        data: {
          groupId: bg.groupId,
          label: bg.label,
          width: bg.width,
          height: bg.height,
          onEdit: isReadOnly ? undefined : handleGroupEdit,
          onDelete: isReadOnly ? undefined : handleGroupDelete,
        },
      }));

      // Feature nodes — with parentId in freeform mode
      const featureRfNodes: Node<JourneyFeatureNodeData>[] = sitemapNodes.map((node) => {
        const base: Node<JourneyFeatureNodeData> = {
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
        };
        if (isFreeform && node.groupId) {
          base.parentId = `group-container-${node.groupId}`;
          base.extent = 'parent';
        }
        return base;
      });

      const visibleIds = new Set(filteredNodes.map((n) => n.id));
      const flowEdges: Edge[] = edges
        .filter((e) => visibleIds.has(e.sourceNodeId) && visibleIds.has(e.targetNodeId))
        .map((edge) => ({
          id: edge.id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          label: edge.label,
          type: 'default',
          animated: edge.flowType === 'primary',
          interactionWidth: 20,
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

      // Parents must come before children
      return {
        rfNodes: [...containerNodes, ...featureRfNodes] as Node[],
        rfEdges: flowEdges,
      };
    }

    // ─── Journey (stage column) layout ───
    const headerRfNodes: Node<StageHeaderData>[] = [];

    // Compute layout positions (auto mode computes, freeform uses stored)
    let layoutNodes: JourneyMapperNode[];
    if (isFreeform) {
      layoutNodes = filteredNodes;
    } else {
      const result = computeJourneyMapLayout(filteredNodes, stages);
      layoutNodes = result.nodes;
      for (const h of result.headerNodes) {
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
    }

    if (!isFreeform) {
      // Also add headers from auto layout (already added above in auto mode)
    } else {
      // In freeform, still need headers — compute them for positioning
      const { headerNodes } = computeJourneyMapLayout(filteredNodes, stages);
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
    }

    // Group containers for journey view
    const containerNodes: Node<GroupContainerData>[] = [];
    if (groups.length > 0) {
      const containers = computeGroupContainers(layoutNodes, groups);
      for (const c of containers) {
        containerNodes.push({
          id: c.id,
          type: 'groupContainer',
          position: c.position,
          draggable: isFreeform,
          selectable: true,
          style: { width: c.width, height: c.height },
          data: {
            groupId: c.groupId,
            label: c.label,
            width: c.width,
            height: c.height,
            onEdit: isReadOnly ? undefined : handleGroupEdit,
            onDelete: isReadOnly ? undefined : handleGroupDelete,
          },
        });
      }
    }

    // Feature nodes
    const featureRfNodes: Node<JourneyFeatureNodeData>[] = layoutNodes.map((node) => {
      const containerForNode = isFreeform && node.groupId
        ? containerNodes.find((c) => c.data.groupId === node.groupId)
        : null;

      let position = node.position;
      // In freeform with parentId, convert to relative coords
      if (containerForNode) {
        position = {
          x: node.position.x - containerForNode.position.x,
          y: node.position.y - containerForNode.position.y,
        };
      }

      const base: Node<JourneyFeatureNodeData> = {
        id: node.id,
        type: 'featureNode',
        position,
        data: {
          ...node,
          conceptColor: CONCEPT_COLORS[node.conceptIndex % CONCEPT_COLORS.length],
          onFieldChange: isReadOnly
            ? undefined
            : (id: string, field: keyof JourneyMapperNode, value: string) => {
                storeApi.getState().updateNode(id, { [field]: value } as Partial<JourneyMapperNode>);
              },
        },
      };
      if (containerForNode) {
        base.parentId = containerForNode.id;
        base.extent = 'parent';
      }
      return base;
    });

    // Edges
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    const flowEdges: Edge[] = edges
      .filter((e) => visibleIds.has(e.sourceNodeId) && visibleIds.has(e.targetNodeId))
      .map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: edge.label,
        type: 'default',
        animated: edge.flowType === 'primary',
        interactionWidth: 20,
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

    // Parents must come before children in the array
    return {
      rfNodes: [...containerNodes, ...headerRfNodes, ...featureRfNodes] as Node[],
      rfEdges: flowEdges,
    };
  }, [nodes, edges, stages, groups, isReadOnly, storeApi, viewMode, showPeripherals, layoutMode, handleGroupEdit, handleGroupDelete]);

  // Fit viewport when nodes first appear (e.g. after generation into a fresh mount)
  const { fitView } = useReactFlow();
  const prevNodeCountRef = useRef(0);
  useEffect(() => {
    const featureCount = rfNodes.filter((n) => n.type === 'featureNode').length;
    if (featureCount > 0 && prevNodeCountRef.current === 0) {
      // Delay allows ReactFlow to measure custom node components before fitting
      const timer = setTimeout(() => fitView({ padding: 0.2 }), 200);
      return () => clearTimeout(timer);
    }
    prevNodeCountRef.current = featureCount;
  }, [rfNodes, fitView]);

  // Handle node position changes (drag)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isReadOnly) return;
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          if (change.id.startsWith('jm-node-')) {
            // In auto mode, switch to freeform on drag
            if (layoutMode === 'auto' && change.dragging) {
              // Snapshot current layout before switching
              const state = storeApi.getState();
              const containers = computeGroupContainers(state.nodes, state.groups);
              for (const c of containers) {
                const gid = c.groupId;
                storeApi.getState().updateGroup(gid, {
                  position: c.position,
                  width: c.width,
                  height: c.height,
                });
              }
              storeApi.getState().setLayoutMode('freeform');
            }
            storeApi.getState().moveNode(change.id, change.position);
          } else if (change.id.startsWith('group-container-')) {
            const groupId = change.id.replace('group-container-', '');
            storeApi.getState().updateGroup(groupId, { position: change.position });
          }
        }
        // Handle resize (dimensions change) — only in freeform mode.
        // In auto mode, container sizes are computed from node bounding boxes;
        // writing measured dimensions back would create an infinite re-render loop
        // (updateGroup → new groups ref → useMemo → new container nodes → re-measure → repeat).
        if (
          change.type === 'dimensions' &&
          change.dimensions &&
          change.id.startsWith('group-container-') &&
          layoutMode === 'freeform'
        ) {
          const groupId = change.id.replace('group-container-', '');
          const group = storeApi.getState().groups.find((g) => g.id === groupId);
          // Skip no-op updates to prevent re-render loops even in freeform
          if (group && (group.width !== change.dimensions.width || group.height !== change.dimensions.height)) {
            storeApi.getState().updateGroup(groupId, {
              width: change.dimensions.width,
              height: change.dimensions.height,
            });
          }
        }
      }
    },
    [isReadOnly, storeApi, layoutMode]
  );

  // Handle edge changes (deletion via keyboard)
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (isReadOnly) return;
      for (const change of changes) {
        if (change.type === 'remove') {
          storeApi.getState().deleteEdge(change.id);
        }
      }
    },
    [isReadOnly, storeApi]
  );

  // Manual edge creation via drag between handles
  const onConnect = useCallback(
    (connection: Connection) => {
      if (isReadOnly || !connection.source || !connection.target) return;
      if (!connection.source.startsWith('jm-node-') || !connection.target.startsWith('jm-node-')) return;

      const edgeId = `jm-edge-manual-${Date.now()}`;
      storeApi.getState().addEdge({
        id: edgeId,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        flowType: 'secondary',
      });
    },
    [isReadOnly, storeApi]
  );

  // ─── Context menus ───

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (isReadOnly) return;
      if (!node.id.startsWith('jm-node-')) return;
      event.preventDefault();
      setContextMenu({ type: 'node', id: node.id, x: event.clientX, y: event.clientY });
    },
    [isReadOnly]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (isReadOnly) return;
      event.preventDefault();
      setContextMenu({ type: 'edge', id: edge.id, x: event.clientX, y: event.clientY });
    },
    [isReadOnly]
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ─── Layout mode switching ───

  const handleSetLayoutMode = useCallback((mode: LayoutMode) => {
    const state = storeApi.getState();
    if (mode === 'freeform' && (state.layoutMode ?? 'auto') === 'auto') {
      // Snapshot current computed positions into groups
      const containers = computeGroupContainers(state.nodes, state.groups);
      for (const c of containers) {
        storeApi.getState().updateGroup(c.groupId, {
          position: c.position,
          width: c.width,
          height: c.height,
        });
      }
    }
    if (mode === 'auto') {
      // Clear stored group positions (auto-layout will recompute)
      for (const g of state.groups) {
        storeApi.getState().updateGroup(g.id, {
          position: undefined,
          width: undefined,
          height: undefined,
        });
      }
    }
    storeApi.getState().setLayoutMode(mode);
  }, [storeApi]);

  // Auto-layout
  const handleAutoLayout = useCallback(() => {
    const state = storeApi.getState();
    if (viewMode === 'sitemap') {
      const effectiveGroups = state.groups.length > 0
        ? state.groups
        : [{ id: 'main', label: 'Main', description: 'All features' }];
      const { nodes: repositioned } = computeSitemapLayout(state.nodes, effectiveGroups);
      storeApi.getState().setNodes(repositioned);
    } else {
      const { nodes: repositioned } = computeJourneyMapLayout(state.nodes, state.stages);
      storeApi.getState().setNodes(repositioned);
    }
    // Reset to auto mode
    storeApi.getState().setLayoutMode('auto');
    for (const g of state.groups) {
      storeApi.getState().updateGroup(g.id, {
        position: undefined,
        width: undefined,
        height: undefined,
      });
    }
    storeApi.getState().markDirty();
  }, [storeApi, viewMode]);

  // Auto-tidy (freeform mode only)
  const handleAutoTidy = useCallback(() => {
    const state = storeApi.getState();
    const tidied = autoTidyWithinGroups(state.nodes, state.groups);
    storeApi.getState().setNodes(tidied);
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
      nodeCategory: 'core',
      groupId: 'main',
    });
  }, [storeApi]);

  // Generate v0 prompt
  const handleGenerateV0Prompt = useCallback(async () => {
    const { buildJourneyAwareV0Prompt } = await import('@/lib/ai/prompts/journey-v0-prompt');
    const state = storeApi.getState();
    const prompt = buildJourneyAwareV0Prompt(state);
    setV0Prompt(prompt);
  }, [storeApi]);

  // Approve journey map
  const handleApprove = useCallback(async () => {
    storeApi.getState().setApproved(true);
    const state = storeApi.getState();
    await fetch('/api/build-pack/save-journey-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workshopId, state }),
    });
    storeApi.getState().markClean();
  }, [storeApi, workshopId]);

  // Create prototype
  const handleCreatePrototype = useCallback(async () => {
    const { buildJourneyAwareV0Prompt } = await import('@/lib/ai/prompts/journey-v0-prompt');
    const { buildV0SystemPrompt } = await import('@/lib/ai/prompts/prd-generation');
    const state = storeApi.getState();
    const prompt = buildJourneyAwareV0Prompt(state);

    const conceptNames = [...new Set(state.nodes.map((n) => n.conceptName))];
    const conceptLabel = conceptNames.join(' + ') || 'Product';
    const personaName = state.personaName || 'the target user';
    const sysPrompt = buildV0SystemPrompt(conceptLabel, personaName);

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
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <CanvasZoomControls />
        {viewMode === 'journey' && <EmotionCurveOverlay stages={stages} />}
        <JourneyMapperToolbar
          sessionId={sessionId}
          isReadOnly={isReadOnly}
          isRegenerating={isRegenerating}
          isApproved={isApproved}
          strategicIntent={strategicIntent}
          viewMode={viewMode}
          layoutMode={layoutMode}
          showPeripherals={showPeripherals}
          groupCount={groups.length}
          onRegenerate={onRegenerate}
          onAutoLayout={handleAutoLayout}
          onAutoTidy={handleAutoTidy}
          onGenerateV0Prompt={handleGenerateV0Prompt}
          onAddFeature={handleAddFeature}
          onApprove={handleApprove}
          onCreatePrototype={handleCreatePrototype}
          onReset={onReset}
          isResetting={isResetting}
          onTogglePeripherals={() => setShowPeripherals((p) => !p)}
          onSetViewMode={setViewMode}
          onSetLayoutMode={isReadOnly ? undefined : handleSetLayoutMode}
          onManageGroups={isReadOnly ? undefined : () => setShowGroupDialog(true)}
        />
      </ReactFlow>

      {/* Context menu overlay */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] min-w-[180px] rounded-md border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'node' && (
            <NodeContextMenuItems
              nodeId={contextMenu.id}
              groups={groups}
              storeApi={storeApi}
              onClose={() => setContextMenu(null)}
              onCreateGroup={() => {
                setContextMenu(null);
                setShowGroupDialog(true);
              }}
            />
          )}
          {contextMenu.type === 'edge' && (
            <EdgeContextMenuItems
              edgeId={contextMenu.id}
              storeApi={storeApi}
              onClose={() => setContextMenu(null)}
            />
          )}
        </div>
      )}

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

      <GroupManagementDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        editingGroupId={editingGroupId}
        onEditingGroupIdChange={setEditingGroupId}
      />

      <AlertDialog open={!!pendingDeleteGroupId} onOpenChange={(open) => { if (!open) setPendingDeleteGroupId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (!pendingDeleteGroupId) return '';
                const group = groups.find((g) => g.id === pendingDeleteGroupId);
                const count = nodes.filter((n) => n.groupId === pendingDeleteGroupId).length;
                return `Delete group "${group?.label}"? ${count} node${count !== 1 ? 's' : ''} will become ungrouped.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmGroupDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Context Menu Components ───

function NodeContextMenuItems({
  nodeId,
  groups,
  storeApi,
  onClose,
  onCreateGroup,
}: {
  nodeId: string;
  groups: NavigationGroup[];
  storeApi: ReturnType<typeof useJourneyMapperStoreApi>;
  onClose: () => void;
  onCreateGroup: () => void;
}) {
  const node = storeApi.getState().nodes.find((n) => n.id === nodeId);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

  return (
    <>
      {/* Move to Group */}
      <div className="relative">
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-default"
          onMouseEnter={() => setShowMoveSubmenu(true)}
          onMouseLeave={() => setShowMoveSubmenu(false)}
        >
          Move to Group
          <span className="ml-auto text-xs text-muted-foreground">&#9656;</span>
        </button>
        {showMoveSubmenu && (
          <div
            className="absolute left-full top-0 ml-1 min-w-[160px] rounded-md border bg-popover p-1 shadow-md z-10"
            onMouseEnter={() => setShowMoveSubmenu(true)}
            onMouseLeave={() => setShowMoveSubmenu(false)}
          >
            {groups.map((g) => (
              <button
                key={g.id}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  storeApi.getState().moveNodeToGroup(nodeId, g.id);
                  onClose();
                }}
              >
                {g.label}
                {node?.groupId === g.id && <span className="ml-auto text-xs text-primary">&#10003;</span>}
              </button>
            ))}
            <div className="h-px bg-border my-1" />
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground"
              onClick={() => {
                storeApi.getState().moveNodeToGroup(nodeId, undefined);
                onClose();
              }}
            >
              No Group
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-primary"
              onClick={onCreateGroup}
            >
              + Create New Group...
            </button>
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="h-px bg-border my-1" />
      {(['must-have', 'should-have', 'nice-to-have'] as const).map((p) => (
        <button
          key={p}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          onClick={() => {
            storeApi.getState().updateNode(nodeId, { priority: p });
            onClose();
          }}
        >
          <span className={`w-2 h-2 rounded-full ${
            p === 'must-have' ? 'bg-red-500' : p === 'should-have' ? 'bg-amber-500' : 'bg-blue-400'
          }`} />
          {p === 'must-have' ? 'Must Have' : p === 'should-have' ? 'Should Have' : 'Nice to Have'}
          {node?.priority === p && <span className="ml-auto text-xs text-primary">&#10003;</span>}
        </button>
      ))}

      {/* Delete */}
      <div className="h-px bg-border my-1" />
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-destructive/10 text-destructive"
        onClick={() => {
          storeApi.getState().deleteNode(nodeId);
          onClose();
        }}
      >
        Delete Node
      </button>
    </>
  );
}

function EdgeContextMenuItems({
  edgeId,
  storeApi,
  onClose,
}: {
  edgeId: string;
  storeApi: ReturnType<typeof useJourneyMapperStoreApi>;
  onClose: () => void;
}) {
  const edge = storeApi.getState().edges.find((e) => e.id === edgeId);

  return (
    <>
      {/* Flow type */}
      {(['primary', 'secondary', 'error'] as const).map((ft) => (
        <button
          key={ft}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          onClick={() => {
            storeApi.getState().updateEdge(edgeId, { flowType: ft });
            onClose();
          }}
        >
          <span className={`w-2 h-0.5 ${
            ft === 'primary' ? 'bg-primary' : ft === 'error' ? 'bg-red-500' : 'bg-muted-foreground'
          }`} style={{ display: 'inline-block', width: 12 }} />
          {ft.charAt(0).toUpperCase() + ft.slice(1)} Flow
          {edge?.flowType === ft && <span className="ml-auto text-xs text-primary">&#10003;</span>}
        </button>
      ))}

      {/* Delete */}
      <div className="h-px bg-border my-1" />
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-destructive/10 text-destructive"
        onClick={() => {
          storeApi.getState().deleteEdge(edgeId);
          onClose();
        }}
      >
        Delete Connection
      </button>
    </>
  );
}

export function UXJourneyMapper(props: UXJourneyMapperProps) {
  return (
    <ReactFlowProvider>
      <JourneyMapperInner {...props} />
    </ReactFlowProvider>
  );
}

'use client';

import { useMemo, useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sparkles, Loader2 } from 'lucide-react';

import { MindMapNode } from '@/components/canvas/mind-map-node';
import { MindMapEdge } from '@/components/canvas/mind-map-edge';
import { getLayoutedElements } from '@/lib/canvas/mind-map-layout';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import {
  THEME_COLORS,
  ROOT_COLOR,
  getThemeColorForNode,
  type ThemeColor,
} from '@/lib/canvas/mind-map-theme-colors';
import type {
  MindMapNodeState,
  MindMapEdgeState,
} from '@/stores/canvas-store';
import { Button } from '@/components/ui/button';

// Define node and edge types outside component to prevent re-renders
const nodeTypes = { mindMapNode: MindMapNode };
const edgeTypes = { mindMapEdge: MindMapEdge };

export type MindMapCanvasProps = {
  workshopId: string;
  stepId: string;
  hmwStatement?: string;
};

export function MindMapCanvas({
  workshopId,
  stepId,
  hmwStatement,
}: MindMapCanvasProps) {
  const mindMapNodes = useCanvasStore((state) => state.mindMapNodes);
  const mindMapEdges = useCanvasStore((state) => state.mindMapEdges);
  const addMindMapNode = useCanvasStore((state) => state.addMindMapNode);
  const updateMindMapNode = useCanvasStore((state) => state.updateMindMapNode);
  const deleteMindMapNode = useCanvasStore((state) => state.deleteMindMapNode);
  const setMindMapState = useCanvasStore((state) => state.setMindMapState);

  const { fitView } = useReactFlow();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // Initialize with root node if empty
  useEffect(() => {
    if (mindMapNodes.length === 0 && hmwStatement) {
      const rootNode: MindMapNodeState = {
        id: 'root',
        label: hmwStatement || 'How might we...?',
        themeColorId: 'gray',
        themeColor: ROOT_COLOR.color,
        themeBgColor: ROOT_COLOR.bgColor,
        isRoot: true,
        level: 0,
      };
      setMindMapState([rootNode], []);
    }
  }, [mindMapNodes.length, hmwStatement, setMindMapState]);

  // Convert store state to ReactFlow nodes
  const rfNodes: Node[] = useMemo(() => {
    return mindMapNodes.map((nodeState) => ({
      id: nodeState.id,
      type: 'mindMapNode',
      position: { x: 0, y: 0 }, // dagre will recalculate
      data: {
        label: nodeState.label,
        themeColorId: nodeState.themeColorId,
        themeColor: nodeState.themeColor,
        themeBgColor: nodeState.themeBgColor,
        isRoot: nodeState.isRoot,
        level: nodeState.level,
        onLabelChange: handleLabelChange,
        onAddChild: handleAddChild,
        onDelete: handleDelete,
      },
    }));
  }, [mindMapNodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert store state to ReactFlow edges
  const rfEdges: Edge[] = useMemo(() => {
    return mindMapEdges.map((edgeState) => ({
      id: edgeState.id,
      source: edgeState.source,
      target: edgeState.target,
      type: 'mindMapEdge',
      data: {
        themeColor: edgeState.themeColor,
      },
    }));
  }, [mindMapEdges]);

  // Calculate dagre layout
  const layoutedNodes = useMemo(() => {
    if (rfNodes.length === 0) return [];
    const { nodes } = getLayoutedElements(rfNodes, rfEdges, { direction: 'LR' });
    return nodes;
  }, [rfNodes, rfEdges]);

  // Callback: Update node label (no layout recalculation)
  const handleLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      updateMindMapNode(nodeId, { label: newLabel });
    },
    [updateMindMapNode]
  );

  // Callback: Add child node
  const handleAddChild = useCallback(
    (parentId: string) => {
      const parentNode = mindMapNodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const childLevel = parentNode.level + 1;

      // Soft warning if level >= 3 (but still allow)
      if (childLevel >= 3) {
        const shouldContinue = window.confirm(
          'Adding nodes at depth 3+ may make the mind map harder to read. Continue?'
        );
        if (!shouldContinue) return;
      }

      // Determine theme color
      let themeColor: ThemeColor;
      if (parentNode.isRoot) {
        // Level-1 node: auto-assign from THEME_COLORS based on sibling count
        const existingLevel1Nodes = mindMapNodes.filter((n) => n.level === 1);
        const colorIndex = existingLevel1Nodes.length % THEME_COLORS.length;
        themeColor = THEME_COLORS[colorIndex];
      } else {
        // Deeper node: inherit parent's themeColorId
        const inheritedColor = THEME_COLORS.find(
          (c) => c.id === parentNode.themeColorId
        );
        themeColor = inheritedColor || ROOT_COLOR;
      }

      // Create new node
      const newNodeId = crypto.randomUUID();
      const newNode: MindMapNodeState = {
        id: newNodeId,
        label: '',
        themeColorId: themeColor.id,
        themeColor: themeColor.color,
        themeBgColor: themeColor.bgColor,
        isRoot: false,
        level: childLevel,
        parentId,
      };

      // Create new edge
      const newEdge: MindMapEdgeState = {
        id: `${parentId}-${newNodeId}`,
        source: parentId,
        target: newNodeId,
        themeColor: themeColor.color,
      };

      addMindMapNode(newNode, newEdge);
    },
    [mindMapNodes, addMindMapNode]
  );

  // Callback: Delete node with cascade confirmation
  const handleDelete = useCallback(
    (nodeId: string) => {
      const nodeToDelete = mindMapNodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return;

      // Cannot delete root
      if (nodeToDelete.isRoot) {
        return;
      }

      // Count descendants via BFS
      const descendants = new Set<string>();
      const queue = [nodeId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const childEdges = mindMapEdges.filter((e) => e.source === currentId);
        childEdges.forEach((edge) => {
          descendants.add(edge.target);
          queue.push(edge.target);
        });
      }

      // Confirm if has descendants
      if (descendants.size > 0) {
        const shouldDelete = window.confirm(
          `Delete this node and ${descendants.size} child node(s)?`
        );
        if (!shouldDelete) return;
      }

      deleteMindMapNode(nodeId);
    },
    [mindMapNodes, mindMapEdges, deleteMindMapNode]
  );

  // Callback: AI theme suggestion
  const handleSuggestThemes = useCallback(async () => {
    setIsSuggesting(true);
    setSuggestionError(null);

    try {
      // Get root node HMW statement
      const rootNode = mindMapNodes.find((n) => n.isRoot);
      if (!rootNode) {
        setSuggestionError('No root node found');
        return;
      }

      // Collect existing theme labels from level-1 nodes
      const existingThemes = mindMapNodes
        .filter((n) => n.level === 1)
        .map((n) => n.label)
        .filter(Boolean);

      // Call AI suggestion endpoint
      const response = await fetch('/api/ai/suggest-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          hmwStatement: rootNode.label,
          existingThemes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate theme suggestions');
      }

      const data = await response.json();
      const themes: string[] = data.themes || [];

      if (themes.length === 0) {
        setSuggestionError('No themes generated');
        return;
      }

      // Add each theme as a level-1 child of root
      const existingLevel1Count = mindMapNodes.filter((n) => n.level === 1).length;

      themes.forEach((themeLabel, index) => {
        // Determine theme color based on existing + new count
        const colorIndex = (existingLevel1Count + index) % THEME_COLORS.length;
        const themeColor = THEME_COLORS[colorIndex];

        // Create new node
        const newNodeId = crypto.randomUUID();
        const newNode: MindMapNodeState = {
          id: newNodeId,
          label: themeLabel,
          themeColorId: themeColor.id,
          themeColor: themeColor.color,
          themeBgColor: themeColor.bgColor,
          isRoot: false,
          level: 1,
          parentId: 'root',
        };

        // Create new edge
        const newEdge: MindMapEdgeState = {
          id: `root-${newNodeId}`,
          source: 'root',
          target: newNodeId,
          themeColor: themeColor.color,
        };

        addMindMapNode(newNode, newEdge);
      });

      // Fit view to show all nodes after adding themes
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
    } catch (error) {
      console.error('Theme suggestion error:', error);
      setSuggestionError('Failed to generate themes. Please try again.');
    } finally {
      setIsSuggesting(false);
    }
  }, [mindMapNodes, workshopId, addMindMapNode, fitView]);

  // Check if button should be visible (< 6 level-1 branches)
  const level1Count = mindMapNodes.filter((n) => n.level === 1).length;
  const showSuggestButton = level1Count < 6;

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={layoutedNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}  // dagre controls positions
        nodesConnectable={false}  // no manual edge creation
        edgesFocusable={false}
        selectNodesOnDrag={false}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor={(n) => {
            const color = n.data?.themeColor;
            return typeof color === 'string' ? color : '#6b7280';
          }}
          nodeColor={(n) => {
            const bgColor = n.data?.themeBgColor;
            return typeof bgColor === 'string' ? bgColor : '#f3f4f6';
          }}
          maskColor="rgba(0,0,0,0.1)"
        />

        {showSuggestButton && (
          <Panel position="top-right" className="!m-3">
            <div className="bg-background border rounded-lg shadow-sm p-3 space-y-2">
              <Button
                onClick={handleSuggestThemes}
                disabled={isSuggesting}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                {isSuggesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isSuggesting ? 'Generating...' : 'Suggest Themes'}
              </Button>
              {suggestionError && (
                <p className="text-xs text-destructive">{suggestionError}</p>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

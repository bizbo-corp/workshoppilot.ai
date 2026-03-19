'use client';

/**
 * BrainRewritingContainerNode — ReactFlow group node that wraps brain rewriting
 * matrices in a bordered container ("Brain Rewriting").
 *
 * Child brain-rewriting group nodes use `parentId` to stay inside this container.
 * Dimensions are set via ReactFlow's `style` prop (computed dynamically).
 */

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { GitBranchPlus, ArrowRight } from 'lucide-react';
import { BR_NODE_WIDTH, BR_NODE_HEIGHT_DEFAULT, BR_NODE_GAP, computeBrNodeHeight } from './brain-rewriting-group-node';

export const BR_CONTAINER_PADDING = 20;
export const BR_CONTAINER_HEADER_HEIGHT = 48;
export const BR_CONTAINER_FOOTER_HEIGHT = 56;

export type BrainRewritingContainerNodeData = {
  title: string;
  matrixCount: number;
  isActive: boolean;
  onDone?: () => void;
};

export type BrainRewritingContainerNodeType = Node<BrainRewritingContainerNodeData, 'brainRewritingContainerNode'>;

/** Compute the container dimensions based on how many matrices it holds.
 * @param matrixCount - Number of matrices (columns)
 * @param cellCountPerMatrix - Number of iteration cells per matrix (for dynamic row height). Defaults to 3 (legacy).
 */
export function computeBrainRewritingContainerSize(matrixCount: number, cellCountPerMatrix?: number) {
  const cols = matrixCount;
  const nodeHeight = cellCountPerMatrix != null ? computeBrNodeHeight(cellCountPerMatrix) : BR_NODE_HEIGHT_DEFAULT;
  const width = BR_CONTAINER_PADDING * 2 + cols * BR_NODE_WIDTH + Math.max(0, cols - 1) * BR_NODE_GAP;
  const height = BR_CONTAINER_HEADER_HEIGHT + BR_CONTAINER_PADDING * 2 + nodeHeight + BR_CONTAINER_FOOTER_HEIGHT;
  return { width, height };
}

function BrainRewritingContainerNodeComponent({ data }: NodeProps<BrainRewritingContainerNodeType>) {
  const { title, matrixCount, isActive, onDone } = data;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: isActive
          ? 'color-mix(in srgb, var(--color-card) 85%, transparent)'
          : 'color-mix(in srgb, var(--color-card) 60%, transparent)',
        border: `2px solid ${isActive ? 'color-mix(in srgb, var(--color-primary) 35%, transparent)' : 'color-mix(in srgb, var(--color-border) 25%, transparent)'}`,
        borderRadius: 16,
        opacity: isActive ? 1 : 0.7,
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: BR_CONTAINER_HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid color-mix(in srgb, var(--color-border) 20%, transparent)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitBranchPlus style={{ width: 16, height: 16, color: 'var(--color-primary)', opacity: 0.8 }} />
          <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.8 }}>
            {title}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              opacity: 0.5,
              backgroundColor: 'color-mix(in srgb, var(--color-muted) 50%, transparent)',
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {matrixCount} iteration{matrixCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Footer bar with proceed button */}
      {onDone && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: BR_CONTAINER_FOOTER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 16px',
            borderTop: '1px solid color-mix(in srgb, var(--color-border) 20%, transparent)',
            pointerEvents: 'none',
          }}
        >
          <button
            onClick={onDone}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-primary-foreground)',
              backgroundColor: 'var(--color-primary)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <ArrowRight style={{ width: 14, height: 14 }} />
            Proceed to Concept Development
          </button>
        </div>
      )}
    </div>
  );
}

export const BrainRewritingContainerNode = memo(BrainRewritingContainerNodeComponent);

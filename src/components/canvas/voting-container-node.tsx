'use client';

/**
 * VotingContainerNode — ReactFlow group node that wraps voting cards
 * in a draggable, bordered container ("Voting Results").
 *
 * Child voting card/group nodes use `parentId` to stay inside this container.
 * Dimensions are set via ReactFlow's `style` prop (computed dynamically).
 */

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Vote } from 'lucide-react';

export type VotingContainerNodeData = {
  title: string;
  cardCount: number;
  isActive: boolean;        // true during idea-selection
  votingStatus: 'idle' | 'open' | 'closed';
};

export type VotingContainerNodeType = Node<VotingContainerNodeData, 'votingContainerNode'>;

function VotingContainerNodeComponent({ data }: NodeProps<VotingContainerNodeType>) {
  const { title, cardCount, isActive, votingStatus } = data;

  const statusLabel =
    votingStatus === 'open' ? 'Voting Open' :
    votingStatus === 'closed' ? 'Voting Closed' :
    '';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: isActive
          ? 'color-mix(in srgb, var(--color-card) 85%, transparent)'
          : 'color-mix(in srgb, var(--color-card) 60%, transparent)',
        border: `2px solid color-mix(in srgb, var(--color-border) ${isActive ? '40%' : '25%'}, transparent)`,
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
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid color-mix(in srgb, var(--color-border) 20%, transparent)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Vote style={{ width: 16, height: 16, opacity: 0.6 }} />
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
            {cardCount} idea{cardCount !== 1 ? 's' : ''}
          </span>
        </div>
        {statusLabel && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              opacity: 0.6,
              color: votingStatus === 'open' ? '#16a34a' : undefined,
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export const VotingContainerNode = memo(VotingContainerNodeComponent);

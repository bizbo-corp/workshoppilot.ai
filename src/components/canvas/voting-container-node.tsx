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
import { PhaseContainerShell } from './phase-container-shell';

export type VotingContainerNodeData = {
  title: string;
  cardCount: number;
  isActive: boolean;        // true during idea-selection
  votingStatus: 'idle' | 'open' | 'closed';
  stepNumber?: number;      // phase step badge (e.g. 3)
};

export type VotingContainerNodeType = Node<VotingContainerNodeData, 'votingContainerNode'>;

function VotingContainerNodeComponent({ data }: NodeProps<VotingContainerNodeType>) {
  const { title, cardCount, isActive, votingStatus, stepNumber } = data;

  const statusLabel =
    votingStatus === 'open' ? 'Voting Open' :
    votingStatus === 'closed' ? 'Voting Closed' :
    '';

  const headerExtra = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Vote style={{ width: 16, height: 16, opacity: 0.6 }} />
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
  );

  return (
    <PhaseContainerShell
      stepNumber={stepNumber ?? 3}
      title={title}
      isActive={isActive}
      width="100%"
      height="100%"
      headerExtra={headerExtra}
    />
  );
}

export const VotingContainerNode = memo(VotingContainerNodeComponent);

'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export type OwnerZoneNodeData = {
  ownerName: string;
  ownerColor: string; // hex color
};

export type OwnerZoneNode = Node<OwnerZoneNodeData, 'ownerZoneNode'>;

export const OwnerZoneNode = memo(({ data }: NodeProps<OwnerZoneNode>) => {
  return (
    <div
      style={{
        width: 1600,
        height: 1400,
        backgroundColor: `${data.ownerColor}14`,
        border: `2px solid ${data.ownerColor}26`,
        borderRadius: 16,
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: data.ownerColor,
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      >
        {data.ownerName}
      </div>
    </div>
  );
});

OwnerZoneNode.displayName = 'OwnerZoneNode';

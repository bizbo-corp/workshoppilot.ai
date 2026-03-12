'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export type OwnerZoneNodeData = {
  ownerName: string;
  ownerThemeColor: string;   // CSS variable e.g. var(--mm-blue) — text/border
  ownerThemeBgColor: string; // CSS variable e.g. var(--mm-blue-bg) — pastel bg
};

export type OwnerZoneNode = Node<OwnerZoneNodeData, 'ownerZoneNode'>;

export const OwnerZoneNode = memo(({ data }: NodeProps<OwnerZoneNode>) => {
  return (
    <div
      style={{
        width: 1600,
        height: 1400,
        backgroundColor: `color-mix(in srgb, ${data.ownerThemeBgColor} 30%, transparent)`,
        border: `2px solid color-mix(in srgb, ${data.ownerThemeColor} 12%, transparent)`,
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
          color: data.ownerThemeColor,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        {data.ownerName}
      </div>
    </div>
  );
});

OwnerZoneNode.displayName = 'OwnerZoneNode';

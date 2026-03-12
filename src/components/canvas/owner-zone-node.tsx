'use client';

import { memo } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import type { NodeProps, Node } from '@xyflow/react';

export type OwnerZoneNodeData = {
  ownerName: string;
  ownerThemeColor: string;   // CSS variable e.g. var(--mm-blue) — text/border
  ownerThemeBgColor: string; // CSS variable e.g. var(--mm-blue-bg) — pastel bg
  isSelf?: boolean;          // true only for the current participant's own zone
  isReady?: boolean;         // participant has signaled "I'm done"
  showDoneButton?: boolean;  // show the "I'm Done" toggle button
  onToggleReady?: () => void;
  width?: number;            // override default 1600 (e.g. 2600 when crazy 8s visible)
  starCount?: number;        // number of starred mind map nodes (max 8)
};

export type OwnerZoneNode = Node<OwnerZoneNodeData, 'ownerZoneNode'>;

export const OwnerZoneNode = memo(({ data }: NodeProps<OwnerZoneNode>) => {
  return (
    <div
      style={{
        width: data.width || 1600,
        height: 1400,
        backgroundColor: `color-mix(in srgb, ${data.ownerThemeBgColor} 30%, transparent)`,
        border: `2px solid color-mix(in srgb, ${data.ownerThemeColor} 12%, transparent)`,
        borderRadius: 16,
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      {/* Owner name + ready indicator */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 14,
          fontWeight: 600,
          color: data.ownerThemeColor,
          opacity: data.isReady ? 0.7 : 0.5,
          pointerEvents: 'none',
        }}
      >
        {data.isReady && (
          <CheckCircle2
            style={{ width: 16, height: 16, color: '#16a34a', flexShrink: 0 }}
          />
        )}
        {data.ownerName}
        {data.isReady && (
          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
            Ready
          </span>
        )}
        {typeof data.starCount === 'number' && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              marginLeft: 8,
              fontSize: 12,
              fontWeight: 500,
              color: data.starCount > 0 ? data.ownerThemeColor : 'rgba(0,0,0,0.3)',
            }}
          >
            <Star
              style={{
                width: 13,
                height: 13,
                ...(data.starCount > 0 ? { fill: 'currentColor' } : {}),
              }}
            />
            {data.starCount}/8
          </span>
        )}
      </div>

      {/* "I'm Done" toggle button — only for current participant's own zone */}
      {data.isSelf && data.showDoneButton && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={data.onToggleReady}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              borderRadius: 9999,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              border: data.isReady ? '2px solid #16a34a' : '2px solid #d1d5db',
              backgroundColor: data.isReady ? '#16a34a' : '#ffffff',
              color: data.isReady ? '#ffffff' : '#374151',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            {data.isReady && (
              <CheckCircle2 style={{ width: 16, height: 16 }} />
            )}
            {data.isReady ? "I'm Done" : "I'm Done"}
          </button>
        </div>
      )}
    </div>
  );
});

OwnerZoneNode.displayName = 'OwnerZoneNode';

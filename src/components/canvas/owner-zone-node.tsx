'use client';

import { memo } from 'react';
import { Icon } from '@/components/ui/icon';
import type { NodeProps, Node } from '@xyflow/react';

export const OWNER_ZONE_HEADER_HEIGHT = 32;

export type OwnerZoneNodeData = {
  ownerName: string;
  ownerThemeColor: string;   // CSS variable e.g. var(--mm-blue) — text/border
  ownerThemeBgColor: string; // CSS variable e.g. var(--mm-blue-bg) — pastel bg
  isSelf?: boolean;          // true only for the current participant's own zone
  isReady?: boolean;         // participant has signaled "I'm done"
  showDoneButton?: boolean;  // show the "I'm Done" toggle button
  onToggleReady?: () => void;
  width?: number;            // override default 1600 (e.g. 2600 when crazy 8s visible)
  height?: number;           // override default 1400 (taller when crazy 8s below)
  starCount?: number;        // number of starred mind map nodes (max 8)
  isDraggable?: boolean;     // whether the zone can be dragged (facilitator or self)
  showConfirmButton?: boolean; // show "Continue to Crazy 8s" (facilitator only)
  onConfirmMindMap?: () => void;
  isConfirmingMindMap?: boolean;
};

export type OwnerZoneNode = Node<OwnerZoneNodeData, 'ownerZoneNode'>;

export const OwnerZoneNode = memo(({ data }: NodeProps<OwnerZoneNode>) => {
  return (
    <div
      style={{
        width: data.width || 1600,
        height: data.height || 1400,
        // Neutral olive container chrome — participant identity lives in the header badge,
        // not the lane background (matches persona / journey-mapping styling).
        backgroundColor: 'color-mix(in srgb, var(--neutral-olive-500) 10%, transparent)',
        border: '1.5px solid color-mix(in srgb, var(--neutral-olive-500) 32%, transparent)',
        borderRadius: 16,
        pointerEvents: data.isDraggable ? 'auto' : 'none',
        position: 'relative',
      }}
    >
      {/* Header bar — olive, with a participant color+name badge */}
      <div
        className="owner-zone-drag-handle"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: OWNER_ZONE_HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          borderRadius: '14px 14px 0 0',
          backgroundColor: 'var(--olive-600)',
          pointerEvents: data.isDraggable ? 'auto' : 'none',
          cursor: data.isDraggable ? 'grab' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Participant badge — pill in the participant's selected color */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 9999,
              backgroundColor: data.ownerThemeBgColor,
              border: `1px solid color-mix(in srgb, ${data.ownerThemeColor} 35%, transparent)`,
              maxWidth: 260,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                backgroundColor: data.ownerThemeColor,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: data.ownerThemeColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {data.ownerName}
            </span>
          </span>
          {data.isReady && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="check-circle"
                style={{ width: 14, height: 14, color: '#ffffff', flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 500 }}>
                Ready
              </span>
            </span>
          )}
        </div>

        {/* Right side: star count */}
        {typeof data.starCount === 'number' && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              fontWeight: 500,
              color: data.starCount > 0 ? '#ffffff' : 'rgba(255,255,255,0.55)',
            }}
          >
            <Icon name="star"
              style={{
                width: 12,
                height: 12,
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
            bottom: data.showConfirmButton ? 72 : 24,
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
              <Icon name="check-circle" style={{ width: 16, height: 16 }} />
            )}
            {data.isReady ? "I'm Done" : "I'm Done"}
          </button>
        </div>
      )}

      {/* "Continue to Crazy 8s" button — facilitator only (isSelf not required, participantId is null for owners) */}
      {data.showConfirmButton && (
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
            onClick={data.onConfirmMindMap}
            disabled={data.isConfirmingMindMap}
            className="nodrag nopan"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              borderRadius: 9999,
              fontSize: 14,
              fontWeight: 600,
              cursor: data.isConfirmingMindMap ? 'wait' : 'pointer',
              transition: 'all 150ms ease',
              border: '2px solid #b3efbd',
              backgroundColor: '#b3efbd',
              color: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
              opacity: data.isConfirmingMindMap ? 0.7 : 1,
            }}
          >
            {data.isConfirmingMindMap ? (
              <Icon name="spinner" className="animate-spin" style={{ width: 16, height: 16 }} />
            ) : (
              <Icon name="arrow-right" style={{ width: 16, height: 16 }} />
            )}
            {data.isConfirmingMindMap ? 'Enhancing...' : 'Continue to Crazy 8s'}
          </button>
        </div>
      )}
    </div>
  );
});

OwnerZoneNode.displayName = 'OwnerZoneNode';

'use client';

import { useDraggable } from '@dnd-kit/core';
import { UI_KIT_LABELS, type UIKitComponentType } from '@/lib/drawing/ui-kit-components';

interface PaletteItemProps {
  componentType: UIKitComponentType;
}

/**
 * Individual draggable palette item with preview icon
 */
export function PaletteItem({ componentType }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${componentType}`,
    data: { componentType },
  });

  const displayName = UI_KIT_LABELS[componentType];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200
        bg-white hover:bg-gray-50 hover:border-blue-300
        cursor-grab active:cursor-grabbing transition-all
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      {/* Simple SVG preview icon */}
      <div className="w-12 h-12 flex items-center justify-center">
        <ComponentPreviewIcon componentType={componentType} />
      </div>

      {/* Component name */}
      <div className="text-xs font-medium text-gray-700 text-center">
        {displayName}
      </div>

      {/* Helper text */}
      <div className="text-[10px] text-gray-400">Drag to canvas</div>
    </div>
  );
}

/**
 * Simple SVG preview icons for each component type
 */
function ComponentPreviewIcon({ componentType }: { componentType: UIKitComponentType }) {
  switch (componentType) {
    case 'button':
      return (
        <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
          <rect x="0" y="0" width="40" height="20" rx="4" fill="#3B82F6" stroke="#2563EB" strokeWidth="1" />
          <text x="20" y="14" fontSize="8" fill="white" textAnchor="middle">Btn</text>
        </svg>
      );
    case 'input':
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
          <rect x="0" y="0" width="40" height="16" rx="2" fill="white" stroke="#D1D5DB" strokeWidth="1" />
          <line x1="4" y1="8" x2="36" y2="8" stroke="#E5E7EB" strokeWidth="1" />
        </svg>
      );
    case 'card':
      return (
        <svg width="40" height="32" viewBox="0 0 40 32" fill="none">
          <rect x="0" y="0" width="40" height="32" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="0" y1="10" x2="40" y2="10" stroke="#E5E7EB" strokeWidth="1" />
        </svg>
      );
    case 'navbar':
      return (
        <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
          <rect x="0" y="0" width="40" height="12" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="4" y="4" width="4" height="4" fill="#1F2937" />
          <rect x="32" y="4" width="4" height="4" fill="#6B7280" />
        </svg>
      );
    case 'modal':
      return (
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
          <rect x="0" y="0" width="36" height="28" rx="4" fill="white" stroke="#D1D5DB" strokeWidth="1.5" />
          <line x1="0" y1="8" x2="36" y2="8" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="24" y="22" width="10" height="4" rx="2" fill="#3B82F6" />
        </svg>
      );
    case 'dropdown':
      return (
        <svg width="36" height="16" viewBox="0 0 36 16" fill="none">
          <rect x="0" y="0" width="36" height="16" rx="2" fill="white" stroke="#D1D5DB" strokeWidth="1" />
          <path d="M30 6 L28 8 L26 6" stroke="#6B7280" strokeWidth="1" fill="none" />
        </svg>
      );
    case 'tab':
      return (
        <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
          <rect x="0" y="0" width="12" height="14" fill="white" stroke="#3B82F6" strokeWidth="1" />
          <rect x="13" y="0" width="12" height="14" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="26" y="0" width="12" height="14" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1" />
        </svg>
      );
    case 'iconPlaceholder':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="0" y="0" width="24" height="24" rx="2" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="4" stroke="#9CA3AF" strokeWidth="1" fill="none" />
        </svg>
      );
    case 'imagePlaceholder':
      return (
        <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
          <rect x="0" y="0" width="40" height="24" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
          <line x1="0" y1="0" x2="40" y2="24" stroke="#D1D5DB" strokeWidth="1" />
          <line x1="40" y1="0" x2="0" y2="24" stroke="#D1D5DB" strokeWidth="1" />
        </svg>
      );
    case 'listItem':
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
          <rect x="0" y="0" width="40" height="16" fill="white" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="2" y="2" width="12" height="12" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
          <line x1="16" y1="8" x2="36" y2="8" stroke="#1F2937" strokeWidth="1" />
        </svg>
      );
    default:
      return null;
  }
}

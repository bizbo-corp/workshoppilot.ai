'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load emoji picker to avoid bloating main bundle (~200KB)
const Picker = dynamic(
  () => import('@emoji-mart/react').then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div className="w-[352px] h-[435px] bg-gray-100 animate-pulse rounded-lg" />
    ),
  }
);

interface EmojiPickerToolProps {
  isOpen: boolean;
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

/**
 * Lazy-loaded emoji picker popup for stamping emojis onto the canvas.
 * Uses emoji-mart with dynamic imports to keep bundle size small.
 */
export function EmojiPickerTool({ isOpen, onEmojiSelect, onClose }: EmojiPickerToolProps) {
  const [data, setData] = useState<any>(null);

  // Lazy-load emoji data when picker opens
  useEffect(() => {
    if (isOpen && !data) {
      import('@emoji-mart/data').then((mod) => setData(mod.default));
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: 'transparent' }}
      />

      {/* Picker popup */}
      <div className="fixed top-14 right-4 z-50 shadow-lg rounded-lg overflow-hidden">
        {data && (
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              onEmojiSelect(emoji.native);
              onClose();
            }}
            theme="light"
            previewPosition="none"
            skinTonePosition="search"
          />
        )}
      </div>
    </>
  );
}

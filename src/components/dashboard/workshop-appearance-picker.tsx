'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { Smile, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { WORKSHOP_COLORS, getWorkshopColor, type WorkshopColor } from '@/lib/workshop/workshop-appearance';

// Lazy-load emoji picker (~200KB only when opened)
const Picker = dynamic(
  () => import('@emoji-mart/react').then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div className="w-[352px] h-[435px] bg-muted animate-pulse rounded-lg" />
    ),
  }
);

interface WorkshopAppearancePickerProps {
  workshopId: string;
  color: string | null;
  emoji: string | null;
  onUpdate: (workshopId: string, updates: { color?: string; emoji?: string | null }) => Promise<void>;
}

export function WorkshopAppearancePicker({
  workshopId,
  color,
  emoji,
  onUpdate,
}: WorkshopAppearancePickerProps) {
  const currentColor = getWorkshopColor(color);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiData, setEmojiData] = useState<any>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

  // Lazy-load emoji data when picker opens
  useEffect(() => {
    if (emojiPickerOpen && !emojiData) {
      import('@emoji-mart/data').then((mod) => setEmojiData(mod.default));
    }
  }, [emojiPickerOpen, emojiData]);

  const openEmojiPicker = useCallback(() => {
    if (emojiBtnRef.current) {
      const rect = emojiBtnRef.current.getBoundingClientRect();
      setPickerPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setEmojiPickerOpen(true);
  }, []);

  const handleColorSelect = (newColor: WorkshopColor) => {
    onUpdate(workshopId, { color: newColor.id });
  };

  const handleEmojiSelect = (emojiNative: string) => {
    onUpdate(workshopId, { emoji: emojiNative });
    setEmojiPickerOpen(false);
  };

  return (
    <div
      className="flex items-center gap-1.5"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {/* Color picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Change workshop color"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <span
              className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20"
              style={{ backgroundColor: currentColor.hex }}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="p-2"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {WORKSHOP_COLORS.map((c) => (
              <button
                key={c.id}
                className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: c.bgHex }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleColorSelect(c);
                }}
                aria-label={c.label}
              >
                <span
                  className="relative h-4 w-4 rounded-full border border-black/10 dark:border-white/20"
                  style={{ backgroundColor: c.hex }}
                >
                  {c.id === currentColor.id && (
                    <Check className="absolute inset-0 m-auto h-2.5 w-2.5 text-white" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Emoji picker */}
      <button
        ref={emojiBtnRef}
        className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Choose emoji"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (emojiPickerOpen) {
            setEmojiPickerOpen(false);
          } else {
            openEmojiPicker();
          }
        }}
      >
        {emoji ? (
          <span className="text-sm leading-none">{emoji}</span>
        ) : (
          <Smile className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Emoji picker portal — rendered at document.body to avoid overflow clipping and Link navigation */}
      {emojiPickerOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setEmojiPickerOpen(false)}
          />
          {/* Picker */}
          <div
            className="fixed shadow-xl rounded-lg overflow-hidden"
            style={{
              zIndex: 9999,
              top: pickerPos.top,
              left: pickerPos.left,
            }}
          >
            {emojiData && (
              <Picker
                data={emojiData}
                onEmojiSelect={(emojiObj: any) => handleEmojiSelect(emojiObj.native)}
                theme="auto"
                previewPosition="none"
                skinTonePosition="search"
              />
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

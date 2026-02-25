/**
 * New Workshop Dialog
 * Lets user name their workshop and optionally pick a color/emoji before creation.
 */

'use client';

import { useState, useEffect, useRef, useTransition, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Smile, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createWorkshopSession } from '@/actions/workshop-actions';
import { WORKSHOP_COLORS, type WorkshopColor } from '@/lib/workshop/workshop-appearance';
import { toast } from 'sonner';

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

interface NewWorkshopButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: ReactNode;
}

export function NewWorkshopButton({ variant, size, className, children }: NewWorkshopButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<WorkshopColor>(WORKSHOP_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiData, setEmojiData] = useState<any>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setSelectedColor(WORKSHOP_COLORS[0]);
      setSelectedEmoji(null);
      setEmojiPickerOpen(false);
    }
  }, [open]);

  // Lazy-load emoji data when picker opens
  useEffect(() => {
    if (emojiPickerOpen && !emojiData) {
      import('@emoji-mart/data').then((mod) => setEmojiData(mod.default));
    }
  }, [emojiPickerOpen, emojiData]);

  const handleEmojiSelect = (emojiNative: string) => {
    setSelectedEmoji(emojiNative);
    setEmojiPickerOpen(false);
  };

  const trimmedTitle = title.trim();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createWorkshopSession(formData);
      } catch (error) {
        // NEXT_REDIRECT errors are expected — they indicate successful navigation
        const digest = (error as Record<string, unknown>)?.digest;
        if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
          throw error;
        }
        toast.error('Failed to create workshop', { duration: 4000 });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md overflow-visible">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Workshop</DialogTitle>
            <DialogDescription>
              Give your workshop a name to get started.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Title input */}
            <div>
              <label htmlFor="workshop-title" className="text-sm font-medium text-foreground">
                Workshop name
              </label>
              <Input
                id="workshop-title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Pet Care App, Coffee Marketplace"
                className="mt-1.5"
                autoFocus
                maxLength={100}
              />
            </div>

            {/* Color + Emoji pickers */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Color & emoji
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                {/* Color grid */}
                <div className="flex items-center gap-1.5">
                  {WORKSHOP_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ backgroundColor: c.bgHex }}
                      onClick={() => setSelectedColor(c)}
                      aria-label={c.label}
                    >
                      <span
                        className="relative h-4 w-4 rounded-full border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: c.hex }}
                      >
                        {c.id === selectedColor.id && (
                          <Check className="absolute inset-0 m-auto h-2.5 w-2.5 text-white" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Emoji button */}
                <div ref={emojiContainerRef} className="relative">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-input transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Choose emoji"
                    onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                  >
                    {selectedEmoji ? (
                      <span className="text-sm leading-none">{selectedEmoji}</span>
                    ) : (
                      <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Emoji picker — rendered inline inside dialog to stay within its stacking context */}
            {emojiPickerOpen && (
              <div className="relative">
                {/* Backdrop to close picker on outside click (within dialog) */}
                <div className="fixed inset-0" style={{ zIndex: 1 }} onClick={() => setEmojiPickerOpen(false)} />
                <div className="absolute left-0 top-0 z-10 shadow-xl rounded-lg overflow-hidden">
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
              </div>
            )}
          </div>

          {/* Hidden inputs for server action */}
          <input type="hidden" name="color" value={selectedColor.id} />
          <input type="hidden" name="emoji" value={selectedEmoji || ''} />

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmedTitle || isPending}>
              {isPending ? 'Creating...' : 'Create Workshop'}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}

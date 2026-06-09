/**
 * New Workshop Dialog
 * Lets user name their workshop and optionally pick a color/emoji before creation.
 */

'use client';

import { useState, useEffect, useRef, useTransition, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
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
import {
  WORKSHOP_COLORS,
  getRandomWorkshopColor,
  getRandomWorkshopEmoji,
  type WorkshopColor,
} from '@/lib/workshop/workshop-appearance';
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
  /**
   * Preselects a paid tier for the workshop. When set:
   *  - 'team'        → dialog opens locked to team mode, redirects to $299 Stripe checkout on submit
   *  - 'white_glove' → dialog opens locked to team mode, redirects to $1,499 Stripe checkout on submit
   * When omitted (default), user picks freely and Solo/Team are both options with optional upfront pay.
   */
  preselectTier?: 'team' | 'white_glove';
}

export function NewWorkshopButton({ variant, size, className, children, preselectTier }: NewWorkshopButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<WorkshopColor>(WORKSHOP_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  // 'solo' = just me (old flow). 'team' = facilitator-led with email invites (maps to workshopType=multiplayer).
  // Null until the user explicitly picks — forces a deliberate choice instead of defaulting to solo.
  const [facilitatorMode, setFacilitatorMode] = useState<'solo' | 'team' | null>(
    preselectTier ? 'team' : null
  );
  // When set, the workshop is paid for at creation (Stripe checkout) rather than at the Step 7 paywall.
  // 'team' = $299, 'white_glove' = $1,499. Null = free trial through Steps 1-6.
  const [tierToBuy, setTierToBuy] = useState<'team' | 'white_glove' | null>(
    preselectTier ?? null
  );
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [emojiData, setEmojiData] = useState<any>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Reset state when dialog opens. Color/emoji get a fresh random pick each open
  // (done here, not in useState, to avoid an SSR/client hydration mismatch).
  useEffect(() => {
    if (open) {
      setTitle('');
      setSelectedColor(getRandomWorkshopColor());
      setSelectedEmoji(getRandomWorkshopEmoji());
      setFacilitatorMode(preselectTier ? 'team' : null);
      setTierToBuy(preselectTier ?? null);
      setEmojiPickerOpen(false);
      setCustomizeOpen(false);
    }
  }, [open, preselectTier]);

  // If user switches away from team mode (only possible without preselectTier),
  // the upfront paid tier is no longer relevant.
  useEffect(() => {
    if (facilitatorMode !== 'team' && tierToBuy) {
      setTierToBuy(null);
    }
  }, [facilitatorMode, tierToBuy]);

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
      <DialogContent className="sm:max-w-lg overflow-visible">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {preselectTier === 'white_glove'
                ? 'Start your White Glove workshop'
                : preselectTier === 'team'
                  ? 'Start your team workshop'
                  : 'Start a new workshop'}
            </DialogTitle>
            <DialogDescription>
              {preselectTier
                ? 'Name it, then we’ll send you to checkout.'
                : 'How will you run this?'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            {/* Mode picker — hidden when a paid tier is preselected (the user already
                committed to team via the pricing CTA). */}
            {!preselectTier && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFacilitatorMode('solo')}
                    aria-pressed={facilitatorMode === 'solo'}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      facilitatorMode === 'solo'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-background hover:border-muted-foreground/40 hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      facilitatorMode === 'solo' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      <Icon name="message-square" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">By myself</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">AI guides you through all 10 steps.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFacilitatorMode('team')}
                    aria-pressed={facilitatorMode === 'team'}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      facilitatorMode === 'team'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-background hover:border-muted-foreground/40 hover:bg-accent'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      facilitatorMode === 'team' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      <Icon name="users" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">With my team</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">You lead. Invite teammates by email.</p>
                    </div>
                  </button>
                </div>

                {/* Team mode upfront-pay opt-in — only when team is selected and no preselect.
                    Default = free trial; checkbox flips tierToBuy='team' for upfront $299. */}
                {facilitatorMode === 'team' && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Free to start. Pay <span className="font-semibold text-foreground">$299</span> when you unlock the Build Pack.
                    </p>
                    <label className="mt-2 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tierToBuy === 'team'}
                        onChange={(e) => setTierToBuy(e.target.checked ? 'team' : null)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-input"
                      />
                      <span className="text-xs text-foreground">
                        Pay $299 now to skip the unlock prompt later.
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Preselected paid tier — show a banner instead of the mode picker. */}
            {preselectTier && (
              <div className={cn(
                'rounded-lg border p-4',
                preselectTier === 'white_glove'
                  ? 'border-amber-500/40 bg-amber-50/50 dark:border-amber-400/30 dark:bg-amber-950/20'
                  : 'border-olive-500/40 bg-olive-50/50 dark:border-olive-400/30 dark:bg-olive-950/20'
              )}>
                <div className="flex items-start gap-3">
                  <Icon name="users" className="h-5 w-5 text-foreground/70 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {preselectTier === 'white_glove' ? 'White Glove — $1,499' : 'Team Workshop — $299'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {preselectTier === 'white_glove'
                        ? 'After you name your workshop, we’ll send you to Stripe checkout. Once paid, you’ll book your onboarding call.'
                        : 'After you name your workshop, we’ll send you to Stripe checkout. Your team workshop unlocks immediately on payment.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                maxLength={100}
              />
            </div>

            {/* Customize — collapsed by default. Color/emoji are decoration; defer until
                after the mode + name decisions to keep this dialog focused. */}
            <div>
              <button
                type="button"
                onClick={() => setCustomizeOpen((v) => !v)}
                aria-expanded={customizeOpen}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                <Icon name="chevron-down" className={cn('h-3.5 w-3.5 transition-transform', customizeOpen && 'rotate-180')} />
                Customize color &amp; emoji
              </button>
              {customizeOpen && (
                <div className="mt-2.5 flex items-center gap-3">
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
                            <Icon name="check" className="absolute inset-0 m-auto h-2.5 w-2.5 text-white" />
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
                        <Icon name="smile" className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              )}
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
          <input type="hidden" name="facilitatorMode" value={facilitatorMode ?? ''} />
          <input
            type="hidden"
            name="workshopType"
            value={facilitatorMode === 'team' ? 'multiplayer' : 'solo'}
          />
          <input type="hidden" name="tierToBuy" value={tierToBuy ?? ''} />

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!trimmedTitle || !facilitatorMode || isPending}>
              {isPending
                ? 'Creating…'
                : tierToBuy === 'white_glove'
                  ? 'Continue to checkout — $1,499'
                  : tierToBuy === 'team'
                    ? 'Continue to checkout — $299'
                    : 'Continue'}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}

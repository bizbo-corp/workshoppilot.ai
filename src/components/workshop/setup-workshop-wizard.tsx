'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { setupWorkshop } from '@/actions/workshop-setup-actions';
import {
  DURATION_OPTIONS,
  MAX_TEAM_INVITES,
  type DurationMinutes,
  COMMON_TIMEZONES,
  detectBrowserTimezone,
  formatDuration,
  getTimezoneLabel,
} from '@/lib/workshop/workshop-schedule';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SetupWorkshopWizardProps {
  workshopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The HMW challenge statement — surfaced prominently in step 1.
   *  idea/problem/audience are accepted but no longer rendered; kept on the type
   *  so the callsite doesn't need a separate refactor. */
  challenge: {
    hmwStatement: string | null;
    idea?: string | null;
    problem?: string | null;
    audience?: string | null;
  };
}

type WizardStep = 'review' | 'schedule';
type StartMode = 'start_now' | 'schedule';

function defaultDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function SetupWorkshopWizard(props: SetupWorkshopWizardProps) {
  // Remount the wizard each time it opens so we don't have to manually reset state.
  // The `key` flip forces a fresh component instance, which is the React-idiomatic
  // way to clear local state without setState-in-useEffect.
  return props.open ? <SetupWorkshopWizardBody key="open" {...props} /> : null;
}

function SetupWorkshopWizardBody({
  workshopId,
  open,
  onOpenChange,
  challenge,
}: SetupWorkshopWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('review');
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [mode, setMode] = useState<StartMode>('start_now');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState<DurationMinutes>(90);
  // Lazy-init from the browser TZ. Server renders with 'UTC' but the component is client-only
  // (it's gated by `open`), so this only runs in the browser. The facilitator can override it
  // via the picker in the schedule step if the auto-detected zone is wrong.
  const [timezone, setTimezone] = useState<string>(() => detectBrowserTimezone());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addEmail(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!value) return;
    if (!EMAIL_REGEX.test(value)) {
      setEmailError(`"${value}" doesn't look like an email`);
      return;
    }
    if (emails.includes(value)) {
      setEmailError(`"${value}" was already added`);
      return;
    }
    if (emails.length >= MAX_TEAM_INVITES) {
      setEmailError(`Maximum ${MAX_TEAM_INVITES} participants`);
      return;
    }
    setEmails((prev) => [...prev, value]);
    setDraft('');
    setEmailError(null);
  }

  function handleEmailKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      if (draft.trim()) {
        event.preventDefault();
        addEmail(draft);
      }
    } else if (event.key === 'Backspace' && draft === '' && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text');
    if (/[\s,]/.test(pasted)) {
      event.preventDefault();
      pasted
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach(addEmail);
    }
  }

  function handleSubmit() {
    // Sweep an in-flight draft into the list
    const finalEmails = [...emails];
    if (draft.trim()) {
      const value = draft.trim().toLowerCase();
      if (EMAIL_REGEX.test(value) && !finalEmails.includes(value)) {
        finalEmails.push(value);
      }
    }
    if (finalEmails.length === 0) {
      setEmailError('Add at least one email');
      setStep('review');
      return;
    }

    setSubmitError(null);
    startTransition(async () => {
      try {
        const res = await setupWorkshop({
          workshopId,
          emails: finalEmails,
          mode,
          schedule:
            mode === 'schedule'
              ? { date, time, durationMinutes: duration, timezone }
              : undefined,
        });

        const sendFailures = res.invites.skipped.filter((s) => s.reason === 'send-failed');
        if (res.invites.sent > 0) {
          toast.success(
            `Sent ${res.invites.sent} invitation${res.invites.sent === 1 ? '' : 's'}`
          );
        }
        if (sendFailures.length > 0) {
          // Show one detailed toast per failure so the facilitator can see the Resend error
          // (e.g. "domain not verified", "rate limit", "invalid recipient").
          for (const f of sendFailures) {
            toast.error(`Couldn't email ${f.email}`, {
              description: f.detail ?? 'Email send failed. Check server logs.',
              duration: 10_000,
            });
          }
          // Keep the wizard open if every send failed — otherwise navigate.
          if (sendFailures.length === res.invites.skipped.length && res.invites.sent === 0) {
            return;
          }
        }
        const otherSkipped = res.invites.skipped.filter((s) => s.reason !== 'send-failed');
        if (otherSkipped.length > 0 && res.invites.sent === 0 && sendFailures.length === 0) {
          toast.warning('No invitations sent', {
            description: otherSkipped
              .map((s) => `${s.email}: ${s.reason.replace(/-/g, ' ')}`)
              .join(', '),
          });
        }

        onOpenChange(false);
        router.push(res.redirectUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not complete setup';
        setSubmitError(msg);
        toast.error(msg);
      }
    });
  }

  const pendingEmailCount =
    emails.length + (draft.trim() && EMAIL_REGEX.test(draft.trim()) ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-2">
          <DialogTitle>Set up workshop</DialogTitle>
          <DialogDescription asChild>
            <WizardStepBar current={step} />
          </DialogDescription>
        </DialogHeader>

        {step === 'review' && (
          <ReviewAndInviteStep
            challenge={challenge}
            emails={emails}
            draft={draft}
            error={emailError}
            onDraftChange={setDraft}
            onAdd={addEmail}
            onRemove={(email) => setEmails((prev) => prev.filter((e) => e !== email))}
            onKeyDown={handleEmailKey}
            onPaste={handlePaste}
            onCancel={() => onOpenChange(false)}
            onNext={() => {
              if (!challenge.hmwStatement) return;
              const ready = emails.length > 0 || (draft.trim() && EMAIL_REGEX.test(draft.trim()));
              if (!ready) {
                setEmailError('Add at least one email');
                return;
              }
              if (draft.trim()) addEmail(draft);
              setStep('schedule');
            }}
          />
        )}

        {step === 'schedule' && (
          <ScheduleStep
            mode={mode}
            onModeChange={setMode}
            date={date}
            onDateChange={setDate}
            time={time}
            onTimeChange={setTime}
            duration={duration}
            onDurationChange={setDuration}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            emailCount={pendingEmailCount}
            submitError={submitError}
            isSubmitting={isPending}
            onBack={() => setStep('review')}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function WizardStepBar({ current }: { current: WizardStep }) {
  const items: { id: WizardStep; label: string }[] = [
    { id: 'review', label: 'Review & invite' },
    { id: 'schedule', label: 'Schedule' },
  ];
  const currentIdx = items.findIndex((i) => i.id === current);
  return (
    <span className="flex items-center gap-3 text-xs">
      {items.map((item, idx) => (
        <span key={item.id} className="inline-flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5',
              idx === currentIdx ? 'font-semibold text-foreground' : 'text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold',
                idx === currentIdx
                  ? 'bg-foreground text-background'
                  : idx < currentIdx
                  ? 'bg-muted text-muted-foreground'
                  : 'border border-border text-muted-foreground'
              )}
            >
              {idx + 1}
            </span>
            {item.label}
          </span>
          {idx < items.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'h-px w-8 transition-colors',
                idx < currentIdx ? 'bg-foreground' : 'bg-border'
              )}
            />
          )}
        </span>
      ))}
    </span>
  );
}

function ReviewAndInviteStep({
  challenge,
  emails,
  draft,
  error,
  onDraftChange,
  onAdd,
  onRemove,
  onKeyDown,
  onPaste,
  onCancel,
  onNext,
}: {
  challenge: SetupWorkshopWizardProps['challenge'];
  emails: string[];
  draft: string;
  error: string | null;
  onDraftChange: (v: string) => void;
  onAdd: (raw: string) => void;
  onRemove: (email: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-9 pt-3">
      {/* Hero challenge — the HMW carries this section on its own; no eyebrow needed. */}
      <section className="space-y-2.5">
        {challenge.hmwStatement ? (
          <blockquote className="border-l-2 border-amber-500/80 pl-5 text-xl leading-relaxed italic text-foreground">
            {challenge.hmwStatement}
          </blockquote>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No challenge statement yet — go back and fill in the &quot;How might we&quot; sticky.
          </p>
        )}
        <p className="pl-5 text-xs text-muted-foreground">
          Your team will see this in the invite email and the lobby.
        </p>
      </section>

      {/* Invite section — single line of helper + a softer input with the counter
          floating inside on the right. No bottom metadata row. */}
      <section className="space-y-2.5">
        <p className="text-sm text-muted-foreground">
          Invite up to {MAX_TEAM_INVITES} teammates. They&apos;ll get a magic link — no account needed.
        </p>
        <div className="relative flex flex-wrap items-center gap-1.5 rounded-lg border border-input/50 bg-muted/30 p-2.5 pr-16 transition-colors focus-within:border-input focus-within:bg-background">
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {email}
              <button
                type="button"
                onClick={() => onRemove(email)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${email}`}
              >
                <Icon name="close" className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            type="email"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => draft.trim() && onAdd(draft)}
            placeholder={
              emails.length === 0
                ? `Add up to ${MAX_TEAM_INVITES} emails — Enter, comma, or paste`
                : 'Add another…'
            }
            className="min-w-[10rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled={emails.length >= MAX_TEAM_INVITES}
          />
          <span
            aria-hidden
            className="absolute bottom-2 right-2.5 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground shadow-sm ring-1 ring-border/60"
          >
            {emails.length} / {MAX_TEAM_INVITES}
          </span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" onClick={onCancel}>
          Go back and edit
        </Button>
        <Button onClick={onNext} disabled={!challenge.hmwStatement}>
          Pick a time <Icon name="arrow-right" className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ScheduleStep({
  mode,
  onModeChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  duration,
  onDurationChange,
  timezone,
  onTimezoneChange,
  emailCount,
  submitError,
  isSubmitting,
  onBack,
  onSubmit,
}: {
  mode: StartMode;
  onModeChange: (m: StartMode) => void;
  date: string;
  onDateChange: (v: string) => void;
  time: string;
  onTimeChange: (v: string) => void;
  duration: DurationMinutes;
  onDurationChange: (d: DurationMinutes) => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  emailCount: number;
  submitError: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6 pt-2">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          When should it start?
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ModeCard
            active={mode === 'start_now'}
            icon={<Icon name="zap" className="h-5 w-5" />}
            title="Start now"
            description="Email goes out immediately. Anyone who clicks the link drops straight into the workshop."
            onClick={() => onModeChange('start_now')}
          />
          <ModeCard
            active={mode === 'schedule'}
            icon={<Icon name="calendar" className="h-5 w-5" />}
            title="Schedule for later"
            description="Pick a date and time. Participants wait in the lobby until you click Start."
            onClick={() => onModeChange('schedule')}
          />
        </div>
      </section>

      {mode === 'schedule' && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Time
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Duration
            </span>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDurationChange(d)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    duration === d
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background hover:bg-accent'
                  )}
                >
                  {formatDuration(d)}
                </button>
              ))}
            </div>
          </div>
          <TimezonePicker timezone={timezone} onTimezoneChange={onTimezoneChange} />
        </section>
      )}

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <Icon name="arrow-left" className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            'Sending…'
          ) : (
            <>
              <Icon name="user-plus" className="mr-1.5 h-4 w-4" />
              {mode === 'start_now'
                ? `Send ${emailCount} invite${emailCount === 1 ? '' : 's'} & start now`
                : `Send ${emailCount} invite${emailCount === 1 ? '' : 's'} & open lobby`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all',
        active
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:border-muted-foreground/40 hover:bg-accent'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

/**
 * Shows the auto-detected timezone as "Auckland (NZST, GMT+12)" with a "Change"
 * affordance that reveals a select populated from COMMON_TIMEZONES. The
 * currently-selected zone is always added to the list (and pre-selected) so a
 * facilitator whose zone isn't curated still sees it in the dropdown.
 */
function TimezonePicker({
  timezone,
  onTimezoneChange,
}: {
  timezone: string;
  onTimezoneChange: (tz: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const label = getTimezoneLabel(timezone);

  // Build the picker options. Include the current zone at the top if it's not
  // in the curated list, so the dropdown is never missing the active value.
  const options = COMMON_TIMEZONES.some((t) => t.tz === timezone)
    ? COMMON_TIMEZONES
    : [{ tz: timezone, label: label.city }, ...COMMON_TIMEZONES];

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5">
      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{label.friendly}</p>
            <p className="text-xs text-muted-foreground">
              Times shown in your timezone. Participants see them in their own.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs font-semibold text-foreground underline underline-offset-4 hover:text-primary"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Timezone
          </span>
          <select
            value={timezone}
            onChange={(e) => {
              onTimezoneChange(e.target.value);
              setEditing(false);
            }}
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {options.map((opt) => {
              const optLabel = getTimezoneLabel(opt.tz);
              return (
                <option key={opt.tz} value={opt.tz}>
                  {opt.label} — {optLabel.abbr} ({optLabel.offset})
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

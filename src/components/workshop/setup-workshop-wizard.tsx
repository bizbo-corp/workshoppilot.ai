'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus, Calendar, Zap, ArrowLeft, ArrowRight } from 'lucide-react';
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
  detectBrowserTimezone,
  formatDuration,
} from '@/lib/workshop/workshop-schedule';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SetupWorkshopWizardProps {
  workshopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Read-only challenge content surfaced in Step 1 of the wizard. */
  challenge: {
    hmwStatement: string | null;
    idea: string | null;
    problem: string | null;
    audience: string | null;
  };
}

type WizardStep = 'confirm' | 'invite' | 'schedule';
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
  const [step, setStep] = useState<WizardStep>('confirm');
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [mode, setMode] = useState<StartMode>('start_now');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState<DurationMinutes>(90);
  // Lazy-init from the browser TZ. Server renders with 'UTC' but the component is client-only
  // (it's gated by `open`), so this only runs in the browser.
  const [timezone] = useState<string>(() => detectBrowserTimezone());
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
      setStep('invite');
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

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Set up workshop</DialogTitle>
          <DialogDescription>
            <WizardStepBar current={step} />
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' && (
          <ConfirmChallengeStep
            challenge={challenge}
            onNext={() => setStep('invite')}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {step === 'invite' && (
          <InviteEmailsStep
            emails={emails}
            draft={draft}
            error={emailError}
            onDraftChange={setDraft}
            onAdd={addEmail}
            onRemove={(email) => setEmails((prev) => prev.filter((e) => e !== email))}
            onKeyDown={handleEmailKey}
            onPaste={handlePaste}
            onBack={() => setStep('confirm')}
            onNext={() => {
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
            emailCount={emails.length + (draft.trim() && EMAIL_REGEX.test(draft.trim()) ? 1 : 0)}
            submitError={submitError}
            isSubmitting={isPending}
            onBack={() => setStep('invite')}
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
    { id: 'confirm', label: '1 · Challenge' },
    { id: 'invite', label: '2 · Invite' },
    { id: 'schedule', label: '3 · Schedule' },
  ];
  const currentIdx = items.findIndex((i) => i.id === current);
  return (
    <span className="mt-1 flex items-center gap-2 text-xs">
      {items.map((item, idx) => (
        <span
          key={item.id}
          className={cn(
            'inline-flex items-center gap-1',
            idx === currentIdx ? 'font-semibold text-foreground' : 'text-muted-foreground',
            idx < currentIdx && 'text-muted-foreground'
          )}
        >
          {item.label}
        </span>
      ))}
    </span>
  );
}

function ConfirmChallengeStep({
  challenge,
  onNext,
  onCancel,
}: {
  challenge: SetupWorkshopWizardProps['challenge'];
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your participants will see this challenge in the email and lobby. Make sure it&apos;s
        the version you want to ship.
      </p>
      <div className="rounded-xl border bg-card p-4 space-y-4">
        {challenge.hmwStatement ? (
          <blockquote className="border-l-2 border-amber-500 pl-3 italic text-base">
            {challenge.hmwStatement}
          </blockquote>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No challenge statement yet — go back and fill in the &quot;How might we&quot; sticky.
          </p>
        )}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
          <Field label="The idea" value={challenge.idea} />
          <Field label="The problem" value={challenge.problem} />
          <Field label="The audience" value={challenge.audience} />
        </dl>
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onCancel}>
          Go back and edit
        </Button>
        <Button onClick={onNext} disabled={!challenge.hmwStatement}>
          Looks good <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">
        {value && value.trim() ? value : <span className="italic text-muted-foreground">Not set</span>}
      </dd>
    </div>
  );
}

function InviteEmailsStep({
  emails,
  draft,
  error,
  onDraftChange,
  onAdd,
  onRemove,
  onKeyDown,
  onPaste,
  onBack,
  onNext,
}: {
  emails: string[];
  draft: string;
  error: string | null;
  onDraftChange: (v: string) => void;
  onAdd: (raw: string) => void;
  onRemove: (email: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add up to {MAX_TEAM_INVITES} participants by email. We&apos;ll send each person a magic
        link — they don&apos;t need an account.
      </p>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
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
              <X className="h-3 w-3" />
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
          placeholder={emails.length === 0 ? 'jane@example.com' : 'Add another…'}
          className="min-w-[10rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          disabled={emails.length >= MAX_TEAM_INVITES}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {emails.length} / {MAX_TEAM_INVITES} invited
        </span>
        <span>
          Press <kbd className="rounded border bg-muted px-1">Enter</kbd> or paste a list
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext}>
          Pick a time <ArrowRight className="ml-1.5 h-4 w-4" />
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
  emailCount: number;
  submitError: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ModeCard
          active={mode === 'start_now'}
          icon={<Zap className="h-5 w-5" />}
          title="Start now"
          description="Email goes out immediately. Anyone who clicks the link drops straight into the workshop."
          onClick={() => onModeChange('start_now')}
        />
        <ModeCard
          active={mode === 'schedule'}
          icon={<Calendar className="h-5 w-5" />}
          title="Schedule for later"
          description="Pick a date and time. Participants wait in the lobby until you click Start."
          onClick={() => onModeChange('schedule')}
        />
      </div>

      {mode === 'schedule' && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
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
          <p className="text-xs text-muted-foreground">
            Times shown in <strong>{timezone}</strong> — participants see them in their own timezone.
          </p>
        </div>
      )}

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            'Sending…'
          ) : (
            <>
              <UserPlus className="mr-1.5 h-4 w-4" />
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

'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { submitGuidedPilotInquiry } from '@/actions/guided-pilot-actions';
import { toast } from 'sonner';

/* ── Types ──────────────────────────────────────────────── */

interface GuidedPilotButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: ReactNode;
}

type Step = 1 | 2 | 3;

/* ── Constants ──────────────────────────────────────────── */

const GOALS = [
  { value: 'mvp', label: 'Build an MVP' },
  { value: 'pivot', label: 'Pivot / Rethink' },
  { value: 'corporate-innovation', label: 'Corporate Innovation' },
  { value: 'product-market-fit', label: 'Product-Market Fit' },
  { value: 'other', label: 'Other' },
] as const;

const STAKEHOLDER_COUNTS = [
  { value: '1-2', label: '1-2 people' },
  { value: '3-5', label: '3-5 people' },
  { value: '6-10', label: '6-10 people' },
  { value: '10+', label: '10+ people' },
] as const;

const TIMELINES = [
  { value: '1-week', label: '1 week' },
  { value: '2-4-weeks', label: '2-4 weeks' },
  { value: '1-2-months', label: '1-2 months' },
  { value: 'flexible', label: 'Flexible' },
] as const;

const HUBSPOT_URL = process.env.NEXT_PUBLIC_HUBSPOT_MEETINGS_URL;

/* ── Step Indicator ─────────────────────────────────────── */

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2, 3] as const).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              s === current
                ? 'bg-olive-600 dark:bg-olive-400'
                : s < current
                  ? 'bg-olive-400 dark:bg-olive-500'
                  : 'bg-muted-foreground/25'
            )}
          />
          {s < 3 && (
            <div
              className={cn(
                'h-px w-8 transition-colors',
                s < current ? 'bg-olive-400 dark:bg-olive-500' : 'bg-muted-foreground/25'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Select Field ───────────────────────────────────────── */

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="" disabled>
          Select...
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export function GuidedPilotButton({
  variant,
  size,
  className,
  children,
}: GuidedPilotButtonProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [invoiceChosen, setInvoiceChosen] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workshopGoal, setWorkshopGoal] = useState('');
  const [stakeholderCount, setStakeholderCount] = useState('');
  const [timeline, setTimeline] = useState('');
  const [notes, setNotes] = useState('');

  const resetState = () => {
    setStep(1);
    setName('');
    setEmail('');
    setWorkshopGoal('');
    setStakeholderCount('');
    setTimeline('');
    setNotes('');
    setInquiryId(null);
    setInvoiceChosen(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetState();
  };

  const isStep1Valid =
    name.trim() && email.trim() && workshopGoal && stakeholderCount && timeline;

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isStep1Valid) return;

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitGuidedPilotInquiry(formData);
      if (result.success) {
        setInquiryId(result.inquiryId);
        setStep(2);
      } else {
        toast.error(result.error || 'Something went wrong');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === 'link' ? (
          <button
            type="button"
            className={cn(
              'text-olive-600 dark:text-olive-400 font-medium underline underline-offset-2 hover:text-olive-700 dark:hover:text-olive-300 transition-colors cursor-pointer',
              className
            )}
          >
            {children ?? 'Book a Guided Workshop'}
          </button>
        ) : (
          <Button variant={variant} size={size} className={className}>
            {children ?? 'Book a Guided Workshop'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <StepIndicator current={step} />

        {/* ── Step 1: Intake Form ──────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit}>
            <DialogHeader>
              <DialogTitle>Tell us about your project</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Help us prepare the perfect guided workshop for you.
              </p>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gp-name" className="text-sm font-medium text-foreground">
                    Name
                  </label>
                  <Input
                    id="gp-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1.5"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="gp-email" className="text-sm font-medium text-foreground">
                    Email
                  </label>
                  <Input
                    id="gp-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="mt-1.5"
                    required
                  />
                </div>
              </div>

              <SelectField
                label="Workshop goal"
                name="workshopGoal"
                value={workshopGoal}
                onChange={setWorkshopGoal}
                options={GOALS}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="How many stakeholders?"
                  name="stakeholderCount"
                  value={stakeholderCount}
                  onChange={setStakeholderCount}
                  options={STAKEHOLDER_COUNTS}
                />
                <SelectField
                  label="Preferred timeline"
                  name="timeline"
                  value={timeline}
                  onChange={setTimeline}
                  options={TIMELINES}
                />
              </div>

              <div>
                <label htmlFor="gp-notes" className="text-sm font-medium text-foreground">
                  Anything else we should know?{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  id="gp-notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                  placeholder="Tell us about your idea, team, or any specific goals..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isStep1Valid || isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 2: Schedule a Call ──────────────────────── */}
        {step === 2 && (
          <div>
            <DialogHeader>
              <DialogTitle>Schedule a discovery call</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a time that works for you. We&apos;ll discuss your project and workshop approach.
              </p>
            </DialogHeader>

            <div className="mt-5">
              {HUBSPOT_URL ? (
                <iframe
                  src={HUBSPOT_URL}
                  title="Schedule a call"
                  className="w-full rounded-lg border border-border"
                  style={{ height: 600 }}
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-[400px] rounded-lg border border-dashed border-border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Calendar booking not configured. We&apos;ll reach out via email.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Skip — Pay Deposit Instead
              </button>
              <Button onClick={() => setStep(3)}>
                I&apos;ve booked my call
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Deposit ─────────────────────────────── */}
        {step === 3 && !invoiceChosen && (
          <div>
            <DialogHeader>
              <DialogTitle>Reserve your session</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Secure your guided workshop with a $250 deposit, or we&apos;ll send an invoice after your call.
              </p>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              {/* Summary */}
              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">The Guided Pilot includes:</h4>
                <ul className="space-y-2">
                  {[
                    'Full AI Build Pack',
                    '4-hour live facilitation with a Design Thinking expert',
                    'Expert PM review of your output',
                    'Stakeholder-ready presentation deck',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="h-4 w-4 text-olive-600 dark:text-olive-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border pt-3 flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">$1,100</span>
                </div>
              </div>

              {/* Deposit CTA */}
              {process.env.NEXT_PUBLIC_STRIPE_PRICE_GUIDED_DEPOSIT ? (
                <form method="POST" action="/api/billing/checkout">
                  <input
                    type="hidden"
                    name="priceId"
                    value={process.env.NEXT_PUBLIC_STRIPE_PRICE_GUIDED_DEPOSIT}
                  />
                  <Button type="submit" className="w-full" size="lg">
                    Pay $250 Deposit to Reserve
                  </Button>
                </form>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setInvoiceChosen(true)}
                >
                  Pay $250 Deposit to Reserve
                </Button>
              )}

              <button
                type="button"
                onClick={() => setInvoiceChosen(true)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Or we&apos;ll send you an invoice after the call
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirmation ────────────────────────── */}
        {step === 3 && invoiceChosen && (
          <div className="text-center py-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900">
              <Check className="h-6 w-6 text-olive-600 dark:text-olive-400" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">You&apos;re all set!</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto">
              We&apos;ll be in touch at <strong className="text-foreground">{email}</strong> with
              next steps and an invoice. Looking forward to working with you!
            </p>
            <Button className="mt-6" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

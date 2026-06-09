'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { submitWhiteGloveBooking } from '@/actions/white-glove-actions';

interface SchedulingFormProps {
  workshopId: string;
  defaultName: string;
  defaultEmail: string;
}

export function SchedulingForm({ workshopId, defaultName, defaultEmail }: SchedulingFormProps) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [preferredTimes, setPreferredTimes] = useState('');
  const [timezone, setTimezone] = useState(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !preferredTimes.trim()) {
      toast.error('Please fill out name, email, and your preferred times.');
      return;
    }
    startTransition(async () => {
      const result = await submitWhiteGloveBooking({
        workshopId,
        name: name.trim(),
        email: email.trim(),
        preferredTimes: preferredTimes.trim(),
        timezone,
        notes: notes.trim() || null,
      });
      if (result.ok) {
        toast.success("Booking received — we'll be in touch within one business day.");
        router.push('/dashboard');
      } else {
        toast.error(result.error ?? 'Could not submit. Please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="wgb-name">
          Your name
        </label>
        <Input
          id="wgb-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1.5"
          maxLength={100}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="wgb-email">
          Email
        </label>
        <Input
          id="wgb-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1.5"
          maxLength={200}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="wgb-times">
          Preferred times for the call
        </label>
        <textarea
          id="wgb-times"
          value={preferredTimes}
          onChange={(e) => setPreferredTimes(e.target.value)}
          required
          placeholder="e.g. Tue 2026-05-19 2-4pm, Wed 2026-05-20 mornings"
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
          maxLength={500}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="wgb-tz">
          Timezone
        </label>
        <Input
          id="wgb-tz"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          required
          className="mt-1.5"
          maxLength={100}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="wgb-notes">
          What would you like help with? <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="wgb-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything specific about your workshop, your team, or your goals."
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
          maxLength={1000}
        />
      </div>

      <Button type="submit" variant="primary" disabled={isPending} className="w-full" size="lg">
        {isPending ? 'Submitting…' : 'Send booking request'}
      </Button>
    </form>
  );
}

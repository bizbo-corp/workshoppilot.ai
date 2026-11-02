'use client';

import { useActionState } from 'react';
import { createWorkshop } from '@/actions/workshops';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';

type State = { error?: string };

async function submit(_prev: State, formData: FormData): Promise<State> {
  const result = await createWorkshop(formData);
  // createWorkshop redirects on success, so only the failure path returns.
  return result.success ? {} : { error: result.error };
}

export function NewWorkshopForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const [state, action, pending] = useActionState(submit, {});

  return (
    <form action={action} className="max-w-2xl space-y-3">
      <Textarea
        name="idea"
        autoFocus={autoFocus}
        required
        minLength={8}
        maxLength={600}
        rows={3}
        placeholder="For example: a booking app for mobile dog groomers, or a faster way to onboard new staff at our clinic"
        className="resize-none bg-card text-base"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? <Icon name="spinner" className="h-4 w-4 animate-spin" /> : null}
          Start the workshop
        </Button>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

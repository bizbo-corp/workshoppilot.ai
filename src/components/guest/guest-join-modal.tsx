'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignInModal } from '@/components/auth/sign-in-modal';

/**
 * GuestJoinModal
 * Full-screen overlay name entry modal for workshop guests.
 *
 * Design decisions:
 * - Full-screen overlay with bg-black/60 + backdrop-blur-sm ensures NO workshop
 *   content is visible behind the modal (per plan requirement).
 * - Card shows workshop title + facilitator name before the input to build trust
 *   without revealing any workshop content.
 * - Name validation: 2-30 chars trimmed. Inline error shown below input.
 * - Submit calls /api/guest-join with { shareToken, displayName }.
 * - Error feedback via sonner toast with inline fallback.
 */

export type GuestJoinResponse = {
  ok: true;
  participantId: string;
  workshopId: string;
  sessionId: string;
  displayName: string;
  color: string;
  rejoinToken: string;
};

export type NameMatchResponse = {
  ok: false;
  nameMatch: true;
  existingParticipant: { id: string; displayName: string; color: string };
};

interface GuestJoinModalProps {
  shareToken: string;
  workshopTitle: string;
  facilitatorName: string | null;
  rejoinToken?: string;
  onJoined: (response: GuestJoinResponse) => void;
}

export function GuestJoinModal({
  shareToken,
  workshopTitle,
  facilitatorName,
  rejoinToken,
  onJoined,
}: GuestJoinModalProps) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [nameMatchData, setNameMatchData] = useState<NameMatchResponse['existingParticipant'] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();

    // Client-side validation
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 30) {
      setNameError('Name must be 30 characters or fewer');
      return;
    }

    setNameError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/guest-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          displayName: trimmed,
          ...(rejoinToken ? { rejoinToken } : {}),
        }),
      });

      const data = await response.json();

      if (data.nameMatch) {
        setNameMatchData(data.existingParticipant);
        return;
      }

      if (!response.ok) {
        const message = data?.error ?? 'Failed to join. Try again.';
        toast.error(message);
        return;
      }

      onJoined(data as GuestJoinResponse);
    } catch {
      toast.error('Failed to join. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimParticipant = async () => {
    if (!nameMatchData) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/guest-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          displayName: name.trim(),
          claimParticipantId: nameMatchData.id,
        }),
      });

      if (!response.ok) {
        toast.error('Failed to rejoin. Try again.');
        return;
      }

      const data = await response.json() as GuestJoinResponse;
      onJoined(data);
    } catch {
      toast.error('Failed to rejoin. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinAsNew = async () => {
    setIsSubmitting(true);
    setNameMatchData(null);
    try {
      const response = await fetch('/api/guest-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          displayName: name.trim(),
          skipNameMatch: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(data?.error ?? 'Failed to join. Try again.');
        return;
      }

      const data = await response.json() as GuestJoinResponse;
      onJoined(data);
    } catch {
      toast.error('Failed to join. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    /* Full-screen overlay — no workshop content visible behind it */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{workshopTitle}</CardTitle>
          {facilitatorName && (
            <CardDescription>Hosted by {facilitatorName}</CardDescription>
          )}
        </CardHeader>

        {nameMatchData ? (
          <>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: nameMatchData.color }}
                />
                <p className="text-sm">
                  A participant named{' '}
                  <span className="font-semibold">{nameMatchData.displayName}</span>{' '}
                  is already in this workshop.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={isSubmitting}
                onClick={handleClaimParticipant}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejoining...
                  </>
                ) : (
                  "That's me — rejoin"
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
                onClick={handleJoinAsNew}
              >
                Join as new participant
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="guest-name"
                    className="text-sm font-medium leading-none"
                  >
                    Your name
                  </label>
                  <Input
                    id="guest-name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    maxLength={30}
                    disabled={isSubmitting}
                    autoFocus
                    autoComplete="off"
                  />
                  {nameError && (
                    <p className="text-xs text-destructive">{nameError}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Workshop'
                  )}
                </Button>
              </CardFooter>
            </form>

            <div className="px-6 pb-6 text-center">
              <button
                type="button"
                onClick={() => setShowSignIn(true)}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Have an account? Sign in
              </button>
            </div>
          </>
        )}
      </Card>

      <SignInModal
        open={showSignIn}
        onOpenChange={setShowSignIn}
        redirectUrl={`/join/${shareToken}`}
      />
    </div>
  );
}

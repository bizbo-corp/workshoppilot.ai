/**
 * Team settings tab (multiplayer workshops only).
 * Roster + remove, pending invites + resend/revoke, send new invites, copy link.
 * Reuses the existing invitation actions and the /api/remove-participant route.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { copyToClipboard } from '@/lib/clipboard';
import { getWorkshopTeam, type WorkshopTeam } from '@/actions/challenge-actions';
import { sendWorkshopInvites, revokeInvite, resendInvite } from '@/actions/invitation-actions';
import { republishChallenge } from '@/actions/challenge-approval-actions';

interface TeamSettingsTabProps {
  workshopId: string;
}

export function TeamSettingsTab({ workshopId }: TeamSettingsTabProps) {
  const [team, setTeam] = useState<WorkshopTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const data = await getWorkshopTeam(workshopId);
    setTeam(data);
    setLoading(false);
  }, [workshopId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async () => {
    if (!team?.shareToken) return;
    const url = `${window.location.origin}/join/${team.shareToken}`;
    if (await copyToClipboard(url)) {
      setCopied(true);
      toast('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy link.');
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setBusy(true);
    try {
      const result = await sendWorkshopInvites(workshopId, [email]);
      if (result.sent > 0) {
        toast(`Invite sent to ${email}`);
        setInviteEmail('');
      } else {
        const reason = result.skipped[0]?.reason ?? 'unknown';
        toast.error(`Could not invite ${email} (${reason})`);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send invite');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setBusy(true);
    try {
      await revokeInvite(invitationId);
      toast('Invitation revoked');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revoke');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    setBusy(true);
    try {
      await resendInvite(invitationId);
      toast('Invitation resent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resend');
    } finally {
      setBusy(false);
    }
  };

  const handleRepublish = async () => {
    setBusy(true);
    try {
      await republishChallenge(workshopId);
      toast('Challenge republished — participants asked to review again');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not republish');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (participantId: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/remove-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, workshopId }),
      });
      if (!res.ok) throw new Error('Remove failed');
      toast('Participant removed');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove participant');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!team) {
    return <p className="py-4 text-sm italic text-muted-foreground">Team data unavailable.</p>;
  }

  const hasChangeRequests = team.roster.some((p) => p.changeRequest);

  return (
    <div className="space-y-5 py-2">
      {/* Change requests → republish */}
      {hasChangeRequests && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-700/40 dark:bg-amber-950/30">
          <p className="text-sm text-foreground">
            Some participants requested changes. Edit the challenge, then republish to ask
            everyone to review again.
          </p>
          <Button size="sm" className="mt-2" onClick={handleRepublish} disabled={busy}>
            Republish challenge
          </Button>
        </div>
      )}

      {/* Invite link */}
      {team.shareToken && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy invite link
          </Button>
        </div>
      )}

      {/* Invite by email */}
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Invite by email {team.seatsRemaining === 0 && '(no seats left)'}
        </label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="teammate@example.com"
            value={inviteEmail}
            disabled={busy || team.seatsRemaining === 0}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleInvite();
              }
            }}
          />
          <Button size="sm" onClick={handleInvite} disabled={busy || !inviteEmail.trim() || team.seatsRemaining === 0}>
            Invite
          </Button>
        </div>
      </div>

      {/* Roster */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          People ({team.roster.length})
        </p>
        <ul className="space-y-1">
          {team.roster.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">
                {p.label}
                {p.role === 'facilitator' && (
                  <span className="ml-1 text-xs text-muted-foreground">(facilitator)</span>
                )}
              </span>
              {p.changeRequest && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  change requested
                </span>
              )}
              {p.role === 'participant' && (
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  disabled={busy}
                  title="Remove participant"
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
          {team.roster.length === 0 && (
            <li className="text-sm italic text-muted-foreground">No one has joined yet.</li>
          )}
        </ul>
      </div>

      {/* Pending invites */}
      {team.pendingInvites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending invites
          </p>
          <ul className="space-y-1">
            {team.pendingInvites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate text-muted-foreground">{inv.email}</span>
                <button
                  type="button"
                  onClick={() => handleResend(inv.id)}
                  disabled={busy}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke(inv.id)}
                  disabled={busy}
                  className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

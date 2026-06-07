/**
 * Challenge settings tab.
 * Solo workshops: inline-editable challenge fields (DB _canvas is the live source).
 * Multiplayer workshops: read-only — the challenge canvas is a live Liveblocks
 * room, so editing happens on the setup canvas (Step 1) pre-start, and is locked
 * once the session has started.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { getChallengeForViewer, updateChallenge } from '@/actions/challenge-actions';
import type { ChallengeArtifact } from '@/lib/workshop/challenge-artifact';

interface ChallengeSettingsTabProps {
  workshopId: string;
  sessionId: string;
  workshopType: 'solo' | 'multiplayer';
  workshopStarted: boolean;
}

export function ChallengeSettingsTab({
  workshopId,
  sessionId,
  workshopType,
  workshopStarted,
}: ChallengeSettingsTabProps) {
  const router = useRouter();
  const editable = workshopType === 'solo';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hmwStatement, setHmw] = useState('');
  const [idea, setIdea] = useState('');
  const [problem, setProblem] = useState('');
  const [audience, setAudience] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show skeleton while loading
    setLoading(true);
    getChallengeForViewer(workshopId)
      .then((data: ChallengeArtifact | null) => {
        if (cancelled || !data) return;
        setHmw(data.hmwStatement ?? '');
        setIdea(data.idea ?? '');
        setProblem(data.problem ?? '');
        setAudience(data.audience ?? '');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workshopId]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateChallenge(workshopId, { hmwStatement, idea, problem, audience });
    setSaving(false);
    if (result.success) {
      toast('Challenge updated');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Could not update the challenge');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // ── Read-only (multiplayer) ──
  if (!editable) {
    return (
      <div className="space-y-4 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Challenge statement
          </p>
          <blockquote className="mt-1 border-l-4 border-primary bg-olive-50/60 px-4 py-3 text-sm font-medium leading-relaxed text-foreground dark:bg-olive-900/30">
            {hmwStatement || <span className="italic text-muted-foreground">Not framed yet.</span>}
          </blockquote>
        </div>
        {idea && <ReadField label="The Idea" value={idea} />}
        {problem && <ReadField label="The Problem" value={problem} />}
        {audience && <ReadField label="The Audience" value={audience} />}

        {workshopStarted ? (
          <p className="rounded-md bg-olive-50/60 px-3 py-2 text-xs text-muted-foreground dark:bg-olive-900/20">
            The challenge is locked while the session is running.
          </p>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={`/workshop/${sessionId}/step/challenge`}>Edit on the setup canvas</Link>
          </Button>
        )}
      </div>
    );
  }

  // ── Editable (solo) ──
  return (
    <div className="space-y-4 py-2">
      <EditField label="Challenge statement" value={hmwStatement} onChange={setHmw} rows={3} />
      <EditField label="The Idea" value={idea} onChange={setIdea} rows={2} />
      <EditField label="The Problem" value={problem} onChange={setProblem} rows={2} />
      <EditField label="The Audience" value={audience} onChange={setAudience} rows={2} />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-olive-200/60 bg-olive-50/40 p-3 dark:border-olive-800/40 dark:bg-olive-900/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
    </div>
  );
}

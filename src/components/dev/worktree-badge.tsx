'use client';

import { useEffect, useState } from 'react';
import { getWorktreeBadge } from '@/actions/worktree-actions';

/**
 * Dev-only worktree label, rendered inline (e.g. inside the step footer, left of
 * the Next button). Fetches the label/color on mount via a server action so it
 * picks up `.worktree-label` edits on refresh. Renders nothing in production or
 * before the label resolves.
 */
export function WorktreeBadge() {
  const [badge, setBadge] = useState<{ label: string; colorClass: string } | null>(null);

  useEffect(() => {
    getWorktreeBadge().then(setBadge).catch(() => {});
  }, []);

  if (!badge) return null;

  return (
    <div
      className={`flex max-w-[40vw] items-center gap-1 truncate rounded-full ${badge.colorClass} px-2.5 py-1 font-mono text-[11px] font-semibold text-white shadow-sm`}
    >
      {badge.label}
    </div>
  );
}

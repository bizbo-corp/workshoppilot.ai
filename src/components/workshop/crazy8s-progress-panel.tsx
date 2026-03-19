'use client';

import { Check, Pencil } from 'lucide-react';

export type ParticipantProgress = {
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  isCompleted: boolean;
  filledSlots: number;
  totalSlots: number;
};

interface Crazy8sProgressPanelProps {
  participants: ParticipantProgress[];
}

/** Derive two-letter initials from a display name. */
function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  );
}

/**
 * Crazy8sProgressPanel — compact facilitator panel showing per-participant
 * completion status during the Crazy 8s drawing phase.
 *
 * Sorted: completed first, then by filled slot count descending.
 */
export function Crazy8sProgressPanel({ participants }: Crazy8sProgressPanelProps) {
  const completedCount = participants.filter((p) => p.isCompleted).length;

  // Sort: completed first, then by filledSlots descending
  const sorted = [...participants].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
    return b.filledSlots - a.filledSlots;
  });

  return (
    <div className="w-64 rounded-xl bg-card shadow-lg border border-border p-3">
      <div className="text-xs font-semibold text-muted-foreground mb-2">
        Sketching Progress ({completedCount}/{participants.length})
      </div>
      <div className="space-y-1.5">
        {sorted.map((p) => (
          <div key={p.ownerId} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0"
              style={{ backgroundColor: p.ownerColor }}
            >
              {getInitials(p.ownerName)}
            </div>
            <span className="text-xs text-foreground flex-1 truncate">
              {p.ownerName}
            </span>
            {p.isCompleted ? (
              <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium shrink-0">
                <Check className="w-3 h-3" />
                Done
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                <Pencil className="w-3 h-3" />
                {p.filledSlots}/{p.totalSlots}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

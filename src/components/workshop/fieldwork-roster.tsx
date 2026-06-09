"use client";

import * as React from "react";
import { Icon } from '@/components/ui/icon';
import type { FieldworkSubmission } from "@/stores/canvas-store";

/**
 * Compact roster of who has submitted their research during Step 3 Fieldwork.
 * Driven by the synced `fieldworkSubmissions` map (durable Liveblocks Storage),
 * so it reflects async submissions even from participants who've since left.
 */
export function FieldworkRoster({
  submissions,
}: {
  submissions: Record<string, FieldworkSubmission>;
}) {
  const entries = Object.values(submissions).sort(
    (a, b) => a.submittedAt - b.submittedAt,
  );

  return (
    <div className="rounded-xl border border-olive-200 bg-olive-50/60 p-3 dark:border-neutral-olive-700 dark:bg-neutral-olive-900/30">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Icon name="users" className="h-3.5 w-3.5 text-olive-600 dark:text-olive-400" />
        Research submitted ({entries.length})
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No one has submitted yet — they&apos;ll appear here as they finish.
        </p>
      ) : (
        <ul className="space-y-1">
          {entries.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: s.color || "#b3efbd" }}
              />
              <span className="truncate">{s.name || "Participant"}</span>
              <Icon name="check-circle" className="h-3 w-3 shrink-0 text-olive-600 dark:text-olive-400" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { BOARDS } from '@/lib/engine/boards';
import { useBoard, itemsIn } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';

/**
 * Eight slots, Crazy 8s style. A slot takes a few words or a photo of a
 * paper sketch. Shortlisting is a star on the slot.
 */
export function IdeaBoard() {
  const { state, update, add, workshopId } = useBoard();
  const def = BOARDS.idea_board;
  const shortlisted = state.boards.idea_board.filter((i) => i.meta?.shortlisted).length;

  return (
    <BoardFrame title={def.label} hint={`${shortlisted} shortlisted`}>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {def.zones.map((z, i) => {
          const item = itemsIn(state, 'idea_board', z.id)[0];
          const star = item?.meta?.shortlisted === true;
          return (
            <div key={z.id} data-zone-container={z.id} className="flex min-h-[9rem] flex-col bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
                {!item && (
                  <div className="flex items-center gap-1">
                    <UploadButton workshopId={workshopId} onUploaded={(url) => add('idea_board', z.id, 'Sketch', url)} />
                    <AddSticky board="idea_board" zone={z.id} label={`Idea ${i + 1}`} full={false} placeholder="A few words" />
                  </div>
                )}
              </div>
              {item && (
                <Sticky item={item} tone="yellow" className="flex-1">
                  <button
                    type="button"
                    onClick={() => update(item.id, { meta: { shortlisted: !star } })}
                    aria-pressed={star}
                    aria-label={star ? 'Remove from shortlist' : 'Shortlist'}
                    className={cn('mt-2 flex items-center gap-1 text-[11px]', star ? 'text-olive-700 dark:text-olive-300' : 'text-muted-foreground hover:text-foreground')}
                  >
                    <Icon name="star" weight={star ? 'fill' : 'regular'} className="h-3 w-3" /> {star ? 'Shortlisted' : 'Shortlist'}
                  </button>
                </Sticky>
              )}
            </div>
          );
        })}
      </div>
    </BoardFrame>
  );
}

/** Uploads an image to the workshop and hands back its URL. Free; clean-up is the paid step. */
export function UploadButton({ workshopId, onUploaded }: { workshopId: string; onUploaded: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Keep images under 8 MB');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('kind', 'sketch');
      const res = await fetch(`/api/w/${workshopId}/upload`, { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      onUploaded(json.url);
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <button
        type="button"
        aria-label="Upload a sketch"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
      >
        {busy ? <Icon name="spinner" className="h-3.5 w-3.5 animate-spin" /> : <Icon name="camera" className="h-3.5 w-3.5" />}
      </button>
    </>
  );
}

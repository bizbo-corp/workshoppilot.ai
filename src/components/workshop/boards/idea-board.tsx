'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { BOARDS } from '@/lib/engine/boards';
import { cleanUpSketch } from '@/actions/images';
import { useBoard, itemsIn, useBoardChange } from './board-context';
import { AddSticky, BoardFrame, Sticky } from './sticky';
import { DrawingPad } from './drawing-pad';

/**
 * Eight slots, Crazy 8s style. A slot takes a few words, a photo of a
 * paper sketch, or a drawing made here. Shortlisting is a star on the slot.
 */
export function IdeaBoard({ mode = 'ideate' }: { mode?: 'ideate' | 'shortlist' }) {
  const { state, update, add, workshopId } = useBoard();
  const def = BOARDS.idea_board;
  const shortlisted = state.boards.idea_board.filter((i) => i.meta?.shortlisted).length;
  const [drawingFor, setDrawingFor] = useState<string | null>(null);

  return (
    <BoardFrame title={def.label} hint={mode === 'shortlist' ? `Star one to three · ${shortlisted} shortlisted` : 'Sketch, snap a photo or type a few words'}>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {def.zones.map((z, i) => {
          const item = itemsIn(state, 'idea_board', z.id)[0];
          const star = item?.meta?.shortlisted === true;
          return (
            <div key={z.id} data-zone-container={z.id} className={cn('flex min-h-[10rem] flex-col bg-card p-3', star && 'bg-olive-50/50 dark:bg-neutral-olive-900/40')}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
                {!item && (
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Draw a sketch" onClick={() => setDrawingFor(z.id)} className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground">
                      <Icon name="pencil" className="h-3 w-3" />
                    </button>
                    <UploadButton workshopId={workshopId} onUploaded={(url) => add('idea_board', z.id, 'Sketch', url)} />
                    <AddSticky board="idea_board" zone={z.id} label={`Idea ${i + 1}`} full={false} placeholder="A few words" />
                  </div>
                )}
              </div>
              {item ? (
                <Sticky item={item} className="flex-1">
                  <button
                    type="button"
                    onClick={() => update(item.id, { meta: { shortlisted: !star } })}
                    aria-pressed={star}
                    aria-label={star ? 'Remove from shortlist' : 'Shortlist'}
                    className={cn('mt-2 flex items-center gap-1 text-[11px]', star ? 'font-medium text-olive-700 dark:text-olive-300' : 'text-muted-foreground hover:text-foreground')}
                  >
                    <Icon name="star" weight={star ? 'fill' : 'regular'} className="h-3 w-3" /> {star ? 'Shortlisted' : 'Shortlist'}
                  </button>
                  {item.imageUrl && !item.meta?.cleaned && <CleanUpButton workshopId={workshopId} itemId={item.id} credits={10} />}
                </Sticky>
              ) : (
                <p className="mt-auto text-[11px] text-muted-foreground/70">Empty slot</p>
              )}
            </div>
          );
        })}
      </div>
      {drawingFor && (
        <DrawingPad
          title={`Idea ${Number(drawingFor.slice(1))}`}
          onCancel={() => setDrawingFor(null)}
          onSave={async (blob) => {
            const url = await uploadBlob(workshopId, blob);
            if (url) add('idea_board', drawingFor, 'Sketch', url);
            setDrawingFor(null);
          }}
        />
      )}
    </BoardFrame>
  );
}

async function uploadBlob(workshopId: string, blob: Blob): Promise<string | null> {
  try {
    const body = new FormData();
    body.set('file', new File([blob], 'sketch.png', { type: 'image/png' }));
    body.set('kind', 'sketch');
    const res = await fetch(`/api/w/${workshopId}/upload`, { method: 'POST', body });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Upload failed');
    return json.url as string;
  } catch (err) {
    toast.error(String(err instanceof Error ? err.message : err));
    return null;
  }
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
    const url = await uploadBlob(workshopId, file);
    if (url) onUploaded(url);
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <button
        type="button"
        aria-label="Upload a photo"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
      >
        {busy ? <Icon name="spinner" className="h-3 w-3 animate-spin" /> : <Icon name="camera" className="h-3 w-3" />}
      </button>
    </>
  );
}

/** The paid clean-up. Credits are checked server-side; this just asks. */
function CleanUpButton({ workshopId, itemId, credits }: { workshopId: string; itemId: string; credits: number }) {
  const [pending, start] = useTransition();
  const { onChange } = useBoardChange();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await cleanUpSketch(workshopId, itemId);
          if (r.success) {
            onChange(r.data.state);
            toast.success('Cleaned up');
          } else toast.error(r.error);
        })
      }
      className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {pending ? <Icon name="spinner" className="h-3 w-3 animate-spin" /> : <Icon name="sparkles" className="h-3 w-3" />}
      Clean it up ({credits} credits)
    </button>
  );
}

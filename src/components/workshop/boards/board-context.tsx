'use client';

import { createContext, useContext, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { addBoardItem, removeBoardItem, updateBoardItem } from '@/actions/board';
import type { BoardId, BoardItem, WorkshopState } from '@/lib/engine/types';

/**
 * Everything a board needs to read and write items. Boards render from
 * `state`, call these helpers, and the room receives the new state.
 */
interface BoardApi {
  workshopId: string;
  state: WorkshopState;
  add: (board: BoardId, zone: string, text: string, imageUrl?: string, meta?: Record<string, string | number | boolean>) => void;
  update: (id: string, patch: { text?: string; zone?: string; meta?: Record<string, string | number | boolean> }) => void;
  remove: (id: string) => void;
  pending: boolean;
  onChange: (s: WorkshopState) => void;
  /** Looking back at a finished stage: no edits. */
  readOnly: boolean;
}

const Ctx = createContext<BoardApi | null>(null);

export function BoardProvider({ workshopId, state, onChange, children, readOnly = false }: { workshopId: string; state: WorkshopState; onChange: (s: WorkshopState) => void; children: ReactNode; readOnly?: boolean }) {
  const [pending, start] = useTransition();

  const api: BoardApi = {
    workshopId,
    state,
    pending,
    onChange,
    readOnly,
    add: (board, zone, text, imageUrl, meta) =>
      start(async () => {
        const r = await addBoardItem({ workshopId, board, zone, text, imageUrl, meta });
        if (r.success) onChange(r.data.state);
        else toast.error(r.error);
      }),
    update: (id, patch) =>
      start(async () => {
        const r = await updateBoardItem({ workshopId, id, ...patch });
        if (r.success) onChange(r.data.state);
        else toast.error(r.error);
      }),
    remove: (id) =>
      start(async () => {
        const r = await removeBoardItem(workshopId, id);
        if (r.success) onChange(r.data.state);
        else toast.error(r.error);
      }),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useBoard(): BoardApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useBoard outside BoardProvider');
  return api;
}

export function itemsIn(state: WorkshopState, board: BoardId, zone: string): BoardItem[] {
  return state.boards[board].filter((i) => i.zone === zone);
}

export function useBoardChange(): { onChange: (s: WorkshopState) => void } {
  const { onChange } = useBoard();
  return { onChange };
}

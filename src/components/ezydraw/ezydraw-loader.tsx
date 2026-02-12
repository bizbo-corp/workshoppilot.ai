'use client';

import dynamic from 'next/dynamic';
import type { EzyDrawModalProps } from './ezydraw-modal';

// Lazy-load EzyDrawModal with SSR disabled
// This ensures konva + react-konva + perfect-freehand only load when user opens EzyDraw
const EzyDrawModal = dynamic<EzyDrawModalProps>(
  () => import('./ezydraw-modal').then((mod) => mod.EzyDrawModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            <span className="text-sm text-gray-700">Loading drawing tools...</span>
          </div>
        </div>
      </div>
    ),
  }
);

export function EzyDrawLoader(props: EzyDrawModalProps) {
  return <EzyDrawModal {...props} />;
}

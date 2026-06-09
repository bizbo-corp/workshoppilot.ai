'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Eyebrow } from '@/components/ui/typography';

/**
 * Lobby intro video — placeholder using the homepage 60-second explainer
 * (YouTube ID etMags6ravA). Lazy-loads the iframe behind a click so the lobby
 * stays light and so participants who already know the product can skip it.
 */
export function LobbyIntroVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="border-b bg-muted/30 px-6 py-4">
        <Eyebrow>While you wait · 60 seconds</Eyebrow>
        <h2 className="mt-1 text-lg font-semibold leading-tight">
          How a WorkshopPilot session actually flows
        </h2>
      </div>
      <div className="relative aspect-video w-full bg-black">
        {playing ? (
          <iframe
            src="https://www.youtube.com/embed/etMags6ravA?autoplay=1"
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            title="WorkshopPilot in under 60 seconds"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-olive-700 via-olive-900 to-black text-white"
            aria-label="Play intro video"
          >
            {/* YouTube thumbnail backdrop — using plain <img> to avoid adding ytimg.com to next.config remotePatterns for a single lazy placeholder. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://i.ytimg.com/vi/etMags6ravA/hqdefault.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-85"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/95 shadow-2xl transition-transform group-hover:scale-105">
              <Play className="ml-1.5 h-9 w-9 fill-olive-700 text-olive-700" />
            </span>
            <span className="absolute bottom-5 left-6 text-left">
              <span className="block text-xs font-bold uppercase tracking-eyebrow text-white/80">
                While you wait
              </span>
              <span className="mt-1 block text-lg font-semibold text-white">
                WorkshopPilot in under 60s
              </span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

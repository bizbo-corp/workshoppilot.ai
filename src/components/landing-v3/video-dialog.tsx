"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";

export function VideoPlayButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2.5 rounded-full bg-card/50 backdrop-blur-xl border border-foreground/[0.08] px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.12)",
        }}
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-olive-600 dark:bg-olive-500 shrink-0">
          <Play className="h-3 w-3 text-white fill-white ml-0.5" />
        </span>
        Learn about WorkshopPilot in 30s
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl mx-4 aspect-video rounded-2xl bg-black overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Replace src with actual video URL */}
            <div className="flex items-center justify-center h-full text-white/50 text-sm">
              <div className="text-center">
                <Play className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Video coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

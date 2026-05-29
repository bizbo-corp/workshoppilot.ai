"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Fake "AI typing" — reveals `text` character-by-character when `play` is true.
 * No network, no model calls. Respects prefers-reduced-motion (shows full text).
 *
 * `text` is treated as stable for a component's lifetime (each mock mounts fresh
 * per scroll phase), so the reveal always starts from empty on mount.
 */
export function useTypewriter(text: string, play: boolean, speedMs = 20) {
  const reduced = useReducedMotion();
  const instant = !play || reduced;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (instant) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, instant, speedMs]);

  const shown = instant ? text : text.slice(0, Math.min(count, text.length));
  return {
    shown,
    done: instant || count >= text.length,
  };
}

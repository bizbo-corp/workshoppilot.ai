"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Icon } from '@/components/ui/icon';
import { cn } from "@/lib/utils";
import { CHAT_MESSAGES } from "./demo-data";
import { useTypewriter } from "./use-typewriter";

/**
 * Step 2 (overlay) — a compact AI facilitator chat card. The last AI message
 * types out. Fake typing only; no `ai` SDK, no network.
 */
export function MockChat({ play = true }: { play?: boolean }) {
  const reduced = useReducedMotion();
  const animate = play && !reduced;

  const last = CHAT_MESSAGES[CHAT_MESSAGES.length - 1];
  const lead = CHAT_MESSAGES.slice(0, -1);
  const { shown, done } = useTypewriter(last.text, play, 22);

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: animate ? 0.5 : 0, type: "spring", stiffness: 240, damping: 24 }}
      className="w-56 rounded-xl border border-border bg-card/95 p-3 shadow-xl shadow-black/10 backdrop-blur"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Icon name="sparkles" className="h-3.5 w-3.5 text-olive-600 dark:text-olive-400" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          AI Facilitator
        </span>
      </div>

      <div className="space-y-1.5">
        {lead.map((m) => (
          <Bubble key={m.text} role={m.role}>
            {m.text}
          </Bubble>
        ))}
        <Bubble role={last.role}>
          {shown}
          {animate && !done && (
            <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 animate-pulse bg-current align-middle" />
          )}
        </Bubble>
      </div>
    </motion.div>
  );
}

export function Bubble({
  role,
  children,
}: {
  role: "ai" | "user";
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[88%] rounded-lg px-2.5 py-1.5 text-[11px] leading-snug",
          isUser
            ? "bg-olive-600 text-olive-50 dark:bg-olive-500"
            : "bg-olive-100 text-foreground dark:bg-olive-900/60",
        )}
      >
        {children}
      </p>
    </div>
  );
}

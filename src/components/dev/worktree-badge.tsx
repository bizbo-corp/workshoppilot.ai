import path from "node:path";

function getWorktreeName(): string {
  const base = path.basename(process.cwd());
  if (base === "workshoppilot.ai") return "main";
  const match = base.match(/-wt(\d+)$/);
  if (match) return `wt${match[1]}`;
  return base;
}

const WORKTREE_COLORS: Record<string, string> = {
  main: "bg-emerald-600",
  wt1: "bg-sky-600",
  wt2: "bg-orange-600",
};

export function WorktreeBadge() {
  if (process.env.NODE_ENV !== "development") return null;
  const name = getWorktreeName();
  const colorClass = WORKTREE_COLORS[name] ?? "bg-zinc-700";
  return (
    <div
      className={`fixed bottom-2 left-2 z-[9999] flex items-center gap-1 rounded-full ${colorClass} px-2.5 py-1 font-mono text-[11px] font-semibold text-white shadow-lg`}
    >
      {name}
    </div>
  );
}

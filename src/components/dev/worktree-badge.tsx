import path from "node:path";
import fs from "node:fs";

function getWorktreeName(): string {
  const base = path.basename(process.cwd());
  if (base === "workshoppilot.ai") return "main";
  const match = base.match(/-wt(\d+)$/);
  if (match) return `wt${match[1]}`;
  return base;
}

/**
 * Optional custom label for this worktree during development.
 *
 * Drop a single line in `.worktree-label` at the worktree root (gitignored) to
 * show context instead of the bare branch name, e.g.:
 *
 *     wt2 — layout changes
 *
 * Edit the file and refresh to update. Falls back to the derived worktree name.
 */
function getWorktreeLabel(): string {
  try {
    const custom = fs
      .readFileSync(path.join(process.cwd(), ".worktree-label"), "utf8")
      .trim();
    if (custom) return custom;
  } catch {
    // No file (or unreadable) — fall back to the derived name.
  }
  return getWorktreeName();
}

const WORKTREE_COLORS: Record<string, string> = {
  main: "bg-emerald-600",
  wt1: "bg-sky-600",
  wt2: "bg-orange-600",
};

export function WorktreeBadge() {
  if (process.env.NODE_ENV !== "development") return null;
  // Color keys off the worktree dir (wt1/wt2/main), independent of any custom label.
  const colorClass = WORKTREE_COLORS[getWorktreeName()] ?? "bg-zinc-700";
  const label = getWorktreeLabel();
  return (
    // Pinned to the bottom-left, just clear of the collapsed sidebar.
    <div
      className={`fixed bottom-4 left-[200px] z-[10000] flex max-w-[40vw] items-center gap-1 truncate rounded-full ${colorClass} px-2.5 py-1 font-mono text-[11px] font-semibold text-white shadow-lg`}
    >
      {label}
    </div>
  );
}

"use client";

import * as React from "react";
import { Icon } from '@/components/ui/icon';
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { nudgeInvitations } from "@/actions/invitation-actions";

type ParticipantSummary = {
  participantId: string;
  displayName: string;
  color: string;
  status: string;
  rejoinToken: string | null;
  messageCount: number;
  lastActivity: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  invitedAt: string | null;
  cooldownMsRemaining: number;
};

type ActivityResponse = {
  active: ParticipantSummary[];
  pending: PendingInvite[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: string; text: string }>;
  createdAt: string;
};

interface ParticipantOverviewProps {
  sessionId: string;
  stepId: string;
  workshopId: string;
  shareToken?: string;
}

function formatCooldown(ms: number): string {
  if (ms <= 0) return "just now";
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.ceil(totalSec / 60);
  return `${min}m`;
}

export function ParticipantOverview({
  sessionId,
  stepId,
  workshopId,
  shareToken,
}: ParticipantOverviewProps) {
  const [participants, setParticipants] = React.useState<ParticipantSummary[]>([]);
  const [pending, setPending] = React.useState<PendingInvite[]>([]);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [nudgingId, setNudgingId] = React.useState<string | null>(null);
  const [nudgingAll, setNudgingAll] = React.useState(false);

  const fetchActivity = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/participant-activity?sessionId=${sessionId}&stepId=${stepId}`);
      if (res.ok) {
        const data = (await res.json()) as ActivityResponse;
        setParticipants(data.active ?? []);
        setPending(data.pending ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [sessionId, stepId]);

  React.useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Tick the cooldown displays every second so "Nudged 3m" → "Nudged 2m" naturally
  // even without a server refetch. The 15s activity poll already covers data freshness.
  const [, forceTick] = React.useState(0);
  React.useEffect(() => {
    if (pending.length === 0) return;
    if (!pending.some((p) => p.cooldownMsRemaining > 0)) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [pending]);

  const handleCopyRejoinLink = React.useCallback(async (p: ParticipantSummary) => {
    if (!shareToken || !p.rejoinToken) return;
    const url = `${window.location.origin}/join/${shareToken}?r=${p.rejoinToken}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(p.participantId);
      toast(`Rejoin link copied for ${p.displayName}`, { duration: 2000 });
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error("Could not copy link");
    }
  }, [shareToken]);

  const handleExpand = React.useCallback(async (participantId: string) => {
    if (expandedId === participantId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(participantId);
    setLoadingChat(true);
    try {
      const res = await fetch(
        `/api/participant-chat?sessionId=${sessionId}&stepId=${stepId}&participantId=${participantId}`
      );
      if (res.ok) {
        setChatHistory(await res.json());
      }
    } catch {
      setChatHistory([]);
    } finally {
      setLoadingChat(false);
    }
  }, [expandedId, sessionId, stepId]);

  const applyNudgeResult = React.useCallback((nudged: number, cooldownCount: number, failed: number) => {
    if (nudged > 0 && cooldownCount === 0 && failed === 0) {
      toast.success(`Nudged ${nudged} teammate${nudged === 1 ? '' : 's'}`);
    } else if (nudged > 0) {
      const parts: string[] = [`Nudged ${nudged}`];
      if (cooldownCount > 0) parts.push(`${cooldownCount} in cooldown`);
      if (failed > 0) parts.push(`${failed} failed`);
      toast(parts.join(' · '));
    } else if (cooldownCount > 0 && failed === 0) {
      toast('All teammates were nudged recently. Try again in a few minutes.');
    } else if (failed > 0) {
      toast.error(`Couldn't send ${failed} nudge${failed === 1 ? '' : 's'}`);
    }
  }, []);

  const handleNudgeOne = React.useCallback(async (invite: PendingInvite) => {
    if (invite.cooldownMsRemaining > 0 || nudgingId === invite.id) return;
    setNudgingId(invite.id);
    try {
      const res = await nudgeInvitations(workshopId, [invite.email]);
      const cooldownCount = res.skipped.filter((s) => s.reason === 'cooldown').length;
      const failed = res.skipped.filter((s) => s.reason === 'send-failed').length;
      applyNudgeResult(res.nudged, cooldownCount, failed);
      await fetchActivity();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send nudge');
    } finally {
      setNudgingId(null);
    }
  }, [workshopId, nudgingId, fetchActivity, applyNudgeResult]);

  const handleNudgeAll = React.useCallback(async () => {
    if (nudgingAll) return;
    setNudgingAll(true);
    try {
      const res = await nudgeInvitations(workshopId);
      const cooldownCount = res.skipped.filter((s) => s.reason === 'cooldown').length;
      const failed = res.skipped.filter((s) => s.reason === 'send-failed').length;
      applyNudgeResult(res.nudged, cooldownCount, failed);
      await fetchActivity();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send nudges');
    } finally {
      setNudgingAll(false);
    }
  }, [workshopId, nudgingAll, fetchActivity, applyNudgeResult]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (participants.length === 0 && pending.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No participants or invites yet
      </div>
    );
  }

  const allInCooldown = pending.length > 0 && pending.every((p) => p.cooldownMsRemaining > 0);
  const nudgeAllDisabled = nudgingAll || allInCooldown;

  return (
    <div className="space-y-3">
      {/* Pending invites — facilitator can nudge people who haven't joined yet. */}
      {pending.length > 0 && (
        <section className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Waiting on ({pending.length})
            </h4>
            <button
              onClick={handleNudgeAll}
              disabled={nudgeAllDisabled}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                nudgeAllDisabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-foreground hover:bg-muted"
              )}
              title={allInCooldown ? 'All nudged recently' : 'Send a reminder email to everyone pending'}
            >
              {nudgingAll ? <Icon name="spinner" className="h-3 w-3 animate-spin" /> : <Icon name="mail" className="h-3 w-3" />}
              Nudge all
            </button>
          </div>
          <div className="space-y-1">
            {pending.map((inv) => {
              const onCooldown = inv.cooldownMsRemaining > 0;
              const isNudging = nudgingId === inv.id;
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2"
                >
                  <Icon name="mail" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm text-foreground">{inv.email}</span>
                  {onCooldown ? (
                    <span className="text-[11px] text-muted-foreground">
                      Nudged {formatCooldown(inv.cooldownMsRemaining)} ago
                    </span>
                  ) : (
                    <button
                      onClick={() => handleNudgeOne(inv)}
                      disabled={isNudging}
                      className="inline-flex items-center gap-1 rounded-md bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-foreground/10 disabled:opacity-50 transition-colors"
                    >
                      {isNudging ? <Icon name="spinner" className="h-3 w-3 animate-spin" /> : null}
                      Nudge
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Active participants — existing behaviour. */}
      {participants.length > 0 && (
        <section className="space-y-1">
          {pending.length > 0 && (
            <h4 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active ({participants.length})
            </h4>
          )}
          {participants.map((p) => (
            <div key={p.participantId} className="rounded-lg border">
              <button
                onClick={() => handleExpand(p.participantId)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
              >
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 text-sm font-medium truncate">{p.displayName}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name="message-square" className="h-3 w-3" />
                  {p.messageCount}
                </span>
                {shareToken && p.rejoinToken && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyRejoinLink(p);
                    }}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={`Copy rejoin link for ${p.displayName}`}
                  >
                    {copiedId === p.participantId ? (
                      <Icon name="check" className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Icon name="link" className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
                {expandedId === p.participantId ? (
                  <Icon name="chevron-down" className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Icon name="chevron-right" className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {expandedId === p.participantId && (
                <div className="border-t bg-muted/30 px-3 py-2 max-h-[300px] overflow-y-auto">
                  {loadingChat ? (
                    <div className="flex justify-center py-4">
                      <Icon name="spinner" className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : chatHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No messages yet</p>
                  ) : (
                    <div className="space-y-2">
                      {chatHistory.map((msg) => {
                        const text = msg.parts
                          ?.filter((p) => p.type === "text")
                          .map((p) => p.text)
                          .join("\n") || "";
                        if (!text.trim()) return null;
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "rounded-lg px-2.5 py-1.5 text-xs",
                              msg.role === "user"
                                ? "bg-primary/10 ml-4"
                                : "bg-background mr-4 border",
                            )}
                          >
                            <span className="font-medium text-[10px] text-muted-foreground block mb-0.5">
                              {msg.role === "user" ? p.displayName : "AI"}
                            </span>
                            {msg.role === "assistant" ? (
                              <div className="prose prose-xs dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                <ReactMarkdown>{text.length > 500 ? text.slice(0, 500) + "..." : text}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{text}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

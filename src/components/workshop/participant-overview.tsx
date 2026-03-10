"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type ParticipantSummary = {
  participantId: string;
  displayName: string;
  color: string;
  status: string;
  messageCount: number;
  lastActivity: string | null;
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
}

export function ParticipantOverview({ sessionId, stepId }: ParticipantOverviewProps) {
  const [participants, setParticipants] = React.useState<ParticipantSummary[]>([]);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Fetch participant activity
  const fetchActivity = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/participant-activity?sessionId=${sessionId}&stepId=${stepId}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
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

  // Load chat history for a participant
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No participants yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
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
            <span className="flex-1 text-sm font-medium truncate">
              {p.displayName}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {p.messageCount}
            </span>
            {expandedId === p.participantId ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedId === p.participantId && (
            <div className="border-t bg-muted/30 px-3 py-2 max-h-[300px] overflow-y-auto">
              {loadingChat ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
    </div>
  );
}

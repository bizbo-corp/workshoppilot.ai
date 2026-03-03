'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getStepById } from '@/lib/workshop/step-metadata';
import { toast } from 'sonner';
import {
  ArrowLeft,
  RefreshCw,
  Check,
  CheckCircle2,
  RotateCcw,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FeedbackEntry {
  id: string;
  feedbackText: string;
  dialogueStepId: string;
  arcPhase: string | null;
  filePath: string;
  componentName: string;
  contextSnapshot: Record<string, unknown>;
  status: 'pending' | 'resolved';
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

type FilterStatus = 'pending' | 'resolved' | 'all';

export function DialogueFeedbackClient() {
  const router = useRouter();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = filter === 'all'
        ? '/api/admin/dialogue-feedback'
        : `/api/admin/dialogue-feedback?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      setEntries(await res.json());
    } catch {
      toast.error('Failed to load feedback entries');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Admin
          </Button>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dialogue Feedback</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review and resolve AI dialogue critiques
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEntries} disabled={isLoading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2">
          {(['pending', 'resolved', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Entries */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              No {filter === 'all' ? '' : filter} feedback entries yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <FeedbackCard key={entry.id} entry={entry} onMutate={fetchEntries} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({
  entry,
  onMutate,
}: {
  entry: FeedbackEntry;
  onMutate: () => void;
}) {
  const [showContext, setShowContext] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.feedbackText);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const step = getStepById(entry.dialogueStepId);
  const stepName = step?.name ?? entry.dialogueStepId;

  const patchEntry = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/dialogue-feedback/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update');
    return res.json();
  };

  const handleResolve = async () => {
    setActionLoading('resolve');
    try {
      await patchEntry({ status: 'resolved', resolutionNote: resolutionNote.trim() || null });
      toast.success('Marked as resolved');
      setIsResolving(false);
      setResolutionNote('');
      onMutate();
    } catch {
      toast.error('Failed to resolve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopen = async () => {
    setActionLoading('reopen');
    try {
      await patchEntry({ status: 'pending', resolutionNote: null });
      toast.success('Reopened');
      onMutate();
    } catch {
      toast.error('Failed to reopen');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === entry.feedbackText) {
      setIsEditing(false);
      return;
    }
    setActionLoading('edit');
    try {
      await patchEntry({ feedbackText: trimmed });
      toast.success('Updated');
      setIsEditing(false);
      onMutate();
    } catch {
      toast.error('Failed to update');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this feedback entry?')) return;
    setActionLoading('delete');
    try {
      const res = await fetch(`/api/admin/dialogue-feedback/${entry.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Deleted');
      onMutate();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      {/* Top row: status badge + step + timestamp */}
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
            entry.status === 'pending'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          }`}
        >
          {entry.status === 'resolved' && <CheckCircle2 className="h-3 w-3" />}
          {entry.status}
        </span>
        <span className="font-medium text-foreground">{stepName}</span>
        {entry.arcPhase && (
          <span className="text-muted-foreground">/ {entry.arcPhase}</span>
        )}
        <span className="ml-auto text-muted-foreground">
          {new Date(entry.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Feedback text (editable) */}
      {isEditing ? (
        <div className="mb-3 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={actionLoading === 'edit'}>
              {actionLoading === 'edit' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditText(entry.feedbackText); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-3 text-sm text-foreground whitespace-pre-wrap">{entry.feedbackText}</p>
      )}

      {/* File path */}
      <p className="mb-3 font-mono text-xs text-muted-foreground">
        {entry.filePath} → {entry.componentName}
      </p>

      {/* Resolution note (if resolved) */}
      {entry.status === 'resolved' && entry.resolutionNote && (
        <div className="mb-3 rounded-md bg-green-50 p-3 text-sm dark:bg-green-900/10">
          <span className="font-medium text-green-800 dark:text-green-300">Resolution: </span>
          <span className="text-green-700 dark:text-green-400">{entry.resolutionNote}</span>
        </div>
      )}

      {/* Resolve inline input */}
      {isResolving && (
        <div className="mb-3 space-y-2">
          <input
            type="text"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Resolution note (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleResolve} disabled={actionLoading === 'resolve'}>
              {actionLoading === 'resolve' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              <Check className="mr-1 h-3 w-3" />
              Confirm Resolve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsResolving(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Context snapshot toggle */}
      <button
        onClick={() => setShowContext(!showContext)}
        className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Context Snapshot
      </button>
      {showContext && (
        <pre className="mb-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(entry.contextSnapshot, null, 2)}
        </pre>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t pt-3">
        {entry.status === 'pending' && !isResolving && (
          <Button size="sm" variant="outline" onClick={() => setIsResolving(true)}>
            <Check className="mr-1 h-3 w-3" />
            Resolve
          </Button>
        )}
        {entry.status === 'resolved' && (
          <Button size="sm" variant="outline" onClick={handleReopen} disabled={actionLoading === 'reopen'}>
            {actionLoading === 'reopen' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
            Reopen
          </Button>
        )}
        {!isEditing && (
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={actionLoading === 'delete'}>
          {actionLoading === 'delete' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
          Delete
        </Button>
      </div>
    </div>
  );
}

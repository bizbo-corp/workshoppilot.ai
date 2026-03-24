'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJourneyMapperStore, useJourneyMapperStoreApi } from '@/providers/journey-mapper-store-provider';

interface GroupManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroupId?: string;
  onEditingGroupIdChange?: (id: string | undefined) => void;
}

export function GroupManagementDialog({
  open,
  onOpenChange,
  editingGroupId,
  onEditingGroupIdChange,
}: GroupManagementDialogProps) {
  const storeApi = useJourneyMapperStoreApi();
  const groups = useJourneyMapperStore((s) => s.groups);
  const nodes = useJourneyMapperStore((s) => s.nodes);

  const [newGroupName, setNewGroupName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // If opened with editingGroupId, start renaming that group
  useEffect(() => {
    if (open && editingGroupId) {
      const group = groups.find((g) => g.id === editingGroupId);
      if (group) {
        setRenamingId(editingGroupId);
        setRenameValue(group.label);
      }
    }
  }, [open, editingGroupId, groups]);

  const handleClose = () => {
    onOpenChange(false);
    setRenamingId(null);
    setRenameValue('');
    setNewGroupName('');
    onEditingGroupIdChange?.(undefined);
  };

  const handleCreate = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const id = `group-${Date.now()}`;
    storeApi.getState().addGroup({ id, label: name });
    setNewGroupName('');
  };

  const handleRename = (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    storeApi.getState().updateGroup(id, { label: name });
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = () => {
    if (pendingDeleteId) {
      storeApi.getState().deleteGroup(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  const getMemberCount = (groupId: string) =>
    nodes.filter((n) => n.groupId === groupId).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Groups</DialogTitle>
          <DialogDescription>
            Create, rename, or delete navigation groups. Nodes in deleted groups become ungrouped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No groups yet</p>
          )}
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >
              {renamingId === group.id ? (
                <>
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(group.id);
                      if (e.key === 'Escape') {
                        setRenamingId(null);
                        setRenameValue('');
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRename(group.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setRenamingId(null);
                      setRenameValue('');
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium flex-1 truncate">{group.label}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {getMemberCount(group.id)} nodes
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setRenamingId(group.id);
                      setRenameValue(group.label);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Create new group */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name..."
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={handleCreate}
            disabled={!newGroupName.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (!pendingDeleteId) return '';
                const g = groups.find((gr) => gr.id === pendingDeleteId);
                const c = nodes.filter((n) => n.groupId === pendingDeleteId).length;
                return `Delete group "${g?.label}"? ${c} node${c !== 1 ? 's' : ''} will become ungrouped.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

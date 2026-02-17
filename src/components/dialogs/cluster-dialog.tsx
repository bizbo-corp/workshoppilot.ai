'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ClusterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  existingClusters: string[];
  onConfirm: (name: string) => void;
}

export function ClusterDialog({
  open,
  onOpenChange,
  defaultName,
  existingClusters,
  onConfirm,
}: ClusterDialogProps) {
  const [name, setName] = useState(defaultName);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  const handleSelectExisting = (clusterName: string) => {
    setName(clusterName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create Cluster</DialogTitle>
          <DialogDescription>
            Name this cluster. Selected items will be grouped under this label.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cluster name..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />

          {existingClusters.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Add to existing cluster:</p>
              <div className="flex flex-wrap gap-1.5">
                {existingClusters.map((cluster) => (
                  <button
                    key={cluster}
                    onClick={() => handleSelectExisting(cluster)}
                    className="rounded-full border border-input bg-background px-2.5 py-1 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {cluster}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Create Cluster
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

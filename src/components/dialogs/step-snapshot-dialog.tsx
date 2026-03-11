'use client';

import { useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StepSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepName: string;
  snapshotUrl: string;
}

/** Parse snapshotUrl — may be a single URL or a JSON array of URLs */
function parseSnapshotUrls(snapshotUrl: string): string[] {
  if (snapshotUrl.startsWith('[')) {
    try {
      return JSON.parse(snapshotUrl);
    } catch {
      return [snapshotUrl];
    }
  }
  return [snapshotUrl];
}

export function StepSnapshotDialog({
  open,
  onOpenChange,
  stepName,
  snapshotUrl,
}: StepSnapshotDialogProps) {
  const urls = useMemo(() => parseSnapshotUrls(snapshotUrl), [snapshotUrl]);
  const [current, setCurrent] = useState(0);
  const isCarousel = urls.length > 1;

  const prev = useCallback(() => setCurrent((c) => (c - 1 + urls.length) % urls.length), [urls.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % urls.length), [urls.length]);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCurrent(0); }}>
      <DialogContent
        className={`max-h-[90vh] p-0 flex flex-col overflow-hidden ${
          isCarousel ? 'sm:max-w-xl' : 'sm:max-w-[90vw]'
        }`}
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>
            {stepName}
            {isCarousel && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {current + 1} / {urls.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[current]}
            alt={`${stepName}${isCarousel ? ` ${current + 1}` : ''} snapshot`}
            className="w-full h-auto rounded-lg border"
          />
        </div>

        {isCarousel && (
          <div className="sticky bottom-0 flex items-center justify-between border-t bg-background px-4 py-3">
            <Button variant="outline" size="sm" onClick={prev}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-2">
              {urls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={next}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

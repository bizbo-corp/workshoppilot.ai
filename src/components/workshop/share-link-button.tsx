'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';

/**
 * ShareLinkButton — icon-only button that copies the workshop join URL.
 * Lives in the floating multiplayer control bar, next to the participant
 * avatars. Facilitator-only; only rendered when a shareToken exists.
 */
export function ShareLinkButton({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/join/${shareToken}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast('Link copied!', { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy link. Please copy the URL manually.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1.5 px-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title="Copy invite link"
      aria-label="Copy invite link"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}

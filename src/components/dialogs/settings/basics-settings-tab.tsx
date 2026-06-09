/**
 * Basics settings tab — workshop name, emoji, and color.
 * Reuses the existing renameWorkshop / updateWorkshopAppearance actions.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Eyebrow } from '@/components/ui/typography';
import { renameWorkshop, updateWorkshopAppearance } from '@/actions/workshop-actions';
import { WORKSHOP_COLORS, WORKSHOP_EMOJIS } from '@/lib/workshop/workshop-appearance';

interface BasicsSettingsTabProps {
  workshopId: string;
  workshopName: string;
  workshopColor?: string | null;
  workshopEmoji?: string | null;
}

export function BasicsSettingsTab({
  workshopId,
  workshopName,
  workshopColor,
  workshopEmoji,
}: BasicsSettingsTabProps) {
  const router = useRouter();
  const [name, setName] = useState(workshopName);
  const [color, setColor] = useState<string | null>(workshopColor ?? null);
  const [emoji, setEmoji] = useState<string | null>(workshopEmoji ?? null);

  const handleNameBlur = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workshopName) return;
    await renameWorkshop(workshopId, trimmed);
    toast('Workshop renamed');
    router.refresh();
  };

  const handleColor = async (id: string) => {
    setColor(id);
    await updateWorkshopAppearance(workshopId, { color: id });
    router.refresh();
  };

  const handleEmoji = async (value: string) => {
    setEmoji(value);
    await updateWorkshopAppearance(workshopId, { emoji: value });
    router.refresh();
  };

  return (
    <div className="space-y-5 py-2">
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Name
        </label>
        <Input
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
        />
      </div>

      <div className="space-y-2">
        <Eyebrow>Color</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {WORKSHOP_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleColor(c.id)}
              title={c.label}
              aria-label={c.label}
              aria-pressed={color === c.id}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                color === c.id ? 'border-foreground' : 'border-transparent'
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Eyebrow>Emoji</Eyebrow>
        <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto rounded-lg border border-olive-200/60 p-2 dark:border-olive-800/40">
          {WORKSHOP_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => handleEmoji(e)}
              aria-pressed={emoji === e}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-olive-100 dark:hover:bg-olive-900/40',
                emoji === e && 'bg-olive-200 dark:bg-olive-800/60'
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Workshop Settings Dialog
 * Facilitator/admin control opened from the header. Tabs: Challenge, Basics, Team.
 * The Team tab only appears for multiplayer workshops.
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { ChallengeSettingsTab } from '@/components/dialogs/settings/challenge-settings-tab';
import { BasicsSettingsTab } from '@/components/dialogs/settings/basics-settings-tab';
import { TeamSettingsTab } from '@/components/dialogs/settings/team-settings-tab';

interface WorkshopSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  sessionId: string;
  workshopName: string;
  workshopColor?: string | null;
  workshopEmoji?: string | null;
  workshopType: 'solo' | 'multiplayer';
  workshopStarted: boolean;
}

export function WorkshopSettingsDialog({
  open,
  onOpenChange,
  workshopId,
  sessionId,
  workshopName,
  workshopColor,
  workshopEmoji,
  workshopType,
  workshopStarted,
}: WorkshopSettingsDialogProps) {
  const showTeam = workshopType === 'multiplayer';

  // End-session is multiplayer-only. The live session and its broadcast live
  // inside the Liveblocks room (FacilitatorControls), which is outside this
  // dialog's tree — so we request the end flow via a DOM event it listens for.
  const handleEndSession = () => {
    onOpenChange(false);
    document.dispatchEvent(new Event('facilitator-end-session'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Workshop settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="challenge" className="w-full">
          <TabsList>
            <TabsTrigger value="challenge">Challenge</TabsTrigger>
            <TabsTrigger value="basics">Basics</TabsTrigger>
            {showTeam && <TabsTrigger value="team">Team</TabsTrigger>}
          </TabsList>

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <TabsContent value="challenge">
              <ChallengeSettingsTab
                workshopId={workshopId}
                sessionId={sessionId}
                workshopType={workshopType}
                workshopStarted={workshopStarted}
              />
            </TabsContent>

            <TabsContent value="basics">
              <BasicsSettingsTab
                workshopId={workshopId}
                workshopName={workshopName}
                workshopColor={workshopColor}
                workshopEmoji={workshopEmoji}
              />
            </TabsContent>

            {showTeam && (
              <TabsContent value="team">
                <TeamSettingsTab workshopId={workshopId} />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Danger zone — end the live session for everyone (multiplayer only) */}
        {workshopType === 'multiplayer' && (
          <div className="mt-2 flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">End session</p>
              <p className="text-xs text-muted-foreground">
                Disconnect all participants and end the live session.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndSession}
              className="shrink-0 gap-1.5"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              End session
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
      </DialogContent>
    </Dialog>
  );
}

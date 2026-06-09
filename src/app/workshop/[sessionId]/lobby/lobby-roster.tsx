import { Icon } from '@/components/ui/icon';

export interface LobbyRosterEntry {
  id: string;
  label: string;
  role: 'facilitator' | 'participant' | 'invited';
  changeRequest?: boolean;
}

interface LobbyRosterProps {
  entries: LobbyRosterEntry[];
}

/**
 * Server-rendered list of participants + pending invitees.
 * Updates each lobby refresh tick (handled by LobbyPoller).
 */
export function LobbyRoster({ entries }: LobbyRosterProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No one in the lobby yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-2 text-sm">
          {entry.role === 'invited' ? (
            <Icon name="circle" className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Icon name="check-circle" className="h-4 w-4 text-emerald-600" />
          )}
          <span className={entry.role === 'invited' ? 'text-muted-foreground' : ''}>
            {entry.label}
            {entry.role === 'facilitator' && (
              <span className="ml-1 text-xs text-muted-foreground">(facilitator)</span>
            )}
            {entry.role === 'invited' && (
              <span className="ml-1 text-xs text-muted-foreground">(invited)</span>
            )}
          </span>
          {entry.changeRequest && (
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              change requested
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

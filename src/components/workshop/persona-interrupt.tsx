import { User } from 'lucide-react';

interface PersonaInterruptProps {
  personaName: string;
}

export function PersonaInterrupt({ personaName }: PersonaInterruptProps) {
  return (
    <div className="flex items-center gap-3 py-3 animate-in fade-in duration-500">
      <div className="h-px flex-1 bg-olive-300/60 dark:bg-neutral-olive-700/60" />
      <div className="flex items-center gap-2 text-sm font-medium text-olive-700 dark:text-olive-400">
        <div className="flex size-7 items-center justify-center rounded-full bg-olive-200/80 dark:bg-neutral-olive-800">
          <User className="h-4 w-4 text-olive-600 dark:text-olive-400" />
        </div>
        {personaName}
      </div>
      <div className="h-px flex-1 bg-olive-300/60 dark:bg-neutral-olive-700/60" />
    </div>
  );
}

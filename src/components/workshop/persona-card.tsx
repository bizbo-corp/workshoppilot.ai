'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PersonaCardProps {
  persona: Record<string, unknown>;
  draft?: boolean;
  totalPersonas?: number;
  currentIndex?: number;
  allPersonas?: Record<string, unknown>[];
}

interface PersonaSkeletonCardProps {
  index: number;
}

/**
 * Extract initials from persona name
 * Returns first letter of first name + first letter of last name
 * Or first 2 letters if single name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Compact persona card for multi-persona view
 */
function CompactPersonaCard({ persona }: { persona: Record<string, unknown> }) {
  const name = (persona.name as string) || 'Unknown';
  const role = (persona.role as string) || '';
  const initials = getInitials(name);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span className="text-sm font-bold text-primary">{initials}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-sm">{name}</p>
        {role && (
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton placeholder for upcoming personas
 */
export function PersonaSkeletonCard({ index }: PersonaSkeletonCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar skeleton */}
          <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2">
            {/* Name skeleton */}
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            {/* Role skeleton */}
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          Upcoming
        </span>
      </div>

      {/* Quote skeleton */}
      <div className="mb-4 space-y-2 rounded border-l-4 border-muted bg-muted/30 py-3 pl-4">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>

      {/* Bio skeleton */}
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>

      {/* Lists skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * PersonaCard component
 * Renders a structured persona with initials avatar, field layout, and optional sections
 */
export function PersonaCard({
  persona,
  draft = false,
  totalPersonas,
  currentIndex,
  allPersonas,
}: PersonaCardProps) {
  const name = (persona.name as string) || 'Unknown Persona';
  const role = (persona.role as string) || '';
  const age = persona.age as number | undefined;
  const location = persona.location as string | undefined;
  const bio = (persona.bio as string) || '';
  const quote = (persona.quote as string) || '';
  const goals = (persona.goals as string[]) || [];
  const pains = (persona.pains as string[]) || [];
  const gains = (persona.gains as string[]) || [];
  const motivations = (persona.motivations as string[]) || [];
  const frustrations = (persona.frustrations as string[]) || [];
  const behaviors = (persona.behaviors as string[]) || [];
  const dayInTheLife = persona.dayInTheLife as string | undefined;

  const initials = getInitials(name);

  return (
    <div className="space-y-4">
      {/* Multi-persona indicator */}
      {totalPersonas && totalPersonas > 1 && currentIndex !== undefined && (
        <p className="text-sm text-muted-foreground">
          Persona {currentIndex + 1} of {totalPersonas}
        </p>
      )}

      {/* Completed personas (compact view) */}
      {allPersonas && allPersonas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Completed Personas
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {allPersonas.map((p, idx) => (
              <CompactPersonaCard key={idx} persona={p} />
            ))}
          </div>
        </div>
      )}

      {/* Main persona card */}
      <div className="rounded-lg border bg-card p-6 shadow-xs">
        {/* Header with avatar and badges */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Initials Avatar Circle */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>

            {/* Name and role */}
            <div>
              <h3 className="text-xl font-semibold">{name}</h3>
              {role && (
                <p className="text-sm text-muted-foreground">{role}</p>
              )}
              {(age || location) && (
                <p className="text-sm text-muted-foreground">
                  {age && `${age} years old`}
                  {age && location && ' • '}
                  {location}
                </p>
              )}
            </div>
          </div>

          {/* Draft badge */}
          {draft && (
            <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              Draft
            </span>
          )}
        </div>

        {/* Quote block */}
        {quote && (
          <blockquote className="mb-4 border-l-4 border-primary/30 bg-muted/30 py-2 pl-4">
            <p className="italic text-sm">&ldquo;{quote}&rdquo;</p>
          </blockquote>
        )}

        {/* Bio section */}
        {bio && (
          <div className="mb-4">
            <p className="text-sm leading-relaxed">{bio}</p>
          </div>
        )}

        {/* Grid of lists */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Goals */}
          {goals.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-sm">Goals</h4>
              <ul className="space-y-1">
                {goals.map((goal, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pains */}
          {pains.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-sm">Pains</h4>
              <ul className="space-y-1">
                {pains.map((pain, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                    <span>{pain}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gains */}
          {gains.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-sm">Gains</h4>
              <ul className="space-y-1">
                {gains.map((gain, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" />
                    <span>{gain}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Motivations */}
          {motivations.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-sm">Motivations</h4>
              <ul className="space-y-1">
                {motivations.map((motivation, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{motivation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Optional sections */}
        {behaviors.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 font-semibold text-sm">Behaviors</h4>
            <ul className="space-y-1">
              {behaviors.map((behavior, idx) => (
                <li key={idx} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{behavior}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {frustrations.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 font-semibold text-sm">Frustrations</h4>
            <ul className="space-y-1">
              {frustrations.map((frustration, idx) => (
                <li key={idx} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                  <span>{frustration}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {dayInTheLife && (
          <div className="mt-4">
            <h4 className="mb-2 font-semibold text-sm">Day in the Life</h4>
            <p className="text-sm leading-relaxed">{dayInTheLife}</p>
          </div>
        )}
      </div>
    </div>
  );
}

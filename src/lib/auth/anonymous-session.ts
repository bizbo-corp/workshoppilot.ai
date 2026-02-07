import { z } from 'zod';

/**
 * Zod schema for anonymous session data
 * Represents workshop progress before user authentication
 */
export const AnonymousSessionSchema = z.object({
  workshopTitle: z.string().optional(),
  originalIdea: z.string().optional(),
  steps: z.array(
    z.object({
      stepId: z.string(),
      status: z.enum(['not_started', 'in_progress', 'complete']),
      output: z.record(z.string(), z.unknown()).optional(),
      completedAt: z.string().optional(),
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
  migrated: z.boolean().optional(),
});

export type AnonymousSession = z.infer<typeof AnonymousSessionSchema>;

const STORAGE_KEY = 'workshoppilot_anonymous_session';

/**
 * Test if localStorage is available
 * @returns True if localStorage is accessible
 */
export function testLocalStorage(): boolean {
  try {
    const testKey = '__workshoppilot_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get anonymous session from localStorage
 * @returns Parsed anonymous session or null if not found/invalid
 */
export function getAnonymousSession(): AnonymousSession | null {
  if (typeof window === 'undefined' || !testLocalStorage()) {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    const validated = AnonymousSessionSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error('Failed to parse anonymous session:', error);
    return null;
  }
}

/**
 * Save anonymous session to localStorage
 * @param session - Session data to save
 */
export function saveAnonymousSession(session: AnonymousSession): void {
  if (typeof window === 'undefined' || !testLocalStorage()) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save anonymous session:', error);
  }
}

/**
 * Clear anonymous session from localStorage
 */
export function clearAnonymousSession(): void {
  if (typeof window === 'undefined' || !testLocalStorage()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear anonymous session:', error);
  }
}

/**
 * Migrate anonymous session data to authenticated user's account
 * POSTs session data to migration endpoint, then clears local storage
 * @returns Workshop ID from created record, or null if no session/already migrated/error
 */
export async function migrateAnonymousSession(): Promise<{ workshopId: string } | null> {
  const session = getAnonymousSession();

  // No session data or already migrated
  if (!session || session.migrated) {
    return null;
  }

  try {
    const response = await fetch('/api/workshops/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Migration failed:', error);
      return null;
    }

    const result = await response.json();

    // Mark as migrated and clear after short delay (allows for debugging if needed)
    const migratedSession = { ...session, migrated: true };
    saveAnonymousSession(migratedSession);

    setTimeout(() => {
      clearAnonymousSession();
    }, 1000);

    return { workshopId: result.workshopId };
  } catch (error) {
    console.error('Migration request failed:', error);
    // Keep session data for retry
    return null;
  }
}

'use client';

import { useEffect, useRef } from 'react';
import { getAnonymousSession, migrateAnonymousSession, clearAnonymousSession } from '@/lib/auth/anonymous-session';

/**
 * MigrationCheck component
 * Invisible component that checks for anonymous session data on mount
 * and automatically triggers migration to authenticated user's account
 *
 * Should be rendered on the first authenticated page load (dashboard)
 */
export function MigrationCheck() {
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run migration check once
    if (hasChecked.current) {
      return;
    }
    hasChecked.current = true;

    // Check for anonymous session data
    const session = getAnonymousSession();

    if (!session || session.migrated) {
      return;
    }

    // Trigger migration
    migrateAnonymousSession()
      .then((result) => {
        if (result) {
          console.log('Anonymous session migrated successfully:', result.workshopId);
          // Clear local storage after successful migration
          clearAnonymousSession();
        }
      })
      .catch((error) => {
        console.error('Migration failed:', error);
      });
  }, []);

  // Render nothing - this is an invisible component
  return null;
}

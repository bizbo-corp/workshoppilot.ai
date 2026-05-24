import type { User } from '@clerk/nextjs/server';

/**
 * Derive a participant display name from a Clerk user. Participants no longer
 * type their own name — it comes from the account, so identity is stable and
 * can't be spoofed. Falls back through full name → username → email local part
 * → "Participant", clamped to 2–30 chars.
 */
export function deriveParticipantName(user: User | null): string {
  const candidate =
    user?.fullName?.trim() ||
    user?.username?.trim() ||
    getPrimaryEmail(user)?.split('@')[0]?.trim() ||
    '';
  const clamped = candidate.slice(0, 30);
  return clamped.length >= 2 ? clamped : 'Participant';
}

/**
 * The user's verified primary email, lowercased, or null. Resolves via
 * `primaryEmailAddressId` rather than `emailAddresses[0]` — the first entry is
 * usually but not always the primary, and the invite email-lock must match the
 * real primary address.
 */
export function getPrimaryEmail(user: User | null): string | null {
  if (!user) return null;
  const primary =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
    user.emailAddresses[0];
  return primary?.emailAddress?.toLowerCase() ?? null;
}

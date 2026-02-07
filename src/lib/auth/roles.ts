import { clerkClient } from '@clerk/nextjs/server';

/**
 * User roles in the system
 * - facilitator: Can create and manage workshops
 * - admin: Has all facilitator permissions plus system administration
 */
export type UserRole = 'facilitator' | 'admin';

/**
 * Extract roles from Clerk session claims
 * @param sessionClaims - Clerk session claims object
 * @returns Array of user roles, defaults to ['facilitator'] if not set
 */
export function getUserRoles(sessionClaims: any): UserRole[] {
  const roles = sessionClaims?.publicMetadata?.roles;

  if (!roles || !Array.isArray(roles)) {
    return ['facilitator'];
  }

  return roles.filter((role: string) =>
    role === 'facilitator' || role === 'admin'
  ) as UserRole[];
}

/**
 * Check if user has a specific role
 * @param sessionClaims - Clerk session claims object
 * @param role - Role to check for
 * @returns True if user has the role
 */
export function checkRole(sessionClaims: any, role: UserRole): boolean {
  const roles = getUserRoles(sessionClaims);
  return roles.includes(role);
}

/**
 * Check if user is an admin
 * @param sessionClaims - Clerk session claims object
 * @returns True if user has admin role
 */
export function isAdmin(sessionClaims: any): boolean {
  return checkRole(sessionClaims, 'admin');
}

/**
 * Initialize roles for a newly created user
 * Assigns admin role if email matches ADMIN_EMAIL env var, otherwise assigns facilitator
 * @param clerkUserId - Clerk user ID
 * @param email - User's email address
 */
export async function initializeUserRoles(
  clerkUserId: string,
  email: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminUser = adminEmail && email.toLowerCase() === adminEmail.toLowerCase();

  const roles: UserRole[] = isAdminUser
    ? ['facilitator', 'admin']
    : ['facilitator'];

  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { roles },
  });
}

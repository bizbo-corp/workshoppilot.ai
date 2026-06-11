# Phase 2: Authentication & Roles - Research

**Researched:** 2026-02-07
**Domain:** Clerk authentication with Next.js 15 App Router, deferred auth wall, role-based access control
**Confidence:** HIGH

## Summary

Phase 2 implements user authentication and role-based access control using Clerk with Next.js 15 App Router. The research focused on the user's locked decisions: deferred authentication (anonymous users access steps 1-3 before hitting auth wall), embedded Clerk components in modal overlays, localStorage-based anonymous session management with seamless migration to authenticated state, role assignment via public metadata, and middleware-based route protection.

**Key findings:**
- Clerk provides Next.js 15 App Router support with clerkMiddleware() for route protection
- Modal overlay auth achieved via SignIn/SignUp components with mode='modal' or custom routing
- Anonymous → authenticated migration requires custom implementation (Clerk has no built-in pattern)
- Role-based access control via publicMetadata (safest for session-accessible roles)
- CVE-2025-29927 vulnerability underscores need for defense-in-depth (middleware + component-level auth checks)
- Webhook-based user sync creates database records on user.created event
- Email verification can be required before accessing protected routes
- Redirect configuration uses new fallback/force pattern (afterSignIn/afterSignUp deprecated)

**Primary recommendation:** Use clerkMiddleware() with createRouteMatcher() for opt-in route protection, implement auth wall as modal after step 3 using state management (URL params or Zustand), store anonymous session data in localStorage with custom migration logic on sign-up, assign roles via publicMetadata (accessible in session without API calls), and implement webhook endpoint for user.created to sync Clerk users to database.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sign-up & Sign-in Flow:**
- Auth methods: Email + password and Google OAuth
- Clerk embedded components (`<SignIn/>`, `<SignUp/>`) styled within the app, not hosted pages
- Auth pages appear as modal overlay on the landing page (not dedicated routes)
- Email verification required before accessing protected routes
- Auth wall triggers after step 3 (Empathize + Define + Ideate completed)
- Wall modal shows sign-up form + preview of what's next ("Step 4: Prototype your idea")
- Primary CTA is sign-up, with "Already have an account? Sign in" link
- If user dismisses the wall modal: stay on step 3, can review steps 1-3, modal reappears on next advance attempt
- Anonymous users get one active workshop at a time
- Anonymous session data saved in localStorage for browser persistence
- After sign-up, anonymous session data migrates to the new user account seamlessly
- After sign-up (at auth wall), user continues directly to step 4 — no intermediate dashboard
- Sign-in link visible in landing page header/nav for returning users

**Role Assignment:**
- Everyone starts as facilitator (participant role deferred to multiplayer milestone)
- Admin role for app owner, identified by environment variable (ADMIN_EMAIL)
- Admin = facilitator + admin access (can run own workshops AND access admin pages)
- Admin has full CRUD on all workshops and users in MVP 0.5
- Roles stored as array in database now (future-proofed for participant role later)

**Protected Routes & Redirects:**
- Public routes: landing page, workshop steps 1-3
- Protected routes: workshop steps 4-10, dashboard, /admin
- Unauthenticated user hitting protected route → sign-in modal with redirect back to original page
- Non-admin hitting /admin → silently redirect to dashboard
- Signed-in users visiting landing page → auto-redirect to dashboard

**User Profile & Identity:**
- Collect during sign-up: name (first + last) + optional company/org field
- Avatars: use Clerk-provided (Google profile pic or generated initials)
- Profile page: Clerk's built-in `<UserProfile/>` component (no custom profile page)
- User sync: Clerk webhooks create DB record on user creation
- Account deletion: soft delete (user + workshops marked deleted, kept in DB)
- Display name shown in header/nav only (AI chat does not use user's name in MVP 0.5)

### Claude's Discretion

- Exact modal styling and animation
- Clerk theme customization details
- Middleware implementation pattern
- localStorage schema for anonymous sessions
- Webhook endpoint structure and error handling

### Deferred Ideas (OUT OF SCOPE)

- Participant role and invite system — multiplayer milestone (MMP)
- Custom profile page — revisit if Clerk's built-in component isn't sufficient
- AI using user's name in conversation — potential MVP 1.0 personalization feature
- Admin dashboard UI — admin routes need to exist and be protected, but admin UI is a separate concern

</user_constraints>

---

## Standard Stack

The established libraries/tools for Clerk authentication with Next.js 15 App Router:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clerk/nextjs | ^6.8+ | Authentication provider | Official Clerk SDK for Next.js with App Router support, provides middleware, components, and hooks. Industry standard for managed auth in React/Next.js apps. |
| @clerk/themes | ^2.1+ | Pre-built themes | Official theming library for Clerk components. Provides 6 prebuilt themes with customization via appearance prop. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^5.0+ | Client state management | Modal state, auth wall state, localStorage sync. Lightweight (1KB), already in project for workshop state. |
| zod | ^3.24+ | Schema validation | Validate localStorage session data, webhook payloads, custom sign-up fields. Already installed for AI SDK. |
| svix | ^1.40+ | Webhook signature verification | Verify Clerk webhooks (Clerk uses Svix infrastructure). Ensures webhook requests are authentic. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk | NextAuth.js (Auth.js) | NextAuth is free and open-source, but requires more setup (DB sessions, OAuth app config, email service). Clerk provides managed infrastructure (10K MAU free tier). User decision locked on Clerk. |
| Clerk | Auth0 | Auth0 has more enterprise features and flexibility, but higher pricing ($240/month for 1000 users vs Clerk's $25/month). Clerk has better DX for React/Next.js. User decision locked on Clerk. |
| publicMetadata for roles | Organizations API | Organizations API provides built-in role management for B2B/multi-tenant apps. Better for complex permission structures. For simple facilitator/admin roles, publicMetadata is lighter weight and session-accessible. |
| localStorage for anonymous | Server-side sessions | Server sessions (cookies + DB) are more secure and work without JS. But user decision locked on localStorage for anonymous sessions (client-only, no server until auth wall). |

**Installation:**
```bash
# Clerk SDK and themes
npm install @clerk/nextjs @clerk/themes

# State management (may already be installed)
npm install zustand

# Validation (may already be installed)
npm install zod

# Webhook verification
npm install svix
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx                    # ClerkProvider wrapper
│   ├── api/
│   │   └── webhooks/
│   │       └── clerk/
│   │           └── route.ts          # Webhook endpoint for user sync
│   ├── (auth)/                       # Auth route group
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx              # Sign-in page (modal or route)
│   │   └── sign-up/[[...sign-up]]/
│   │       └── page.tsx              # Sign-up page (modal or route)
│   ├── dashboard/
│   │   └── page.tsx                  # Protected: facilitator dashboard
│   ├── admin/
│   │   └── page.tsx                  # Protected: admin only
│   └── workshop/
│       └── [id]/
│           └── step/[stepId]/
│               └── page.tsx          # Steps 1-3 public, 4-10 protected
├── components/
│   ├── auth/
│   │   ├── auth-wall-modal.tsx       # Auth wall after step 3
│   │   ├── sign-in-modal.tsx         # Modal wrapper for SignIn
│   │   └── sign-up-modal.tsx         # Modal wrapper for SignUp
│   ├── layout/
│   │   └── header.tsx                # Sign-in link, UserButton
│   └── protected/
│       ├── require-auth.tsx          # Component-level auth guard
│       └── require-admin.tsx         # Component-level admin guard
├── lib/
│   ├── auth/
│   │   ├── roles.ts                  # Role checking utilities
│   │   └── anonymous-session.ts      # localStorage session management
│   └── middleware/
│       └── route-matchers.ts         # Route protection patterns
├── middleware.ts                      # Clerk middleware
└── db/
    └── schema/
        └── users.ts                   # User table (synced from Clerk)
```

### Pattern 1: Clerk Middleware with Route Protection

**What:** Configure clerkMiddleware() in middleware.ts to protect specific routes while leaving others public.

**When to use:** All authenticated routes need session verification before rendering.

**Example:**
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define protected route patterns
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/workshop/:id/step/(4|5|6|7|8|9|10)', // Steps 4-10 only
  '/api/workshops(.*)',
  '/api/sessions(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Protect admin routes
  if (isAdminRoute(req)) {
    if (!userId) {
      // Unauthenticated: redirect to sign-in with return URL
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    const roles = (sessionClaims?.metadata as any)?.publicMetadata?.roles || [];
    if (!roles.includes('admin')) {
      // Authenticated but not admin: silent redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Protect general authenticated routes
  if (isProtectedRoute(req)) {
    if (!userId) {
      // For workshop steps 4-10, redirect to the step (auth wall will trigger)
      // For other routes, redirect to sign-in
      if (req.nextUrl.pathname.includes('/workshop')) {
        return NextResponse.next(); // Let page handle auth wall modal
      } else {
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.url);
        return NextResponse.redirect(signInUrl);
      }
    }
  }

  // Auto-redirect authenticated users from landing page to dashboard
  if (req.nextUrl.pathname === '/' && userId) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

**Key patterns:**
1. **Opt-in protection:** By default, all routes are public. Use createRouteMatcher() to define protected routes.
2. **Defense in depth:** Middleware checks auth, but components should also verify (CVE-2025-29927 mitigation).
3. **Role-based routing:** Check publicMetadata.roles in middleware for admin routes.
4. **Redirect with return URL:** Use redirect_url query param to return to original destination after sign-in.

**Source:** [clerkMiddleware() - Clerk Docs](https://clerk.com/docs/reference/nextjs/clerk-middleware), [Next.js Middleware guide - Contentful](https://www.contentful.com/blog/next-js-middleware/)

---

### Pattern 2: Modal-Based Authentication UI

**What:** Render Clerk SignIn/SignUp components in modal overlays instead of dedicated pages.

**When to use:** User decision: auth appears as modal overlay on landing page, not dedicated routes.

**Example:**

```typescript
// components/auth/auth-wall-modal.tsx
'use client';

import { SignUp } from '@clerk/nextjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

interface AuthWallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStep: number;
}

export function AuthWallModal({ open, onOpenChange, currentStep }: AuthWallModalProps) {
  const router = useRouter();

  const handleSignUpComplete = () => {
    // After sign-up, migrate anonymous session and continue to step 4
    migrateAnonymousSession(); // See Pattern 3
    router.push(`/workshop/${workshopId}/step/4`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create your account to continue</DialogTitle>
          <p className="text-muted-foreground">
            You've completed the first 3 steps. Sign up to continue to Step 4: Prototype your idea.
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview of Step 4 */}
          <div className="space-y-4">
            <h3 className="font-semibold">What's next?</h3>
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="font-medium">Step 4: Prototype</div>
              <p className="text-sm text-muted-foreground mt-2">
                Create low-fidelity representations of your solutions to test with users.
              </p>
            </div>
            {/* Show remaining steps 5-10 */}
          </div>

          {/* Sign-up form */}
          <div>
            <SignUp
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-none',
                },
              }}
              signInUrl="/sign-in"
              afterSignUpUrl={`/workshop/${workshopId}/step/4`}
            />
            <p className="text-sm text-center mt-4 text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => {/* Switch to sign-in modal */}}
                className="underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Alternative approach using URL params:**

```typescript
// app/workshop/[id]/step/[stepId]/page.tsx
'use client';

import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

export default function WorkshopStepPage() {
  const searchParams = useSearchParams();
  const showAuthWall = searchParams.get('auth') === 'required';

  return (
    <>
      {/* Workshop step content */}

      {showAuthWall && (
        <SignIn
          routing="virtual" // Modal mode
          appearance={{
            elements: {
              rootBox: 'fixed inset-0 z-50 flex items-center justify-center',
              card: 'max-w-md',
            },
          }}
        />
      )}
    </>
  );
}
```

**Key patterns:**
1. **Virtual routing mode:** Use `routing="virtual"` for modal behavior (SignIn/SignUp handles its own state).
2. **Appearance customization:** Use appearance prop to style components to match app design.
3. **Sign-up → sign-in switching:** Provide link to switch between modals, or use combined flow.
4. **Post-auth navigation:** Use afterSignUpUrl or handle in webhook/component effect.

**Source:** [<SignIn /> component - Clerk Docs](https://clerk.com/docs/nextjs/reference/components/authentication/sign-in), [Shareable Modals in Next.js](https://javascript-conference.com/blog/shareable-modals-nextjs/)

---

### Pattern 3: Anonymous Session Management with Migration

**What:** Store anonymous user's workshop data in localStorage, then migrate to database on sign-up.

**When to use:** User decision: anonymous users access steps 1-3, data saved in localStorage, seamlessly migrated after sign-up.

**Example:**

```typescript
// lib/auth/anonymous-session.ts
import { z } from 'zod';

const AnonymousSessionSchema = z.object({
  workshopId: z.string(),
  steps: z.array(z.object({
    stepId: z.string(),
    status: z.enum(['not_started', 'in_progress', 'complete']),
    output: z.record(z.unknown()).optional(),
    completedAt: z.string().optional(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type AnonymousSession = z.infer<typeof AnonymousSessionSchema>;

const STORAGE_KEY = 'workshoppilot_anonymous_session';

export function getAnonymousSession(): AnonymousSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    return AnonymousSessionSchema.parse(data);
  } catch (error) {
    console.error('Failed to parse anonymous session:', error);
    return null;
  }
}

export function saveAnonymousSession(session: AnonymousSession): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save anonymous session:', error);
  }
}

export function clearAnonymousSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Migrate anonymous session to authenticated user's database records
 * Called after sign-up or sign-in
 */
export async function migrateAnonymousSession(userId: string): Promise<void> {
  const session = getAnonymousSession();
  if (!session) return;

  try {
    // Send anonymous session data to API for migration
    const response = await fetch('/api/workshops/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        anonymousSession: session,
      }),
    });

    if (!response.ok) {
      throw new Error('Migration failed');
    }

    // Clear localStorage after successful migration
    clearAnonymousSession();
  } catch (error) {
    console.error('Failed to migrate anonymous session:', error);
    // Keep data in localStorage for retry
    throw error;
  }
}
```

**API endpoint for migration:**

```typescript
// app/api/workshops/migrate/route.ts
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { workshops, workshopSteps } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { anonymousSession } = await req.json();

  try {
    // Create workshop record
    const [workshop] = await db.insert(workshops).values({
      clerkUserId: userId,
      title: 'My Workshop', // Could derive from step outputs
      originalIdea: anonymousSession.steps[0]?.output?.idea || '',
      status: 'active',
    }).returning();

    // Migrate step progress
    await db.insert(workshopSteps).values(
      anonymousSession.steps.map((step: any) => ({
        workshopId: workshop.id,
        stepId: step.stepId,
        status: step.status,
        output: step.output,
        completedAt: step.completedAt ? new Date(step.completedAt) : null,
      }))
    );

    return NextResponse.json({ workshopId: workshop.id });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
```

**Key patterns:**
1. **Zod validation:** Validate localStorage data to prevent corruption.
2. **Migration on sign-up:** Call migrateAnonymousSession() after Clerk sign-up completes.
3. **Error handling:** Keep localStorage data if migration fails (allow retry).
4. **One active workshop limit:** For anonymous users, overwrite on new workshop start.

**Source:** [Local Storage in React - Robin Wieruch](https://www.robinwieruch.de/local-storage-react/), [Mastering State Persistence with Local Storage in React](https://medium.com/@roman_j/mastering-state-persistence-with-local-storage-in-react-a-complete-guide-1cf3f56ab15c)

---

### Pattern 4: Role-Based Access Control via publicMetadata

**What:** Store user roles in Clerk publicMetadata, accessible in session without API calls.

**When to use:** User decision: everyone starts as facilitator, admin role for app owner, roles stored as array.

**Example:**

```typescript
// lib/auth/roles.ts
import { auth, clerkClient } from '@clerk/nextjs/server';

export type UserRole = 'facilitator' | 'admin';

export async function checkRole(role: UserRole): Promise<boolean> {
  const { sessionClaims } = await auth();
  const roles = (sessionClaims?.metadata as any)?.publicMetadata?.roles || [];
  return roles.includes(role);
}

export async function getUserRoles(): Promise<UserRole[]> {
  const { sessionClaims } = await auth();
  return (sessionClaims?.metadata as any)?.publicMetadata?.roles || ['facilitator'];
}

export async function assignRoles(userId: string, roles: UserRole[]): Promise<void> {
  await clerkClient().users.updateUserMetadata(userId, {
    publicMetadata: { roles },
  });
}

/**
 * Initialize user roles on sign-up
 * Called from webhook handler
 */
export async function initializeUserRoles(userId: string, email: string): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = email === adminEmail;

  const roles: UserRole[] = isAdmin ? ['facilitator', 'admin'] : ['facilitator'];

  await assignRoles(userId, roles);
}
```

**Component-level authorization:**

```typescript
// components/protected/require-admin.tsx
import { checkRole } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';

interface RequireAdminProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export async function RequireAdmin({ children, fallback }: RequireAdminProps) {
  const isAdmin = await checkRole('admin');

  if (!isAdmin) {
    if (fallback) return <>{fallback}</>;
    redirect('/dashboard');
  }

  return <>{children}</>;
}
```

**Usage in admin pages:**

```typescript
// app/admin/page.tsx
import { RequireAdmin } from '@/components/protected/require-admin';

export default function AdminPage() {
  return (
    <RequireAdmin>
      <div>Admin Dashboard</div>
      {/* Admin UI */}
    </RequireAdmin>
  );
}
```

**Key patterns:**
1. **publicMetadata for roles:** Safe to read in frontend, only writable from backend.
2. **Environment-based admin assignment:** Check ADMIN_EMAIL env var in webhook.
3. **Array of roles:** Future-proofed for participant role and custom roles.
4. **Defense in depth:** Check roles in middleware AND components (CVE-2025-29927 mitigation).

**Source:** [Implement basic RBAC with metadata - Clerk Docs](https://clerk.com/docs/guides/secure/basic-rbac), [User metadata - Clerk Docs](https://clerk.com/docs/guides/users/extending)

---

### Pattern 5: Clerk Webhook for User Sync

**What:** Create API endpoint that receives Clerk webhooks to sync user data to database.

**When to use:** User decision: Clerk webhooks create DB record on user creation.

**Example:**

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { initializeUserRoles } from '@/lib/auth/roles';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set');
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata } = evt.data;

    const primaryEmail = email_addresses[0]?.email_address;
    const company = unsafe_metadata?.company || null;

    try {
      // Create user in database
      await db.insert(users).values({
        clerkUserId: id,
        email: primaryEmail,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
        company: company,
      });

      // Initialize roles (facilitator by default, admin if email matches)
      await initializeUserRoles(id, primaryEmail);

      return NextResponse.json({ message: 'User created' }, { status: 201 });
    } catch (error) {
      console.error('User creation error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    try {
      await db.update(users)
        .set({
          email: email_addresses[0]?.email_address,
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, id));

      return NextResponse.json({ message: 'User updated' }, { status: 200 });
    } catch (error) {
      console.error('User update error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      // Soft delete: mark as deleted but keep data
      await db.update(users)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(users.clerkUserId, id));

      // Also soft delete user's workshops
      await db.update(workshops)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(workshops.clerkUserId, id));

      return NextResponse.json({ message: 'User deleted' }, { status: 200 });
    } catch (error) {
      console.error('User deletion error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Webhook received' }, { status: 200 });
}
```

**Key patterns:**
1. **Svix verification:** Always verify webhook signatures to prevent spoofing.
2. **Idempotent operations:** Use upsert patterns or check existence before insert.
3. **Error handling:** Log errors but return 200 to prevent Clerk retries (unless transient error).
4. **Soft delete:** Mark deletedAt instead of hard delete (user decision).
5. **Capture custom fields:** Pull unsafe_metadata.company from sign-up form.

**Source:** [Sync Clerk data to your app with webhooks - Clerk Docs](https://clerk.com/docs/guides/development/webhooks/syncing), [How to sync Clerk user data to your database](https://clerk.com/articles/how-to-sync-clerk-user-data-to-your-database)

---

### Pattern 6: Custom Sign-Up Fields (Name + Company)

**What:** Add custom fields to Clerk sign-up form for first name, last name, and optional company.

**When to use:** User decision: collect name (first + last) + optional company/org field during sign-up.

**Example:**

```typescript
// components/auth/custom-sign-up.tsx
'use client';

import { useSignUp } from '@clerk/nextjs';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function CustomSignUp() {
  const { signUp, setActive } = useSignUp();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    emailAddress: '',
    password: '',
  });
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUp) return;

    try {
      await signUp.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        emailAddress: formData.emailAddress,
        password: formData.password,
        unsafeMetadata: {
          company: formData.company || null,
        },
      });

      // Prepare for email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      setVerifying(true);
    } catch (err: any) {
      console.error('Sign-up error:', err);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signUp) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        // Redirect or close modal
      }
    } catch (err: any) {
      console.error('Verification error:', err);
    }
  };

  if (verifying) {
    return (
      <form onSubmit={handleVerification} className="space-y-4">
        <Label>Verification Code</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter code from email"
        />
        <Button type="submit">Verify Email</Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>First Name</Label>
          <Input
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label>Company (Optional)</Label>
        <Input
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        />
      </div>

      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={formData.emailAddress}
          onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Password</Label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <Button type="submit">Sign Up</Button>
    </form>
  );
}
```

**Alternative: Configure in Clerk Dashboard:**
1. Navigate to User & Authentication → Email, Phone, Username
2. Enable "Require" for First Name and Last Name
3. Custom fields (company) must be captured via unsafeMetadata in code

**Key patterns:**
1. **unsafeMetadata for custom fields:** Company field stored in unsafeMetadata (accessible by client).
2. **Email verification flow:** prepareEmailAddressVerification() → attemptEmailAddressVerification().
3. **setActive after verification:** Establishes session after successful verification.

**Source:** [Build a custom email/password authentication flow - Clerk Docs](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password), [Clerk custom sign-up fields](https://www.contentful.com/blog/clerk-authentication/)

---

### Pattern 7: Redirect Configuration (Deprecated Props Migration)

**What:** Use new fallback/force redirect props instead of deprecated afterSignIn/afterSignUp.

**When to use:** All redirect scenarios after authentication.

**Example:**

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      // Or use environment variables:
      // CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
      // CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**For auth wall scenario (redirect to specific step):**

```typescript
// components/auth/auth-wall-modal.tsx
import { SignUp } from '@clerk/nextjs';

export function AuthWallModal({ workshopId, currentStep }: Props) {
  return (
    <SignUp
      signInUrl="/sign-in"
      signUpFallbackRedirectUrl={`/workshop/${workshopId}/step/4`}
      signUpForceRedirectUrl={`/workshop/${workshopId}/step/4`} // Always go to step 4
    />
  );
}
```

**Key patterns:**
1. **Fallback vs Force:** Fallback is default if no redirect_url param. Force always redirects regardless.
2. **Environment variables:** Set CLERK_SIGN_IN_FALLBACK_REDIRECT_URL for global default.
3. **Component-level override:** Pass props to specific SignIn/SignUp components for custom flows.

**Source:** [Customize your redirect URLs - Clerk Docs](https://clerk.com/docs/guides/development/customize-redirect-urls)

---

### Anti-Patterns to Avoid

**1. Relying solely on middleware for authorization (CVE-2025-29927)**
- Middleware can be bypassed via x-middleware-subrequest header in Next.js <15.2.3
- Always check auth in components and API routes, not just middleware
- Use auth() in Server Components and API routes to verify session

**2. Storing authentication tokens in localStorage**
- Clerk manages sessions via HTTP-only cookies (secure by default)
- Don't extract and store Clerk session tokens in localStorage
- Only store non-sensitive anonymous session data (workshop progress)

**3. Using deprecated afterSignIn/afterSignUp props**
- These props are deprecated and may be removed in future versions
- Use signInFallbackRedirectUrl / signUpForceRedirectUrl instead
- Update existing code to use new redirect props

**4. Forgetting to verify webhook signatures**
- Clerk webhooks use Svix signing (HMAC-SHA256)
- Always verify signatures before processing webhook data
- Unverified webhooks can be spoofed by attackers

**5. Creating user records without webhook**
- Don't create user records on client-side sign-up success
- Webhooks are the source of truth (eventual consistency)
- Handle race conditions where user signs up but webhook hasn't fired yet

**6. Hard-coding admin role checks**
- Don't hard-code email checks in components (admin@example.com)
- Use environment variable (ADMIN_EMAIL) checked in webhook/backend
- Store result in publicMetadata, read from session

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT session management | Custom JWT generation, verification, refresh logic | Clerk sessions (HTTP-only cookies) | Clerk handles session lifecycle, refresh tokens, device management, and security. Rolling your own JWT system means reimplementing these plus handling edge cases (token rotation, revocation, concurrent sessions). |
| OAuth provider integration | Custom OAuth 2.0 flow with Google/GitHub/etc | Clerk social connections | OAuth 2.0 has subtle security requirements (PKCE, state verification, token exchange). Clerk provides tested implementations for 30+ providers with one-click enable in dashboard. |
| Email verification | Custom OTP generation, email sending, code verification | Clerk email verification | Requires email infrastructure (SMTP/SendGrid), rate limiting, code expiration, brute force protection. Clerk provides all of this plus localized emails and magic links. |
| Webhook signature verification | Custom HMAC-SHA256 implementation | Svix library | Webhook verification has timing attack risks, replay protection requirements, and signature format specifics. Svix (used by Clerk) provides tested library with all security considerations. |
| Role permission checks | Custom permission system with database joins | Clerk publicMetadata + helper functions | Permission systems grow complex (inheritance, resource-level, conditions). For simple role checks, publicMetadata in session is sufficient. For complex permissions, use dedicated RBAC library later. |
| Anonymous session persistence | Custom sync queue, retry logic, conflict resolution | Simple localStorage + migration endpoint | Deferred data sync has edge cases (user signs up twice, clears storage, etc). Keep it simple: localStorage for anonymous, single migration on sign-up, clear after success. |

**Key insight:** Authentication has high security stakes and many edge cases discovered over years of real-world use. Clerk abstracts this complexity with a managed service that handles security updates, compliance, and edge cases.

---

## Common Pitfalls

### Pitfall 1: CVE-2025-29927 Middleware Bypass Vulnerability

**What goes wrong:** Attacker adds x-middleware-subrequest header to request, completely bypassing clerkMiddleware() authorization checks. All protected routes become accessible to unauthenticated users.

**Why it happens:** Next.js uses x-middleware-subrequest header internally to prevent infinite middleware loops. If this header exists, Next.js skips middleware execution. External requests with this header exploit the bypass. Affects Next.js 11.1.4 through 15.2.2.

**How to avoid:**
1. **Update Next.js immediately:** Upgrade to 15.2.3+ (patch released January 2025)
2. **Defense in depth:** Never rely solely on middleware. Check auth in components and API routes:
   ```typescript
   // Server Component
   import { auth } from '@clerk/nextjs/server';

   export default async function ProtectedPage() {
     const { userId } = await auth();
     if (!userId) {
       redirect('/sign-in');
     }
     // Continue with protected content
   }

   // API Route
   import { auth } from '@clerk/nextjs/server';

   export async function GET(req: Request) {
     const { userId } = await auth();
     if (!userId) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }
     // Continue with protected logic
   }
   ```
3. **Vercel auto-protection:** Vercel-hosted apps received automatic protection in January 2025. Self-hosted apps must manually patch.
4. **Test for vulnerability:** Use detection templates (available from security vendors) to scan for exploitation attempts.

**Warning signs:**
- Next.js version <15.2.3
- Logs showing authenticated access without userId
- Unauthorized users accessing protected resources

**Phase impact:** CRITICAL — must address in this phase. Middleware is core to route protection architecture.

**Source:** [CVE-2025-29927: Next.js Middleware Authorization Bypass - ProjectDiscovery](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass), [Understanding CVE-2025-29927 - Datadog Security Labs](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)

---

### Pitfall 2: Missing ClerkProvider in Layout

**What goes wrong:** Clerk hooks (useAuth, useUser) throw errors: "You've attempted to use Clerk outside of a ClerkProvider context." Components fail to render, authentication checks don't work.

**Why it happens:** ClerkProvider must wrap all components that use Clerk. It boots the Clerk client, reads environment variables, and exposes React Context. Without it, no Clerk hooks or components function.

**How to avoid:**
1. **Wrap entire app in layout.tsx:**
   ```typescript
   // app/layout.tsx
   import { ClerkProvider } from '@clerk/nextjs';

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <ClerkProvider>
         <html lang="en">
           <body>{children}</body>
         </html>
       </ClerkProvider>
     );
   }
   ```
2. **Don't conditionally wrap:** ClerkProvider should always be present, even for public pages.
3. **Check environment variables:** Ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set.

**Warning signs:**
- "outside of a ClerkProvider context" errors
- Clerk components render blank
- useAuth() returns undefined

**Phase impact:** Must address in this phase — blocking for all auth functionality.

**Source:** [Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware()](https://clerk.com/docs/reference/nextjs/errors/auth-was-called)

---

### Pitfall 3: Link Prefetching to Protected Routes

**What goes wrong:** Next.js Link component prefetches protected routes, triggering middleware redirects before user clicks. Causes unnecessary 401 errors, sign-in redirects, and performance issues.

**Why it happens:** Next.js Link prefetches route data on hover/viewport entry by default. For protected routes, this triggers middleware auth checks and redirects, which fail for unauthenticated users.

**How to avoid:**
1. **Disable prefetch for protected routes:**
   ```typescript
   <Link href="/dashboard" prefetch={false}>
     Dashboard
   </Link>
   ```
2. **Or disable globally via next.config.js:**
   ```javascript
   // next.config.js
   module.exports = {
     experimental: {
       optimisticClientCache: false, // Disables prefetching
     },
   };
   ```
3. **Only disable for authenticated links:** Public links can keep prefetch enabled.

**Warning signs:**
- 401 errors in network tab when hovering links
- Middleware running for routes user hasn't visited
- Unnecessary Clerk API calls on page load

**Phase impact:** Address in this phase for better UX and performance.

**Source:** [Authentication Best Practices: Convex, Clerk and Next.js](https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs)

---

### Pitfall 4: Race Condition Between Sign-Up and Webhook

**What goes wrong:** User signs up, front-end tries to create workshop, API query for user record returns null because webhook hasn't fired yet. Results in "User not found" errors or duplicate user creation attempts.

**Why it happens:** Clerk webhooks are eventually consistent. User creation in Clerk happens immediately, but webhook delivery to your API may take 100-500ms. Client-side code often runs before webhook completes.

**How to avoid:**
1. **Retry logic on user creation:**
   ```typescript
   async function ensureUserExists(clerkUserId: string, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       const user = await db.query.users.findFirst({
         where: eq(users.clerkUserId, clerkUserId),
       });

       if (user) return user;

       // Wait and retry
       await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
     }

     throw new Error('User not synced yet');
   }
   ```
2. **Optimistic user creation (fallback):**
   ```typescript
   // If webhook hasn't fired, create user record on-demand
   const user = await db.query.users.findFirst({ where: eq(users.clerkUserId, userId) });
   if (!user) {
     const clerkUser = await clerkClient().users.getUser(userId);
     await createUserFromClerkData(clerkUser);
   }
   ```
3. **Show loading state:** Display "Setting up your account..." for 1-2 seconds after sign-up.

**Warning signs:**
- "User not found" errors immediately after sign-up
- Duplicate user records in database
- Inconsistent behavior (works sometimes, fails others)

**Phase impact:** Must address in this phase — affects auth wall → step 4 transition.

**Source:** [Sync Clerk data to your app with webhooks - Clerk Docs](https://clerk.com/docs/guides/development/webhooks/syncing)

---

### Pitfall 5: Anonymous Session Data Loss on Browser Close

**What goes wrong:** User completes steps 1-3 anonymously, closes browser, returns, and all progress is gone. Results in user frustration and abandonment.

**Why it happens:** localStorage persists across browser sessions by default, but can be cleared by:
- User clearing browsing data
- Private/incognito mode (cleared on close)
- Browser storage limits (old data evicted)
- Multiple devices (localStorage is per-device)

**How to avoid:**
1. **Show clear progress indicator:**
   ```typescript
   <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
     <p className="text-sm">
       Your progress is saved locally. Sign up to access your workshop from any device.
     </p>
   </div>
   ```
2. **Detect storage issues:**
   ```typescript
   export function testLocalStorage(): boolean {
     try {
       localStorage.setItem('test', 'test');
       localStorage.removeItem('test');
       return true;
     } catch (e) {
       return false;
     }
   }

   // Show warning if localStorage unavailable
   if (!testLocalStorage()) {
     showWarning('Your browser is blocking local storage. Sign up to save your progress.');
   }
   ```
3. **Prompt sign-up earlier:** Show "Sign up to save your work" banner after step 1 completion.
4. **Accept the limitation:** For MVP 0.5, localStorage data loss is acceptable. Cross-device sync is a future feature.

**Warning signs:**
- User complaints about lost progress
- High step 1 completion but low step 2 start (users returning and restarting)
- localStorage quota exceeded errors

**Phase impact:** Address in this phase with clear UX communication about localStorage limitations.

**Source:** [Stop Storing Secrets in localStorage - DEV](https://dev.to/robert_domestisck_ae7af5a/stop-storing-secrets-in-localstorage-patterns-for-a-secure-digital-id-wallet-nkf)

---

### Pitfall 6: Admin Role Not Assigned on Initial Sign-Up

**What goes wrong:** App owner signs up using ADMIN_EMAIL, but admin role is not assigned. Can't access /admin routes, appears as regular facilitator.

**Why it happens:** Role initialization happens in webhook handler, which runs asynchronously after user creation. If webhook fails or ADMIN_EMAIL env var is missing, admin role won't be assigned.

**How to avoid:**
1. **Verify webhook configuration:**
   - Clerk Dashboard → Webhooks → Add Endpoint
   - Subscribe to user.created event
   - Test with Clerk's webhook testing tool
2. **Check ADMIN_EMAIL environment variable:**
   ```bash
   # .env.local
   ADMIN_EMAIL=owner@workshoppilot.ai
   ```
3. **Add fallback admin check:**
   ```typescript
   // Middleware fallback if role not yet set
   const isAdminEmail = sessionClaims?.emailAddress === process.env.ADMIN_EMAIL;
   if (isAdminEmail && !roles.includes('admin')) {
     // Log warning and allow access temporarily
     console.warn('Admin email detected but role not set. Check webhook.');
     return NextResponse.next();
   }
   ```
4. **Manual role assignment (emergency):**
   ```typescript
   // One-time script or API endpoint (protected)
   import { clerkClient } from '@clerk/nextjs/server';

   await clerkClient().users.updateUserMetadata('user_xxx', {
     publicMetadata: { roles: ['facilitator', 'admin'] },
   });
   ```

**Warning signs:**
- Admin user sees 403/redirect when accessing /admin
- Webhook endpoint returning 500 errors in Clerk dashboard
- Missing roles in session claims

**Phase impact:** Must address in this phase — admin must have access to /admin routes.

**Source:** [User metadata - Clerk Docs](https://clerk.com/docs/guides/users/extending)

---

## Code Examples

Verified patterns from official sources:

### Clerk Provider Setup

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#8b5cf6', // purple-500
          colorBackground: '#0a0a0a',
          colorInputBackground: '#1a1a1a',
          colorText: '#ffffff',
        },
      }}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**Source:** [Themes - Clerk Docs](https://clerk.com/docs/nextjs/guides/customizing-clerk/appearance-prop/themes)

---

### Google OAuth Setup (Clerk Dashboard)

1. **Enable Google in Clerk Dashboard:**
   - Navigate to Configure → SSO Connections
   - Select "Add connection" → "For all users"
   - Choose Google from provider list

2. **Development (automatic):**
   - Clerk provides preconfigured shared OAuth credentials for development
   - No additional configuration needed

3. **Production (custom credentials):**
   - Create OAuth 2.0 credentials in Google Cloud Console
   - Add authorized JavaScript origins: `https://yourdomain.com`
   - Add authorized redirect URIs from Clerk dashboard
   - Paste Client ID and Client Secret into Clerk dashboard
   - Set publishing status to "In production" in Google Console

**Source:** [Add Google as a social connection - Clerk Docs](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google)

---

### Database Schema for Users Table

```typescript
// src/db/schema/users.ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createPrefixedId('usr')),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  company: text('company'), // Optional company field from sign-up
  deletedAt: timestamp('deleted_at', { mode: 'date', precision: 3 }), // Soft delete
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Note: Roles stored in Clerk publicMetadata, not database
// This ensures roles are accessible in session without DB query
```

---

### Complete Middleware Example

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/workshop/:id/step/(1|2|3)', // Steps 1-3 are public
]);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/workshop/:id/step/(4|5|6|7|8|9|10)',
  '/api/workshops(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Admin routes
  if (isAdminRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    const roles = sessionClaims?.metadata?.publicMetadata?.roles || [];
    if (!roles.includes('admin')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  }

  // Protected routes
  if (isProtectedRoute(req) && !userId) {
    // Let the page handle auth wall modal for workshop steps
    if (req.nextUrl.pathname.includes('/workshop')) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Redirect authenticated users from landing page
  if (req.nextUrl.pathname === '/' && userId) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom JWT session management | Managed auth providers (Clerk, Auth0) | 2020-2023 | Reduces security risks, faster development. Clerk's session management handles refresh, device tracking, and security updates automatically. |
| OAuth implementation per provider | Pre-configured social connections | 2021+ | Clerk provides 30+ OAuth providers with one-click enable. No need to register OAuth apps manually for development. |
| afterSignIn/afterSignUp props | Fallback/Force redirect props | Clerk v5 (2024) | New redirect API is more explicit about fallback vs forced redirects. Old props deprecated but still supported. |
| Password-only authentication | Email + password + OAuth | 2022+ | OAuth (Google, GitHub) is now standard for better UX and security. Email/password remains as fallback. |
| Client-side role checks only | publicMetadata in session + server checks | 2023+ | Roles accessible in session (no DB query), but verified server-side for security. CVE-2025-29927 made defense-in-depth critical. |
| Manual webhook verification | Svix library (standardized) | 2023+ | Clerk uses Svix infrastructure. Svix library handles HMAC verification, replay protection, and timing attacks. |

**Deprecated/outdated:**
- **afterSignIn/afterSignUp props:** Use signInFallbackRedirectUrl and signUpForceRedirectUrl instead
- **Middleware-only auth:** CVE-2025-29927 proved middleware alone is insufficient. Always verify in components/API routes.
- **Custom role tables:** For simple RBAC, publicMetadata is sufficient and session-accessible. Custom tables add unnecessary complexity.

**Source:** [Customize your redirect URLs - Clerk Docs](https://clerk.com/docs/guides/development/customize-redirect-urls), [CVE-2025-29927 analysis](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)

---

## Open Questions

Things that couldn't be fully resolved:

### 1. Anonymous Session Migration Timing

**What we know:**
- User decision: localStorage for anonymous sessions, seamless migration after sign-up
- Migration triggered on sign-up, before continuing to step 4
- Webhook creates user record asynchronously (eventual consistency)

**What's unclear:**
- Should migration wait for webhook to complete, or use optimistic user creation?
- What happens if user signs up twice in quick succession (e.g., closes modal, reopens)?
- Should we show loading state during migration, or navigate immediately and migrate in background?

**Recommendation:**
- **Use optimistic migration with retry:** Don't wait for webhook. Create user record if not found, then migrate.
- **Single migration attempt:** Use a flag in localStorage to prevent duplicate migrations (migrated: true).
- **Show brief loading state:** "Setting up your account..." for 1-2 seconds provides buffer for webhook.
- Monitor: If migration failures are common, add retry queue or background sync.

---

### 2. Auth Wall Modal Dismissal Behavior

**What we know:**
- User decision: if user dismisses auth wall, stay on step 3, modal reappears on next advance attempt
- Modal should not be annoying (no auto-reappear on page refresh)
- Auth wall triggers after step 3 completion when user tries to advance

**What's unclear:**
- Should dismissal be tracked (localStorage flag: auth_wall_dismissed)?
- Does "dismissing" mean clicking outside modal, or explicit "Not now" button?
- Should we limit how many times user can dismiss (e.g., max 3 times)?

**Recommendation:**
- **No dismiss tracking needed:** Auth wall only appears when user tries to advance to step 4. If they dismiss, they stay on step 3.
- **Explicit "Not now" button:** Provide button with clear action, not just clicking outside.
- **No reappear on refresh:** Modal state is route-based (?auth=required param), not localStorage.
- Monitor: If users dismiss repeatedly, consider UX improvements to make sign-up more compelling.

---

### 3. Email Verification Enforcement Timing

**What we know:**
- User decision: email verification required before accessing protected routes
- Clerk supports email verification code or email link
- After sign-up, user should continue to step 4 (not dashboard)

**What's unclear:**
- Can user access step 4 before verifying email, or blocked until verified?
- If blocked, where do they wait? (Modal, dedicated verification page?)
- Should we allow "resend verification email" from auth wall modal?

**Recommendation:**
- **Block protected routes until verified:** Middleware checks sessionClaims.emailVerified.
- **Show verification modal on blocked access:** If not verified, show modal with "Check your email" message.
- **Resend option in modal:** Provide "Resend code" button in verification modal.
- Monitor: Track verification completion rate. If low, consider email link instead of code (easier UX).

---

## Sources

### PRIMARY (HIGH confidence)

**Clerk Official Documentation:**
- [Next.js Quickstart (App Router) - Clerk Docs](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [clerkMiddleware() - Clerk Docs](https://clerk.com/docs/reference/nextjs/clerk-middleware)
- [<SignIn /> component - Clerk Docs](https://clerk.com/docs/nextjs/reference/components/authentication/sign-in)
- [<SignUp /> component - Clerk Docs](https://clerk.com/docs/nextjs/reference/components/authentication/sign-up)
- [User metadata - Clerk Docs](https://clerk.com/docs/guides/users/extending)
- [Implement basic RBAC with metadata - Clerk Docs](https://clerk.com/docs/guides/secure/basic-rbac)
- [Sync Clerk data to your app with webhooks - Clerk Docs](https://clerk.com/docs/guides/development/webhooks/syncing)
- [Add Google as a social connection - Clerk Docs](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google)
- [Customize your redirect URLs - Clerk Docs](https://clerk.com/docs/guides/development/customize-redirect-urls)
- [Themes - Clerk Docs](https://clerk.com/docs/nextjs/guides/customizing-clerk/appearance-prop/themes)
- [<UserProfile /> component - Clerk Docs](https://clerk.com/docs/nextjs/reference/components/user/user-profile)
- [Build a custom email/password authentication flow - Clerk Docs](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password)

**Security Analysis:**
- [CVE-2025-29927: Next.js Middleware Authorization Bypass - ProjectDiscovery](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Understanding CVE-2025-29927 - Datadog Security Labs](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- [Postmortem on Next.js Middleware bypass - Vercel](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

### SECONDARY (MEDIUM-HIGH confidence)

**Implementation Guides:**
- [Clerk Authentication in Next.js 15 App Router - Build with Matija](https://www.buildwithmatija.com/blog/clerk-authentication-nextjs15-app-router)
- [Complete Authentication Guide for Next.js App Router in 2025 - Clerk](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)
- [How to sync Clerk user data to your database - Clerk](https://clerk.com/articles/how-to-sync-clerk-user-data-to-your-database)
- [Implement Role-Based Access Control in Next.js 15 - Clerk Blog](https://clerk.com/blog/nextjs-role-based-access-control)

**Next.js Modal Patterns:**
- [Shareable Modals in Next.js: URL-Synced UI Made Simple](https://javascript-conference.com/blog/shareable-modals-nextjs/)
- [How To Create Modals with Unique Routes in Next.js - DEV](https://dev.to/noel_ethan/how-to-create-modals-with-unique-routes-in-nextjs-a-guide-to-intercepting-routes-k40)

**localStorage & Session Management:**
- [Local Storage in React - Robin Wieruch](https://www.robinwieruch.de/local-storage-react/)
- [Mastering State Persistence with Local Storage in React - Medium](https://medium.com/@roman_j/mastering-state-persistence-with-local-storage-in-react-a-complete-guide-1cf3f56ab15c)

**Middleware Patterns:**
- [Next.js Route Handlers: The Complete Guide - MakerKit](https://makerkit.dev/blog/tutorials/nextjs-api-best-practices)
- [Middleware in Next.js: The Smarter Way to Handle Protected Routes - Medium](https://medium.com/@entekumejeffrey/middleware-in-next-js-and-react-the-smarter-way-to-handle-protected-routes-ec7a966ead9d)

**Best Practices:**
- [Authentication Best Practices: Convex, Clerk and Next.js](https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs)
- [Stop Storing Secrets in localStorage - DEV](https://dev.to/robert_domestisck_ae7af5a/stop-storing-secrets-in-localstorage-patterns-for-a-secure-digital-id-wallet-nkf)

### TERTIARY (MEDIUM confidence)

**Community Resources:**
- [Clerk + MongoDB: A technical guide - Medium](https://medium.com/@mishrasidhant01/clerk-mongodb-a-technical-guide-for-seamless-user-management-in-nextjs-caa76b6cd53c)
- [Ultimate guide for deploying Google OAuth using Clerk+Next.js+Vercel - Medium](https://medium.com/@chirag_9121/ultimate-guide-for-deploying-google-oauth-using-clerk-next-js-vercel-c586c943949c)
- [Sync clerk users to your database using Webhooks - DEV](https://dev.to/devlawrence/sync-clerk-users-to-your-database-using-webhooks-a-step-by-step-guide-263i)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Clerk documentation, verified Next.js 15 support
- Architecture patterns: HIGH - Clerk official docs with code examples, security analysis for CVE-2025-29927
- Pitfalls: HIGH - CVE-2025-29927 officially documented, other pitfalls from Clerk docs and community consensus
- Open questions: MEDIUM - Requires runtime validation and UX testing

**Research date:** 2026-02-07
**Valid until:** 30 days (Clerk updates monthly, Next.js security patches ongoing)

**Research completed by:** gsd-phase-researcher
**Ready for:** gsd-planner to create PLAN.md files

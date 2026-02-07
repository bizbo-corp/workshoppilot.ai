import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { initializeUserRoles } from '@/lib/auth/roles';

/**
 * Clerk webhook endpoint for user lifecycle sync
 * Handles user.created, user.updated, and user.deleted events
 * Docs: https://clerk.com/docs/integrations/webhooks/sync-data
 */
export async function POST(req: Request) {
  // Verify webhook signature
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Get svix headers for verification
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing svix headers');
    return NextResponse.json(
      { error: 'Missing webhook verification headers' },
      { status: 400 }
    );
  }

  // Get the request body
  const body = await req.text();
  let evt: any;

  // Verify webhook signature
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Handle different event types
  const eventType = evt.type;

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata } = evt.data;

        const primaryEmail = email_addresses[0]?.email_address;
        if (!primaryEmail) {
          console.error('No primary email found for user:', id);
          return NextResponse.json(
            { error: 'No primary email found' },
            { status: 400 }
          );
        }

        const company = unsafe_metadata?.company;

        // Insert user into database
        await db.insert(users).values({
          clerkUserId: id,
          email: primaryEmail,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
          company: company || null,
          roles: JSON.stringify(['facilitator']), // Default role
        });

        // Initialize roles in Clerk publicMetadata
        await initializeUserRoles(id, primaryEmail);

        console.log('User created:', id, primaryEmail);
        return NextResponse.json({ success: true }, { status: 201 });
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;

        const primaryEmail = email_addresses[0]?.email_address;

        // Update user in database
        await db
          .update(users)
          .set({
            email: primaryEmail,
            firstName: first_name || null,
            lastName: last_name || null,
            imageUrl: image_url || null,
          })
          .where(eq(users.clerkUserId, id));

        console.log('User updated:', id);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      case 'user.deleted': {
        const { id } = evt.data;

        // Soft delete user
        await db
          .update(users)
          .set({ deletedAt: new Date() })
          .where(eq(users.clerkUserId, id));

        // TODO: Soft delete user's workshops when workshops table has deletedAt column
        // Currently workshops table does not have deletedAt field

        console.log('User soft deleted:', id);
        return NextResponse.json({ success: true }, { status: 200 });
      }

      default:
        // Unhandled event type - just acknowledge receipt
        console.log('Unhandled webhook event type:', eventType);
        return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error) {
    console.error('Error handling webhook event:', eventType, error);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }
}

import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Health check endpoint that verifies database connectivity
 * Returns 200 with healthy status if database is reachable
 * Returns 500 with unhealthy status if database is unreachable or times out
 *
 * Auth: Optional CRON_SECRET authentication for Vercel cron jobs
 * - If CRON_SECRET env var is set, requires Bearer token in Authorization header
 * - If CRON_SECRET is not set (dev), allows unauthenticated requests
 * - This allows monitoring tools to ping endpoint while securing cron warming
 */
export async function GET(req: Request) {
  // Optional CRON_SECRET authentication
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    // Execute simple health check query with 5-second timeout
    const healthCheck = db.execute(sql`SELECT 1 as health`);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database health check timed out after 5 seconds')), 5000)
    );

    await Promise.race([healthCheck, timeout]);

    return NextResponse.json(
      {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        warmedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

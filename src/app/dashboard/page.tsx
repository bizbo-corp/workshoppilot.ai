import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { MigrationCheck } from '@/components/auth/migration-check';

export default async function DashboardPage() {
  // Defense in depth: verify auth at page level
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  // Query user from database
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  // Handle webhook race condition: user signed up but webhook hasn't created DB record yet
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-lg text-gray-600">Setting up your account...</p>
          <p className="mt-2 text-sm text-gray-400">This will only take a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Migration check component - triggers anonymous session migration */}
      <MigrationCheck />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Workshops</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user.firstName || 'there'}!
          </p>
        </div>

        {/* Placeholder workshop list */}
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No workshops yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first workshop.
          </p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <svg
                className="-ml-0.5 mr-1.5 h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Start Workshop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

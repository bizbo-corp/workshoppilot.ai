# Phase 1: Foundation & Database - Research

**Researched:** 2026-02-07
**Domain:** Neon Postgres + Drizzle ORM for edge-compatible serverless database layer
**Confidence:** HIGH

## Summary

Phase 1 establishes the database foundation for WorkshopPilot.ai using Neon Postgres (serverless Postgres) with Drizzle ORM (TypeScript-first ORM optimized for edge runtimes). The research focused on implementing the user's locked decisions: Neon with branching workflow, Drizzle with @neondatabase/serverless driver, application-layer ID generation (cuid2/nanoid), schema design patterns for external auth (Clerk), and migration strategy (push for dev, migrations for prod).

**Key findings:**
- Drizzle with @neondatabase/serverless driver is the optimal stack for Vercel edge compatibility
- HTTP mode (via neon-http driver) provides best performance for serverless one-shot queries
- drizzle-kit push is production-ready for rapid iteration and explicitly endorsed by Drizzle team
- Neon branching provides instant database copies (1 second, copy-on-write) for dev/preview/prod workflows
- Application-layer ID generation with cuid2 provides better index locality and URL-friendliness than UUID
- Reference data (step definitions) belongs in migrations, not seed scripts

**Primary recommendation:** Use @neondatabase/serverless with neon-http driver for all environments, implement drizzle-kit push for local dev with SQL migrations for production deploys, generate IDs with cuid2 in application layer, and leverage Neon branching for isolated dev/preview environments.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema Design:**
- No local users table — reference Clerk user IDs (clerk_user_id string) as foreign keys throughout
- IDs: cuid2/nanoid generated in app layer for all primary keys (URL-friendly, collision-resistant)
- Hard deletes with confirmation UX (no soft delete columns)
- Timestamps: Claude's discretion per table (created_at/updated_at where appropriate)
- snake_case naming convention for all tables and columns
- Plural table names: workshops, sessions, steps, etc.
- Extensible roles — flexible role field/table rather than fixed enum, supports future admin/viewer/custom roles
- Plan key indexes upfront for known query patterns (workshops by owner, steps by workshop, etc.)
- Nullable org_id/team_id on workshops for future multi-tenancy (individual-only for MVP 0.5)

**Workshop Data Model:**
- Workshop has sessions (1:many) — workshop is the long-lived container, sessions track individual work periods
- Workshop fields: id, title, original_idea (the vague idea that started it), status, clerk_user_id, nullable org_id, nullable template_id, visibility/share_token (private by default)
- Workshop statuses: draft, active, paused, completed
- Current step position derived from step completion data (no stored current_step field)
- Workshop cap per plan — user tier stored in Clerk metadata, enforced at app level
- Workshop members table from start: workshop_members (workshop_id, clerk_user_id, role) — owner is role='owner', ready for collaboration

**Step Data Model:**
- Steps reference table (steps_definitions) for the 10 design thinking step definitions — updatable without deploys
- Workshop steps table (workshop_steps) for per-workshop progress: step_id, workshop_id, status, output (jsonb), started_at, completed_at
- Step statuses: not_started, in_progress, complete
- Step completion: AI confirms completion as default, but user can skip with confirmation
- Step output: generic jsonb column — step-specific Zod schemas deferred to MVP 1.0
- Overwrite on re-edit (no revision history for step outputs)
- All prior step outputs loaded as context for subsequent steps (no declared dependencies)

**Sessions:**
- Auto-created sessions, but only persisted after meaningful activity (step visited or AI interaction) — prevents null/orphan rows
- Lean session data: timestamps only (session_id, workshop_id, started_at, ended_at)

**Build Packs (future-proofing):**
- build_packs table included in schema now to avoid migration later
- References workshop (content assembled from current step outputs, not snapshots)
- Supports multiple output formats: Markdown, PDF, JSON (format_type column)

**Environment & Connection:**
- Neon branching: single project, branches for dev/prod/preview deployments (copy-on-write)
- Connect to Neon dev branch for local development (no local Postgres/Docker)
- @neondatabase/serverless driver everywhere (both local and production) — consistent behavior
- Neon's built-in PgBouncer connection pooling only (no app-level pooling)
- Single DATABASE_URL environment variable
- Environment variables managed via `vercel env pull` (Vercel as single source of truth)
- /api/health endpoint that verifies database connectivity

**Migration Strategy:**
- drizzle-kit push for local development (fast iteration, no migration files)
- Migration files for production deployments
- Auto-migrate on deploy (migrations run during Vercel build process)

### Claude's Discretion

- Timestamps strategy per table (created_at/updated_at placement)
- Step definitions seeding approach (migration vs seed script)
- Dev branch reset strategy (npm script vs Neon branch recreation)
- Step output JSON validation approach (recommend Zod)
- Exact index selection for known query patterns
- Compression/optimization choices

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

The established libraries/tools for Drizzle ORM + Neon Postgres serverless database layer:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.37.0 | TypeScript ORM | Thin SQL wrapper with superior type inference, faster compile times (300 type instantiations vs 5000+ for Prisma), native Neon support, zero-cost abstractions. Industry standard for serverless Postgres in 2026. |
| @neondatabase/serverless | ^0.13.0 | Neon DB driver | Official Neon driver with HTTP/WebSocket support for edge environments. 3-4 roundtrips vs 8+ for traditional TCP, optimized for Vercel serverless cold starts. |
| drizzle-kit | ^0.28.0 | Schema migration tool | Push-based rapid development workflow (drizzle-kit push) with SQL migration generation for production. Official tooling for Drizzle schema management. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @paralleldrive/cuid2 | ^2.2.2 | ID generation | Application-layer primary key generation. Time-ordered prefix improves index locality, URL-friendly, 10-20% faster inserts than UUID in distributed databases. |
| zod | ^3.24.0 | Schema validation | Runtime validation for JSONB step outputs, database input validation, type-safe schema definitions. Required by AI SDK, reusable here. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma | Prisma has larger ecosystem and better documentation, but Drizzle compiles 16x faster (300 vs 5000+ type instantiations), has SQL-like API for complex queries, and better performance in serverless. User decision locked on Drizzle. |
| @neondatabase/serverless | node-postgres (pg) | Traditional pg driver is widely used and stable, but requires 8+ TCP roundtrips on cold start (3-5 seconds latency). Neon serverless uses HTTP/WebSocket with 3-4 roundtrips (500ms-1s). Edge compatibility requires serverless driver. |
| cuid2 | nanoid | Nanoid is smaller (108 bytes) and more customizable. CUID2 provides time-based prefix for better index locality (10-20% faster inserts) and better collision resistance (4.03e+18 vs nanoid's lower entropy). For database primary keys, CUID2's structure wins. |
| cuid2 | UUID v7 | UUID v7 (time-ordered) is PostgreSQL-native via gen_random_uuid(). But user decision locked on application-layer generation for control over format and URL-friendliness. CUID2 uses larger alphabet (base32) for shorter strings (24 chars vs 36). |

**Installation:**
```bash
# Core ORM and driver
npm install drizzle-orm @neondatabase/serverless

# Development tooling
npm install -D drizzle-kit

# ID generation
npm install @paralleldrive/cuid2

# Validation (may already be installed for AI SDK)
npm install zod
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── db/
│   ├── schema/              # Schema definitions (one file per table or logical group)
│   │   ├── index.ts         # Re-exports all schemas
│   │   ├── workshops.ts     # Workshop, workshop_members tables
│   │   ├── steps.ts         # step_definitions, workshop_steps tables
│   │   ├── sessions.ts      # sessions table
│   │   └── build-packs.ts   # build_packs table
│   ├── client.ts            # Database client singleton
│   ├── types.ts             # Inferred TypeScript types from schema
│   └── migrations/          # Generated SQL migrations (for production)
├── lib/
│   └── ids.ts               # ID generation utilities (cuid2 wrappers)
└── app/
    └── api/
        └── health/
            └── route.ts     # Health check endpoint
```

### Pattern 1: Database Client Singleton

**What:** Export a single Drizzle database instance configured with Neon serverless driver.

**When to use:** All database queries throughout the application.

**Example:**
```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// HTTP mode: best for serverless one-shot queries
const sql = neon(process.env.DATABASE_URL);

// Export singleton with schema for relational queries
export const db = drizzle(sql, { schema });
```

**Why HTTP mode:** Neon serverless driver supports two modes:
- **HTTP (neon-http):** Faster for single, non-interactive transactions. Uses fetch requests. Best for serverless.
- **WebSocket (neon-ws):** Required for interactive transactions, sessions, or node-postgres compatibility. Must be connected/closed per request in serverless.

For Next.js API routes and Server Actions (single-query patterns), HTTP mode is optimal.

**Source:** [Drizzle ORM - Get Started with Neon](https://orm.drizzle.team/docs/get-started/neon-new), [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)

---

### Pattern 2: Schema Definition with Modern PostgreSQL Patterns

**What:** Define tables using Drizzle's schema API with modern PostgreSQL best practices (identity columns, text IDs, timestamps).

**When to use:** All table definitions in src/db/schema/*.

**Example:**
```typescript
// src/db/schema/workshops.ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const workshops = pgTable('workshops', {
  // Primary key: application-generated CUID2
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),

  // Foreign key to Clerk (external auth, no local users table)
  clerkUserId: text('clerk_user_id').notNull(),

  // Core fields
  title: text('title').notNull(),
  originalIdea: text('original_idea').notNull(),
  status: text('status').notNull().$type<'draft' | 'active' | 'paused' | 'completed'>(),

  // Future multi-tenancy (nullable for MVP 0.5)
  orgId: text('org_id'),
  templateId: text('template_id'),

  // Sharing/collaboration
  visibility: text('visibility').notNull().default('private').$type<'private' | 'shared'>(),
  shareToken: text('share_token'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  // Indexes for known query patterns
  index('workshops_clerk_user_id_idx').on(table.clerkUserId),
  index('workshops_status_idx').on(table.status),
  index('workshops_org_id_idx').on(table.orgId), // Future multi-tenancy
]);

export const workshopMembers = pgTable('workshop_members', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),

  workshopId: text('workshop_id').notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  clerkUserId: text('clerk_user_id').notNull(),

  // Extensible role (not enum) for future admin/viewer/custom roles
  role: text('role').notNull(), // 'owner', 'editor', 'viewer', etc.

  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
}, (table) => [
  index('workshop_members_workshop_id_idx').on(table.workshopId),
  index('workshop_members_clerk_user_id_idx').on(table.clerkUserId),
]);
```

**Key patterns:**
1. **Primary keys:** `text('id').primaryKey().$defaultFn(() => createId())` for application-layer CUID2 generation
2. **Foreign keys to Clerk:** `text('clerk_user_id')` with no local users table
3. **Timestamps:** `timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()` for creation, add `.$onUpdate(() => new Date())` for auto-update
4. **Type-safe enums without enum:** `text('status').$type<'draft' | 'active'>()` provides TypeScript safety with string flexibility
5. **Indexes in table callback:** Second parameter to `pgTable()` returns array of indexes

**Source:** [Drizzle ORM PostgreSQL Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717), [Drizzle ORM - Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints)

---

### Pattern 3: JSONB Schema with Type Safety

**What:** Define JSONB columns with TypeScript type inference for flexible schema-less data (step outputs).

**When to use:** workshop_steps.output field for storing step-specific data structures.

**Example:**
```typescript
// src/db/schema/steps.ts
import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Step definitions reference table (updatable without deploys)
export const stepDefinitions = pgTable('step_definitions', {
  id: text('id').primaryKey(), // e.g., 'empathize', 'define', 'ideate'
  order: integer('order').notNull(), // 1-10 for sequential ordering
  name: text('name').notNull(),
  description: text('description').notNull(),
  promptTemplate: text('prompt_template'), // AI facilitation prompt for this step
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
});

// Per-workshop step progress
export const workshopSteps = pgTable('workshop_steps', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),

  workshopId: text('workshop_id').notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull().references(() => stepDefinitions.id),

  status: text('status').notNull().default('not_started')
    .$type<'not_started' | 'in_progress' | 'complete'>(),

  // Generic JSONB for step-specific outputs (no schema enforcement at DB level)
  // Step-specific Zod schemas validate this in application layer
  output: jsonb('output').$type<Record<string, unknown>>(),

  startedAt: timestamp('started_at', { mode: 'date', precision: 3 }),
  completedAt: timestamp('completed_at', { mode: 'date', precision: 3 }),

  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  index('workshop_steps_workshop_id_idx').on(table.workshopId),
  index('workshop_steps_step_id_idx').on(table.stepId),
  index('workshop_steps_status_idx').on(table.status),
]);
```

**JSONB querying patterns:**
```typescript
// Query workshop steps and access JSONB fields
const steps = await db.select().from(workshopSteps)
  .where(eq(workshopSteps.workshopId, workshopId));

// Access output (type-safe via .$type<Record<string, unknown>>())
const userPersonas = steps[0].output?.personas; // TypeScript knows output is Record<string, unknown>

// For JSONB field queries (rare in this app), use raw SQL:
import { sql } from 'drizzle-orm';
const stepsWithPersonaCount = await db.select()
  .from(workshopSteps)
  .where(sql`${workshopSteps.output}->>'personas' IS NOT NULL`);
```

**JSONB indexing (if needed for queries):**
```typescript
// GIN index for JSONB queries (add if you need to query into output frequently)
import { index } from 'drizzle-orm/pg-core';

index('workshop_steps_output_gin_idx').using('gin', table.output)
```

**Source:** [Drizzle ORM - PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg), [Drizzle ORM PostgreSQL Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)

---

### Pattern 4: Reference Data in Migrations (Step Definitions)

**What:** Insert static reference data (step definitions) as part of migrations, not seed scripts.

**When to use:** Data that defines the system (roles, step definitions, config values).

**Recommendation:** Use custom SQL migrations for step definitions.

**Example:**
```typescript
// After running: drizzle-kit generate
// Edit the generated migration file: drizzle/0001_add_step_definitions.sql

INSERT INTO step_definitions (id, order, name, description, prompt_template) VALUES
  ('empathize', 1, 'Empathize', 'Understand your users deeply', 'You are facilitating the Empathize phase...'),
  ('define', 2, 'Define', 'Define the core problem', 'You are facilitating the Define phase...'),
  ('ideate', 3, 'Ideate', 'Generate solution ideas', 'You are facilitating the Ideate phase...'),
  ('prototype', 4, 'Prototype', 'Create low-fidelity prototypes', 'You are facilitating the Prototype phase...'),
  ('test', 5, 'Test', 'Validate with users', 'You are facilitating the Test phase...'),
  ('prioritize', 6, 'Prioritize', 'Prioritize features for MVP', 'You are facilitating the Prioritize phase...'),
  ('architect', 7, 'Architect', 'Design technical architecture', 'You are facilitating the Architect phase...'),
  ('spec', 8, 'Spec', 'Write detailed specifications', 'You are facilitating the Spec phase...'),
  ('story', 9, 'Story', 'Create user stories', 'You are facilitating the Story phase...'),
  ('pack', 10, 'Pack', 'Generate Build Pack', 'You are facilitating the Pack phase...')
ON CONFLICT (id) DO UPDATE SET
  order = EXCLUDED.order,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  prompt_template = EXCLUDED.prompt_template,
  updated_at = now();
```

**Why migrations not seed scripts:**
- Step definitions define the system itself (10 steps are core to the product)
- Must exist in all environments (dev, preview, prod)
- Should be version-controlled and deployed atomically with schema changes
- ON CONFLICT ensures updates are idempotent

**Alternative for step content management:**
If step definitions need to be updated frequently without deploys, store prompt_template in a separate prompt_templates table or external CMS. Keep the 10 step IDs and basic metadata in migrations.

**Source:** [Drizzle ORM - Custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations), WebSearch results on reference data patterns

---

### Pattern 5: Neon Branching Workflow

**What:** Use Neon's copy-on-write branching to create instant database copies for dev, preview, and testing.

**When to use:** Local development (dev branch), pull request previews (ephemeral branches), production (main branch).

**Workflow:**

```bash
# 1. Create development branch (one-time per developer)
npx neonctl branches create --name dev/michael --parent main

# 2. Get connection string for dev branch
npx neonctl connection-string dev/michael

# 3. Add to .env.local
DATABASE_URL="postgresql://..."

# 4. For PR previews, use Vercel integration or GitHub Action
# Vercel Neon integration auto-creates branch per preview deployment
```

**Branching characteristics:**
- **Instant:** Branch creation takes ~1 second regardless of database size
- **Copy-on-write:** Only unique data is stored (shared data points to parent)
- **Isolated:** Changes to branch don't affect parent
- **Billing:** Pay only for unique data across all branches
- **Auto-scale to zero:** Branches not in use incur minimal costs

**Dev branch reset strategy (Claude's discretion):**
- **Option 1 - Branch reset:** `npx neonctl branches reset dev/michael --parent main` (resets to match parent, keeps same connection string)
- **Option 2 - Recreate branch:** Delete and recreate dev branch (gets new connection string, requires .env update)
- **Recommendation:** Use branch reset for convenience (same connection string)

**Production migration workflow:**
```bash
# 1. Generate migration locally on dev branch
npx drizzle-kit generate

# 2. Test migration on dev branch
npx drizzle-kit migrate

# 3. Commit migration files to git
git add drizzle/
git commit -m "feat: add workshop_steps table"

# 4. PR merged, deploy to Vercel
# Migrations run automatically during build (see Pattern 6)
```

**Source:** [Database branching workflow primer](https://neon.com/docs/get-started/workflow-primer), [Branching - Neon Docs](https://neon.com/docs/introduction/branching)

---

### Pattern 6: Auto-Migrate on Deploy

**What:** Run database migrations automatically during Vercel build process.

**When to use:** Production and preview deployments.

**Implementation:**

```json
// package.json
{
  "scripts": {
    "build": "next build",
    "vercel-build": "npm run db:migrate:prod && npm run build",
    "db:migrate:prod": "drizzle-kit migrate",
    "db:push:dev": "drizzle-kit push"
  }
}
```

**How it works:**
1. Vercel runs `npm run vercel-build` during deployment
2. `drizzle-kit migrate` reads `drizzle/` folder for generated SQL migrations
3. Migrations apply to DATABASE_URL (Neon production or preview branch)
4. If migrations fail, build fails (prevents broken deployments)
5. Next.js build proceeds only after successful migration

**Configuration:**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Environment variables:**
- Use `vercel env pull` to sync environment variables locally
- DATABASE_URL should point to appropriate Neon branch per environment:
  - Production: Neon main branch
  - Preview: Neon preview branch (auto-created by Vercel Neon integration)
  - Local: Neon dev branch

**Important:** Vercel does NOT automatically run migrations. You must explicitly add migration step to build command.

**Source:** [Vercel migrations](https://hrekov.com/blog/vercel-migrations), [How to manage database migrations in a Next.js app?](https://github.com/vercel/next.js/discussions/59164)

---

### Pattern 7: Health Check Endpoint

**What:** API endpoint that verifies database connectivity and returns 200 OK or 500 error.

**When to use:** Production monitoring, Kubernetes liveness probes, deployment verification.

**Example:**

```typescript
// src/app/api/health/route.ts
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Edge-compatible

export async function GET() {
  try {
    // Simple query to verify connectivity
    const result = await db.execute(sql`SELECT 1 as health`);

    if (result.rows[0]?.health === 1) {
      return NextResponse.json(
        { status: 'healthy', database: 'connected' },
        { status: 200 }
      );
    }

    throw new Error('Unexpected query result');
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

**Advanced pattern with timeout:**

```typescript
// Health check with timeout to prevent hanging
export async function GET() {
  const timeoutMs = 5000; // 5 second timeout

  try {
    const result = await Promise.race([
      db.execute(sql`SELECT 1 as health`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
      )
    ]);

    return NextResponse.json({ status: 'healthy' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

**Why edge runtime compatible:** @neondatabase/serverless driver uses fetch (HTTP mode), which is edge-compatible. Traditional pg driver would require Node.js runtime.

**Source:** WebSearch results on PostgreSQL health check patterns, [Docker Compose Health Checks](https://oneuptime.com/blog/post/2026-01-30-docker-compose-health-checks/view)

---

### Anti-Patterns to Avoid

**1. Using node-postgres (pg) driver for serverless:**
- Traditional pg driver requires TCP connections (8+ roundtrips on cold start)
- Not edge-compatible (requires Node.js runtime, not available in Vercel Edge)
- Use @neondatabase/serverless instead

**2. Database-layer ID generation (UUID, serial, identity):**
- User decision locked on application-layer generation for control and URL-friendliness
- Database-generated UUIDs are random (poor index locality)
- Application generation allows CUID2's time-ordered prefix (better performance)

**3. Using enum types for extensible values:**
- Postgres ENUMs are fixed and hard to alter (requires migrations)
- User decision: flexible role field for future admin/viewer/custom roles
- Use text columns with TypeScript type narrowing: `text('role').$type<'owner' | 'editor'>()`

**4. Soft deletes (deleted_at columns):**
- User decision: hard deletes with confirmation UX
- Soft deletes complicate queries (WHERE deleted_at IS NULL everywhere)
- Use hard deletes, rely on backups for recovery

**5. Storing current step position in workshops table:**
- User decision: derive current step from step completion data
- Avoids sync issues between workshops.current_step and workshop_steps completion status
- Query pattern: `SELECT MIN(order) FROM workshop_steps WHERE status != 'complete'`

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique ID generation | Custom random string generator | @paralleldrive/cuid2 | CUID2 provides collision-resistant IDs with time-ordered prefix for better index locality. Rolling your own risks collisions, poor performance, and security issues. |
| Connection pooling | Manual connection pool management | Neon's built-in PgBouncer | Neon automatically provides PgBouncer connection pooling. In serverless, @neondatabase/serverless manages connections per-request optimally. App-level pooling causes issues in serverless. |
| Migration execution | Custom SQL runner scripts | drizzle-kit migrate | Drizzle Kit tracks which migrations have run, handles errors, prevents re-execution. Custom scripts risk double-execution, partial application, and state drift. |
| Schema synchronization | Manual ALTER TABLE statements | drizzle-kit push or generate | Drizzle Kit introspects current schema, generates precise SQL changes, detects conflicts. Manual changes risk data loss and schema drift between environments. |
| Database health checks | Custom retry/timeout logic | Standard health check pattern | Use proven patterns: SELECT 1 query with timeout, proper error handling, edge-compatible response. Don't reinvent connection testing. |
| JSONB validation | Database CHECK constraints | Zod schemas in app layer | CHECK constraints on JSONB are inflexible and hard to update. Zod provides type-safe validation, better error messages, and easy updates without migrations. |

**Key insight:** Serverless database management has subtle pitfalls (connection lifecycle, cold starts, pooling). Use Neon's built-in features and Drizzle's official tooling rather than custom solutions.

---

## Common Pitfalls

### Pitfall 1: Neon Cold Start Death Spiral

**What goes wrong:** First query after 5+ minutes of inactivity takes 3-8 seconds while Neon compute wakes up. Users see loading spinner and refresh, triggering another cold start. High bounce rates ensue.

**Why it happens:** Neon auto-suspends compute after 5 minutes of inactivity (default on free tier). Traditional pg driver makes cold starts worse with 8+ TCP roundtrips. Each connection attempt hits suspended compute simultaneously.

**How to avoid:**
1. **Use @neondatabase/serverless with HTTP mode** - 3-4 roundtrips vs 8+, much faster wake-up
2. **Configure connection timeout** - Add `?connect_timeout=10` to DATABASE_URL (Neon needs ~5s to wake)
3. **Use Neon "always on" option** - Available on paid plans, prevents compute suspension
4. **Implement connection retry logic** - On first failure, wait 2s and retry once before showing error
5. **Add health-check warming** - Use Vercel cron to ping database every 3-4 minutes during business hours
6. **Show better UX** - "Waking up your workspace..." instead of generic loading spinner
7. **Cache aggressively** - Use React Server Components with Next.js caching to minimize queries

**Warning signs:**
- Database connection time >2s on first query
- High p95 latency for sessions with >5min gap
- Connection timeout errors clustered after idle periods

**Phase impact:** Must address in this phase (Phase 1) - driver selection determines cold start performance.

**Source:** [Pitfall 3 from PITFALLS.md](../../../research/PITFALLS.md), [Neon Postgres Deep Dive](https://dev.to/dataformathub/neon-postgres-deep-dive-why-the-2025-updates-change-serverless-sql-5o0)

---

### Pitfall 2: Migration Conflicts with drizzle-kit push

**What goes wrong:** Developer uses drizzle-kit push for rapid iteration, then switches to drizzle-kit generate for production. Migration files conflict with pushed changes, causing duplicate column errors or data loss.

**Why it happens:** `drizzle-kit push` applies schema changes directly without generating SQL files. `drizzle-kit generate` creates migration files by comparing schema to database. If database was already pushed, generate creates migrations for changes that already exist.

**How to avoid:**
1. **Separate workflows clearly:**
   - Local dev: `drizzle-kit push` only (no migration files)
   - Production: `drizzle-kit generate` + `drizzle-kit migrate` only
2. **Never mix push and migrations in same environment**
3. **Use Neon branches to isolate:** Push to dev branch, generate migrations on fresh branch from main
4. **Reset dev branch before generating migrations:** `npx neonctl branches reset dev/michael --parent main` ensures clean state
5. **Add .gitignore for local drizzle meta:** If using push locally, ignore `drizzle/meta/` to prevent confusion

**Workflow:**
```bash
# Local development (fast iteration)
npm run db:push:dev  # drizzle-kit push to dev branch

# When ready for production
npx neonctl branches reset dev/michael --parent main  # Reset to clean state
npm run db:generate  # drizzle-kit generate creates migration
# Test migration on dev branch
npm run db:migrate
# Commit migration files
git add drizzle/
git commit -m "feat: add workshop_steps table"
```

**Warning signs:**
- "Column already exists" errors during migration
- Generated migrations with DROP/ADD for columns that shouldn't change
- Drizzle asking to drop data during generate

**Phase impact:** Address in this phase (Phase 1) - establish workflow early to prevent conflicts.

**Source:** [drizzle-kit push](https://orm.drizzle.team/docs/drizzle-kit-push), [Oreate AI Blog - Drizzle Push vs Migrate](https://www.oreateai.com/blog/drizzle-push-vs-migrate-navigating-database-management-with-drizzle-kit/c954c74d99e275ff4d3dceb64c18deed)

---

### Pitfall 3: Missing Indexes on Foreign Key Columns

**What goes wrong:** Queries like "get all workshops for user" or "get all steps for workshop" are slow (500ms+) even with small datasets. Problem compounds as data grows. No obvious errors, just slow performance.

**Why it happens:** PostgreSQL does NOT automatically create indexes on foreign key columns (unlike some databases). Without indexes, foreign key lookups require full table scans. Drizzle generates foreign keys but doesn't auto-generate indexes.

**How to avoid:**
1. **Index every foreign key column used in WHERE clauses:**
   ```typescript
   index('workshops_clerk_user_id_idx').on(table.clerkUserId),
   index('workshop_steps_workshop_id_idx').on(table.workshopId),
   index('workshop_members_workshop_id_idx').on(table.workshopId),
   ```
2. **Index commonly filtered columns:** status, created_at, org_id
3. **Test query performance early:** Use EXPLAIN ANALYZE to verify index usage
4. **Consider composite indexes for common query patterns:**
   ```typescript
   // Common query: workshops by user filtered by status
   index('workshops_user_status_idx').on(table.clerkUserId, table.status),
   ```

**Recommended indexes for this phase:**
```typescript
// workshops table
index('workshops_clerk_user_id_idx').on(table.clerkUserId),
index('workshops_status_idx').on(table.status),
index('workshops_org_id_idx').on(table.orgId),

// workshop_members table
index('workshop_members_workshop_id_idx').on(table.workshopId),
index('workshop_members_clerk_user_id_idx').on(table.clerkUserId),

// workshop_steps table
index('workshop_steps_workshop_id_idx').on(table.workshopId),
index('workshop_steps_step_id_idx').on(table.stepId),
index('workshop_steps_status_idx').on(table.status),

// sessions table
index('sessions_workshop_id_idx').on(table.workshopId),
```

**Warning signs:**
- Queries slow even with <1000 rows
- EXPLAIN shows "Seq Scan" on foreign key lookups
- Query time increases linearly with table size

**Phase impact:** Must address in this phase (Phase 1) - indexes should be defined with schema from day one.

**Source:** [Drizzle ORM PostgreSQL Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717), [API with NestJS #164. Improving the performance with indexes using Drizzle ORM](https://wanago.io/2024/09/02/api-nestjs-drizzle-orm-indexes-postgresql/)

---

### Pitfall 4: Timestamp Precision Inconsistency

**What goes wrong:** Application writes timestamp with millisecond precision. Database stores only seconds (precision 0 default). Comparisons fail, updatedAt doesn't match expected value, flaky tests.

**Why it happens:** PostgreSQL timestamp default precision is 0 (seconds). JavaScript Date has millisecond precision. Without explicit precision, data loss occurs.

**How to avoid:**
1. **Always specify precision: 3 (milliseconds):**
   ```typescript
   timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull()
   ```
2. **Use `mode: 'date'` for JavaScript Date compatibility** (not `mode: 'string'`)
3. **Consistent precision across all timestamp columns** (don't mix precision 0 and 3)

**Why precision 3:**
- JavaScript Date has millisecond precision
- Precision 6 (microseconds) is overkill for application timestamps
- Precision 3 matches typical application needs (sorting, deduplication)

**Warning signs:**
- Timestamp comparisons fail unexpectedly
- `updatedAt` doesn't reflect recent changes
- Tests flaky due to timestamp mismatches

**Phase impact:** Address in this phase (Phase 1) - precision defined in schema from day one.

**Source:** [Drizzle ORM - SQL Timestamp as a default value](https://orm.drizzle.team/docs/guides/timestamp-default-value), [Drizzle ORM PostgreSQL Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)

---

### Pitfall 5: Forgetting to Close WebSocket Connections in Serverless

**What goes wrong:** If using WebSocket mode (@neondatabase/serverless with WebSockets), connections leak and exhaust connection pool. Functions hang waiting for available connections.

**Why it happens:** In serverless (Vercel Functions), connections cannot persist across requests. WebSocket Pool or Client must be connected, used, and closed within a single request handler. Forgetting to close causes leaks.

**How to avoid:**
1. **Use HTTP mode (neon-http) instead** - No connection management required, best for serverless one-shot queries
2. **If WebSocket required, use try/finally:**
   ```typescript
   const client = new Client({ connectionString: process.env.DATABASE_URL });
   try {
     await client.connect();
     const result = await client.query('SELECT 1');
     return result;
   } finally {
     await client.end(); // CRITICAL: always close
   }
   ```
3. **Prefer HTTP mode unless you need transactions** - Interactive transactions require WebSocket, but most app queries don't

**Recommendation:** User decision locked on @neondatabase/serverless driver. Default to HTTP mode (neon-http) for all queries. Only use WebSocket mode if specific need for interactive transactions arises.

**Warning signs:**
- "Too many connections" errors
- Functions timing out waiting for connections
- Connection pool exhaustion after high traffic

**Phase impact:** Address in this phase (Phase 1) - driver mode choice determines connection behavior.

**Source:** [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver), [GitHub - neondatabase/serverless](https://github.com/neondatabase/serverless)

---

### Pitfall 6: Forgetting ON CONFLICT for Reference Data Migrations

**What goes wrong:** Step definitions migration runs on deploy. Migration inserts step definitions. Re-running migration (e.g., after dev branch reset) fails with "duplicate key" error.

**Why it happens:** INSERT without ON CONFLICT fails if rows already exist. Migrations should be idempotent (safe to re-run).

**How to avoid:**
1. **Always use ON CONFLICT DO NOTHING or DO UPDATE for reference data:**
   ```sql
   INSERT INTO step_definitions (id, order, name, description)
   VALUES ('empathize', 1, 'Empathize', 'Understand your users')
   ON CONFLICT (id) DO UPDATE SET
     order = EXCLUDED.order,
     name = EXCLUDED.name,
     description = EXCLUDED.description,
     updated_at = now();
   ```
2. **ON CONFLICT DO UPDATE allows updating reference data** without migration failure
3. **ON CONFLICT DO NOTHING for insert-only data** (e.g., default roles that shouldn't change)

**Why idempotency matters:**
- Dev branch resets re-run migrations
- Deployment rollbacks may re-run migrations
- Multiple Vercel preview deployments may share database branch

**Warning signs:**
- Migration fails with "duplicate key" on re-run
- Can't reset dev branch without manual cleanup

**Phase impact:** Address in this phase (Phase 1) - migration pattern established with first reference data migration.

**Source:** WebSearch results on migration best practices, [Drizzle ORM - Custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations)

---

## Code Examples

Verified patterns from official sources:

### Drizzle Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Source:** [Get Started with Drizzle and Neon](https://orm.drizzle.team/docs/get-started/neon-new)

---

### Complete Table Definition Example

```typescript
// src/db/schema/sessions.ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { workshops } from './workshops';
import { createId } from '@paralleldrive/cuid2';

export const sessions = pgTable('sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),

  workshopId: text('workshop_id')
    .notNull()
    .references(() => workshops.id, { onDelete: 'cascade' }),

  // Lean session data: timestamps only
  startedAt: timestamp('started_at', { mode: 'date', precision: 3 })
    .defaultNow()
    .notNull(),

  endedAt: timestamp('ended_at', { mode: 'date', precision: 3 }),

  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .defaultNow()
    .notNull(),
}, (table) => [
  index('sessions_workshop_id_idx').on(table.workshopId),
  index('sessions_started_at_idx').on(table.startedAt),
]);
```

---

### Querying with Drizzle (Relational Queries)

```typescript
// Get workshop with all steps and members
import { db } from '@/db/client';
import { workshops, workshopSteps, workshopMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

const workshopWithRelations = await db.query.workshops.findFirst({
  where: eq(workshops.id, workshopId),
  with: {
    steps: {
      orderBy: (steps, { asc }) => [asc(steps.createdAt)],
    },
    members: true,
  },
});

// Result is fully typed:
// workshopWithRelations.steps[0].output (typed as Record<string, unknown>)
// workshopWithRelations.members[0].role (typed as string)
```

**Note:** Relational queries require defining relations in schema. Add to schema files:

```typescript
// src/db/schema/workshops.ts
import { relations } from 'drizzle-orm';

export const workshopsRelations = relations(workshops, ({ many }) => ({
  steps: many(workshopSteps),
  members: many(workshopMembers),
  sessions: many(sessions),
}));
```

**Source:** [Drizzle ORM - Drizzle Relations v2](https://orm.drizzle.team/docs/relations-v2)

---

### Environment Configuration

```bash
# .env.local (local development)
# Neon dev branch connection string
DATABASE_URL="postgresql://user:pass@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=10"

# Clerk (for future phases)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Gemini API (for future phases)
GOOGLE_GENERATIVE_AI_API_KEY="..."
```

**Important:** Add `connect_timeout=10` to DATABASE_URL to allow time for Neon cold start (default timeout too short).

---

### Package Scripts

```json
// package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push:dev": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "vercel-build": "npm run db:migrate && npm run build",
    "build": "next build",
    "dev": "next dev"
  }
}
```

**Workflow:**
- `npm run db:push:dev` - Local development (fast iteration, no migration files)
- `npm run db:generate` - Generate SQL migration after schema change (commit to git)
- `npm run db:migrate` - Apply migrations (runs automatically on Vercel deploy via vercel-build)
- `npm run db:studio` - Open Drizzle Studio for database GUI (optional)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Serial/Sequence for PKs | Identity columns or app-generated IDs | PostgreSQL 10+ (2017), CUID2 (2022) | Identity columns are more standard SQL. Application-generated IDs (CUID2) provide better control, URL-friendliness, and time-ordering for performance. |
| TCP connections (pg driver) | HTTP/WebSocket (@neondatabase/serverless) | Neon serverless driver (2022) | HTTP mode reduces cold start from 3-5s to 500ms-1s in serverless. Critical for edge compatibility. |
| Prisma as default ORM | Drizzle gaining adoption | Drizzle ORM (2022+) | Drizzle compiles 16x faster (300 vs 5000+ type instantiations), SQL-like API gives more control. 2026: Drizzle is standard for serverless Postgres. |
| Migration files mandatory | Push-based prototyping | drizzle-kit push (2023+) | Push workflow explicitly endorsed by Drizzle for production. Reduces friction for solo developers and small teams. |
| UUID v4 (random) | CUID2 (time-ordered) | CUID2 stable (2023) | CUID2's time-based prefix improves index locality (10-20% faster inserts), shorter (24 vs 36 chars), URL-friendly. |
| Manual Neon connection pooling | Neon built-in PgBouncer | Neon platform feature | Neon automatically provides connection pooling. No need for app-level pooling in serverless. |

**Deprecated/outdated:**
- **`serial` type:** Use `identity` columns or application-generated IDs. Serial has quirks with permissions and replication.
- **`pg` driver for serverless:** Use @neondatabase/serverless for edge compatibility and better cold start performance.
- **Manual connection pool management:** Neon's built-in PgBouncer and serverless driver handle this. App-level pooling causes issues.

**Source:** [Drizzle ORM PostgreSQL Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717), [Brian Wigginton - Primary Keys](https://bwiggs.com/notebook/pk/), [Why I'm using NanoIDs for my database keys](https://brockherion.dev/blog/posts/why-im-using-nanoids-for-my-database-keys/)

---

## Open Questions

Things that couldn't be fully resolved:

### 1. Step Definitions Update Frequency

**What we know:**
- User decision: step_definitions table for 10 design thinking step definitions
- Step definitions should be updatable without deploys
- Recommended approach: reference data in migrations

**What's unclear:**
- How frequently will step definitions update in practice?
- Will prompt templates be managed by developers or product team?
- Should prompt templates be externalized to CMS/config for non-technical updates?

**Recommendation:**
- Start with step definitions in migrations (technical ownership)
- If prompt templates need frequent non-technical updates, move to separate prompt_templates table or external CMS in future phase
- Monitor: if step definitions change >1x per month, consider external management

---

### 2. JSONB Query Performance at Scale

**What we know:**
- workshop_steps.output stores step-specific data as JSONB
- User decision: generic JSONB column, no schema enforcement at DB level
- Application layer validates with Zod schemas

**What's unclear:**
- Will queries need to filter/search within JSONB output fields?
- Example: "Find all workshops where step 3 output contains persona 'small business owner'"
- If yes, GIN indexes on JSONB fields may be needed

**Recommendation:**
- Start without JSONB indexes (YAGN principle)
- Most queries will be "get all steps for workshop" (indexed by workshop_id)
- If search within step outputs needed, add GIN index:
  ```typescript
  index('workshop_steps_output_gin_idx').using('gin', table.output)
  ```
- Monitor: if searching within step outputs becomes a feature, add index then

---

### 3. Dev Branch Reset Automation

**What we know:**
- Neon branches can be reset to match parent: `npx neonctl branches reset dev/michael --parent main`
- Alternative: delete and recreate branch (requires .env update)
- User decision: Claude's discretion on reset strategy

**What's unclear:**
- Should branch reset be automated (npm script, pre-commit hook)?
- How often do developers need fresh production data?
- Is manual reset acceptable or is automation needed?

**Recommendation:**
- **Manual reset is acceptable for MVP 0.5** (single developer, infrequent resets)
- Add npm script for convenience:
  ```json
  "db:reset:dev": "neonctl branches reset dev/$(whoami) --parent main && npm run db:migrate"
  ```
- If team grows or reset frequency increases, consider automation:
  - Weekly cron job to reset dev branches
  - GitHub Action to reset preview branches after PR close
- Monitor: if developers complain about stale dev data, automate then

---

## Sources

### PRIMARY (HIGH confidence)

**Drizzle ORM Official Documentation:**
- [Get Started with Drizzle and Neon](https://orm.drizzle.team/docs/get-started/neon-new) - Driver setup, HTTP vs WebSocket
- [Drizzle with Neon Postgres Tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-neon) - Complete integration guide
- [drizzle-kit push](https://orm.drizzle.team/docs/drizzle-kit-push) - Push command documentation, production endorsement
- [Migrations](https://orm.drizzle.team/docs/migrations) - Migration workflow patterns
- [Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) - Index definition patterns, foreign key syntax
- [PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) - JSONB, timestamp, text types
- [SQL Timestamp as a default value](https://orm.drizzle.team/docs/guides/timestamp-default-value) - Timestamp precision, defaultNow(), $onUpdate()
- [Custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations) - Writing custom SQL migrations
- [Drizzle Relations v2](https://orm.drizzle.team/docs/relations-v2) - Relational query patterns

**Neon Official Documentation:**
- [Connect from Drizzle to Neon](https://neon.com/docs/guides/drizzle) - Recommended drivers, connection pooling
- [Database branching workflow primer](https://neon.com/docs/get-started/workflow-primer) - Branching strategy, dev/preview/prod workflows
- [Branching - Neon Docs](https://neon.com/docs/introduction/branching) - Branch characteristics, copy-on-write, billing
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver) - HTTP vs WebSocket, cold start performance, edge compatibility
- [Schema migration with Neon Postgres and Drizzle ORM](https://neon.com/docs/guides/drizzle-migrations) - Migration workflow with Neon

**GitHub Official Repositories:**
- [GitHub - neondatabase/serverless](https://github.com/neondatabase/serverless) - Serverless driver features, WebSocket limitations
- [GitHub - drizzle-team/drizzle-orm](https://github.com/drizzle-team/drizzle-orm) - ORM repository

### SECONDARY (MEDIUM-HIGH confidence)

**Best Practices Guides:**
- [Drizzle ORM PostgreSQL Best Practices Guide (2025)](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Identity columns, timestamp precision, connection pooling, index recommendations
- [Oreate AI Blog - Drizzle Push vs Migrate](https://www.oreateai.com/blog/drizzle-push-vs-migrate-navigating-database-management-with-drizzle-kit/c954c74d99e275ff4d3dceb64c18deed) - Workflow comparison, when to use each
- [API with NestJS #164. Improving the performance with indexes using Drizzle ORM](https://wanago.io/2024/09/02/api-nestjs-drizzle-orm-indexes-postgresql/) - Index patterns, performance optimization

**ID Generation Research:**
- [Comparing UUID, CUID, and Nanoid: A Developer's Guide](https://dev.to/turck/comparing-uuid-cuid-and-nanoid-a-developers-guide-50c) - Collision resistance, performance comparison
- [UUID vs CUID vs NanoID: Choosing the Right ID Generator](https://www.wisp.blog/blog/uuid-vs-cuid-vs-nanoid-choosing-the-right-id-generator-for-your-application) - Use case analysis
- [Why I'm using NanoIDs for my database keys](https://brockherion.dev/blog/posts/why-im-using-nanoids-for-my-database-keys/) - Practical experience, index locality
- [Brian Wigginton - Primary Keys](https://bwiggs.com/notebook/pk/) - Serial vs identity vs application-generated IDs

**Enum vs String Column:**
- [Database ENUMs vs Constrained VARCHAR: A Technical Deep Dive](https://medium.com/@zulfikarditya/database-enums-vs-constrained-varchar-a-technical-deep-dive-for-modern-applications-30d9d6bba9f8) - Performance comparison, flexibility tradeoffs
- [Native enums or CHECK constraints in PostgreSQL?](https://making.close.com/posts/native-enums-or-check-constraints-in-postgresql/) - Production experience
- [What is better: a lookup table or an enum type?](https://www.cybertec-postgresql.com/en/lookup-table-or-enum-type/) - Use case guidance

**Neon Platform:**
- [Neon Postgres Deep Dive: Why the 2025 Updates Change Serverless SQL](https://dev.to/dataformathub/neon-postgres-deep-dive-why-the-2025-updates-change-serverless-sql-5o0) - Cold start performance, serverless driver benefits
- [Node.js + Neon Serverless Postgres: Millisecond Connections](https://medium.com/@kaushalsinh73/node-js-neon-serverless-postgres-millisecond-connections-at-scale-ecc2e5e9848a) - Connection performance analysis
- [Sub-10ms Postgres queries for Vercel Edge Functions](https://neon.com/blog/sub-10ms-postgres-queries-for-vercel-edge-functions) - Edge runtime performance
- [A database for every preview environment using Neon, GitHub Actions, and Vercel](https://neon.com/blog/branching-with-preview-environments) - Preview deployment workflow

**Vercel Deployment:**
- [Vercel migrations](https://hrekov.com/blog/vercel-migrations) - Auto-migrate on deploy patterns
- [How to manage database migrations in a Next.js app?](https://github.com/vercel/next.js/discussions/59164) - Community discussion on migration strategies
- [Executing database migrations on Vercel - Drizzle Team](https://www.answeroverflow.com/m/1215123328134549616) - Official Drizzle guidance

**Health Check Patterns:**
- [Docker Compose Health Checks: An Easy-to-follow Guide](https://oneuptime.com/blog/post/2026-01-30-docker-compose-health-checks/view) - pg_isready patterns
- [How to Implement Health Checks in Go for Kubernetes](https://oneuptime.com/blog/post/2026-01-07-go-health-checks-kubernetes/view) - Timeout patterns, circuit breakers

**Seed Data:**
- [Drizzle ORM - Overview](https://orm.drizzle.team/docs/seed-overview) - Seeding strategies
- [How to Seed Data in Drizzle (The Right Way)](https://dev.to/teaganga/how-to-seed-data-in-drizzle-the-right-way-2m6d) - Migration vs seed script guidance

### TERTIARY (MEDIUM confidence)

**Schema Design:**
- [Database Schema Design for Postgres](https://www.xano.com/blog/database-schema-design-best-practices/) - Foreign key patterns, referential integrity
- [Working with Drizzle ORM and PostgreSQL in Next.js](https://refine.dev/blog/drizzle-react/) - Complete tutorial

**Neon Platform:**
- [Neon Serverless Postgres Pricing 2026: Complete Breakdown](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/) - Cost implications of branching

**PostgreSQL Extensions:**
- [GitHub - spa5k/uids-postgres](https://github.com/spa5k/uids-postgres) - CUID2/Nanoid PostgreSQL extensions
- [GitHub - VADOSWARE/pg_idkit](https://github.com/VADOSWARE/pg_idkit) - CUID2 generation in Postgres

---

## Confidence Assessment

| Technology Area | Confidence Level | Rationale |
|----------------|------------------|-----------|
| Drizzle + Neon integration | HIGH | Official docs from both Drizzle and Neon, active 2026 support, proven template exists |
| HTTP vs WebSocket driver choice | HIGH | Official Neon docs explicitly recommend HTTP for serverless one-shot queries |
| drizzle-kit push for production | HIGH | Drizzle docs explicitly endorse for production, community validation |
| Application-layer ID generation | HIGH | Multiple sources agree on CUID2 benefits, benchmarks show 10-20% performance gain |
| Neon branching workflow | HIGH | Official Neon docs, GitHub examples, Vercel integration documented |
| Migration auto-run on Vercel | MEDIUM-HIGH | Community consensus, no official Vercel guide but proven pattern |
| Timestamp precision patterns | HIGH | Official Drizzle docs, best practices guide confirms precision: 3 |
| JSONB schema patterns | HIGH | Official Drizzle docs on JSONB, type safety with .$type<T>() |
| Index placement recommendations | MEDIUM-HIGH | Best practices guide + PostgreSQL documentation, community validation |
| Reference data in migrations | MEDIUM-HIGH | Community consensus, Drizzle custom migration support confirmed |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation and proven integration
- Architecture patterns: HIGH - Official Drizzle/Neon docs with code examples
- Pitfalls: HIGH - Verified with official docs (cold starts, indexes) and PITFALLS.md research
- Open questions: MEDIUM - Areas requiring runtime validation

**Research date:** 2026-02-07
**Valid until:** 60 days (stable technology stack, Drizzle/Neon updates quarterly)

**Research completed by:** gsd-phase-researcher
**Ready for:** gsd-planner to create PLAN.md files

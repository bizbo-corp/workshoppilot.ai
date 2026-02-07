# Phase 6: Production Deployment - Research

**Researched:** 2026-02-08
**Domain:** Vercel deployment for Next.js 16 with external services (Clerk, Neon, Gemini)
**Confidence:** HIGH

## Summary

Phase 6 deploys a Next.js 16 application to Vercel with three external services: Clerk authentication, Neon Postgres database, and Google Gemini API. The project is already linked to Vercel (project ID exists), has a custom build command for database migrations (`vercel-build` script), and requires production environment variables plus custom domain configuration.

Vercel provides zero-configuration Next.js deployment with automatic optimizations: CDN for static assets, serverless functions for API routes and SSR, automatic SSL certificates via Let's Encrypt, and global edge network. The main risks are: (1) forgetting to switch from test API keys to production keys, (2) database migration failures during build, (3) Gemini API rate limits in production, and (4) serverless function timeouts on long-running AI requests.

**Primary recommendation:** Use Vercel's UI to configure production environment variables (switching all test keys to production keys), verify the custom build command runs migrations successfully, add the custom domain through Vercel dashboard (automatic SSL), and implement error monitoring with Vercel's built-in logging or Sentry integration.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel Platform | N/A | Deployment & hosting | Official Next.js platform, zero-config deployment, global CDN |
| Next.js | 16.1.1 | Web framework | Already in use; Vercel's native framework |
| Vercel CLI | Latest | Deploy & env management | Official tool for local testing and env sync |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vercel/analytics | Latest | Web analytics | Track page views and visitor data |
| @vercel/speed-insights | Latest | Performance monitoring | Monitor Core Web Vitals |
| Sentry | Latest | Error tracking | Production error monitoring (optional but recommended) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel | Netlify, AWS Amplify | Vercel is zero-config for Next.js; others require more setup |
| Vercel Logging | Datadog, ELK Stack | Built-in logging is free and simple; external tools offer more features |
| Built-in monitoring | Custom logging solution | Built-in is easier; custom gives full control |

**Installation (if adding monitoring):**
```bash
npm install @vercel/analytics @vercel/speed-insights
```

## Architecture Patterns

### Deployment Workflow
```
1. Push to main branch (GitHub)
   ↓
2. Vercel detects commit via webhook
   ↓
3. Build runs: npm run vercel-build
   - Runs database migrations
   - Builds Next.js production bundle
   ↓
4. Deploy to global edge network
   - Static assets → CDN
   - API routes → Serverless Functions
   - Pages → SSR or Static
   ↓
5. Domain automatically updates with zero downtime
```

### Environment Variable Structure
```
Production:
├── NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_live_...)
├── CLERK_SECRET_KEY (sk_live_...)
├── CLERK_WEBHOOK_SECRET (whsec_...)
├── DATABASE_URL (Neon production connection string)
├── DATABASE_URL_UNPOOLED (for migrations)
├── GOOGLE_GENERATIVE_AI_API_KEY (production key)
└── ADMIN_EMAIL (unchanged)

Preview (optional):
└── Same as production OR test/staging keys

Development:
└── Local .env.local values (already configured)
```

### Pattern 1: Zero-Downtime Database Migrations
**What:** Run migrations before build, not after deployment
**When to use:** Every deployment that includes schema changes
**Example:**
```json
// package.json
"scripts": {
  "vercel-build": "npm run db:migrate && npm run build"
}
```
**Why:** Vercel executes `vercel-build` (if present) instead of `build`. Migrations run before the new code is deployed, ensuring database schema is ready. Uses `DATABASE_URL_UNPOOLED` for migrations to avoid connection pooling issues.

### Pattern 2: Production Key Separation
**What:** Different API keys for production vs. development/preview environments
**When to use:** Always - required by Clerk, recommended for all services
**How:**
- Vercel UI: Environment Variables section
- Select which environments get which values
- Production gets `pk_live_*` and `sk_live_*` keys
- Development gets `pk_test_*` and `sk_test_*` keys

### Pattern 3: Custom Domain with Automatic SSL
**What:** Add custom domain through Vercel UI, SSL certificate auto-provisioned
**When to use:** Production deployment (custom domain required for Clerk production)
**Steps:**
1. Project Settings → Domains → Add Domain
2. Enter `workshoppilot.ai` (add `www` when prompted)
3. Configure DNS records at registrar:
   - Apex domain: A record → `76.76.21.21` (Vercel's IP)
   - OR use Vercel nameservers for full management
4. Vercel auto-issues Let's Encrypt SSL certificate
5. Certificate auto-renews every 90 days

**DNS propagation:** 15-30 minutes typically, up to 48 hours maximum.

### Anti-Patterns to Avoid

- **Hardcoding secrets in code:** Never commit API keys to git. Always use environment variables.
- **Using test keys in production:** Clerk will fail if `pk_test_*` is used with custom domain.
- **Skipping migration testing:** Always test migrations locally with `npm run db:push:dev` before pushing.
- **Manual SSL certificate management:** Vercel handles this automatically; don't try to upload custom certs unless enterprise requirement.
- **Ignoring build logs:** If build fails, check Vercel dashboard build logs immediately - migration errors are hidden there.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSL certificate management | Custom cert renewal script | Vercel automatic SSL | Let's Encrypt integration built-in, auto-renewal, zero config |
| Environment variable sync | Manual copying between local and Vercel | `vercel env pull` CLI command | Official tool, syncs all envs, prevents typos |
| Deployment pipeline | Custom CI/CD with GitHub Actions | Vercel Git integration | Zero config, automatic previews, built-in rollbacks |
| Error logging | Custom logging service | Vercel Runtime Logs + Sentry (optional) | Built-in for free tier, integrates with dashboard |
| Database connection pooling | Custom pool management | Neon's built-in pooling | DATABASE_URL already uses pooler, optimized for serverless |
| CDN configuration | Cloudflare or custom CDN | Vercel's built-in CDN | Integrated with Next.js ISR, automatic cache invalidation |

**Key insight:** Vercel is the "blessed stack" for Next.js production deployments. Their platform handles infrastructure concerns (SSL, CDN, serverless scaling) that would require significant engineering effort on other platforms. The value is zero-configuration reliability.

## Common Pitfalls

### Pitfall 1: Forgetting to Switch API Keys to Production
**What goes wrong:** Deployment succeeds but features fail. Clerk shows "Invalid publishable key" error. AI requests fail with authentication errors.
**Why it happens:** Test keys (`pk_test_*`, `sk_test_*`) work in development, so developers forget production requires different keys (`pk_live_*`, `sk_live_*`).
**How to avoid:**
- Create checklist: "Switch Clerk keys, Neon connection string, Gemini API key"
- In Vercel UI, explicitly set Production environment to production keys
- Test with `vercel env pull --environment=production` before deploying
**Warning signs:**
- Authentication redirects fail with "Invalid key" message
- Clerk dashboard shows zero production users after deployment
- API requests return 401 Unauthorized

### Pitfall 2: Database Migration Failures During Build
**What goes wrong:** Vercel build fails with "Migration error" or "Database connection timeout". Deployment never completes.
**Why it happens:**
- Wrong database URL used (pooled instead of unpooled)
- Migration file has syntax error
- Database credentials expired or changed
- Neon database sleeping (cold start delay)
**How to avoid:**
- Test migrations locally: `npm run db:push:dev` before committing
- Use `DATABASE_URL_UNPOOLED` in drizzle.config.ts for migrations
- Check Vercel build logs immediately if build fails
- Verify Neon database is active (not paused/deleted)
**Warning signs:**
- Build succeeds locally but fails on Vercel
- Error message contains "ECONNREFUSED" or "timeout"
- Drizzle-kit hangs during build step

### Pitfall 3: Serverless Function Timeouts on AI Streaming
**What goes wrong:** AI chat requests timeout after 10 seconds (Hobby tier) or 60 seconds (Pro tier). User sees "Function execution timeout" error.
**Why it happens:** Gemini API can be slow (3-10 seconds for long responses). Hobby tier has 10-second limit. Function includes streaming response but Vercel timeout kills it.
**How to avoid:**
- Upgrade to Vercel Pro for 60-second timeout ($20/month)
- Or configure `maxDuration` in route config: `export const maxDuration = 60;`
- Monitor function execution time in Vercel dashboard
- Consider Vercel Fluid Compute for longer timeouts (up to 800s on Pro)
**Warning signs:**
- Chat works locally but times out in production
- Error: "The serverless function exceeded the maximum duration"
- Inconsistent behavior (short responses work, long responses fail)

### Pitfall 4: Gemini API Rate Limits in Production
**What goes wrong:** Users see "Resource exhausted" errors during peak usage. API returns 429 status.
**Why it happens:** Free tier has very low limits (5-15 RPM, 20-50 RPD as of Dec 2025). Multiple users simultaneously trigger rate limits. Errors not handled gracefully.
**How to avoid:**
- Budget for Tier 1 ($7+ for 150-300 RPM) before production launch
- Implement exponential backoff in API route
- Add rate limit error handling: show user-friendly message
- Monitor Gemini API usage in Google AI Studio dashboard
- Consider caching common AI responses
**Warning signs:**
- "429 Resource Exhausted" in logs
- AI chat works then suddenly stops for all users
- Error message: "You exceeded your current quota"

### Pitfall 5: Missing Custom Domain for Clerk Production
**What goes wrong:** Clerk authentication fails in production with "Invalid domain" error.
**Why it happens:** Clerk production keys require custom domain (not `*.vercel.app`). Deployment succeeds but auth is broken.
**How to avoid:**
- Add custom domain BEFORE switching to production Clerk keys
- In Clerk dashboard: add production domain to allowed list
- Test with production keys on staging domain first
**Warning signs:**
- Authentication redirects to error page
- Clerk dashboard shows "Domain not authorized"
- Users cannot sign in on production URL

### Pitfall 6: Environment Variables Not Scoped Correctly
**What goes wrong:** Production uses development database. Preview deployments use production API keys. Data corruption or unexpected costs.
**Why it happens:** Vercel allows setting env vars for "All environments" - tempting but dangerous.
**How to avoid:**
- Always scope variables by environment (Production, Preview, Development)
- Production gets production keys ONLY
- Preview can use test keys OR separate staging database
- Never use "All environments" for sensitive credentials
**Warning signs:**
- Test data appears in production database
- Production API usage spikes from preview deployments
- Unexpected charges from Clerk/Neon/Gemini

### Pitfall 7: Ignoring Build Log Warnings
**What goes wrong:** App deploys but has subtle bugs. Console errors in production. Performance issues.
**Why it happens:** Warnings during build (unused deps, type errors, missing props) are easy to ignore. They don't stop deployment but cause runtime issues.
**How to avoid:**
- Review build logs before considering deployment "done"
- Fix all TypeScript errors (strict mode)
- Remove unused dependencies before deploying
- Run `npm run build` locally to catch issues early
**Warning signs:**
- Build output shows yellow warnings
- Browser console shows errors after deployment
- Lighthouse score drops in production vs. local

## Code Examples

Verified patterns from official sources.

### Database Migration with Build Command
```json
// package.json
// Source: https://vercel.com/kb/guide/nextjs-prisma-postgres
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "vercel-build": "npm run db:migrate && npm run build"
  }
}
```
**How it works:** Vercel detects `vercel-build` script and runs it instead of `build`. Migrations run first, then Next.js build. If migration fails, build stops (safe).

### Drizzle Config for Production Migrations
```typescript
// drizzle.config.ts
// Source: Neon + Drizzle official docs
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use unpooled connection for migrations
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!,
  },
});
```
**Why unpooled:** Migrations need direct database connection, not pooled. Neon provides both `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).

### Configuring Serverless Function Timeout
```typescript
// src/app/api/chat/route.ts
// Source: https://vercel.com/docs/functions/configuring-functions/duration
export const maxDuration = 60; // seconds (requires Pro tier for >10)

export async function POST(req: Request) {
  // AI streaming logic here
}
```
**When to use:** If AI responses take >10 seconds (free tier limit). Pro tier allows up to 300 seconds.

### Adding Analytics and Speed Insights
```typescript
// src/app/layout.tsx
// Source: https://vercel.com/docs/analytics
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```
**What it provides:** Visitor tracking, page view analytics, Core Web Vitals monitoring. Free on all Vercel plans.

### Environment Variable Verification Script
```typescript
// scripts/verify-env.ts
// Source: Production best practices
const requiredEnvVars = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'GOOGLE_GENERATIVE_AI_API_KEY',
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }

  // Verify production keys in production
  if (process.env.VERCEL_ENV === 'production') {
    if (envVar === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' &&
        process.env[envVar]?.startsWith('pk_test_')) {
      throw new Error('Production environment using test Clerk key!');
    }
    if (envVar === 'CLERK_SECRET_KEY' &&
        process.env[envVar]?.startsWith('sk_test_')) {
      throw new Error('Production environment using test Clerk secret!');
    }
  }
});

console.log('✓ All environment variables verified');
```
**Usage:** Add to `vercel-build` script to fail fast if wrong keys detected.

### Error Boundary for Production
```typescript
// src/app/error.tsx
// Source: https://nextjs.org/docs/app/guides/production-checklist
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error('Production error:', error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```
**Why needed:** Production errors should show user-friendly message, not raw error stack.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SSL cert upload | Automatic Let's Encrypt | ~2020 | Zero config SSL, auto-renewal |
| Custom build commands only | `vercel-build` script detection | 2021 | Cleaner package.json, explicit production builds |
| Single environment variables | Environment-scoped variables | 2019 | Production/Preview/Development separation |
| Vercel CLI required for deploy | GitHub integration | 2018 | Push-to-deploy workflow, automatic previews |
| Manual image optimization | Automatic via `next/image` | Next.js 10 (2020) | Zero config, on-demand optimization |
| 10s function timeout (all tiers) | Configurable up to 900s | 2023 | Supports long-running AI/ML operations |

**Deprecated/outdated:**
- **Vercel Now CLI**: Replaced by `vercel` CLI in 2020
- **Manual function region selection**: Now automatic edge network routing
- **`VERCEL_GITHUB_DEPLOYMENT=1` check**: Use `VERCEL_ENV` instead
- **`now.json` config file**: Renamed to `vercel.json` (but often not needed)

## Domain Configuration

### DNS Records for Custom Domain

**Option 1: A Record (Apex Domain)**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**Option 2: Vercel Nameservers (Recommended)**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```
Source: https://vercel.com/docs/domains/working-with-domains/add-a-domain

**Why nameservers:** Simpler management, Vercel handles all DNS, automatic subdomains.

### SSL Certificate Process
1. Add domain in Vercel UI
2. Configure DNS records at registrar
3. Vercel detects DNS propagation (usually 15-30 min)
4. Vercel requests Let's Encrypt certificate automatically
5. Certificate issued and installed (2-10 minutes)
6. HTTPS active, auto-renewal every 60 days

**No action required** from developer after DNS configuration.

## Production Checklist

Based on official Next.js production checklist and Vercel best practices:

### Pre-Deployment
- [ ] Run `npm run build` locally - verify no errors
- [ ] Run `npm run start` - test production build locally
- [ ] Test database migrations: `npm run db:push:dev`
- [ ] Verify all environment variables are documented
- [ ] Review Vercel build logs from previous deployment

### Environment Variables
- [ ] Add all required variables in Vercel project settings
- [ ] Scope Production environment separately from Preview/Dev
- [ ] Switch Clerk keys from `pk_test_*` to `pk_live_*`
- [ ] Switch Clerk secret from `sk_test_*` to `sk_live_*`
- [ ] Use production Neon database URL (or same as dev for MVP)
- [ ] Use production Gemini API key (or same as dev for MVP)
- [ ] Verify CLERK_WEBHOOK_SECRET is production value
- [ ] Verify ADMIN_EMAIL is correct

### Domain & SSL
- [ ] Add custom domain in Vercel dashboard
- [ ] Configure DNS records at domain registrar
- [ ] Wait for DNS propagation (check with `dig workshoppilot.ai`)
- [ ] Verify SSL certificate issued (green padlock in browser)
- [ ] Test HTTPS access: https://workshoppilot.ai
- [ ] Add domain to Clerk production allowed domains list

### Post-Deployment
- [ ] Visit production URL and test authentication flow
- [ ] Create test account and verify database write
- [ ] Test AI chat at each step - verify streaming works
- [ ] Check browser console for errors (should be none)
- [ ] Verify navigation between steps works
- [ ] Test on mobile device (responsive check)
- [ ] Monitor Vercel dashboard for function errors
- [ ] Check Vercel Runtime Logs for warnings

### Monitoring Setup (Optional but Recommended)
- [ ] Add @vercel/analytics to track page views
- [ ] Add @vercel/speed-insights for Core Web Vitals
- [ ] Set up Sentry for error tracking (if budget allows)
- [ ] Configure Vercel Slack/Discord notifications for build failures

## Open Questions

1. **Should we add Sentry for error monitoring?**
   - What we know: Vercel has basic runtime logs, but Sentry provides detailed error tracking with source maps, user context, and alerting
   - What's unclear: Whether MVP 0.5 justifies the cost ($26/month for Sentry Team plan)
   - Recommendation: Start with Vercel's built-in logging. Add Sentry after production launch if error volume is high

2. **Should Preview deployments use production or test API keys?**
   - What we know: Vercel creates preview deployment for every PR. Can use separate env vars.
   - What's unclear: Whether preview deployments should hit production services (costs money) or test services (may not reflect real behavior)
   - Recommendation: Use test keys for Preview environment. Only Production environment uses production keys. This prevents accidental costs from preview deployments.

3. **Do we need to upgrade Vercel plan for AI chat streaming?**
   - What we know: Hobby tier has 10-second function timeout. Pro tier has 60-second default (up to 300s).
   - What's unclear: Whether typical Gemini 2.0 Flash responses complete within 10 seconds
   - Recommendation: Deploy on Hobby tier first, monitor function execution times. Upgrade to Pro ($20/month) only if timeouts occur frequently. Add `maxDuration: 60` to API routes as safety measure.

4. **Should we use Neon's Vercel integration or manual connection?**
   - What we know: Project already has Neon database manually connected. Integration would auto-inject env vars.
   - What's unclear: Whether integration provides benefits over existing manual setup
   - Recommendation: Keep manual connection (already working). Integration is useful for new projects but doesn't add value here. Would require reconfiguration for minimal benefit.

5. **Should we enable Vercel Analytics and Speed Insights from day one?**
   - What we know: Both are free on all plans, require just adding components to layout.tsx
   - What's unclear: Whether MVP 0.5 needs analytics before MVP 1.0 (working AI facilitation)
   - Recommendation: Add analytics components now (5 minutes of work). Even if no real users yet, provides baseline performance data and verifies tracking works before launch.

## Sources

### Primary (HIGH confidence)
- Vercel Next.js Documentation: https://vercel.com/docs/frameworks/full-stack/nextjs
- Next.js Production Checklist: https://nextjs.org/docs/app/guides/production-checklist
- Neon Vercel Integration Guide: https://neon.com/docs/guides/vercel-manual
- Vercel Custom Domain Configuration: https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Vercel Functions Limits: https://vercel.com/docs/functions/limitations
- Vercel Functions Duration Config: https://vercel.com/docs/functions/configuring-functions/duration

### Secondary (MEDIUM confidence)
- Clerk Vercel Deployment Guide: https://clerk.com/docs/guides/development/deployment/vercel (verified with official Clerk docs)
- Gemini API Rate Limits: https://ai.google.dev/gemini-api/docs/rate-limits (official Google AI docs)
- Vercel Database Migration Discussion: https://github.com/vercel/next.js/discussions/59164 (verified with Prisma official guide)
- Next.js 16 Performance Mistakes: https://medium.com/@sureshdotariya/10-performance-mistakes-in-next-js-16-that-are-killing-your-app-2facfab26bea (verified with official Next.js docs)

### Tertiary (LOW confidence)
- Community discussions about logging strategies (multiple sources, no single authority)
- WebSearch results about Gemini API free tier rate limit reductions in Dec 2025 (verified by multiple sources but no official Google announcement found)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vercel is official Next.js platform, documentation is authoritative
- Architecture: HIGH - Patterns verified with official docs and working codebase examples
- Pitfalls: MEDIUM-HIGH - Common issues verified across multiple sources; specific error messages confirmed in GitHub issues
- Environment setup: HIGH - Verified with Clerk, Neon, and Vercel official documentation
- Rate limits: MEDIUM - Gemini API documentation is official but changes frequently without announcements

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days) - Vercel/Next.js infrastructure is stable, but Gemini API rate limits may change

**Specific notes:**
- Project already linked to Vercel (`.vercel/project.json` exists)
- Custom build command already configured (`vercel-build` in package.json)
- Environment variables already set for development (`.env.local`)
- Custom domain required for Clerk production keys (documented limitation)
- Gemini API free tier rates reduced significantly in Dec 2025 - production deployment may require paid tier

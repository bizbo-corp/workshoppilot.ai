# Pitfalls Research: v1.0 AI Facilitation Features

**Domain:** Multi-step AI facilitation with context memory (adding features to existing system)
**Researched:** 2026-02-08
**Confidence:** MEDIUM-HIGH

**Context:** This research focuses on common mistakes when ADDING step-aware AI facilitation, dual-layer context architecture, back-and-revise navigation, and auto-save to the EXISTING WorkshopPilot.ai v0.5 system (Next.js 16.1.1 App Router, Neon Postgres, Drizzle ORM, Vercel AI SDK 5, Gemini 2.0 Flash, Clerk auth).

## Critical Pitfalls

### Pitfall 1: Context Degradation Syndrome in 10-Step Workshops

**What goes wrong:**
AI quality degrades significantly after step 4-5 as conversation history grows. Users reach step 7-8 and the AI asks questions already answered in step 2, suggests ideas that contradict earlier decisions, or loses track of the project's core problem statement. Attention drops from 100% on early messages to 50% at message 40. The AI becomes progressively less useful as the user progresses through the 10-step workshop, precisely when they need the most contextual support.

**Why it happens:**
LLMs do not use their context uniformly - performance becomes increasingly unreliable as input length grows, even when well within the model's advertised limits. This phenomenon ("context rot") means effective capacity is usually 60-70% of the advertised maximum. A model claiming 200k tokens typically becomes unreliable around 130k. Models work best when relevant information sits at the very beginning or end of the context window, but struggle when buried in the middle. In a 10-step workshop with 5-7 conversational turns per step, you accumulate 50-70 messages - even with Gemini's 1M token context window, retrieval accuracy degrades 13.9%-85% as context grows. Research shows one token difference in an early turn can lead to cascading deviations, observed as "stagnated unreliability."

**How to avoid:**
Implement hierarchical context compression with three tiers: (1) short-term memory keeps current step messages verbatim, (2) long-term memory stores previous step summaries + structured JSON outputs, (3) persistent memory maintains all structured outputs in database. Trigger summarization when step completes, not when token limit approaches. Use step-specific prompts that reference structured outputs ("The user's HMW statement from Step 7 is: {hmw_statement}") rather than relying on full conversation history. Add memory refresh checkpoints at steps 4 and 7 where the AI explicitly recaps key decisions before proceeding. Use Gemini context caching for stable system prompts and step definitions (90% cost savings on repeated prompts).

**Warning signs:**
- AI asks questions already answered in earlier steps
- Suggestions contradict previous decisions documented in structured outputs
- Step completion taking longer (token processing overhead increases with context size)
- Generated summaries become generic rather than specific to this workshop
- JSON extraction produces incomplete objects missing fields discussed earlier

**Phase to address:**
Phase 4 (Navigation & Back-Revise) - Must be architectural from day one. Context compression strategy affects database schema (context_files table), API design (which context gets passed to Gemini), and step navigation (summary generation on step completion).

---

### Pitfall 2: Gemini Rate Limit Cascade Failures

**What goes wrong:**
User is deep in step 8, making steady progress, then suddenly hits 429 "quota exceeded" errors. Chat stops working. Progress may be lost if auto-save hasn't caught the latest messages. User refreshes, tries again, gets another 429. Trust craters - the product feels unreliable precisely when the user is most invested (after 45+ minutes in the workshop). Free tier (15 RPM) is exhausted in minutes with concurrent users or a single user having rapid back-and-forth exchanges.

**Why it happens:**
Gemini API enforces rate limits across four independent dimensions: RPM (requests per minute), TPM (tokens per minute), RPD (requests per day), and IPM (images per minute). Exceeding ANY single dimension triggers 429 errors. Multi-dimensional tracking makes limits unpredictable - a user having a detailed conversation might hit TPM before RPM. Free tier was slashed 50-92% in December 2025 without prior notice. Rate limits are per-project, so all users share the same quota pool. Token bucket algorithm means burst usage creates rate limit "debt" that affects subsequent requests. Without backoff logic, your app will hammer the API with retries, making the problem worse.

**How to avoid:**
Implement exponential backoff with jitter (wait 1s, 2s, 4s, 8s) on 429 responses with clear UI feedback ("AI is busy, retrying in 3s..."). Use multiple Gemini projects with key rotation to distribute load across separate quota pools. Implement request queuing with position indicator ("You're #2 in queue, ~30s wait"). Monitor rate limit margins via response headers and throttle proactively before hitting limits. Consider Tier 1 paid plan ($50 cumulative spend = 66x capacity increase: 15 RPM → 1000 RPM). Use Gemini context caching to reduce TPM consumption by 90% on repeated system prompts. Pre-calculate token budgets per step to stay within TPM limits.

**Warning signs:**
- 429 errors in production logs
- Users reporting "chat stopped working" after extended sessions
- Error spike correlation with traffic increases
- Rate limit errors concentrated during specific hours (peak usage)
- Multiple users hitting limits simultaneously (shared quota pool exhaustion)

**Phase to address:**
Phase 4 (Navigation & Back-Revise) for initial backoff/retry logic. Phase 6 (Production Hardening) for key rotation, queuing system, and monitoring. Do NOT defer to "fix in production" - rate limit cascade failures destroy trust and are hard to recover from.

---

### Pitfall 3: Neon Cold Start Death Spiral

**What goes wrong:**
Users start a session after 5+ minutes of database inactivity. First page load takes 3-8 seconds while Neon compute wakes from scale-to-zero. User sees loading spinner, assumes the site is broken, refreshes the page. Refresh creates another cold start. Multiple tabs or users arriving simultaneously compound the problem. Users abandon before the app even loads, leaving high bounce rates in analytics with no way to diagnose the issue (they left before any tracking events fired).

**Why it happens:**
Neon Postgres uses serverless architecture with automatic scale-to-zero after 5 minutes of inactivity (free tier) or 300 seconds (paid tier, configurable). Cold start involves: (1) wake compute endpoint, (2) load data into memory, (3) establish connection. Each step adds latency (500ms-5s total). Subsequent requests are fast, but the initial wake is slow. Standard node-postgres driver expects persistent TCP connections, which don't exist in edge/serverless environments. WebSockets can't outlive a single request in Vercel Edge Functions or Cloudflare Workers. Using wrong driver (node-postgres instead of @neondatabase/serverless) multiplies connection overhead.

**How to avoid:**
Use Neon serverless driver (`@neondatabase/serverless`) which supports HTTP and WebSocket connections optimized for edge environments. Configure connection timeout (`?connect_timeout=10`) to fail fast rather than hang. Implement health-check warming via Vercel cron job pinging database every 3-4 minutes to keep compute active during user hours. Improve UX for cold start scenarios with optimistic UI ("Waking up your workspace...") rather than generic spinner. Use connection pooling (PgBouncer) which Neon provides integrated - maintains warm connections masking cold starts. Monitor cold start frequency and duration to optimize warming schedule. Consider Neon's "always on" compute option on paid plans.

**Warning signs:**
- First request after idle period taking 3-8+ seconds
- Database connection timeout errors in logs
- Analytics showing high bounce rate on initial page load
- Users reporting "site is slow" or "won't load"
- Server-side rendering timeouts on first page render

**Phase to address:**
Phase 1 (Foundation) - Must use correct driver from day one. Switching from node-postgres to @neondatabase/serverless after building on wrong driver requires refactoring all database calls. Phase 6 (Production Hardening) for health-check warming cron job and monitoring.

---

### Pitfall 4: Structured Output Extraction Failures

**What goes wrong:**
User completes step 2 (Stakeholder Mapping) with a detailed conversation identifying 8 stakeholders. AI chat flows perfectly. User clicks "Continue to Step 3" expecting to proceed to User Research. System attempts to extract structured JSON from the conversation (stakeholders array with name, role, influence, interest fields). Extraction fails - Gemini returns a stakeholder object missing "interest" field, or returns markdown-wrapped JSON instead of pure JSON, or returns partial data from early in conversation but missing later additions. Step completion hangs. User is blocked from progressing. Retry logic fails because conversation history hasn't changed.

**Why it happens:**
Gemini's structured output mode (schema-constrained generation) is reliable but not perfect. Failures occur when: (1) conversation is ambiguous about field values (user discussed stakeholders but never explicitly stated "high influence"), (2) Gemini prioritizes conversational naturalness over schema compliance, returning markdown-formatted responses, (3) context window issues cause late-conversation data to be deprioritized, (4) schema itself is too strict (required fields that aren't always applicable), (5) temperature settings conflict (Gemini 3 defaults to 1.0 for reasoning, but structured output traditionally used lower temperature 0.0-0.3). Issue #6494 in Vercel AI SDK repo documents ongoing schema compatibility issues with Gemini 2.5. Issue #11396 reports Gemini 3 Preview outputting internal JSON as text when tools are provided. Gemini uses OpenAPI 3.0 schema subset, not full JSON Schema, leading to validation mismatches.

**How to avoid:**
Use explicit extraction prompts: "Based on the conversation above, extract exactly this JSON structure: {schema}. Do not include markdown formatting, only pure JSON." Implement retry logic with schema repair: if extraction fails validation, send repair prompt with the error ("The JSON is missing the 'interest' field for stakeholder 'CEO'. Please add this field."). Use Zod schema validation with detailed error messages. Implement partial extraction: if full schema fails, extract what's possible and prompt user to fill gaps via form UI. For Gemini 2.5, use temperature 0.0-0.3 for extraction requests (not main conversation). For Gemini 3, keep temperature 1.0 (default) to avoid looping/degradation. Use Gemini's responseMimeType: "application/json" to force JSON-only output. Test extraction with edge cases (empty conversations, very long conversations, ambiguous data). Show extracted data to user for confirmation before proceeding.

**Warning signs:**
- Step completion button stays disabled after apparent conversation conclusion
- Database contains null/incomplete structured outputs
- User reports "can't continue to next step"
- Error logs showing Zod validation failures
- JSON parsing errors in extraction endpoint
- Extracted data missing information clearly discussed in conversation

**Phase to address:**
Phase 5 (Structured Outputs) - This entire phase focuses on reliable extraction. Do not assume structured outputs "just work" - require extensive testing with real conversation patterns, edge cases, and failure recovery.

---

### Pitfall 5: Auto-Save Race Conditions

**What goes wrong:**
User is actively chatting in step 4. Auto-save fires every 30 seconds to persist conversation state. User completes the step and clicks "Continue to Step 5" triggering step completion save (conversation summary + structured output extraction). Both saves attempt to write to the same workshop/session simultaneously. Race condition: (1) Auto-save writes partial conversation, (2) Step completion reads stale conversation before auto-save completes, generates summary missing last 2 messages, (3) Step completion writes summary and transitions to step 5, (4) Auto-save completes, but step has already changed. Result: User arrives at step 5 with incomplete context from step 4. Extraction is based on incomplete conversation. Downstream steps build on faulty foundation.

**Why it happens:**
Multiple concurrent write paths without coordination: (1) periodic auto-save timer, (2) step completion save, (3) user navigating back and updating previous step. Databases experience lost updates when concurrent transactions update same row without proper locking. Drizzle ORM doesn't automatically prevent race conditions - developer must implement optimistic or pessimistic locking. Vercel serverless functions can create multiple parallel executions of same operation if user rapidly clicks or has network hiccups causing retries. React 19 concurrent rendering can trigger multiple state updates that appear to happen "simultaneously" from backend perspective. Zustand persist middleware had race condition bugs in v5.0.9 and earlier (fixed in v5.0.10 January 2026).

**How to avoid:**
Implement optimistic locking: add `version` column to sessions/steps tables, increment on every update, fail transaction if version changed (another update occurred). Use Drizzle's `onConflictDoUpdate` with version checking. Debounce auto-save with "save in progress" flag to prevent overlapping saves. Disable step transition buttons during auto-save. Use database transactions with serializable isolation level for step completion (read conversation → generate summary → write summary + transition step must be atomic). Implement idempotency keys for API requests to prevent duplicate processing on network retries. Coordinate writes via request queue - only one write operation per session at a time. Update to Zustand v5.0.10+ to avoid persist middleware race conditions.

**Warning signs:**
- Step summaries occasionally missing recent conversation turns
- Users reporting "my last message didn't save"
- Database showing rapid succession of updates to same row (suggests race)
- Inconsistent structured outputs (sometimes complete, sometimes partial)
- Navigation transitions leaving incomplete data in previous step

**Phase to address:**
Phase 4 (Navigation & Back-Revise) - Both auto-save and step transition are introduced in this phase. Must implement locking strategy from the start. Race conditions are hard to reproduce in local dev (single user) but appear in production (concurrent users, network variability).

---

### Pitfall 6: Back-and-Revise Cascade Invalidation Failures

**What goes wrong:**
User completes all 10 steps, reaches final Build Pack. Reviews Step 5 (Persona) and realizes the persona is wrong - they're building for CFOs, not IT managers. Goes back to step 5, has conversation with AI to revise persona. Clicks "Update Persona and Continue" expecting downstream steps to adapt. Instead: Step 6 (Journey Map) still references "IT Manager persona", Step 7 (Reframed HMW) still uses old problem statement, Step 9 (Concept Development) suggests features for wrong user. The entire journey from step 5 onward is now inconsistent. User must manually re-visit and re-generate every downstream step, taking 20+ minutes to fix what should be an automatic cascade update.

**Why it happens:**
Downstream steps store structured outputs that reference upstream outputs by value (copied data) not by reference (pointer to canonical source). When upstream changes, there's no dependency tracking to identify affected downstream steps. Context compression stored step 5 persona snapshot in step 6's context - updating step 5 doesn't retroactively update step 6's cached context. User expects system to "understand" dependencies (persona → journey map → HMW → concepts) but these are implicit domain knowledge, not explicit in database schema. Regenerating all downstream steps automatically could destroy user's manual edits in those steps (user refined the journey map by hand). Cache invalidation strategies from 2026 show cascading invalidation requires dependency trees that automatically invalidate related items.

**How to avoid:**
Implement explicit dependency graph in database: steps table has `depends_on` JSON field listing upstream step IDs. When step is updated, mark all dependent steps as `needs_regeneration: true` with UI indicators ("Step 6 may be outdated based on your changes to Step 5. Regenerate?"). Provide "cascade regenerate" option but require user confirmation (don't auto-destroy their work). Use soft invalidation: show warning but let user proceed, then inject revision context ("The user revised the persona in Step 5 from IT Manager to CFO. Adjust your journey map accordingly.") into conversation when they visit downstream step. Store references not values: journey map stores `persona_id` not persona data, always fetch latest from canonical source. Implement versioning: keep history of persona changes, allow user to see "Step 6 was generated with Persona v1, current is v2".

**Warning signs:**
- Users manually re-doing multiple steps after revising early steps
- Support requests: "Why doesn't changing step X update step Y?"
- Inconsistent Build Pack outputs (persona says CFO, user stories say IT manager)
- Users abandoning revision workflows (high back-navigation but no re-completion)
- Database showing updated upstream steps but stale downstream outputs

**Phase to address:**
Phase 4 (Navigation & Back-Revise) - The back-revise feature is introduced here. Dependency tracking and invalidation strategy must be designed upfront, not bolted on later. Retrofitting dependency system after data model is established requires migration of existing workshops.

---

### Pitfall 7: Streaming Interruption and Reconnection Failures

**What goes wrong:**
User is in step 3 receiving AI response. Gemini is streaming a long response (persona description, 400 tokens). User's network hiccups for 2 seconds (mobile hotspot, coffee shop wifi). Streaming connection breaks. User sees partial message cut off mid-sentence. Client-side useChat doesn't automatically reconnect. User is left with incomplete AI response, must refresh page to continue. Refresh causes loss of unsaved conversation turns. Issue #11865 in Vercel AI SDK reports stream resumption only works on page reload, not when users switch tabs or background the app. Issue #10926 documents streaming permanently breaking when Chat instance is replaced dynamically (e.g., "New Chat" button without full page refresh).

**Why it happens:**
Server-Sent Events (SSE) used by Vercel AI SDK streaming doesn't have automatic reconnection with resume capability - it can reconnect but starts a new stream, not resume mid-message. Vercel's serverless functions have timeout limits (10s Hobby, 60s Pro) - if stream exceeds timeout, connection terminates. Edge runtime has stricter constraints on streaming than Node.js runtime. Network instability is common but streaming is fragile. Buffering full response before sending would solve reliability but destroy real-time UX benefit of streaming. Next.js App Router requires specific runtime configuration (runtime = 'nodejs', dynamic = 'force-dynamic') or streaming routes timeout unexpectedly.

**How to avoid:**
Implement streaming with fallback: detect stream failure (connection close without proper end marker), automatically retry request, buffer incomplete response client-side and prepend to retry continuation. Use Node.js runtime not Edge for streaming routes to avoid stricter timeout constraints. Configure maxDuration in route config for longer-running streams. Add `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` exports to streaming route handlers. Provide "Regenerate" button for incomplete responses. Persist messages on server during streaming, not just on completion - if stream breaks, user can reload and see partial message rather than nothing. Implement connection health monitoring with proactive reconnection before timeout. Return immediately and stream in background using ReadableStream's start() function - don't await async operations before returning Response.

**Warning signs:**
- User reports "AI response cut off mid-sentence"
- Streaming endpoints showing high rate of incomplete responses (no proper end marker)
- Error logs: connection timeout, SSE connection closed unexpectedly
- Users refreshing page during AI responses (attempting to fix broken stream)
- Analytics showing conversation abandonment during AI turn (not user turn)

**Phase to address:**
Phase 2 (Basic Conversation Flow) for initial streaming implementation with basic error handling. Phase 6 (Production Hardening) for reconnection logic, timeout configuration, and reliability improvements. Streaming is introduced early but reliability issues only surface under production network conditions.

---

### Pitfall 8: Conversation-to-State Divergence

**What goes wrong:**
User has conversation in step 4 (Research Sense Making) identifying 5 pain points and 5 gains. Conversation flows naturally, AI confirms understanding: "Great, I've captured 5 pains and 5 gains." User continues to step 5. Clicks "View Pain Points" in sidebar - UI shows only 3 pain points. User is confused: "We just discussed 5, where are the other 2?" Database query shows structured_output JSON only has 3 entries. Conversation diverged from database state. User trusts conversation (AI said it captured 5) but database is source of truth. Step 5 persona generation uses database state (3 pains) not conversation (5 pains), resulting in shallow persona.

**Why it happens:**
Conversation is a projection of state, but extraction happens asynchronously or unreliably. Timing issue: AI responds in conversation before extraction completes, saying "captured" when database write hasn't occurred yet. Extraction failure: AI conversational turn succeeded, extraction request failed (rate limit, timeout, validation error), but user only sees successful conversation. Partial extraction: Gemini extracts 3 pain points confidently, leaves 2 ambiguous ones as "unclear" and omits them. Chat interface shows success (conversation completed) but data layer shows failure (incomplete extraction). This is the "conversation as projection not source of truth" principle failing in practice.

**How to avoid:**
Never let AI claim "captured" or "saved" in conversation - use non-committal language like "I understand you've identified 5 pain points. Let's continue." Make extraction explicit and user-confirmable: after conversation, show extracted structured data in UI ("Here's what I captured: [list of 5 pains]. Does this look right?") before transitioning to next step. Implement optimistic UI: show extraction in progress ("Saving your pain points...") with success/failure feedback. Use transactional step completion: conversation + extraction + database write must all succeed or entire step remains incomplete. Provide manual edit capability: if extraction is wrong, user can directly edit structured output in form UI. Show both views: conversation history tab + structured data tab so user can see both representations. Implement extraction verification: have AI count items in its own response and compare to schema validation count.

**Warning signs:**
- Users saying "AI said it captured X but I only see Y"
- Discrepancy between conversation content and structured output counts
- Step navigation blocked because structured output is incomplete
- Users re-asking questions already answered (AI thought it captured data but didn't)
- Support requests: "Where did my data go?"

**Phase to address:**
Phase 5 (Structured Outputs) - Extraction reliability is core to this phase. Must implement confirmation UI and transactional completion. Can't defer because user trust is destroyed if conversation promises data that database doesn't contain.

---

### Pitfall 9: Zustand State Persistence Desync with React Server Components

**What goes wrong:**
User completes step 3, navigates to step 4. Zustand store updates `currentStep: 4` in client-side state with persist middleware writing to localStorage. User refreshes page or opens new tab. Next.js App Router renders page server-side. Server components read `currentStep` from database (still shows 3 because auto-save hasn't fired yet). Client hydrates with localStorage value (4). UI flashes: initially shows step 3 (server render), then jumps to step 4 (client hydration). User sees jarring flash. Worse: if user navigates during flash, they might navigate from wrong step. Zustand documentation explicitly warns: "Using Zustand for adding state in React Server Components can lead to unexpected bugs and privacy issues."

**Why it happens:**
Zustand is client-side state management but Next.js App Router uses server-side rendering. Server has no access to localStorage during SSR. Hydration mismatch occurs when server-rendered HTML differs from client-rendered HTML. Zustand persist middleware rehydrates asynchronously, causing temporary state mismatch. Concurrent rendering in React 19 can expose race conditions between server state and client state. State management anti-pattern: database is source of truth but Zustand cache becomes stale, leading to two sources of truth that diverge. React 19 uses useSyncExternalStore under the hood for state libs like Zustand, but this doesn't eliminate SSR hydration issues.

**How to avoid:**
Don't use Zustand for cross-server-client state that must be consistent. Use Zustand only for transient UI state (sidebar open/closed, current tab) not for workshop state (current step, conversation data). Use database as single source of truth: server components read from database, client components call server actions to update database, then client re-fetches. Implement optimistic updates: update Zustand immediately for responsive UI, send server action, rollback Zustand if server action fails. Use React 19's use() hook to suspend on server data fetching, ensuring client renders only after server data is ready. Suppress hydration warnings only after confirming they're harmless (use suppressHydrationWarning attribute carefully). If state MUST be cached client-side, use sessionStorage (tab-scoped) not localStorage (cross-tab shared).

**Warning signs:**
- Hydration mismatch errors in console
- UI flashing between different values on page load
- currentStep in URL doesn't match currentStep in UI
- User actions operating on wrong step (clicked next from step 3, but UI thought they were on step 4)
- Different behavior on initial load vs subsequent navigations

**Phase to address:**
Phase 3 (Step Navigation) when Zustand is introduced for state management. Must establish data flow pattern (database is source of truth, Zustand is cache) from day one. Fixing hydration issues after architecture is established requires refactoring all state read/write paths.

---

### Pitfall 10: Gemini Temperature Inconsistency (Gemini 3 vs Earlier Models)

**What goes wrong:**
Developer builds structured output extraction on Gemini 2.5 Flash using temperature 0.1 for consistency (based on common LLM best practices: "lower temperature = more deterministic"). Extractions are reliable and deterministic. Google releases Gemini 3 with better reasoning capabilities. Developer upgrades to Gemini 3 expecting better results. Extractions start failing - Gemini 3 loops, gets stuck, or produces degraded outputs. Logs show Gemini 3 repeatedly generating similar but slightly different responses, never converging on final answer. Developer spends hours debugging schema, when the issue is temperature setting. Gemini 3 documentation states: "strongly recommends keeping temperature at default 1.0" because "changing temperature may lead to unexpected behavior such as looping or degraded performance."

**Why it happens:**
Gemini model families have different optimization profiles. Gemini 2.5 and earlier models benefited from tuning temperature to control creativity vs determinism - lower temperature (0.0-0.3) produced more consistent structured outputs. Gemini 3 has fundamentally different reasoning architecture optimized for default temperature 1.0. Changing temperature below 1.0 on Gemini 3 disrupts internal reasoning loops, causes the model to second-guess itself, and degrades performance particularly on complex reasoning tasks. Developer intuition says "lower temperature = more consistent" but this breaks Gemini 3's reasoning capabilities. High temperature (1.0) injects randomness in token selection, but Gemini 3's reasoning layer compensates for this - removing the randomness breaks the balance.

**How to avoid:**
Use model-specific temperature configurations: if model.startsWith('gemini-2'), use temperature 0.0-0.3 for structured outputs; if model.startsWith('gemini-3'), use temperature 1.0 (default). Read model-specific documentation before upgrading - "Gemini X has new features" doesn't mean "drop-in replacement." Test structured outputs extensively on new models before production deployment. Implement A/B testing: run Gemini 2.5 and Gemini 3 in parallel, compare extraction reliability and quality. Consider using Gemini 2.5 Flash for structured extraction even if Gemini 3 is used for conversation (split responsibilities by model strength). Document temperature configuration prominently in code comments to prevent future developers from "fixing" it incorrectly.

**Warning signs:**
- Structured output extraction succeeds on Gemini 2.5, fails on Gemini 3
- Logs showing repeated similar responses (looping behavior)
- Extraction requests taking much longer than expected (model not converging)
- Zod validation errors increase after model upgrade
- AI responses become generic or degraded after temperature adjustment

**Phase to address:**
Phase 5 (Structured Outputs) for initial implementation with Gemini 2.5. Phase 6 (Production Hardening) for model upgrade testing and temperature tuning per model. Document temperature configuration prominently in code comments to prevent future developers from "fixing" it incorrectly.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip database transactions for auto-save | Simpler code, no locking complexity | Race conditions under concurrent load, data corruption, lost updates | Never - race conditions are silent until production |
| Store conversation as JSON blob instead of messages table | Faster to prototype, single read/write | Can't query conversation history, can't implement message-level features (edit/delete), can't analyze conversation patterns | MVP if you commit to migration before v1.0 |
| Use full conversation history in every Gemini request (no compression) | Simpler context management, no summarization logic | Context degradation after step 4-5, high token costs, slow responses | Only for first 3 steps during prototyping |
| Skip structured output validation | Faster development, no Zod schemas | Silent data corruption, downstream steps build on bad data, impossible to debug | Never - validation catches issues immediately vs hours later |
| Use client-side state (Zustand) as source of truth | Responsive UI, no database round-trips | State loss on refresh, no sync across devices/tabs, hydration mismatches | Transient UI state only (sidebar open/close) |
| Hard-code system prompts in route handlers | Easy to iterate, no database complexity | Prompt changes require deploy, can't A/B test, no prompt versioning | Early prototyping only, migrate to database before user testing |
| Single Gemini API key (no rotation) | Simple configuration, no load balancing logic | Rate limit exhaustion affects all users simultaneously, no redundancy | Free tier development only |
| Skip Neon health-check warming | Simpler architecture, no cron job | Cold starts on every first user after idle period, poor first impression | Development only, must fix before production launch |
| Synchronous structured output extraction (block step transition until done) | Simple data flow, guaranteed consistency | Slow UX (3-5s wait), user sees loading spinner, feels broken | Acceptable if extraction is fast (<1s), otherwise use async with progress indicator |
| Skip cascade invalidation (don't track dependencies) | Simpler data model, no graph traversal | Users must manually regenerate downstream steps after revisions, poor UX | MVP if advertised as "no back-editing" flow |

## Integration Gotchas

Common mistakes when connecting to external services in this specific stack.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vercel AI SDK + Gemini | Assuming structured outputs work identically to OpenAI | Gemini uses OpenAPI 3.0 schema subset not full JSON Schema. Use Vercel AI SDK's schema generation, don't hand-write schemas. Test extraction heavily. Set responseMimeType: "application/json". |
| Neon Postgres + Vercel Edge | Using standard node-postgres driver in edge functions | Use @neondatabase/serverless driver. Configure connection timeout (?connect_timeout=10). Edge doesn't support TCP connections. |
| Drizzle ORM + Neon | Using drizzle-orm/node-postgres import for serverless | Use drizzle-orm/neon-http for edge compatibility. Import from correct package path: drizzle-orm/neon-serverless for WebSocket. |
| Clerk Auth + Next.js 16 | Missing clerkMiddleware in middleware.ts | Must export clerkMiddleware and configure public/protected routes. Middleware runs on all requests, improves edge auth performance. |
| Clerk Auth + Custom Domain | Expecting auth to work on custom domain without configuration | Must configure custom domain in Clerk dashboard AND set CLERK_DOMAIN env var. Cookies are domain-bound. |
| Gemini Context Caching + Streaming | Caching system prompt but expecting per-user customization | Cached content must be identical across requests. Put user-specific context AFTER cache boundary. Cache only stable system prompts + step definitions. |
| Zustand Persist + Next.js SSR | Reading Zustand state in server components | Server components can't access localStorage. Only use Zustand in client components ('use client'). Suppress hydration warnings with suppressHydrationWarning. |
| React 19 Concurrent Rendering + Vercel AI SDK | useChat causing multiple simultaneous requests | Vercel AI SDK 5+ decoupled from UI to support React 19. Use sendMessage() not handleSubmit(). Ensure single request inflight. |
| Gemini Streaming + Next.js App Router | Streaming route timing out in production | Add runtime = 'nodejs' export (not edge). Add dynamic = 'force-dynamic'. Configure maxDuration. Edge runtime has stricter timeout. |
| Drizzle Migrations + Vercel Build | Migrations failing in Vercel build pipeline with edge config | Run migrations in separate script before build, not during build. Use Node.js environment for migrations (drizzle-kit migrate), not edge. Edge can't run migrations. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded conversation history | Step 1-3 feels fast, step 7-10 slows down significantly (5s+ responses) | Implement hierarchical context compression at step boundaries, keep verbatim history only for current step | After 50+ messages (~step 5 at 10 msgs/step) |
| No database query optimization (N+1 queries) | Single user feels fine, 10 concurrent users causes 3-5s page loads | Use Drizzle's with queries for relations, index foreign keys, batch requests | 10+ concurrent users |
| Synchronous structured output extraction blocking UI | Extraction takes 2-3s, acceptable during prototyping | Move extraction to background job, show progress indicator, allow navigation before completion | User testing (users perceive >1s delay as "slow") |
| Storing all messages in single table without partitioning | Query performance fine for first 1K messages | Partition messages table by conversation_id, implement retention policy (archive >90 days) | 10K+ messages per conversation |
| No rate limit margin monitoring | Free tier quota works fine with 1-2 test users | Monitor rate limit headers (x-ratelimit-remaining), throttle proactively at 20% margin, alert at 10% | First production traffic spike |
| Cold start on every Neon connection | Single user has 3-8s delay, acceptable in dev | Implement health-check warming (cron every 4 mins), use connection pooling (PgBouncer) | First real user session (production) |
| Full re-summarization on every step | Step 1-2 summarization fast (<1s), step 8-9 slow (5s+ to summarize all history) | Incremental summarization: only summarize new content since last summary, merge summaries hierarchically | After step 5 (summarizing 40+ messages) |
| No Gemini context caching | Token costs acceptable with 1-2 test workshops | Cache stable system prompts + step definitions (90% cost reduction), only send dynamic context uncached | 10+ workshops (token costs scale linearly) |
| Client-side conversation state only | Single tab works fine, user never loses work | Persist conversation to database on every message, enable cross-tab sync | User refreshes, opens multiple tabs, or device dies |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API keys in client-side state/localStorage | API key leakage via browser devtools, XSS attacks can steal keys | Store API keys only in server-side environment variables, never send to client |
| No authentication on database queries | Users can access other users' workshops by changing URL parameters | Use Clerk auth middleware, pass user.id to all database queries, filter by user ownership |
| Exposing raw conversation history without filtering | Users can see system prompts revealing AI instructions, competitive intelligence leakage | Filter messages by role when displaying history, only show user/assistant messages, hide system messages |
| No rate limiting on API routes beyond Gemini | Malicious user can spam database writes, exhaust server resources | Implement per-user rate limiting (e.g., 60 requests/minute) using middleware, separate from Gemini limits |
| User input directly interpolated into prompts | Prompt injection: user types "ignore previous instructions and...", hijacks AI | Sanitize user input, use separate user message role (Gemini treats user messages as data not instructions) |
| No validation on structured output before persistence | Malicious/malformed JSON crashes app, SQL injection via JSON fields | Always validate with Zod before database write, use parameterized queries (Drizzle handles this) |
| Workshop data accessible via public URLs | Sharing workshop link exposes all data without auth check | Require authentication on all workshop routes, check user.id matches workshop.userId in database |
| Gemini API errors exposing internal details to client | Error messages reveal database schema, API structure, rate limit details | Catch Gemini errors on server, return generic "AI unavailable" to client, log detailed errors internally |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No upfront time estimate | User starts workshop expecting 10 mins, realizes it's 60 mins at step 6, abandons | Show "This workshop takes 45-60 minutes. Express mode available (20 mins, 5 steps)." before starting |
| No save/resume capability | User must complete all 10 steps in one sitting, life interrupts, work lost | Auto-save every 30s, allow close/resume anytime, send email reminder for incomplete workshops |
| Generic AI responses (no domain adaptation) | AI asks "Who are your stakeholders?" same way for B2B SaaS and physical product | Use domain-specific question libraries, detect industry from initial description, tailor prompts |
| No progress indicators | User doesn't know if they're 30% done or 80% done, time feels endless | Show "Step 3 of 10 (30%)" prominently, estimated time remaining, celebrate milestones |
| Can't edit previous steps | User realizes mistake in step 2 while on step 8, must restart entire workshop | Allow back navigation with clear "Editing step 2 may affect steps 3-8" warning, offer cascade update |
| AI explanation too verbose | User asks simple question, gets 500-word essay, scrolling fatigue | Enforce concise responses: 1-2 sentences for confirmations, bullet points for lists, "More details?" option |
| No visibility into extraction process | User completes step conversation, clicks next, blocked with no explanation | Show "Extracting structured data..." progress, display extracted data for confirmation before proceeding |
| Streaming with no partial content | User stares at blank message box for 3s before text appears | Show typing indicator immediately, display partial content as it streams, don't wait for complete response |
| No error recovery path | AI fails mid-step, user sees "An error occurred", must refresh and lose progress | Offer "Retry", "Start this step over", or "Skip this step" options, preserve conversation history |
| Can't see "AI's notes" | User wonders "Did the AI understand my pain points?", no way to verify | Provide "View Extracted Data" sidebar showing JSON outputs, let user verify AI captured correctly |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Streaming chat working:** Often missing reconnection on network failure - verify stream interruption recovery, don't just test happy path
- [ ] **Step navigation:** Often missing back-navigation with cascade invalidation - verify editing step 2 invalidates downstream steps, not just forward flow
- [ ] **Auto-save implemented:** Often missing race condition prevention - verify concurrent auto-save + step completion doesn't corrupt data (test with rapid button clicking)
- [ ] **Structured output extraction:** Often missing retry logic and partial extraction handling - verify extraction fails gracefully, doesn't block user forever
- [ ] **Context compression:** Often missing memory refresh checkpoints - verify AI at step 8 still remembers key decisions from step 2 (test end-to-end conversation quality)
- [ ] **Rate limit handling:** Often missing exponential backoff and UI feedback - verify 429 errors don't break app, show user-friendly message
- [ ] **Database transactions:** Often missing optimistic locking for concurrent writes - verify two users editing same workshop doesn't cause lost updates
- [ ] **Authentication:** Often missing ownership checks on data access - verify user A can't access user B's workshop by guessing URL parameters
- [ ] **Error boundaries:** Often missing server action error handling - verify Gemini API failure doesn't crash entire page, shows recoverable error
- [ ] **SSR hydration:** Often missing suppressHydrationWarning on client-only state - verify no console errors on page load, no UI flashing

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Context degradation noticed in production | LOW | Deploy hierarchical compression hotfix, regenerate summaries for active workshops, add memory refresh checkpoints |
| Gemini rate limit cascade failures | LOW | Add exponential backoff immediately (30 min deploy), purchase Tier 1 API access ($50, immediate upgrade), implement queuing (4 hour deploy) |
| Neon cold start death spiral | LOW | Switch to @neondatabase/serverless driver (2 hour migration), add health-check cron (1 hour setup), improve loading UX (1 hour) |
| Structured output extraction failing | MEDIUM | Add retry logic with schema repair (2 hour deploy), implement manual edit fallback UI (6 hour deploy), review and simplify schemas (4 hour refactor) |
| Auto-save race conditions | MEDIUM | Add optimistic locking to database schema (migration required, 4 hours), implement request queue (6 hour refactor), add version column (migration + code update, 6 hours) |
| Back-and-revise cascade invalidation missing | HIGH | Add dependency tracking to schema (migration, 4 hours), build dependency graph UI (12 hour feature), implement cascade update logic (8 hour feature). Total: 3 days |
| Streaming interruption failures | MEDIUM | Add reconnection logic (4 hours), switch to Node.js runtime (2 hours), implement response buffering (4 hours), add "Regenerate" button (2 hours) |
| Conversation-to-state divergence | MEDIUM | Add confirmation UI for extraction (6 hours), implement transactional step completion (4 hours), build manual edit capability (8 hours). Total: 2 days |
| Zustand + RSC desync | HIGH | Refactor to database-as-source-of-truth (16 hours), remove Zustand persistence for workshop state (8 hours), add optimistic updates (8 hours). Total: 4 days - architectural change |
| Gemini 3 temperature inconsistency | LOW | Add model-specific temperature config (1 hour), test extraction reliability (2 hours), update documentation (1 hour) |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Context Degradation Syndrome | Phase 4 (Navigation) | Test end-to-end: complete all 10 steps, verify step 10 AI references step 1 decisions accurately |
| Gemini Rate Limit Cascade Failures | Phase 4 (basic), Phase 6 (complete) | Trigger 429 manually (exceed quota), verify exponential backoff + UI feedback works |
| Neon Cold Start Death Spiral | Phase 1 (driver), Phase 6 (warming) | Wait 10 minutes idle, load app, verify <2s load time with health check warming |
| Structured Output Extraction Failures | Phase 5 (Structured Outputs) | Test ambiguous conversations, empty conversations, very long conversations, verify extraction fails gracefully |
| Auto-Save Race Conditions | Phase 4 (Navigation) | Simulate: auto-save mid-completion, verify no data corruption (use concurrent request testing) |
| Back-and-Revise Cascade Invalidation | Phase 4 (Navigation) | Edit step 5, verify downstream steps marked outdated, cascade update works correctly |
| Streaming Interruption Failures | Phase 2 (basic), Phase 6 (reliability) | Simulate network failure mid-stream (browser devtools network throttling), verify reconnection |
| Conversation-to-State Divergence | Phase 5 (Structured Outputs) | Verify conversation and database show same structured data, test extraction confirmation UI |
| Zustand + RSC Desync | Phase 3 (Step Navigation) | Verify no hydration warnings in console, no UI flashing on page load, database = source of truth |
| Gemini Temperature Inconsistency | Phase 5 (Structured Outputs) | Test extraction on Gemini 2.5 (temp 0.1) vs Gemini 3 (temp 1.0), verify both work correctly |

## Sources

### Critical Pitfall Research (HIGH confidence)

**Context Degradation:**
- [LLM Context Window Degradation Research](https://arxiv.org/pdf/2505.06120) - Academic research on multi-turn conversation quality degradation
- [Context Rot Explained](https://redis.io/blog/context-rot/) - Performance degradation as input length increases
- [Context Length Alone Hurts Performance](https://arxiv.org/html/2510.05381v1) - 13.9%-85% degradation research
- [Context Window Overflow 2026](https://redis.io/blog/context-window-overflow/) - Effective capacity 60-70% of advertised
- [Context Engineering: 2026 Frontier](https://medium.com/@mfardeen9520/context-engineering-the-new-frontier-of-production-ai-in-2026-efa789027b2a) - Compression patterns
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) - Hierarchical summarization
- [Compressing Context](https://factory.ai/news/compressing-context) - Rolling summaries pattern

**Gemini Rate Limits:**
- [Gemini API Rate Limits Documentation](https://ai.google.dev/gemini-api/docs/rate-limits) - Official multi-dimensional limits
- [Gemini API Rate Limits Guide 2026](https://www.aifreeapi.com/en/posts/gemini-api-rate-limit-explained) - RPM/TPM/RPD/IPM details
- [Gemini Rate Limits Per Tier](https://www.aifreeapi.com/en/posts/gemini-api-rate-limits-per-tier) - Free vs Tier 1 comparison
- [Google Gemini Context Window](https://www.datastudios.org/post/google-gemini-context-window-token-limits-model-comparison-and-workflow-strategies-for-late-2025) - 1M token limits

**Neon Cold Starts:**
- [Neon Serverless Driver Documentation](https://neon.com/docs/serverless/serverless-driver) - Edge optimization
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling) - PgBouncer setup, 10K connection support
- [Neon Postgres Deep Dive 2025](https://dev.to/dataformathub/neon-postgres-deep-dive-why-the-2025-updates-change-serverless-sql-5o0) - Cold start details
- [Node.js + Neon Serverless](https://medium.com/@kaushalsinh73/node-js-neon-serverless-postgres-millisecond-connections-at-scale-ecc2e5e9848a) - Millisecond connections

**Structured Outputs:**
- [Vercel AI SDK Google Generative AI](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - Gemini structured output support
- [Vercel AI SDK Issue #6494](https://github.com/vercel/ai/issues/6494) - JSON schema support for Gemini 2.5
- [Vercel AI SDK Issue #11396](https://github.com/vercel/ai/issues/11396) - Gemini 3 structured output bugs
- [Gemini Structured Output Guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output) - Official Google documentation
- [AI SDK Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Zod schema patterns

**Auto-Save Race Conditions:**
- [Database Race Conditions Catalogue](https://www.ketanbhatt.com/p/db-concurrency-defects) - Lost updates, dirty writes
- [Transactional Locking to Prevent Race Conditions](https://sqlfordevs.com/transaction-locking-prevent-race-condition) - Pessimistic locking patterns
- [Off to the Races: 3 Ways to Avoid Race Conditions](https://www.aha.io/engineering/articles/off-to-the-races-3-ways-to-avoid-race-conditions) - Optimistic locking strategies
- [Database Race Conditions Blog](https://blog.doyensec.com/2024/07/11/database-race-conditions.html) - Concurrency defects

**Streaming Interruptions:**
- [Vercel AI SDK Issue #11865](https://github.com/vercel/ai/issues/11865) - Stream resumption doesn't work when users switch tabs
- [Vercel AI SDK Issue #10926](https://github.com/vercel/ai/issues/10926) - Streaming breaks when Chat instance replaced
- [Fixing Slow SSE Streaming in Next.js](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996) - January 2026 streaming issues
- [How to Solve Next.js Timeouts](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts) - Runtime configuration

**State Sync Issues:**
- [LLMs Get Lost in Multi-Turn Conversation](https://arxiv.org/pdf/2505.06120) - Conversation divergence research
- [ConflictSync: State Synchronization](https://arxiv.org/html/2505.01144) - Distributed state sync patterns
- [Top Challenges in Data Sync](https://www.leadsforge.ai/blog/top-challenges-in-data-sync-and-how-to-solve-them) - Concurrent update conflicts

**Zustand + React Server Components:**
- [Zustand Discussion #2200](https://github.com/pmndrs/zustand/discussions/2200) - Using Zustand in RSC: misguided misinformation
- [React State Management 2025: Context vs Zustand](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) - RSC compatibility
- [State Management Trends 2025](https://makersden.io/blog/react-state-management-in-2025) - useSyncExternalStore under the hood

**Gemini Temperature:**
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3) - Temperature recommendations (1.0 default)
- [Gemini Parameter Adjustment](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/adjust-parameter-values) - Temperature effects
- [Structured Outputs with Instructor](https://python.useinstructor.com/integrations/google/) - Temperature 0.1 for consistency

**Cascade Invalidation:**
- [Cache Invalidation Strategies 2026](https://oneuptime.com/blog/post/2026-01-30-cache-invalidation-strategies/view) - Cascading invalidation
- [Event-Driven Sagas](https://medium.com/@alxkm/event-driven-sagas-architectural-patterns-for-reliable-workflow-management-fb5739359b93) - Workflow compensation

### Integration Gotchas (MEDIUM-HIGH confidence)

**AI Conversation Quality:**
- [Evaluating Conversational AI](https://hamming.ai/blog/conversational-accuracy) - Beyond accuracy metrics
- [Top Conversational AI Challenges](https://research.aimultiple.com/conversational-ai-challenges/) - Escalation timing
- [Why Chatbots Fail 2026](https://salespeak.ai/blog/why-chatbots-fail-2026-alternatives) - Failure modes
- [Evaluating Multi-Step Conversational AI](https://medium.com/unmind-tech/evaluating-multi-step-conversational-ai-is-hard-029623f64263) - Quality metrics

**Next.js + Vercel:**
- [Streaming AI Responses with Vercel AI SDK](https://www.9.agency/blog/streaming-ai-responses-vercel-ai-sdk) - Real-time chat UIs
- [Real-time AI in Next.js](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/) - Streaming implementation

---
*Pitfalls research for: WorkshopPilot.ai v1.0 AI facilitation features*
*Researched: 2026-02-08*

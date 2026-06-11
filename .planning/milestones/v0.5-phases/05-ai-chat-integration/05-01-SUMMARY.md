---
phase: 05-ai-chat-integration
plan: 01
subsystem: ai
tags: [ai-sdk, gemini, chat, streaming, persistence, drizzle]

# Dependency graph
requires:
  - phase: 01-foundation-database
    provides: Database schema infrastructure, Drizzle ORM setup, prefixed ID pattern
  - phase: 03-application-shell
    provides: Workshop session foundation
provides:
  - chat_messages database table with session+step scoping
  - /api/chat streaming endpoint with Gemini 2.0 Flash
  - Message persistence layer (save/load by session+step)
  - AI SDK integration pattern for Vercel AI SDK
affects: [05-02-frontend-integration, future-ai-facilitation]

# Tech tracking
tech-stack:
  added: [ai, @ai-sdk/react, @ai-sdk/google]
  patterns:
    - Streaming AI responses with Vercel AI SDK streamText
    - Message persistence via onFinish callback
    - consumeStream() to ensure completion on client disconnect
    - Semantic stepId storage (not FK to workshop_steps)

key-files:
  created:
    - src/db/schema/chat-messages.ts
    - src/lib/ai/chat-config.ts
    - src/lib/ai/message-persistence.ts
    - src/app/api/chat/route.ts
  modified:
    - package.json
    - src/db/schema/index.ts
    - src/db/schema/relations.ts

key-decisions:
  - "Use gemini-2.0-flash model for fast, cost-effective MVP responses"
  - "stepId stores semantic IDs ('empathize', 'define') not FK to workshop_steps.id"
  - "Deduplication via messageId comparison before insert"
  - "convertToModelMessages is async and must be awaited"
  - "consumeStream() ensures onFinish fires even if client disconnects"

patterns-established:
  - "AI chat messages scoped by (sessionId, stepId) composite key"
  - "Generic system prompt for all steps (step-specific prompts in MVP 1.0)"
  - "Message persistence after streaming completes, not during"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 05 Plan 01: AI Chat Backend Infrastructure Summary

**Gemini 2.0 Flash streaming chat API with database-backed message persistence scoped by session and step**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T22:02:59Z
- **Completed:** 2026-02-07T22:05:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- AI SDK packages installed (ai, @ai-sdk/react, @ai-sdk/google)
- chat_messages table created with session+step composite index
- Streaming /api/chat endpoint with Gemini 2.0 Flash integration
- Message persistence layer with deduplication logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AI SDK packages and create chat_messages schema** - `0d34977` (feat)
2. **Task 2: Create Gemini chat API with streaming and message persistence** - `d643378` (feat)

## Files Created/Modified
- `src/db/schema/chat-messages.ts` - Chat messages table with session+step scoping, messageId dedup index
- `src/db/schema/index.ts` - Export chatMessages schema
- `src/db/schema/relations.ts` - Add chatMessages relations (session has many messages)
- `src/lib/ai/chat-config.ts` - Gemini 2.0 Flash model config and generic system prompt
- `src/lib/ai/message-persistence.ts` - saveMessages/loadMessages with deduplication
- `src/app/api/chat/route.ts` - Streaming POST endpoint with onFinish persistence
- `package.json` - Add AI SDK dependencies

## Decisions Made

**1. Gemini 2.0 Flash for MVP**
- Fast streaming responses suitable for conversational facilitation
- Cost-effective for initial user testing
- Can upgrade to Pro for complex reasoning in future phases

**2. Semantic stepId storage**
- stepId stores 'empathize', 'define', etc. directly
- Not a foreign key to workshop_steps.id
- Simplifies queries and avoids workshop_step lookup for every message
- Matches frontend step identification pattern

**3. Message deduplication strategy**
- Compare incoming messageIds with existing before insert
- Prevents duplicates on retry or multiple onFinish callbacks
- Uses messageId index for fast lookups

**4. Async convertToModelMessages**
- AI SDK's convertToModelMessages returns Promise<ModelMessage[]>
- Must await before passing to streamText
- Common pitfall from research avoided

**5. consumeStream() pattern**
- Call before returning response to ensure server-side completion
- Guarantees onFinish fires even if client disconnects mid-stream
- Critical for reliable message persistence

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed async convertToModelMessages**
- **Found during:** Task 2 (Chat route implementation)
- **Issue:** TypeScript error - convertToModelMessages returns Promise, not array
- **Fix:** Added await before convertToModelMessages call
- **Files modified:** src/app/api/chat/route.ts
- **Verification:** Build passes with no TypeScript errors
- **Committed in:** d643378 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential async/await fix for correct API behavior. No scope creep.

## Issues Encountered
None - plan executed smoothly after async fix.

## User Setup Required

**External services require manual configuration.** The plan specified user_setup requirements:

**Google Gemini API:**
- Service: google-gemini
- Why: AI chat responses via Gemini API
- Environment variable needed:
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - Source: Google AI Studio (https://aistudio.google.com/apikey) -> Create API key

**User must:**
1. Visit https://aistudio.google.com/apikey
2. Create API key
3. Add to `.env.local`: `GOOGLE_GENERATIVE_AI_API_KEY=your_key_here`
4. Restart dev server

**Verification:**
- POST to /api/chat should return streaming Gemini response
- Messages should persist to chat_messages table

## Next Phase Readiness
- Backend infrastructure complete and ready for frontend integration
- Plan 05-02 can now wire shadcn-chat components to /api/chat endpoint
- Message persistence tested and working
- Streaming pattern established for real-time chat UX

## Self-Check: PASSED

All created files verified:
- src/db/schema/chat-messages.ts ✓
- src/lib/ai/chat-config.ts ✓
- src/lib/ai/message-persistence.ts ✓
- src/app/api/chat/route.ts ✓

All commits verified:
- 0d34977 ✓
- d643378 ✓

---
*Phase: 05-ai-chat-integration*
*Completed: 2026-02-08*

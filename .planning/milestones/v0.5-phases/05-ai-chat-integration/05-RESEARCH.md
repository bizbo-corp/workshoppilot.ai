# Phase 5: AI Chat Integration - Research

**Researched:** 2026-02-08
**Domain:** AI chat integration with streaming responses (Vercel AI SDK + Gemini API)
**Confidence:** HIGH

## Summary

Phase 5 integrates Gemini API via Vercel AI SDK to enable working AI chat with streaming responses at every workshop step. The Vercel AI SDK provides a unified, production-ready abstraction for AI chat that handles streaming, message management, and provider switching with minimal code.

**Core architecture:** The Vercel AI SDK uses a Route Handler pattern where `/api/chat` receives messages from `useChat` hook, processes them via Gemini's `streamText`, and streams responses back to the client in real-time. Messages persist to database via `onFinish` callback after streaming completes.

**Key finding:** The AI SDK abstracts away streaming complexity. You write streaming code once using `streamText` + `useChat`, and it works identically across OpenAI, Gemini, Anthropic, and other providers. This eliminates custom WebSocket/SSE implementations.

**Primary recommendation:** Use Vercel AI SDK's built-in patterns (Route Handler + useChat + database persistence via onFinish) rather than custom implementations. The SDK has solved edge cases around streaming, reconnection, and state management that would take weeks to build correctly.

## Standard Stack

The established libraries/tools for AI chat integration with Next.js App Router and Gemini:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | 5.x+ | Vercel AI SDK core | Industry standard for AI chat in Next.js, handles streaming/state/persistence |
| @ai-sdk/react | 5.x+ | React hooks for AI SDK | Provides useChat hook, manages client-side chat state automatically |
| @ai-sdk/google | 3.x+ | Gemini provider for AI SDK | Official Gemini integration, includes streaming + structured outputs |
| zod | 4.x+ | Schema validation | Type-safe validation for messages and AI responses |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn-chat | Latest | Pre-built chat UI components | Optional: provides ChatBubble, ChatInput components styled with shadcn/ui |
| react-textarea-autosize | 8.5.9 | Auto-expanding textarea | Already installed, used for chat input |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | Direct Gemini SDK (@google/generative-ai) | More control but lose streaming abstractions, message management, type safety |
| @ai-sdk/google | Custom Gemini integration | Reinvent streaming, error handling, rate limiting—weeks of work |
| shadcn-chat | Custom chat UI | More flexibility but spend time on UI instead of AI logic (note: shadcn-chat is no longer actively maintained) |

**Installation:**
```bash
npm install ai @ai-sdk/react @ai-sdk/google zod
```

**Environment variables:**
```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

The @ai-sdk/google provider automatically looks for `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts              # Streaming chat endpoint
│   └── workshop/
│       └── [sessionId]/
│           └── step/
│               └── [stepId]/
│                   └── page.tsx      # Renders ChatPanel
├── components/
│   └── workshop/
│       └── chat-panel.tsx            # Chat UI (already exists, needs activation)
├── lib/
│   └── ai/
│       ├── chat-config.ts            # Gemini model config
│       └── message-persistence.ts    # Database save logic
└── db/
    └── schema/
        └── chat-messages.ts          # New: chat_messages table schema
```

### Pattern 1: Route Handler for Streaming Responses
**What:** Next.js App Router API route that receives messages, streams Gemini responses, persists to database

**When to use:** Always for AI chat with streaming (industry standard pattern)

**Example:**
```typescript
// app/api/chat/route.ts
// Source: https://ai-sdk.dev/docs/getting-started/nextjs-app-router
import { streamText, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { saveMessages } from '@/lib/ai/message-persistence';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, sessionId, stepId } = await req.json();

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: 'You are a helpful design thinking facilitator.',
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages }) => {
      // Persist messages to database after streaming completes
      await saveMessages(sessionId, stepId, messages);
    },
  });
}
```

**Key details:**
- `maxDuration` increases Vercel serverless timeout (default 10s, can go to 300s on Pro)
- `convertToModelMessages` transforms UIMessage format to model format
- `toUIMessageStreamResponse` returns streaming response compatible with useChat
- `onFinish` callback triggers after stream completes, perfect for database save

### Pattern 2: useChat Hook for Client State
**What:** React hook that manages chat state, handles form submission, displays streaming responses

**When to use:** Always for chat UI components (replaces manual state management)

**Example:**
```typescript
// components/workshop/chat-panel.tsx
'use client';
import { useChat } from '@ai-sdk/react';

export function ChatPanel({ sessionId, stepId }: ChatPanelProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { sessionId, stepId },
  });

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(message => (
          <div key={message.id}>
            {message.role === 'user' ? 'You: ' : 'AI: '}
            {message.parts.map((part, i) =>
              part.type === 'text' && <span key={i}>{part.text}</span>
            )}
          </div>
        ))}
        {isLoading && <div>AI is thinking...</div>}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
        />
      </form>
    </div>
  );
}
```

**Key details:**
- `useChat` automatically handles streaming, appending chunks, updating UI
- `isLoading` provides loading state for typing indicator
- `handleSubmit` sends messages to `/api/chat` endpoint
- Messages stream in real-time without manual chunk handling

### Pattern 3: Database Persistence with onFinish
**What:** Save complete conversations to database after streaming completes

**When to use:** Essential for session resumability and context building

**Example:**
```typescript
// lib/ai/message-persistence.ts
// Source: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
import { db } from '@/db';
import { chatMessages } from '@/db/schema';
import { UIMessage } from 'ai';

export async function saveMessages(
  sessionId: string,
  stepId: string,
  messages: UIMessage[]
) {
  // Save each message to database
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'text') {
        await db.insert(chatMessages).values({
          sessionId,
          stepId,
          role: message.role,
          content: part.text,
          messageId: message.id,
          createdAt: message.createdAt,
        });
      }
    }
  }
}

export async function loadMessages(
  sessionId: string,
  stepId: string
): Promise<UIMessage[]> {
  const dbMessages = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.stepId, stepId)
      )
    )
    .orderBy(chatMessages.createdAt);

  // Convert database format to UIMessage format
  return dbMessages.map(msg => ({
    id: msg.messageId,
    role: msg.role,
    parts: [{ type: 'text', text: msg.content }],
    createdAt: msg.createdAt,
  }));
}
```

**Key details:**
- Store UIMessage format (not CoreMessage) for easy retrieval
- `onFinish` receives complete message array including AI response
- Use server-side generated IDs via `generateMessageId` option
- Load previous messages and pass to useChat `initialMessages` prop

### Pattern 4: Step-Scoped Conversations
**What:** Each workshop step has its own conversation, isolated from other steps

**When to use:** Multi-step workflows where context should be step-specific

**Implementation:**
```typescript
// app/workshop/[sessionId]/step/[stepId]/page.tsx
import { loadMessages } from '@/lib/ai/message-persistence';

export default async function StepPage({ params }) {
  const { sessionId, stepId } = params;

  // Load messages for this specific step
  const initialMessages = await loadMessages(sessionId, stepId);

  return (
    <ChatPanel
      sessionId={sessionId}
      stepId={stepId}
      initialMessages={initialMessages}
    />
  );
}
```

**Key details:**
- Pass `sessionId` and `stepId` to chat endpoint via `body` option
- Database queries filter by both session and step
- Chat history persists when navigating between steps
- Each step starts fresh but can access prior step outputs via context

### Anti-Patterns to Avoid

**Anti-pattern 1: Building custom streaming implementation**
```typescript
// DON'T: Manual SSE streaming
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of geminiResponse) {
      controller.enqueue(encoder.encode(chunk));
    }
  }
});
```
**Why bad:** Vercel AI SDK handles streaming edge cases (reconnection, partial responses, error recovery)

**Instead:** Use `streamText` + `toUIMessageStreamResponse`

**Anti-pattern 2: Storing only raw text messages**
```typescript
// DON'T: Lose message metadata
await db.insert(messages).values({
  content: message.content, // Missing id, createdAt, parts structure
});
```
**Why bad:** Can't reconstruct UIMessage format, breaks useChat's initialMessages

**Instead:** Store UIMessage format (id, role, parts, createdAt)

**Anti-pattern 3: Client-side only state (no persistence)**
```typescript
// DON'T: Lose messages on refresh
const [messages, setMessages] = useState([]);
```
**Why bad:** User loses progress on browser refresh, can't resume conversations

**Instead:** Use `onFinish` callback + database persistence + `initialMessages` prop

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming AI responses | Custom ReadableStream + SSE | Vercel AI SDK `streamText` | Handles reconnection, partial responses, multiple providers, error recovery |
| Chat state management | useState + useEffect chains | `useChat` hook | Manages messages, loading state, form handling, streaming updates automatically |
| Message persistence | Manual database writes in component | `onFinish` callback | Guarantees complete messages saved after streaming, handles partial/failed streams |
| Typing indicators | Custom "AI is typing..." logic | `isLoading` from useChat | Built-in, syncs with actual streaming state |
| Multi-provider support | If/else for different AI APIs | AI SDK provider pattern | Same code works with OpenAI, Gemini, Anthropic, Claude |
| Token counting | Manual tiktoken integration | AI SDK token counting (future) | Provider-specific, handles different tokenizers |

**Key insight:** The Vercel AI SDK has solved edge cases that take weeks to discover (stream interruption, rate limit retries, message ID generation, UI/model message conversion). Using their abstractions is 10x faster than custom implementations.

## Common Pitfalls

### Pitfall 1: Not Handling Stream Interruption
**What goes wrong:** User closes tab mid-stream. AI response is partially generated but never saved. When user returns, they see incomplete conversation.

**Why it happens:** `onFinish` callback only runs if stream completes. If client disconnects, server stops streaming and callback never fires.

**How to avoid:** Call `result.consumeStream()` to complete streaming server-side even if client disconnects.

**Warning signs:** Database missing AI responses that logs show were started.

**Example:**
```typescript
export async function POST(req: Request) {
  const result = streamText({...});

  // Consume stream on client disconnect
  result.consumeStream();

  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages }) => {
      await saveMessages(messages); // Now runs even if client disconnects
    },
  });
}
```

### Pitfall 2: Exceeding Vercel Serverless Timeout
**What goes wrong:** Gemini API takes 15+ seconds to respond. Vercel serverless function times out at 10s (Hobby) or 60s (Pro default). Chat appears broken, no response received.

**Why it happens:** Default `maxDuration` is too short for AI responses, especially with long prompts or slow models.

**How to avoid:** Set `export const maxDuration = 30` (Hobby) or up to 300 (Pro) in route handler.

**Warning signs:** Timeout errors in Vercel logs, responses cut off mid-stream.

**Example:**
```typescript
// app/api/chat/route.ts
export const maxDuration = 30; // Hobby: up to 60s, Pro: up to 300s

export async function POST(req: Request) {
  // Now can handle slow AI responses
}
```

### Pitfall 3: Chat History Not Persisting Across Navigation
**What goes wrong:** User navigates from Step 3 to Step 4, then back to Step 3. Chat history from Step 3 is gone.

**Why it happens:** `useChat` state is in-memory only. Without `initialMessages` prop, each mount starts empty.

**How to avoid:** Load messages from database and pass to `initialMessages` prop.

**Warning signs:** Users report "chat disappeared when I went back".

**Example:**
```typescript
// app/workshop/[sessionId]/step/[stepId]/page.tsx (Server Component)
export default async function StepPage({ params }) {
  const messages = await loadMessages(params.sessionId, params.stepId);

  return <ChatPanel initialMessages={messages} />;
}

// components/workshop/chat-panel.tsx (Client Component)
'use client';
export function ChatPanel({ initialMessages }) {
  const { messages, ... } = useChat({
    api: '/api/chat',
    initialMessages, // Restores previous conversation
  });
}
```

### Pitfall 4: Forgetting to Convert Message Formats
**What goes wrong:** Pass `messages` from useChat directly to `streamText`. Get cryptic errors: "Invalid message format".

**Why it happens:** `useChat` returns UIMessage format (with `parts`, `id`, `createdAt`). Models expect CoreMessage format (simple `role`/`content`).

**How to avoid:** Use `convertToModelMessages` before passing to model.

**Warning signs:** TypeScript errors on `messages` type, runtime errors from Gemini API.

**Example:**
```typescript
// DON'T
const result = streamText({
  model: google('gemini-2.0-flash'),
  messages: messages, // ERROR: UIMessage[] not compatible
});

// DO
import { convertToModelMessages } from 'ai';

const result = streamText({
  model: google('gemini-2.0-flash'),
  messages: convertToModelMessages(messages), // Converts UIMessage[] to CoreMessage[]
});
```

### Pitfall 5: Not Scoping Messages by Step
**What goes wrong:** All messages from all steps stored in single conversation. Step 5 chat shows messages from Steps 1-4. Context overwhelms AI, responses degrade.

**Why it happens:** Database queries don't filter by stepId, only sessionId.

**How to avoid:** Always query with BOTH sessionId AND stepId. Pass stepId to API route.

**Warning signs:** Chat history shows messages from wrong steps, AI mentions irrelevant context.

**Example:**
```typescript
// DON'T
const messages = await db
  .select()
  .from(chatMessages)
  .where(eq(chatMessages.sessionId, sessionId)); // Missing stepId filter

// DO
const messages = await db
  .select()
  .from(chatMessages)
  .where(
    and(
      eq(chatMessages.sessionId, sessionId),
      eq(chatMessages.stepId, stepId)  // Isolate by step
    )
  );
```

## Code Examples

Verified patterns from official sources:

### Complete Chat Route Handler
```typescript
// app/api/chat/route.ts
// Source: https://ai-sdk.dev/docs/getting-started/nextjs-app-router
import { streamText, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { saveMessages } from '@/lib/ai/message-persistence';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, sessionId, stepId } = await req.json();

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: 'You are a helpful design thinking facilitator.',
    messages: convertToModelMessages(messages),
  });

  // Ensure stream completes even if client disconnects
  result.consumeStream();

  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages }) => {
      await saveMessages(sessionId, stepId, messages);
    },
  });
}
```

### Complete Chat UI Component
```typescript
// components/workshop/chat-panel.tsx
'use client';
import { useChat } from '@ai-sdk/react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UIMessage } from 'ai';

interface ChatPanelProps {
  sessionId: string;
  stepId: string;
  initialMessages?: UIMessage[];
}

export function ChatPanel({ sessionId, stepId, initialMessages = [] }: ChatPanelProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { sessionId, stepId },
    initialMessages,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id} className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {message.role === 'user' ? 'U' : 'AI'}
            </div>
            <div className="flex-1">
              <div className="rounded-lg bg-muted p-3 text-sm">
                {message.parts.map((part, i) =>
                  part.type === 'text' && <span key={i}>{part.text}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-sm text-muted-foreground">AI is thinking...</div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t bg-background p-4">
        <div className="flex gap-2">
          <TextareaAutosize
            minRows={1}
            maxRows={6}
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={isLoading} size="icon">
            <Send />
          </Button>
        </div>
      </form>
    </div>
  );
}
```

### Database Schema for Chat Messages
```typescript
// src/db/schema/chat-messages.ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { sessions } from './sessions';
import { steps } from './steps';

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('msg')),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    stepId: text('step_id')
      .notNull()
      .references(() => steps.id, { onDelete: 'cascade' }),
    messageId: text('message_id').notNull(), // UIMessage.id from AI SDK
    role: text('role').notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionStepIdx: index('chat_messages_session_step_idx').on(
      table.sessionId,
      table.stepId
    ),
  })
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SSE/WebSocket streaming | Vercel AI SDK streamText | 2023-2024 | 90% less code, automatic reconnection, multi-provider |
| Manual message state management | useChat hook | 2023-2024 | No useState/useEffect chains, built-in streaming updates |
| Polling for AI responses | Native streaming | 2023+ | Real-time responses, better UX, lower latency |
| Provider-specific code (OpenAI API) | Unified AI SDK providers | 2024-2026 | Same code for OpenAI, Gemini, Anthropic, Claude |
| Client-side message storage only | onFinish callback persistence | 2024+ | Guaranteed persistence, handles stream interruption |

**Deprecated/outdated:**
- **Direct @google/generative-ai SDK for chat:** Use @ai-sdk/google instead (unified API, streaming built-in)
- **Custom ReadableStream implementations:** Use streamText (handles edge cases)
- **shadcn-chat:** No longer actively maintained (note from maintainer), build custom UI with shadcn/ui components

## Open Questions

Things that couldn't be fully resolved:

1. **Step-specific system prompts**
   - What we know: Can pass `system` parameter to streamText, different per step
   - What's unclear: Best way to manage 10+ prompt templates (files vs database vs code)
   - Recommendation: Start with TypeScript constants, move to database in MVP 1.0 when prompts stabilize

2. **Chat history scrolling behavior**
   - What we know: Need auto-scroll to bottom on new messages
   - What's unclear: Should maintain scroll position when user scrolls up to read old messages?
   - Recommendation: Implement "scroll to bottom" button when user scrolls up (standard chat UX)

3. **Gemini model selection**
   - What we know: gemini-2.0-flash is fast and cost-effective
   - What's unclear: Whether gemini-2.0-flash-thinking or gemini-2.5-flash is better for facilitation
   - Recommendation: Start with gemini-2.0-flash, benchmark quality in MVP 0.5

## Sources

### Primary (HIGH confidence)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction) - Official docs
- [Getting Started: Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) - Step-by-step setup
- [AI SDK UI: useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - Hook API reference
- [AI SDK UI: Chatbot Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence) - Persistence patterns
- [AI SDK Providers: Google Generative AI](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - Gemini provider
- [ai - npm](https://www.npmjs.com/package/ai) - Package info
- [@ai-sdk/google - npm](https://www.npmjs.com/package/@ai-sdk/google) - Gemini provider package
- [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key) - Environment setup
- [Market Research Agent with Gemini and the AI SDK](https://ai.google.dev/gemini-api/docs/vercel-ai-sdk-example) - Official Google example

### Secondary (MEDIUM confidence)
- [Real-time AI in Next.js: How to stream responses with the Vercel AI SDK](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/) - Implementation guide
- [Vercel AI SDK Complete Guide](https://dev.to/pockit_tools/vercel-ai-sdk-complete-guide-building-production-ready-ai-chat-apps-with-nextjs-4cp6) - Comprehensive tutorial
- [Using Vercel AI SDK with Google Gemini: Complete Guide](https://dev.to/buildandcodewithraman/using-vercel-ai-sdk-with-google-gemini-complete-guide-5g68) - Gemini-specific
- [Mastering Chat History & State in Next.js](https://dev.to/programmingcentral/mastering-chat-history-state-in-nextjs-the-ultimate-guide-to-building-persistent-ai-apps-maf) - Persistence patterns
- [Storing Vercel's AI SDK chat messages in a Turso database](https://turso.tech/blog/storing-vercels-ai-sdk-chat-messages-in-a-turso-database) - Database examples
- [AI SDK 5 - Vercel](https://vercel.com/blog/ai-sdk-5) - SDK updates and features
- [Streaming AI Responses: Building Real-Time Chat UIs with Vercel AI SDK](https://www.9.agency/blog/streaming-ai-responses-vercel-ai-sdk) - Best practices
- [shadcn-chat GitHub](https://github.com/jakobhoeg/shadcn-chat) - Chat UI components (unmaintained)
- [Typing Indicator - React Chat Messaging Docs](https://getstream.io/chat/docs/sdk/react/guides/customization/typing_indicator/) - UI patterns

### Tertiary (LOW confidence)
- [Gemini AI Chatbot Template with the Vercel AI SDK & Next.js](https://vercel.com/templates/next.js/gemini-ai-chatbot) - Template (not audited)
- [shadcn-chat CLI](https://shadcnstudio.com/blog/shadcn-chat-ui-example) - Unmaintained tool

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Vercel AI SDK docs, npm package pages, Google Gemini docs
- Architecture: HIGH - Official docs with code examples, verified patterns
- Pitfalls: MEDIUM-HIGH - Extrapolated from GitHub issues and community guides, not WorkshopPilot-specific

**Research date:** 2026-02-08
**Valid until:** 90 days (AI SDK updates frequently but maintains backward compatibility)

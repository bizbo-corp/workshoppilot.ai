# Tech Stack Reference

> Technical architecture and tooling for WorkshopPilot

See [[../01_Planning/Decisions/001_Tech_Stack_Choice|ADR-001]] for decision rationale.

---

## Core Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI / shadcn/ui (TBD)

### Backend
- **API**: Next.js API Routes
- **Database**: Vercel Postgres (PostgreSQL)
- **ORM**: Prisma (or Drizzle, TBD)

### Authentication
- **Provider**: Clerk
- **Features**: Email/password, role-based access

### AI
- **Provider**: Google Gemini API
- **Models**: gemini-pro (text), gemini-pro-vision (images, future)

### Deployment
- **Platform**: Vercel
- **CI/CD**: GitHub Actions (if needed)
- **Monitoring**: Vercel Analytics

---

## Development Tools

### Version Control
- **Git**: GitHub
- **Branching**: Feature branches → main
- **PR Process**: Required reviews for main

### Package Management
- **Node**: v18+ LTS
- **Package Manager**: npm or pnpm

### Code Quality
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode

### Testing
- **Unit**: Vitest or  
- **E2E**: Playwright
- **API Testing**: Supertest

---

## Infrastructure

### Database Schema
```sql
-- workshops
id, facilitator_id, template_id, created_at, status

-- workshop_sessions
id, workshop_id, participant_id, current_step, started_at, updated_at

-- step_responses
id, session_id, step_number, response_text, created_at, updated_at

-- chat_messages
id, session_id, step_number, role, content, timestamp
```

### Environment Variables
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Gemini
GEMINI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Project Structure

```
workshoppilot-app/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes
│   ├── (dashboard)/         # Facilitator dashboard
│   ├── (workshop)/          # Workshop flow
│   ├── api/                 # API routes
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                  # Base UI components
│   ├── workshop/            # Workshop-specific
│   └── dashboard/           # Dashboard-specific
├── lib/
│   ├── db/                  # Database utilities
│   ├── gemini/              # AI integration
│   ├── auth/                # Auth utilities
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Dependencies (Key Packages)

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "@clerk/nextjs": "^5.x",
    "@google/generative-ai": "^0.x",
    "@vercel/postgres": "^0.x",
    "prisma": "^5.x",
    "@prisma/client": "^5.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

---

## API Integrations

### Clerk Authentication
```typescript
import { auth, currentUser } from '@clerk/nextjs';

// In API routes
const { userId } = auth();

// Get full user
const user = await currentUser();

// Check role
const role = user?.publicMetadata?.role;
```

### Gemini API
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const result = await model.generateContent(prompt);
```

### Database (Prisma)
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Query example
const session = await prisma.workshopSession.findUnique({
  where: { id: sessionId },
  include: { stepResponses: true }
});
```

---

## Deployment

### Vercel Setup
1. Connect GitHub repo
2. Add environment variables
3. Configure build settings (auto-detected)
4. Deploy on push to main

### Environment Tiers
- **Development**: Local (localhost:3000)
- **Preview**: Vercel preview deployments (per PR)
- **Production**: workshoppilot.vercel.app (or custom domain)

---

## Performance Considerations

### Optimization
- Server Components by default
- Dynamic imports for heavy components
- Image optimization with next/image
- Edge functions for API routes where possible

### Monitoring
- Vercel Analytics for metrics
- Error tracking (Sentry, future)
- Database query optimization (Prisma logs)

---

## Security

### Best Practices
- No secrets in client code
- Environment variables for sensitive data
- CSRF protection (Next.js built-in)
- SQL injection prevention (Prisma)
- XSS protection (React built-in)
- Rate limiting on API routes (future)

### Role-Based Access
```typescript
// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/"],
  ignoredRoutes: ["/api/webhooks(.*)"],
});

// API routes
if (user?.publicMetadata?.role !== 'facilitator') {
  return new Response('Forbidden', { status: 403 });
}
```

---

## Migration Path

If we need to migrate away from current stack:

**From Vercel** → Any Node.js host (AWS, Railway, etc.)
**From Clerk** → Auth.js or custom auth
**From Gemini** → OpenAI, Claude, or other LLM
**From Vercel Postgres** → Any PostgreSQL instance

---

## Documentation Links

- [Next.js Docs](https://nextjs.org/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)

---

## Updates

| Date | Change | Reason |
|------|--------|--------|
| 2025-02-06 | Initial stack defined | MVP 0.5 start |
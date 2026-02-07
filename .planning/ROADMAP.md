# Roadmap: WorkshopPilot.ai - MVP 0.5

## Overview

MVP 0.5 establishes the application shell — a working skeleton of the 10-step design thinking workshop platform. Starting from the existing Next.js scaffold, we'll layer authentication, database persistence, application structure with all 10 step containers, navigation flow, basic AI chat, and deploy to production. This shell validates the technical stack (Clerk + Neon + Gemini + Drizzle) and provides a foundation for MVP 1.0's AI facilitation features.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Database** - Database schema, Neon connection, Drizzle ORM setup
- [x] **Phase 2: Authentication & Roles** - Clerk integration, user flows, role-based access
- [ ] **Phase 3: Application Shell** - App structure, 10 step containers, routing
- [ ] **Phase 4: Navigation & State** - Stepper UI, progress tracking, sequential flow
- [ ] **Phase 5: AI Chat Integration** - Gemini API, chat interface, streaming responses
- [ ] **Phase 6: Production Deployment** - Environment config, Vercel deployment, domain setup

## Phase Details

### Phase 1: Foundation & Database

**Goal**: Database schema defined, Neon Postgres connected, edge-compatible persistence layer working

**Depends on**: Nothing (first phase)

**Requirements**: DATA-01, DATA-02, DATA-03

**Success Criteria** (what must be TRUE):

1. Neon Postgres database exists and accepts connections from local development
2. Drizzle ORM schema defines core tables (users, workshops, sessions, steps, messages)
3. Database queries execute successfully in Vercel serverless environment using edge-compatible driver
4. Migrations run successfully and schema matches code definitions

**Plans**: 3 plans

Plans:

- [x] 01-01-PLAN.md — Install deps, configure Drizzle Kit, create db client and ID utility
- [x] 01-02-PLAN.md — Define all table schemas, relations, indexes, and TypeScript types
- [x] 01-03-PLAN.md — Push schema to Neon, seed step definitions, health check endpoint

### Phase 2: Authentication & Roles

**Goal**: Users can sign up, sign in, and access role-appropriate routes with session persistence

**Depends on**: Phase 1

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05

**Success Criteria** (what must be TRUE):

1. User can create account via Clerk using email and password
2. User can sign in and their session persists across browser refresh
3. User is assigned either facilitator or participant role during signup
4. Facilitator can access /admin routes while participant cannot
5. Unauthenticated users attempting to access /workshop routes are redirected to sign-in

**Plans**: 4 plans

Plans:

- [x] 02-01-PLAN.md — Install Clerk SDK, create users DB schema, configure ClerkProvider and middleware
- [x] 02-02-PLAN.md — Create Clerk webhook endpoint for user sync and role management utilities
- [x] 02-03-PLAN.md — Build auth modal components (sign-in, sign-up, auth wall)
- [x] 02-04-PLAN.md — Wire route pages, header, anonymous sessions, and verify end-to-end auth flow

### Phase 3: Application Shell

**Goal**: Complete app layout with header, sidebar, and all 10 design thinking step pages routable and visible

**Depends on**: Phase 2

**Requirements**: SCAF-01, SCAF-02, SCAF-03, SCAF-04, STEP-01, STEP-02, STEP-03

**Success Criteria** (what must be TRUE):

1. Landing page displays with working "Start Workshop" button that creates session
2. Workshop pages follow /workshop/[sessionId]/step/[stepId] routing pattern
3. App shell renders with header (logo, user menu), sidebar (step list), and main content area on all pages
4. All 10 design thinking steps exist as separate pages with step number, name, and placeholder content
5. Step content areas are structured containers ready to receive AI chat and form components

**Plans**: TBD

Plans:

- [ ] TBD (to be defined during planning)

### Phase 4: Navigation & State

**Goal**: Users can move forward/backward through steps with visual progress tracking and sequential enforcement

**Depends on**: Phase 3

**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05

**Success Criteria** (what must be TRUE):

1. Linear stepper/progress bar displays all 10 steps showing current position
2. Steps show visual states: complete (checkmark), current (highlighted), upcoming (disabled/grayed)
3. User can click "Next" button to advance to the next step in sequence
4. User can click "Back" button to return to the previous step
5. User cannot skip ahead to uncompleted steps (clicking disabled steps does nothing)
6. Step completion state persists when user navigates away and returns

**Plans**: TBD

Plans:

- [ ] TBD (to be defined during planning)

### Phase 5: AI Chat Integration

**Goal**: Gemini API connected with working chat interface streaming responses at each step

**Depends on**: Phase 4

**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04

**Success Criteria** (what must be TRUE):

1. Gemini API successfully processes requests via Vercel AI SDK with streaming enabled
2. Chat interface component renders with message input, send button, and scrollable message history
3. Chat UI appears at every step (same generic AI, not step-specific prompts yet)
4. User types message and sees AI response stream in progressively (typing indicator during generation)
5. Chat history persists within current session when navigating between steps

**Plans**: TBD

Plans:

- [ ] TBD (to be defined during planning)

### Phase 6: Production Deployment

**Goal**: Application deployed to Vercel with domain configured and all services connected in production

**Depends on**: Phase 5

**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03

**Success Criteria** (what must be TRUE):

1. Application deploys successfully from main branch to Vercel on every push
2. Environment variables for Clerk, Neon, and Gemini API are configured in Vercel project settings
3. Application is accessible at workshoppilot.ai domain with HTTPS
4. All features work in production: authentication, database queries, AI chat streaming
5. No console errors or broken functionality visible to end users

**Plans**: TBD

Plans:

- [ ] TBD (to be defined during planning)

## Progress

**Execution Order:**

Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase                     | Plans Complete | Status      | Completed |
| ------------------------- | -------------- | ----------- | --------- |
| 1. Foundation & Database  | 3/3            | ✓ Complete  | 2026-02-07 |
| 2. Authentication & Roles | 4/4            | ✓ Complete  | 2026-02-07 |
| 3. Application Shell      | 0/TBD          | Not started | -         |
| 4. Navigation & State     | 0/TBD          | Not started | -         |
| 5. AI Chat Integration    | 0/TBD          | Not started | -         |
| 6. Production Deployment  | 0/TBD          | Not started | -         |

---

*Roadmap created: 2026-02-07*

*Milestone: MVP 0.5 — Application Shell*

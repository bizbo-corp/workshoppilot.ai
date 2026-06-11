# Phase 3: Application Shell - Research

**Researched:** 2026-02-07
**Domain:** Next.js App Router layouts, responsive UI components, client-server state management
**Confidence:** HIGH

## Summary

Phase 3 creates the complete application shell for WorkshopPilot's 10-step design thinking workshop experience. The research focused on Next.js App Router patterns for nested layouts and dynamic routes, responsive sidebar/navigation patterns (Linear-style), resizable split panels for chat/output areas, and handling client-side state persistence without hydration errors.

The standard approach uses Next.js 16's App Router with layout nesting, shadcn/ui components (sidebar, dialog, resizable panels), and Tailwind 4's dark mode with CSS variables. Key challenges include localStorage hydration (solved with useEffect guards), smooth page transitions (Framer Motion with template.tsx), and mobile-first responsive patterns (collapsible sidebar + horizontal stepper).

**Primary recommendation:** Use shadcn/ui Sidebar component with built-in state management, react-resizable-panels for chat/output split, and implement hydration-safe localStorage with useEffect guards. Avoid building custom collapsible sidebar logic—shadcn already handles responsive behavior, keyboard shortcuts, and persistence patterns.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Workshop Layout:**
- Sidebar is **collapsible** (not always-visible)
- Sidebar shows **step number + name only** (no descriptions) — status shown by color/icon
- Sidebar is a **flat list** of all 10 steps (no grouping by design thinking phase)
- Sidebar collapse/expand via **toggle button + keyboard shortcut** (e.g., Cmd+B)
- Sidebar **collapsed/expanded state persists in localStorage** across sessions
- On mobile: **top stepper bar** — compact horizontal progress indicator, tap to expand full step list
- Header **scrolls away** with content (not sticky/fixed)
- Header contains: **logo + workshop name + step indicator + user menu**
- When sidebar is collapsed, **header step indicator is sufficient** — no icon rail needed
- Explicit **'Exit Workshop' button** in header (not logo click) to return to dashboard
- Exit workshop shows **confirmation dialog**: "Are you sure? Your progress is saved."
- Main content area is **full width** (no max-width cap) — stretches to fill available space
- Visual style: **Clean & minimal (Linear-like)** — subtle borders, muted colors, whitespace
- **Dark mode + light mode from the start** — CSS variables / Tailwind dark: classes
- Separate header components for **landing page vs workshop** (not a shared adaptive header)

**Step Containers:**
- Placeholder shows **step number + name + brief description** of what the step does
- All steps have **uniform visual treatment** (no per-step color accents)
- Step page includes a **real chat shell placeholder** — actual input box (disabled) + empty message area
- Disabled input shows **placeholder text**: "AI facilitation coming soon..."
- Step page has **side-by-side split**: chat area on left, output panel on right
- Split divider is **resizable** (user can drag to adjust proportions)
- On mobile: **stacked layout** — chat on top, outputs below (scroll to see both)
- Output panel shows **step-specific mock content** — each step previews its output type (e.g., Empathize shows mock persona, Ideate shows mock ideas list)
- Step descriptions are **hardcoded in component** (not fetched from DB step_definitions)

**Session Creation Flow:**
- Clicking 'Start Workshop' goes **straight into Step 1** — no naming dialog
- Workshop **auto-named by AI from first message** — generates a meaningful name from the user's idea
- Before AI naming, workshop appears as **'New Workshop'** in dashboard
- URL uses session ID: `/workshop/ses_abc123/step/1`
- Session **created immediately in DB** when 'Start Workshop' is clicked (not deferred)
- Brief **loading screen**: "Setting up your workshop..." with animation (1-2 seconds)
- **Anonymous users can start** workshops — auth wall appears at step 4 (per Phase 2 decisions)
- Users can have **multiple workshops** in progress simultaneously
- Dashboard primary CTA: **'Continue' most recent workshop** — 'Start New' is secondary
- Workshop cards show: **name + current step + last active** (e.g., "Pet Adoption App — Step 3: Ideate — 2 days ago")
- User can **rename workshop** from dashboard or header (inline edit, click the name)

**Landing → Workshop Transition:**
- **Smooth morph** transition — landing page elements animate into workshop layout positions
- Resuming from dashboard also shows **brief loading screen**: "Resuming your workshop..."
- Landing page and workshop have **separate header components** (different contexts)

**Integration of Chat Area:**
- Chat and output panel are **equal split (50/50)** by default (user can resize)
- Chat input is an **expanding textarea** — starts single line, grows as user types
- **AI greeting per step** — pre-populated welcome message specific to each step
- Send behavior: **Enter sends, Shift+Enter for newline** (standard chat pattern)

### Claude's Discretion

- Sidebar width (narrow ~240px vs medium ~320px)
- Exact loading screen animation style
- Smooth morph transition implementation details
- Typography and spacing specifics
- Error state handling throughout
- Loading skeleton designs
- Mobile breakpoint thresholds
- Keyboard shortcut for sidebar toggle (suggested Cmd+B but flexible)

### Deferred Ideas (OUT OF SCOPE)

- Workshop delete/archive from dashboard — future phase
- Workshop management features (bulk actions, search, filtering) — future phase

</user_constraints>

---

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui | Latest | Pre-built React components (Sidebar, Dialog, Resizable) | Industry standard for Next.js projects, zero-dependency (code copied to your project), accessible by default, works with Tailwind |
| react-resizable-panels | Latest | Resizable split panels with drag handles | Most popular resizable panel library (by Brian Vaughn), built-in accessibility, smooth animations, supports persistence |
| Tailwind CSS 4 | 4.x | Styling with dark mode support | Already in project, CSS variables for theming, built-in dark: variant |
| Framer Motion | Latest | Page transitions and smooth morphs | Production-ready animation library for React, layout animations with layoutId for shared elements |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hotkeys-hook | Latest | Keyboard shortcut management | Implementing Cmd+B sidebar toggle, scoped shortcuts per page |
| react-textarea-autosize | Latest | Auto-expanding textarea | ChatGPT-style input that grows with content |
| next-themes | Latest | Dark mode toggle with system preference | Manages dark/light/system modes with localStorage persistence |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui Sidebar | Custom CSS + Zustand | Custom gives full control but misses accessibility patterns, keyboard nav, and requires implementing responsive behavior from scratch |
| react-resizable-panels | react-split-pane | Split-pane is older library (less maintained), resizable-panels has better accessibility and keyboard support |
| Framer Motion | CSS transitions | CSS is lighter but lacks layout animation features (layoutId for shared element transitions) |
| react-hotkeys-hook | Custom useEffect | Custom is simpler for single shortcut but doesn't handle conflicts, scoping, or platform differences (Mac/Windows) |

**Installation:**

```bash
# shadcn/ui components (copies code to project)
npx shadcn@latest add sidebar dialog resizable

# Additional libraries
npm install react-resizable-panels framer-motion react-hotkeys-hook react-textarea-autosize next-themes
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (html, body, providers)
│   ├── page.tsx                      # Landing page
│   ├── dashboard/
│   │   └── page.tsx                  # Dashboard with workshop cards
│   └── workshop/
│       └── [sessionId]/
│           ├── layout.tsx            # Workshop shell (sidebar, header)
│           └── step/
│               └── [stepId]/
│                   └── page.tsx      # Individual step page
├── components/
│   ├── layout/
│   │   ├── landing-header.tsx       # Landing page header
│   │   ├── workshop-header.tsx      # Workshop header with exit button
│   │   ├── workshop-sidebar.tsx     # Collapsible sidebar with steps
│   │   └── mobile-stepper.tsx       # Horizontal stepper for mobile
│   ├── workshop/
│   │   ├── step-container.tsx       # Step layout wrapper
│   │   ├── chat-panel.tsx           # Chat area with expanding textarea
│   │   ├── output-panel.tsx         # Step-specific output display
│   │   └── step-content/
│   │       ├── empathize.tsx        # Mock content for step 1
│   │       ├── define.tsx           # Mock content for step 2
│   │       └── ...                  # One per step
│   ├── dialogs/
│   │   └── exit-workshop-dialog.tsx # Confirmation dialog
│   └── ui/                          # shadcn components
│       ├── sidebar.tsx
│       ├── dialog.tsx
│       ├── resizable.tsx
│       └── ...
├── hooks/
│   ├── use-local-storage.ts         # Hydration-safe localStorage hook
│   ├── use-sidebar-state.ts         # Sidebar collapse state management
│   └── use-keyboard-shortcut.ts     # Keyboard shortcut wrapper
├── lib/
│   ├── workshop-transitions.ts      # Framer Motion animation configs
│   └── step-metadata.ts             # Step names, descriptions, order
└── actions/
    └── workshop-actions.ts          # Server Actions for session creation
```

### Pattern 1: Next.js App Router Layout Nesting

**What:** Layouts automatically nest and wrap child routes via `children` prop. Root layout defines `<html>` and `<body>`, nested layouts add structure without re-rendering on navigation.

**When to use:** Workshop layout wraps all step pages, providing persistent sidebar and header while step content changes.

**Example:**

```typescript
// app/workshop/[sessionId]/layout.tsx
import { WorkshopSidebar } from '@/components/layout/workshop-sidebar';
import { WorkshopHeader } from '@/components/layout/workshop-header';

export default function WorkshopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { sessionId: string };
}) {
  return (
    <div className="flex h-screen">
      <WorkshopSidebar sessionId={params.sessionId} />
      <div className="flex flex-1 flex-col">
        <WorkshopHeader sessionId={params.sessionId} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Key insight:** Layout doesn't re-render when navigating between steps, keeping sidebar state intact.

### Pattern 2: Hydration-Safe localStorage

**What:** Accessing localStorage during SSR causes hydration errors. Use `useEffect` to defer access until client-side hydration completes.

**When to use:** Persisting sidebar collapse state, theme preference, panel sizes.

**Example:**

```typescript
// hooks/use-local-storage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only runs on client after hydration
    const stored = localStorage.getItem(key);
    if (stored) {
      setValue(JSON.parse(stored));
    }
    setIsLoading(false);
  }, [key]);

  const updateValue = (newValue: T) => {
    setValue(newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, updateValue, isLoading] as const;
}
```

**Usage:**

```typescript
function WorkshopSidebar() {
  const [isCollapsed, setIsCollapsed, isLoading] = useLocalStorage('sidebar-collapsed', false);

  if (isLoading) {
    return <SidebarSkeleton />; // Avoid hydration mismatch
  }

  return <Sidebar collapsed={isCollapsed} onToggle={setIsCollapsed} />;
}
```

### Pattern 3: Resizable Split Panel with Persistence

**What:** Use `react-resizable-panels` with `defaultLayout` prop to restore saved panel sizes.

**When to use:** Chat/output split that remembers user's preferred proportions.

**Example:**

```typescript
// components/workshop/step-container.tsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChatPanel } from './chat-panel';
import { OutputPanel } from './output-panel';

export function StepContainer({ stepId }: { stepId: string }) {
  const [layout, setLayout] = useLocalStorage<number[]>(
    `step-${stepId}-layout`,
    [50, 50] // Default 50/50 split
  );

  return (
    <PanelGroup
      direction="horizontal"
      onLayout={setLayout}
      className="h-full"
    >
      <Panel defaultSize={layout[0]} minSize={30}>
        <ChatPanel stepId={stepId} />
      </Panel>

      <PanelResizeHandle className="w-px bg-border hover:w-1 hover:bg-accent transition-all" />

      <Panel defaultSize={layout[1]} minSize={30}>
        <OutputPanel stepId={stepId} />
      </Panel>
    </PanelGroup>
  );
}
```

### Pattern 4: Mobile-First Responsive Sidebar

**What:** shadcn/ui Sidebar component handles mobile/desktop automatically through `useSidebar` hook's `isMobile` property.

**When to use:** Workshop sidebar that collapses to sheet on mobile.

**Example:**

```typescript
// components/layout/workshop-sidebar.tsx
import { Sidebar, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { MobileStepper } from './mobile-stepper';

export function WorkshopSidebar({ steps }: { steps: Step[] }) {
  const { isMobile } = useSidebar();

  if (isMobile) {
    return <MobileStepper steps={steps} />;
  }

  return (
    <Sidebar>
      <SidebarContent>
        {steps.map((step) => (
          <SidebarMenuItem key={step.id}>
            <Link href={`/workshop/${sessionId}/step/${step.order}`}>
              {step.order}. {step.name}
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
```

### Pattern 5: Server Action for Session Creation

**What:** Use Server Actions for database writes from client components, invoked from button `onClick` or form submission.

**When to use:** Creating session when user clicks "Start Workshop".

**Example:**

```typescript
// actions/workshop-actions.ts
'use server';

import { db } from '@/db/client';
import { workshops, sessions, workshopSteps } from '@/db/schema';
import { createPrefixedId } from '@/lib/ids';
import { redirect } from 'next/navigation';

export async function createWorkshopSession(userId: string | null) {
  // Create workshop
  const workshopId = createPrefixedId('ws');
  await db.insert(workshops).values({
    id: workshopId,
    userId: userId, // null for anonymous
    name: 'New Workshop', // AI will rename later
  });

  // Create session
  const sessionId = createPrefixedId('ses');
  await db.insert(sessions).values({
    id: sessionId,
    workshopId,
  });

  // Initialize all 10 steps as not_started
  const stepIds = ['empathize', 'define', 'ideate', ...]; // All 10 steps
  await db.insert(workshopSteps).values(
    stepIds.map(stepId => ({
      workshopId,
      stepId,
      status: 'not_started',
    }))
  );

  // Redirect to step 1
  redirect(`/workshop/${sessionId}/step/1`);
}
```

**Usage in client component:**

```typescript
'use client';

import { createWorkshopSession } from '@/actions/workshop-actions';
import { useUser } from '@clerk/nextjs';

export function StartWorkshopButton() {
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await createWorkshopSession(user?.id || null);
    });
  };

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Setting up...' : 'Start Workshop'}
    </button>
  );
}
```

### Pattern 6: Framer Motion Shared Element Transition

**What:** Use `layoutId` prop to animate elements between pages (e.g., landing page elements morph into workshop header).

**When to use:** Smooth landing → workshop transition.

**Example:**

```typescript
// app/page.tsx (Landing)
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <motion.div layoutId="workshop-logo">
      <Logo />
    </motion.div>
  );
}

// app/workshop/[sessionId]/layout.tsx (Workshop)
import { motion } from 'framer-motion';

export default function WorkshopLayout({ children }) {
  return (
    <motion.header layoutId="workshop-logo">
      <Logo size="sm" />
    </motion.header>
  );
}
```

**Note:** Requires wrapping layouts in `<AnimatePresence>` and using `template.tsx` for per-route animations.

### Anti-Patterns to Avoid

- **Direct localStorage access in render:** Causes hydration errors. Always use `useEffect` or custom hooks that defer to client-side.
- **Building custom sidebar from scratch:** shadcn/ui Sidebar already handles collapse state, mobile behavior, keyboard shortcuts, and accessibility. Don't reinvent.
- **Hardcoding step data in sidebar:** Fetch from database `step_definitions` table for order, names. Only descriptions can be hardcoded in step pages (per user decision).
- **Using middleware for layout logic:** Middleware is for auth/redirects, not UI structure. Layouts are the right place for shells.
- **Sticky header with App Router:** Scrolling headers require careful coordination with layout heights. Use fixed positioning only if absolutely needed.

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable panels | Custom drag handlers with mouse events | react-resizable-panels | Handles touch devices, accessibility (keyboard resize), constraints (min/max), snap points, and layout persistence. Custom solutions miss edge cases like nested resizing and pointer capture. |
| Keyboard shortcuts | useEffect with keydown listener | react-hotkeys-hook | Handles platform differences (Cmd vs Ctrl), scope management (global vs component), conflicts, and key combos. Custom solutions don't handle modifier keys correctly or prevent default browser shortcuts. |
| Auto-expanding textarea | Manually adjust height with scrollHeight | react-textarea-autosize | Handles dynamic font sizes, padding, border-box sizing, React 18+ rendering quirks, and server-side rendering. Naive implementations flicker or miscalculate height. |
| Dark mode toggle | Manual class manipulation on `<html>` | next-themes | Manages system preference detection, localStorage persistence, flash prevention (FOUC), and hydration sync. Custom solutions flash on page load. |
| Confirmation dialogs | State + conditional render | shadcn/ui Dialog with useActionState | Handles focus trap, Escape key, click outside, accessibility (ARIA), and keyboard navigation. Custom modals often fail WCAG compliance. |
| Collapsible sidebar | Zustand + CSS transitions | shadcn/ui Sidebar | Handles mobile sheet behavior, collapse animations, keyboard shortcuts (Cmd+B), accessible buttons, and state persistence. Custom sidebars miss responsive patterns and a11y. |

**Key insight:** React 19 + Next.js 16 have matured patterns for these common UI problems. Time spent building custom is better spent on domain-specific features (AI facilitation, workshop logic). Use libraries for infrastructure.

---

## Common Pitfalls

### Pitfall 1: localStorage Hydration Errors

**What goes wrong:** Accessing `localStorage` during server-side rendering or before hydration completes causes "Text content does not match" errors. The server renders with default values, but client tries to use stored values immediately.

**Why it happens:** Next.js pre-renders pages on the server where `localStorage` doesn't exist. React compares server HTML with client render, detects mismatch.

**How to avoid:**
1. Use `useEffect` to defer localStorage access until after hydration
2. Return a loading skeleton during hydration to avoid mismatch
3. Use `suppressHydrationWarning` only on leaf elements (sparingly)

**Warning signs:**
- Console errors: "Warning: Text content did not match"
- Flashing content on page load
- Components showing default values briefly before updating

**Example:**

```typescript
// BAD: Causes hydration error
function Sidebar() {
  const isCollapsed = localStorage.getItem('collapsed') === 'true'; // ❌ Runs on server
  return <div>{isCollapsed ? 'Collapsed' : 'Expanded'}</div>;
}

// GOOD: Hydration-safe
function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsCollapsed(localStorage.getItem('collapsed') === 'true');
    setIsHydrated(true);
  }, []);

  if (!isHydrated) return <SidebarSkeleton />; // Matches server render

  return <div>{isCollapsed ? 'Collapsed' : 'Expanded'}</div>;
}
```

### Pitfall 2: Layout Re-Rendering on Navigation

**What goes wrong:** Workshop sidebar state resets when navigating between steps. User collapses sidebar on step 2, navigates to step 3, sidebar is expanded again.

**Why it happens:** Using `page.tsx` to render the sidebar instead of `layout.tsx`. Pages re-render on navigation, layouts don't.

**How to avoid:**
1. Place persistent UI (sidebar, header) in `layout.tsx`, not `page.tsx`
2. Use layouts for shells, pages for content
3. Lift state to layout level or use URL state for cross-page data

**Warning signs:**
- UI resets when navigating
- Animations replay on every page change
- State management feels complex (fighting against framework)

**Example:**

```typescript
// BAD: Sidebar in page (re-renders on navigation)
// app/workshop/[sessionId]/step/[stepId]/page.tsx
export default function StepPage() {
  return (
    <div>
      <Sidebar /> {/* ❌ Resets on navigation */}
      <StepContent />
    </div>
  );
}

// GOOD: Sidebar in layout (persists across navigation)
// app/workshop/[sessionId]/layout.tsx
export default function WorkshopLayout({ children }) {
  return (
    <div>
      <Sidebar /> {/* ✅ Persists across steps */}
      {children}
    </div>
  );
}
```

### Pitfall 3: Mobile Touch Targets Too Small

**What goes wrong:** Resizable panel handle is 1px wide (looks nice) but users can't grab it on mobile. Sidebar toggle button is 24x24px, too small for fingers.

**Why it happens:** Designing for desktop cursor (precise) without considering touch input (imprecise, finger-sized).

**How to avoid:**
1. Minimum 44x44px touch targets (Apple HIG, WCAG 2.5.5)
2. Add invisible padding around small interactive elements
3. Use larger handles on mobile (detect with media queries or JS)

**Warning signs:**
- Users complaining "I can't grab the divider"
- High tap miss rate in analytics
- Accessibility audits failing 2.5.5 (Target Size)

**Example:**

```typescript
// BAD: 1px handle (looks nice, can't touch)
<PanelResizeHandle className="w-px bg-border" />

// GOOD: Visual handle with touch padding
<PanelResizeHandle className="group w-px bg-border relative">
  {/* Visual indicator */}
  <div className="absolute inset-y-0 left-0 w-px bg-border" />

  {/* Invisible touch target (24px total) */}
  <div className="absolute inset-y-0 -left-3 -right-3 w-6" />

  {/* Visual feedback on hover/active */}
  <div className="absolute inset-y-0 left-0 w-1 bg-accent opacity-0 group-hover:opacity-100 group-active:opacity-100" />
</PanelResizeHandle>
```

### Pitfall 4: Confirmation Dialog Prevents Exit (Dialog Fatigue)

**What goes wrong:** Showing "Are you sure?" dialog for every action trains users to click "OK" without reading. When an important warning appears, they click through it.

**Why it happens:** Over-applying confirmation dialogs to low-risk or reversible actions.

**How to avoid:**
1. Only confirm destructive, irreversible actions
2. Use undo patterns for reversible actions (toast with "Undo" button)
3. Make confirmation text specific, not generic ("Delete 'Project X'" not "Are you sure?")

**Warning signs:**
- Users complaining about "too many popups"
- Analytics show <1 second between dialog open and confirmation
- Confirmation dialogs being ignored (still submit support tickets)

**Example:**

```typescript
// BAD: Confirming exit even though progress is saved
function ExitButton() {
  return (
    <Dialog>
      <DialogTrigger>Exit Workshop</DialogTrigger>
      <DialogContent>
        <DialogTitle>Are you sure?</DialogTitle> {/* ❌ Generic, scary */}
        <DialogDescription>Do you want to leave?</DialogDescription>
        <Button variant="destructive">Yes</Button> {/* ❌ Red = danger */}
      </DialogContent>
    </Dialog>
  );
}

// GOOD: Reassuring message, not scary
function ExitButton() {
  return (
    <Dialog>
      <DialogTrigger>Exit Workshop</DialogTrigger>
      <DialogContent>
        <DialogTitle>Return to Dashboard</DialogTitle> {/* ✅ Clear, safe */}
        <DialogDescription>
          Your progress is saved automatically. You can continue this workshop anytime.
        </DialogDescription>
        <Button variant="default">Return to Dashboard</Button> {/* ✅ Normal color */}
        <Button variant="ghost">Stay in Workshop</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Pitfall 5: Using `redirect()` in Client Component Event Handlers

**What goes wrong:** Calling `redirect()` from a button's `onClick` handler throws an error. `redirect()` only works in Server Components and Server Actions.

**Why it happens:** Misunderstanding Next.js routing boundaries. `redirect()` throws a special error caught by Next.js during rendering, not at runtime.

**How to avoid:**
1. Use `useRouter()` from `next/navigation` for client-side navigation
2. Use `router.push()` for normal navigation (adds history entry)
3. Use `router.replace()` for redirects (no history entry)
4. Use `redirect()` only in Server Components and Server Actions

**Warning signs:**
- Runtime errors: "NEXT_REDIRECT is not a valid runtime error"
- Navigation not working from client components
- Trying to use `redirect()` in `useEffect` or event handlers

**Example:**

```typescript
// BAD: redirect() in client component
'use client';
import { redirect } from 'next/navigation';

function ExitButton() {
  const handleClick = () => {
    redirect('/dashboard'); // ❌ Throws error
  };
  return <button onClick={handleClick}>Exit</button>;
}

// GOOD: useRouter() for client-side navigation
'use client';
import { useRouter } from 'next/navigation';

function ExitButton() {
  const router = useRouter();
  const handleClick = () => {
    router.push('/dashboard'); // ✅ Works in client component
  };
  return <button onClick={handleClick}>Exit</button>;
}
```

---

## Code Examples

Verified patterns from official sources:

### Dynamic Route with Params

```typescript
// app/workshop/[sessionId]/step/[stepId]/page.tsx
// Source: https://nextjs.org/docs/app/getting-started/layouts-and-pages

type StepPageProps = {
  params: Promise<{ sessionId: string; stepId: string }>;
};

export default async function StepPage({ params }: StepPageProps) {
  const { sessionId, stepId } = await params;

  // Fetch step data
  const step = await getStepData(sessionId, stepId);

  return (
    <StepContainer step={step}>
      <ChatPanel />
      <OutputPanel />
    </StepContainer>
  );
}
```

### Keyboard Shortcut with react-hotkeys-hook

```typescript
// components/layout/workshop-sidebar.tsx
// Source: https://react-hotkeys-hook.vercel.app/

import { useHotkeys } from 'react-hotkeys-hook';

export function WorkshopSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Cmd+B on Mac, Ctrl+B on Windows
  useHotkeys('mod+b', () => setIsCollapsed(prev => !prev), {
    preventDefault: true,
    description: 'Toggle sidebar',
  });

  return <Sidebar collapsed={isCollapsed} />;
}
```

### Auto-Expanding Textarea

```typescript
// components/workshop/chat-panel.tsx
// Source: https://www.npmjs.com/package/react-textarea-autosize

import TextareaAutosize from 'react-textarea-autosize';

export function ChatPanel() {
  return (
    <TextareaAutosize
      placeholder="AI facilitation coming soon..."
      disabled
      minRows={1}
      maxRows={6}
      className="w-full resize-none rounded-lg border p-3"
    />
  );
}
```

### Dark Mode Toggle with next-themes

```typescript
// app/layout.tsx
// Source: https://github.com/pacocoursey/next-themes

import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// components/theme-toggle.tsx
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Dark Mode
    </button>
  );
}
```

### Server Action Form Submission

```typescript
// actions/workshop-actions.ts
// Source: https://nextjs.org/docs/app/getting-started/updating-data

'use server';

export async function updateWorkshopName(workshopId: string, name: string) {
  await db
    .update(workshops)
    .set({ name })
    .where(eq(workshops.id, workshopId));

  revalidatePath(`/dashboard`);
}

// components/workshop/rename-dialog.tsx
'use client';
import { useActionState } from 'react';

export function RenameDialog({ workshopId, currentName }) {
  const [state, formAction, isPending] = useActionState(
    async (prevState, formData: FormData) => {
      const name = formData.get('name') as string;
      await updateWorkshopName(workshopId, name);
      return { success: true };
    },
    { success: false }
  );

  return (
    <form action={formAction}>
      <input name="name" defaultValue={currentName} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router + getServerSideProps | App Router + async components | Next.js 13 (stable in 14) | Simplified data fetching, better TypeScript support, automatic loading states |
| Global state (Redux, Zustand) for sidebar | shadcn/ui Sidebar with built-in state | 2024 | No need for global state, hooks provide scoped state, better encapsulation |
| CSS-in-JS for dark mode | Tailwind dark: variant | Tailwind 3 | Simpler, no runtime JS for theming, better performance |
| Manual layout animations | Framer Motion layoutId | Framer Motion 5+ | Shared element transitions without manual coordinate calculation |
| useEffect for keyboard shortcuts | react-hotkeys-hook | 2023+ | Platform-aware (Mac/Win), scope management, better DX |
| Custom resize logic | react-resizable-panels | 2022+ | Built-in accessibility, persistence, touch support |

**Deprecated/outdated:**

- **next/router (Pages Router):** Use `next/navigation` with App Router. Pages Router still supported but App Router is the future.
- **Manually checking window.matchMedia for dark mode:** Use `next-themes` which handles SSR, hydration, and system preference tracking.
- **react-split-pane:** Unmaintained since 2020. Use `react-resizable-panels` instead.
- **Inline styles for responsive UI:** Tailwind 4 responsive variants (`sm:`, `md:`, `lg:`) are more maintainable and smaller bundles.

---

## Open Questions

Things that couldn't be fully resolved:

1. **Smooth morph transition between landing and workshop**
   - What we know: Framer Motion `layoutId` enables shared element transitions. Requires `AnimatePresence` wrapper and matching elements between pages.
   - What's unclear: How to coordinate transition timing with Next.js App Router route changes. `template.tsx` may be needed but has hydration implications.
   - Recommendation: Prototype with Framer Motion. If complex, simplify to fade transition (acceptable UX, less risk). Mark as LOW confidence until tested.

2. **Mobile stepper expandability**
   - What we know: User wants top stepper bar on mobile that can expand to show full step list.
   - What's unclear: Best pattern for "tap to expand" — sheet overlay, dropdown, or accordion?
   - Recommendation: Use shadcn/ui Sheet component triggered by stepper bar tap. Allows full-screen step selection without blocking content.

3. **Loading screen animation style**
   - What we know: User wants 1-2 second loading screen with animation during session creation.
   - What's unclear: Animation style (spinner, skeleton, progress bar, branded animation).
   - Recommendation: Simple spinner with "Setting up your workshop..." text. Branded animation can be added in polish phase. Use `next/navigation`'s `useTransition` for loading state.

4. **Step-specific mock output content**
   - What we know: Each step should show preview of what output looks like (personas, problem statements, ideas).
   - What's unclear: Level of detail for mock content. Realistic vs generic placeholder?
   - Recommendation: Generic but structured placeholders (enough to show layout, not full content). Example: "Persona Name" + bullet points, not full persona description.

---

## Sources

### Primary (HIGH confidence)

- [Next.js Official Docs: Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) - App Router patterns, layout nesting
- [Next.js Official Docs: Updating Data](https://nextjs.org/docs/app/getting-started/updating-data) - Server Actions for form submission
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode) - Dark mode configuration with CSS variables
- [shadcn/ui Sidebar Documentation](https://ui.shadcn.com/docs/components/radix/sidebar) - Sidebar component API and features
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Resizable panels API and examples
- [Framer Motion Layout Animations](https://motion.dev/docs/react-layout-animations) - layoutId and shared element transitions

### Secondary (MEDIUM confidence)

- [Next.js App Router Common Mistakes (Vercel)](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) - Layout patterns and pitfalls
- [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error) - Official hydration troubleshooting
- [UX Planet: Sidebar Design Best Practices](https://uxplanet.org/best-ux-practices-for-designing-a-sidebar-9174ee0ecaa2) - Sidebar UX patterns
- [UX Planet: Confirmation Dialogs Without Irritation](https://uxplanet.org/confirmation-dialogs-how-to-design-dialogues-without-irritation-7b4cf2599956) - Confirmation dialog UX guidance
- [shadcn/ui Installation for Next.js](https://ui.shadcn.com/docs/installation/next) - Installation and setup guide

### Tertiary (LOW confidence)

- [WebSearch: React Hotkeys Hook](https://react-hotkeys-hook.vercel.app/) - Library documentation (verified official site)
- [WebSearch: Material-UI Stepper](https://mui.com/material-ui/react-stepper/) - Mobile stepper patterns for reference
- [WebSearch: react-textarea-autosize npm](https://www.npmjs.com/package/react-textarea-autosize) - Auto-resize textarea library

---

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH - shadcn/ui and react-resizable-panels are industry standard, well-documented, actively maintained
- **Architecture:** HIGH - Next.js App Router patterns verified from official docs, layout nesting is stable API
- **Pitfalls:** HIGH - localStorage hydration and layout re-rendering are well-documented issues with established solutions
- **Smooth morph transition:** MEDIUM - Framer Motion supports this but App Router integration needs testing
- **Mobile stepper pattern:** MEDIUM - Multiple approaches work, user preference for "tap to expand" needs design decision

**Research date:** 2026-02-07

**Valid until:** ~30 days (March 2026) - Stack is stable, but Next.js releases frequently. Re-check if Next.js 16.2+ or Tailwind 5 releases before planning.

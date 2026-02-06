# Feature Landscape

**Domain:** AI-Guided Design Thinking Workshop Platform
**Researched:** 2026-02-07
**Confidence:** MEDIUM (WebSearch findings cross-verified across multiple sources)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Session Persistence & Resume** | Users expect to start workshop, leave, return later with full context | Medium | Critical for multi-day workshops. Must restore conversation history, step progress, generated artifacts. [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/sessions) provides session management. |
| **Progress Tracking** | Users need to know where they are in 10-step process | Low | Visual milestone indicators with diamond icons, percentage completion, current/total steps. Standard in [modern platforms](https://clickup.com/blog/project-milestone-examples/). |
| **Context Flow Between Steps** | Design thinking is iterative—later steps build on earlier outputs | High | Each step inherits context from previous steps. User shouldn't re-explain things AI already knows. Memory architecture required (semantic + episodic). |
| **Export/Deliverable Generation** | Workshop must produce tangible output (Build Pack) | Medium | Users expect [defined deliverables upfront](https://uxdesign.cc/design-thinking-workshop-step-by-step-guide-428171c2adee): user stories, journey maps, personas, PRD. Export to PDF, Markdown, structured data. |
| **Conversation History** | Users expect to scroll back and review past exchanges | Low | Standard chat UI capability. Users need to revisit earlier decisions/insights. |
| **Human Escalation Path** | When AI can't help, users need exit to human support | Low | Critical for [safety and responsibility](https://research.aimultiple.com/chatbot-fail/). Not just "contact us"—context-aware escalation with conversation transcript. |
| **Mobile Responsiveness** | Users may switch devices or work on phone | Medium | [Common chatbot mistake](https://www.chatbot.com/blog/common-chatbot-mistakes/) is ignoring mobile users. Chat-first UI must work on all screen sizes. |
| **Error Recovery** | AI will misunderstand or hallucinate—users need undo/correction | Medium | Allow users to say "no that's wrong" and re-route without starting over. |
| **Pre-built Templates** | Beginners need starting points, not blank canvas | Low | [Workshop templates](https://miro.com/templates/workshops/) are expected. For WorkshopPilot: industry-specific challenge templates, persona examples, journey map scaffolds. |
| **Step Guidance** | Users lack design thinking expertise—need explanation of what each step accomplishes | Low | For each of 10 steps: what it is, why it matters, what good output looks like. [Onboarding for beginners](https://dschool.stanford.edu/tools/starter-kit) essential. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-First Facilitation (not sidebar)** | AI is the facilitator, not a helper widget. Chat is primary interface | High | Most tools have [AI as addon](https://about.stormz.me/en/ai/). WorkshopPilot makes AI the facilitator. Conversational, proactive, guides through steps naturally. |
| **Context-Aware Prompting** | AI asks smart follow-ups based on previous answers | High | AI remembers user said "B2B SaaS" and asks domain-specific questions. Requires [semantic memory + episodic memory](https://www.datacamp.com/blog/how-does-llm-memory-work). |
| **Build Pack Output** | Not just workshop artifacts—output ready for AI coding tools | Medium | Differentiator: PRD/specs formatted for Claude Code, Cursor, v0. Bridges design thinking to implementation. |
| **Step-Specific AI Coaching** | Each step has tailored facilitation style (e.g., empathy-focused in research, devil's advocate in ideation) | High | AI changes persona per step. During ideation: "what if we made it absurd?" During validation: "what could go wrong?" |
| **Inline Examples & Inspiration** | AI shows examples from similar domains mid-conversation | Medium | User stuck on personas? AI shows "here's how Spotify approached this". [Intelligent idea generation](https://www.groupmap.com/online-workshop-facilitation-tools/) but context-aware. |
| **Visual Output Generation** | AI generates journey maps, mind maps, diagrams—not just text | High | Users expect [visual collaboration tools](https://www.sessionlab.com/blog/design-thinking-for-beginners-guide/). If WorkshopPilot can auto-generate journey map from conversation, huge differentiator. (Tech challenge: LLMs aren't visual.) |
| **Reflection & Iteration Prompts** | AI asks "let's revisit your persona—does this still feel right after journey mapping?" | Medium | [Design thinking is iterative](https://asana.com/resources/design-thinking-process). Most tools are linear. AI that encourages backtracking = differentiator. |
| **Domain-Specific Question Libraries** | AI has specialized questions for B2B vs B2C, app vs hardware, etc. | Medium | Generic design thinking feels academic. Domain-aware questions feel expert. |
| **Multi-Session Continuity** | User can run multiple workshops for different projects, AI remembers which is which | Medium | [Session management](https://medium.com/@porter.nicholas/teaching-claude-to-remember-part-3-sessions-and-resumable-workflow-1c356d9e442f) with project isolation. "Resume wellness app workshop" vs "resume e-commerce workshop". |
| **Collaborative Mode (future)** | Multiple users in same workshop session | High | Not MVP but differentiator: team runs workshop together, AI facilitates group. Requires real-time sync. |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Scripted Response Trees** | Users hate rigid "press 1 for X" chatbots. Kills conversational feel | Use LLM's natural language understanding. Let users answer however they want. AI extracts intent. [Conversational UI best practice](https://research.aimultiple.com/conversational-ui/). |
| **Universal Do-Everything Bot** | "Chatbot that handles all business needs" always fails | [Focused use case](https://www.lifeinside.io/insights/best-conversational-ai-solutions): WorkshopPilot does design thinking workshops, nothing else. Clear boundaries. |
| **AI as Sidebar Helper** | "Chat with AI while you work in canvas" dilutes value prop | AI IS the interface. Chat-first. Don't build Miro clone + AI addon. [Tools built for one use case perform better](https://www.digitalocean.com/resources/articles/conversational-ai-platforms). |
| **Overly Chatty Responses** | AI that writes paragraphs frustrates users | [Keep responses short](https://botpress.com/blog/conversation-design): 1-2 sentences. Use bullet points. Ask follow-up instead of explaining everything upfront. |
| **No Manual Content Control** | Letting AI hallucinate without guardrails [causes liability](https://research.aimultiple.com/chatbot-fail/) (Air Canada case) | Hard-code step structure. Use retrieval for examples. Validate outputs. Don't let AI make up design thinking methodology. |
| **Requiring Perfect Phrasing** | "Users shouldn't have to frame queries a certain way" | LLM handles natural language. Don't force "please enter your challenge statement in 50 words". Let users ramble, AI extracts. |
| **Standalone Features Without Integration** | Building journey map tool AND persona tool AND ideation tool as separate modules | Design thinking is a flow. Features must be interconnected. Persona informs journey map informs HMW statements. |
| **Generic Facilitation** | AI treating all workshops the same regardless of domain or user background | Personalize based on: user's domain (B2B/B2C), experience level (novice/expert), project type (app/service/product). |
| **Forgetting Safety Escalation** | No plan for users discussing sensitive topics or needing human help | [Safety by design](https://research.aimultiple.com/chatbot-fail/): detect crisis language, provide help resources, escalate to human. Not overkill—users trust product more. |

## Feature Dependencies

```
Core Dependencies (must build first):
┌─────────────────────────┐
│ Session Management      │ ← Foundation for everything
│ (persist, resume)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Step Navigation         │ ← User must move through 10 steps
│ (progress tracking)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Context Flow            │ ← Each step builds on previous
│ (memory management)     │
└───────────┬─────────────┘
            │
            ├──────────────────────┐
            ▼                      ▼
┌─────────────────────┐   ┌──────────────────────┐
│ AI Facilitation     │   │ Artifact Generation  │
│ (chat interface)    │   │ (outputs per step)   │
└─────────────────────┘   └──────────────────────┘
            │                      │
            └──────────┬───────────┘
                       ▼
            ┌─────────────────────┐
            │ Build Pack Export   │ ← Final deliverable
            └─────────────────────┘

Differentiator Dependencies (build after core):
┌─────────────────────────┐
│ Context-Aware Prompting │ ← Requires: Context Flow
└─────────────────────────┘

┌─────────────────────────┐
│ Step-Specific Coaching  │ ← Requires: Step Navigation + AI Facilitation
└─────────────────────────┘

┌─────────────────────────┐
│ Reflection Prompts      │ ← Requires: Context Flow + Memory
└─────────────────────────┘

Visual Output Generation (post-MVP):
┌─────────────────────────┐
│ Journey Map Rendering   │ ← Requires: Artifact Generation + Visualization library
└─────────────────────────┘

Collaborative Mode (future):
┌─────────────────────────┐
│ Multi-User Sessions     │ ← Requires: Everything above + Real-time sync
└─────────────────────────┘
```

## MVP Recommendation

For MVP 1.0 (AI Facilitation), prioritize:

**Core Table Stakes:**
1. **Session Persistence & Resume** - Non-negotiable. Users will leave and come back.
2. **Progress Tracking** - Users need to know "Step 3 of 10".
3. **Context Flow Between Steps** - Design thinking doesn't work without this.
4. **Basic Export** - At minimum: markdown file with all workshop outputs.
5. **Conversation History** - Standard chat UI, scrollable.
6. **Step Guidance** - Explain what each step is before starting it.

**Critical Differentiators (MVP must include):**
1. **AI-First Facilitation** - This is the product. Chat is primary interface.
2. **Context-Aware Prompting** - AI asks smart follow-ups based on previous answers. Without this, it's just a form.
3. **Build Pack Output** - Export must be formatted for AI coders. This is the unique value prop.

**MVP Can Defer:**
- Visual output generation (start with text-based artifacts)
- Inline examples/inspiration (start with templates only)
- Reflection & iteration prompts (linear path first, backtracking later)
- Domain-specific question libraries (start with general design thinking)
- Multi-session continuity (one workshop at a time)
- Collaborative mode (single user)

**Must Have (Safety):**
- Human escalation path (basic "Get Help" button)
- Error recovery (allow users to say "no, that's wrong")

## Complexity Assessment for MVP

| Feature Category | Overall Complexity | Key Risks |
|------------------|-------------------|-----------|
| Session Management | Medium | Session state design, where to persist, resume logic |
| Context Flow | High | Memory architecture, what to retain vs forget, token limits |
| AI Facilitation | High | Prompt engineering per step, maintaining conversational tone, handling varied inputs |
| Build Pack Export | Medium | Output formatting, ensuring completeness, making it AI-coder friendly |
| Progress Tracking | Low | UI component, state management |
| Conversation History | Low | Standard chat UI patterns |

## Feature Prioritization Rationale

**Why these table stakes?**
- Users in [2026 expect](https://www.lifeinside.io/insights/best-conversational-ai-solutions) conversational AI to maintain context, remember sessions, and provide clear progress indicators. Missing any of these makes product feel incomplete compared to modern AI tools.

**Why these differentiators for MVP?**
- **AI-First**: This is the bet. If AI isn't good enough to be primary facilitator, product fails. Must prove this in MVP.
- **Context-Aware**: Without this, it's just a chatbot form. This makes it feel like a smart facilitator.
- **Build Pack**: This bridges design thinking to development. Unique positioning vs Miro/FigJam (workshop tools) and Claude Code/Cursor (AI coders).

**Why defer visual output?**
- High complexity (LLMs aren't visual), low initial impact. Users can visualize from text export. Add post-MVP once core flow validated.

**Why defer collaboration?**
- Target users are solo (business owners, department heads). Collaborative workshops require team. Solo mode validates product-market fit first.

## Post-MVP Expansion Path

**Version 1.1 - Polish:**
- Inline examples & inspiration
- Reflection & iteration prompts
- Better templates (domain-specific)

**Version 1.2 - Visual:**
- Visual journey maps
- Mind map rendering
- Persona card layouts

**Version 2.0 - Collaboration:**
- Multi-user sessions
- Real-time collaboration
- Role assignments (facilitator, participants)

**Version 2.1 - Intelligence:**
- Domain-specific question libraries
- Industry examples database
- Workshop analytics (how long per step, where users get stuck)

## Sources

**AI-Guided Workshop Platforms:**
- [Top Online Workshop Facilitation Tools for 2026](https://www.groupmap.com/online-workshop-facilitation-tools/)
- [How to Use AI for Workshops: A Facilitator Guide](https://miro.com/ai/ai-workshop/)
- [AI Brainstorming | Seven AI for facilitators - Stormz](https://about.stormz.me/en/ai/)
- [7 practical GenAI use cases for facilitators and trainers](https://www.sessionlab.com/blog/ai-for-training/)

**Conversational AI Best Practices:**
- [5 Best Conversational AI Solutions You Should Know in 2026](https://www.lifeinside.io/insights/best-conversational-ai-solutions)
- [12 Top Conversational AI Platforms for 2026](https://www.digitalocean.com/resources/articles/conversational-ai-platforms)
- [Conversational UI: 6 Best Practices in 2026](https://research.aimultiple.com/conversational-ui/)
- [Conversational AI Design in 2026](https://botpress.com/blog/conversation-design)

**Design Thinking Tools:**
- [9 Top Design Thinking Tools to Use in 2026](https://www.andacademy.com/resources/blog/ui-ux-design/9-design-thinking-tools/)
- [Design thinking for beginners – workshop agenda and guide](https://www.sessionlab.com/blog/design-thinking-for-beginners-guide/)
- [How to RUN a Design Thinking Workshop [2025 Guide]](https://www.konrad.com/research/how-to-run-a-design-thinking-workshop)

**Chat Interface Features:**
- [The best AI chatbots in 2026](https://zapier.com/blog/best-ai-chatbot/)
- [Best AI Chat Interfaces in 2026](https://openalternative.co/categories/ai-machine-learning/ai-interaction-interfaces/ai-chat-interfaces)

**Common Mistakes & Anti-Patterns:**
- [10+ Epic LLM/ Conversational AI/ Chatbot Failures in 2026](https://research.aimultiple.com/chatbot-fail/)
- [5 Common AI Chatbot Mistakes Businesses Make](https://www.webless.ai/blog/common-ai-chatbot-mistakes-businesses)
- [Chatbot Mistakes: Common Pitfalls and How to Avoid Them](https://www.chatbot.com/blog/common-chatbot-mistakes/)

**Memory & Context Management:**
- [How Does LLM Memory Work? Building Context-Aware AI Applications](https://www.datacamp.com/blog/how-does-llm-memory-work)
- [Teaching Claude To Remember: Part 3 — Sessions And Resumable Workflow](https://medium.com/@porter.nicholas/teaching-claude-to-remember-part-3-sessions-and-resumable-workflow-1c356d9e442f)
- [Session Management - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/sessions)
- [AI Memory vs. Context Understanding: The Next Frontier for Enterprise AI](https://www.sphereinc.com/blogs/ai-memory-and-context/)

**Progress Tracking & Milestones:**
- [Project Milestones: How to Identify, Establish, and Manage Them](https://clickup.com/blog/project-milestone-examples/)
- [How To Set and Achieve Project Milestones [2026]](https://asana.com/resources/project-milestones)

**Workshop Deliverables:**
- [Design thinking workshop — step by step guide](https://uxdesign.cc/design-thinking-workshop-step-by-step-guide-428171c2adee)
- [How To Run An Awesome Design Thinking Workshop [2025]](https://careerfoundry.com/en/blog/ux-design/design-thinking-workshop/)

**Onboarding & Templates:**
- [d.school Starter Kit - Design Workshop Activities](https://dschool.stanford.edu/tools/starter-kit)
- [Workshop Templates](https://www.sessionlab.com/templates/)
- [Workshop Templates & Examples | Miro](https://miro.com/templates/workshops/)
- [Solve Problems Using the Design Thinking Process [2026]](https://asana.com/resources/design-thinking-process)

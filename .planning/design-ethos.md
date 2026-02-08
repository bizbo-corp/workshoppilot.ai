## Design Context

### Users
Mixed audience: product teams (PMs, designers) and solo founders turning vague ideas into validated build packs. Users range from technical to non-technical. They interact with AI as the primary facilitator across a 10-step design thinking workshop. The interface should feel flexible, smart, and not intimidating — welcoming to both experienced practitioners and first-timers.

### Brand Personality
**Smart, calm, guiding** — like Linear or Notion. Clean, confident, gets out of the way. The AI is a thoughtful facilitator, not a flashy assistant. It should feel like working with a skilled design thinking coach who respects your time and intelligence.

### Aesthetic Direction
- **Visual tone**: Minimal, nature-inspired calm. Expand the existing sage green (#8B9A7A) + neutral grayscale palette.
- **Typography**: Geist Sans (body) + Geist Mono (code/data). Clean, modern, highly legible.
- **Color system**: Sage green as primary brand accent. Neutral grays for structure. Use color sparingly and purposefully — avoid visual noise.
- **Dark mode**: Fully supported via next-themes (system preference default). Both modes should feel equally intentional, not an afterthought.
- **Shape language**: Rounded corners (0.625rem base radius). Subtle borders, soft shadows on hover. No harsh edges.
- **References**: Linear (clean task UI), Notion (calm workspace), Vercel (sharp developer feel)
- **Anti-references**: Avoid generic AI chatbot aesthetics (ChatGPT-style). Avoid busy/cluttered dashboards. Avoid overly playful or toy-like designs.

### Design Principles
1. **AI is the interface, not a sidebar** — The conversation is the primary workspace. Design around it, not alongside it.
2. **Calm over clever** — Reduce cognitive load at every turn. White space is a feature. Animations should be subtle and purposeful (framer-motion).
3. **Progressive disclosure** — Show only what's needed for the current step. The 10-step flow should feel like one step at a time, never overwhelming.
4. **Accessible by default** — Target WCAG AAA compliance. High contrast ratios, keyboard navigation, reduced motion support, color-blind safe palettes. Accessibility is not optional.
5. **Consistent, systematic design** — Use shadcn/ui primitives. Follow the established token system (oklch colors, CSS custom properties). Every component should feel like it belongs to the same family.

### Accessibility Standards (WCAG AAA)
- Contrast ratio: minimum 7:1 for normal text, 4.5:1 for large text
- All interactive elements must be keyboard accessible with visible focus indicators
- Support `prefers-reduced-motion` — disable or simplify all framer-motion animations
- Color must never be the only means of conveying information
- Touch targets: minimum 44x44px
- Screen reader compatible: proper ARIA labels, semantic HTML, logical heading hierarchy

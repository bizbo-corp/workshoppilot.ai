---
phase: 36-olive-theme-rollout
verified: 2026-02-18T12:00:00Z
status: gaps_found
score: 3/4 must-haves verified
re_verification: false
gaps:
  - truth: "Canvas backgrounds and post-it node colors match the olive-tinted palette in both light and dark modes"
    status: partial
    reason: "Several canvas node files retain bare bg-white (non-alpha) and bg-white/N references that are visible to users during interaction — not in dark-mode-immune contexts. persona-template-node.tsx has focus:bg-white/60 on editable fields and a bg-white/90 hover button overlay; hmw-card-node.tsx has focus:bg-white/60 on its inline edit field; mind-map-node.tsx uses hover:bg-white/50 on action buttons; cluster-hulls-overlay.tsx uses bg-white/20 text-white on an input rendered on a colored cluster hull."
    artifacts:
      - path: "src/components/canvas/persona-template-node.tsx"
        issue: "Lines 168, 235, 261, 280: bg-white/90 on hover overlay button and focus:bg-white/60 on 4 editable field inputs. The bg-white/90 (line 168) is a visible hover pill over the portrait photo. In dark mode this renders as a white-tinted pill over a dark olive surface — jarring."
      - path: "src/components/canvas/persona-template-node.tsx"
        issue: "Lines 335, 341: text-white and text-white/75 on editable fields in the header band. These are fine since the header band uses SAGE.headerBg (#6b7f4e olive hex) inline style, so text-white on olive is intentional — BUT the focus:bg-white/15 on these same lines is a white flash when a user clicks the header field."
      - path: "src/components/canvas/hmw-card-node.tsx"
        issue: "Line 74: focus:bg-white/60 on the inline editable input field. In dark mode the card background is olive-toned but a focus flash of white/60 is visible."
      - path: "src/components/canvas/mind-map-node.tsx"
        issue: "Line 140: hover:bg-white/50 on the '+Branch'/'+Child' action button. Button color comes from data.themeColor (could be any user-set color). hover:bg-white/50 is a white overlay — in dark mode this appears bright white on a dark canvas."
      - path: "src/components/canvas/cluster-hulls-overlay.tsx"
        issue: "Line 235: bg-white/20 text-white on the cluster rename input. The input renders inside a hull header whose background is headerBg (rgba colors — indigo, green, amber, red, purple, sky). bg-white/20 and text-white are intentional for readability on these colored backgrounds, but text-white is a raw white Tailwind class not in the olive token system."
    missing:
      - "persona-template-node.tsx: Replace focus:bg-white/60 on editable fields (lines 235, 261, 280) with focus:bg-card/60 or focus:bg-neutral-olive-50/60; replace bg-white/90 hover pill (line 168) with bg-card/90; replace focus:bg-white/15 on header fields (lines 335, 341) with focus:bg-white/15 only if intentional on the olive headerBg (acceptable) or bg-neutral-olive-100/15"
      - "hmw-card-node.tsx: Replace focus:bg-white/60 (line 74) with focus:bg-card/60 to match olive card surface on focus"
      - "mind-map-node.tsx: Replace hover:bg-white/50 (line 140) with hover:bg-neutral-olive-100/50 or hover:bg-card/50"
      - "cluster-hulls-overlay.tsx: bg-white/20 text-white (line 235) on colored hull header — evaluate whether these need to adapt to hull color or can be left as intentional semantic white-on-color text (low severity, but the SUMMARY claimed a clean project-wide sweep)"
human_verification:
  - test: "Open a persona node in dark mode, click on a name/role field"
    expected: "Focus state shows an olive-tinted highlight — no jarring white flash"
    why_human: "focus:bg-white/60 produces a visible white flash that only appears on click — cannot be verified by grep"
  - test: "Hover over a persona portrait that has an image, in dark mode"
    expected: "The 'Regenerate' pill uses an olive-tinted background — not a bright white pill on a dark canvas"
    why_human: "bg-white/90 hover pill visibility on dark mode requires human observation"
  - test: "Switch between light and dark mode on the dashboard page"
    expected: "Header, sidebar, dashboard cards, and auth modals all transition to dark olive tones — no surface reverts to zinc or white"
    why_human: "CSS variable inheritance across light/dark requires visual confirmation; token mappings check out but rendering needs verification"
  - test: "Open the canvas in dark mode, hover over a mind map node"
    expected: "The +Branch / +Child button hover shows a soft olive tint, not a white flash"
    why_human: "hover:bg-white/50 on a dynamically colored button is visible on interaction only"
---

# Phase 36: Olive Theme Rollout Verification Report

**Phase Goal:** Every surface of the app reads as a single coherent product with the "consultant authority" aesthetic the olive palette was designed for.
**Verified:** 2026-02-18T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sidebar, header, chat panel, forms, and dialogs all use the olive palette — no default Tailwind grays or blue accents visible | VERIFIED | header.tsx: `bg-card`, `bg-primary`, `text-primary-foreground`. All gray-*/blue-* grep returns zero matches in header, auth modals, admin, dashboard. shadcn/ui button/card/dialog all use `bg-primary`, `bg-card`, `bg-background` tokens which resolve to neutral-olive values. |
| 2 | Canvas backgrounds and post-it node colors match the olive-tinted palette in both light and dark modes | PARTIAL | Post-it node selection rings (`ring-olive-600`), resize handles (`!bg-olive-600`), confirm button (`bg-olive-600`), text (`text-neutral-olive-800`) all verified. Canvas toolbars use `bg-card/border-border`. BUT: persona-template-node (lines 168, 235, 261, 280, 335, 341), hmw-card-node (line 74), mind-map-node (line 140), and cluster-hulls-overlay (line 235) retain `bg-white/*` and `text-white` on visible interactive states. |
| 3 | All shadcn/ui components (buttons, inputs, cards, dialogs) render in olive theme — primary actions use olive, not the default slate/zinc | VERIFIED | button.tsx: `bg-primary text-primary-foreground hover:bg-primary/90`. card.tsx: `bg-card text-card-foreground`. input.tsx: `border-input selection:bg-primary`. dialog.tsx: `bg-background border`. All CSS tokens (`--primary`, `--card`, `--background`) map to neutral-olive values in globals.css. |
| 4 | Switching between light and dark mode shows consistent olive tones with no surface reverting to default theme colors | VERIFIED (automated) | Dark mode `.dark` block in globals.css maps all tokens to neutral-olive-* values: `--background: neutral-olive-950`, `--card: neutral-olive-900`, `--popover: neutral-olive-800`, `--primary: neutral-olive-100`, `--sidebar: neutral-olive-900`. Zero `dark:bg-zinc-*`, `dark:bg-gray-*`, or `dark:border-gray-*` classes found in any target component. Human verification flagged for visual confirmation of dark mode transitions. |

**Score:** 3/4 truths verified (Truth 2 is partial — core post-it node is olive but 4 secondary canvas components have bg-white/N on interactive states)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/layout/header.tsx` | Olive-themed header with bg-primary sign-in button | VERIFIED | `bg-card` header container, `bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring` sign-in button. Zero gray-*/blue-* classes. |
| `src/components/auth/auth-wall-modal.tsx` | Auth wall with olive palette throughout | VERIFIED | Grep returns zero gray-*/blue-* matches. |
| `src/app/dashboard/page.tsx` | Dashboard with olive accent card | VERIFIED | Continue card: `border-olive-200 bg-olive-50 dark:border-olive-900 dark:bg-olive-950`. Loading spinner: `border-primary`. |
| `src/app/admin/page.tsx` | Admin page using theme tokens | VERIFIED | `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground` throughout. Zero hardcoded gray-* classes. |
| `src/components/canvas/canvas-toolbar.tsx` | Olive-themed canvas toolbar | VERIFIED | `bg-card`, `border-border`, `text-muted-foreground`, `hover:bg-accent`. Only intentional post-it color dot: `bg-blue-300` (line 27). |
| `src/components/canvas/post-it-node.tsx` | Post-it nodes with olive rings/buttons | VERIFIED | `ring-olive-600` (selected), `ring-olive-500` (editing), `ring-olive-500/40` (drag), `!bg-olive-600 !border-olive-600` (resize handles), `bg-olive-600` (confirm button), `text-neutral-olive-800` (text). Only intentional: `bg-blue-100 dark:bg-blue-200` (line 12). |
| `src/components/canvas/react-flow-canvas.tsx` | Zoom controls and context menu with olive theme | VERIFIED | Grep returns zero gray-*/blue-*/zinc-*/white classes. |
| `src/components/canvas/concept-card-node.tsx` | Concept card with olive billboard section | VERIFIED | Opportunities quadrant: `border-olive-500/30 bg-olive-50 dark:bg-olive-950/20`, `bg-olive-600` icon, `text-olive-900 dark:text-olive-100` heading. SWOT Strengths/Weaknesses/Threats use semantic green/red/amber — intentional for visual quadrant differentiation, not theme colors. |
| `src/components/ezydraw/toolbar.tsx` | EzyDraw toolbar with olive active states | VERIFIED | `bg-card/95` surface, active tool: `bg-olive-100 text-olive-700 ring-1 ring-olive-300 dark:bg-olive-900/50 dark:text-olive-300 dark:ring-olive-700`. Zero gray-*/blue-*/zinc-* classes. |
| `src/components/workshop/idea-selection.tsx` | Idea selection with olive selection accents | VERIFIED | Selected card: `border-olive-600 ring-2 ring-olive-600/20`, checkmark: `bg-olive-600`, summary box: `border-olive-500/50 bg-olive-50/50 dark:bg-olive-950/20`. |
| `src/components/canvas/persona-template-node.tsx` | Canvas node with olive theme | PARTIAL | Node uses SAGE constants (olive hex values via inline styles: `#6b7f4e`, `#8a9a5b`, `#4a5a32`) — semantically olive. BUT: editable fields use `focus:bg-white/60` (lines 235, 261, 280), header fields use `text-white focus:bg-white/15` (lines 335, 341), and hover portrait pill uses `bg-white/90` (line 168). |
| `src/components/canvas/hmw-card-node.tsx` | Canvas node with olive theme | PARTIAL | Node uses SAGE constants (olive hex). Editable input uses `focus:bg-white/60` (line 74). |
| `src/components/canvas/mind-map-node.tsx` | Canvas node with olive theme | PARTIAL | Node uses `data.themeColor` (user-set). Action button uses `hover:bg-white/50` (line 140). |
| `src/components/canvas/cluster-hulls-overlay.tsx` | Canvas overlay with olive theme | PARTIAL | Hull background/border colors are semantic (user-selectable: indigo/green/amber/red/purple/sky). Rename input uses `bg-white/20 text-white` (line 235) — white text on colored hull header is intentional for readability but uses raw white class. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `header.tsx` | `globals.css` | `bg-primary`, `bg-card` CSS tokens | WIRED | Confirmed: `bg-primary` resolves to `var(--primary)` → `var(--neutral-olive-800)` in light, `var(--neutral-olive-100)` in dark |
| `dashboard/page.tsx` | `globals.css` | `bg-olive-50`, `border-olive-200` | WIRED | `@theme inline` in globals.css registers `--color-olive-50: var(--olive-50)` and value `--olive-50: #f9fbf6`. Classes active. |
| `canvas-toolbar.tsx` | `globals.css` | `bg-card`, `bg-popover` | WIRED | `bg-card` resolves to neutral-olive-50 (light) / neutral-olive-900 (dark). |
| `post-it-node.tsx` | `globals.css` | `ring-olive-600`, `text-neutral-olive-800` | WIRED | Both olive-* and neutral-olive-* scales registered in `@theme inline` block. |
| `ezydraw/toolbar.tsx` | `globals.css` | `bg-card/95`, `bg-olive-100` | WIRED | Both token families confirmed in globals.css @theme block. |

---

### Requirements Coverage

Phase requirements from plans are that all hardcoded gray/blue/white/zinc classes are eliminated from target files. The project-wide grep sweep confirms:

- `grep -rn 'bg-gray|text-gray|border-gray|bg-blue|text-blue|border-blue|ring-blue|bg-zinc|text-zinc|border-zinc' src/components/ src/app/` returns only 2 matches: `canvas-toolbar.tsx:27` (`bg-blue-300` intentional post-it dot) and `post-it-node.tsx:12` (`bg-blue-100 dark:bg-blue-200` intentional blue sticky note color).

The `bg-white/*` cases (alpha variants) were NOT covered by the original plan's grep pattern — the plans only checked for bare `bg-white`, not `bg-white/N`. This is why they were missed in the plan's own self-check.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `persona-template-node.tsx` | 168 | `bg-white/90` on hover portrait overlay button | Warning | Visible white pill on dark mode canvas — breaks olive dark mode aesthetics |
| `persona-template-node.tsx` | 235, 261, 280 | `focus:bg-white/60` on editable fields | Warning | White flash on field focus in dark mode — inconsistent with olive focus states used in other nodes |
| `persona-template-node.tsx` | 335, 341 | `text-white` on header band fields (olive header bg) | Info | `text-white` on olive `#6b7f4e` background — technically correct visually but uses raw color class not a token |
| `hmw-card-node.tsx` | 74 | `focus:bg-white/60` on editable input | Warning | White focus flash in dark mode |
| `mind-map-node.tsx` | 140 | `hover:bg-white/50` on action button | Warning | Visible white hover flash in dark mode on canvas |
| `cluster-hulls-overlay.tsx` | 235 | `bg-white/20 text-white` on rename input | Info | On colored hull header — white text/bg is intentional for contrast on indigo/green/amber/red hulls, but not in olive token system |

---

### Human Verification Required

**1. Dark Mode Persona Node Fields**
- **Test:** Open canvas with a persona node in dark mode, click any editable field (name, role, demographic, etc.)
- **Expected:** Focus highlight should show an olive-tinted haze — no jarring white rectangle flash
- **Why human:** `focus:bg-white/60` creates a white background on focus that only appears during interaction

**2. Dark Mode Portrait Hover Pill**
- **Test:** Open canvas in dark mode, hover over a persona node with an AI-generated portrait
- **Expected:** "Regenerate" hover pill should use a card-toned (dark olive) background — not a bright white pill
- **Why human:** `bg-white/90` opacity hover state requires visual assessment on dark canvas

**3. Dark Mode Mind Map Node Hover**
- **Test:** Open canvas with a mind map in dark mode, hover over a non-root node to reveal the +Child button
- **Expected:** Hover effect shows a subtle olive tint — no visible white flash on the dark canvas
- **Why human:** `hover:bg-white/50` is an interactive state only visible on hover

**4. Full Dark/Light Mode Theme Switch**
- **Test:** Navigate through the app (dashboard, canvas, workshop steps, EzyDraw drawing tool) in both light and dark mode
- **Expected:** All surfaces (header, sidebar, toolbars, modals, cards, canvas) show olive tones in both modes — no zinc, default gray, or default slate surfaces visible
- **Why human:** Token chain (CSS variable → olive palette → rendered color) requires visual confirmation; automated checks confirm the token definitions are correct but rendering must be observed

---

### Gaps Summary

The phase achieved its primary goal for the main app shell and core canvas surfaces. The 3 plans collectively eliminated hundreds of hardcoded gray-*/blue-*/bg-white/zinc classes. The olive CSS token system is correctly established in globals.css with both light and dark mode mappings. shadcn/ui components, the header, auth modals, dashboard, admin page, and main canvas toolbars/post-it nodes are all verified olive.

The gap is narrow but real: 4 canvas node files (`persona-template-node`, `hmw-card-node`, `mind-map-node`, `cluster-hulls-overlay`) contain `bg-white/N` alpha variant classes on visible interactive states (focus, hover). These were missed because the plans' grep verification pattern checked `bg-white` but not `bg-white/60`, `bg-white/50`, `bg-white/20`, `bg-white/90`. In dark mode, these create white flashes or white overlay elements on what should be an all-olive dark canvas — directly contradicting Truth 2 and the goal's "single coherent product" criterion.

The SAGE constant approach used by `persona-template-node` and `hmw-card-node` (inline hex values like `#6b7f4e`) is acceptable as these are deliberately olive-toned hardcoded hex values, not default Tailwind colors. However the `focus:bg-white/60` and `bg-white/90` classes on those same nodes are the actual gap items.

---

_Verified: 2026-02-18T12:00:00Z_
_Verifier: Claude (gsd-verifier)_

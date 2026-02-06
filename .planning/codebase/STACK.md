# Technology Stack

**Analysis Date:** 2026-02-07

## Languages

**Primary:**
- TypeScript 5 - Full codebase (src/, configuration files)
- JSX/TSX - React components and Next.js pages

**Secondary:**
- CSS - Styling with Tailwind CSS v4 and OKLch color space
- JavaScript - Configuration files (ESLint, PostCSS)

## Runtime

**Environment:**
- Node.js (version unspecified in package.json; @types/node ^20 suggests Node 20+)

**Package Manager:**
- npm - Standard package manager
- Lockfile: package-lock.json (inferred from npm usage)

## Frameworks

**Core:**
- Next.js 16.1.1 - Full-stack React framework with App Router
- React 19.2.0 - UI framework
- React DOM 19.2.0 - React rendering to DOM

**Styling & UI:**
- Tailwind CSS 4 - Utility-first CSS framework with @tailwindcss/postcss ^4
- tailwind-merge 3.3.1 - Merge Tailwind class names without conflicts
- class-variance-authority 0.7.1 - Type-safe component variant patterns (CVA)
- lucide-react 0.546.0 - Icon library with 546+ SVG icons
- clsx 2.1.1 - Conditional class name utility
- tw-animate-css 1.4.0 - Additional Tailwind animation utilities

**Testing:**
- Not detected

**Build/Dev:**
- PostCSS 4 - CSS processing via @tailwindcss/postcss
- TypeScript 5 - Type checking and transpilation
- ESLint 9 - Code linting
- eslint-config-next 16.1.1 - Next.js ESLint configuration with Web Vitals rules

## Key Dependencies

**Critical:**
- next 16.1.1 - Full-stack framework (routing, API, SSR/SSG)
- react 19.2.0 - UI rendering
- tailwindcss 4 - Styling system

**UI & Utilities:**
- lucide-react 0.546.0 - Icon library (used in components)
- class-variance-authority 0.7.1 - Component variant management (e.g., Logo component uses size variants)
- clsx 2.1.1 - Class name merging (used in utils.ts)
- tailwind-merge 3.3.1 - Prevents Tailwind class conflicts (used in utils.ts cn() utility)

**Type Definitions:**
- @types/node ^20 - Node.js type definitions
- @types/react ^19 - React type definitions
- @types/react-dom ^19 - React DOM type definitions

## Configuration

**Environment:**
- Environment variables configured via .env* files (not committed to repo)
- Pattern: `.env` files ignored per `.gitignore` line 35
- No example env file committed

**Build:**
- `tsconfig.json` - TypeScript compilation settings
  - Target: ES2017
  - Module: esnext
  - JSX: react-jsx (automatic JSX transform)
  - Path alias: `@/*` maps to `./src/*`
  - Strict mode enabled

- `next.config.ts` - Next.js configuration (currently minimal)

- `postcss.config.mjs` - PostCSS configuration with Tailwind v4 plugin

- `eslint.config.mjs` - ESLint flat config
  - Extends: eslint-config-next/core-web-vitals and eslint-config-next/typescript
  - Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Platform Requirements

**Development:**
- Node.js 20+ (inferred from @types/node ^20)
- npm (or compatible package manager)
- TypeScript 5 required for development
- ESLint 9 for code quality

**Production:**
- Node.js 20+ runtime
- Deployment target: Any Node.js-compatible hosting (Vercel recommended for Next.js, per .vercel directory pattern)
- Next.js standalone server can run on Linux/macOS/Windows with Node runtime

---

*Stack analysis: 2026-02-07*

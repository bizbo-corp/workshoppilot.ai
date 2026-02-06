# Codebase Structure

**Analysis Date:** 2026-02-07

## Directory Layout

```
workshoppilot.ai/
├── .planning/              # Planning and sprint tracking
│   ├── Sprints/
│   │   └── MVP_05/         # Current sprint planning
│   └── codebase/           # Codebase analysis documents
├── docs/                   # Documentation
│   └── specs/              # Product and design specifications
├── public/                 # Static assets
│   ├── *.svg               # SVG icons (Next.js, Vercel, etc.)
│   └── favicon.ico         # Favicon
├── scripts/                # Utility scripts
├── src/                    # Source code
│   ├── app/                # Next.js App Router pages and layouts
│   │   ├── layout.tsx      # Root layout component
│   │   ├── page.tsx        # Home page route
│   │   ├── globals.css     # Global styles and design tokens
│   │   └── favicon.ico     # Favicon file
│   ├── components/         # Reusable React components
│   │   └── Logo.tsx        # Brand logo component
│   └── lib/                # Utility functions and helpers
│       └── utils.ts        # Shared utilities (cn function)
├── node_modules/           # Dependencies (git-ignored)
├── .next/                  # Next.js build output (git-ignored)
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration
├── next.config.ts          # Next.js configuration
├── .gitignore              # Git ignore rules
└── README.md               # Project readme (if exists)
```

## Directory Purposes

**src/:**
- Purpose: All application source code
- Contains: Components, pages, utilities, styles
- Key files: Entry points for all features

**src/app/:**
- Purpose: Next.js App Router pages and application shell
- Contains: Page components using dynamic routing, root layout, global styles
- Key files: `layout.tsx` (root wrapper), `page.tsx` (home page), `globals.css` (design system)

**src/components/:**
- Purpose: Reusable React components
- Contains: Presentational and container components
- Key files: `Logo.tsx` (brand component)

**src/lib/:**
- Purpose: Shared utility functions and helpers
- Contains: Helper functions not tied to specific components
- Key files: `utils.ts` (Tailwind class merging utility)

**public/:**
- Purpose: Static assets served directly by web server
- Contains: Images, icons, favicons
- Key files: SVG assets, favicon.ico

**.planning/:**
- Purpose: Project planning, roadmaps, and analysis documents
- Contains: Sprint planning, technical analysis
- Key files: ARCHITECTURE.md, STRUCTURE.md, other codebase analysis

**docs/:**
- Purpose: Project documentation and specifications
- Contains: Design specs, product requirements
- Key files: Product specifications in specs/ subdirectory

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Home page route handler
- `src/app/layout.tsx`: Root layout applied to all pages
- `next.config.ts`: Next.js configuration entry
- `package.json`: Project entry point and dependency manifest

**Configuration:**
- `tsconfig.json`: TypeScript compiler options and path aliases
- `next.config.ts`: Next.js-specific configuration
- `package.json`: Dependencies and scripts
- `.gitignore`: Version control exclusions

**Core Logic:**
- `src/components/Logo.tsx`: Logo component with size variants
- `src/app/page.tsx`: Home page content and layout
- `src/lib/utils.ts`: Class name merging utility function

**Styling:**
- `src/app/globals.css`: Global styles, design tokens, Tailwind configuration

**Testing:**
- Not applicable - no tests currently in codebase

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `Logo.tsx`)
- Utility/helper files: camelCase (e.g., `utils.ts`)
- Pages: PascalCase matching route (e.g., `page.tsx`)
- Styles: camelCase or snake_case for CSS files (e.g., `globals.css`)

**Directories:**
- Feature directories: lowercase with hyphens for multi-word (e.g., `src/components/`)
- Route directories: lowercase matching URL path
- Utility directories: lowercase (e.g., `src/lib/`)

**TypeScript/Components:**
- Component names: PascalCase (e.g., `LogoProps`)
- Function/variable names: camelCase (e.g., `sizeClasses`)
- Constants: UPPER_SNAKE_CASE (not yet used)
- Interfaces/Types: PascalCase (e.g., `LogoProps`)

## Where to Add New Code

**New Feature:**
- Page component: Create new file in `src/app/[feature]/page.tsx`
- Tests: Create `src/app/[feature]/page.test.tsx` (once testing framework added)
- Feature-specific utils: `src/app/[feature]/utils.ts` or `src/lib/[feature].ts`

**New Component/Module:**
- Reusable component: `src/components/[ComponentName].tsx`
- Component props interface: Define inside component file with PascalCase Interface name
- Component styles: Use Tailwind classes inline; add design tokens to `src/app/globals.css` if needed
- Component tests: `src/components/[ComponentName].test.tsx` (once testing framework added)

**Utilities:**
- Shared helpers: `src/lib/[utility-name].ts`
- Export from barrel file: Consider creating `src/lib/index.ts` for easier imports
- Examples: `cn()` function in `src/lib/utils.ts`

## Special Directories

**node_modules/:**
- Purpose: Third-party dependencies installed via npm
- Generated: Yes (via `npm install`)
- Committed: No (git-ignored)

**.next/:**
- Purpose: Next.js build output and cache
- Generated: Yes (via `npm run build` or `npm run dev`)
- Committed: No (git-ignored)

**public/:**
- Purpose: Static files served directly (not bundled)
- Generated: No (manually added)
- Committed: Yes

**.planning/:**
- Purpose: Non-code planning documents
- Generated: Partially (CI can generate analysis documents)
- Committed: Yes

**docs/:**
- Purpose: User-facing documentation and specifications
- Generated: No (manually authored)
- Committed: Yes

## Import Path Aliases

**Configured in tsconfig.json:**
```
"@/*": ["./src/*"]
```

**Usage Examples:**
- `import Logo from "@/components/Logo"` instead of `import Logo from "../../components/Logo"`
- `import { cn } from "@/lib/utils"` instead of `import { cn } from "../../lib/utils"`

**Convention:** Use `@/` prefix for all imports from `src/` directory. Relative imports should only be used within same module for local concerns.

---

*Structure analysis: 2026-02-07*

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Typography primitives — the single source of truth for headings, body text,
 * eyebrow labels and captions. Before this, the same class strings (e.g. the
 * all-caps eyebrow `text-xs font-bold uppercase tracking-[0.18em]`) were
 * copy-pasted across dozens of files and had drifted (0.18em vs 0.2em, etc.).
 *
 * Use these instead of inline class strings for text. Colors come from semantic
 * tokens (foreground / muted-foreground); pass `className` only for layout
 * (margins, alignment) or a deliberate one-off, not to restyle the type.
 */

// — Headings —————————————————————————————————————————————————————————————————

const headingVariants = cva("text-foreground text-balance", {
  variants: {
    level: {
      // Hero / page title
      1: "text-3xl font-bold tracking-tight sm:text-4xl",
      // Section header
      2: "text-2xl font-semibold leading-tight tracking-tight",
      // Sub-section
      3: "text-lg font-semibold leading-snug",
      // Card / small block title
      4: "text-sm font-semibold leading-none",
    },
  },
  defaultVariants: { level: 2 },
})

type HeadingLevel = 1 | 2 | 3 | 4

export interface HeadingProps
  extends Omit<React.ComponentProps<"h2">, "color">,
    VariantProps<typeof headingVariants> {
  /** Override the rendered element independently of the visual level. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
}

function Heading({ className, level = 2, as, ...props }: HeadingProps) {
  const Tag = (as ?? (`h${level ?? 2}` as const)) as React.ElementType
  return (
    <Tag
      data-slot="heading"
      className={cn(headingVariants({ level }), className)}
      {...props}
    />
  )
}

const H1 = (p: Omit<HeadingProps, "level">) => <Heading level={1} as="h1" {...p} />
const H2 = (p: Omit<HeadingProps, "level">) => <Heading level={2} as="h2" {...p} />
const H3 = (p: Omit<HeadingProps, "level">) => <Heading level={3} as="h3" {...p} />
const H4 = (p: Omit<HeadingProps, "level">) => <Heading level={4} as="h4" {...p} />

// — Body text ——————————————————————————————————————————————————————————————

const textVariants = cva("", {
  variants: {
    variant: {
      body: "text-sm text-foreground",
      muted: "text-sm text-muted-foreground",
      lead: "text-base leading-relaxed text-muted-foreground",
      small: "text-xs text-muted-foreground",
    },
  },
  defaultVariants: { variant: "body" },
})

export interface TextProps
  extends Omit<React.ComponentProps<"p">, "color">,
    VariantProps<typeof textVariants> {
  asChild?: boolean
  /** Render as <span> instead of <p> for inline text. */
  inline?: boolean
}

function Text({ className, variant, inline = false, ...props }: TextProps) {
  const Tag = inline ? "span" : "p"
  return (
    <Tag
      data-slot="text"
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  )
}

// — Eyebrow (all-caps label) ———————————————————————————————————————————————

export type EyebrowProps = React.ComponentProps<"p">

function Eyebrow({ className, ...props }: EyebrowProps) {
  return (
    <p
      data-slot="eyebrow"
      className={cn(
        "text-xs font-bold uppercase tracking-eyebrow text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

// — Caption / helper text ———————————————————————————————————————————————————

export type CaptionProps = React.ComponentProps<"p">

function Caption({ className, ...props }: CaptionProps) {
  return (
    <p
      data-slot="caption"
      className={cn("text-xs leading-snug text-muted-foreground", className)}
      {...props}
    />
  )
}

// — Inline code ————————————————————————————————————————————————————————————

export type CodeProps = React.ComponentProps<"code">

function Code({ className, ...props }: CodeProps) {
  return (
    <code
      data-slot="code"
      className={cn(
        "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export {
  Heading,
  H1,
  H2,
  H3,
  H4,
  Text,
  Eyebrow,
  Caption,
  Code,
  headingVariants,
  textVariants,
}

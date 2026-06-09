import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Surface — the base primitive for card-like containers (panels, page cards,
 * canvas-node shells). Centralizes the radius / shadow / border conventions that
 * had drifted across the app (rounded-lg vs xl vs 2xl, shadow-xs vs sm vs xl).
 *
 * `<Card>` is the structured, slotted container (header/content/footer). Reach
 * for `<Surface>` when you just need a consistently-styled box and were about to
 * hand-roll `rounded-* border bg-card shadow-*` on a raw div.
 *
 * Radius uses the semantic tokens from globals.css (--radius-card / -node / -pill).
 */
const surfaceVariants = cva("", {
  variants: {
    variant: {
      // Standard page/content card.
      card: "bg-card text-card-foreground rounded-card border shadow-sm",
      // Lighter inset panel (e.g. sub-sections, sidebars).
      panel: "bg-background/60 rounded-card border",
      // Canvas node shell — larger radius, stronger lift.
      node: "bg-card text-card-foreground rounded-node border shadow-xl",
      // No chrome — just the radius/padding scaffold.
      plain: "",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
      xl: "p-8",
    },
  },
  defaultVariants: { variant: "card", padding: "none" },
})

export interface SurfaceProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof surfaceVariants> {
  asChild?: boolean
}

function Surface({
  className,
  variant,
  padding,
  asChild = false,
  ...props
}: SurfaceProps) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="surface"
      className={cn(surfaceVariants({ variant, padding }), className)}
      {...props}
    />
  )
}

export { Surface, surfaceVariants }

import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Icon — thin wrapper over lucide icons that enforces a constrained size scale
 * and `currentColor` by default. Before this, icon sizes were scattered across
 * h-2…h-16 including fractional h-3.5, and colors were sometimes hardcoded.
 *
 * Use a token size instead of ad-hoc h-/w- utilities:
 *   <Icon icon={Check} />              // sm (16px) — the default
 *   <Icon icon={Sparkles} size="lg" /> // 24px
 *
 * Color is inherited (text-* on a parent), so prefer `<span className="text-muted-foreground"><Icon .../></span>`
 * or pass a semantic token via className — never a hardcoded color.
 *
 * Inside <Button>, you usually don't need this: Button auto-sizes bare svgs.
 */
const ICON_SIZES = {
  xs: "size-3", // 12px
  sm: "size-4", // 16px — default
  md: "size-5", // 20px
  lg: "size-6", // 24px
} as const

export type IconSize = keyof typeof ICON_SIZES

export interface IconProps
  extends Omit<React.ComponentProps<LucideIcon>, "ref"> {
  icon: LucideIcon
  size?: IconSize
}

function Icon({ icon: LucideGlyph, size = "sm", className, ...props }: IconProps) {
  return (
    <LucideGlyph
      data-slot="icon"
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn(ICON_SIZES[size], "shrink-0", className)}
      {...props}
    />
  )
}

export { Icon, ICON_SIZES }

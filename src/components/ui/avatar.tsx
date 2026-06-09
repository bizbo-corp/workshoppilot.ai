import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Avatar — initials/image circle used for participants and personas. Consolidates
 * the several ad-hoc `rounded-full` circles (presence bar, persona card, voting
 * results). Pass a participant `color` (the per-user hue stored on the session)
 * for a tinted initials bubble, or `src` for a photo.
 */
const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-card font-medium text-white select-none",
  {
    variants: {
      size: {
        xs: "size-5 text-[0.5rem]",
        sm: "size-6 text-xs",
        md: "size-8 text-sm",
        lg: "size-10 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
)

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export interface AvatarProps
  extends Omit<React.ComponentProps<"span">, "color">,
    VariantProps<typeof avatarVariants> {
  name: string
  src?: string | null
  /** Background hue for the initials bubble (e.g. the participant's color). */
  color?: string
}

function Avatar({ name, src, color, size, className, style, ...props }: AvatarProps) {
  return (
    <span
      data-slot="avatar"
      title={name}
      className={cn(avatarVariants({ size }), className)}
      style={{
        backgroundColor: src ? undefined : color ?? "var(--neutral-olive-500)",
        ...style,
      }}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}

export { Avatar, avatarVariants }

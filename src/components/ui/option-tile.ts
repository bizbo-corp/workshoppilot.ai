import { cva, type VariantProps } from "class-variance-authority"

/**
 * Option tile — the design-system standard for selectable choice grids
 * (pick-one / pick-up-to-N), e.g. the validate flow's output-type, lens,
 * test, signal-mode, and verdict pickers.
 *
 * Resting tiles share the tertiary tier with suggestion pills; the selected
 * tile inverts to a dark fill (foreground @ 80% with a hairline full-strength
 * foreground border — flips in dark mode automatically via the foreground
 * token). Muted copy inside a selected
 * tile should switch to `text-primary-foreground/80` instead of
 * `text-foreground/70` (/80 is the floor — /70 lands at ~4.4:1 on the dark
 * fill, just under the 4.5:1 AA threshold for small text), and accent text
 * (`text-primary`) to `text-primary-foreground`.
 *
 * Spacing/radius defaults to rounded-lg; call sites add their own padding
 * (and may override radius) via cn().
 */
export const optionTileVariants = cva(
  "rounded-lg border text-left transition-colors",
  {
    variants: {
      selected: {
        true: "border-foreground bg-foreground/80 text-primary-foreground shadow-sm",
        false: "border-tertiary-border bg-tertiary shadow-sm",
      },
      disabled: {
        true: "opacity-40",
        false: "",
      },
    },
    compoundVariants: [
      { selected: false, disabled: false, class: "hover:bg-tertiary-hover" },
    ],
    defaultVariants: { selected: false, disabled: false },
  }
)

export type OptionTileVariants = VariantProps<typeof optionTileVariants>

import { cva, type VariantProps } from "class-variance-authority"

/**
 * Option tile — the design-system standard for selectable choice grids
 * (pick-one / pick-up-to-N), e.g. the validate flow's output-type, lens,
 * test, signal-mode, and verdict pickers.
 *
 * Resting tiles share the tertiary tier with suggestion pills; the selected
 * tile gets a faint foreground tint (foreground @ 25%) with a hairline
 * full-strength foreground border — flips in dark mode automatically via the
 * foreground token. Text stays in the foreground ramp on both states: full
 * foreground for labels, `text-foreground/80` for muted copy inside a
 * selected tile (vs /70 resting) so it holds contrast on the tinted fill.
 *
 * Spacing/radius defaults to rounded-lg; call sites add their own padding
 * (and may override radius) via cn().
 */
export const optionTileVariants = cva(
  "rounded-lg border text-left transition-colors",
  {
    variants: {
      selected: {
        true: "border-foreground bg-foreground/25 text-foreground shadow-sm",
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

"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepConfirmButtonProps {
  /** Button text, e.g. "Confirm Stakeholder Map". */
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Extra classes — used by the floating canvas instance for positioning. */
  className?: string;
}

/**
 * The single, standard "confirm this step's artifact" button. Rendered both
 * inside the chat panel and as the floating button over the canvas so the two
 * always look and behave identically. Always the outline variant + check icon.
 */
export function StepConfirmButton({
  label,
  onClick,
  disabled,
  className,
}: StepConfirmButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn("gap-2 rounded-full px-5", className)}
    >
      <CheckCircle2 className="h-4 w-4" />
      {label}
    </Button>
  );
}

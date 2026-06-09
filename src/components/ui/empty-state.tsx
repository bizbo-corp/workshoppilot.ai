import * as React from "react"

import { cn } from "@/lib/utils"
import { Heading, Text } from "@/components/ui/typography"

/**
 * EmptyState — consistent placeholder for empty lists / zero-data views
 * (dashboards, canvas, results). Centralizes the icon + title + description + CTA
 * layout that was previously hand-rolled per screen.
 *
 *   <EmptyState
 *     icon={<Icon name="tray" className="h-8 w-8" />}
 *     title="No workshops yet"
 *     description="Start one to see it here."
 *     action={<Button variant="primary">New workshop</Button>}
 *   />
 */
export interface EmptyStateProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="text-muted-foreground [&_svg]:size-8" aria-hidden>
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <Heading level={4} className="text-base">
          {title}
        </Heading>
        {description ? (
          <Text variant="muted" className="mx-auto max-w-sm">
            {description}
          </Text>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

export { EmptyState }

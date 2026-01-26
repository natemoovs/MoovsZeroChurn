import { cn } from "@/lib/utils"

type HealthScore = "green" | "yellow" | "red" | "churned" | "unknown"

interface HealthBadgeProps {
  score: HealthScore
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

const healthConfig = {
  green: {
    label: "Healthy",
    bgColor: "bg-success-100 dark:bg-success-50",
    textColor: "text-success-700 dark:text-success-500",
    dotColor: "bg-success-500",
    ringColor: "ring-success-500/20",
    glowClass: "glow-success",
  },
  yellow: {
    label: "Monitor",
    bgColor: "bg-warning-100 dark:bg-warning-50",
    textColor: "text-warning-600 dark:text-warning-500",
    dotColor: "bg-warning-500",
    ringColor: "ring-warning-500/20",
    glowClass: "",
  },
  red: {
    label: "At Risk",
    bgColor: "bg-error-100 dark:bg-error-50",
    textColor: "text-error-600 dark:text-error-500",
    dotColor: "bg-error-500",
    ringColor: "ring-error-500/20",
    glowClass: "glow-error",
  },
  churned: {
    label: "Churned",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-600 dark:text-gray-400",
    dotColor: "bg-gray-500",
    ringColor: "ring-gray-500/20",
    glowClass: "",
  },
  unknown: {
    label: "Unknown",
    bgColor: "bg-bg-tertiary",
    textColor: "text-content-secondary",
    dotColor: "bg-surface-muted",
    ringColor: "ring-surface-muted/20",
    glowClass: "",
  },
}

const sizeConfig = {
  sm: {
    badge: "px-2 py-0.5 text-xs",
    dot: "h-1.5 w-1.5",
  },
  md: {
    badge: "px-2.5 py-1 text-sm",
    dot: "h-2 w-2",
  },
  lg: {
    badge: "px-3 py-1.5 text-sm",
    dot: "h-2.5 w-2.5",
  },
}

export function HealthBadge({ score, size = "md", showLabel = true }: HealthBadgeProps) {
  const config = healthConfig[score]
  const sizes = sizeConfig[size]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1",
        config.bgColor,
        config.textColor,
        config.ringColor,
        sizes.badge
      )}
    >
      <span className={cn("rounded-full", config.dotColor, sizes.dot)} />
      {showLabel && config.label}
    </span>
  )
}

export function HealthDot({
  score,
  size = "md",
}: {
  score: HealthScore
  size?: "sm" | "md" | "lg"
}) {
  const config = healthConfig[score]
  const dotSizes = { sm: "h-2 w-2", md: "h-3 w-3", lg: "h-4 w-4" }

  return (
    <span
      className={cn("inline-block rounded-full", config.dotColor, dotSizes[size])}
      title={config.label}
    />
  )
}

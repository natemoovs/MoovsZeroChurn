import { cn } from "@/lib/utils"

type HealthScore = "green" | "yellow" | "red" | "unknown"

interface HealthBadgeProps {
  score: HealthScore
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

const healthConfig = {
  green: {
    label: "Healthy",
    bgColor: "bg-emerald-100 dark:bg-emerald-950",
    textColor: "text-emerald-700 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    ringColor: "ring-emerald-500/20",
  },
  yellow: {
    label: "Monitor",
    bgColor: "bg-amber-100 dark:bg-amber-950",
    textColor: "text-amber-700 dark:text-amber-400",
    dotColor: "bg-amber-500",
    ringColor: "ring-amber-500/20",
  },
  red: {
    label: "At Risk",
    bgColor: "bg-red-100 dark:bg-red-950",
    textColor: "text-red-700 dark:text-red-400",
    dotColor: "bg-red-500",
    ringColor: "ring-red-500/20",
  },
  unknown: {
    label: "Unknown",
    bgColor: "bg-zinc-100 dark:bg-zinc-800",
    textColor: "text-zinc-600 dark:text-zinc-400",
    dotColor: "bg-zinc-400",
    ringColor: "ring-zinc-400/20",
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

export function HealthDot({ score, size = "md" }: { score: HealthScore; size?: "sm" | "md" | "lg" }) {
  const config = healthConfig[score]
  const dotSizes = { sm: "h-2 w-2", md: "h-3 w-3", lg: "h-4 w-4" }

  return (
    <span
      className={cn("inline-block rounded-full", config.dotColor, dotSizes[size])}
      title={config.label}
    />
  )
}

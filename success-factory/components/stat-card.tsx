import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: "default" | "success" | "warning" | "danger"
}

const variantStyles = {
  default: {
    bg: "bg-white dark:bg-zinc-900",
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
    iconColor: "text-zinc-600 dark:text-zinc-400",
  },
  success: {
    bg: "bg-white dark:bg-zinc-900",
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    bg: "bg-white dark:bg-zinc-900",
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    bg: "bg-white dark:bg-zinc-900",
    iconBg: "bg-red-100 dark:bg-red-950",
    iconColor: "text-red-600 dark:text-red-400",
  },
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800",
        styles.bg
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-sm font-medium",
                trend.value >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2.5", styles.iconBg)}>
            <Icon className={cn("h-5 w-5", styles.iconColor)} />
          </div>
        )}
      </div>
    </div>
  )
}

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
    bg: "card-sf",
    iconBg: "bg-bg-tertiary",
    iconColor: "text-content-secondary",
  },
  success: {
    bg: "card-sf",
    iconBg: "bg-success-100 dark:bg-success-50",
    iconColor: "text-success-600 dark:text-success-500",
  },
  warning: {
    bg: "card-sf",
    iconBg: "bg-warning-100 dark:bg-warning-50",
    iconColor: "text-warning-600 dark:text-warning-500",
  },
  danger: {
    bg: "card-sf",
    iconBg: "bg-error-100 dark:bg-error-50",
    iconColor: "text-error-600 dark:text-error-500",
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
    <div className={cn("transition-shadow-smooth p-5", styles.bg)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-content-secondary text-sm font-medium">{title}</p>
          <p className="text-content-primary text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-content-secondary text-sm">{subtitle}</p>}
          {trend && (
            <p
              className={cn(
                "text-sm font-medium",
                trend.value >= 0
                  ? "text-success-600 dark:text-success-500"
                  : "text-error-600 dark:text-error-500"
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
